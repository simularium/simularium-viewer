import _defineProperty from "@babel/runtime/helpers/defineProperty";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

import { mapValues } from "lodash";
import { SelectionInterface } from "../simularium";
var idMapping = {
  0: {
    name: "A"
  },
  1: {
    name: "A#t1"
  },
  2: {
    name: "A#t2"
  },
  3: {
    name: "A#t1_t2"
  },
  4: {
    name: "B"
  },
  5: {
    name: "B#t1"
  },
  6: {
    name: "B#t2"
  },
  7: {
    name: "B#t1_t2"
  },
  8: {
    name: "C"
  },
  9: {
    name: "C#t1"
  },
  10: {
    name: "C#t2"
  },
  11: {
    name: "C#t1_t2"
  },
  12: {
    name: "D"
  },
  13: {
    name: "E#t1000"
  }
};
var color = "";
describe("SelectionInterface module", function () {
  describe("decode", function () {
    test("Can decode valid encoded input", function () {
      var input = "name#tag1_tag2";
      var si = new SelectionInterface();
      si.decode(input, color);
      expect(si.containsName("name"));
      expect(si.containsTag("tag1"));
      expect(si.containsTag("tag2"));
    });
    test("Can decode valid untagged input", function () {
      var input = "name";
      var si = new SelectionInterface();
      si.decode(input, color);
      expect(si.containsName("name"));
    });
    test("Validates input: empty name", function () {
      var input = "#no_name";
      var si = new SelectionInterface();
      expect(function () {
        si.decode(input, color);
      }).toThrowError();
    });
  });
  describe("parse", function () {
    test("Parse id-name mapping", function () {
      var si = new SelectionInterface();
      si.parse(idMapping);
      expect(si.containsName("A")).toEqual(true);
      expect(si.containsName("B")).toEqual(true);
      expect(si.containsName("C")).toEqual(true);
      expect(si.containsName("D")).toEqual(true);
      expect(si.containsTag("t1")).toEqual(true);
      expect(si.containsTag("t2")).toEqual(true);
    });
  });
  describe("getUnmodifiedStateId", function () {
    test("it returns null if name not in interface", function () {
      var si = new SelectionInterface();
      si.parse(idMapping);
      var result = si.getUnmodifiedStateId("Not in state");
      expect(result).toBeNull;
    });
    test("it returns the id of the unmodified state", function () {
      var si = new SelectionInterface();
      si.parse(idMapping);
      var unmodA = si.getUnmodifiedStateId("A");
      var unmodB = si.getUnmodifiedStateId("B");
      var unmodC = si.getUnmodifiedStateId("C");
      var unmodD = si.getUnmodifiedStateId("D");
      expect(unmodA).toEqual(0);
      expect(unmodB).toEqual(4);
      expect(unmodC).toEqual(8);
      expect(unmodD).toEqual(12);
    });
    test("it returns null if no unmodified state", function () {
      var si = new SelectionInterface();
      si.parse(idMapping);
      var unmod = si.getUnmodifiedStateId("E");
      expect(unmod).toBeNull;
    });
  });
  describe("getColorsForName", function () {
    test("it returns a list of colors for every id an agent name has", function () {
      var si = new SelectionInterface();
      si.parse(idMapping);
      var agentName = "A";
      var colors = si.getColorsForName(agentName);
      var ids = si.getIds(agentName);
      expect(colors.length).toEqual(ids.length);
    });
    test("it returns an array of empty strings if no user ids given", function () {
      var si = new SelectionInterface();
      si.parse(idMapping);
      var agentName = "A";
      var colors = si.getColorsForName(agentName);
      expect(colors).toEqual(["", "", "", ""]);
    });
    test("it returns an array of colors if they are given", function () {
      var si = new SelectionInterface();
      var color = "#aaaaaa";
      var idMappingWithColors = mapValues(idMapping, function (entry) {
        return _objectSpread(_objectSpread({}, entry), {}, {
          geometry: {
            url: "",
            displayType: "",
            color: color
          }
        });
      });
      si.parse(idMappingWithColors);
      var agentName = "A";
      var colors = si.getColorsForName(agentName);
      expect(colors).toEqual([color, color, color, color]);
    });
  });
  describe("getIds", function () {
    test("it returns id matching name", function () {
      var si = new SelectionInterface();
      si.parse(idMapping);
      var ids = si.getIds("D");
      expect(ids).toEqual([12]);
    });
    test("it returns multiple ids that all have the same name", function () {
      var si = new SelectionInterface();
      si.parse(idMapping);
      var ids = si.getIds("A");
      expect(ids).toEqual([0, 1, 2, 3]);
    });
    test("it returns ids that match both & multiple tags (Union)", function () {
      var si = new SelectionInterface();
      si.parse(idMapping);
      var ids = si.getIds("A", ["t1", "t2"]);
      expect(ids).toEqual([1, 2, 3]);
    });
    test("it returns id for names with no tag if passed an empty string", function () {
      var si = new SelectionInterface();
      si.parse(idMapping);
      var ids = si.getIds("A", [""]);
      expect(ids).toEqual([0]);
    });
    test("it returns an empty array if there is no matching name", function () {
      var si = new SelectionInterface();
      si.parse(idMapping);
      var ids = si.getIds("F");
      expect(ids).toEqual([]);
    });
    test("it returns an empty array if matching name and tag combination", function () {
      var si = new SelectionInterface();
      si.parse(idMapping);
      var ids = si.getIds("D", ["not a tag"]);
      expect(ids).toEqual([]);
    });
  });
  describe("getIdsByTags", function () {
    test("Selection: select ids by tag", function () {
      var si = new SelectionInterface();
      si.parse(idMapping);
      var ids = si.getIdsByTags(["t1000"]);
      expect(ids).toEqual([13]);
    });
    test("Selection: select multiple by tag", function () {
      var si = new SelectionInterface();
      si.parse(idMapping);
      var ids = si.getIdsByTags(["t1"]);
      expect(ids).toEqual([1, 3, 5, 7, 9, 11]);
    });
    test("Selection: select by multiple tags", function () {
      var si = new SelectionInterface();
      si.parse(idMapping);
      var ids = si.getIdsByTags(["t1", "t2"]);
      expect(ids).toEqual([1, 2, 3, 5, 6, 7, 9, 10, 11]);
    });
  });
  describe("getTags", function () {
    test("It returns an array of tags that exist on an type id", function () {
      var si = new SelectionInterface();
      si.parse(idMapping);
      var tags = si.getTags("A", 3);
      expect(tags).toEqual(["t1", "t2"]);
    });
    test("It returns an empty array if no tags exist", function () {
      var si = new SelectionInterface();
      si.parse(idMapping);
      var tags = si.getTags("D", 12);
      expect(tags).toEqual([]);
    });
    test("It returns an empty array if name and id don't match", function () {
      var si = new SelectionInterface();
      si.parse(idMapping);
      var tags = si.getTags("A", 12);
      expect(tags).toEqual([]);
    });
  });
  describe("getHighlightedIds", function () {
    test("Highlight: highlight multiple by name", function () {
      var si = new SelectionInterface();
      si.parse(idMapping);
      var selectionStateHighlight = {
        highlightedAgents: [{
          name: "A",
          tags: []
        }, {
          name: "B",
          tags: []
        }, {
          name: "C",
          tags: []
        }, {
          name: "D",
          tags: []
        }],
        hiddenAgents: []
      };
      var ids = si.getHighlightedIds(selectionStateHighlight);
      var allAs = [0, 1, 2, 3];
      var allBs = [4, 5, 6, 7];
      var allCs = [8, 9, 10, 11];
      var allDs = [12];
      expect(ids).toEqual([].concat(allAs, allBs, allCs, allDs));
    });
    test("Highlight: highlight only unmodified states", function () {
      var si = new SelectionInterface();
      si.parse(idMapping);
      var selectionStateHighlight = {
        highlightedAgents: [{
          name: "A",
          tags: [""]
        }, {
          name: "B",
          tags: [""]
        }, {
          name: "C",
          tags: [""]
        }, {
          name: "D",
          tags: [""]
        }],
        hiddenAgents: []
      };
      var ids = si.getHighlightedIds(selectionStateHighlight);
      expect(ids).toEqual([0, 4, 8, 12]);
    });
    test("Highlight: highlight combination of modified and unmodified states", function () {
      var si = new SelectionInterface();
      si.parse(idMapping);
      var selectionStateHighlight = {
        highlightedAgents: [{
          name: "A",
          tags: ["", "t2"]
        }, {
          name: "B",
          tags: ["t1", "t2"]
        }, {
          name: "C",
          tags: ["", "t1", "t2"]
        }, {
          name: "E",
          tags: ["t1000"]
        }],
        hiddenAgents: []
      };
      var ids = si.getHighlightedIds(selectionStateHighlight);
      expect(ids).toEqual([0, 2, 3, 5, 6, 7, 8, 9, 10, 11, 13]);
    });
    test("it returns an empty array if no name and tag matches", function () {
      var si = new SelectionInterface();
      si.parse(idMapping);
      var selectionStateHighlight = {
        highlightedAgents: [{
          name: "E",
          tags: [""]
        }],
        hiddenAgents: []
      };
      var ids = si.getHighlightedIds(selectionStateHighlight);
      expect(ids).toEqual([]);
    });
  });
  describe("getHiddenIds", function () {
    test("Hiding: hide multiple by name", function () {
      var si = new SelectionInterface();
      si.parse(idMapping);
      var selectionStateHide = {
        highlightedAgents: [],
        hiddenAgents: [{
          name: "A",
          tags: []
        }, {
          name: "C",
          tags: []
        }]
      };
      var ids = si.getHiddenIds(selectionStateHide);
      expect(ids).toEqual([0, 1, 2, 3, 8, 9, 10, 11]);
    });
    test("Hiding: hide by name & tags", function () {
      var si = new SelectionInterface();
      si.parse(idMapping);
      var selectionStateHide = {
        highlightedAgents: [],
        hiddenAgents: [{
          name: "A",
          tags: ["t1", "t2"]
        }, {
          name: "B",
          tags: ["t1"]
        }]
      };
      var ids = si.getHiddenIds(selectionStateHide);
      expect(ids).toEqual([1, 2, 3, 5, 7]);
    });
    test("Hiding: hide by name & null tag", function () {
      var si = new SelectionInterface();
      si.parse(idMapping);
      var selectionStateHide = {
        highlightedAgents: [],
        hiddenAgents: [{
          name: "A",
          tags: [""]
        }, {
          name: "C",
          tags: ["", "t1", "t2"]
        }]
      };
      var ids = si.getHiddenIds(selectionStateHide);
      expect(ids).toEqual([0, 8, 9, 10, 11]);
    });
  });
  describe("getUIDisplayData", function () {
    test("Doesn't crash", function () {
      var si = new SelectionInterface();
      si.parse(idMapping);
      si.getUIDisplayData();
    });
    test("It adds an unmodified state to agents that have one", function () {
      var si = new SelectionInterface();
      si.parse(idMapping);
      var uiDisplayData = si.getUIDisplayData();
      var uiDisplayDataForA = uiDisplayData.find(function (entry) {
        return entry.name === "A";
      });
      var uiDisplayDataForB = uiDisplayData.find(function (entry) {
        return entry.name === "B";
      });
      var uiDisplayDataForC = uiDisplayData.find(function (entry) {
        return entry.name === "C";
      });
      var unmodifiedDisplayState = {
        name: "<unmodified>",
        id: "",
        color: ""
      };
      expect(uiDisplayDataForA === null || uiDisplayDataForA === void 0 ? void 0 : uiDisplayDataForA.displayStates.length).toEqual(3);
      expect(uiDisplayDataForA === null || uiDisplayDataForA === void 0 ? void 0 : uiDisplayDataForA.displayStates).toContainEqual(unmodifiedDisplayState);
      expect(uiDisplayDataForB === null || uiDisplayDataForB === void 0 ? void 0 : uiDisplayDataForB.displayStates.length).toEqual(3);
      expect(uiDisplayDataForB === null || uiDisplayDataForB === void 0 ? void 0 : uiDisplayDataForB.displayStates).toContainEqual(unmodifiedDisplayState);
      expect(uiDisplayDataForC === null || uiDisplayDataForC === void 0 ? void 0 : uiDisplayDataForC.displayStates.length).toEqual(3);
      expect(uiDisplayDataForC === null || uiDisplayDataForC === void 0 ? void 0 : uiDisplayDataForC.displayStates).toContainEqual(unmodifiedDisplayState);
    });
    test("It doesn't add an unmodified state to agents that don't have one", function () {
      var si = new SelectionInterface();
      si.parse(idMapping);
      var uiDisplayData = si.getUIDisplayData();
      var uiDisplayDataForE = uiDisplayData.find(function (entry) {
        return entry.name === "E";
      });
      var unmodifiedDisplayState = {
        name: "<unmodified>",
        id: "",
        color: ""
      };
      expect(uiDisplayDataForE === null || uiDisplayDataForE === void 0 ? void 0 : uiDisplayDataForE.displayStates.length).toEqual(1);
      expect(uiDisplayDataForE === null || uiDisplayDataForE === void 0 ? void 0 : uiDisplayDataForE.displayStates).not.toContainEqual(unmodifiedDisplayState);
    });
    test("It doesn't include unmodified state if there are no other tags", function () {
      var si = new SelectionInterface();
      si.parse(idMapping);
      var uiDisplayData = si.getUIDisplayData();
      var uiDisplayDataForD = uiDisplayData.find(function (entry) {
        return entry.name === "D";
      });
      var unmodifiedDisplayState = {
        name: "<unmodified>",
        id: "",
        color: ""
      };
      expect(uiDisplayDataForD === null || uiDisplayDataForD === void 0 ? void 0 : uiDisplayDataForD.displayStates.length).toEqual(0);
      expect(uiDisplayDataForD === null || uiDisplayDataForD === void 0 ? void 0 : uiDisplayDataForD.displayStates).not.toContainEqual(unmodifiedDisplayState);
    });
  });
  describe("setAgentColors", function () {
    var defaultColor = "#0";
    var defaultColorListLength = 6;
    var si;
    var uiDisplayData;
    var uiDisplayDataForA;
    var uiDisplayDataForB;
    var uiDisplayDataForE;
    var uiDisplayDataForF;
    var uiDisplayDataForG;
    var colorList = [];

    for (var index = 0; index < defaultColorListLength; index++) {
      colorList.push(defaultColor + index);
    } // A, B and C all have all the same colors set for all agents types,
    // and all have an unmodified agent type.
    // D is only unmodified, so has no children, still has a color set.
    // E has no color set, and no unmodified type
    // F has a color set, and no unmodified type
    // G has two different colors for it's two states, and no unmodified type


    var agentColors = {
      A: "#aaaaaa",
      B: "#bbbbbb",
      C: "#cccccc",
      D: "#dddddd",
      F: "#ffffff"
    };

    var newIdMapping = _objectSpread(_objectSpread({}, idMapping), {}, {
      14: {
        name: "F#t1000"
      },
      15: {
        name: "G#1",
        color: "#g1"
      },
      16: {
        name: "G#2",
        color: "#g2"
      }
    });

    var idMappingWithColors = mapValues(newIdMapping, function (entry) {
      return _objectSpread(_objectSpread({}, entry), {}, {
        geometry: {
          url: "",
          displayType: "",
          color: entry.color || agentColors[entry.name[0]]
        }
      });
    });
    var setColorForIds = jest.fn();
    beforeEach(function () {
      si = new SelectionInterface();
      si.parse(idMappingWithColors);
      uiDisplayData = si.getUIDisplayData();
      uiDisplayDataForA = uiDisplayData.find(function (entry) {
        return entry.name === "A";
      });
      uiDisplayDataForB = uiDisplayData.find(function (entry) {
        return entry.name === "B";
      });
      uiDisplayDataForE = uiDisplayData.find(function (entry) {
        return entry.name === "E";
      });
      uiDisplayDataForF = uiDisplayData.find(function (entry) {
        return entry.name === "F";
      });
      uiDisplayDataForG = uiDisplayData.find(function (entry) {
        return entry.name === "G";
      });
    });
    test("it will create a new material for each of the use defined colors", function () {
      var numberOfNewColors = Object.keys(agentColors).length + 2; // two additional colors for G

      var updatedColors = si.setAgentColors(uiDisplayData, colorList, setColorForIds);
      expect(updatedColors.length).toEqual(numberOfNewColors + defaultColorListLength);
    });
    test("it set the entry color to the 'unmodified' state color if provided", function () {
      var _uiDisplayDataForA, _uiDisplayDataForB, _uiDisplayDataForA2, _uiDisplayDataForB2;

      // initially should have no color
      expect((_uiDisplayDataForA = uiDisplayDataForA) === null || _uiDisplayDataForA === void 0 ? void 0 : _uiDisplayDataForA.color).toEqual("");
      expect((_uiDisplayDataForB = uiDisplayDataForB) === null || _uiDisplayDataForB === void 0 ? void 0 : _uiDisplayDataForB.color).toEqual("");
      si.setAgentColors(uiDisplayData, colorList, setColorForIds);
      expect((_uiDisplayDataForA2 = uiDisplayDataForA) === null || _uiDisplayDataForA2 === void 0 ? void 0 : _uiDisplayDataForA2.color).toEqual("#aaaaaa");
      expect((_uiDisplayDataForB2 = uiDisplayDataForB) === null || _uiDisplayDataForB2 === void 0 ? void 0 : _uiDisplayDataForB2.color).toEqual("#bbbbbb");
    });
    test("If no user colors are provided entry will get a default color", function () {
      var _uiDisplayDataForE, _uiDisplayDataForE2;

      // initially should have no color
      expect((_uiDisplayDataForE = uiDisplayDataForE) === null || _uiDisplayDataForE === void 0 ? void 0 : _uiDisplayDataForE.color).toEqual("");
      si.setAgentColors(uiDisplayData, colorList, setColorForIds);
      expect((_uiDisplayDataForE2 = uiDisplayDataForE) === null || _uiDisplayDataForE2 === void 0 ? void 0 : _uiDisplayDataForE2.color).toEqual("#00");
      expect(setColorForIds).toHaveBeenCalledWith([13], 0);
    });
    test("If no user colors are provided all the ids for an entry will get a default color", function () {
      si.setAgentColors(uiDisplayData, colorList, setColorForIds);
      expect(setColorForIds).toHaveBeenCalledWith([13], 0);
    });
    test("if all the colors are the same, the parent entry will also get that color, even if no unmodified color set", function () {
      var _uiDisplayDataForF;

      si.setAgentColors(uiDisplayData, colorList, setColorForIds);
      expect((_uiDisplayDataForF = uiDisplayDataForF) === null || _uiDisplayDataForF === void 0 ? void 0 : _uiDisplayDataForF.color).toEqual("#ffffff");
    });
    test("If user defined colors are different, parent doesn't get a color", function () {
      var _uiDisplayDataForG;

      si.setAgentColors(uiDisplayData, colorList, setColorForIds);
      expect((_uiDisplayDataForG = uiDisplayDataForG) === null || _uiDisplayDataForG === void 0 ? void 0 : _uiDisplayDataForG.color).toEqual("");
    });
    test("If user colors are provided each id will be set with the new color", function () {
      si.setAgentColors(uiDisplayData, colorList, setColorForIds); // the first new user color will be appended to the end of the list

      var indexOfColorForA = defaultColorListLength; // these are all the agent A ids, each should get the first new color assigned

      expect(setColorForIds).toHaveBeenCalledWith([0], indexOfColorForA);
      expect(setColorForIds).toHaveBeenCalledWith([1], indexOfColorForA);
      expect(setColorForIds).toHaveBeenCalledWith([2], indexOfColorForA);
      expect(setColorForIds).toHaveBeenCalledWith([3], indexOfColorForA);
    });
  });
});