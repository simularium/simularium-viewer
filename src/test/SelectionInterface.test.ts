import { mapValues } from "lodash";
import { EncodedTypeMapping, SelectionInterface } from "../simularium";
import {
    UIDisplayData,
    UIDisplayEntry,
} from "../simularium/SelectionInterface";

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

const color = "";

describe("SelectionInterface module", () => {
    describe("decode", () => {
        test("Can decode valid encoded input", () => {
            const input = "name#tag1_tag2";
            const si = new SelectionInterface();
            si.decode(input, color);

            expect(si.containsName("name"));
            expect(si.containsTag("tag1"));
            expect(si.containsTag("tag2"));
        });

        test("Can decode valid untagged input", () => {
            const input = "name";
            const si = new SelectionInterface();
            si.decode(input, color);

            expect(si.containsName("name"));
        });

        test("Validates input: empty name", () => {
            const input = "#no_name";
            const si = new SelectionInterface();
            expect(() => {
                si.decode(input, color);
            }).toThrowError();
        });
    });

    describe("parse", () => {
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

    describe("getUnmodifiedStateId", () => {
        test("it returns null if name not in interface", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);
            const result = si.getUnmodifiedStateId("Not in state");
            expect(result).toBeNull;
        });
        test("it returns the id of the unmodified state", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);
            const unmodA = si.getUnmodifiedStateId("A");
            const unmodB = si.getUnmodifiedStateId("B");
            const unmodC = si.getUnmodifiedStateId("C");
            const unmodD = si.getUnmodifiedStateId("D");

            expect(unmodA).toEqual(0);
            expect(unmodB).toEqual(4);
            expect(unmodC).toEqual(8);
            expect(unmodD).toEqual(12);
        });
        test("it returns null if no unmodified state", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);
            const unmod = si.getUnmodifiedStateId("E");
            expect(unmod).toBeNull;
        });
    });

    describe("getColorsForName", () => {
        test("it returns a list of colors for every id an agent name has", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);
            const agentName = "A";
            const colors = si.getColorsForName(agentName);
            const ids = si.getIds(agentName);
            expect(colors.length).toEqual(ids.length);
        });
        test("it returns an array of empty strings if no user ids given", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);
            const agentName = "A";
            const colors = si.getColorsForName(agentName);
            expect(colors).toEqual(["", "", "", ""]);
        });
        test("it returns an array of colors if they are given", () => {
            const si = new SelectionInterface();
            const color = "#aaaaaa";
            const idMappingWithColors = mapValues(idMapping, (entry) => {
                return {
                    ...entry,
                    geometry: {
                        url: "",
                        displayType: "",
                        color,
                    },
                };
            });
            si.parse(idMappingWithColors as EncodedTypeMapping);
            const agentName = "A";
            const colors = si.getColorsForName(agentName);
            expect(colors).toEqual([color, color, color, color]);
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

    describe("getUIDisplayData", () => {
        test("Doesn't crash", () => {
            const si = new SelectionInterface();
            si.parse(idMapping);

            si.getUIDisplayData();
        });
    });

    describe("setAgentColors", () => {
        const defaultColor = "#0";
        const defaultColorListLength = 6;
        let si: SelectionInterface;
        let uiDisplayData: UIDisplayData;
        let uiDisplayDataForA: UIDisplayEntry | undefined;
        let uiDisplayDataForB: UIDisplayEntry | undefined;
        let uiDisplayDataForE: UIDisplayEntry | undefined;
        let uiDisplayDataForF: UIDisplayEntry | undefined;
        let uiDisplayDataForG: UIDisplayEntry | undefined;
        const colorList: string[] = [];
        for (let index = 0; index < defaultColorListLength; index++) {
            colorList.push(defaultColor + index);
        }
        // A, B and C all have all the same colors set for all agents types,
        // and all have an unmodified agent type.
        // D is only unmodified, so has no children, still has a color set.
        // E has no color set, and no unmodified type
        // F has a color set, and no unmodified type
        // G has two different colors for it's two states, and no unmodified type
        const agentColors = {
            A: "#aaaaaa",
            B: "#bbbbbb",
            C: "#cccccc",
            D: "#dddddd",
            F: "#ffffff",
        };
        const newIdMapping: {
            [key: number]: { name: string; color?: string };
        } = {
            ...idMapping,
            14: { name: "F#t1000" },
            15: {
                name: "G#1",
                color: "#g1",
            },
            16: {
                name: "G#2",
                color: "#g2",
            },
        };

        const idMappingWithColors = mapValues(newIdMapping, (entry) => {
            return {
                ...entry,
                geometry: {
                    url: "",
                    displayType: "",
                    color: entry.color || agentColors[entry.name[0]],
                },
            };
        });
        const setColorForIds = jest.fn();

        beforeEach(() => {
            si = new SelectionInterface();
            si.parse(idMappingWithColors as EncodedTypeMapping);
            uiDisplayData = si.getUIDisplayData();
            uiDisplayDataForA = uiDisplayData.find(
                (entry) => entry.name === "A"
            );
            uiDisplayDataForB = uiDisplayData.find(
                (entry) => entry.name === "B"
            );
            uiDisplayDataForE = uiDisplayData.find(
                (entry) => entry.name === "E"
            );
            uiDisplayDataForF = uiDisplayData.find(
                (entry) => entry.name === "F"
            );
            uiDisplayDataForG = uiDisplayData.find(
                (entry) => entry.name === "G"
            );
        });

        test("it will create a new material for each of the use defined colors", () => {
            const numberOfNewColors = Object.keys(agentColors).length + 2;
            const updatedColors = si.setAgentColors(
                uiDisplayData,
                colorList,
                setColorForIds
            );

            expect(updatedColors.length).toEqual(
                numberOfNewColors + defaultColorListLength
            );
        });

        test("it set the entry color to the 'unmodified' state color if provided", () => {
            // initially should have no color
            expect(uiDisplayDataForA?.color).toEqual("");
            expect(uiDisplayDataForB?.color).toEqual("");
            si.setAgentColors(uiDisplayData, colorList, setColorForIds);
            expect(uiDisplayDataForA?.color).toEqual("#aaaaaa");
            expect(uiDisplayDataForB?.color).toEqual("#bbbbbb");
        });
        test("If no user colors are provided entry will get a default color", () => {
            // Mostly for typescript, but should fail test if this is undefined

            // initially should have no color
            expect(uiDisplayDataForE?.color).toEqual("");
            si.setAgentColors(uiDisplayData, colorList, setColorForIds);
            expect(uiDisplayDataForE?.color).toEqual("#00");
            expect(setColorForIds).toHaveBeenCalledWith([13], 0);
        });
        test("If no user colors are provided all the ids for an entry will get a default color", () => {
            si.setAgentColors(uiDisplayData, colorList, setColorForIds);
            expect(setColorForIds).toHaveBeenCalledWith([13], 0);
        });
        test("if all the colors are the same, the parent entry will also get that color, even if no unmodified color set", () => {
            si.setAgentColors(uiDisplayData, colorList, setColorForIds);
            expect(uiDisplayDataForF?.color).toEqual("#ffffff");
        });
        test("Parent agents that don't have defined colors, all get different default colors", () => {
            si.setAgentColors(uiDisplayData, colorList, setColorForIds);
            expect(uiDisplayDataForE?.color).toEqual("#00");
            expect(uiDisplayDataForG?.color).toEqual("#01");
        });
        test("If user colors are provided each id will be set with the new color", () => {
            si.setAgentColors(uiDisplayData, colorList, setColorForIds);
            // the first new user color will be appended to the end of the list
            const indexOfColorForA = defaultColorListLength;
            // these are all the agent A ids, each should get the first new color assigned
            expect(setColorForIds).toHaveBeenCalledWith([0], indexOfColorForA);
            expect(setColorForIds).toHaveBeenCalledWith([1], indexOfColorForA);
            expect(setColorForIds).toHaveBeenCalledWith([2], indexOfColorForA);
            expect(setColorForIds).toHaveBeenCalledWith([3], indexOfColorForA);
        });
    });
});
