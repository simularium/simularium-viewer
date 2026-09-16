# Viewing Smoldyn filament simulations in Simularium

End-to-end: a Smoldyn run → a `.simularium` file → the viewer running on your machine.

Everything here assumes you already have a Smoldyn output file produced by the
`printFilaments` command, e.g. `baseline_frames.txt` from the actin compression
baseline. If you don't, the model and output files live in the lab Google Drive
under **Shared data / Smoldyn**.

---

## Why this script exists

`simulariumio` ships a `SmoldynConverter`, but it reads `listmols` output only —
point molecules, rendered as spheres (`viz_type` 1000). Filaments are polylines,
which need `viz_type` 1001 agents whose vertices live in a flat `subpoints`
array. That is what `smoldyn_filaments_to_simularium.py` does.

It also handles a scaling trap: `TrajectoryConverter` does **not** centre or
scale data on its own. Sub-micron coordinates left at world scale (~0.5 units)
are invisible to a camera sitting at z=120, so the script centres each fiber,
centres and scales the scene into the viewer's 4–64 unit range, and scales
`box_size` to match. If you write your own converter and see an empty viewport,
this is almost always why.

---

## 1. Clone

```bash
git clone -b matsulab-ui git@github.com:MatsulabUW/simularium-viewer.git
cd simularium-viewer
```

The `matsulab-ui` branch is the lab's fork of the viewer. It carries our UI
changes (the Trajectory Bench example app, playback speed control) plus this
`tools/` directory.

## 2. Convert the Smoldyn output

The converter needs Python, not Node. Use a separate virtualenv:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r tools/requirements.txt

python tools/smoldyn_filaments_to_simularium.py baseline_frames.txt baseline --stride 10
```

That writes `baseline.simularium` in about 4 seconds. `simulariumio` is stock
upstream — no lab fork is needed.

Useful options:

| Option | What it does |
| --- | --- |
| `--stride N` | keep every Nth frame. **Usually required** — see below |
| `--max-time T` | drop frames after time T |
| `--color-by generation` | seed filaments dark, later branch generations lighter (default) |
| `--color-by capped` | colour by capped vs growing barbed end |
| `--radius R` | filament display radius, in post-scaling viewer units |
| `--box-fit` | size the bounding box to the data rather than the config box |
| `--title "..."` | trajectory title shown in the viewer |

Run with `-h` for the full list.

### Why `--stride` matters

Conversion cost scales with **agent-frames** = frames × filaments per frame, and
it grows faster than linearly. In a branching simulation the filament count rises
exponentially, so the last few frames dominate everything. Measured on the
compression baseline (43 MB, 351 frames, 3 → 3,606 filaments):

| Setting | Frames | Agent-frames | Time | Output |
| --- | --- | --- | --- | --- |
| `--stride 10` | 36 | 19,340 | **4 s** | 2.4 MB |
| `--stride 5` | 71 | 36,762 | 13 s | 4.6 MB |
| none (`--stride 1`) | 351 | ~208,000 | **did not finish in 8 min** | — |

Start at `--stride 10`. The script prints its agent-frame count and warns above
50,000. If you only care about the early part of a run, `--max-time` is cheaper
than a small stride because it removes the expensive frames outright.

## 3. Run the viewer locally

Node 18+ and npm. From the repo root:

```bash
npm run dev
```

That runs `npm install`, builds the library, installs the example app's
dependencies, and starts the dev server — first run takes a few minutes. It
prints a local URL (Vite, usually <http://localhost:5173>).

On later runs, `npm start` alone is enough once the build exists.

## 4. Load your file

**Drag the `.simularium` file from Finder onto the viewer page.** It loads
locally; nothing is uploaded anywhere.

---

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Viewport is empty, no errors | Scaling. See "Why this script exists" — the script handles it, but a hand-rolled converter usually does not. |
| `ValueError: coordinate count not divisible by nnodes` | The input isn't `printFilaments` output, or lines are truncated. Each line is `FIL <time> <type>:<name> <nseg> <parent> <capped> x0 y0 [z0] ...` |
| Filaments render but don't move | Only one frame in the file. Check the `cmd i ... printFilaments` interval in the Smoldyn config. |
| `npm run dev` fails on install | Node version. The viewer wants Node 18+. |

## Related

`crosslink_frames.py` (not in this repo) converts the crosslinked-network runs
from the basement-membrane work, which use a different output layout. Ask Matt
if you need it.
