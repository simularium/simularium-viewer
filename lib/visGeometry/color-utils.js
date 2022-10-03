"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.convertColorNumberToString = convertColorNumberToString;
exports.convertColorStringToNumber = convertColorStringToNumber;

var _three = require("three");

function convertColorStringToNumber(color) {
  if (typeof color !== "string") {
    return color;
  }

  return parseInt(color.toString().replace(/^#/, "0x"), 16);
}

function convertColorNumberToString(color) {
  if (typeof color === "string") {
    return color;
  }

  return "#" + new _three.Color(color).getHexString();
}