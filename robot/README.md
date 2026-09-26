# Robot client

Reference client for the Raspberry Pi. It watches for comics queued to this
robot and prints them on a 58mm thermal printer, following
[docs/robot-api.md](../docs/robot-api.md).

Runs on a Pi 4 or 5. Python 3.9+.

## Try it with no hardware and no server

`mock_server.py` is a fake Toonie that implements every endpoint in the
contract and generates real 384px 1-bit print strips. Between it and
`--dry-run` you can develop the whole robot with nothing plugged in.

Both scripts are standard library only — no `pip install` for this path.

```bash
# terminal 1
python robot/mock_server.py

# terminal 2
python robot/client.py register --base-url http://localhost:8000 --pair-code OTTER-42
python robot/client.py run --base-url http://localhost:8000 --dry-run
```

PNGs land in `out/prints/`. Queue another comic whenever you like:

```bash
curl -X POST http://localhost:8000/mock/queue
```

`--once` drains the inbox and exits, which is handy in a script.

## Against the real app

```bash
pip install -r robot/requirements.txt
python robot/client.py register --base-url https://<host> --pair-code <code-from-app>
python robot/client.py run --base-url https://<host>
```

The device token is written to `~/.toonie/device.json` with mode 600. It is a
password: do not commit it or log it.

Set the printer's USB ids if yours differ from the common default:

```bash
export TOONIE_PRINTER_VENDOR=0x0416
export TOONIE_PRINTER_PRODUCT=0x5011
```

## How it decides to print

Adaptive polling of `GET /inbox`: every 60s when idle, every 3s for two
minutes after anything happens. Realtime is a latency optimisation layered on
top when the `realtime` package is installed; the poll loop is always running,
so a dropped websocket costs latency and nothing else.

Two things stop a comic printing twice: deliveries are unique per
`(story, device)` server-side, and the client keeps the ids it has printed in
memory so a Realtime event racing a poll cannot start two jobs at once. The
ack is idempotent, so retrying after a failed response is safe.

## When the printer will not talk to you

Work down this list; the first two catch most cases.

**Which transport is it?** Everything else depends on this.

- A USB-B socket → `lsusb` shows it. Use those ids with `Usb(vendor, product)`.
  On Linux a non-root user needs a udev rule, or you get permission denied that
  reads like "printer not found".
- A 3–5 pin header → it is TTL serial, not USB. Use
  `Serial("/dev/serial0", baudrate=...)`. On a Pi you must also free the UART:
  disable the serial console in `raspi-config`, keep the hardware serial port.

**Baud rate, for serial units.** A mismatch prints garbage or nothing. Most of
these printers print a self-test slip showing their own baud rate **if you hold
the FEED button while powering them on**. That answers it in ten seconds.
Common values are 9600, 19200 and 115200.

**Power.** These pull 2A or more while burning a line. A Pi USB port cannot
supply that. The giveaway: it powers up and feeds paper fine, then prints
nothing, or resets, only when it actually tries to print — which looks like a
comms bug but is not. Give it its own 5–9V 2A+ supply, and share a ground with
the Pi if you are using serial.

**Paper direction.** Thermal paper only images on one side. Scratch it with a
fingernail: the side that marks must face the print head. Backwards gives you
perfectly blank paper coming out of a printer that appears to work.

**Still stuck?** Take the app out of it entirely:

```bash
python -c "from escpos.printer import Usb; p=Usb(0x0416,0x5011); p.text('hello\n'); p.cut()"
```

If that fails, it is wiring, power, or permissions — not Toonie. `--dry-run`
keeps the rest of the robot testable while you sort it out.

## Files

| File               | What it is                                      |
| ------------------ | ----------------------------------------------- |
| `client.py`        | The client. Register, watch, print, ack.        |
| `mock_server.py`   | Fake Toonie for local development. Never ships. |
| `requirements.txt` | Only needed for real printing or Realtime.      |
