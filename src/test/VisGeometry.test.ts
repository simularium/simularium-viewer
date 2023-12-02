/* eslint-disable @typescript-eslint/no-explicit-any */
/* NOTE: this file is testing many private
    methods and properties of VisGeometry.ts
    which we do by using (visGeometry as any) 
    so we need to disable the eslint rule here
*/

import VisGeometry from "../visGeometry";
import jsLogger from "js-logger";
import { convertColorStringToNumber } from "../visGeometry/ColorHandler";
import { Color } from "three";

const initialColorData = ["#000000", "#000001", "#000002", "#000003"];
const visGeometry = new VisGeometry(jsLogger.DEBUG);

describe("VisGeometry", () => {
    describe("agent color management", () => {
        beforeAll(() => {
            visGeometry.createMaterials(initialColorData);
        });
        describe("convertDataColorIndexToId", () => {
            test("it returns the index into the shorter, color as string, array", () => {
                expect((visGeometry as any).convertDataColorIndexToId(0)).toBe(
                    0
                );
                expect((visGeometry as any).convertDataColorIndexToId(4)).toBe(
                    1
                );
                expect((visGeometry as any).convertDataColorIndexToId(8)).toBe(
                    2
                );
                expect((visGeometry as any).convertDataColorIndexToId(12)).toBe(
                    3
                );
            });
            test("if the index is outside the the length of colorsData, it loops to the beginning", () => {
                expect((visGeometry as any).convertDataColorIndexToId(16)).toBe(
                    0
                );
                expect((visGeometry as any).convertDataColorIndexToId(20)).toBe(
                    1
                );
                expect((visGeometry as any).convertDataColorIndexToId(24)).toBe(
                    2
                );
                expect((visGeometry as any).convertDataColorIndexToId(28)).toBe(
                    3
                );
            });
            test("if the colorDataIndex is not divisible by 4, returns -1", () => {
                expect((visGeometry as any).convertDataColorIndexToId(1)).toBe(
                    -1
                );
                expect((visGeometry as any).convertDataColorIndexToId(2)).toBe(
                    -1
                );
                expect((visGeometry as any).convertDataColorIndexToId(3)).toBe(
                    -1
                );
            });
        });
        describe("getColorDataIndex", () => {
            test("it returns the index into the colorData array of an existing color", () => {
                for (let i = 0; i < initialColorData.length; i++) {
                    const colorNumber = convertColorStringToNumber(
                        initialColorData[i]
                    );
                    const newColor = [
                        ((colorNumber & 0x00ff0000) >> 16) / 255.0,
                        ((colorNumber & 0x0000ff00) >> 8) / 255.0,
                        ((colorNumber & 0x000000ff) >> 0) / 255.0,
                        1.0,
                    ];
                    expect(
                        (visGeometry as any).getColorDataIndex(newColor)
                    ).toBe(i * 4);
                }
            });
            test("it returns -1 if the color is not found", () => {
                const colorNumber = convertColorStringToNumber("#000004");
                const newColor = [
                    ((colorNumber & 0x00ff0000) >> 16) / 255.0,
                    ((colorNumber & 0x0000ff00) >> 8) / 255.0,
                    ((colorNumber & 0x000000ff) >> 0) / 255.0,
                    1.0,
                ];
                expect((visGeometry as any).getColorDataIndex(newColor)).toBe(
                    -1
                );
            });
        });
        test("createMaterials sets colorsData with 4 values for each color", () => {
            expect((visGeometry as any).colorsData).toHaveLength(
                initialColorData.length * 4
            );
            expect((visGeometry as any).numberOfColors).toBe(
                initialColorData.length
            );
        });
        describe("getColorForColorId", () => {
            test("it returns the color as a string for a valid colorId", () => {
                for (let i = 0; i < initialColorData.length; i++) {
                    const expectedColor = new Color(initialColorData[i]);
                    const actualColor = visGeometry.getColorForColorId(i);
                    expect(actualColor.r).toBeCloseTo(expectedColor.r, 0.0001);
                    expect(actualColor.g).toBeCloseTo(expectedColor.g, 0.0001);
                    expect(actualColor.b).toBeCloseTo(expectedColor.b, 0.0001);
                }
            });
            test("it returns the first color for an invalid colorId", () => {
                const actualColor = visGeometry.getColorForColorId(-1);

                expect(actualColor).toEqual(visGeometry.getColorForColorId(0));
            });
            test("it loops around if the id is out of range", () => {
                expect(visGeometry.getColorForColorId(4)).toEqual(
                    visGeometry.getColorForColorId(0)
                );
                expect(visGeometry.getColorForColorId(5)).toEqual(
                    visGeometry.getColorForColorId(1)
                );
            });
        });
    });
});
