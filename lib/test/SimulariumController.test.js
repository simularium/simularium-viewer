"use strict";

var _controller = require("../controller");

var _DummyRemoteSimulator = require("./DummyRemoteSimulator");

describe("SimulariumController module", function () {
  describe("SimulariumController Time", function () {
    test("Go to time in cache", function (done) {
      var netConn = new _DummyRemoteSimulator.DummyRemoteSimulator({});
      netConn.timeStep = 1;
      netConn.totalDuration = 100;
      netConn.commandLatencyMS = 0;
      netConn.connectLatencyMS = 0;
      var controller = new _controller.SimulariumController({
        remoteSimulator: netConn
      });
      controller.start(); // allow time for data streaming to occur

      setTimeout(function () {
        controller.gotoTime(2);
        expect(controller.time()).toEqual(2);
        done();
      }, 500);
    });
  });
});