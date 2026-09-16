"""Convert Smoldyn `printFilaments` output into a .simularium trajectory.

simulariumio's built-in SmoldynConverter reads `listmols` output only (point
molecules -> viz_type 1000). Filaments are polylines, so they need viz_type 1001
agents whose vertices live in the flat `subpoints` array. This script does that.

Input format (one line per filament per snapshot, from `cmd ... printFilaments`):

    FIL <time> <type>:<name> <nseg> <parent-or-"-"> <capped> x0 y0 [z0] x1 y1 [z1] ...

Dimensionality is inferred from the coordinate count: a filament with nseg
segments has nseg+1 nodes, so dim = ncoords / (nseg + 1). 2D runs are embedded
in the z=0 plane.

Note on scaling: TrajectoryConverter does NOT centre or scale on its own -- each
simulator's converter calls the helpers itself. Skipping them leaves sub-micron
data at world-scale ~0.5 while the viewer camera sits at z=120, so nothing is
visible. We therefore call center_fiber_positions() (moves each fiber's origin to
its centroid, subpoints relative) and center_and_scale_agent_data() (centres the
scene and scales it into the viewer's 4-64 unit range), and scale box_size to match.

Usage:
    python smoldyn_filaments_to_simularium.py FRAMES.txt OUT_PREFIX [options]
"""

from __future__ import annotations

import argparse
from collections import OrderedDict, Counter

import numpy as np
from simulariumio import (
    TrajectoryConverter,
    TrajectoryData,
    AgentData,
    MetaData,
    DisplayData,
    UnitData,
    DISPLAY_TYPE,
)

# Sequential ramp: seed filaments dark, later branch generations lighter.
GENERATION_COLORS = ["#8c2d04", "#e6550d", "#fd8d3c", "#fdd0a2"]
CAPPED_COLORS = {"growing": "#e6550d", "capped": "#4a6fa5"}

# simulariumio's VIEWER_DIMENSION_RANGE is 4..64; aim just under the top.
VIEWER_TARGET_SPAN = 60.0


def parse_filament_file(path):
    """-> (frames, dim). frames is an ordered {time: [record, ...]}."""
    frames = OrderedDict()
    dim = None
    with open(path) as fh:
        for lineno, line in enumerate(fh, 1):
            line = line.strip()
            if not line.startswith("FIL"):
                continue
            f = line.split()
            time = float(f[1])
            # f[2] is "<filamenttype>:<filname>"; the parent field (f[4]) is the
            # bare <filname>, so key on filname for parent lookups to resolve.
            ftype, _, name = f[2].partition(":")
            nseg = int(f[3])
            parent = f[4]
            capped = bool(int(f[5]))
            coords = [float(v) for v in f[6:]]
            nnodes = nseg + 1
            if len(coords) % nnodes:
                raise ValueError(
                    f"{path}:{lineno}: {len(coords)} coords not divisible by "
                    f"{nnodes} nodes"
                )
            line_dim = len(coords) // nnodes
            if dim is None:
                dim = line_dim
            elif line_dim != dim:
                raise ValueError(f"{path}:{lineno}: dim {line_dim} != {dim} earlier")
            nodes = np.asarray(coords, dtype=float).reshape(nnodes, dim)
            if dim == 2:  # embed the 2D run in the z=0 plane
                nodes = np.column_stack([nodes, np.zeros(nnodes)])
            frames.setdefault(time, []).append(
                {"name": name, "ftype": ftype, "parent": parent,
                 "capped": capped, "nodes": nodes}
            )
    if dim is None:
        raise ValueError(f"{path}: no FIL records found")
    return frames, dim


def generation_of(name, parents, cache):
    """Walk the parent chain back to a seed. 0 = seed filament."""
    if name in cache:
        return cache[name]
    gen, cur, seen = 0, name, set()
    while True:
        parent = parents.get(cur, "-")
        if parent == "-" or parent not in parents or parent in seen:
            break
        seen.add(cur)
        cur = parent
        gen += 1
    cache[name] = gen
    return gen


