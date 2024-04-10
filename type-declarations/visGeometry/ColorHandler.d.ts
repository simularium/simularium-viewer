import { AgentColorInfo } from "./types";
export declare function convertColorStringToNumber(color: number | string): number;
export declare function convertColorNumberToString(color: number | string): string;
export declare const checkHexColor: (color: string) => string;
declare class ColorHandler {
    agentTypeToColorId: Map<number, number>;
    private colorsData;
    constructor();
    private get numberOfColors();
    private makeColorDataArray;
    private convertDataColorIndexToId;
    /**
     * returns the index into the colorsData array
     */
    private getColorDataIndex;
    /**
     * returns the index in terms of numberOfColors (colorId). No conversion
     * is necessary because agentTypeToColorId is also using this index
     */
    private getColorIdForAgentType;
    /**
     * @param agentType agent type number
     * @param colorId index into the numberOfColors
     */
    private setColorForAgentType;
    private getColorById;
    private addNewColor;
    /**
     * Check if the new color is in our current array of color options, if not,
     * add it before returning the index
     */
    private getColorId;
    updateColorArray(colors: (number | string)[]): {
        colorArray: Float32Array;
        numberOfColors: number;
    };
    clearColorMapping(): void;
    setColorForAgentTypes(agentTypes: number[], color: string | number): {
        colorArray: Float32Array;
        numberOfColors: number;
    };
    getColorInfoForAgentType(agentType: number): AgentColorInfo;
    resetDefaultColorsData(defaultColors: (number | string)[]): void;
}
export default ColorHandler;
