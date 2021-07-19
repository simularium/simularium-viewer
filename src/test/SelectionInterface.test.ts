import "regenerator-runtime/runtime.js";
import { SelectionInterface } from "../simularium";

const idMapping = {
    0: { name: "A" },
    1: { name: "A#t1" },
    2: { name: "A#t2" },
    3: { name: "A#t1_t2" },
    4: { name: "B" },
    5: { name: "B#t1" },
    6: { name: "B#t2" },
    7: { name: "B#t1_t2" },
    8: { name: "C" },
    9: { name: "C#t1" },
    10: { name: "C#t2" },
    11: { name: "C#t1_t2" },
    12: { name: "D" },
    13: { name: "E#t1000" },
};

describe("SelectionInterface module", () => {
    describe("Handles Input", () => {
        test("Can decode valid encoded input", () => {
            const input = "name#tag1_tag2";
            const si = new SelectionInterface();
            si.decode(input);

            expect(si.containsName("name"));
            expect(si.containsTag("tag1"));
            expect(si.containsTag("tag2"));
        });

        test("Can decode valid untagged input", () => {
            const input = "name";
            const si = new SelectionInterface();
            si.decode(input);

            expect(si.containsName("name"));
        });

        test("Validates input: empty name", () => {
            const input = "#no_name";
            const si = new SelectionInterface();
            expect(() => {
                si.decode(input);
            }).toThrowError();
        });
    });

    describe("Parsing", () => {
        test("Parse id-name mapping", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);

            expect(si.containsName("A")).toEqual(true);
            expect(si.containsName("B")).toEqual(true);
            expect(si.containsName("C")).toEqual(true);
            expect(si.containsName("D")).toEqual(true);
            expect(si.containsTag("t1")).toEqual(true);
            expect(si.containsTag("t2")).toEqual(true);
        });
    });

    describe("getIds", () => {
        test("it returns id matching name", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);
            const ids = si.getIds("D");

            expect(ids).toEqual([12]);
        });

        test("it returns multiple ids that all have the same name", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);
            const ids = si.getIds("A");
            expect(ids).toEqual([0, 1, 2, 3]);
        });

        test("it returns ids that match both & multiple tags (Union)", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);
            const ids = si.getIds("A", ["t1", "t2"]);
            expect(ids).toEqual([1, 2, 3]);
        });
        test("it returns id for names with no tag if passed an empty string", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);
            const ids = si.getIds("A", [""]);
            expect(ids).toEqual([0]);
        });
        test("it returns an empty array if there is no matching name", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);
            const ids = si.getIds("F");
            expect(ids).toEqual([]);
        });
        test("it returns an empty array if matching name and tag combination", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);
            const ids = si.getIds("D", ["not a tag"]);
            expect(ids).toEqual([]);
        });
    });

    describe("getIdsByTags", () => {
        test("Selection: select ids by tag", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);
            const ids = si.getIdsByTags(["t1000"]);

            expect(ids).toEqual([13]);
        });

        test("Selection: select multiple by tag", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);
            const ids = si.getIdsByTags(["t1"]);

            expect(ids).toEqual([1, 3, 5, 7, 9, 11]);
        });

        test("Selection: select by multiple tags", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);
            const ids = si.getIdsByTags(["t1", "t2"]);

            expect(ids).toEqual([1, 2, 3, 5, 6, 7, 9, 10, 11]);
        });
    });

    describe("getHighlightedIds", () => {
        test("Highlight: highlight multiple by name", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);
            const selectionStateHighlight = {
                highlightedAgents: [
                    { name: "A", tags: [] },
                    { name: "B", tags: [] },
                    { name: "C", tags: [] },
                    { name: "D", tags: [] },
                ],
                hiddenAgents: [],
            };
            const ids = si.getHighlightedIds(selectionStateHighlight);
            const allAs = [0, 1, 2, 3];
            const allBs = [4, 5, 6, 7];
            const allCs = [8, 9, 10, 11];
            const allDs = [12];
            expect(ids).toEqual([...allAs, ...allBs, ...allCs, ...allDs]);
        });
        test("Highlight: highlight only unmodified states", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);
            const selectionStateHighlight = {
                highlightedAgents: [
                    { name: "A", tags: [""] },
                    { name: "B", tags: [""] },
                    { name: "C", tags: [""] },
                    { name: "D", tags: [""] },
                ],
                hiddenAgents: [],
            };
            const ids = si.getHighlightedIds(selectionStateHighlight);

            expect(ids).toEqual([0, 4, 8, 12]);
        });
        test("Highlight: highlight combination of modified and unmodified states", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);
            const selectionStateHighlight = {
                highlightedAgents: [
                    { name: "A", tags: ["", "t2"] },
                    { name: "B", tags: ["t1", "t2"] },
                    { name: "C", tags: ["", "t1", "t2"] },
                    { name: "E", tags: ["t1000"] },
                ],
                hiddenAgents: [],
            };
            const ids = si.getHighlightedIds(selectionStateHighlight);

            expect(ids).toEqual([0, 2, 3, 5, 6, 7, 8, 9, 10, 11, 13]);
        });

        test("it returns an empty array if no name and tag matches", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);
            const selectionStateHighlight = {
                highlightedAgents: [{ name: "E", tags: [""] }],
                hiddenAgents: [],
            };
            const ids = si.getHighlightedIds(selectionStateHighlight);

            expect(ids).toEqual([]);
        });
    });

    describe("getHiddenIds", () => {
        test("Hiding: hide multiple by name", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);
            const selectionStateHide = {
                highlightedAgents: [],
                hiddenAgents: [
                    { name: "A", tags: [] },
                    { name: "C", tags: [] },
                ],
            };
            const ids = si.getHiddenIds(selectionStateHide);

            expect(ids).toEqual([0, 1, 2, 3, 8, 9, 10, 11]);
        });

        test("Hiding: hide by name & tags", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);
            const selectionStateHide = {
                highlightedAgents: [],
                hiddenAgents: [
                    { name: "A", tags: ["t1", "t2"] },
                    { name: "B", tags: ["t1"] },
                ],
            };
            const ids = si.getHiddenIds(selectionStateHide);
            expect(ids).toEqual([1, 2, 3, 5, 7]);
        });

        test("Hiding: hide by name & null tag", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);

            const selectionStateHide = {
                highlightedAgents: [],
                hiddenAgents: [
                    { name: "A", tags: [""] },
                    { name: "C", tags: ["", "t1", "t2"] },
                ],
            };
            const ids = si.getHiddenIds(selectionStateHide);

            expect(ids).toEqual([0, 8, 9, 10, 11]);
        });
    });

    describe("UI Display Data", () => {
        test("Doesn't crash", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);

            si.getUIDisplayData();
        });
    });
});