def type_name(rec, parents, args, cache):
    # Static scenery (e.g. a membrane drawn as grid fibers) keeps its own
    # filament-type name and color, outside the generation/capped schemes.
    if rec["ftype"] in args._static_types:
        return rec["ftype"]
    if args.color_by == "capped":
        return "capped" if rec["capped"] else "growing"
    gen = generation_of(rec["name"], parents, cache)
    top = len(GENERATION_COLORS) - 1
    return f"gen{gen}" if gen < top else f"gen{top}+"


def build(frames, dim, args):
    times = np.array(sorted(frames.keys()), dtype=float)
    n_steps = len(times)

    parents, uid_of = {}, {}
    for t in times:
        for rec in frames[t]:
            parents.setdefault(rec["name"], rec["parent"])
            uid_of.setdefault(rec["name"], len(uid_of))

    max_agents = max(len(frames[t]) for t in times)
    max_nodes = max(len(r["nodes"]) for t in times for r in frames[t])

    n_agents = np.zeros(n_steps, dtype=int)
    viz_types = np.zeros((n_steps, max_agents))
    unique_ids = np.zeros((n_steps, max_agents))
    positions = np.zeros((n_steps, max_agents, 3))
    radii = np.full((n_steps, max_agents), args.radius)
    n_subpoints = np.zeros((n_steps, max_agents))
    subpoints = np.zeros((n_steps, max_agents, 3 * max_nodes))
    types, gen_cache, seen_types = [], {}, OrderedDict()

    for ti, t in enumerate(times):
        recs = frames[t]
        n_agents[ti] = len(recs)
        step_types = []
        for ai, rec in enumerate(recs):
            nodes = rec["nodes"]
            viz_types[ti][ai] = 1001.0  # fiber
            unique_ids[ti][ai] = uid_of[rec["name"]]
            n_subpoints[ti][ai] = 3 * len(nodes)
            subpoints[ti][ai][: 3 * len(nodes)] = nodes.flatten()
            tname = type_name(rec, parents, args, gen_cache)
            # Per-type radius, in raw units so center_and_scale_agent_data still
            # scales it. Needed whenever one agent class is much shorter than the
            # others: a crosslink spanning ~1 viewer unit is invisible at the
            # radius that suits a 45-unit fiber, and reads well drawn thicker.
            if tname in args._type_radius:
                radii[ti][ai] = args._type_radius[tname]
            seen_types[tname] = None
            step_types.append(tname)
        # pad so indexing can't run off the end (writers slice by n_agents)
        step_types += [step_types[-1] if step_types else "gen0"] * (
            max_agents - len(step_types))
        types.append(step_types)

    display_data = {}
    for tname in seen_types:
        if tname in args._static_types:
            color = args._static_types[tname]
        elif args.color_by == "capped":
            color = CAPPED_COLORS.get(tname, "#888888")
        else:
            idx = min(int("".join(c for c in tname if c.isdigit()) or 0),
                      len(GENERATION_COLORS) - 1)
            color = GENERATION_COLORS[idx]
        display_data[tname] = DisplayData(
            name=tname, display_type=DISPLAY_TYPE.FIBER, color=color)

    agent_data = AgentData(
        times=times, n_agents=n_agents, viz_types=viz_types,
        unique_ids=unique_ids, types=types, positions=positions, radii=radii,
        n_subpoints=n_subpoints, subpoints=subpoints, display_data=display_data)

    raw_pts = np.vstack([r["nodes"] for t in times for r in frames[t]])
    raw_extent = raw_pts.max(axis=0) - raw_pts.min(axis=0)

    # Give each fiber a real origin (its centroid) with subpoints relative to it,
    # then centre the scene and scale it into the viewer's usable range.
    agent_data = TrajectoryConverter.center_fiber_positions(agent_data)
    # The library's auto scale only guarantees the scene lands somewhere in the
    # viewer's 4-64 unit range, and for sub-micron data it stops at 4 -- which is
    # nearly invisible against the viewer's default camera at z=120. Fill the
    # range instead so the network actually reads on screen.
    sf = args.scale_factor
    if sf is None:
        sf = VIEWER_TARGET_SPAN / max(float(raw_extent.max()), 1e-12)
    agent_data, scale_factor = TrajectoryConverter.center_and_scale_agent_data(
        agent_data, input_scale_factor=sf)

    if args.box_fit:
        # A cubic box around a flat slab wastes most of the viewport and makes the
        # data read as small; follow the per-axis extent instead.
        box = np.maximum(raw_extent, raw_extent.max() * 0.02) * 1.1 * scale_factor
    elif args.box:
        box = np.array([args.box] * 3, float) * scale_factor
    else:
        span = float(max(raw_extent.max(), 1e-12)) * 1.1 * scale_factor
        box = np.array([span, span, span if dim == 3 else span * 0.05])

    args._scale_factor = scale_factor
    args._raw_extent = raw_extent

    return TrajectoryData(
        meta_data=MetaData(box_size=box, scale_factor=scale_factor,
                           trajectory_title=args.title),
        agent_data=agent_data,
        time_units=UnitData(args.time_units),
        spatial_units=UnitData(args.spatial_units))


