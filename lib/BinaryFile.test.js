"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _BinaryFileReader = _interopRequireDefault(require("../simularium/BinaryFileReader"));

function pad(buf) {
  if (buf.byteLength % 4 !== 0) {
    var newbuf = new ArrayBuffer(buf.byteLength + (4 - buf.byteLength % 4));
    new Uint8Array(newbuf).set(new Uint8Array(buf)); // unnecessary, because ArrayBuffer is initialized to 0
    // new Uint8Array(newbuf, buf.byteLength).fill(0);

    return newbuf;
  } else return buf;
}

function makeBinary(blocks, blockTypes) {
  var numBlocks = blocks.length;
  var headerfixedLen = 16 + 4 + 4 + 4;
  var tocLen = 3 * numBlocks * 4;
  var headerLen = headerfixedLen + tocLen; // extra 4 for block size and 4 for type

  var blockDataLen = blocks.reduce(function (acc, block) {
    return acc + (block.byteLength + 4 + 4);
  }, 0);
  var blockOffsets = [headerLen];

  for (var i = 1; i < numBlocks; i++) {
    blockOffsets.push(blockOffsets[i - 1] + (blocks[i - 1].byteLength + 4 + 4));
  } // enough space for the whole thing


  var buffer = new ArrayBuffer(headerfixedLen + tocLen + blockDataLen);
  var view = new Uint8Array(buffer);
  var view32 = new Uint32Array(buffer);
  view.set("SIMULARIUMBINARY".split("").map(function (c) {
    return c.charCodeAt(0);
  }));
  var headerview32 = new Uint32Array(buffer, 16);
  headerview32[0] = headerfixedLen + tocLen;
  headerview32[1] = 1;
  headerview32[2] = numBlocks;

  for (var _i = 0; _i < numBlocks; _i++) {
    // blockoffset
    headerview32[3 + _i * 3 + 0] = blockOffsets[_i]; // blocktype

    headerview32[3 + _i * 3 + 1] = blockTypes[_i]; // blocksize

    headerview32[3 + _i * 3 + 2] = blocks[_i].byteLength + 4 + 4; // write block itself:

    view32[blockOffsets[_i] / 4] = blockTypes[_i];
    view32[blockOffsets[_i] / 4 + 1] = blocks[_i].byteLength + 4 + 4;
    view.set(new Uint8Array(blocks[_i]), blockOffsets[_i] + 4 + 4);
  }

  return buffer;
}

describe("binary simularium files", function () {
  test("it correctly identifies a binary simularium file signature", function () {
    var file = new Blob(["SIMULARIUMBINARY"]);
    return _BinaryFileReader["default"].isBinarySimulariumFile(file).then(function (isBinary) {
      expect(isBinary).toBe(true);
    });
  });
  test("it correctly identifies an invalid binary simularium file signature", function () {
    var file = new Blob(["SIMULARIUMBINAR"]);
    return _BinaryFileReader["default"].isBinarySimulariumFile(file).then(function (isBinary) {
      expect(isBinary).toBe(false);
    });
  }); // build a header with no blocks.

  test("it correctly fails to read a file with no blocks", function () {
    var buffer = makeBinary([], []);
    var file = new Blob([buffer]);
    return _BinaryFileReader["default"].isBinarySimulariumFile(file).then(function (isBinary) {
      expect(isBinary).toBe(true);
      file.arrayBuffer().then(function (buffer) {
        expect(function () {
          new _BinaryFileReader["default"](buffer);
        }).toThrow();
      });
    });
  });
  test("it throws when a spatial data block is missing", function () {
    var json = '{"foo":"bar"}';
    var buffer = makeBinary([pad(new TextEncoder().encode(json))], [1]);
    var file = new Blob([buffer]);
    return _BinaryFileReader["default"].isBinarySimulariumFile(file).then(function (isBinary) {
      expect(isBinary).toBe(true);
      file.arrayBuffer().then(function (buffer) {
        expect(function () {
          new _BinaryFileReader["default"](buffer);
        }).toThrow("No spatial data block found");
      });
    });
  });
  test("it correctly initializes a file with one json block, one spatial block, and one plotdata block", function () {
    var tjijson = {
      msgType: 0,
      version: 2,
      timeStepSize: 1,
      totalSteps: 1,
      size: [7, 7, 7],
      typeMapping: {}
    };
    var json2 = '{"baz":"bat"}';
    var buffer = makeBinary([pad(new TextEncoder().encode(JSON.stringify(tjijson))), pad(new ArrayBuffer(8)), pad(new TextEncoder().encode(json2))], [1, 3, 2]);
    var file = new Blob([buffer]);
    return _BinaryFileReader["default"].isBinarySimulariumFile(file).then(function (isBinary) {
      expect(isBinary).toBe(true);
      file.arrayBuffer().then(function (buffer) {
        expect(function () {
          var reader = new _BinaryFileReader["default"](buffer);
          var tji = reader.getTrajectoryFileInfo();
          expect(tji).toHaveProperty("totalSteps", 1);
          var plotData = reader.getPlotData();
          expect(plotData).toHaveProperty("baz", "bat");
          var nframes = reader.getNumFrames();
          expect(nframes).toBe(0);
        }).not.toThrow();
      });
    });
  });
});