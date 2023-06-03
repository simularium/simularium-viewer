import _defineProperty from "@babel/runtime/helpers/defineProperty";
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
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