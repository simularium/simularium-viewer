import _defineProperty from "@babel/runtime/helpers/defineProperty";
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
export var DEFAULT_CAMERA_Z_POSITION = 120;
export var DEFAULT_CAMERA_SPEC_PERSPECTIVE = {
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
export var DEFAULT_CAMERA_SPEC = _objectSpread(_objectSpread({}, DEFAULT_CAMERA_SPEC_PERSPECTIVE), {}, {
  orthographic: false
});
export var TrajectoryType = /*#__PURE__*/function (TrajectoryType) {
  TrajectoryType["SMOLDYN"] = "Smoldyn";
  return TrajectoryType;
}({});
export var DEFAULT_FRAME_RATE = 60; // frames per second

export var NULL_AGENT = {
  "vis-type": -1,
  instanceId: -1,
  type: -1,
  x: 0,
  y: 0,
  z: 0,
  xrot: 0,
  yrot: 0,
  zrot: 0,
  cr: 0,
  subpoints: []
};