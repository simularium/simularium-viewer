import { Color } from "three";

export function convertColorStringToNumber(color: number | string): number {
    if (typeof color !== "string") {
        return color;
    }
    return parseInt(color.toString().replace(/^#/, "0x"), 16);
}

export function convertColorNumberToString(color: number | string): string {
    if (typeof color === "string") {
        return color;
    }
    return "#" + Color(color).getHexString();
}
