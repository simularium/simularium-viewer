# Plan: Per-Agent Feature Colormaps

Add per-agent floating-point "features" to the trajectory format and a per-agent-type colormap that maps a selected feature value to a render-time color. A type is either solid-color (current behavior) or colormapped (new), toggled via its `AgentTypeVisData`.

## Status

-   [x] **Phase A — Data model & format** (complete; 144/144 tests pass, typecheck clean)
-   [ ] **Phase B — Colormap infrastructure (CPU)**
-   [ ] **Phase C — Rendering pipeline**
-   [ ] **Phase D — Public API & example**

## Decisions

-   **Feature transport**: bumped trajectory format. Each per-agent record gets `nFeatures` followed by that many floats, after subpoints. Internal `CachedFrame` always carries this section (legacy V1/V2/V3 sources get `nFeatures = 0` injected).
-   **Colormap scope**: per agent type, declared in `AgentTypeVisData.colormap`.
-   **Colormap representation**: built-in name (`viridis`, `plasma`, `magma`, `inferno`, `turbo`, `gray`) OR user-supplied list of RGB stops in [0,1].
-   **Mode**: per-type toggle — a type is solid-color OR colormapped (no blending).
-   **Normalization**: user-specified `min`/`max` per (type, featureIndex). No auto-ranging in v1.
-   **Out of scope (v1)**: per-instance colormap overrides, auto-ranging, animated/interpolated colormaps, runtime-injected features without a format-version bump, UI panels in the example app beyond a minimal demo.

---

## Phases

### Phase A — Data model & format ✅ DONE

1. ✅ Extend `AgentData` in [src/simularium/types.ts](../../src/simularium/types.ts) with `features: number[]`. (No `AGENT_OBJECT_KEYS` reorder — `nFeatures` lives outside the keys array, written into the buffer after subpoints.)
2. ✅ Add `ColormapName`, `RgbStop`, `ColormapSpec` types and extend `AgentTypeVisData` with optional `featureNames` and `colormap` ([types.ts](../../src/simularium/types.ts)).
3. ✅ Bump `LATEST_VERSION` to 4 in [src/simularium/versionHandlers.ts](../../src/simularium/versionHandlers.ts); v3 passes through; preprocessing types and sanitizer carry `featureNames`/`colormap`.
4. ✅ [src/simularium/BinaryFileReader.ts](../../src/simularium/BinaryFileReader.ts): read the spatial-data block version int. V1 frames are transformed on retrieval via `injectEmptyFeatures` to insert `nFeatures = 0` after each agent's subpoints. V2+ frames pass through.
5. ✅ [src/simularium/VisDataParse.ts](../../src/simularium/VisDataParse.ts): `parseVisDataMessage(visDataMsg, hasFeatures)` reads `nFeatures` + features when present and always writes the `nFeatures` slot in the internal buffer. `hasFeatures` flag plumbed via `VisData.hasFeatures` ([VisData.ts](../../src/simularium/VisData.ts)) set from the trajectory file version (>=4) in [src/viewport/index.tsx](../../src/viewport/index.tsx).
6. ✅ [src/util.ts](../../src/util.ts): `getAgentDataFromBuffer` and `getNextAgentOffset` walk the `[fixed | subpoints | nFeatures | features]` layout.
7. ✅ Tests updated in [src/test/util.test.ts](../../src/test/util.test.ts), [src/test/VisData.test.ts](../../src/test/VisData.test.ts), [src/test/versionHandlers.test.ts](../../src/test/versionHandlers.test.ts).

### Phase B — Colormap infrastructure (CPU side)

8. New module `src/visGeometry/Colormaps.ts`:
    - Named built-in LUTs (256-stop `Float32Array` RGBA per name): `viridis`, `plasma`, `magma`, `inferno`, `turbo`, `gray`.
    - `buildColormapLut(spec: ColormapSpec): Float32Array` — handles either named LUTs or interpolating user-supplied stops to a fixed width (256 RGBA entries).
