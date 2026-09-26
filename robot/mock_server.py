#!/usr/bin/env python3
"""A fake Toonie server, for working on the robot before the real API exists.

Implements every endpoint in docs/robot-api.md with in-memory state and a
generated print strip, so `client.py` can be exercised end to end with no
database, no API keys, and no printer.

    python robot/mock_server.py
    python robot/client.py register --base-url http://localhost:8000 \
        --pair-code OTTER-42
    python robot/client.py run --base-url http://localhost:8000 --dry-run

Queue another comic at any time:

    curl -X POST http://localhost:8000/mock/queue

Standard library only. Nothing here ships to production.
"""

from __future__ import annotations

import json
import re
import struct
import sys
import uuid
import zlib
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

PRINT_WIDTH = 384
PAIR_CODE = "OTTER-42"

TITLES = [
    "Tuesday at the park",
    "The cat got the sock",
    "Grandpa's pancake rule",
    "We found a very round rock",
]


# ------------------------------------------------------------- PNG encoding


def _chunk(tag: bytes, data: bytes) -> bytes:
    return (
        struct.pack(">I", len(data))
        + tag
        + data
        + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    )


def make_strip(width: int, panels: int) -> bytes:
    """A 1-bit PNG shaped like a real print strip: panel boxes down a column.

    1-bit greyscale is what the thermal printer wants, so the fixture matches
    the real thing rather than standing in for it. Bit 1 is white, 0 is black.
    """
    panel_h = 120
    gap = 8
    height = panels * (panel_h + gap) + gap
    row_bytes = (width + 7) // 8

    def blank_row() -> bytearray:
        return bytearray(b"\xff" * row_bytes)

    def set_black(row: bytearray, x: int) -> None:
        if 0 <= x < width:
            row[x >> 3] &= ~(1 << (7 - (x & 7))) & 0xFF

    rows: list[bytearray] = [blank_row() for _ in range(height)]

    for index in range(panels):
        top = gap + index * (panel_h + gap)
        bottom = top + panel_h - 1
        left, right = gap, width - gap - 1

        for x in range(left, right + 1):
            set_black(rows[top], x)
            set_black(rows[bottom], x)
        for y in range(top, bottom + 1):
            set_black(rows[y], left)
            set_black(rows[y], right)
        # A diagonal, so a rotated or flipped strip is obvious at a glance.
        for step in range(panel_h):
            set_black(rows[top + step], left + step)

    raw = b"".join(b"\x00" + bytes(row) for row in rows)
    return (
        b"\x89PNG\r\n\x1a\n"
        + _chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 1, 0, 0, 0, 0))
        + _chunk(b"IDAT", zlib.compress(raw, 9))
        + _chunk(b"IEND", b"")
    )


# ------------------------------------------------------------------- state


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class State:
    def __init__(self) -> None:
        self.devices: dict[str, str] = {}  # token -> device_id
        self.deliveries: dict[str, dict[str, Any]] = {}
        self.images: dict[str, bytes] = {}
        self.queue_one()

    def queue_one(self) -> str:
        delivery_id = str(uuid.uuid4())
        panels = 1 + len(self.deliveries) % 6
        self.images[delivery_id] = make_strip(PRINT_WIDTH, panels)
        self.deliveries[delivery_id] = {
            "delivery_id": delivery_id,
            "title": TITLES[len(self.deliveries) % len(TITLES)],
            "print_url": "http://localhost:" + str(PORT) + "/mock/print/" + delivery_id + ".png",
            "width": PRINT_WIDTH,
            "status": "queued",
            "printed_at": None,
        }
        return delivery_id


PORT = 8000
state: State


# ----------------------------------------------------------------- handler

ACK_RE = re.compile(r"^/api/device/deliveries/([0-9a-fA-F-]+)/printed$")
PRINT_RE = re.compile(r"^/mock/print/([0-9a-fA-F-]+)\.png$")


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt: str, *args: Any) -> None:
        sys.stderr.write("  mock: " + (fmt % args) + "\n")

    # -- helpers

    def send_json(self, status: int, payload: Any) -> None:
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_error_json(self, status: int, code: str, message: str) -> None:
        self.send_json(status, {"error": {"code": code, "message": message}})

    def body(self) -> dict[str, Any]:
        length = int(self.headers.get("content-length") or 0)
        if not length:
            return {}
        try:
            return json.loads(self.rfile.read(length))
        except json.JSONDecodeError:
            return {}

    def device_id(self) -> str | None:
        auth = self.headers.get("authorization") or ""
        if not auth.startswith("Bearer "):
            return None
        return state.devices.get(auth[7:])

    # -- routes

    def do_GET(self) -> None:
        match = PRINT_RE.match(self.path)
        if match:
            image = state.images.get(match.group(1))
            if not image:
                self.send_error_json(404, "not_found", "No such print.")
                return
            self.send_response(200)
            self.send_header("content-type", "image/png")
            self.send_header("content-length", str(len(image)))
            self.end_headers()
            self.wfile.write(image)
            return

        if self.path == "/api/device/state":
            self.send_json(200, {"state": "idle"})
            return

        if self.path == "/api/device/inbox":
            if not self.device_id():
                self.send_error_json(401, "unauthorized", "Unknown device token.")
                return
            queued = [
                {k: d[k] for k in ("delivery_id", "title", "print_url", "width")}
                for d in state.deliveries.values()
                if d["status"] == "queued"
            ]
            self.send_json(200, queued)
            return

        self.send_error_json(404, "not_found", "No such route.")

    def do_POST(self) -> None:
        if self.path == "/mock/queue":
            delivery_id = state.queue_one()
            self.send_json(200, {"queued": delivery_id})
            return

        if self.path == "/api/device/register":
            payload = self.body()
            if payload.get("pair_code") != PAIR_CODE:
                self.send_error_json(409, "invalid_pair_code", "No capsule with that code.")
                return
            device_id = str(uuid.uuid4())
            token = "dt_" + uuid.uuid4().hex
            state.devices[token] = device_id
            self.send_json(
                200,
                {
                    "device_id": device_id,
                    "device_token": token,
                    "realtime": {
                        "url": "https://example.supabase.co",
                        "anon_key": "sb_publishable_mock",
                        "channel": "deliveries:mock-capsule",
                    },
                },
            )
            return

        match = ACK_RE.match(self.path)
        if match:
            if not self.device_id():
                self.send_error_json(401, "unauthorized", "Unknown device token.")
                return
            delivery = state.deliveries.get(match.group(1))
            if not delivery:
                self.send_error_json(404, "not_found", "No such delivery.")
                return
            # Idempotent: keep the first printed_at and return 200 either way.
            if delivery["status"] != "printed":
                delivery["status"] = "printed"
                delivery["printed_at"] = now()
            self.send_json(
                200,
                {
                    "delivery_id": delivery["delivery_id"],
                    "status": "printed",
                    "printed_at": delivery["printed_at"],
                },
            )
            return

        if self.path == "/api/device/stories":
            if not self.device_id():
                self.send_error_json(401, "unauthorized", "Unknown device token.")
                return
            self.send_json(200, {"story_id": str(uuid.uuid4()), "status": "transcribing"})
            return

        self.send_error_json(404, "not_found", "No such route.")


def main() -> None:
    global state
    state = State()
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print("Mock Toonie on http://localhost:" + str(PORT))
    print("Pair code: " + PAIR_CODE)
    print("One comic is already queued. POST /mock/queue for another.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")


if __name__ == "__main__":
    main()
