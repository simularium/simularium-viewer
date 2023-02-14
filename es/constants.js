export var DEFAULT_CAMERA_Z_POSITION = 120;
export var DEFAULT_CAMERA_SPEC = {
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
export var TrajectoryType;

(function (TrajectoryType) {
  TrajectoryType["SMOLDYN"] = "Smoldyn";
})(TrajectoryType || (TrajectoryType = {}));