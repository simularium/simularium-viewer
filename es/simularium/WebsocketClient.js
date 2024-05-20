import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import jsLogger from "js-logger";
import { FrontEndError, ErrorLevel } from "./FrontEndError";

// TODO: proposed new NetMessage data type:
// This factors the raw data structure away from the networking and transmission info.
// This allows the data structure to make a bit more sense with respect to typescript typing,
// and also for raw file drag n drop it doesn't need connection info or msgtype.
// interface NetMessage {
//     connId: string; // unique connection to server
//     msgType: number; // identifies the data structure of the message
//     fileName: string; // identifies the trajectory this connection is dealing with
//     payload: Object; // the JS object with the message data itself
// }

// these have been set to correspond to backend values
export var NetMessageEnum = /*#__PURE__*/function (NetMessageEnum) {
  NetMessageEnum[NetMessageEnum["ID_UNDEFINED_WEB_REQUEST"] = 0] = "ID_UNDEFINED_WEB_REQUEST";
  NetMessageEnum[NetMessageEnum["ID_VIS_DATA_ARRIVE"] = 1] = "ID_VIS_DATA_ARRIVE";
  NetMessageEnum[NetMessageEnum["ID_VIS_DATA_REQUEST"] = 2] = "ID_VIS_DATA_REQUEST";
  NetMessageEnum[NetMessageEnum["ID_VIS_DATA_FINISH"] = 3] = "ID_VIS_DATA_FINISH";
  NetMessageEnum[NetMessageEnum["ID_VIS_DATA_PAUSE"] = 4] = "ID_VIS_DATA_PAUSE";
  NetMessageEnum[NetMessageEnum["ID_VIS_DATA_RESUME"] = 5] = "ID_VIS_DATA_RESUME";
  NetMessageEnum[NetMessageEnum["ID_VIS_DATA_ABORT"] = 6] = "ID_VIS_DATA_ABORT";
  NetMessageEnum[NetMessageEnum["ID_UPDATE_TIME_STEP"] = 7] = "ID_UPDATE_TIME_STEP";
  NetMessageEnum[NetMessageEnum["ID_UPDATE_RATE_PARAM"] = 8] = "ID_UPDATE_RATE_PARAM";
  NetMessageEnum[NetMessageEnum["ID_MODEL_DEFINITION"] = 9] = "ID_MODEL_DEFINITION";
  NetMessageEnum[NetMessageEnum["ID_HEARTBEAT_PING"] = 10] = "ID_HEARTBEAT_PING";
  NetMessageEnum[NetMessageEnum["ID_HEARTBEAT_PONG"] = 11] = "ID_HEARTBEAT_PONG";
  NetMessageEnum[NetMessageEnum["ID_TRAJECTORY_FILE_INFO"] = 12] = "ID_TRAJECTORY_FILE_INFO";
  NetMessageEnum[NetMessageEnum["ID_GOTO_SIMULATION_TIME"] = 13] = "ID_GOTO_SIMULATION_TIME";
  NetMessageEnum[NetMessageEnum["ID_INIT_TRAJECTORY_FILE"] = 14] = "ID_INIT_TRAJECTORY_FILE";
  NetMessageEnum[NetMessageEnum["ID_UPDATE_SIMULATION_STATE"] = 15] = "ID_UPDATE_SIMULATION_STATE";
  NetMessageEnum[NetMessageEnum["ID_CONVERT_TRAJECTORY_FILE"] = 16] = "ID_CONVERT_TRAJECTORY_FILE";
  NetMessageEnum[NetMessageEnum["ID_AVAILABLE_METRICS_REQUEST"] = 17] = "ID_AVAILABLE_METRICS_REQUEST";
  NetMessageEnum[NetMessageEnum["ID_AVAILABLE_METRICS_RESPONSE"] = 18] = "ID_AVAILABLE_METRICS_RESPONSE";
  NetMessageEnum[NetMessageEnum["ID_PLOT_DATA_REQUEST"] = 19] = "ID_PLOT_DATA_REQUEST";
  NetMessageEnum[NetMessageEnum["ID_PLOT_DATA_RESPONSE"] = 20] = "ID_PLOT_DATA_RESPONSE";
  NetMessageEnum[NetMessageEnum["ID_ERROR_MSG"] = 21] = "ID_ERROR_MSG";
  NetMessageEnum[NetMessageEnum["ID_CHECK_HEALTH_REQUEST"] = 22] = "ID_CHECK_HEALTH_REQUEST";
  NetMessageEnum[NetMessageEnum["ID_SERVER_HEALTHY_RESPONSE"] = 23] = "ID_SERVER_HEALTHY_RESPONSE";
  NetMessageEnum[NetMessageEnum["ID_CANCEL_CONVERSION"] = 24] = "ID_CANCEL_CONVERSION";
  NetMessageEnum[NetMessageEnum["LENGTH"] = 25] = "LENGTH";
  return NetMessageEnum;
}({});
export var ServerErrorCodes = /*#__PURE__*/function (ServerErrorCodes) {
  ServerErrorCodes[ServerErrorCodes["FILE_NOT_FOUND"] = 0] = "FILE_NOT_FOUND";
  ServerErrorCodes[ServerErrorCodes["MALFORMED_MESSAGE"] = 1] = "MALFORMED_MESSAGE";
  ServerErrorCodes[ServerErrorCodes["MALFORMED_FILE"] = 2] = "MALFORMED_FILE";
  ServerErrorCodes[ServerErrorCodes["AUTOCONVERSION_ERROR"] = 3] = "AUTOCONVERSION_ERROR";
  ServerErrorCodes[ServerErrorCodes["METRICS_CALC_ERROR"] = 4] = "METRICS_CALC_ERROR";
  ServerErrorCodes[ServerErrorCodes["FRAME_NOT_FOUND"] = 5] = "FRAME_NOT_FOUND";
  ServerErrorCodes[ServerErrorCodes["FILENAME_MISMATCH"] = 6] = "FILENAME_MISMATCH";
  ServerErrorCodes[ServerErrorCodes["NO_RUNNING_SIMULATION"] = 7] = "NO_RUNNING_SIMULATION";
  ServerErrorCodes[ServerErrorCodes["LENGTH"] = 8] = "LENGTH";
  return ServerErrorCodes;
}({});
export var CONNECTION_SUCCESS_MSG = "Remote sim successfully started";
export var CONNECTION_FAIL_MSG = "Failed to connect to server; try reloading. If the problem persists, there may be a problem with your connection speed or the server might be too busy.";
export var WebsocketClient = /*#__PURE__*/function () {
  function WebsocketClient(opts, errorHandler) {
    _classCallCheck(this, WebsocketClient);
    _defineProperty(this, "webSocket", void 0);
    _defineProperty(this, "serverIp", void 0);
    _defineProperty(this, "serverPort", void 0);
    _defineProperty(this, "secureConnection", void 0);
    _defineProperty(this, "connectionTimeWaited", void 0);
    _defineProperty(this, "connectionRetries", void 0);
    _defineProperty(this, "jsonMessageHandlers", void 0);
    _defineProperty(this, "binaryMessageHandlers", void 0);
    _defineProperty(this, "logger", void 0);
    _defineProperty(this, "handleError", void 0);
    this.webSocket = null;
    this.jsonMessageHandlers = new Map();
    this.binaryMessageHandlers = new Map();
    this.serverIp = opts && opts.serverIp ? opts.serverIp : "localhost";
    this.serverPort = opts && opts.serverPort ? opts.serverPort : 9002;
    this.secureConnection = opts && opts.secureConnection !== undefined ? opts.secureConnection : true;
    this.connectionTimeWaited = 0;
    this.connectionRetries = 0;
    this.handleError = errorHandler || function () {
      /* do nothing */
    };
    this.logger = jsLogger.get("netconnection");
    this.logger.setLevel(jsLogger.DEBUG);

    // Frees the reserved backend in the event that the window closes w/o disconnecting
    window.addEventListener("beforeunload", this.onClose.bind(this));
  }

  /**
   * WebSocket State
   */
  _createClass(WebsocketClient, [{
    key: "socketIsConnecting",
    value: function socketIsConnecting() {
      return this.webSocket !== null && this.webSocket.readyState === this.webSocket.CONNECTING;
    }
  }, {
    key: "socketIsValid",
    value: function socketIsValid() {
      return !(this.webSocket === null || this.webSocket.readyState === this.webSocket.CLOSED);
    }
  }, {
    key: "socketIsConnected",
    value: function socketIsConnected() {
      return this.webSocket !== null && this.webSocket.readyState === this.webSocket.OPEN;
    }

    /**
     *   Websocket Message Handling
     * */
  }, {
    key: "addBinaryMessageHandler",
    value: function addBinaryMessageHandler(messageType, handler) {
      this.binaryMessageHandlers[messageType.valueOf()] = handler;
    }
  }, {
    key: "addJsonMessageHandler",
    value: function addJsonMessageHandler(messageType, handler) {
      this.jsonMessageHandlers[messageType] = handler;
    }
  }, {
    key: "onMessage",
    value: function onMessage(event) {
      // where we receive websocket messages
      if (!this.socketIsValid()) {
        return;
      }
      if (event.data instanceof ArrayBuffer) {
        // Handle binary message
        var floatView = new Float32Array(event.data);
        var binaryMsgType = floatView[0];
        if (binaryMsgType in this.binaryMessageHandlers) {
          this.binaryMessageHandlers[binaryMsgType](event);
        } else {
          this.logger.error("Unexpected binary message arrived of type ", binaryMsgType);
        }
        return;
      }

      // Handle json message
      var msg = JSON.parse(event.data);
      var jsonMsgType = msg.msgType;
      var numMsgTypes = NetMessageEnum.LENGTH;
      if (jsonMsgType > numMsgTypes || jsonMsgType < 1) {
        // this suggests either the back-end is out of sync, or a connection to an unknown back-end
        //  either would be very bad
        this.logger.error("Unrecognized web message of type ", msg.msgType, " arrived");
        return;
      }
      if (jsonMsgType in this.jsonMessageHandlers) {
        this.jsonMessageHandlers[jsonMsgType](msg);
      } else {
        this.logger.error("Unexpected json message arrived of type ", jsonMsgType);
      }
      this.logger.debug("Web request recieved", msg.msgType);
    }
  }, {
    key: "onOpen",
    value: function onOpen() {
      /* do nothing */
    }
  }, {
    key: "onClose",
    value: function onClose() {
      /* do nothing */
    }

    /**
     * WebSocket Connect
     * */
  }, {
    key: "createWebSocket",
    value: function createWebSocket(uri) {
      // Create and initialize a WebSocket object

      if (this.socketIsValid()) {
        this.disconnect();
      }
      this.webSocket = new WebSocket(uri);
      this.webSocket.binaryType = "arraybuffer";
      this.logger.debug("WS Connection Request Sent: ", uri);

      // message handler
      this.webSocket.onopen = this.onOpen.bind(this);
      this.webSocket.onclose = this.onClose.bind(this);
      this.webSocket.onmessage = this.onMessage.bind(this);
    }
  }, {
    key: "disconnect",
    value: function disconnect() {
      if (!this.socketIsValid()) {
        this.logger.warn("disconnect failed, client is not connected");
        return;
      }
      if (this.webSocket !== null) {
        this.webSocket.close();
      }
    }
  }, {
    key: "getIp",
    value: function getIp() {
      return "".concat(this.secureConnection ? "wss" : "ws", "://").concat(this.serverIp, ":").concat(this.serverPort, "/");
    }
  }, {
    key: "waitForWebSocket",
    value: function () {
      var _waitForWebSocket = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(timeout) {
        var _this = this;
        return _regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              return _context.abrupt("return", new Promise(function (resolve) {
                return setTimeout(function () {
                  resolve(_this.socketIsConnected());
                }, timeout);
              }));
            case 1:
            case "end":
              return _context.stop();
          }
        }, _callee);
      }));
      function waitForWebSocket(_x) {
        return _waitForWebSocket.apply(this, arguments);
      }
      return waitForWebSocket;
    }()
  }, {
    key: "checkConnection",
    value: function () {
      var _checkConnection = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(address) {
        var timeout,
          maxRetries,
          maxWaitTime,
          isConnected,
          _args2 = arguments;
        return _regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              timeout = _args2.length > 1 && _args2[1] !== undefined ? _args2[1] : 1000;
              maxRetries = _args2.length > 2 && _args2[2] !== undefined ? _args2[2] : 1;
              // Check if the WebSocket becomes connected within an allotted amount
              // of time and number of retries.
              // Initially wait for a max wait time of maxWaitTime, then retry
              // connecting <maxRetries> time(s). In a retry, only wait for the
              // amount of time specified as timeout.
              maxWaitTime = 4 * timeout;
              _context2.next = 5;
              return this.waitForWebSocket(timeout);
            case 5:
              isConnected = _context2.sent;
              this.connectionTimeWaited += timeout;
              if (!isConnected) {
                _context2.next = 11;
                break;
              }
              return _context2.abrupt("return", true);
            case 11:
              if (!(this.connectionTimeWaited < maxWaitTime)) {
                _context2.next = 15;
                break;
              }
              return _context2.abrupt("return", this.checkConnection(address, timeout));
            case 15:
              if (!(this.connectionRetries < maxRetries)) {
                _context2.next = 21;
                break;
              }
              this.createWebSocket(address);
              this.connectionRetries++;
              return _context2.abrupt("return", this.checkConnection(address, timeout));
            case 21:
              return _context2.abrupt("return", false);
            case 22:
            case "end":
              return _context2.stop();
          }
        }, _callee2, this);
      }));
      function checkConnection(_x2) {
        return _checkConnection.apply(this, arguments);
      }
      return checkConnection;
    }()
  }, {
    key: "connectToRemoteServer",
    value: function () {
      var _connectToRemoteServer = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3() {
        var address, isConnectionSuccessful;
        return _regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) switch (_context3.prev = _context3.next) {
            case 0:
              address = this.getIp();
              this.connectionTimeWaited = 0;
              this.connectionRetries = 0;
              if (!this.socketIsConnected()) {
                _context3.next = 5;
                break;
              }
              return _context3.abrupt("return", CONNECTION_SUCCESS_MSG);
            case 5:
              this.createWebSocket(address);
              _context3.next = 8;
              return this.checkConnection(address);
            case 8:
              isConnectionSuccessful = _context3.sent;
              if (!isConnectionSuccessful) {
                _context3.next = 13;
                break;
              }
              return _context3.abrupt("return", CONNECTION_SUCCESS_MSG);
            case 13:
              throw new Error(CONNECTION_FAIL_MSG);
            case 14:
            case "end":
              return _context3.stop();
          }
        }, _callee3, this);
      }));
      function connectToRemoteServer() {
        return _connectToRemoteServer.apply(this, arguments);
      }
      return connectToRemoteServer;
    }()
    /**
     * Websocket Send Helper Functions
     */
  }, {
    key: "logWebSocketRequest",
    value: function logWebSocketRequest(whatRequest, jsonData) {
      this.logger.debug("Web Socket Request Sent: ", whatRequest, jsonData);
    }
  }, {
    key: "sendWebSocketRequest",
    value: function sendWebSocketRequest(jsonData, requestDescription) {
      if (this.socketIsConnected()) {
        if (this.webSocket !== null) {
          this.webSocket.send(JSON.stringify(jsonData));
        }
        this.logWebSocketRequest(requestDescription, jsonData);
      } else {
        console.error("Request to server cannot be made with a closed Websocket connection.");
        this.handleError(new FrontEndError("Connection to server is closed; please try reloading. If the problem persists, the server may be too busy. Please try again at another time.", ErrorLevel.ERROR));
      }
    }
  }]);
  return WebsocketClient;
}();