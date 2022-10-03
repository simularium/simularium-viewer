"use strict";

var _simularium = require("../simularium");

// Sample data of a single agent of type '7'
//  moving linearly from (0,0,0) to (5,5,5)
//  and rotating 0-90 degrees around the x axis
//  over 5 frames from time 0-20
var testData = {
  fileName: "",
  msgType: 1,
  bundleSize: 5,
  bundleStart: 0,
  bundleData: [{
    frameNumber: 0,
    time: 0,
    data: [1000, 0, 7, 1, 1, 1, 0, 0, 0, 1, 0]
  }, {
    frameNumber: 1,
    time: 5,
    data: [1000, 0, 7, 2, 2, 2, 0, 22.5, 0, 1, 0]
  }, {
    frameNumber: 2,
    time: 10,
    data: [1000, 0, 7, 3, 3, 3, 0, 45, 0, 1, 0]
  }, {
    frameNumber: 3,
    time: 15,
    data: [1000, 0, 7, 4, 4, 4, 0, 67.5, 0, 1, 0]
  }, {
    frameNumber: 4,
    time: 20,
    data: [1000, 0, 7, 5, 5, 5, 0, 90, 0, 1, 0]
  }]
};
var parsedData = [[{
  cr: 1,
  nSubPoints: 0,
  subpoints: [],
  type: 7,
  instanceId: 0,
  "vis-type": 1000,
  x: 1,
  xrot: 0,
  y: 1,
  yrot: 0,
  z: 1,
  zrot: 0
}], [{
  cr: 1,
  nSubPoints: 0,
  subpoints: [],
  type: 7,
  instanceId: 0,
  "vis-type": 1000,
  x: 2,
  xrot: 0,
  y: 2,
  yrot: 22.5,
  z: 2,
  zrot: 0
}], [{
  cr: 1,
  nSubPoints: 0,
  subpoints: [],
  type: 7,
  instanceId: 0,
  "vis-type": 1000,
  x: 3,
  xrot: 0,
  y: 3,
  yrot: 45,
  z: 3,
  zrot: 0
}], [{
  cr: 1,
  nSubPoints: 0,
  subpoints: [],
  type: 7,
  instanceId: 0,
  "vis-type": 1000,
  x: 4,
  xrot: 0,
  y: 4,
  yrot: 67.5,
  z: 4,
  zrot: 0
}], [{
  cr: 1,
  nSubPoints: 0,
  subpoints: [],
  type: 7,
  instanceId: 0,
  "vis-type": 1000,
  x: 5,
  xrot: 0,
  y: 5,
  yrot: 90,
  z: 5,
  zrot: 0
}]];
describe("VisData module", function () {
  describe("VisData parse", function () {
    test("it returns an array of objects of agent data and time stamp data", function () {
      var testData = [10, //"vis-type",
      15, //"instanceId",
      20, //"type",
      30, //"x",
      31, //"y",
      32, //"z",
      40, //"xrot",
      41, //"yrot",
      42, //"zrot",
      50, //"cr",
      3, 60, //"subpoint-1",
      61, //"subpoint-2",
      62 //"subpoint-3",
      ];
      var visDataMsg = {
        msgType: _simularium.NetMessageEnum.ID_VIS_DATA_ARRIVE,
        bundleData: [{
          data: testData,
          frameNumber: 0,
          time: 0
        }],
        bundleSize: 1,
        bundleStart: 0,
        fileName: ""
      };

      var parsedData = _simularium.VisData.parse(visDataMsg);

      expect(parsedData.frameDataArray).toEqual([{
        frameNumber: 0,
        time: 0
      }]);
      expect(parsedData.parsedAgentDataArray).toEqual([[{
        cr: 50,
        //"cr",
        nSubPoints: 3,
        subpoints: [60, 61, 62],
        //"subpoint-1", "subpoint-2", "subpoint-3"],
        type: 20,
        //"type",
        instanceId: 15,
        //"instanceId",
        "vis-type": 10,
        //"vis-type",
        x: 30,
        //"x",
        xrot: 40,
        //"xrot",
        y: 31,
        //"y",
        yrot: 41,
        //"yrot",
        z: 32,
        //"z",
        zrot: 42 //"zrot",

      }]]);
    });
    test("it throws an error if number of supoints does not match the nSubpoints value", function () {
      var tooShort = [10, //"vis-type",
      15, //"instanceId",
      20, //"type",
      30, //"x",
      31, //"y",
      32, //"z",
      40, //"xrot",
      41, //"yrot",
      42, //"zrot",
      50, //"cr",
      10, 60, //"subpoint-1",
      61, //"subpoint-2",
      62, //"subpoint-3",
      63 //"subpoint-4",
      ];
      var visDataMsgTooShort = {
        msgType: _simularium.NetMessageEnum.ID_VIS_DATA_ARRIVE,
        bundleData: [{
          data: tooShort,
          frameNumber: 0,
          time: 0
        }],
        bundleSize: 1,
        bundleStart: 0,
        fileName: ""
      };
      var tooLong = [10, //"vis-type",
      15, //"instanceId",
      20, //"type",
      30, //"x",
      31, //"y",
      32, //"z",
      40, //"xrot",
      41, //"yrot",
      42, //"zrot",
      50, //"cr",
      2, 60, //"subpoint-1",
      61, //"subpoint-2",
      62 //"subpoint-3",
      ];
      var visDataMsgTooLong = {
        msgType: _simularium.NetMessageEnum.ID_VIS_DATA_ARRIVE,
        bundleData: [{
          data: tooLong,
          frameNumber: 0,
          time: 0
        }],
        bundleSize: 1,
        bundleStart: 0,
        fileName: ""
      };
      expect(function () {
        _simularium.VisData.parse(visDataMsgTooLong);
      }).toThrowError();
      expect(function () {
        _simularium.VisData.parse(visDataMsgTooShort);
      }).toThrowError();
    });
    test("currentFrame returns empty frame when cache is empty", function () {
      var visData = new _simularium.VisData();
      var emptyFrame = visData.currentFrame();
      expect(emptyFrame).toEqual([]);
    });
    test("can request frame from a cache size of 1", function () {
      var singleFrame = {
        msgType: 1,
        bundleSize: 1,
        bundleStart: 0,
        bundleData: [{
          frameNumber: 1,
          time: 0,
          data: [1000, 0, 7, 1, 1, 1, 0, 0, 0, 1, 0]
        }],
        fileName: ""
      };
      var parsedSingleFrame = [{
        cr: 1,
        nSubPoints: 0,
        subpoints: [],
        type: 7,
        instanceId: 0,
        "vis-type": 1000,
        x: 1,
        xrot: 0,
        y: 1,
        yrot: 0,
        z: 1,
        zrot: 0
      }];
      var visData = new _simularium.VisData();
      visData.parseAgentsFromNetData(singleFrame);
      var firstFrame = visData.currentFrame();
      expect(firstFrame).toEqual(parsedSingleFrame);
    });
    test("parses 5 frame bundle correctly", function () {
      var visData = new _simularium.VisData();
      visData.parseAgentsFromNetData(testData);
      expect(visData.atLatestFrame()).toBe(false);
      var i = 0;

      while (!visData.atLatestFrame()) {
        var currentFrame = visData.currentFrame();
        expect(visData.hasLocalCacheForTime(i * 5)).toBe(true);
        expect(currentFrame).toEqual(parsedData[i++]);
        visData.gotoNextFrame();
      }
    });
    test("can find frames in cache by time", function () {
      var visData = new _simularium.VisData();
      visData.parseAgentsFromNetData(testData);
      var i = 0;

      while (!visData.atLatestFrame()) {
        expect(visData.hasLocalCacheForTime(i * 5)).toBe(true);
        visData.gotoNextFrame();
      }
    });
  });
});