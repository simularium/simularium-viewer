// The input format consumed by this object
interface IdMap {
    [key: number]: string;
}

// An individual entry parsed from an encoded name
interface IdMapEntry {
    id: number;
    name: string;
    tags: string[];
}

export interface SelectionStateInfo {
    highlightedNames: string[];
    highlightedTags: string[];
    hiddenNames: string[];
    hiddenTags: string[];
}

interface DisplayStateEntry {
    name: string;
    id: string;
}

interface UIDisplayEntry {
    name: string;
    display_states: DisplayStateEntry[];
}

export type UIDisplayData = UIDisplayEntry[];

class SelectionInterface {
    private entries: Map<string, IdMapEntry>;

    public constructor() {
        this.entries = new Map<string, IdMapEntry>();
    }

    public containsName(name: string): boolean {
        return this.entries.hasOwnProperty(name);
    }

    public containsTag(tag: string): boolean {
        let found = false;

        Object.values(this.entries).forEach(entriesArr => {
            entriesArr.forEach(entry => {
                if (entry.tags.includes(tag)) {
                    found = true;
                }
            });
        });

        return found;
    }

    public parse(idNameMapping: IdMap): void {
        this.clear();
        const uniqueNames = [...new Set(Object.keys(idNameMapping))];

        uniqueNames.forEach(id => {
            this.decode(idNameMapping[id], parseInt(id));
        });
    }

    public decode(encodedName: string, idParam?: number): void {
        let name = "";
        let tags: string[] = [];
        const id = idParam ? idParam : -1;

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

        entryList.forEach(entry => {
            if (!tags || tags.every(t => entry.tags.includes(t))) {
                if (entry.id > 0) {
                    indices.push(entry.id);
                }
            }
        });

        return indices;
    }

    public getIdsByTags(tags: string[]): number[] {
        let indices: number[] = [];
        Object.keys(this.entries).forEach(name => {
            indices = indices.concat(this.getIds(name, tags));
        });

        indices.sort();
        return indices;
    }

    /*
     * If an entity has both a name and all the tags specified in the
     * selection state info, it will be considered hilighted
     */
    public getHighlightedIds(info: SelectionStateInfo): number[] {
        let names = info.highlightedNames || [];
        let tags: string[] = info.highlightedTags || [];
        let indices: number[] = [];

        // If no name is specified, search all entries for matching tags
        if (names.length === 0) {
            names = Object.keys(this.entries);
        }

        // If there are tags but no name,
        //  search all names for matching tags

        Object.keys(this.entries).forEach(name => {
            if (!names || names.length === 0 || names.includes(name)) {
                // If no tags are specified, this will return all register a
                //  match for all entries
                indices = indices.concat(this.getIds(name, tags));
            }
        });

        return indices;
    }

    /*
     * If an entry has a name specified in the selection state info
     * or a tag specified, it will be considered hidden
     */
    public getVisibleIds(info: SelectionStateInfo): number[] {
        const hiddenNames = info.hiddenNames || [];
        const hiddenTags = info.hiddenTags || [];
        let indices: number[] = [];

        Object.keys(this.entries).forEach(name => {
            // If the name is on the hidden list...
            if (
                !hiddenNames ||
                hiddenNames.length === 0 ||
                !hiddenNames.includes(name)
            ) {
                const entryList = this.entries[name];

                entryList.forEach(entry => {
                    // And no tags on the hidden list are found...
                    if (hiddenTags.every(t => !entry.tags.includes(t))) {
                        if (entry.id > 0) {
                            // This entry is visible
                            indices.push(entry.id);
                        }
                    }
                });
            }
        });

        return indices;
    }

    public clear(): void {
        this.entries = new Map<string, IdMapEntry>();
    }

    public getUIDisplayData(): UIDisplayData {
        let uiDisplayData: UIDisplayData = [];

        Object.keys(this.entries).forEach(name => {
            const display_states: DisplayStateEntry[] = [];
            let uiEntry = { name: name, display_states: display_states };
            this.entries[name].forEach(entry => {
                entry.tags.forEach(tag => {
                    const display_state: DisplayStateEntry = {
                        name: tag,
                        id: tag,
                    };
                    uiEntry.display_states.push(display_state);
                });
            });

            uiDisplayData.push(uiEntry);
        });

        return uiDisplayData;
    }
}

export { SelectionInterface };
export default SelectionInterface;