9. Extend [src/visGeometry/ColorHandler.ts](../../src/visGeometry/ColorHandler.ts):
    - Track per-type mode: `Map<typeId, { mode: "solid" | "colormap"; spec?: ColormapSpec; lutRow?: number; min: number; max: number; featureIndex: number }>`.
    - Build a single 2D LUT atlas (`Float32Array`, 256 wide, one row per active colormap) accessible to the renderer for upload as a `DataTexture`.
    - Public methods:
        - `setColormapForType(typeId, spec | null)` — `null` reverts to solid.
        - `getColormapInfoForType(typeId)` — used during instance upload.
    - Emit changes via the existing color-update mechanism so the renderer rebuilds textures.
10. Wire colormap setup in [src/visGeometry/index.ts](../../src/visGeometry/index.ts) `handleAgentGeometry` so any type whose `AgentTypeVisData.colormap` is present is auto-registered.
11. Tests: extend [src/test/color-utils.test.ts](../../src/test/color-utils.test.ts) with LUT-build tests and ColorHandler colormap-mode tests.

_B8 standalone. B9 depends on B8. B10 depends on B9. B11 depends on B9/B10._

### Phase C — Rendering pipeline

12. Extend instance attributes in [src/visGeometry/rendering/InstancedMesh.ts](../../src/visGeometry/rendering/InstancedMesh.ts):
    -   Add a new `instanceFeature` attribute (`vec2`): `(featureValue, lutRow)` where `lutRow < 0` means "no colormap, use solid".
13. In `addInstance()` ([src/visGeometry/index.ts](../../src/visGeometry/index.ts) ~lines 1485–1510):
    -   Look up the type's colormap state from ColorHandler.
    -   Read `agentData.features[featureIndex]`, normalize `(v - min) / (max - min)` (clamped), pass as the feature value.
    -   Pass the LUT row index (or `-1` for solid).
14. Update G-buffer shaders ([InstancedMeshShader.ts](../../src/visGeometry/rendering/InstancedMeshShader.ts) and the PDB equivalents) to forward `instanceFeature` through unused `w` channels of `gNormal` and `gPos`.
15. Modify [CompositePass.ts](../../src/visGeometry/rendering/CompositePass.ts):
    -   New uniforms `colormapAtlas` (`sampler2D`) and `colormapAtlasSize` (`vec2`).
    -   Fragment shader: if `lutRow >= 0`, sample `colormapAtlas` at `(featureValue, lutRow)` instead of `colorsBuffer`. Otherwise keep the current solid path.
    -   Wire LUT atlas `DataTexture` upload from ColorHandler.
16. Visual smoke test via [examples/src/Viewer.tsx](../../examples/src/Viewer.tsx) using a synthesized trajectory.

_C12–C14 are sequential. C15 depends on C14 and B9. C16 depends on C15._

### Phase D — Public API & example

17. Controller surface ([src/controller/index.ts](../../src/controller/index.ts)):
    -   `setColormapForType(typeId: number, spec: ColormapSpec | null): void` — passthrough to VisGeometry/ColorHandler.
    -   `clearColormapForType(typeId: number): void`.
    -   Document that colormaps declared in `AgentTypeVisData.colormap` are auto-applied on load and these APIs override at runtime.
18. Minimal example in [examples/src/Viewer.tsx](../../examples/src/Viewer.tsx) with a simulator under [examples/src/simulators/](../../examples/src/simulators/) that emits 2–3 features per agent and toggles a colormap on one type.

_D17 depends on Phase C. D18 depends on D17._

---

## Relevant files

