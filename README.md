# SNOOP 🐕

Sniffing out object oriented protocols.

Snoop is a pixel-art dog who runs back and forth while a scan is going and sits and wags when it's done. Plain HTML, CSS and JavaScript.

He still needs some training but the thought is he will be able to be dropped into any codebase, provide an overlay visual of him sniffing; and be able to tell you where you can make some augments to your codebase.

![Snoop running a scan, turning around, then sitting to wag](docs/snoopscan.gif)

## Run locally

```bash
open index.html
```

For demo mode, where Snoop runs forever and takes a 2-second sit between laps, serve the folder:

```bash
python3 -m http.server 8000
open "http://localhost:8000/?demo"
```

Or let Snoop run across your terminal (Ctrl+C to stop):

```bash
node scripts/terminal-run.js
```

More quick checks are in [TRY-IT.md](TRY-IT.md).

## Development

- `sprite.js`: Snoop as 36×24 character grids, drawn at 4× scale. There's a 4-frame run cycle and a 2-frame sit-and-wag. The palette follows his real coat: fawn with light and shadow tones, dark brown ears, a dark tail with a black tip, a white blaze, chest and socks, a black muzzle, amber-chocolate eyes and a turquoise tiled collar, all with a dark outline. When he sits, he sits upright like the real Snoop: round haunch, back foot flat on the ground, tail stretched out behind.
- `main.js`: the canvas loop, movement (2 px per frame), a quick ear flop whenever Snoop turns around, the Start/Stop Scan toggle, and a placeholder `scan()` that fakes progress.
- `style.css`: layout, plus `image-rendering: pixelated` so every sprite pixel stays crisp.
- [SPEC.md](SPEC.md): the v1 plan, covering the `snoop` CLI, its rules, the JSON output, the tests and the v1–v3 roadmap.
