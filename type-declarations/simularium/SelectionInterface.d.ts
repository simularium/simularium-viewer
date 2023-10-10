import { EncodedTypeMapping } from "./types";
export interface SelectionEntry {
    name: string;
    tags: string[];
}
export interface ColorChanges {
    agents: SelectionEntry[];
    color: string;
}
export interface SelectionStateInfo {
    highlightedAgents: SelectionEntry[];
    hiddenAgents: SelectionEntry[];
    colorChanges: ColorChanges[];
}
interface DisplayStateEntry {
    name: string;
    id: string;
    color: string;
}
export interface UIDisplayEntry {
    name: string;
    displayStates: DisplayStateEntry[];
    color: string;
}
export declare type UIDisplayData = UIDisplayEntry[];
declare class SelectionInterface {
    private entries;
    constructor();
    containsName(name: string): boolean;
    containsTag(tag: string): boolean;
    parse(idNameMapping: EncodedTypeMapping): void;
    decode(encodedName: string, color: string, idParam?: number): void;
    getUnmodifiedStateId(name: string): number | null;
    getColorsForName(name: string): string[];
    getIds(name: string, tags?: string[]): number[];
    getIdsByTags(tags: string[]): number[];
    getTags(name: string, id: number): string[];
    getAgentIdsByNamesAndTags(requests: SelectionEntry[]): number[];
    getHighlightedIds(info: SelectionStateInfo): number[];
    getHiddenIds(info: SelectionStateInfo): number[];
    clear(): void;
    getUIDisplayData(): UIDisplayData;
    private updateUiDataColor;
    updateAgentColors(agentIds: number[], colorChanges: ColorChanges, uiDisplayData: UIDisplayData): void;
    setInitialAgentColors(uiDisplayData: UIDisplayData, colors: (string | number)[], setColorForIds: (ids: number[], colorIndex: number) => void): (string | number)[];
}
export { SelectionInterface };
export default SelectionInterface;
