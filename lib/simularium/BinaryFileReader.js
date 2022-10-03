"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _util = require("../util");

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var BlockTypeEnum;

(function (BlockTypeEnum) {
  BlockTypeEnum[BlockTypeEnum["SPATIAL_DATA_JSON"] = 0] = "SPATIAL_DATA_JSON";
  BlockTypeEnum[BlockTypeEnum["TRAJECTORY_INFO_JSON"] = 1] = "TRAJECTORY_INFO_JSON";
  BlockTypeEnum[BlockTypeEnum["PLOT_DATA_JSON"] = 2] = "PLOT_DATA_JSON";
  BlockTypeEnum[BlockTypeEnum["SPATIAL_DATA_BINARY"] = 3] = "SPATIAL_DATA_BINARY";
})(BlockTypeEnum || (BlockTypeEnum = {}));

var SIGNATURE = "SIMULARIUMBINARY"; // each block has a type and a size

var BLOCK_HEADER_SIZE = 8;

var BinaryFileReader = /*#__PURE__*/function () {
  // ideally this is really a Float32Array but alignment is not guaranteed yet
  function BinaryFileReader(fileContents) {
    (0, _classCallCheck2["default"])(this, BinaryFileReader);
    (0, _defineProperty2["default"])(this, "fileContents", void 0);
    (0, _defineProperty2["default"])(this, "dataView", void 0);
    (0, _defineProperty2["default"])(this, "header", void 0);
    (0, _defineProperty2["default"])(this, "tfi", void 0);
    (0, _defineProperty2["default"])(this, "plotData", void 0);
    (0, _defineProperty2["default"])(this, "nFrames", void 0);
    (0, _defineProperty2["default"])(this, "frameOffsets", void 0);
    (0, _defineProperty2["default"])(this, "frameLengths", void 0);
    (0, _defineProperty2["default"])(this, "spatialDataBlock", void 0);
    this.nFrames = 0;
    this.frameOffsets = [];
    this.frameLengths = [];
    this.fileContents = fileContents;
    this.dataView = new DataView(fileContents);
    this.header = this.readHeader();
    this.tfi = this.readTrajectoryFileInfo();
    this.plotData = this.readPlotData();
    this.spatialDataBlock = this.readSpatialDataInfo();
  }

  (0, _createClass2["default"])(BinaryFileReader, [{
    key: "readSpatialDataInfo",
    value: function readSpatialDataInfo() {
      // find spatial data block and load frame offsets
      var _iterator = _createForOfIteratorHelper(this.header.blocks),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var block = _step.value;

          if (block.type === BlockTypeEnum.SPATIAL_DATA_BINARY) {
            var blockData = this.getBlockContent(block);
            var byteOffset = 0; // Spatial data version (4-byte int)
            // const version = blockData.getUint32(byteOffset, true);

            byteOffset += 4; // Number of frames (4-byte int)

            this.nFrames = blockData.getUint32(byteOffset, true);
            byteOffset += 4; // Frame offsets,sizes (Number of frames * two 4-byte ints)

            for (var i = 0; i < this.nFrames; i++) {
              this.frameOffsets.push(blockData.getUint32(byteOffset, true));
              byteOffset += 4;
              this.frameLengths.push(blockData.getUint32(byteOffset, true));
              byteOffset += 4;
            }

            return this.getBlock(block);
          }
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }

      throw new Error("No spatial data block found");
    }
  }, {
    key: "readHeader",
    value: function readHeader() {
      // could use DataView here but I know every header field is int32
      // note I set the offset to move past the signature string
      var asints = new Uint32Array(this.fileContents, SIGNATURE.length);
      var headerLength = asints[0];
      var headerVersion = asints[1];
      var nBlocks = asints[2];

      if (nBlocks < 1) {
        throw new Error("No blocks found in file");
      }

      var blocks = []; // the number of 32-bit ints after the SIGNATURE and before the toc

      var OFFSET_TO_TABLE_OF_CONTENTS = 3;

      for (var i = 0; i < nBlocks; i++) {
        blocks.push({
          offset: asints[OFFSET_TO_TABLE_OF_CONTENTS + i * 3 + 0],
          type: asints[OFFSET_TO_TABLE_OF_CONTENTS + i * 3 + 1],
          size: asints[OFFSET_TO_TABLE_OF_CONTENTS + i * 3 + 2]
        });
      }

      if (blocks[0].offset !== headerLength) {
        throw new Error("First block offset does not match header length");
      }

      return {
        version: headerVersion,
        blocks: blocks
      };
    }
  }, {
    key: "readTrajectoryFileInfo",
    value: function readTrajectoryFileInfo() {
      // find the first block that is a trajectory info block
      var _iterator2 = _createForOfIteratorHelper(this.header.blocks),
          _step2;

      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var block = _step2.value;

          if (block.type === BlockTypeEnum.TRAJECTORY_INFO_JSON) {
            var json = this.parseJsonBlock(block);
            return json;
          }
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }

      throw new Error("No trajectory info block found");
    }
  }, {
    key: "readPlotData",
    value: function readPlotData() {
      // find the first block that is a trajectory info block
      var _iterator3 = _createForOfIteratorHelper(this.header.blocks),
          _step3;

      try {
        for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
          var block = _step3.value;

          if (block.type === BlockTypeEnum.PLOT_DATA_JSON) {
            var json = this.parseJsonBlock(block);
            return json;
          }
        }
      } catch (err) {
        _iterator3.e(err);
      } finally {
        _iterator3.f();
      }

      return [];
    }
  }, {
    key: "getBlock",
    value: function getBlock(block) {
      // first validate the block with what we expect.
      // TAKE NOTE OF ENDIANNESS.
      // Data transferred via HTTP is generally big endian.
      // Local file should have been written as little endian.
      // All use of DataViews requires explicit endianness but default to big endian.
      // TypedArrays use the underlying system endianness (usually little).
      var blockType = this.dataView.getUint32(block.offset, true);
      var blockSize = this.dataView.getUint32(block.offset + 4, true);

      if (blockType !== block.type) {
        throw new Error("Block type mismatch.  Header says " + block.type + " but block says " + blockType);
      }

      if (blockSize !== block.size) {
        throw new Error("Block size mismatch.  Header says " + block.size + " but block says " + blockSize);
      } // note: NOT a copy.
      // never produce copies internally. let callers make a copy if they need it.
      // also note: return the contents of the block INCLUDING the block header


      return new DataView(this.fileContents, block.offset, block.size);
    }
  }, {
    key: "getBlockContent",
    value: function getBlockContent(block) {
      // return the block portion after the block header
      // first validate the block with what we expect.
      // TAKE NOTE OF ENDIANNESS.
      // Data transferred via HTTP is generally big endian.
      // Local file should have been written as little endian.
      // All use of DataViews requires explicit endianness but default to big endian.
      // TypedArrays use the underlying system endianness (usually little).
      var blockType = this.dataView.getUint32(block.offset, true);
      var blockSize = this.dataView.getUint32(block.offset + 4, true);

      if (blockType !== block.type) {
        throw new Error("Block type mismatch.  Header says " + block.type + " but block says " + blockType);
      }

      if (blockSize !== block.size) {
        throw new Error("Block size mismatch.  Header says " + block.size + " but block says " + blockSize);
      } // note: NOT a copy.
      // never produce copies internally. let callers make a copy if they need it.
      // also note: return the contents of the block NOT including the block header


      return new DataView(this.fileContents, block.offset + BLOCK_HEADER_SIZE, block.size - BLOCK_HEADER_SIZE);
    }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */

  }, {
    key: "parseJsonBlock",
    value: function parseJsonBlock(block) {
      var blockData = this.getBlockContent(block);
      var enc = new TextDecoder("utf-8");
      var text = enc.decode(blockData); // trim any trailing null bytes

      var trimmed = text.replace(/\0+$/, "");
      var json = JSON.parse(trimmed);
      return json;
    }
  }, {
    key: "getTrajectoryFileInfo",
    value: function getTrajectoryFileInfo() {
      return this.tfi;
    }
  }, {
    key: "getNumFrames",
    value: function getNumFrames() {
      return this.nFrames;
    }
  }, {
    key: "getFrameIndexAtTime",
    value: function getFrameIndexAtTime(time) {
      var timeStepSize = this.tfi.timeStepSize; // Find the index of the frame that has the time matching our target time:
      // walk offsets and parse frame times.
      // assumes frames are in ascending order by time!

      for (var i = 0; i < this.nFrames; i++) {
        // get time of frame.
        // const frameNumber = this.spatialDataBlock[frameFloatOffset + 0];
        var frameTime = this.spatialDataBlock.getFloat32(this.frameOffsets[i] + 4, true); // check time

        if ((0, _util.compareTimes)(frameTime, time, timeStepSize) === 0) {
          // TODO possible sanity check frameNumber === i ?
          return i;
        }
      }

      return -1;
    }
  }, {
    key: "getFrame",
    value: function getFrame(theFrameNumber) {
      var frameOffset = this.frameOffsets[theFrameNumber];
      var frameSize = this.frameLengths[theFrameNumber];
      var totalOffset = this.spatialDataBlock.byteOffset + frameOffset; // TODO possibly this can return a TypedArray or DataView without making a copy
      // but requires a guarantee on 4-byte alignment. Leaving it as a future optimization.

      var frameContents = this.fileContents.slice(totalOffset, totalOffset + frameSize);
      return frameContents;
    }
  }, {
    key: "getPlotData",
    value: function getPlotData() {
      return this.plotData;
    }
  }], [{
    key: "isBinarySimulariumFile",
    value: function isBinarySimulariumFile(fileContents) {
      var first16blob = fileContents.slice(0, 16);
      return first16blob.text().then(function (text) {
        return text === SIGNATURE;
      });
    }
  }]);
  return BinaryFileReader;
}();

exports["default"] = BinaryFileReader;