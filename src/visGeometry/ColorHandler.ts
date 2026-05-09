import { map, round, isEqual } from "lodash";
import { Color } from "three";
import { AgentColorInfo } from "./types.js";
import { ColormapSpec } from "../simularium/types.js";
import {
    COLORMAP_LUT_FLOATS,
    COLORMAP_LUT_SIZE,
    buildColormapLut,
} from "./Colormaps.js";

export function convertColorStringToNumber(color: number | string): number {
    if (typeof color !== "string") {
        return color;
    }
    return parseInt(color.toString().replace(/^#/, "0x"), 16);
}

export function convertColorNumberToString(color: number | string): string {
    if (typeof color === "string") {
        return color;
    }
    return "#" + new Color(color).getHexString();
}

export const checkHexColor = (color: string): string => {
    const hexColorCodeRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexColorCodeRegex.test(color)) {
        throw new Error("Invalid color code");
    }
    return color;
};

/**
 * Per-type colormap state. When a type has an entry here, it is rendered via
 * colormap lookup instead of its solid color. `lutRow` indexes the row in
 * the LUT atlas where this colormap's 256-entry RGBA palette lives.
 */
export interface ColormapTypeState {
    spec: ColormapSpec;
    lutRow: number;
    featureIndex: number;
    min: number;
    max: number;
}

class ColorHandler {
    public agentTypeToColorId: Map<number, number>;
    private colorsData: Float32Array;
    /**
     * agentType -> colormap state, when the type is colormapped.
     * Types not in this map render via the solid-color path.
     */
    private agentTypeToColormap: Map<number, ColormapTypeState>;
    /**
     * 2D LUT atlas (rows of 256 RGBA entries) packed into a Float32Array.
     * Length = lutAtlasRows * COLORMAP_LUT_FLOATS.
     */
    private lutAtlas: Float32Array;
    private lutAtlasRows: number;

    constructor() {
        this.agentTypeToColorId = new Map<number, number>();
        // will be set by makeColorDataArray, but need to initialize
        // so that typescript doesn't complain
        this.colorsData = new Float32Array(0);
        this.agentTypeToColormap = new Map<number, ColormapTypeState>();
        this.lutAtlas = new Float32Array(0);
        this.lutAtlasRows = 0;
    }

    private get numberOfColors(): number {
        return this.colorsData.length / 4;
    }

    private makeColorDataArray(colors: (number | string)[]): Float32Array {
        const colorNumbers = colors.map(convertColorStringToNumber);
        const numberOfColors = colors.length;
        // fill buffer of colors:
        const colorsData = new Float32Array(numberOfColors * 4);
        for (let i = 0; i < numberOfColors; i += 1) {
            // each color is currently a hex value:
            colorsData[i * 4 + 0] =
                ((colorNumbers[i] & 0x00ff0000) >> 16) / 255.0;
            colorsData[i * 4 + 1] =
                ((colorNumbers[i] & 0x0000ff00) >> 8) / 255.0;
            colorsData[i * 4 + 2] =
                ((colorNumbers[i] & 0x000000ff) >> 0) / 255.0;
            colorsData[i * 4 + 3] = 1.0;
        }
        return colorsData;
    }

    private convertDataColorIndexToId(dataColorIndex: number): number {
        if (dataColorIndex % 4 !== 0) {
            return -1;
        }
        const index = dataColorIndex / 4;
        // this loops the index back to the beginning of the array
        // in the chance that the index is out of range, which
        // should be impossible. But just being cautious
        return index % this.numberOfColors;
    }

    /**
     * returns the index into the colorsData array
     */
    private getColorDataIndex(color: number[]): number {
        const colorArray = this.colorsData;
        const colorToCheck = map(color, (num) => round(num, 6));
        for (let i = 0; i < colorArray.length - 3; i += 4) {
            const index = i;
            const currentColor = [
                round(this.colorsData[i], 6),
                round(this.colorsData[i + 1], 6),
                round(this.colorsData[i + 2], 6),
                this.colorsData[i + 3],
            ];
            if (isEqual(currentColor, colorToCheck)) {
                return index;
            }
        }
        return -1;
    }

    /**
     * returns the index in terms of numberOfColors (colorId). No conversion
     * is necessary because agentTypeToColorId is also using this index
     */
    private getColorIdForAgentType(typeId: number): number {
        const index = this.agentTypeToColorId.get(typeId);
        if (index === undefined) {
            return -1;
        }
        const colorId = index % this.numberOfColors;
        return colorId;
    }

    /**
     * @param agentType agent type number
     * @param colorId index into the numberOfColors
     */
    private setColorForAgentType(agentType: number, colorId: number): void {
        this.agentTypeToColorId.set(agentType, colorId);
    }

    private getColorById(colorId: number): Color {
        if (colorId < 0) {
            colorId = 0;
        }
        if (colorId >= this.numberOfColors) {
            colorId = colorId % this.numberOfColors;
        }

        return new Color(
            this.colorsData[colorId * 4],
            this.colorsData[colorId * 4 + 1],
            this.colorsData[colorId * 4 + 2]
        );
    }

    private addNewColor(color: number | string): number {
        const colorNumber = convertColorStringToNumber(color);
        const newColor = [
            ((colorNumber & 0x00ff0000) >> 16) / 255.0,
            ((colorNumber & 0x0000ff00) >> 8) / 255.0,
            ((colorNumber & 0x000000ff) >> 0) / 255.0,
            1.0,
        ];
        const colorDataIndex = this.getColorDataIndex(newColor);
        if (colorDataIndex !== -1) {
            // found the color, need to return the colorId to the
            // external caller, with no other changes needed
            return this.convertDataColorIndexToId(colorDataIndex);
        }
        // the color isn't in colorsData, so add it and return the colorId
        const newColorDataIndex = this.colorsData.length;
        const newArray = [...this.colorsData, ...newColor];
        const newColorData = new Float32Array(newArray.length);
        newColorData.set(newArray);
        this.colorsData = newColorData;
        return this.convertDataColorIndexToId(newColorDataIndex);
    }

    /**
     * Check if the new color is in our current array of color options, if not,
     * add it before returning the index
     */
    private getColorId(color: string): number {
        return this.addNewColor(color);
    }

    public updateColorArray(colors: (number | string)[]): {
        colorArray: Float32Array;
        numberOfColors: number;
    } {
        this.colorsData = this.makeColorDataArray(colors);
        return {
            colorArray: this.colorsData,
            numberOfColors: this.numberOfColors,
        };
    }

    public clearColorMapping(): void {
        this.agentTypeToColorId.clear();
    }

    public setColorForAgentTypes(
        agentTypes: number[],
        color: string | number
    ): { colorArray: Float32Array; numberOfColors: number } {
        const colorString = convertColorNumberToString(color);
        const colorId = this.getColorId(colorString);
        /**
         * Sets one color for a set of ids, using an index into a color array
         * @param ids agent ids that should all have the same color
         * @param colorId index into the numberOfColors
         */
        agentTypes.forEach((id) => {
            this.setColorForAgentType(id, colorId);
        });
        return {
            colorArray: this.colorsData,
            numberOfColors: this.numberOfColors,
        };
    }

    public getColorInfoForAgentType(agentType: number): AgentColorInfo {
        const colorId = this.getColorIdForAgentType(agentType);
        const color = this.getColorById(colorId);
        return { color, colorId };
    }

    public resetDefaultColorsData(defaultColors: (number | string)[]): void {
        this.clearColorMapping();
        this.updateColorArray(defaultColors);
    }

    /**
     * Register or replace a colormap for an agent type. When a type has a
     * colormap, instances of that type render via colormap lookup using
     * `agentData.features[spec.featureIndex]` normalized into `[spec.min,
     * spec.max]`.
     *
     * Returns the row in the LUT atlas where this colormap was placed, plus
     * the current atlas contents so the caller can rebuild the GPU texture.
     */
    public setColormapForType(
        agentType: number,
        spec: ColormapSpec
    ): { lutAtlas: Float32Array; lutAtlasRows: number; lutRow: number } {
        const lut = buildColormapLut(spec);
        const existing = this.agentTypeToColormap.get(agentType);
        let lutRow: number;
        if (existing) {
            lutRow = existing.lutRow;
            this.lutAtlas.set(lut, lutRow * COLORMAP_LUT_FLOATS);
        } else {
            lutRow = this.lutAtlasRows;
            const newRows = this.lutAtlasRows + 1;
            const newAtlas = new Float32Array(newRows * COLORMAP_LUT_FLOATS);
            newAtlas.set(this.lutAtlas, 0);
            newAtlas.set(lut, lutRow * COLORMAP_LUT_FLOATS);
            this.lutAtlas = newAtlas;
            this.lutAtlasRows = newRows;
        }
        this.agentTypeToColormap.set(agentType, {
            spec,
            lutRow,
            featureIndex: spec.featureIndex,
            min: spec.min,
            max: spec.max,
        });
        return {
            lutAtlas: this.lutAtlas,
            lutAtlasRows: this.lutAtlasRows,
            lutRow,
        };
    }

    /**
     * Remove a type's colormap, reverting it to solid-color rendering.
     * The type's LUT row is left in place (the row index remains valid for
     * any other types that might share it in the future); only the per-type
     * mapping is cleared.
     */
    public clearColormapForType(agentType: number): void {
        this.agentTypeToColormap.delete(agentType);
    }

    /**
     * Returns the colormap state for an agent type, or null if the type is
     * rendered with a solid color.
     */
    public getColormapInfoForType(agentType: number): ColormapTypeState | null {
        return this.agentTypeToColormap.get(agentType) ?? null;
    }

    /** True if any type currently has a colormap registered. */
    public hasAnyColormap(): boolean {
        return this.agentTypeToColormap.size > 0;
    }

    /**
     * Return the current LUT atlas. Each row is COLORMAP_LUT_SIZE RGBA entries.
     * Caller may upload this to a `DataTexture` of size
     * `(COLORMAP_LUT_SIZE, lutAtlasRows)`.
     */
    public getLutAtlas(): {
        lutAtlas: Float32Array;
        lutAtlasRows: number;
        lutWidth: number;
    } {
        return {
            lutAtlas: this.lutAtlas,
            lutAtlasRows: this.lutAtlasRows,
            lutWidth: COLORMAP_LUT_SIZE,
        };
    }
}

export default ColorHandler;