def main():
    p = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("input", help="printFilaments output file")
    p.add_argument("output", help="output prefix (.simularium is appended)")
    p.add_argument("--title", default="Smoldyn filaments")
    p.add_argument("--radius", type=float, default=None,
                   help="fiber radius in spatial units "
                        "(default: 1/150 of the data extent)")
    p.add_argument("--box", type=float, default=None,
                   help="cubic box edge in spatial units; "
                        "default is the data extent + 10%%")
    p.add_argument("--box-fit", action="store_true",
                   help="size the box to the per-axis data extent instead of a cube")
    p.add_argument("--scale-factor", type=float, default=None,
                   help="override the auto viewer scale factor")
    p.add_argument("--color-by", choices=["generation", "capped"],
                   default="generation")
    p.add_argument("--time-units", default="s")
    p.add_argument("--spatial-units", default="um")
    p.add_argument("--type-radius", action="append", default=[],
                   metavar="TYPE=RADIUS",
                   help="override the fiber radius for one agent type, in spatial "
                        "units (repeatable), e.g. crosslink=0.02")
    p.add_argument("--static-type", action="append", default=[],
                   metavar="TYPE=#RRGGBB",
                   help="render records of this filament type as static scenery "
                        "with a fixed color, outside the generation/capped "
                        "schemes (repeatable), e.g. membrane=#9aa0a8")
    args = p.parse_args()
    args._static_types = dict(s.split("=", 1) for s in args.static_type)
    args._type_radius = {k: float(v) for k, v in
                         (s.split("=", 1) for s in args.type_radius)}

    frames, dim = parse_filament_file(args.input)
    if args.radius is None:  # something visible relative to the data
        pts = np.vstack([r["nodes"] for t in frames for r in frames[t]])
        args.radius = max(float((pts.max(axis=0) - pts.min(axis=0)).max()) / 150.0,
                          1e-12)

    data = build(frames, dim, args)
    TrajectoryConverter(data).save(args.output)

    last = frames[max(frames)]
    names = {r["name"] for t in frames for r in frames[t]}
    n_seed = len({r["name"] for t in frames for r in frames[t]
                  if r["parent"] == "-"})
    ad = data.agent_data
    tally = Counter(ad.types[-1][: int(ad.n_agents[-1])])
    print(f"{args.input}: {dim}D, {len(frames)} frames, "
          f"{len(names)} filaments ({n_seed} seed, {len(names) - n_seed} branched), "
          f"{max(len(frames[t]) for t in frames)} max simultaneous")
    print(f"  final frame by type : {dict(sorted(tally.items()))}")
    print(f"  capped at end       : {sum(1 for r in last if r['capped'])}/{len(last)}")
    print(f"  data extent         : {np.round(args._raw_extent, 4)} {args.spatial_units}")
    print(f"  viewer scale factor : {args._scale_factor:.4g} "
          f"(scene ~{float(args._raw_extent.max()) * args._scale_factor:.1f} units)")
    print(f"wrote {args.output}.simularium")


if __name__ == "__main__":
    main()
