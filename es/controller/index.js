import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
import jsLogger from "js-logger";
import { isEmpty, noop } from "lodash";
import { RemoteSimulator, VisData, TrajectoryFileInfo } from "../simularium";
import { FILE_STATUS_SUCCESS, FILE_STATUS_FAIL } from "../simularium/types";
import { ClientSimulator } from "../simularium/ClientSimulator";
import { LocalFileSimulator } from "../simularium/LocalFileSimulator";
jsLogger.setHandler(jsLogger.createDefaultHandler()); // TODO: refine this as part of the public API for initializing the
// controller (also see SimulatorConnectionParams below)

var SimulariumController = /*#__PURE__*/function () {
  function SimulariumController(params) {
    var _this = this;

    _classCallCheck(this, SimulariumController);

    _defineProperty(this, "simulator", void 0);

    _defineProperty(this, "visData", void 0);

    _defineProperty(this, "visGeometry", void 0);

    _defineProperty(this, "tickIntervalLength", void 0);

    _defineProperty(this, "handleTrajectoryInfo", void 0);

    _defineProperty(this, "postConnect", void 0);

    _defineProperty(this, "onError", void 0);

    _defineProperty(this, "networkEnabled", void 0);

    _defineProperty(this, "isPaused", void 0);

    _defineProperty(this, "isFileChanging", void 0);

    _defineProperty(this, "playBackFile", void 0);

    this.visData = new VisData();
    this.tickIntervalLength = 0; // Will be overwritten when a trajectory is loaded

    this.postConnect = function () {
      return noop;
    };

    this.handleTrajectoryInfo = function
      /*msg: TrajectoryFileInfo*/
    () {
      return noop;
    };

    this.onError = function
      /*errorMessage*/
    () {
      return noop;
    }; // might only be used in unit testing
    // TODO: change test so controller isn't initialized with a remoteSimulator


    if (params.remoteSimulator) {
      this.simulator = params.remoteSimulator;
      this.simulator.setTrajectoryFileInfoHandler(function (trajFileInfo) {
        _this.handleTrajectoryInfo(trajFileInfo);
      });
      this.simulator.setTrajectoryDataHandler(this.visData.parseAgentsFromNetData.bind(this.visData)); // TODO: probably remove this? We're never initalizing the controller
      // with any settings on the website.
    } else if (params.netConnectionSettings) {
      this.createSimulatorConnection(params.netConnectionSettings, undefined, undefined);
    } else {
      // No network information was passed in
      //  the viewer will be initialized blank
      this.simulator = undefined; // @TODO: Pass this warning upwards (to installing app)

      if (params.trajectoryPlaybackFile) {
        console.warn("trajectoryPlaybackFile param ignored, no network config provided");
      }
    }

    this.networkEnabled = true;
    this.isPaused = false;
    this.isFileChanging = false;
    this.playBackFile = params.trajectoryPlaybackFile || "";
    this.zoomIn = this.zoomIn.bind(this);
    this.zoomOut = this.zoomOut.bind(this);
    this.resetCamera = this.resetCamera.bind(this);
    this.centerCamera = this.centerCamera.bind(this);
    this.reOrientCamera = this.reOrientCamera.bind(this);
    this.setPanningMode = this.setPanningMode.bind(this);
    this.setFocusMode = this.setFocusMode.bind(this);
  }

  _createClass(SimulariumController, [{
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

        this.simulator.setTrajectoryDataHandler(this.visData.parseAgentsFromLocalFileData.bind(this.visData));
      } else if (netConnectionConfig) {
        this.simulator = new RemoteSimulator(netConnectionConfig, this.onError);
        this.simulator.setTrajectoryDataHandler(this.visData.parseAgentsFromNetData.bind(this.visData));
      } else {
        // caught in try/catch block, not sent to front end
        throw new Error("Insufficient data to determine and configure simulator connection");
      }

      this.simulator.setTrajectoryFileInfoHandler(function (trajFileInfo) {
        _this2.handleTrajectoryInfo(trajFileInfo);
      });
    }
  }, {
    key: "configureNetwork",
    value: function configureNetwork(config) {
      if (this.simulator && this.simulator.socketIsValid()) {
        this.simulator.disconnect();
      }

      this.createSimulatorConnection(config);
    }
  }, {
    key: "isChangingFile",
    get: function get() {
      return this.isFileChanging;
    } // Not called by viewer, but could be called by
    // parent app

  }, {
    key: "connect",
    value: function connect() {
      var _this3 = this;

      if (!this.simulator) {
        return Promise.reject(new Error("No network connection established in simularium controller."));
      }

      return this.simulator.connectToRemoteServer(this.simulator.getIp()).then(function (msg) {
        _this3.postConnect();

        return msg;
      });
    }
  }, {
    key: "start",
    value: function start() {
      if (!this.simulator) {
        return Promise.reject();
      } // switch back to 'networked' playback


      this.networkEnabled = true;
      this.isPaused = false;
      this.visData.clearCache();
      return this.simulator.startRemoteTrajectoryPlayback(this.playBackFile);
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
        this.simulator.abortRemoteSim();
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
    key: "pause",
    value: function pause() {
      if (this.networkEnabled && this.simulator) {
        this.simulator.pauseRemoteSim();
      }

      this.isPaused = true;
    }
  }, {
    key: "paused",
    value: function paused() {
      return this.isPaused;
    }
  }, {
    key: "initializeTrajectoryFile",
    value: function initializeTrajectoryFile() {
      if (this.simulator) {
        this.simulator.requestTrajectoryFileInfo(this.playBackFile);
      }
    }
  }, {
    key: "gotoTime",
    value: function gotoTime(time) {
      // If in the middle of changing files, ignore any gotoTime requests
      if (this.isFileChanging === true) return;

      if (this.visData.hasLocalCacheForTime(time)) {
        this.visData.gotoTime(time);
      } else {
        if (this.networkEnabled && this.simulator) {
          // else reset the local cache,
          //  and play remotely from the desired simulation time
          this.visData.clearCache(); // Instead of requesting from the backend the `time` passed into this
          // function, we request (time - firstFrameTime) because the backend
          // currently assumes the first frame of every trajectory is at time 0.
          //
          // TODO: Long term, we should decide on a better way to deal with this
          // assumption: remove assumption from backend, perform this normalization
          // in simulariumio, or something else? One way might be to require making
          // firstFrameTime a part of TrajectoryFileInfo.

          var firstFrameTime = this.visData.firstFrameTime;

          if (firstFrameTime === null) {
            console.error("VisData does not contain firstFrameTime, defaulting to 0");
            firstFrameTime = 0;
          }

          this.simulator.gotoRemoteSimulationTime(time - firstFrameTime);
        }
      }
    }
  }, {
    key: "playFromTime",
    value: function playFromTime(time) {
      this.gotoTime(time);
      this.isPaused = false;
    }
  }, {
    key: "resume",
    value: function resume() {
      if (this.networkEnabled && this.simulator) {
        this.simulator.resumeRemoteSim();
      }

      this.isPaused = false;
    }
  }, {
    key: "clearFile",
    value: function clearFile() {
      this.isFileChanging = false;
      this.playBackFile = "";
      this.visData.clearForNewTrajectory();
      this.disableNetworkCommands();
      this.pause();

      if (this.visGeometry) {
        this.visGeometry.clearForNewTrajectory();
        this.visGeometry.resetCamera();
      }
    }
  }, {
    key: "changeFile",
    value: function changeFile(connectionParams, // TODO: push newFileName into connectionParams
    newFileName) {
      var _this4 = this;

      this.isFileChanging = true;
      this.playBackFile = newFileName;

      if (this.simulator instanceof RemoteSimulator) {
        this.simulator.handleError = function () {
          return noop;
        };
      }

      this.visData.WaitForFrame(0);
      this.visData.clearForNewTrajectory();
      this.visData.cancelAllWorkers();
      this.stop(); // Do I still need this? test...
      // if (this.simulator) {
      //     this.simulator.disconnect();
      // }

      try {
        if (connectionParams) {
          this.createSimulatorConnection(connectionParams.netConnectionSettings, connectionParams.clientSimulator, connectionParams.simulariumFile, connectionParams.geoAssets);
          this.networkEnabled = true; // This confuses me, because local files also go through this code path

          this.isPaused = true;
        } else {
          // caught in following block, not sent to front end
          throw new Error("incomplete simulator config provided");
        }
      } catch (e) {
        var _error = e;
        this.simulator = undefined;
        console.warn(_error.message);
        this.networkEnabled = false;
        this.isPaused = false;
      } // start the simulation paused and get first frame


      if (this.simulator) {
        return this.start().then(function () {
          if (_this4.simulator) {
            _this4.simulator.requestSingleFrame(0);
          }
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
    key: "disableNetworkCommands",
    value: function disableNetworkCommands() {
      this.networkEnabled = false;

      if (this.simulator && this.simulator.socketIsValid()) {
        this.simulator.disconnect();
      }
    }
  }, {
    key: "cacheJSON",
    value: function cacheJSON(json) {
      this.visData.cacheJSON(json);
    }
  }, {
    key: "clearLocalCache",
    value: function clearLocalCache() {
      this.visData.clearCache();
    }
  }, {
    key: "dragAndDropFileInfo",
    get: function get() {
      return this.visData.dragAndDropFileInfo;
    },
    set: function set(fileInfo) {
      this.visData.dragAndDropFileInfo = fileInfo;
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
      if (this.visGeometry) {
        this.visGeometry.zoomIn();
      }
    }
  }, {
    key: "zoomOut",
    value: function zoomOut() {
      if (this.visGeometry) {
        this.visGeometry.zoomOut();
      }
    }
  }, {
    key: "resetCamera",
    value: function resetCamera() {
      if (this.visGeometry) {
        this.visGeometry.resetCamera();
      }
    }
  }, {
    key: "centerCamera",
    value: function centerCamera() {
      if (this.visGeometry) {
        this.visGeometry.centerCamera();
      }
    }
  }, {
    key: "reOrientCamera",
    value: function reOrientCamera() {
      if (this.visGeometry) {
        this.visGeometry.reOrientCamera();
      }
    }
  }, {
    key: "setPanningMode",
    value: function setPanningMode(pan) {
      if (this.visGeometry) {
        this.visGeometry.setPanningMode(pan);
      }
    }
  }, {
    key: "setFocusMode",
    value: function setFocusMode(focus) {
      if (this.visGeometry) {
        this.visGeometry.setFocusMode(focus);
      }
    }
  }]);

  return SimulariumController;
}();

export { SimulariumController as default };
export { SimulariumController };