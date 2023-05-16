import _createClass from "@babel/runtime/helpers/createClass";
import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _assertThisInitialized from "@babel/runtime/helpers/assertThisInitialized";
import _inherits from "@babel/runtime/helpers/inherits";
import _possibleConstructorReturn from "@babel/runtime/helpers/possibleConstructorReturn";
import _getPrototypeOf from "@babel/runtime/helpers/getPrototypeOf";
import _wrapNativeSuper from "@babel/runtime/helpers/wrapNativeSuper";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }
function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
export var ErrorLevel = /*#__PURE__*/function (ErrorLevel) {
  ErrorLevel["ERROR"] = "error";
  ErrorLevel["INFO"] = "info";
  ErrorLevel["WARNING"] = "warning";
  return ErrorLevel;
}({});
export var FrontEndError = /*#__PURE__*/function (_Error) {
  _inherits(FrontEndError, _Error);
  var _super = _createSuper(FrontEndError);
  function FrontEndError(message) {
    var _this;
    var level = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : ErrorLevel.ERROR;
    var htmlData = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "";
    _classCallCheck(this, FrontEndError);
    for (var _len = arguments.length, params = new Array(_len > 3 ? _len - 3 : 0), _key = 3; _key < _len; _key++) {
      params[_key - 3] = arguments[_key];
    }
    // Pass remaining arguments (including vendor specific ones) to parent constructor
    _this = _super.call.apply(_super, [this].concat(params));
    _defineProperty(_assertThisInitialized(_this), "htmlData", void 0);
    _defineProperty(_assertThisInitialized(_this), "level", void 0);
    _this.name = "FrontEndError";
    _this.message = message;
    _this.htmlData = htmlData;
    _this.level = level;
    return _this;
  }
  return _createClass(FrontEndError);
}( /*#__PURE__*/_wrapNativeSuper(Error));