function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

import { NetConnection } from "../";
// Mocks the simularium simulation back-end, w/ latency
export var DummyNetConnection =
/*#__PURE__*/
function (_NetConnection) {
  _inherits(DummyNetConnection, _NetConnection);

  function DummyNetConnection(opts) {
    var _this;

    _classCallCheck(this, DummyNetConnection);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(DummyNetConnection).call(this, opts));

    _defineProperty(_assertThisInitialized(_this), "isStreamingData", void 0);

    _defineProperty(_assertThisInitialized(_this), "frameCounter", void 0);

    _defineProperty(_assertThisInitialized(_this), "isConnected", void 0);

    _defineProperty(_assertThisInitialized(_this), "commandLatencyMS", void 0);

    _defineProperty(_assertThisInitialized(_this), "connectLatencyMS", void 0);

    _defineProperty(_assertThisInitialized(_this), "totalDuration", void 0);

    _defineProperty(_assertThisInitialized(_this), "timeStep", void 0);

    _defineProperty(_assertThisInitialized(_this), "fileName", void 0);

    _this.isStreamingData = false;
    _this.isConnected = false;
    _this.frameCounter = 0;
    _this.commandLatencyMS = 200;
    _this.connectLatencyMS = 1000;
    _this.timeStep = 1;
    _this.totalDuration = 99;
    _this.fileName = "";
    setInterval(_this.broadcast.bind(_assertThisInitialized(_this)), 200);
    return _this;
  }

  _createClass(DummyNetConnection, [{
    key: "getDataBundle",
    value: function getDataBundle(frameNumber, bundleSize) {
      var msg = {
        msgType: this.msgTypes.ID_VIS_DATA_ARRIVE,
        bundleStart: frameNumber,
        bundleSize: bundleSize,
        bundleData: []
      };
      var bundleData = [];

      for (var i = 0; i < bundleSize; i++) {
        var data = {
          frameNumber: frameNumber,
          time: frameNumber * this.timeStep,
          data: [1000, 43, Math.cos(frameNumber / 4) * 5, Math.sin(frameNumber / 4) * 5, 0, 0, 0, 10, 1, 0]
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
      });
    }
  }, {
    key: "requestTrajectoryFileInfo",
    value: function requestTrajectoryFileInfo(fileName) {
      var _this5 = this;

      setTimeout(function () {
        var tfi = {
          msgType: _this5.msgTypes.ID_TRAJECTORY_FILE_INFO,
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
    value: function gotoRemoteSimulationTime(timeNS) {
      var _this7 = this;

      setTimeout(function () {
        _this7.frameCounter = timeNS / _this7.timeStep;

        var msg = _this7.getDataBundle(_this7.frameCounter, 1);

        _this7.frameCounter++;

        _this7.onMessage({
          data: JSON.stringify(msg)
        });
      }, this.commandLatencyMS);
    }
  }]);

  return DummyNetConnection;
}(NetConnection);