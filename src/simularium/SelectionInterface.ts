import { filter, find, uniq } from "lodash";
import { EncodedTypeMapping } from "./types";
import { convertColorNumberToString } from "../visGeometry/color-utils";

// An individual entry parsed from an encoded name
interface DecodedTypeEntry {
    id: number;
    name: string;
    tags: string[];
    color: string;
}

export interface SelectionEntry {
    name: string;
    tags: string[];
}

export interface SelectionStateInfo {
    highlightedAgents: SelectionEntry[];
    hiddenAgents: SelectionEntry[];
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

class SelectionInterface {
    private entries: Map<string, DecodedTypeEntry>;

    public constructor() {
        this.entries = new Map<string, DecodedTypeEntry>();
    }

    public containsName(name: string): boolean {
        return this.entries.hasOwnProperty(name);
    }

    public containsTag(tag: string): boolean {
        return Object.values(this.entries).some((entriesArr) => {
            return entriesArr.some((entry) => {
                return entry.tags.includes(tag);
            });
        });
    }

    // errors will be caught in a try/catch block in the viewport
    // If an onError can be caught by onError prop to viewer, will be
    // sent to the parent app
    public parse(idNameMapping: EncodedTypeMapping): void {
        this.clear();
        if (!idNameMapping) {
            throw new Error(
                "Trajectory is missing agent type mapping information."
            );
        }
        Object.keys(idNameMapping).forEach((id) => {
            if (isNaN(parseInt(id))) {
                throw new Error(`Agent ids should be integers, ${id} is not`);
            }
            if (!idNameMapping[id].name) {
                throw new Error(`Missing agent name for agent ${id}`);
            }
            let color = "";
            if (idNameMapping[id].geometry) {
                color = idNameMapping[id].geometry.color;
            }
            this.decode(idNameMapping[id].name, color, parseInt(id));
        });
    }

    public decode(encodedName: string, color: string, idParam?: number): void {
        let name = "";
        let tags: string[] = [];
        const id = idParam !== undefined ? idParam : -1;

        if (encodedName.includes("#")) {
            const s = encodedName.split("#");
            tags = s[1].split("_");
            name = s[0];
        } else {
            name = encodedName;
        }

        if (!name) {
            // error can be caught by onError prop to viewer
            throw new Error(
                `invalid name. Agent id: ${id}, name: ${encodedName}`
            );
        }

        const uniqueTags = [...new Set(tags)];
        const entry = { id, name, tags: uniqueTags, color };
        if (!this.containsName(name)) {
            this.entries[name] = [];
        }
        this.entries[name].push(entry);
    }

    public getUnmodifiedStateId(name: string): number | null {
        const entryList = this.entries[name];
        if (!entryList) {
            return null;
        }

        const unmodified = entryList.find((entry: DecodedTypeEntry) => {
            return entry.tags.length === 0;
        });
        return unmodified ? unmodified.id : null;
    }

    public getColorsForName(name: string): string[] {
        const entryList = this.entries[name];
        const colors: string[] = [];
        if (!entryList) {
            return [];
        }
        entryList.forEach((entry: DecodedTypeEntry) => {
            if (entry.id >= 0) {
                colors.push(entry.color);
            }
        });
        return colors;
    }

    public getIds(name: string, tags?: string[]): number[] {
        const entryList = this.entries[name];
        const indices: number[] = [];
        if (!entryList) {
            return [];
        }
        entryList.forEach((entry) => {
            if (
                !tags ||
                tags.length === 0 ||
                tags.some((t) => entry.tags.includes(t))
            ) {
                if (entry.id >= 0) {
                    indices.push(entry.id);
                }
            }
            // unmodified state, include entries without any state tags
            if (tags && tags.includes("") && entry.tags.length === 0) {
                if (entry.id >= 0) {
                    indices.push(entry.id);
                }
            }
        });

        return indices;
    }

    public getIdsByTags(tags: string[]): number[] {
        let indices: number[] = [];
        Object.keys(this.entries).forEach((name) => {
            indices = indices.concat(this.getIds(name, tags));
        });

        indices.sort((a, b) => {
            return a - b;
        });
        return indices;
    }

    public getTags(name: string, id: number): string[] {
        const entryList = this.entries[name];
        if (!entryList) {
            return [];
        }
        const state = find(
            entryList,
            (entry: DecodedTypeEntry) => entry.id === id
        );
        if (state) {
            return state.tags;
        }
        return [];
    }
    /*
     * If an entity has both a name and all the tags specified in the
     * selection state info, it will be considered highlighted
     */
    public getHighlightedIds(info: SelectionStateInfo): number[] {
        const requests = info.highlightedAgents;
        let indices: number[] = [];

        requests.forEach((r) => {
            const name = r.name;
            const tags = r.tags;
            indices = [...indices, ...this.getIds(name, tags)];
        });
        return indices;
    }

