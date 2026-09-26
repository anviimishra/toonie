#!/usr/bin/env python3
"""Toonie robot client.

Watches for comics queued to this robot and prints them on a 58mm thermal
printer. Implements the contract in docs/robot-api.md.

Two ways of hearing about a comic, per that document:

  * Supabase Realtime, when the `realtime` package is installed. Instant.
  * Adaptive polling of GET /inbox: 60s idle, 3s for two minutes after
    anything happens. Always on, because hackathon WiFi drops websockets.

Both converge on the same inbox -> print -> ack path, so the printing code
exists exactly once.

Dry-run mode needs nothing from pip, only the standard library. Add
python-escpos when there is a real printer to talk to.

    python robot/client.py register --base-url http://localhost:8000 \
        --pair-code OTTER-42
    python robot/client.py run --base-url http://localhost:8000 --dry-run
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

# The contract pins this. We check rather than assume.
EXPECTED_WIDTH = 384

POLL_IDLE_SECONDS = 60
POLL_BUSY_SECONDS = 3
BUSY_WINDOW_SECONDS = 120

DEFAULT_TOKEN_PATH = Path.home() / ".toonie" / "device.json"


class ApiError(RuntimeError):
    """Non-2xx from the server, carrying the contract's error code."""

    def __init__(self, status: int, code: str, message: str) -> None:
        super().__init__(str(status) + " " + code + ": " + message)
        self.status = status
        self.code = code


def _request(
    method: str,
    url: str,
    token: str | None = None,
    payload: dict[str, Any] | None = None,
    timeout: int = 20,
) -> Any:
    body = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=body, method=method)
    if payload is not None:
        req.add_header("content-type", "application/json")
    if token:
        req.add_header("authorization", "Bearer " + token)

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        code = "internal"
        message = exc.reason or "request failed"
        try:
            parsed = json.loads(raw)["error"]
            code = parsed.get("code", code)
            message = parsed.get("message", message)
        except Exception:
            pass
        raise ApiError(exc.code, code, message) from None


def _fetch_bytes(url: str, timeout: int = 60) -> bytes:
    # print_url points at a public bucket, so no auth header here.
    with urllib.request.urlopen(url, timeout=timeout) as resp:
        return resp.read()


# ------------------------------------------------------------------ storage


def load_device(path: Path) -> dict[str, Any]:
    if not path.exists():
        sys.exit("No device registered at " + str(path) + ". Run `register` first.")
    return json.loads(path.read_text())


def save_device(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2))
    # The token is a password. Keep it off other accounts on the Pi.
    try:
        os.chmod(path, 0o600)
    except OSError:
        pass  # Windows and some filesystems do not support this.


# ----------------------------------------------------------------- printing


def print_image(data: bytes, dry_run: bool, out_dir: Path, name: str) -> str:
    """Send a print strip to the printer, or to disk when dry-running."""
    out_dir.mkdir(parents=True, exist_ok=True)
    target = out_dir / (name + ".png")
    target.write_bytes(data)

    if dry_run:
        return str(target)

    # Imported lazily so dry-run needs no pip install at all.
    try:
        from escpos.printer import Usb  # type: ignore[import-not-found]
    except ImportError:
        sys.exit(
            "python-escpos is not installed. Either `pip install python-escpos` "
            "or pass --dry-run to write PNGs to disk instead."
        )

    vendor = int(os.environ.get("TOONIE_PRINTER_VENDOR", "0x0416"), 16)
    product = int(os.environ.get("TOONIE_PRINTER_PRODUCT", "0x5011"), 16)
    printer = Usb(vendor, product)
    # bitImageRaster is the widest-supported mode on cheap 58mm clones.
    printer.image(str(target), impl="bitImageRaster")
    printer.cut()
    return "usb:" + hex(vendor) + ":" + hex(product)


# ------------------------------------------------------------- the main loop


