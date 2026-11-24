# isometric-office

An isometric 3D office (three.js) where every Claude Code agent becomes a robot at its own desk. The room grows as agents join.

## Run

No install needed. Serve the `site/` folder with any static server:

```sh
tools/servir.sh        # serves the site at http://127.0.0.1:4421/
# or
cd site && python3 -m http.server 4421
```

- `/`: the office in light mode (default). `?q=alta` turns on the large shadow, occlusion, bloom and per-desk lights.
- `/pipeline.html`: five teams in sequence, with tasks moving in packets, queues and review sending work back.
- `/hive.html`: honeycomb. Each agent gets its own cube room, and the rooms snap into a hive as agents join.
- `?auto=1`: automatic demo script.
- `?real=1`: reads real agent sessions (needs the local server on port 4422).
- `?hora=18`: forces the time of day.

Type a task in the bottom bar and press Enter or the arrow to create an agent. `+`, `−` and the counter live in the same bar. Commands: `/sub` creates a subagent, `/sair` removes the last agent and `/limpar` removes all of them.

Keys outside editable fields: `/` focuses the bar, Esc leaves it, `+` and `-` add and remove agents, `0` to `9` set the count, `s` creates a subagent and `h` hides the bar and the mode badge. Typing in the bar does not trigger these shortcuts.

## 3D models

The furniture is in `site/assets/glb/` as plain `.glb` files, ready for Blender, three.js or any glTF viewer: `cadeira` (chair), `mesa` (desk), `estante` (bookshelf), `sofa`, `planta` (plant), `pendente` (pendant lamp), `teclado` (keyboard), `torre` (PC tower), `cafe` (coffee) and `caixa-som` (speaker).

## Agent pipeline

Open `/pipeline.html`. Enter or the arrow sends the task text through planning → research → code → review → delivery (PLANEJAMENTO → PESQUISA → CÓDIGO → REVISÃO → ENTREGA on screen). Each team has 1 to 4 agents; tasks wait when all of them are busy. Some reviews send a task back to code once before approving it.

- `/time código +` and `/time código -` resize a team; names without accents work too.
- `/limpar` empties the queues and the input; tasks being processed or moving between teams carry on.
- `/auto` toggles the sample tasks, on by default. `?auto=0` starts with no automatic arrivals.
- The `+` and `−` buttons create a sample task and remove the last waiting task.
- `/` focuses the field; Esc leaves it. `+` and `-` work outside editable fields.
- Drag to move, scroll to zoom and double-click to reset the framing.

Light mode caps at 30 fps, with one directional light and a 2048 shadow map. `?q=alta` uses native resolution, antialiasing and soft shadows, with no post-processing. The scene pauses when the tab is hidden and stops after three consecutive frames over 1 s. `window.__esc` exposes the scene and `pipe`, including `times`, `tarefas`, `novaTarefa(text)` and `ajustaTime(name, delta)`. `__esc.vel = 0` freezes the simulation.

Files, layout coordinates and the verification limits are in [docs/pipeline.md](docs/pipeline.md) (Portuguese).

## Note on captures

An old version of the scene froze a Mac through the GPU. Don't run `tools/foto.mjs` or `tools/glb.mjs` to test this scene. The scripts below use Playwright with SwiftShader only (software rendering), at most 800×800, a 55-second limit, and close with `pkill -9 -f chrome-headless-shell`. They load an existing Playwright install through a hardcoded path in `tools/lib.mjs` and `tools/software.mjs`; point those at your own install first.

Run one browser command at a time, with the local server up:

```sh
node --test tests/*.test.mjs
node tools/verificar-software.mjs hive
node tools/verificar-software.mjs index
node tools/verificar-software.mjs hive-alta
node tools/verificar-software.mjs index-alta
node tools/medir-software.mjs depois
node tools/verificar-software.mjs captura-hive-1
node tools/verificar-software.mjs captura-hive-7
node tools/verificar-software.mjs captura-index-3
```

The meter saves JSON and PNG to `shots/`, measures 30 animated and 30 still frames, and reports average draw calls, triangles and times with `gl.finish()`, plus the min and max draw calls. To compare an older version served separately, run the same script with `SITE_URL=http://127.0.0.1:PORT/ node tools/medir-software.mjs antes`. Frame time includes the light-mode limiter; `renderMs` measures rendering plus waiting for the software renderer to finish.

The UI text and code comments are in Portuguese.
