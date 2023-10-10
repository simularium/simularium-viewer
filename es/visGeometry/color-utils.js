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