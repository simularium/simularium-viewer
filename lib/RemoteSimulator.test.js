"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _RemoteSimulator = require("../simularium/RemoteSimulator");

var _FrontEndError = require("../simularium/FrontEndError");

var _ = require("..");

describe("RemoteSimulator", function () {
  // Silence console.debug messages like this in Jest output:
  // "[netconnection] WS Connection Request Sent:  wss://..."
  jest.spyOn(global.console, "debug").mockImplementation(function () {
    return jest.fn();
  });
  var CONNECTION_SETTINGS = {
    serverIp: "dummy.uri.com",
    serverPort: 1234
  };
  describe("createWebSocket", function () {
    test("creates a WebSocket object", function () {
      var simulator = new _.RemoteSimulator(CONNECTION_SETTINGS);
      expect(simulator.socketIsValid()).toBe(false);
      simulator.createWebSocket(simulator.getIp());
      expect(simulator.socketIsValid()).toBe(true);
    });
  });
  describe("checkConnection", function () {
    var timeout = 1000;
    test("returns true if connection succeeds within allotted time with no retries", /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee() {
      var simulator, isConnected;
      return _regenerator["default"].wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              simulator = new _.RemoteSimulator(CONNECTION_SETTINGS);
              jest.spyOn(simulator, "waitForWebSocket").mockResolvedValue(true);
              _context.next = 4;
              return simulator.checkConnection(simulator.getIp(), timeout);

            case 4:
              isConnected = _context.sent;
              expect(isConnected).toBe(true);
              expect(simulator.connectionTimeWaited).toBe(timeout);
              expect(simulator.connectionRetries).toBe(0);

            case 8:
            case "end":
              return _context.stop();
          }
        }
      }, _callee);
    })));
    test("returns false if connection does not succeed within allotted time and number of retries", /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2() {
      var simulator, isConnected;
      return _regenerator["default"].wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              simulator = new _.RemoteSimulator(CONNECTION_SETTINGS);
              jest.spyOn(simulator, "waitForWebSocket").mockResolvedValue(false);
              _context2.next = 4;
              return simulator.checkConnection(simulator.getIp(), timeout);

            case 4:
              isConnected = _context2.sent;
              expect(isConnected).toBe(false); // Expect 4 timeouts on initial connection + 1 timeout on retry connection

              expect(simulator.connectionTimeWaited).toBe(timeout * 5);
              expect(simulator.connectionRetries).toBe(1);

            case 8:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2);
    })));
    test("returns true if connection succeeds on the retry", /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3() {
      var simulator, waitForWebSocket, isConnected;
      return _regenerator["default"].wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              simulator = new _.RemoteSimulator(CONNECTION_SETTINGS);
              waitForWebSocket = jest.spyOn(simulator, "waitForWebSocket");
              waitForWebSocket.mockResolvedValueOnce(false);
              waitForWebSocket.mockResolvedValueOnce(false);
              waitForWebSocket.mockResolvedValueOnce(false);
              waitForWebSocket.mockResolvedValueOnce(false);
              waitForWebSocket.mockResolvedValueOnce(true);
              _context3.next = 9;
              return simulator.checkConnection(simulator.getIp(), timeout);

            case 9:
              isConnected = _context3.sent;
              expect(isConnected).toBe(true); // Expect 4 timeouts on initial connection + 1 timeout on retry connection

              expect(simulator.connectionTimeWaited).toBe(timeout * 5);
              expect(simulator.connectionRetries).toBe(1);

            case 13:
            case "end":
              return _context3.stop();
          }
        }
      }, _callee3);
    })));
  });
  describe("connectToRemoteServer", function () {
    test("emits a 'connection success' message if connection succeeds", /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4() {
      var simulator, message;
      return _regenerator["default"].wrap(function _callee4$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
            case 0:
              simulator = new _.RemoteSimulator(CONNECTION_SETTINGS);
              jest.spyOn(simulator, "checkConnection").mockResolvedValue(true);
              _context4.next = 4;
              return simulator.connectToRemoteServer(simulator.getIp());

            case 4:
              message = _context4.sent;
              expect(message).toEqual(_RemoteSimulator.CONNECTION_SUCCESS_MSG);

            case 6:
            case "end":
              return _context4.stop();
          }
        }
      }, _callee4);
    })));
    test("emits error if connecting to server is unsuccessful", /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee5() {
      var simulator;
      return _regenerator["default"].wrap(function _callee5$(_context5) {
        while (1) {
          switch (_context5.prev = _context5.next) {
            case 0:
              simulator = new _.RemoteSimulator(CONNECTION_SETTINGS);
              jest.spyOn(simulator, "checkConnection").mockResolvedValue(false);
              _context5.prev = 2;
              _context5.next = 5;
              return simulator.connectToRemoteServer(simulator.getIp());

            case 5:
              _context5.next = 10;
              break;

            case 7:
              _context5.prev = 7;
              _context5.t0 = _context5["catch"](2);
              expect(_context5.t0).toEqual(new Error(_RemoteSimulator.CONNECTION_FAIL_MSG));

            case 10:
            case "end":
              return _context5.stop();
          }
        }
      }, _callee5, null, [[2, 7]]);
    })));
  });
  describe("startRemoteTrajectoryPlayback", function () {
    test("does not throw error if connectToRemoteServer succeeds", /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee7() {
      var simulator;
      return _regenerator["default"].wrap(function _callee7$(_context7) {
        while (1) {
          switch (_context7.prev = _context7.next) {
            case 0:
              simulator = new _.RemoteSimulator(CONNECTION_SETTINGS);
              jest.spyOn(simulator, "connectToRemoteServer").mockResolvedValue(_RemoteSimulator.CONNECTION_SUCCESS_MSG);
              expect( /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee6() {
                return _regenerator["default"].wrap(function _callee6$(_context6) {
                  while (1) {
                    switch (_context6.prev = _context6.next) {
                      case 0:
                        _context6.next = 2;
                        return simulator.startRemoteTrajectoryPlayback("endocytosis.simularium");

                      case 2:
                        return _context6.abrupt("return", _context6.sent);

                      case 3:
                      case "end":
                        return _context6.stop();
                    }
                  }
                }, _callee6);
              }))).not.toThrow();

            case 3:
            case "end":
              return _context7.stop();
          }
        }
      }, _callee7);
    })));
    test("throws error emitted by connectToRemoteServer as a FrontEndError if connection fails", /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee8() {
      var simulator;
      return _regenerator["default"].wrap(function _callee8$(_context8) {
        while (1) {
          switch (_context8.prev = _context8.next) {
            case 0:
              simulator = new _.RemoteSimulator(CONNECTION_SETTINGS);
              jest.spyOn(simulator, "connectToRemoteServer").mockRejectedValue(new Error("Mock error message"));
              _context8.prev = 2;
              _context8.next = 5;
              return simulator.startRemoteTrajectoryPlayback("endocytosis.simularium");

            case 5:
              _context8.next = 10;
              break;

            case 7:
              _context8.prev = 7;
              _context8.t0 = _context8["catch"](2);
              expect(_context8.t0).toEqual(new _FrontEndError.FrontEndError("Mock error message"));

            case 10:
            case "end":
              return _context8.stop();
          }
        }
      }, _callee8, null, [[2, 7]]);
    })));
  });
});