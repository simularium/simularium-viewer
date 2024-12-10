import { EncodedTypeMapping } from "./types.js";
import { ColorAssignment } from "../visGeometry/types.js";
export interface SelectionEntry {
    name: string;
    tags: string[];
}
export interface SelectionStateInfo {
    highlightedAgents: SelectionEntry[];
    hiddenAgents: SelectionEntry[];
    appliedColors: UIDisplayData;
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
export type UIDisplayData = UIDisplayEntry[];
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
    getParentColor(name: string): string;
    getUIDisplayData(): UIDisplayData;
    private updateUiDataColor;
    setInitialAgentColors(uiDisplayData: UIDisplayData, colors: (string | number)[], setColorForIds: (colorAssignments: ColorAssignment[]) => void): (string | number)[];
}
export { SelectionInterface };
export default SelectionInterface;
