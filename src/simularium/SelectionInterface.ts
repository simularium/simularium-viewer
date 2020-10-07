import { EncodedTypeMapping } from "./types";

// An individual entry parsed from an encoded name
interface DecodedTypeEntry {
    id: number;
    name: string;
    tags: string[];
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
}

interface UIDisplayEntry {
    name: string;
    displayStates: DisplayStateEntry[];
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

    public parse(idNameMapping: EncodedTypeMapping): void {
        this.clear();
        if (!idNameMapping) {
            throw new Error(
                "Trajectory is missing agent type mapping information."
            );
        }
        Object.keys(idNameMapping).forEach((id) => {
            this.decode(idNameMapping[id].name, parseInt(id));
        });
    }

    public decode(encodedName: string, idParam?: number): void {
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
            throw Error("invalid name: " + encodedName);
        }

        const uniqueTags = [...new Set(tags)];
        const entry = { id: id, name: name, tags: uniqueTags };

        if (!Object.keys(this.entries).includes(name)) {
            this.entries[name] = [];
        }

        this.entries[name].push(entry);
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

    /*
     * If an entity has both a name and all the tags specified in the
     * selection state info, it will be considered hilighted
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

            this.entries[name].forEach((entry) => {
                entry.tags.forEach((tag) => {
                    if (encounteredTags.includes(tag)) {
                        return;
                    }
                    encounteredTags.push(tag);

                    const displayState: DisplayStateEntry = {
                        name: tag,
                        id: tag,
                    };
                    displayStates.push(displayState);
                });
            });

            return {
                name,
                displayStates,
            };
        });
    }
}

export { SelectionInterface };
export default SelectionInterface;
