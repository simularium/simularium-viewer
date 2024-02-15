import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import { DEFAULT_FRAME_RATE } from "../constants";

/**
 * Records frames to an MP4 file using the WebCodecs API.
 * Resulting file is passed to the front end implementation
 * for download/use, via the handleFile() callback.
 *
 *
 * Note that the VideoCodecs API is unavailable in some browsers, including Firefox,
 * as of 2/6/2024. Viewport will not call these methods on firefox.
 *
 */
export var FrameRecorder = /*#__PURE__*/function () {
  function FrameRecorder(getCanvas, handleFile) {
    _classCallCheck(this, FrameRecorder);
    _defineProperty(this, "getCanvas", void 0);
    _defineProperty(this, "handleFile", void 0);
    _defineProperty(this, "encoder", void 0);
    _defineProperty(this, "muxer", void 0);
    _defineProperty(this, "isRecording", void 0);
    _defineProperty(this, "frameIndex", void 0);
    _defineProperty(this, "supportedBrowser", void 0);
    _defineProperty(this, "frameRate", void 0);
    this.getCanvas = getCanvas;
    this.handleFile = handleFile;
    this.encoder = null;
    this.isRecording = false;
    this.frameIndex = 0;
    this.supportedBrowser = "VideoEncoder" in window;
    this.frameRate = DEFAULT_FRAME_RATE;
  }
  _createClass(FrameRecorder, [{
    key: "setup",
    value: function () {
      var _setup = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee() {
        var _this = this;
        var canvas, config, _yield$VideoEncoder$i, supported, supportedConfig;
        return _regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              canvas = this.getCanvas();
              if (!canvas) {
                _context.next = 22;
                break;
              }
              _context.prev = 2;
              // VideoEncoder sends chunks of frame data to the muxer.
              // Previously made one encoder in the constructor but
              // making a new one during setup() prevents a bug where
              // frames returned blank (stale canvas reference?)
              this.encoder = new VideoEncoder({
                output: function output(chunk, meta) {
                  if (_this.isRecording && _this.muxer) {
                    var _this$muxer;
                    (_this$muxer = _this.muxer) === null || _this$muxer === void 0 || _this$muxer.addVideoChunk(chunk, meta);
                  }
                },
                error: function error(_error) {
                  throw new Error("Encoder error: " + _error);
                }
              });
              config = {
                codec: "avc1.420028",
                width: canvas.width,
                height: canvas.height
              };
              _context.next = 7;
              return VideoEncoder.isConfigSupported(config);
            case 7:
              _yield$VideoEncoder$i = _context.sent;
              supported = _yield$VideoEncoder$i.supported;
              supportedConfig = _yield$VideoEncoder$i.config;
              if (!(supported && supportedConfig)) {
                _context.next = 14;
                break;
              }
              this.encoder.configure(config);
              _context.next = 15;
              break;
            case 14:
              throw new Error("Unsupported video encoder configuration");
            case 15:
              // Muxer will handle the conversion from raw video data to mp4
              this.muxer = new Muxer({
                target: new ArrayBufferTarget(),
                video: {
                  codec: "avc",
                  width: canvas.width,
                  height: canvas.height
                }
              });
              this.frameIndex = 0;
              _context.next = 22;
              break;
            case 19:
              _context.prev = 19;
              _context.t0 = _context["catch"](2);
              throw new Error("Error setting up video encoder: " + _context.t0);
            case 22:
            case "end":
              return _context.stop();
          }
        }, _callee, this, [[2, 19]]);
      }));
      function setup() {
        return _setup.apply(this, arguments);
      }
      return setup;
    }()
  }, {
    key: "start",
    value: function () {
      var _start = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2() {
        return _regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              _context2.prev = 0;
              _context2.next = 3;
              return this.setup();
            case 3:
              this.isRecording = true;
              _context2.next = 10;
              break;
            case 6:
              _context2.prev = 6;
              _context2.t0 = _context2["catch"](0);
              console.log("setup failed", _context2.t0);
              return _context2.abrupt("return");
            case 10:
            case "end":
              return _context2.stop();
          }
        }, _callee2, this, [[0, 6]]);
      }));
      function start() {
        return _start.apply(this, arguments);
      }
      return start;
    }()
  }, {
    key: "stop",
    value: function () {
      var _stop = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3() {
        return _regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) switch (_context3.prev = _context3.next) {
            case 0:
              this.isRecording = false;
              _context3.next = 3;
              return this.onCompletedRecording();
            case 3:
            case "end":
              return _context3.stop();
          }
        }, _callee3, this);
      }));
      function stop() {
        return _stop.apply(this, arguments);
      }
      return stop;
    }()
  }, {
    key: "onFrame",
    value: function onFrame() {
      if (!this.isRecording) {
        return;
      }
      if (this.encoder) {
        if (this.encoder.encodeQueueSize > 2) {
          console.log("Dropping frame, too many frames in flight");
          return;
        }
        var canvas = this.getCanvas();
        if (canvas) {
          // Add a keyframe every second: https://en.wikipedia.org/wiki/Key_frame
          var keyFrame = this.frameIndex % this.frameRate === 0;
          var timestampMicroseconds = this.frameIndex / this.frameRate * 1000000;
          var durationMicroseconds = 1000000 / this.frameRate;
          var newFrame = new VideoFrame(canvas, {
            timestamp: timestampMicroseconds,
            duration: durationMicroseconds
          });
          this.encoder.encode(newFrame, {
            keyFrame: keyFrame
          });
          newFrame.close();
        }
        this.frameIndex += 1;
      }
    }
  }, {
    key: "onCompletedRecording",
    value: function () {
      var _onCompletedRecording = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee4() {
        var buffer, videoBlob;
        return _regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) switch (_context4.prev = _context4.next) {
            case 0:
              if (this.encoder) {
                _context4.next = 2;
                break;
              }
              throw new Error("No encoder found to convert video");
            case 2:
              _context4.next = 4;
              return this.encoder.flush();
            case 4:
              if (this.muxer) {
                _context4.next = 6;
                break;
              }
              throw new Error("No muxer found to convert video.");
            case 6:
              this.muxer.finalize();
              buffer = this.muxer.target.buffer; // Create a blob from the muxer output and pass it to the front end.
              videoBlob = new Blob([buffer], {
                type: "video/mp4"
              });
              this.handleFile(videoBlob);
            case 10:
            case "end":
              return _context4.stop();
          }
        }, _callee4, this);
      }));
      function onCompletedRecording() {
        return _onCompletedRecording.apply(this, arguments);
      }
      return onCompletedRecording;
    }()
  }]);
  return FrameRecorder;
}();
export default FrameRecorder;