import { map, round, isEqual } from "lodash";
import { Color } from "three";

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

class ColorHandler {
    public idColorMapping: Map<number, number>;
    private colorsData: Float32Array;

    constructor() {
        this.idColorMapping = new Map<number, number>();
        // will be set by setColorArray, but need to initialize
        // so that typescript doesn't complain
        this.colorsData = new Float32Array(this.numberOfColors * 4);
    }

    private get numberOfColors(): number {
        return this.colorsData.length / 4;
    }

    private setColorArray(colors: (number | string)[]): Float32Array {
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
     * is necessary because idColorMapping is also using this index
     */
    private getColorIdForAgentType(typeId: number): number {
        const index = this.idColorMapping.get(typeId);
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
        this.idColorMapping.set(agentType, colorId);
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
        this.colorsData = this.setColorArray(colors);
        return {
            colorArray: this.colorsData,
            numberOfColors: this.numberOfColors,
        };
    }

    public clearColorMapping(): void {
        this.idColorMapping.clear();
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

    public getColorForAgentType(agentType: number): Color {
        const index = this.getColorIdForAgentType(agentType);
        return this.getColorById(index);
    }

    public getColorInfoForAgentType(agentType: number): {
        color: Color;
        colorId: number;
    } {
        const color = this.getColorForAgentType(agentType);
        const colorId = this.getColorIdForAgentType(agentType);
        return { color, colorId };
    }
}

export default ColorHandler;
