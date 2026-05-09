import { ColormapName, ColormapSpec, RgbStop } from "../simularium/types.js";

/**
 * Built-in colormaps and helpers for converting a `ColormapSpec` into a
 * fixed-size RGBA lookup table for shader sampling.
 *
 * LUTs produced here are 256 RGBA float entries (1024 floats), each component
 * normalized to [0,1]. Position 0.0 maps to LUT index 0 and position 1.0 maps
 * to LUT index 255.
 */

export const COLORMAP_LUT_SIZE = 256;
export const COLORMAP_LUT_FLOATS = COLORMAP_LUT_SIZE * 4;

/**
 * Built-in colormaps as anchor stops. Each entry is at evenly-spaced positions
 * [0, 1] and the LUT is produced by piecewise-linear interpolation between
 * adjacent stops.
 *
 * Approximate matplotlib palettes (viridis/plasma/magma/inferno) and Google
 * turbo, plus a simple grayscale ramp.
 */
const BUILT_IN_STOPS: Record<ColormapName, RgbStop[]> = {
    viridis: [
        [0.267, 0.005, 0.329],
        [0.282, 0.141, 0.458],
        [0.254, 0.265, 0.53],
        [0.207, 0.372, 0.553],
        [0.164, 0.471, 0.558],
        [0.128, 0.567, 0.551],
        [0.135, 0.659, 0.518],
        [0.267, 0.749, 0.441],
        [0.478, 0.821, 0.318],
        [0.741, 0.873, 0.15],
        [0.993, 0.906, 0.144],
    ],
    plasma: [
        [0.05, 0.029, 0.528],
        [0.207, 0.014, 0.609],
        [0.355, 0.004, 0.643],
        [0.503, 0.029, 0.629],
        [0.638, 0.122, 0.55],
        [0.748, 0.224, 0.451],
        [0.842, 0.328, 0.357],
        [0.917, 0.434, 0.272],
        [0.967, 0.555, 0.197],
        [0.991, 0.696, 0.146],
        [0.94, 0.975, 0.131],
    ],
    magma: [
        [0.001, 0.0, 0.014],
        [0.083, 0.067, 0.236],
        [0.226, 0.111, 0.404],
        [0.378, 0.146, 0.464],
        [0.529, 0.181, 0.466],
        [0.683, 0.215, 0.434],
        [0.833, 0.275, 0.379],
        [0.945, 0.388, 0.349],
        [0.992, 0.553, 0.382],
        [0.997, 0.722, 0.479],
        [0.987, 0.991, 0.75],
    ],
    inferno: [
        [0.001, 0.0, 0.014],
        [0.099, 0.043, 0.244],
        [0.234, 0.06, 0.355],
        [0.366, 0.087, 0.412],
        [0.494, 0.122, 0.4],
        [0.633, 0.166, 0.355],
        [0.762, 0.236, 0.282],
        [0.871, 0.343, 0.18],
        [0.948, 0.481, 0.075],
        [0.984, 0.66, 0.044],
        [0.988, 0.998, 0.645],
    ],
    turbo: [
        [0.189, 0.071, 0.232],
        [0.275, 0.317, 0.829],
        [0.241, 0.546, 0.974],
        [0.143, 0.736, 0.879],
        [0.158, 0.86, 0.685],
        [0.378, 0.945, 0.486],
        [0.621, 0.984, 0.343],
        [0.84, 0.95, 0.232],
        [0.975, 0.812, 0.157],
        [0.989, 0.585, 0.105],
        [0.92, 0.318, 0.044],
        [0.696, 0.124, 0.018],
        [0.479, 0.016, 0.011],
    ],
    gray: [
        [0.0, 0.0, 0.0],
        [1.0, 1.0, 1.0],
    ],
};

/**
 * True if the given string names a built-in colormap.
 */
export function isBuiltInColormap(name: string): name is ColormapName {
    return Object.prototype.hasOwnProperty.call(BUILT_IN_STOPS, name);
}

/**
 * Resolve the anchor stops for a `ColormapSpec`. User-provided `stops` take
 * precedence over `name`. Returns null if neither is usable.
 */
function resolveStops(spec: ColormapSpec): RgbStop[] | null {
    if (spec.stops && spec.stops.length >= 2) {
        return spec.stops;
    }
    if (spec.name && isBuiltInColormap(spec.name)) {
        return BUILT_IN_STOPS[spec.name];
    }
    return null;
}

/**
 * Build a 256-entry RGBA LUT (Float32Array of length COLORMAP_LUT_FLOATS) from
 * a `ColormapSpec`. Stops are placed at evenly-spaced positions in [0,1] and
 * interpolated linearly. Throws if the spec has neither valid stops nor a
 * recognized built-in name.
 */
export function buildColormapLut(spec: ColormapSpec): Float32Array {
    const stops = resolveStops(spec);
    if (!stops) {
        throw new Error(
            `ColormapSpec must specify either a known 'name' or an array ` +
                `of at least 2 'stops'.`
        );
    }
    const lut = new Float32Array(COLORMAP_LUT_FLOATS);
    const nStops = stops.length;
    // Map LUT index [0..255] -> position t in [0..1] -> position s in [0..nStops-1]
    for (let i = 0; i < COLORMAP_LUT_SIZE; i++) {
        const t = i / (COLORMAP_LUT_SIZE - 1);
        const s = t * (nStops - 1);
        const lo = Math.floor(s);
        const hi = Math.min(lo + 1, nStops - 1);
        const f = s - lo;
        const a = stops[lo];
        const b = stops[hi];
        lut[i * 4 + 0] = a[0] + (b[0] - a[0]) * f;
        lut[i * 4 + 1] = a[1] + (b[1] - a[1]) * f;
        lut[i * 4 + 2] = a[2] + (b[2] - a[2]) * f;
        lut[i * 4 + 3] = 1.0;
    }
    return lut;
}

/**
 * Sample a built-in or custom colormap at a normalized position t in [0,1].
 * Convenience for tests and CPU-side preview; the renderer samples the LUT
 * directly via a texture.
 */
export function sampleColormap(
    spec: ColormapSpec,
    t: number
): [number, number, number] {
    const lut = buildColormapLut(spec);
    const clamped = Math.max(0, Math.min(1, t));
    const idx = Math.round(clamped * (COLORMAP_LUT_SIZE - 1));
    return [lut[idx * 4 + 0], lut[idx * 4 + 1], lut[idx * 4 + 2]];
}
