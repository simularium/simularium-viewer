import _toConsumableArray from "@babel/runtime/helpers/toConsumableArray";
import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
import { filter, find, map, uniq } from "lodash";
import { convertColorNumberToString } from "../visGeometry/ColorHandler";

// An individual entry parsed from an encoded name
// The encoded names can be just a name or a name plus a
// state, such as "proteinA#bound"
var SelectionInterface = /*#__PURE__*/function () {
  function SelectionInterface() {
    _classCallCheck(this, SelectionInterface);
    _defineProperty(this, "entries", void 0);
    this.entries = new Map();
  }
  _createClass(SelectionInterface, [{
    key: "containsName",
    value: function containsName(name) {
      return this.entries.hasOwnProperty(name);
    }
  }, {
    key: "containsTag",
    value: function containsTag(tag) {
      return Object.values(this.entries).some(function (entriesArr) {
        return entriesArr.some(function (entry) {
          return entry.tags.includes(tag);
        });
      });
    }

    // errors will be caught in a try/catch block in the viewport
    // If an onError can be caught by onError prop to viewer, will be
    // sent to the parent app
  }, {
    key: "parse",
    value: function parse(idNameMapping) {
      var _this = this;
      this.clear();
      if (!idNameMapping) {
        throw new Error("Trajectory is missing agent type mapping information.");
      }
      Object.keys(idNameMapping).forEach(function (id) {
        if (isNaN(parseInt(id))) {
          throw new Error("Agent ids should be integers, ".concat(id, " is not"));
        }
        if (!idNameMapping[id].name) {
          throw new Error("Missing agent name for agent ".concat(id));
        }
        var color = "";
        if (idNameMapping[id].geometry) {
          color = idNameMapping[id].geometry.color;
        }
        _this.decode(idNameMapping[id].name, color, parseInt(id));
      });
    }
  }, {
    key: "decode",
    value: function decode(encodedName, color, idParam) {
      /**
       * Takes an encoded name, the color and the agent id, and stores
       * a decoded entry on the class mapped by the agent name
       */
      var name = "";
      var tags = [];
      var id = idParam !== undefined ? idParam : -1;
      if (encodedName.includes("#")) {
        var s = encodedName.split("#");
        tags = s[1].split("_");
        name = s[0];
      } else {
        name = encodedName;
      }
      if (!name) {
        // error can be caught by onError prop to viewer
        throw new Error("invalid name. Agent id: ".concat(id, ", name: ").concat(encodedName));
      }
      var uniqueTags = _toConsumableArray(new Set(tags));
      var entry = {
        id: id,
        name: name,
        tags: uniqueTags,
        color: color
      };
      if (!this.containsName(name)) {
        this.entries[name] = [];
      }
      this.entries[name].push(entry);
    }
  }, {
    key: "getUnmodifiedStateId",
    value: function getUnmodifiedStateId(name) {
      var entryList = this.entries[name];
      if (!entryList) {
        return null;
      }
      var unmodified = entryList.find(function (entry) {
        return entry.tags.length === 0;
      });
      return unmodified ? unmodified.id : null;
    }
  }, {
    key: "getColorsForName",
    value: function getColorsForName(name) {
      var entryList = this.entries[name];
      var colors = [];
      if (!entryList) {
        return [];
      }
      entryList.forEach(function (entry) {
        if (entry.id >= 0) {
          colors.push(entry.color);
        }
      });
      return colors;
    }
  }, {
    key: "getIds",
    value: function getIds(name, tags) {
      var entryList = this.entries[name];
      var indices = [];
      if (!entryList) {
        return [];
      }
      entryList.forEach(function (entry) {
        if (!tags || tags.length === 0 || tags.some(function (t) {
          return entry.tags.includes(t);
        })) {
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
  }, {
    key: "getIdsByTags",
    value: function getIdsByTags(tags) {
      var _this2 = this;
      var indices = [];
      Object.keys(this.entries).forEach(function (name) {
        indices = indices.concat(_this2.getIds(name, tags));
      });
      indices.sort(function (a, b) {
        return a - b;
      });
      return indices;
    }
  }, {
    key: "getTags",
    value: function getTags(name, id) {
      var entryList = this.entries[name];
      if (!entryList) {
        return [];
      }
      var state = find(entryList, function (entry) {
        return entry.id === id;
      });
      if (state) {
        return state.tags;
      }
      return [];
    }
  }, {
    key: "getAgentIdsByNamesAndTags",
    value: function getAgentIdsByNamesAndTags(requests) {
      var _this3 = this;
      var indices = [];
      requests.forEach(function (r) {
        var name = r.name;
        var tags = r.tags;
        indices = [].concat(_toConsumableArray(indices), _toConsumableArray(_this3.getIds(name, tags)));
      });
      return indices;
    }

    /*
     * If an entity has both a name and all the tags specified in the
     * selection state info, it will be considered highlighted
     */
  }, {
    key: "getHighlightedIds",
    value: function getHighlightedIds(info) {
      var requests = info.highlightedAgents;
      return this.getAgentIdsByNamesAndTags(requests);
    }

    /*
     * If an entry has a name specified in the selection state info
     * or a tag specified, it will be considered hidden
     */
  }, {
    key: "getHiddenIds",
    value: function getHiddenIds(info) {
      var requests = info.hiddenAgents;
      return this.getAgentIdsByNamesAndTags(requests);
    }
  }, {
    key: "clear",
    value: function clear() {
      this.entries = new Map();
    }
  }, {
    key: "getParentColor",
    value: function getParentColor(name) {
      // wrapping in filter removes undefined values
      var listOfUniqChildrenColors = filter(uniq(map(this.entries[name], "color")));
      var color = listOfUniqChildrenColors.length === 1 ? listOfUniqChildrenColors[0] : "";
      return color;
    }
  }, {
    key: "getUIDisplayData",
    value: function getUIDisplayData() {
      var _this4 = this;
      return Object.keys(this.entries).map(function (name) {
        var displayStates = [];
        var encounteredTags = [];
        var hasMultipleStates = Object.keys(_this4.entries[name]).length > 1;
        _this4.entries[name].forEach(function (entry) {
          // add unmodified state if there are multiple states, and one of them
          // has no state tags
          if (!entry.tags.length && hasMultipleStates) {
            displayStates.push({
              name: "<unmodified>",
              id: "",
              // selects agents with no state tags
              color: entry.color
            });
          }
          entry.tags.forEach(function (tag) {
            if (encounteredTags.includes(tag)) {
              return;
            }
            encounteredTags.push(tag);
            var displayState = {
              name: tag,
              id: tag,
              color: entry.color
            };
            displayStates.push(displayState);
          });
        });
        var color = _this4.getParentColor(name);
        return {
          name: name,
          displayStates: displayStates,
          color: color
        };
      });
    }
  }, {
    key: "updateUiDataColor",
    value: function updateUiDataColor(agentName, idsToUpdate, color) {
      var newColor = convertColorNumberToString(color);
      var entry = this.entries[agentName];
      // if no display state update parent color
      entry.forEach(function (displayState) {
        if (idsToUpdate.includes(displayState.id)) {
          displayState.color = newColor;
        }
      });
    }
  }, {
    key: "setInitialAgentColors",
    value: function setInitialAgentColors(uiDisplayData, colors, setColorForIds) {
      var _this5 = this;
      var defaultColorIndex = 0;
      uiDisplayData.forEach(function (group) {
        // the color for the whole grouping for this entry.name
        var groupColorIndex = defaultColorIndex;
        // list of ids that all have this same name
        var ids = _this5.getIds(group.name);
        // list of colors for this entry, will be empty strings for
        // ids that don't have a user set color
        var newColors = _this5.getColorsForName(group.name);
        var hasNewColors = filter(newColors).length > 0;
        var allTheSameColor = uniq(newColors).length === 1;
        if (!hasNewColors) {
          // if no colors have been set by the user for this name,
          // just give all states of this agent name the same color
          setColorForIds(ids, colors[defaultColorIndex]);
          _this5.updateUiDataColor(group.name, ids, colors[defaultColorIndex]);
        } else {
          // otherwise, we need to update any user defined colors
          newColors.forEach(function (color, index) {
            // color for each agent id (can be different states of a single
            // entity, ie, bound and unbound states).
            // All agents with unspecified colors in this grouping
            // will still get the same default color as each other

            var agentColorIndex = defaultColorIndex;
            if (color) {
              agentColorIndex = colors.indexOf(color);
              if (agentColorIndex === -1) {
                // add color to color array
                colors = [].concat(_toConsumableArray(colors), [color]);
                agentColorIndex = colors.length - 1;
              }
            } else {
              // need update the display data with the default color being used
              _this5.updateUiDataColor(group.name, [ids[index]], colors[groupColorIndex]);
            }
            // if the user used all the same colors for all states of this agent,
            // use that for the group as well
            // otherwise the grouping color will be blank
            if (allTheSameColor) {
              groupColorIndex = agentColorIndex;
            } else {
              groupColorIndex = -1;
            }
            setColorForIds([ids[index]], colors[agentColorIndex]);
          });
        }
        if (groupColorIndex > -1) {
          group.color = convertColorNumberToString(colors[groupColorIndex]);
        } else {
          group.color = "";
        }
        // if we used any of the default color array
        // need to go to the next default color.
        if (filter(newColors).length !== ids.length || groupColorIndex === defaultColorIndex) {
          defaultColorIndex++;
        }
      });
      return colors;
    }
  }]);
  return SelectionInterface;
}();
export { SelectionInterface };
export default SelectionInterface;