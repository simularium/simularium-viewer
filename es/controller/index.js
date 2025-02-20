import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import jsLogger from "js-logger";
import { isEmpty, noop } from "lodash";
import { v4 as uuidv4 } from "uuid";
import { VisData, RemoteSimulator } from "../simularium/index.js";
import { FILE_STATUS_SUCCESS, FILE_STATUS_FAIL } from "../simularium/types.js";
import { ClientSimulator } from "../simularium/ClientSimulator.js";
import { LocalFileSimulator } from "../simularium/LocalFileSimulator.js";
import { WebsocketClient } from "../simularium/WebsocketClient.js";
import { RemoteMetricsCalculator } from "../simularium/RemoteMetricsCalculator.js";
import { OctopusServicesClient } from "../simularium/OctopusClient.js";
jsLogger.setHandler(jsLogger.createDefaultHandler());

// TODO: refine this as part of the public API for initializing the
// controller (also see SimulatorConnectionParams below)

// TODO: refine this as part of the public API for initializing the
// controller with a simulator connection
var SimulariumController = /*#__PURE__*/function () {
  function SimulariumController(params) {
    var _this = this;
    _classCallCheck(this, SimulariumController);
    _defineProperty(this, "simulator", void 0);
    _defineProperty(this, "remoteWebsocketClient", void 0);
    _defineProperty(this, "octopusClient", void 0);
    _defineProperty(this, "metricsCalculator", void 0);
    _defineProperty(this, "visData", void 0);
    _defineProperty(this, "visGeometry", void 0);
    _defineProperty(this, "tickIntervalLength", void 0);
    _defineProperty(this, "handleTrajectoryInfo", void 0);
    _defineProperty(this, "postConnect", void 0);
    _defineProperty(this, "startRecording", void 0);
    _defineProperty(this, "stopRecording", void 0);
    _defineProperty(this, "onStreamingChange", void 0);
    _defineProperty(this, "onError", void 0);
    _defineProperty(this, "isFileChanging", void 0);
    _defineProperty(this, "streaming", void 0);
    _defineProperty(this, "playBackFile", void 0);
    this.visData = new VisData();
    this.tickIntervalLength = 0; // Will be overwritten when a trajectory is loaded
    this.postConnect = function () {
      return noop;
    };
    this.startRecording = function () {
      return noop;
    };
    this.stopRecording = function () {
      return noop;
    };
    this.handleTrajectoryInfo = function /*msg: TrajectoryFileInfo*/ () {
      return noop;
    };
    this.onError = function /*errorMessage*/ () {
      return noop;
    };
    this.onStreamingChange = function /*streaming: boolean*/ () {
      return noop;
    };

    // might only be used in unit testing
    // TODO: change test so controller isn't initialized with a remoteSimulator
    if (params.remoteSimulator) {
      this.simulator = params.remoteSimulator;
      this.simulator.setTrajectoryFileInfoHandler(function (trajFileInfo) {
        _this.handleTrajectoryInfo(trajFileInfo);
      });
      this.simulator.setTrajectoryDataHandler(this.visData.parseAgentsFromNetData.bind(this.visData));
      // TODO: probably remove this? We're never initalizing the controller
      // with any settings on the website.
    } else if (params.netConnectionSettings) {
      this.createSimulatorConnection(params.netConnectionSettings, undefined, undefined);
    } else {
      // No network information was passed in
      //  the viewer will be initialized blank

      this.simulator = undefined;

      // @TODO: Pass this warning upwards (to installing app)
      if (params.trajectoryPlaybackFile) {
        console.warn("trajectoryPlaybackFile param ignored, no network config provided");
      }
    }
    this.isFileChanging = false;
    this.streaming = false;
    this.playBackFile = params.trajectoryPlaybackFile || "";
    this.zoomIn = this.zoomIn.bind(this);
    this.zoomOut = this.zoomOut.bind(this);
    this.resetCamera = this.resetCamera.bind(this);
    this.centerCamera = this.centerCamera.bind(this);
    this.reOrientCamera = this.reOrientCamera.bind(this);
    this.setPanningMode = this.setPanningMode.bind(this);
    this.setFocusMode = this.setFocusMode.bind(this);
    this.convertTrajectory = this.convertTrajectory.bind(this);
    this.setCameraType = this.setCameraType.bind(this);
    this.startSmoldynSim = this.startSmoldynSim.bind(this);
    this.cancelCurrentFile = this.cancelCurrentFile.bind(this);
    this.initNewFile = this.initNewFile.bind(this);
  }
  return _createClass(SimulariumController, [{
    key: "createSimulatorConnection",
    value: function createSimulatorConnection(netConnectionConfig, clientSimulator, localFile, geoAssets) {
      var _this2 = this;
      if (clientSimulator) {
        this.simulator = new ClientSimulator(clientSimulator);
        this.simulator.setTrajectoryDataHandler(this.visData.parseAgentsFromNetData.bind(this.visData));
      } else if (localFile) {
        this.simulator = new LocalFileSimulator(this.playBackFile, localFile);
        if (this.visGeometry && geoAssets && !isEmpty(geoAssets)) {
          this.visGeometry.geometryStore.cacheLocalAssets(geoAssets);
        }
        this.simulator.setTrajectoryDataHandler(this.visData.parseAgentsFromFrameData.bind(this.visData));
      } else if (netConnectionConfig) {
        var webSocketClient = new WebsocketClient(netConnectionConfig, this.onError);
        this.remoteWebsocketClient = webSocketClient;
        this.octopusClient = new OctopusServicesClient(webSocketClient);
        this.simulator = new RemoteSimulator(webSocketClient, this.onError);
        this.simulator.setTrajectoryDataHandler(this.visData.parseAgentsFromNetData.bind(this.visData));
      } else {
        // caught in try/catch block, not sent to front end
        throw new Error("Insufficient data to determine and configure simulator connection");
      }
      this.simulator.setTrajectoryFileInfoHandler(function (trajFileInfo) {
        _this2.handleTrajectoryInfo(trajFileInfo);
      });
      this.visData.setOnCacheLimitReached(function () {
        _this2.pauseStreaming();
      });
    }
  }, {
    key: "configureNetwork",
    value: function configureNetwork(config) {
      if (this.simulator) {
        this.simulator.abort();
      }
      this.createSimulatorConnection(config);
    }
  }, {
    key: "isRemoteOctopusClientConfigured",
    value: function isRemoteOctopusClientConfigured() {
      var _this$remoteWebsocket;
      return !!(this.simulator && this.octopusClient && (_this$remoteWebsocket = this.remoteWebsocketClient) !== null && _this$remoteWebsocket !== void 0 && _this$remoteWebsocket.socketIsValid());
    }
  }, {
    key: "isChangingFile",
    get: function get() {
      return this.isFileChanging;
    }
  }, {
    key: "setOnStreamingChangeCallback",
    value: function setOnStreamingChangeCallback(onStreamingChange) {
      this.onStreamingChange = onStreamingChange;
    }
  }, {
    key: "handleStreamingChange",
    value: function handleStreamingChange(streaming) {
      this.streaming = streaming;
      this.onStreamingChange(streaming);
    }
  }, {
    key: "isStreaming",
    value: function isStreaming() {
      return this.streaming;
    }

    // Not called by viewer, but could be called by
    // parent app
    // todo candidate for removal? not called in website
  }, {
    key: "connect",
    value: function connect() {
      var _this3 = this;
      if (!this.remoteWebsocketClient) {
        return Promise.reject(new Error("No network connection established in simularium controller."));
      }
      return this.remoteWebsocketClient.connectToRemoteServer().then(function (msg) {
        _this3.postConnect();
        return msg;
      });
    }
  }, {
    key: "start",
    value: function start() {
      if (!this.simulator) {
        return Promise.reject();
      }
      this.visData.clearCache();
      return this.simulator.initialize(this.playBackFile);
    }
  }, {
    key: "time",
    value: function time() {
      return this.visData.currentFrameData.time;
    }
  }, {
    key: "stop",
    value: function stop() {
      if (this.simulator) {
        this.simulator.abort();
        this.handleStreamingChange(false);
      }
    }
  }, {
    key: "sendUpdate",
    value: function sendUpdate(obj) {
      if (this.simulator) {
        this.simulator.sendUpdate(obj);
      }
    }
  }, {
    key: "convertTrajectory",
    value: function convertTrajectory(netConnectionConfig, dataToConvert, fileType, providedFileName) {
      var fileName = providedFileName !== null && providedFileName !== void 0 ? providedFileName : "".concat(uuidv4(), ".simularium");
      this.cancelCurrentFile(fileName);
      try {
        if (!this.isRemoteOctopusClientConfigured()) {
          this.configureNetwork(netConnectionConfig);
        }
        if (!this.octopusClient) {
          throw new Error("Octopus client not configured");
        }
        if (!this.simulator) {
          throw new Error("Simulator not initialized");
        }
        return this.octopusClient.convertTrajectory(dataToConvert, fileType, fileName);
      } catch (e) {
        return Promise.reject(e);
      }
    }
  }, {
    key: "pauseStreaming",
    value: function pauseStreaming() {
      if (this.simulator) {
        this.handleStreamingChange(false);
        // todo add frame argument once octopus supports this
        this.simulator.pause();
      }
    }
  }, {
    key: "paused",
    value: function paused() {
      return !this.isPlaying();
    }
  }, {
    key: "initializeTrajectoryFile",
    value: function initializeTrajectoryFile() {
      if (this.simulator) {
        this.simulator.initialize(this.playBackFile);
      }
    }
  }, {
    key: "startSmoldynSim",
    value: function startSmoldynSim(netConnectionConfig, fileName, smoldynInput) {
      this.cancelCurrentFile(fileName);
      try {
        if (!this.isRemoteOctopusClientConfigured()) {
          this.configureNetwork(netConnectionConfig);
        }
        if (!this.octopusClient) {
          throw new Error("Octopus client not configured");
        }
        if (!this.simulator) {
          throw new Error("Simulator not initialized");
        }
        return this.octopusClient.sendSmoldynData(fileName, smoldynInput);
      } catch (e) {
        return Promise.reject(e);
      }
    }
  }, {
    key: "clampFrameNumber",
    value: function clampFrameNumber(frame) {
      return Math.max(0, Math.min(frame, this.visData.totalSteps - 1));
    }
  }, {
    key: "getFrameAtTime",
    value: function getFrameAtTime(time) {
      var frameNumber = Math.round(time / this.visData.timeStepSize);
      var clampedFrame = this.clampFrameNumber(frameNumber);
      return clampedFrame;
    }
  }, {
    key: "movePlaybackFrame",
    value: function movePlaybackFrame(frameNumber) {
      if (this.streaming) {
        this.pauseStreaming();
      }
      var clampedFrame = this.clampFrameNumber(frameNumber);
      if (this.isFileChanging || !this.simulator) return;
      if (this.visData.hasLocalCacheForFrame(clampedFrame)) {
        this.visData.gotoFrame(clampedFrame);
        this.resumeStreaming();
      } else if (this.simulator) {
        this.clearLocalCache();
        this.visData.WaitForFrame(clampedFrame);
        this.visData.currentFrameNumber = clampedFrame;
        this.resumeStreaming(clampedFrame);
      }
    }
  }, {
    key: "gotoTime",
    value: function gotoTime(time) {
      var targetFrame = this.getFrameAtTime(time);
      this.movePlaybackFrame(targetFrame);
    }
  }, {
    key: "playFromTime",
    value: function playFromTime(time) {
      this.gotoTime(time);
      this.visData.isPlaying = true;
    }
  }, {
    key: "initalizeStreaming",
    value: function initalizeStreaming() {
      if (this.simulator) {
        this.simulator.requestFrame(0);
        this.simulator.stream();
        this.handleStreamingChange(true);
      }
    }
  }, {
    key: "resumeStreaming",
    value: function resumeStreaming(startFrame) {
      if (this.streaming) {
        return;
      }
      var requestFrame = null;
      if (startFrame !== undefined) {
        requestFrame = startFrame;
      } else if (this.visData.remoteStreamingHeadPotentiallyOutOfSync) {
        requestFrame = this.visData.currentStreamingHead;
      }
      if (this.simulator) {
        if (requestFrame !== null) {
          this.simulator.requestFrame(requestFrame);
        }
        this.simulator.stream();
        this.handleStreamingChange(true);
      }
    }

    // pause playback
  }, {
    key: "pause",
    value: function pause() {
      this.visData.isPlaying = false;
    }

    // resume playback
  }, {
    key: "resume",
    value: function resume() {
      this.visData.isPlaying = true;
      this.resumeStreaming();
    }
  }, {
    key: "clearFile",
    value: function clearFile() {
      var _this$simulator;
      this.isFileChanging = false;
      this.playBackFile = "";
      this.visData.clearForNewTrajectory();
      (_this$simulator = this.simulator) === null || _this$simulator === void 0 || _this$simulator.abort();
      if (this.visGeometry) {
        this.visGeometry.clearForNewTrajectory();
        this.visGeometry.resetCamera();
      }
    }
  }, {
    key: "handleFileChange",
    value: function handleFileChange(simulariumFile, fileName, geoAssets) {
      if (!fileName.includes(".simularium")) {
        throw new Error("File must be a .simularium file");
      }
      if (geoAssets) {
        return this.changeFile({
          simulariumFile: simulariumFile,
          geoAssets: geoAssets
        }, fileName);
      } else {
        return this.changeFile({
          simulariumFile: simulariumFile
        }, fileName);
      }
    }
  }, {
    key: "cancelCurrentFile",
    value: function cancelCurrentFile(newFileName) {
      this.isFileChanging = true;
      this.playBackFile = newFileName;

      // calls simulator.abort()
      this.stop();
      this.visData.WaitForFrame(0);
      this.visData.clearForNewTrajectory();
    }
  }, {
    key: "initNewFile",
    value: function initNewFile(connectionParams) {
      var _this4 = this;
      var keepRemoteConnection = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      var shouldConfigureNewSimulator = !(keepRemoteConnection && this.isRemoteOctopusClientConfigured());
      // don't create simulator if client wants to keep remote simulator and the
      // current simulator is a remote simulator
      if (shouldConfigureNewSimulator) {
        try {
          if (connectionParams) {
            this.createSimulatorConnection(connectionParams.netConnectionSettings, connectionParams.clientSimulator, connectionParams.simulariumFile, connectionParams.geoAssets);
            this.visData.isPlaying = false;
          } else {
            // caught in following block, not sent to front end
            throw new Error("incomplete simulator config provided");
          }
        } catch (e) {
          var error = e;
          this.simulator = undefined;
          console.warn(error.message);
          this.visData.isPlaying = false;
        }
      }

      // start the simulation paused and get first frame
      if (this.simulator) {
        return this.start().then(function () {
          if (_this4.simulator) {
            _this4.simulator.requestFrame(0);
          }
        }).then(function () {
          _this4.resumeStreaming();
        }).then(function () {
          return {
            status: FILE_STATUS_SUCCESS
          };
        });
      }
      return Promise.reject({
        status: FILE_STATUS_FAIL
      });
    }
  }, {
    key: "changeFile",
    value: function changeFile(connectionParams,
    // TODO: push newFileName into connectionParams
    newFileName) {
      var keepRemoteConnection = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
      this.cancelCurrentFile(newFileName);
      return this.initNewFile(connectionParams, keepRemoteConnection);
    }
  }, {
    key: "markFileChangeAsHandled",
    value: function markFileChangeAsHandled() {
      this.isFileChanging = false;
    }
  }, {
    key: "getFile",
    value: function getFile() {
      return this.playBackFile;
    }
  }, {
    key: "checkServerHealth",
    value: function checkServerHealth(handler, netConnectionConfig) {
      if (!this.isRemoteOctopusClientConfigured()) {
        this.configureNetwork(netConnectionConfig);
      }
      if (this.octopusClient) {
        this.octopusClient.setHealthCheckHandler(handler);
        this.octopusClient.checkServerHealth();
      }
    }
  }, {
    key: "cancelConversion",
    value: function cancelConversion() {
      if (this.octopusClient) {
        this.octopusClient.cancelConversion();
      }
    }
  }, {
    key: "setupMetricsCalculator",
    value: function setupMetricsCalculator(config) {
      var webSocketClient = this.remoteWebsocketClient && this.remoteWebsocketClient.socketIsValid() ? this.remoteWebsocketClient : new WebsocketClient(config, this.onError);
      return new RemoteMetricsCalculator(webSocketClient, this.onError);
    }
  }, {
    key: "getMetrics",
    value: function () {
      var _getMetrics = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime.mark(function _callee(config) {
        return _regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              if (!(!this.metricsCalculator || !this.metricsCalculator.socketIsValid())) {
                _context.next = 4;
                break;
              }
              this.metricsCalculator = this.setupMetricsCalculator(config);
              _context.next = 4;
              return this.metricsCalculator.connectToRemoteServer();
            case 4:
              this.metricsCalculator.getAvailableMetrics();
            case 5:
            case "end":
              return _context.stop();
          }
        }, _callee, this);
      }));
      function getMetrics(_x) {
        return _getMetrics.apply(this, arguments);
      }
      return getMetrics;
    }()
  }, {
    key: "getPlotData",
    value: function () {
      var _getPlotData = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime.mark(function _callee2(config, requestedPlots) {
        var simulariumFile;
        return _regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              if (this.simulator) {
                _context2.next = 2;
                break;
              }
              return _context2.abrupt("return");
            case 2:
              if (!(!this.metricsCalculator || !this.metricsCalculator.socketIsValid())) {
                _context2.next = 6;
                break;
              }
              this.metricsCalculator = this.setupMetricsCalculator(config);
              _context2.next = 6;
              return this.metricsCalculator.connectToRemoteServer();
            case 6:
              if (this.simulator instanceof LocalFileSimulator) {
                simulariumFile = this.simulator.getSimulariumFile();
                this.metricsCalculator.getPlotData(simulariumFile["simulariumFile"], requestedPlots);
              } else if (this.simulator instanceof RemoteSimulator) {
                // we don't have the simularium file, so we'll just send an empty data object
                this.metricsCalculator.getPlotData({}, requestedPlots, this.simulator.getLastRequestedFile());
              }
            case 7:
            case "end":
              return _context2.stop();
          }
        }, _callee2, this);
      }));
      function getPlotData(_x2, _x3) {
        return _getPlotData.apply(this, arguments);
      }
      return getPlotData;
    }()
  }, {
    key: "clearLocalCache",
    value: function clearLocalCache() {
      this.visData.clearCache();
    }
  }, {
    key: "trajFileInfoCallback",
    set: function set(callback) {
      this.handleTrajectoryInfo = callback;
      if (this.simulator) {
        this.simulator.setTrajectoryFileInfoHandler(callback);
      }
    }

    /**
     * Camera controls
     * simulariumController.visGeometry gets set in
     * componentDidMount of the viewer, so as long as the dom is mounted
     * these functions will be callable.
     */
  }, {
    key: "zoomIn",
    value: function zoomIn() {
      var _this$visGeometry;
      (_this$visGeometry = this.visGeometry) === null || _this$visGeometry === void 0 || _this$visGeometry.zoomIn();
    }
  }, {
    key: "zoomOut",
    value: function zoomOut() {
      var _this$visGeometry2;
      (_this$visGeometry2 = this.visGeometry) === null || _this$visGeometry2 === void 0 || _this$visGeometry2.zoomOut();
    }
  }, {
    key: "resetCamera",
    value: function resetCamera() {
      var _this$visGeometry3;
      (_this$visGeometry3 = this.visGeometry) === null || _this$visGeometry3 === void 0 || _this$visGeometry3.resetCamera();
    }
  }, {
    key: "centerCamera",
    value: function centerCamera() {
      var _this$visGeometry4;
      (_this$visGeometry4 = this.visGeometry) === null || _this$visGeometry4 === void 0 || _this$visGeometry4.centerCamera();
    }
  }, {
    key: "reOrientCamera",
    value: function reOrientCamera() {
      var _this$visGeometry5;
      (_this$visGeometry5 = this.visGeometry) === null || _this$visGeometry5 === void 0 || _this$visGeometry5.reOrientCamera();
    }
  }, {
    key: "setPanningMode",
    value: function setPanningMode(pan) {
      var _this$visGeometry6;
      (_this$visGeometry6 = this.visGeometry) === null || _this$visGeometry6 === void 0 || _this$visGeometry6.setPanningMode(pan);
    }
  }, {
    key: "setAllowViewPanning",
    value: function setAllowViewPanning(allow) {
      var _this$visGeometry7;
      (_this$visGeometry7 = this.visGeometry) === null || _this$visGeometry7 === void 0 || _this$visGeometry7.setAllowViewPanning(allow);
    }
  }, {
    key: "setFocusMode",
    value: function setFocusMode(focus) {
      var _this$visGeometry8;
      (_this$visGeometry8 = this.visGeometry) === null || _this$visGeometry8 === void 0 || _this$visGeometry8.setFocusMode(focus);
    }
  }, {
    key: "setCameraType",
    value: function setCameraType(ortho) {
      var _this$visGeometry9;
      (_this$visGeometry9 = this.visGeometry) === null || _this$visGeometry9 === void 0 || _this$visGeometry9.setCameraType(ortho);
    }
  }, {
    key: "isPlaying",
    value: function isPlaying() {
      return this.visData.isPlaying;
    }
  }, {
    key: "currentPlaybackHead",
    value: function currentPlaybackHead() {
      return this.visData.currentFrameNumber;
    }
  }, {
    key: "currentStreamingHead",
    value: function currentStreamingHead() {
      return this.visData.currentStreamingHead;
    }
  }]);
}();
export { SimulariumController as default };
export { SimulariumController };