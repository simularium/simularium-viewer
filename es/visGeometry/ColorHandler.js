import _toConsumableArray from "@babel/runtime/helpers/toConsumableArray";
import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
import { map, round, isEqual } from "lodash";
import { Color } from "three";
export function convertColorStringToNumber(color) {
  if (typeof color !== "string") {
    return color;
  }
  return parseInt(color.toString().replace(/^#/, "0x"), 16);
}
export function convertColorNumberToString(color) {
  if (typeof color === "string") {
    return color;
  }
  return "#" + new Color(color).getHexString();
}
export var checkHexColor = function checkHexColor(color) {
  var hexColorCodeRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  if (!hexColorCodeRegex.test(color)) {
    throw new Error("Invalid color code");
  }
  return color;
};
var ColorHandler = /*#__PURE__*/function () {
  function ColorHandler() {
    _classCallCheck(this, ColorHandler);
    _defineProperty(this, "agentTypeToColorId", void 0);
    _defineProperty(this, "colorsData", void 0);
    this.agentTypeToColorId = new Map();
    // will be set by makeColorDataArray, but need to initialize
    // so that typescript doesn't complain
    this.colorsData = new Float32Array(0);
  }
  return _createClass(ColorHandler, [{
    key: "numberOfColors",
    get: function get() {
      return this.colorsData.length / 4;
    }
  }, {
    key: "makeColorDataArray",
    value: function makeColorDataArray(colors) {
      var colorNumbers = colors.map(convertColorStringToNumber);
      var numberOfColors = colors.length;
      // fill buffer of colors:
      var colorsData = new Float32Array(numberOfColors * 4);
      for (var i = 0; i < numberOfColors; i += 1) {
        // each color is currently a hex value:
        colorsData[i * 4 + 0] = ((colorNumbers[i] & 0x00ff0000) >> 16) / 255.0;
        colorsData[i * 4 + 1] = ((colorNumbers[i] & 0x0000ff00) >> 8) / 255.0;
        colorsData[i * 4 + 2] = ((colorNumbers[i] & 0x000000ff) >> 0) / 255.0;
        colorsData[i * 4 + 3] = 1.0;
      }
      return colorsData;
    }
  }, {
    key: "convertDataColorIndexToId",
    value: function convertDataColorIndexToId(dataColorIndex) {
      if (dataColorIndex % 4 !== 0) {
        return -1;
      }
      var index = dataColorIndex / 4;
      // this loops the index back to the beginning of the array
      // in the chance that the index is out of range, which
      // should be impossible. But just being cautious
      return index % this.numberOfColors;
    }

    /**
     * returns the index into the colorsData array
     */
  }, {
    key: "getColorDataIndex",
    value: function getColorDataIndex(color) {
      var colorArray = this.colorsData;
      var colorToCheck = map(color, function (num) {
        return round(num, 6);
      });
      for (var i = 0; i < colorArray.length - 3; i += 4) {
        var index = i;
        var currentColor = [round(this.colorsData[i], 6), round(this.colorsData[i + 1], 6), round(this.colorsData[i + 2], 6), this.colorsData[i + 3]];
        if (isEqual(currentColor, colorToCheck)) {
          return index;
        }
      }
      return -1;
    }

    /**
     * returns the index in terms of numberOfColors (colorId). No conversion
     * is necessary because agentTypeToColorId is also using this index
     */
  }, {
    key: "getColorIdForAgentType",
    value: function getColorIdForAgentType(typeId) {
      var index = this.agentTypeToColorId.get(typeId);
      if (index === undefined) {
        return -1;
      }
      var colorId = index % this.numberOfColors;
      return colorId;
    }

    /**
     * @param agentType agent type number
     * @param colorId index into the numberOfColors
     */
  }, {
    key: "setColorForAgentType",
    value: function setColorForAgentType(agentType, colorId) {
      this.agentTypeToColorId.set(agentType, colorId);
    }
  }, {
    key: "getColorById",
    value: function getColorById(colorId) {
      if (colorId < 0) {
        colorId = 0;
      }
      if (colorId >= this.numberOfColors) {
        colorId = colorId % this.numberOfColors;
      }
      return new Color(this.colorsData[colorId * 4], this.colorsData[colorId * 4 + 1], this.colorsData[colorId * 4 + 2]);
    }
  }, {
    key: "addNewColor",
    value: function addNewColor(color) {
      var colorNumber = convertColorStringToNumber(color);
      var newColor = [((colorNumber & 0x00ff0000) >> 16) / 255.0, ((colorNumber & 0x0000ff00) >> 8) / 255.0, ((colorNumber & 0x000000ff) >> 0) / 255.0, 1.0];
      var colorDataIndex = this.getColorDataIndex(newColor);
      if (colorDataIndex !== -1) {
        // found the color, need to return the colorId to the
        // external caller, with no other changes needed
        return this.convertDataColorIndexToId(colorDataIndex);
      }
      // the color isn't in colorsData, so add it and return the colorId
      var newColorDataIndex = this.colorsData.length;
      var newArray = [].concat(_toConsumableArray(this.colorsData), newColor);
      var newColorData = new Float32Array(newArray.length);
      newColorData.set(newArray);
      this.colorsData = newColorData;
      return this.convertDataColorIndexToId(newColorDataIndex);
    }

    /**
     * Check if the new color is in our current array of color options, if not,
     * add it before returning the index
     */
  }, {
    key: "getColorId",
    value: function getColorId(color) {
      return this.addNewColor(color);
    }
  }, {
    key: "updateColorArray",
    value: function updateColorArray(colors) {
      this.colorsData = this.makeColorDataArray(colors);
      return {
        colorArray: this.colorsData,
        numberOfColors: this.numberOfColors
      };
    }
  }, {
    key: "clearColorMapping",
    value: function clearColorMapping() {
      this.agentTypeToColorId.clear();
    }
  }, {
    key: "setColorForAgentTypes",
    value: function setColorForAgentTypes(agentTypes, color) {
      var _this = this;
      var colorString = convertColorNumberToString(color);
      var colorId = this.getColorId(colorString);
      /**
       * Sets one color for a set of ids, using an index into a color array
       * @param ids agent ids that should all have the same color
       * @param colorId index into the numberOfColors
       */
      agentTypes.forEach(function (id) {
        _this.setColorForAgentType(id, colorId);
      });
      return {
        colorArray: this.colorsData,
        numberOfColors: this.numberOfColors
      };
    }
  }, {
    key: "getColorInfoForAgentType",
    value: function getColorInfoForAgentType(agentType) {
      var colorId = this.getColorIdForAgentType(agentType);
      var color = this.getColorById(colorId);
      return {
        color: color,
        colorId: colorId
      };
    }
  }, {
    key: "resetDefaultColorsData",
    value: function resetDefaultColorsData(defaultColors) {
      this.clearColorMapping();
      this.updateColorArray(defaultColors);
    }
  }]);
}();
export default ColorHandler;