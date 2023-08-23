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
    return "#" + new Color(color).getHexString();
}

export const checkHexColor = (color: string): string => {
    const hexColorCodeRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexColorCodeRegex.test(color)) {
        throw new Error("Invalid color code");
    }
    return color;
};
