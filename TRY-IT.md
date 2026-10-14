# Try Snoop yourself

Quick commands to see Snoop in action from your terminal. Run them from the project folder:

```sh
cd ~/Desktop/snoop
```

## 1. Watch Snoop run around (just for fun)

Snoop runs nonstop along the bottom of the browser window, sits and wags for 2 seconds, then goes again.

```sh
python3 -m http.server 8000      # leave this running in one terminal tab
open "http://localhost:8000/?demo"
```

## 2. Snoop in your terminal

Snoop runs back and forth across your terminal window. Press Ctrl+C to stop.

```sh
node scripts/terminal-run.js
```

Make the window wider for a longer run.

## 3. Normal mode: start and stop a scan

```sh
open http://localhost:8000
```

- Snoop sits and wags at first.
- Click **Start Scan**: Snoop runs, and progress counts up to 100% over about 10 seconds.
- Click **Stop Scan** at any point: Snoop sits immediately.
- When the scan finishes, the status reads "Scan complete" and Snoop sits.

## 4. No server needed

You can also open the file directly. Demo mode needs the server from step 1.

```sh
open index.html
```

## 5. Sanity checks

Check that every file loads from the server (each line should show `200`):

```sh
for f in "" index.html style.css sprite.js main.js; do
  printf '%-12s ' "/$f"; curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:8000/$f"
done
```

Check that every sprite frame is 24×16 and uses only palette colors:

```sh
node -e '
const { SNOOP, SNOOP_PALETTE } = require("./sprite.js");
const frames = [...SNOOP.run, ...SNOOP.idle];
const ok = frames.every(g => g.length === 16 && g.every(r => r.length === 24 && r.every(k => k === "." || k in SNOOP_PALETTE)));
console.log(ok ? "sprite OK (" + frames.length + " frames)" : "sprite BROKEN");
'
```

Check the JavaScript for syntax errors:

```sh
node --check main.js && node --check sprite.js && echo "JS OK"
```

## 6. Stop the server

Press Ctrl+C in the server tab. If it is running in the background:

```sh
pkill -f "http.server 8000"
```

## Coming in v1

The `snoop scan` CLI and the Vitest and Playwright suites are specified in `SPEC.md` but not built yet. Once they exist, these will work:

```sh
node bin/snoop.js scan corpus/bad --json
npm run test:unit
npm run test:e2e
```
