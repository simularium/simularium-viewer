import { SelectionInterface } from "../simularium";

const idMapping = {
    1: { name: "first#first" },
    2: { name: "second" },
    3: { name: "third#tagged" },
    4: { name: "fourth#last_tagged" },
    5: { name: "duplicate" },
    6: { name: "duplicate#tagged" },
    7: { name: "seventh#first" },
    8: { name: "first" },
};

const selectionState = {
    highlightedNames: ["second", "third"],
    highlightedTags: ["tagged"],
    hiddenNames: ["duplicate"],
    hiddenTags: ["first"],
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

            expect(si.containsName("first")).toEqual(true);
            expect(si.containsName("second")).toEqual(true);
            expect(si.containsName("third")).toEqual(true);
            expect(si.containsName("duplicate")).toEqual(true);
            expect(si.containsTag("tagged")).toEqual(true);
            expect(si.containsTag("first")).toEqual(true);
        });
    });

    describe("Selection", () => {
        test("Selection works: select by name", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);
            const ids = si.getIds("third");

            expect(ids).toEqual([3]);
        });

        test("Selection works: select multiple by name", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);
            const ids = si.getIds("duplicate");

            expect(ids).toEqual([5, 6]);
        });

        test("Selection works: select by tag", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);
            const ids = si.getIdsByTags(["first"]);

            expect(ids).toEqual([1, 7]);
        });

        test("Selection works: select multiple by tag", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);
            const ids = si.getIdsByTags(["tagged"]);

            expect(ids).toEqual([3, 4, 6]);
        });

        test("Selection works: select by multiple tags", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);
            const ids = si.getIdsByTags(["tagged", "last"]);

            expect(ids).toEqual([4]);
        });
    });

    describe("getHighlightedIds", () => {
        test("returns list of highlighted ids using selection state info", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);

            const ids = si.getHighlightedIds(selectionState);
            expect(ids).toEqual([3]);
        });
    });

    describe("getHiddenIds", () => {
        test("returns all list of ids whose names match hiddenNames OR whose tags match hiddenTags", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);

            const ids = si.getHiddenIds(selectionState);
            expect(ids).toEqual([1, 5, 6, 7]);
        });
        test("if no names or tags are hidden, returns empty array", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);
            const noHiddenNamesTags = {
                highlightedNames: ["second", "third"],
                highlightedTags: ["tagged"],
                hiddenNames: [],
                hiddenTags: [],
            };
            const ids = si.getHiddenIds(noHiddenNamesTags);
            expect(ids).toEqual([]);
        });
        test("if no names hidden, returns only matching tags", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);
            const noHiddenNames = {
                highlightedNames: ["second", "third"],
                highlightedTags: ["tagged"],
                hiddenNames: [],
                hiddenTags: ["first"],
            };
            const ids = si.getHiddenIds(noHiddenNames);
            expect(ids).toEqual([1, 7]);
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
