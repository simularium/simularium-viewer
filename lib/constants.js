"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DEFAULT_CAMERA_Z_POSITION = exports.DEFAULT_CAMERA_SPEC = void 0;
var DEFAULT_CAMERA_Z_POSITION = 120;
exports.DEFAULT_CAMERA_Z_POSITION = DEFAULT_CAMERA_Z_POSITION;
var DEFAULT_CAMERA_SPEC = {
  position: {
    x: 0,
    y: 0,
    z: DEFAULT_CAMERA_Z_POSITION
  },
  lookAtPosition: {
    x: 0,
    y: 0,
    z: 0
  },
  upVector: {
    x: 0,
    y: 1,
    z: 0
  },
  fovDegrees: 75
};
exports.DEFAULT_CAMERA_SPEC = DEFAULT_CAMERA_SPEC;