    /*
     * If an entry has a name specified in the selection state info
     * or a tag specified, it will be considered hidden
     */
    public getHiddenIds(info: SelectionStateInfo): number[] {
        const requests = info.hiddenAgents;
        let indices: number[] = [];

        requests.forEach((r) => {
            const name = r.name;
            const tags = r.tags;
            indices = [...indices, ...this.getIds(name, tags)];
        });

        return indices;
    }

    public clear(): void {
        this.entries = new Map<string, DecodedTypeEntry>();
    }

    public getUIDisplayData(): UIDisplayData {
        return Object.keys(this.entries).map((name) => {
            const displayStates: DisplayStateEntry[] = [];
            const encounteredTags: string[] = [];
            const hasMultipleStates =
                Object.keys(this.entries[name]).length > 1;
            this.entries[name].forEach((entry: DecodedTypeEntry) => {
                // add unmodified state if there are multiple states, and one of them
                // has no state tags
                if (!entry.tags.length && hasMultipleStates) {
                    displayStates.push({
                        name: "<unmodified>",
                        id: "", // selects agents with no state tags
                        color: entry.color,
                    });
                }
                entry.tags.forEach((tag: string) => {
                    if (encounteredTags.includes(tag)) {
                        return;
                    }
                    encounteredTags.push(tag);

                    const displayState: DisplayStateEntry = {
                        name: tag,
                        id: tag,
                        color: entry.color,
                    };
                    displayStates.push(displayState);
                });
            });

            const color = "";
            return {
                name,
                displayStates,
                color,
            };
        });
    }

    private updateUiDataColor(
        entry: UIDisplayEntry,
        id: number,
        color: number | string
    ) {
        const tagsToUpdate = this.getTags(entry.name, id);
        entry.displayStates.forEach((displayState: DisplayStateEntry) => {
            if (tagsToUpdate.includes(displayState.id)) {
                displayState.color = convertColorNumberToString(color);
            }
        });
    }

    public setAgentColors(
        uiDisplayData: UIDisplayData,
        colors: (string | number)[],
        setColorForIds: (ids: number[], colorIndex: number) => void
    ): (string | number)[] {
        let defaultColorIndex = 0;
        uiDisplayData.forEach((group) => {
            // the color for the whole grouping for this entry.name
            let groupColorIndex = defaultColorIndex;
            // list of ids that all have this same name
            const ids = this.getIds(group.name);
            // list of colors for this entry, will be empty strings for
            // ids that don't have a user set color
            const newColors = this.getColorsForName(group.name);
            const hasNewColors = filter(newColors).length > 0;
            const allTheSameColor = uniq(newColors).length === 1;
            if (!hasNewColors) {
                // if no colors have been set by the user for this name,
                // just give all states of this agent name the same color
                setColorForIds(ids, defaultColorIndex);
            } else {
                // otherwise, we need to update any user defined colors
                newColors.forEach((color, index) => {
                    // color for each agent id (can be different states of a single
                    // entity, ie, bound and unbound states).
                    // All agents with unspecified colors in this grouping
                    // will still get the same default color as each other

                    let agentColorIndex = defaultColorIndex;
                    if (color) {
                        agentColorIndex = colors.indexOf(color);
                        if (agentColorIndex === -1) {
                            // add color to color array
                            colors = [...colors, color];
                            agentColorIndex = colors.length - 1;
                        }
                    } else {
                        // need update the display data with the default color being used
                        this.updateUiDataColor(
                            group,
                            ids[index],
                            colors[groupColorIndex]
                        );
                    }
                    // if the user used all the same colors for all states of this agent,
                    // use that for the group as well
                    // otherwise the grouping color will be blank
                    if (allTheSameColor) {
                        groupColorIndex = agentColorIndex;
                    } else {
                        groupColorIndex = -1;
                    }
                    setColorForIds([ids[index]], agentColorIndex);
                });
            }
            if (groupColorIndex > -1) {
                group.color = convertColorNumberToString(
                    colors[groupColorIndex]
                );
            } else {
                group.color = "";
            }
            // if we used any of the default color array
            // need to go to the next default color.
            if (
                filter(newColors).length !== ids.length ||
                groupColorIndex === defaultColorIndex
            ) {
                defaultColorIndex++;
            }
        });

        return colors;
    }
}

export { SelectionInterface };
export default SelectionInterface;
