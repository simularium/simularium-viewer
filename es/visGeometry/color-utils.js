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