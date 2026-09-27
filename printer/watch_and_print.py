#!/usr/bin/env python3
"""
Print every new Toonie comic on the Bluetooth label printer.

Watches toonie-print.png (written by the app each time the parent generates a
comic; see src/app/api/local-save/route.ts) and, whenever it changes, runs the
printer script on it:

    python3 <print script> <snapshot of toonie-print.png>

Usage (from the toonie folder):
    python3 printer/watch_and_print.py --script "/path/to/print_image.py"

Or set TOONIE_PRINT_SCRIPT once instead of passing --script. Standard library
only. Stop with Ctrl+C.
"""

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_FILE = ROOT / "toonie-print.png"
POLL_SECONDS = 0.5
SETTLE_SECONDS = 1.0  # wait for the file to stop changing before printing


def stamp(path: Path):
    """What changes when the file is rewritten: modification time and size."""
    try:
        info = path.stat()
        return (info.st_mtime_ns, info.st_size)
    except FileNotFoundError:
        return None


def log(message: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {message}", flush=True)


def print_file(script: Path, image: Path) -> bool:
    """Snapshot the image, then run the printer script on the snapshot."""
    # A copy, so a new comic arriving mid-print can't change what's printing.
    with tempfile.TemporaryDirectory() as tmp:
        snapshot = Path(tmp) / image.name
        shutil.copy2(image, snapshot)
        log(f"Printing {image.name} ...")
        # Run from the script's own folder, the way you'd run it by hand.
        result = subprocess.run(
            [sys.executable, str(script), str(snapshot)],
            cwd=script.parent,
            capture_output=True,
            text=True,
        )
    output = (result.stdout + result.stderr).strip()
    for line in output.splitlines():
        print(f"    {line}", flush=True)

    # The script prints (not raises) when it can't find the printer.
    if result.returncode != 0 or "Printer not found" in output:
        log("Print failed. Is the printer on, and the phone app closed? Waiting for the next comic.")
        return False
    if "Done." in output:
        log("Printed.")
    return True


def watch(image: Path, script: Path, print_existing: bool) -> None:
    log(f"Watching {image}")
    log(f"Printing with {script}")
    last_printed = None if print_existing else stamp(image)
    if last_printed:
        log("Skipping the comic that's already there; waiting for a new one.")

    while True:
        current = stamp(image)
        if current is not None and current != last_printed:
            # Let the write finish (the app writes then renames, but be safe).
            time.sleep(SETTLE_SECONDS)
            settled = stamp(image)
            if settled != current:
                continue  # still changing; look again
            log("New comic found.")
            print_file(script, image)
            # Mark this version done even if it failed, so we don't retry in a
            # loop. If a newer comic arrived while printing, the next pass sees it.
            last_printed = settled
        time.sleep(POLL_SECONDS)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument(
        "--script",
        default=os.environ.get("TOONIE_PRINT_SCRIPT"),
        help="path to the printer script (default: $TOONIE_PRINT_SCRIPT)",
    )
    parser.add_argument("--file", default=str(DEFAULT_FILE), help="image to watch")
    parser.add_argument(
        "--print-existing",
        action="store_true",
        help="also print the comic that's already there when starting",
    )
    args = parser.parse_args()

    if not args.script:
        parser.error('say which printer script to use: --script "/path/to/print_image.py"')
    script = Path(args.script).expanduser().resolve()
    if not script.is_file():
        parser.error(f"printer script not found: {script}")

    try:
        watch(Path(args.file).expanduser().resolve(), script, args.print_existing)
    except KeyboardInterrupt:
        log("Stopped.")


if __name__ == "__main__":
    main()
