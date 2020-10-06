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

    describe("Selection", () => {
        test("Selection: select by name", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);
            const ids = si.getIds("D");

            expect(ids).toEqual([12]);
        });

        test("Selection: select multiple by name", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);
            const ids = si.getIds("A");

            expect(ids).toEqual([0, 1, 2, 3]);
        });

        test("Selection: select by name & multiple tags (Union)", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);
            const ids = si.getIds("A", ["t1", "t2"]);

            expect(ids).toEqual([1, 2, 3]);
        });

        test("Selection: select by tag", () => {
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
                highlightedAgents: [{ name: "A", tags: [] }],
                hiddenAgents: [],
            };

            const ids = si.getHighlightedIds(selectionStateHighlight);

            expect(ids).toEqual([0, 1, 2, 3]);
        });

        test("Highlight: highlight by name & single tag", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);
            const selectionStateHighlight = {
                highlightedAgents: [{ name: "B", tags: ["t1"] }],
                hiddenAgents: [],
            };
            const ids = si.getHighlightedIds(selectionStateHighlight);

            expect(ids).toEqual([5, 7]);
        });

        test("Highlight: highlight by name & multiple tags", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);
            const selectionStateHighlight = {
                highlightedAgents: [{ name: "C", tags: ["t1", "t2"] }],
                hiddenAgents: [],
            };
            const ids = si.getHighlightedIds(selectionStateHighlight);

            expect(ids).toEqual([9, 10, 11]);
        });
    });

    describe("getHiddenIds", () => {
        test("Hiding: hide multiple by name", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);
            const selectionStateHide = {
                highlightedAgents: [],
                hiddenAgents: [{ name: "A", tags: [] }],
            };
            const ids = si.getHiddenIds(selectionStateHide);

            expect(ids).toEqual([0, 1, 2, 3]);
        });

        test("Hiding: hide by name & single tag", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);
            const selectionStateHide = {
                highlightedAgents: [],
                hiddenAgents: [{ name: "B", tags: ["t1"] }],
            };
            const ids = si.getHiddenIds(selectionStateHide);
            expect(ids).toEqual([5, 7]);
        });

        test("Hiding: hide by name & multiple tags", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);

            const selectionStateHide = {
                highlightedAgents: [],
                hiddenAgents: [{ name: "C", tags: ["t1", "t2"] }],
            };
            const ids = si.getHiddenIds(selectionStateHide);

            expect(ids).toEqual([9, 10, 11]);
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
