"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FrontEndError = exports.ErrorLevel = void 0;

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _assertThisInitialized2 = _interopRequireDefault(require("@babel/runtime/helpers/assertThisInitialized"));

var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));

var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));

var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));

var _wrapNativeSuper2 = _interopRequireDefault(require("@babel/runtime/helpers/wrapNativeSuper"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2["default"])(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2["default"])(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2["default"])(this, result); }; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

var ErrorLevel;
exports.ErrorLevel = ErrorLevel;

(function (ErrorLevel) {
  ErrorLevel["ERROR"] = "error";
  ErrorLevel["INFO"] = "info";
  ErrorLevel["WARNING"] = "warning";
})(ErrorLevel || (exports.ErrorLevel = ErrorLevel = {}));

var FrontEndError = /*#__PURE__*/function (_Error) {
  (0, _inherits2["default"])(FrontEndError, _Error);

  var _super = _createSuper(FrontEndError);

  function FrontEndError(message) {
    var _this;

    var level = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : ErrorLevel.ERROR;
    var htmlData = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "";
    (0, _classCallCheck2["default"])(this, FrontEndError);

    for (var _len = arguments.length, params = new Array(_len > 3 ? _len - 3 : 0), _key = 3; _key < _len; _key++) {
      params[_key - 3] = arguments[_key];
    }

    // Pass remaining arguments (including vendor specific ones) to parent constructor
    _this = _super.call.apply(_super, [this].concat(params));
    (0, _defineProperty2["default"])((0, _assertThisInitialized2["default"])(_this), "htmlData", void 0);
    (0, _defineProperty2["default"])((0, _assertThisInitialized2["default"])(_this), "level", void 0);
    _this.name = "FrontEndError";
    _this.message = message;
    _this.htmlData = htmlData;
    _this.level = level;
    return _this;
  }

  return (0, _createClass2["default"])(FrontEndError);
}( /*#__PURE__*/(0, _wrapNativeSuper2["default"])(Error));

exports.FrontEndError = FrontEndError;