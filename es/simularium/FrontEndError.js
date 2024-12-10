import _createClass from "@babel/runtime/helpers/createClass";
import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _possibleConstructorReturn from "@babel/runtime/helpers/possibleConstructorReturn";
import _getPrototypeOf from "@babel/runtime/helpers/getPrototypeOf";
import _inherits from "@babel/runtime/helpers/inherits";
import _wrapNativeSuper from "@babel/runtime/helpers/wrapNativeSuper";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
export var ErrorLevel = /*#__PURE__*/function (ErrorLevel) {
  ErrorLevel["ERROR"] = "error";
  ErrorLevel["INFO"] = "info";
  ErrorLevel["WARNING"] = "warning";
  return ErrorLevel;
}({});
export var FrontEndError = /*#__PURE__*/function (_Error) {
  function FrontEndError(message) {
    var _this;
    var level = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : ErrorLevel.ERROR;
    var htmlData = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "";
    _classCallCheck(this, FrontEndError);
    for (var _len = arguments.length, params = new Array(_len > 3 ? _len - 3 : 0), _key = 3; _key < _len; _key++) {
      params[_key - 3] = arguments[_key];
    }
    // Pass remaining arguments (including vendor specific ones) to parent constructor
    _this = _callSuper(this, FrontEndError, [].concat(params));
    _defineProperty(_this, "htmlData", void 0);
    _defineProperty(_this, "level", void 0);
    _this.name = "FrontEndError";
    _this.message = message;
    _this.htmlData = htmlData;
    _this.level = level;
    return _this;
  }
  _inherits(FrontEndError, _Error);
  return _createClass(FrontEndError);
}(/*#__PURE__*/_wrapNativeSuper(Error));