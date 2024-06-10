import { filter, find, map, uniq } from "lodash";
import { EncodedTypeMapping } from "./types";
import { convertColorNumberToString } from "../visGeometry/ColorHandler";
import { ColorSetting } from "../visGeometry/types";

// An individual entry parsed from an encoded name
// The encoded names can be just a name or a name plus a
// state, such as "proteinA#bound"
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

export interface ColorChange {
    agent: SelectionEntry;
    color: string;
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
        /**
         * Takes an encoded name, the color and the agent id, and stores
         * a decoded entry on the class mapped by the agent name
         */
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

    public getAgentIdsByNamesAndTags(requests: SelectionEntry[]): number[] {
        let indices: number[] = [];
        requests.forEach((r) => {
            const name = r.name;
            const tags = r.tags;
            indices = [...indices, ...this.getIds(name, tags)];
        });
        return indices;
    }

    /*
     * If an entity has both a name and all the tags specified in the
     * selection state info, it will be considered highlighted
     */
    public getHighlightedIds(info: SelectionStateInfo): number[] {
        const requests = info.highlightedAgents;
        return this.getAgentIdsByNamesAndTags(requests);
    }

    /*
     * If an entry has a name specified in the selection state info
     * or a tag specified, it will be considered hidden
     */
    public getHiddenIds(info: SelectionStateInfo): number[] {
        const requests = info.hiddenAgents;
        return this.getAgentIdsByNamesAndTags(requests);
    }

    public clear(): void {
        this.entries = new Map<string, DecodedTypeEntry>();
    }

    public getParentColor(name: string): string {
        // wrapping in filter removes undefined values
        const listOfUniqChildrenColors = filter(
            uniq(map(this.entries[name], "color"))
        );
        const color =
            listOfUniqChildrenColors.length === 1
                ? listOfUniqChildrenColors[0]
                : "";
        return color;
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

            const color = this.getParentColor(name);

            return {
                name,
                displayStates,
                color,
            };
        });
    }

    private updateUiDataColor(
        agentName: string,
        idsToUpdate: number[],
        color: number | string
    ): void {
        const newColor = convertColorNumberToString(color);
        const entry = this.entries[agentName];
        // if no display state update parent color
        entry.forEach((displayState) => {
            if (idsToUpdate.includes(displayState.id)) {
                displayState.color = newColor;
            }
        });
    }

    public setInitialAgentColors(
        uiDisplayData: UIDisplayData,
        colors: (string | number)[],
        setColorForIds: (setting: ColorSetting) => void
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
                setColorForIds({
                    agentIds: ids,
                    color: colors[defaultColorIndex],
                });
                this.updateUiDataColor(
                    group.name,
                    ids,
                    colors[defaultColorIndex]
                );
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
                            group.name,
                            [ids[index]],
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
                    setColorForIds({
                        agentIds: [ids[index]],
                        color: colors[agentColorIndex],
                    });
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

    // when applying color changes or settings, keep entries in sync
    // it is the SSOT for UiDisplayData
    public updateAgentColors(setting: ColorSetting): void {
        const { agentIds, color } = setting;
        const newColor = convertColorNumberToString(color);
        agentIds.forEach((id) => {
            Object.values(this.entries).forEach((entry) => {
                entry.forEach((displayState) => {
                    if (displayState.id === id) {
                        displayState.color = newColor;
                    }
                });
            });
        });
    }

    // seems like a util
    public deriveColorSettingsFromUIData = (
        uiData: UIDisplayData
    ): ColorSetting[] => {
        const settings: ColorSetting[] = [];

        uiData.forEach((agent) => {
            settings.push({
                agentIds: this.getAgentIdsByNamesAndTags([
                    { name: agent.name, tags: [] },
                ]),
                color: agent.color,
            });
            // }

            agent.displayStates.forEach((newState) => {
                settings.push({
                    agentIds: this.getAgentIdsByNamesAndTags([
                        { name: agent.name, tags: [newState.name] },
                    ]),
                    color: newState.color,
                });
            });
        });

        return settings;
    };
}

export { SelectionInterface };
export default SelectionInterface;
