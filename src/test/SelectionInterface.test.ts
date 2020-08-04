import { SelectionInterface } from "../simularium";

const idMapping = {
    1: "first#first",
    2: "second",
    3: "third#tagged",
    4: "fourth#last_tagged",
    5: "duplicate",
    6: "duplicate#tagged",
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

    describe("Parses Id-Name mapping", () => {
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

            expect(ids).toEqual([1]);
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
});