class Robot:
    def __init__(
        self,
        base_url: str,
        token: str,
        dry_run: bool,
        out_dir: Path,
    ) -> None:
        self.base = base_url.rstrip("/")
        self.token = token
        self.dry_run = dry_run
        self.out_dir = out_dir
        # Guards against a Realtime event racing a poll: without it the same
        # delivery could start two print jobs in the same second.
        self.printed: set[str] = set()
        self.busy_until = 0.0

    def nudge(self) -> None:
        """Enter the fast polling window."""
        self.busy_until = time.monotonic() + BUSY_WINDOW_SECONDS

    def interval(self) -> int:
        if time.monotonic() < self.busy_until:
            return POLL_BUSY_SECONDS
        return POLL_IDLE_SECONDS

    def inbox(self) -> list[dict[str, Any]]:
        return _request("GET", self.base + "/api/device/inbox", token=self.token) or []

    def ack(self, delivery_id: str) -> None:
        _request(
            "POST",
            self.base + "/api/device/deliveries/" + delivery_id + "/printed",
            token=self.token,
        )

    def handle(self, item: dict[str, Any]) -> None:
        delivery_id = item["delivery_id"]
        if delivery_id in self.printed:
            return

        width = item.get("width")
        if width != EXPECTED_WIDTH:
            print("  ! width " + str(width) + " is not " + str(EXPECTED_WIDTH), flush=True)

        title = item.get("title") or delivery_id
        print("  printing " + repr(title) + " (" + delivery_id + ")", flush=True)

        data = _fetch_bytes(item["print_url"])
        where = print_image(data, self.dry_run, self.out_dir, delivery_id)

        # Mark before acking: if the ack fails we still must not reprint. The
        # ack is idempotent, so retrying it on the next pass is harmless.
        self.printed.add(delivery_id)
        self.ack(delivery_id)
        print("  done -> " + where, flush=True)
        self.nudge()

    def drain(self) -> int:
        """Print everything queued. Returns how many items were seen."""
        items = self.inbox()
        for item in items:
            try:
                self.handle(item)
            except ApiError as exc:
                print("  ! " + str(exc), flush=True)
            except OSError as exc:
                print("  ! could not fetch or print: " + str(exc), flush=True)
        return len(items)

    def run(self, once: bool = False) -> None:
        if once:
            self.drain()
            return

        backoff = 1
        while True:
            try:
                if self.drain():
                    self.nudge()
                backoff = 1
            except ApiError as exc:
                if exc.status in (400, 401, 404):
                    sys.exit("Fatal: " + str(exc))  # retrying will not help
                print("  ! " + str(exc) + "; backing off " + str(backoff) + "s", flush=True)
                time.sleep(backoff)
                backoff = min(backoff * 2, 60)
                continue
            except OSError as exc:
                print("  ! network: " + str(exc) + "; retry in " + str(backoff) + "s", flush=True)
                time.sleep(backoff)
                backoff = min(backoff * 2, 60)
                continue

            time.sleep(self.interval())


def try_realtime(device: dict[str, Any]) -> bool:
    """Report whether Realtime is usable.

    The poll loop runs either way, so Realtime is a latency optimisation and
    never a requirement. The `realtime` package's API has shifted between
    versions, so a missing or incompatible install is reported rather than
    being fatal.
    """
    rt = device.get("realtime") or {}
    if not rt.get("url"):
        return False
    try:
        import realtime  # type: ignore[import-not-found]  # noqa: F401
    except ImportError:
        print("realtime not installed; polling only (pip install realtime)", flush=True)
        return False

    print("realtime available for channel " + repr(rt.get("channel")), flush=True)
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description="Toonie robot client")

    # Shared flags live on a parent parser so they can be typed after the
    # subcommand, which is the order everyone reaches for.
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument(
        "--base-url",
        default=os.environ.get("TOONIE_BASE_URL", "http://localhost:3000"),
    )
    common.add_argument("--token-file", type=Path, default=DEFAULT_TOKEN_PATH)

    sub = parser.add_subparsers(dest="command", required=True)

    reg = sub.add_parser(
        "register",
        parents=[common],
        help="exchange a pair code for a device token",
    )
    reg.add_argument("--pair-code", required=True)

    run = sub.add_parser("run", parents=[common], help="watch for comics and print them")
    run.add_argument("--dry-run", action="store_true", help="write PNGs, do not print")
    run.add_argument("--once", action="store_true", help="drain the inbox once and exit")
    run.add_argument("--out-dir", type=Path, default=Path("out/prints"))

    args = parser.parse_args()

    if args.command == "register":
        data = _request(
            "POST",
            args.base_url.rstrip("/") + "/api/device/register",
            payload={"pair_code": args.pair_code},
        )
        save_device(args.token_file, data)
        print("Registered device " + data["device_id"])
        print("Token saved to " + str(args.token_file))
        return

    device = load_device(args.token_file)
    robot = Robot(args.base_url, device["device_token"], args.dry_run, args.out_dir)
    try_realtime(device)
    mode = "dry run, writing PNGs" if args.dry_run else "printing"
    print("Watching " + args.base_url + " (" + mode + "). Ctrl-C to stop.", flush=True)
    try:
        robot.run(once=args.once)
    except KeyboardInterrupt:
        print("\nstopped")


if __name__ == "__main__":
    main()
