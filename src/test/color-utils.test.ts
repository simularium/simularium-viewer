import {
    convertColorStringToNumber,
    convertColorNumberToString,
} from "../visGeometry/ColorHandler.js";
import ColorHandler from "../visGeometry/ColorHandler.js";
import {
    buildColormapLut,
    sampleColormap,
    isBuiltInColormap,
    COLORMAP_LUT_SIZE,
    COLORMAP_LUT_FLOATS,
} from "../visGeometry/Colormaps.js";
import { ColormapSpec } from "../simularium/types.js";

describe("VisGeometry color-utils", () => {
    describe("convertColorStringToNumber", () => {
        test("returns a color number as is", () => {
            expect(convertColorStringToNumber(16777215)).toEqual(16777215);
        });
        test("converts a hex color string to a base-16 number", () => {
            expect(convertColorStringToNumber("#ffffff")).toEqual(16777215);
        });
    });
    describe("convertColorNumberToString", () => {
        test("returns a color string as is", () => {
            expect(convertColorNumberToString("#ffffff")).toEqual("#ffffff");
        });
        test("converts a base-16 color number to a hex color string", () => {
            expect(convertColorNumberToString(16777215)).toEqual("#ffffff");
        });
    });

    describe("Colormaps", () => {
        test("isBuiltInColormap recognizes known names", () => {
            expect(isBuiltInColormap("viridis")).toBe(true);
            expect(isBuiltInColormap("turbo")).toBe(true);
            expect(isBuiltInColormap("gray")).toBe(true);
            expect(isBuiltInColormap("not-a-real-map")).toBe(false);
        });

        test("buildColormapLut produces a 256-entry RGBA LUT for built-ins", () => {
            const lut = buildColormapLut({
                name: "viridis",
                featureIndex: 0,
                min: 0,
                max: 1,
            });
            expect(lut).toBeInstanceOf(Float32Array);
            expect(lut.length).toBe(COLORMAP_LUT_FLOATS);
            // Alpha must be 1 in every entry
            for (let i = 0; i < COLORMAP_LUT_SIZE; i++) {
                expect(lut[i * 4 + 3]).toBe(1.0);
            }
        });

        test("gray ramp interpolates from black to white", () => {
            const lut = buildColormapLut({
                name: "gray",
                featureIndex: 0,
                min: 0,
                max: 1,
            });
            // index 0 => black
            expect(lut[0]).toBeCloseTo(0, 5);
            expect(lut[1]).toBeCloseTo(0, 5);
            expect(lut[2]).toBeCloseTo(0, 5);
            // last index => white
            const last = (COLORMAP_LUT_SIZE - 1) * 4;
            expect(lut[last + 0]).toBeCloseTo(1, 5);
            expect(lut[last + 1]).toBeCloseTo(1, 5);
            expect(lut[last + 2]).toBeCloseTo(1, 5);
            // midpoint should be ~0.5 gray
            const mid = Math.floor(COLORMAP_LUT_SIZE / 2) * 4;
            expect(lut[mid]).toBeGreaterThan(0.4);
            expect(lut[mid]).toBeLessThan(0.6);
        });

        test("custom stops override built-in name", () => {
            const spec: ColormapSpec = {
                name: "viridis",
                stops: [
                    [1, 0, 0],
                    [0, 0, 1],
                ],
                featureIndex: 0,
                min: 0,
                max: 1,
            };
            const start = sampleColormap(spec, 0);
            const end = sampleColormap(spec, 1);
            expect(start[0]).toBeCloseTo(1, 5);
            expect(start[2]).toBeCloseTo(0, 5);
            expect(end[0]).toBeCloseTo(0, 5);
            expect(end[2]).toBeCloseTo(1, 5);
        });

        test("sampleColormap clamps t outside [0,1]", () => {
            const spec: ColormapSpec = {
                name: "gray",
                featureIndex: 0,
                min: 0,
                max: 1,
            };
            const below = sampleColormap(spec, -1);
            const above = sampleColormap(spec, 2);
            expect(below[0]).toBeCloseTo(0, 5);
            expect(above[0]).toBeCloseTo(1, 5);
        });

        test("buildColormapLut throws for unknown name with no stops", () => {
            // Cast through unknown to bypass the ColormapName check for this
            // negative test.
            expect(() =>
                buildColormapLut({
                    name: "definitely-not-a-map" as unknown as never,
                    featureIndex: 0,
                    min: 0,
                    max: 1,
                })
            ).toThrow();
        });
    });

    describe("ColorHandler colormap mode", () => {
        test("setColormapForType registers a row in the LUT atlas", () => {
            const handler = new ColorHandler();
            const result = handler.setColormapForType(7, {
                name: "viridis",
                featureIndex: 0,
                min: 0,
                max: 1,
            });
            expect(result.lutRow).toBe(0);
            expect(result.lutAtlasRows).toBe(1);
            expect(result.lutAtlas.length).toBe(COLORMAP_LUT_FLOATS);
            const info = handler.getColormapInfoForType(7);
            expect(info).not.toBeNull();
            expect(info?.lutRow).toBe(0);
            expect(info?.featureIndex).toBe(0);
            expect(handler.hasAnyColormap()).toBe(true);
        });

        test("registering a second type appends a new atlas row", () => {
            const handler = new ColorHandler();
            handler.setColormapForType(1, {
                name: "viridis",
                featureIndex: 0,
                min: 0,
                max: 1,
            });
            const second = handler.setColormapForType(2, {
                name: "plasma",
                featureIndex: 1,
                min: -1,
                max: 1,
            });
            expect(second.lutRow).toBe(1);
            expect(second.lutAtlasRows).toBe(2);
            expect(second.lutAtlas.length).toBe(2 * COLORMAP_LUT_FLOATS);
        });

        test("re-registering a type reuses its atlas row", () => {
            const handler = new ColorHandler();
            const first = handler.setColormapForType(5, {
                name: "viridis",
                featureIndex: 0,
                min: 0,
                max: 1,
            });
            const replaced = handler.setColormapForType(5, {
                name: "plasma",
                featureIndex: 0,
                min: 0,
                max: 1,
            });
            expect(replaced.lutRow).toBe(first.lutRow);
            expect(replaced.lutAtlasRows).toBe(1);
        });

        test("clearColormapForType removes the per-type mapping", () => {
            const handler = new ColorHandler();
            handler.setColormapForType(3, {
                name: "gray",
                featureIndex: 0,
                min: 0,
                max: 1,
            });
            handler.clearColormapForType(3);
            expect(handler.getColormapInfoForType(3)).toBeNull();
            expect(handler.hasAnyColormap()).toBe(false);
        });

        test("getLutAtlas exposes width and row count", () => {
            const handler = new ColorHandler();
            handler.setColormapForType(1, {
                name: "viridis",
                featureIndex: 0,
                min: 0,
                max: 1,
            });
            const atlas = handler.getLutAtlas();
            expect(atlas.lutWidth).toBe(COLORMAP_LUT_SIZE);
            expect(atlas.lutAtlasRows).toBe(1);
            expect(atlas.lutAtlas.length).toBe(COLORMAP_LUT_FLOATS);
        });
    });
});
