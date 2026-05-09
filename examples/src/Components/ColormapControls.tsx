import React from "react";
import {
    SimulariumController,
    ColormapName,
    ColormapSpec,
} from "@aics/simularium-viewer";

const BUILT_IN_COLORMAPS: ColormapName[] = [
    "viridis",
    "plasma",
    "magma",
    "inferno",
    "turbo",
    "gray",
];

// Approximate per-colormap stops (each [r,g,b] in [0,1]) used only for the
// preview swatch in this demo UI. The viewer itself uses its own LUT.
const PREVIEW_STOPS: Record<ColormapName, Array<[number, number, number]>> = {
    viridis: [
        [0.267, 0.005, 0.329],
        [0.282, 0.140, 0.458],
        [0.254, 0.265, 0.530],
        [0.207, 0.372, 0.553],
        [0.164, 0.471, 0.558],
        [0.128, 0.567, 0.551],
        [0.135, 0.659, 0.518],
        [0.267, 0.749, 0.441],
        [0.478, 0.821, 0.318],
        [0.741, 0.873, 0.150],
        [0.993, 0.906, 0.144],
    ],
    plasma: [
        [0.050, 0.030, 0.528],
        [0.294, 0.014, 0.631],
        [0.471, 0.018, 0.659],
        [0.624, 0.097, 0.622],
        [0.751, 0.196, 0.534],
        [0.855, 0.305, 0.428],
        [0.937, 0.420, 0.327],
        [0.989, 0.547, 0.236],
        [0.993, 0.692, 0.166],
        [0.949, 0.841, 0.184],
        [0.940, 0.975, 0.131],
    ],
    magma: [
        [0.001, 0.000, 0.014],
        [0.071, 0.057, 0.207],
        [0.197, 0.066, 0.396],
        [0.346, 0.078, 0.470],
        [0.484, 0.117, 0.500],
        [0.633, 0.156, 0.494],
        [0.788, 0.196, 0.439],
        [0.916, 0.293, 0.357],
        [0.985, 0.477, 0.348],
        [0.997, 0.677, 0.443],
        [0.987, 0.991, 0.749],
    ],
    inferno: [
        [0.001, 0.000, 0.014],
        [0.116, 0.045, 0.255],
        [0.282, 0.062, 0.421],
        [0.450, 0.118, 0.422],
        [0.612, 0.176, 0.378],
        [0.768, 0.245, 0.301],
        [0.890, 0.350, 0.198],
        [0.971, 0.491, 0.083],
        [0.988, 0.652, 0.213],
        [0.954, 0.831, 0.379],
        [0.988, 0.998, 0.645],
    ],
    turbo: [
        [0.190, 0.072, 0.231],
        [0.275, 0.408, 0.851],
        [0.166, 0.703, 0.916],
        [0.247, 0.913, 0.633],
        [0.621, 0.991, 0.349],
        [0.927, 0.959, 0.290],
        [0.999, 0.815, 0.211],
        [0.978, 0.561, 0.146],
        [0.886, 0.300, 0.075],
        [0.706, 0.083, 0.007],
        [0.480, 0.016, 0.011],
    ],
    gray: [
        [0, 0, 0],
        [1, 1, 1],
    ],
};

function gradientCss(name: ColormapName): string {
    const stops = PREVIEW_STOPS[name];
    const parts = stops.map((c, i) => {
        const pct = (i / (stops.length - 1)) * 100;
        const r = Math.round(c[0] * 255);
        const g = Math.round(c[1] * 255);
        const b = Math.round(c[2] * 255);
        return `rgb(${r},${g},${b}) ${pct.toFixed(1)}%`;
    });
    return `linear-gradient(to right, ${parts.join(", ")})`;
}

export interface ColormapTypeBinding {
    /** agent type id in the trajectory's type mapping */
    typeId: number;
    /** human-readable label, e.g. type name */
    label: string;
    /** name of the feature being colormapped */
    featureName: string;
    /** index into agentData.features */
    featureIndex: number;
    /** value range mapped across the colormap */
    min: number;
    max: number;
    /** initial colormap (or null = solid) */
    initialColormap: ColormapName | null;
}

interface Props {
    controller: SimulariumController;
    bindings: ColormapTypeBinding[];
}

interface State {
    /** typeId -> currently selected colormap (null = solid) */
    selection: Map<number, ColormapName | null>;
}

class ColormapControls extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        const selection = new Map<number, ColormapName | null>();
        for (const b of props.bindings) {
            selection.set(b.typeId, b.initialColormap);
        }
        this.state = { selection };
    }

    private handleChange = (
        binding: ColormapTypeBinding,
        value: string
    ): void => {
        const { controller } = this.props;
        const next = new Map(this.state.selection);
        if (value === "__solid__") {
            next.set(binding.typeId, null);
            controller.clearColormapForType(binding.typeId);
        } else {
            const name = value as ColormapName;
            next.set(binding.typeId, name);
            const spec: ColormapSpec = {
                name,
                featureIndex: binding.featureIndex,
                min: binding.min,
                max: binding.max,
            };
            controller.setColormapForType(binding.typeId, spec);
        }
        this.setState({ selection: next });
    };

    public render(): React.ReactNode {
        const { bindings } = this.props;
        if (bindings.length === 0) return null;
        return (
            <div
                style={{
                    border: "1px solid #ccc",
                    padding: "8px",
                    margin: "4px 0",
                    background: "#222",
                    color: "#eee",
                }}
            >
                <div style={{ fontWeight: "bold", marginBottom: "6px" }}>
                    Colormaps
                </div>
                {bindings.map((b) => {
                    const current =
                        this.state.selection.get(b.typeId) ?? null;
                    return (
                        <div
                            key={b.typeId}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                marginBottom: "6px",
                            }}
                        >
                            <div
                                style={{
                                    minWidth: "120px",
                                    fontSize: "12px",
                                }}
                            >
                                <div>{b.label}</div>
                                <div style={{ opacity: 0.7 }}>
                                    feature: {b.featureName} [{b.min}–{b.max}]
                                </div>
                            </div>
                            <select
                                value={current ?? "__solid__"}
                                onChange={(e) =>
                                    this.handleChange(b, e.target.value)
                                }
                                style={{ minWidth: "100px" }}
                            >
                                <option value="__solid__">Solid</option>
                                {BUILT_IN_COLORMAPS.map((name) => (
                                    <option key={name} value={name}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                            <div
                                title={current ?? "solid color"}
                                style={{
                                    flex: 1,
                                    height: "18px",
                                    border: "1px solid #444",
                                    borderRadius: "3px",
                                    background: current
                                        ? gradientCss(current)
                                        : "repeating-linear-gradient(45deg,#555,#555 4px,#666 4px,#666 8px)",
                                }}
                            />
                            {/* Inline range labels */}
                            <div
                                style={{
                                    fontSize: "11px",
                                    minWidth: "60px",
                                    textAlign: "right",
                                    opacity: 0.7,
                                }}
                            >
                                {b.min} → {b.max}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }
}

export default ColormapControls;