-   [src/simularium/types.ts](../../src/simularium/types.ts) — `AgentData`, `AgentTypeVisData`, `ColormapSpec`.
-   [src/simularium/versionHandlers.ts](../../src/simularium/versionHandlers.ts) — `LATEST_VERSION`, sanitizer pass-through.
-   [src/simularium/BinaryFileReader.ts](../../src/simularium/BinaryFileReader.ts) — spatial-data version, legacy frame transform.
-   [src/simularium/VisDataParse.ts](../../src/simularium/VisDataParse.ts) — `parseVisDataMessage(msg, hasFeatures)`.
-   [src/simularium/VisData.ts](../../src/simularium/VisData.ts) — `hasFeatures` flag.
-   [src/util.ts](../../src/util.ts) — `getAgentDataFromBuffer`, `getNextAgentOffset`.
-   [src/visGeometry/Colormaps.ts](../../src/visGeometry/Colormaps.ts) — NEW (Phase B).
-   [src/visGeometry/ColorHandler.ts](../../src/visGeometry/ColorHandler.ts) — per-type mode, LUT atlas, set/get colormap.
-   [src/visGeometry/index.ts](../../src/visGeometry/index.ts) — auto-register colormaps; per-instance feature/lutRow upload.
-   [src/visGeometry/rendering/InstancedMesh.ts](../../src/visGeometry/rendering/InstancedMesh.ts) — `instanceFeature` attribute.
-   [src/visGeometry/rendering/InstancedMeshShader.ts](../../src/visGeometry/rendering/InstancedMeshShader.ts), PDB G-buffer shader — forward feature/lutRow.
-   [src/visGeometry/rendering/CompositePass.ts](../../src/visGeometry/rendering/CompositePass.ts) — colormap atlas sampling.
-   [src/controller/index.ts](../../src/controller/index.ts) — public API.
-   [src/test/BinaryFile.test.ts](../../src/test/BinaryFile.test.ts), [src/test/color-utils.test.ts](../../src/test/color-utils.test.ts), [src/test/util.test.ts](../../src/test/util.test.ts), [src/test/VisData.test.ts](../../src/test/VisData.test.ts), [src/test/versionHandlers.test.ts](../../src/test/versionHandlers.test.ts).
-   [examples/src/Viewer.tsx](../../examples/src/Viewer.tsx), [examples/src/simulators/](../../examples/src/simulators/).

---

## Verification

1. `npm run typeCheck` clean after each phase.
2. `npm run test` — all existing tests pass; new tests cover feature-array round-trip (JSON and binary) and colormap LUT generation.
3. Load an existing V3 trajectory file in the example app — must render identically to before (no regressions in the solid-color path).
4. Hand-craft a small V4 binary file (or use a simulator) with 1 agent type colormapped on `featureIndex` 0, range `[0,1]`, features distributed across agents — visual inspection: gradient matches LUT.
5. Toggle `setColormapForType(typeId, null)` at runtime — agent reverts to its solid `AgentTypeVisData.color`.
6. Mixed scene: two types where one is colormapped and the other solid — both render correctly in the same frame.
7. Version-mismatch behavior: a V4 file loaded by an older viewer fails clearly; V3 file loaded by the new viewer treats `nFeatures` as 0.

> Run all `npm` commands after `nvs use lts` (this repo expects Node LTS).

---

## Internal CachedFrame layout (v1)

After Phase A every per-agent record in the internal `CachedFrame` ArrayBuffer is laid out as:

```
[ visType, instanceId, type, x, y, z, xrot, yrot, zrot, cr, nSubPoints,
  subpoints[nSubPoints],
  nFeatures,
  features[nFeatures] ]
```

`nFeatures` is always present in the internal buffer; it is `0` for legacy
(V1/V2/V3) trajectories. Sources that don't carry features have the slot
injected by either `parseVisDataMessage` (JSON) or `injectEmptyFeatures`
(binary V1) so all downstream walkers can rely on the fixed shape.

---

## Further Considerations

1. **Auto-ranging vs fixed range**: locked to user-specified for v1; a `min === max` sentinel could later mean "auto-range over visible frame". Leave a TODO hook in `addInstance()`.
2. **Where to pack `lutRow` in G-buffer**: recommend separate `w` channels of `gNormal`/`gPos`. Alternative is encoding `(colorId, lutRow)` into the existing signed-typeId, but that complicates the highlight-sign convention.
3. **Per-instance colormap overrides**: deferred. Future change is local to `addInstance()` — no shader change required.
