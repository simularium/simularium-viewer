"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DummyRemoteSimulator = void 0;

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _assertThisInitialized2 = _interopRequireDefault(require("@babel/runtime/helpers/assertThisInitialized"));

var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));

var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));

var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _RemoteSimulator2 = require("../simularium/RemoteSimulator");

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2["default"])(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2["default"])(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2["default"])(this, result); }; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

// Mocks the simularium simulation back-end, w/ latency
var DummyRemoteSimulator = /*#__PURE__*/function (_RemoteSimulator) {
  (0, _inherits2["default"])(DummyRemoteSimulator, _RemoteSimulator);

  var _super = _createSuper(DummyRemoteSimulator);

  function DummyRemoteSimulator(opts) {
    var _this;

    (0, _classCallCheck2["default"])(this, DummyRemoteSimulator);
    _this = _super.call(this, opts);
    (0, _defineProperty2["default"])((0, _assertThisInitialized2["default"])(_this), "isStreamingData", void 0);
    (0, _defineProperty2["default"])((0, _assertThisInitialized2["default"])(_this), "frameCounter", void 0);
    (0, _defineProperty2["default"])((0, _assertThisInitialized2["default"])(_this), "isConnected", void 0);
    (0, _defineProperty2["default"])((0, _assertThisInitialized2["default"])(_this), "commandLatencyMS", void 0);
    (0, _defineProperty2["default"])((0, _assertThisInitialized2["default"])(_this), "connectLatencyMS", void 0);
    (0, _defineProperty2["default"])((0, _assertThisInitialized2["default"])(_this), "totalDuration", void 0);
    (0, _defineProperty2["default"])((0, _assertThisInitialized2["default"])(_this), "timeStep", void 0);
    (0, _defineProperty2["default"])((0, _assertThisInitialized2["default"])(_this), "fileName", void 0);
    _this.isStreamingData = false;
    _this.isConnected = false;
    _this.frameCounter = 0;
    _this.commandLatencyMS = 200;
    _this.connectLatencyMS = 1000;
    _this.timeStep = 1;
    _this.totalDuration = 99;
    _this.fileName = "";
    setInterval(_this.broadcast.bind((0, _assertThisInitialized2["default"])(_this)), 200);
    return _this;
  }

  (0, _createClass2["default"])(DummyRemoteSimulator, [{
    key: "getDataBundle",
    value: function getDataBundle(frameNumber, bundleSize) {
      var msg = {
        msgType: _RemoteSimulator2.NetMessageEnum.ID_VIS_DATA_ARRIVE,
        bundleStart: frameNumber,
        bundleSize: bundleSize,
        bundleData: [],
        fileName: this.lastRequestedFile
      };
      var bundleData = [];

      for (var i = 0; i < bundleSize; i++) {
        var data = {
          frameNumber: frameNumber,
          time: frameNumber * this.timeStep,
          data: [1000, 0, 43, Math.cos(frameNumber / 4) * 5, Math.sin(frameNumber / 4) * 5, 0, 0, 0, 10, 1, 0]
        };
        bundleData.push(data);
        frameNumber++;
      }

      msg.bundleData = bundleData;
      return msg;
    }
  }, {
    key: "broadcast",
    value: function broadcast() {
      if (!this.isStreamingData) {
        return;
      }

      if (this.frameCounter * this.timeStep > this.totalDuration) {
        this.isStreamingData = false; // finished

        return;
      }

      var bundleSize = 5;
      var msg = this.getDataBundle(this.frameCounter, bundleSize);
      this.frameCounter += bundleSize;
      this.onMessage({
        data: JSON.stringify(msg)
      });
    }
  }, {
    key: "getIp",
    value: function getIp() {
      return "dummy-net-connection-test-addr";
    }
  }, {
    key: "socketIsValid",
    value: function socketIsValid() {
      return this.isConnected;
    }
  }, {
    key: "connectToRemoteServer",
    value: function connectToRemoteServer(uri) {
      var _this2 = this;

      return new Promise(function (resolve) {
        setTimeout(function () {
          _this2.isConnected = true;
          resolve(uri);
        }, _this2.connectLatencyMS);
      });
    }
  }, {
    key: "disconnect",
    value: function disconnect() {
      var _this3 = this;

      setTimeout(function () {
        _this3.isConnected = false;
      }, this.commandLatencyMS);
    }
  }, {
    key: "pauseRemoteSim",
    value: function pauseRemoteSim() {
      this.isStreamingData = false;
    }
  }, {
    key: "resumeRemoteSim",
    value: function resumeRemoteSim() {
      this.isStreamingData = true;
    }
  }, {
    key: "abortRemoteSim",
    value: function abortRemoteSim() {
      this.isStreamingData = false;
      this.isConnected = false;
    }
  }, {
    key: "startRemoteTrajectoryPlayback",
    value: function startRemoteTrajectoryPlayback(fileName) {
      var _this4 = this;

      return this.connectToRemoteServer(this.getIp()).then(function () {
        _this4.fileName = fileName;
        _this4.isStreamingData = true;
        _this4.lastRequestedFile = fileName;
      });
    }
  }, {
    key: "requestTrajectoryFileInfo",
    value: function requestTrajectoryFileInfo(fileName) {
      var _this5 = this;

      setTimeout(function () {
        var tfi = {
          msgType: _RemoteSimulator2.NetMessageEnum.ID_TRAJECTORY_FILE_INFO,
          boxSizeX: 100,
          boxSizeY: 100,
          boxSizeZ: 20,
          totalDuration: _this5.totalDuration,
          timeStepSize: _this5.timeStep,
          fileName: fileName
        };

        _this5.onMessage({
          data: JSON.stringify(tfi)
        }); // Send the first frame of data


        var msg = _this5.getDataBundle(0, 1);

        _this5.frameCounter++;

        _this5.onMessage({
          data: JSON.stringify(msg)
        });
      }, this.commandLatencyMS);
    }
  }, {
    key: "requestSingleFrame",
    value: function requestSingleFrame(frameNumber) {
      var _this6 = this;

      setTimeout(function () {
        _this6.frameCounter = frameNumber;

        var msg = _this6.getDataBundle(_this6.frameCounter, 1);

        _this6.frameCounter;

        _this6.onMessage({
          data: JSON.stringify(msg)
        });
      }, this.commandLatencyMS);
    }
  }, {
    key: "gotoRemoteSimulationTime",
    value: function gotoRemoteSimulationTime(time) {
      var _this7 = this;

      setTimeout(function () {
        _this7.frameCounter = time / _this7.timeStep;

        var msg = _this7.getDataBundle(_this7.frameCounter, 1);

        _this7.frameCounter++;

        _this7.onMessage({
          data: JSON.stringify(msg)
        });
      }, this.commandLatencyMS);
    }
  }]);
  return DummyRemoteSimulator;
}(_RemoteSimulator2.RemoteSimulator);

exports.DummyRemoteSimulator = DummyRemoteSimulator;