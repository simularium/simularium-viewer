"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.convertColorStringToNumber = convertColorStringToNumber;
exports.convertColorNumberToString = convertColorNumberToString;

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

  return "#" + (0, _three.Color)(color).getHexString();
}