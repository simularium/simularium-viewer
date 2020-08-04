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
        Object.keys(idNameMapping).forEach(id => {
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

        const entry = { id: id, name: name, tags: tags };

        if (!Object.keys(this.entries).includes(name)) {
            this.entries[name] = [];
        }

        this.entries[name].push(entry);
    }

    public getIds(name: string, tags?: string[]): number[] {
        const entryList = this.entries[name];
        const indices: number[] = [];

        for (let i = 0, l = entryList.length; i < l; i++) {
            const entry: IdMapEntry = entryList[i];
            if (!tags || tags.every(t => entry.tags.includes(t))) {
                if (entry.id > 0) {
                    indices.push(entry.id);
                }
            }
        }

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
        const names = info.highlightedNames;
        const tags = info.highlightedTags;
        let indices: number[] = [];

        Object.keys(this.entries).forEach(name => {
            if (names.includes(name)) {
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
        const hiddenNames = info.hiddenNames;
        const hiddenTags = info.hiddenTags;
        let indices: number[] = [];

        Object.keys(this.entries).forEach(name => {
            // If the name is on the hidden list...
            if (!hiddenNames.includes(name)) {
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
}

export { SelectionInterface };
export default SelectionInterface;
