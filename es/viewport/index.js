import _classCallCheck from "@babel/runtime/helpers/classCallCheck";
import _createClass from "@babel/runtime/helpers/createClass";
import _assertThisInitialized from "@babel/runtime/helpers/assertThisInitialized";
import _inherits from "@babel/runtime/helpers/inherits";
import _possibleConstructorReturn from "@babel/runtime/helpers/possibleConstructorReturn";
import _getPrototypeOf from "@babel/runtime/helpers/getPrototypeOf";
import _defineProperty from "@babel/runtime/helpers/defineProperty";
function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }
function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
import * as React from "react";
import jsLogger from "js-logger";
import Stats from "three/examples/jsm/libs/stats.module";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSyncAlt } from "@fortawesome/free-solid-svg-icons";
import { forOwn, isEqual } from "lodash";
import { SelectionInterface } from "../simularium";
import { updateTrajectoryFileInfoFormat } from "../simularium/versionHandlers";
import { FrontEndError, ErrorLevel } from "../simularium/FrontEndError";
import { RenderStyle, VisGeometry, NO_AGENT } from "../visGeometry";
var defaultProps = {
  renderStyle: RenderStyle.WEBGL2_PREFERRED,
  backgroundColor: [0, 0, 0],
  height: 800,
  width: 800,
  loadInitialData: true,
  hideAllAgents: false,
  showPaths: true,
  showBounds: true,
  agentColors: [0x6ac1e5, 0xff2200, 0xee7967, 0xff6600, 0xd94d49, 0xffaa00, 0xffcc00, 0x00ccff, 0x00aaff, 0x8048f3, 0x07f4ec, 0x79bd8f, 0x8800ff, 0xaa00ff, 0xcc00ff, 0xff00cc, 0xff00aa, 0xff0088, 0xff0066, 0xff0044, 0xff0022, 0xff0000, 0xccff00, 0xaaff00, 0x88ff00, 0x00ffcc, 0x66ff00, 0x44ff00, 0x22ff00, 0x00ffaa, 0x00ff88, 0x00ffaa, 0x00ffff, 0x0066ff]
};
// max time in milliseconds for a mouse/touch interaction to be considered a click;
var MAX_CLICK_TIME = 300;
// for float errors
var CLICK_TOLERANCE = 1e-4;
var Viewport = /*#__PURE__*/function (_React$Component) {
  _inherits(Viewport, _React$Component);
  var _super = _createSuper(Viewport);
  function Viewport(props) {
    var _this;
    _classCallCheck(this, Viewport);
    _this = _super.call(this, props);
    _defineProperty(_assertThisInitialized(_this), "visGeometry", void 0);
    _defineProperty(_assertThisInitialized(_this), "selectionInterface", void 0);
    _defineProperty(_assertThisInitialized(_this), "lastRenderTime", void 0);
    _defineProperty(_assertThisInitialized(_this), "startTime", void 0);
    _defineProperty(_assertThisInitialized(_this), "vdomRef", void 0);
    _defineProperty(_assertThisInitialized(_this), "handlers", void 0);
    _defineProperty(_assertThisInitialized(_this), "hit", void 0);
    _defineProperty(_assertThisInitialized(_this), "animationRequestID", void 0);
    _defineProperty(_assertThisInitialized(_this), "lastRenderedAgentTime", void 0);
    _defineProperty(_assertThisInitialized(_this), "stats", void 0);
    _defineProperty(_assertThisInitialized(_this), "isClick", function (thisClick) {
      var lastClick = _this.state.lastClick;
      var t = Date.now() - lastClick.time;
      if (t > MAX_CLICK_TIME) {
        // long click
        return false;
      }
      if (Math.abs(thisClick.x - lastClick.x) > CLICK_TOLERANCE || Math.abs(thisClick.y - lastClick.y) > CLICK_TOLERANCE) {
        // mouse moved just rotate the field
        return false;
      }
      return true;
    });
    _defineProperty(_assertThisInitialized(_this), "handleTouchStart", function (e) {
      var event = e;
      var touch = event.touches[0];
      _this.setState({
        lastClick: {
          x: touch.pageX,
          y: touch.pageY,
          time: Date.now()
        }
      });
    });
    _defineProperty(_assertThisInitialized(_this), "handleKeyDown", function (e) {
      // the viewer canvas must have focus for the key press to work.
      if (e.target !== _this.vdomRef.current) {
        return;
      }
      var event = e;
      // control-option-1 (mac) or ctrl-alt-1 (windows)
      if (event.code === "Digit1" && event.altKey && event.ctrlKey) {
        var s = _this.state.showRenderParamsGUI;
        _this.setState({
          showRenderParamsGUI: !s
        });
      }
    });
    _defineProperty(_assertThisInitialized(_this), "handleTouchEnd", function (e) {
      var event = e;
      var touch = event.changedTouches[0];
      var thisClick = {
        x: touch.pageX,
        y: touch.pageY,
        time: Date.now()
      };
      if (_this.isClick(thisClick)) {
        // pass event to pick object because it was a true click and not a drag
        var canvas = _this.vdomRef.current;
        if (!canvas) {
          return;
        }
        var r = canvas.getBoundingClientRect();
        var offsetX = touch.clientX - r.left;
        var offsetY = touch.clientY - r.top;
        _this.onPickObject(offsetX, offsetY);
      }
    });
    _defineProperty(_assertThisInitialized(_this), "handleClickStart", function (e) {
      var event = e;
      _this.setState({
        lastClick: {
          x: event.x,
          y: event.y,
          time: Date.now()
        }
      });
    });
    _defineProperty(_assertThisInitialized(_this), "handlePointerDown", function (e) {
      var event = e;
      _this.setState({
        lastClick: {
          x: event.x,
          y: event.y,
          time: Date.now()
        }
      });
    });
    _defineProperty(_assertThisInitialized(_this), "handleMouseUp", function (e) {
      var event = e;
      var thisClick = {
        x: event.x,
        y: event.y,
        time: Date.now()
      };
      if (_this.isClick(thisClick)) {
        // pass event to pick object because it was a true click and not a drag
        _this.onPickObject(event.offsetX, event.offsetY);
      }
    });
    _defineProperty(_assertThisInitialized(_this), "handlePointerUp", function (e) {
      var event = e;
      var thisClick = {
        x: event.x,
        y: event.y,
        time: Date.now()
      };
      if (_this.isClick(thisClick)) {
        // pass event to pick object because it was a true click and not a drag
        _this.onPickObject(event.offsetX, event.offsetY);
      }
    });
    _defineProperty(_assertThisInitialized(_this), "handleMouseMove", function (e) {
      var event = e;
      if (!_this.vdomRef.current) {
        return;
      }
      var intersectedObject = _this.visGeometry.hitTest(event.offsetX, event.offsetY);
      if (intersectedObject !== NO_AGENT) {
        _this.vdomRef.current.style.cursor = "pointer";
      } else {
        _this.vdomRef.current.style.cursor = "default";
      }
    });
    var loggerLevel = props.loggerLevel === "debug" ? jsLogger.DEBUG : jsLogger.OFF;
    _this.animate = _this.animate.bind(_assertThisInitialized(_this));
    _this.dispatchUpdatedTime = _this.dispatchUpdatedTime.bind(_assertThisInitialized(_this));
    _this.handleTimeChange = _this.handleTimeChange.bind(_assertThisInitialized(_this));
    _this.visGeometry = new VisGeometry(loggerLevel);
    _this.props.simulariumController.visData.clearCache();
    _this.visGeometry.createMaterials(props.agentColors);
    _this.vdomRef = /*#__PURE__*/React.createRef();
    _this.lastRenderTime = Date.now();
    _this.startTime = Date.now();
    _this.onPickObject = _this.onPickObject.bind(_assertThisInitialized(_this));
    _this.stats = Stats();
    _this.stats.showPanel(1);
    _this.handlers = {
      touchstart: _this.handleTouchStart,
      touchend: _this.handleTouchEnd,
      mousedown: _this.handleClickStart,
      mouseup: _this.handleMouseUp,
      pointerdown: _this.handlePointerDown,
      pointerup: _this.handlePointerUp,
      mousemove: _this.handleMouseMove
    };
    _this.hit = false;
    _this.animationRequestID = 0;
    _this.lastRenderedAgentTime = -1;
    _this.selectionInterface = new SelectionInterface();
    _this.state = {
      lastClick: {
        x: 0,
        y: 0,
        time: 0
      },
      showRenderParamsGUI: false
    };
    return _this;
  }
  _createClass(Viewport, [{
    key: "onTrajectoryFileInfo",
    value: function onTrajectoryFileInfo(msg) {
      var _this$props = this.props,
        simulariumController = _this$props.simulariumController,
        onTrajectoryFileInfoChanged = _this$props.onTrajectoryFileInfoChanged,
        onUIDisplayDataChanged = _this$props.onUIDisplayDataChanged,
        onError = _this$props.onError,
        agentColors = _this$props.agentColors;

      // Update TrajectoryFileInfo format to latest version
      var trajectoryFileInfo = updateTrajectoryFileInfoFormat(msg, onError);
      simulariumController.visData.timeStepSize = trajectoryFileInfo.timeStepSize;
      var bx = trajectoryFileInfo.size.x;
      var by = trajectoryFileInfo.size.y;
      var bz = trajectoryFileInfo.size.z;
      var epsilon = 0.000001;
      if (Math.abs(bx) < epsilon || Math.abs(by) < epsilon || Math.abs(bz) < epsilon) {
        this.visGeometry.resetBounds();
      } else {
        this.visGeometry.resetBounds([bx, by, bz]);
      }
      // this can only happen right after resetBounds
      simulariumController.tickIntervalLength = this.visGeometry.tickIntervalLength;
      this.visGeometry.handleCameraData(trajectoryFileInfo.cameraDefault);
      this.visGeometry.handleAgentGeometry(trajectoryFileInfo.typeMapping);
      try {
        this.selectionInterface.parse(trajectoryFileInfo.typeMapping);
      } catch (e) {
        if (onError) {
          var _error = e;
          onError(new FrontEndError("error parsing 'typeMapping' data, ".concat(_error.message), ErrorLevel.ERROR));
        } else {
          console.log("error parsing 'typeMapping' data", e);
        }
      }
      var uiDisplayData = this.selectionInterface.getUIDisplayData();
      onTrajectoryFileInfoChanged(trajectoryFileInfo);
      this.visGeometry.clearColorMapping();
      var updatedColors = this.selectionInterface.setInitialAgentColors(uiDisplayData, agentColors, this.visGeometry.setColorForIds.bind(this.visGeometry));
      if (!isEqual(updatedColors, agentColors)) {
        this.visGeometry.createMaterials(updatedColors);
      }
      onUIDisplayDataChanged(this.selectionInterface.getUIDisplayData());
    }
  }, {
    key: "componentDidMount",
    value: function componentDidMount() {
      var _this2 = this;
      var _this$props2 = this.props,
        backgroundColor = _this$props2.backgroundColor,
        simulariumController = _this$props2.simulariumController,
        loadInitialData = _this$props2.loadInitialData,
        onError = _this$props2.onError;
      this.visGeometry.reparent(this.vdomRef.current);
      if (backgroundColor !== undefined) {
        this.visGeometry.setBackgroundColor(backgroundColor);
      }
      if (this.props.loggerLevel === "debug") {
        if (this.vdomRef && this.vdomRef.current) {
          this.stats.dom.style.position = "absolute";
          this.vdomRef.current.appendChild(this.stats.dom);
        }
      }
      if (onError) {
        simulariumController.onError = onError;
        this.visGeometry.setOnErrorCallBack(onError);
      }
      simulariumController.visGeometry = this.visGeometry;
      simulariumController.trajFileInfoCallback = function (msg) {
        _this2.onTrajectoryFileInfo(msg);
      };
      simulariumController.postConnect = function () {
        if (loadInitialData) {
          simulariumController.initializeTrajectoryFile();
        }
      };
      if (this.vdomRef.current) {
        this.vdomRef.current.addEventListener("timeChange", this.handleTimeChange, false);
      }
      this.addEventHandlersToCanvas();
      this.startTime = Date.now();
      this.animate();
    }
  }, {
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      this.visGeometry.destroyGui();
      if (this.vdomRef.current) {
        this.vdomRef.current.removeEventListener("timeChange", this.handleTimeChange);
      }
      this.removeEventHandlersFromCanvas();
      this.stopAnimate();
    }
  }, {
    key: "componentDidUpdate",
    value: function componentDidUpdate(prevProps, prevState) {
      var _this$props3 = this.props,
        backgroundColor = _this$props3.backgroundColor,
        agentColors = _this$props3.agentColors,
        height = _this$props3.height,
        width = _this$props3.width,
        renderStyle = _this$props3.renderStyle,
        hideAllAgents = _this$props3.hideAllAgents,
        showPaths = _this$props3.showPaths,
        showBounds = _this$props3.showBounds,
        selectionStateInfo = _this$props3.selectionStateInfo;
      if (selectionStateInfo) {
        if (!isEqual(selectionStateInfo.highlightedAgents, prevProps.selectionStateInfo.highlightedAgents)) {
          var highlightedIds = this.selectionInterface.getHighlightedIds(selectionStateInfo);
          this.visGeometry.setHighlightByIds(highlightedIds);
        }
        if (!isEqual(selectionStateInfo.hiddenAgents, prevProps.selectionStateInfo.hiddenAgents)) {
          var hiddenIds = this.selectionInterface.getHiddenIds(selectionStateInfo);
          this.visGeometry.setVisibleByIds(hiddenIds);
        }
        if (!isEqual(selectionStateInfo.colorChanges, prevProps.selectionStateInfo.colorChanges)) {
          this.changeAgentsColor(selectionStateInfo.colorChanges);
        }
      }

      // note that if the system does not support the molecular render style, then
      // the visGeometry's internal render style will be different than what this prop says.
      if (renderStyle !== prevProps.renderStyle) {
        this.visGeometry.setRenderStyle(renderStyle);
      }
      if (hideAllAgents !== prevProps.hideAllAgents) {
        this.visGeometry.toggleAllAgentsHidden(hideAllAgents);
      }
      if (showPaths !== prevProps.showPaths) {
        this.visGeometry.setShowPaths(showPaths);
      }
      if (showBounds !== prevProps.showBounds) {
        this.visGeometry.setShowBounds(showBounds);
      }
      if (backgroundColor !== prevProps.backgroundColor) {
        this.visGeometry.setBackgroundColor(backgroundColor);
      }
      if (agentColors && !isEqual(agentColors, prevProps.agentColors)) {
        this.visGeometry.createMaterials(agentColors);
      }
      if (prevProps.height !== height || prevProps.width !== width) {
        this.visGeometry.resize(width, height);
      }
      if (prevState.showRenderParamsGUI !== this.state.showRenderParamsGUI) {
        if (this.state.showRenderParamsGUI) {
          this.visGeometry.setupGui(this.vdomRef.current);
        } else {
          this.visGeometry.destroyGui();
        }
      }
    }
  }, {
    key: "addEventHandlersToCanvas",
    value: function addEventHandlersToCanvas() {
      var _this3 = this;
      forOwn(this.handlers, function (handler, eventName) {
        return _this3.visGeometry.renderDom.addEventListener(eventName, handler, false);
      });
      document.addEventListener("keydown", this.handleKeyDown, false);
    }
  }, {
    key: "removeEventHandlersFromCanvas",
    value: function removeEventHandlersFromCanvas() {
      var _this4 = this;
      forOwn(this.handlers, function (handler, eventName) {
        return _this4.visGeometry.renderDom.removeEventListener(eventName, handler, false);
      });
      document.removeEventListener("keydown", this.handleKeyDown, false);
    }
  }, {
    key: "onPickObject",
    value: function onPickObject(posX, posY) {
      // TODO: intersect with scene's children not including lights?
      // can we select a smaller number of things to hit test?
      var oldFollowObject = this.visGeometry.getFollowObject();

      // hit testing
      var intersectedObject = this.visGeometry.hitTest(posX, posY);
      if (intersectedObject !== NO_AGENT) {
        this.hit = true;
        if (oldFollowObject !== intersectedObject && oldFollowObject !== NO_AGENT) {
          this.visGeometry.removePathForAgent(oldFollowObject);
        }
        this.visGeometry.setFollowObject(intersectedObject);
        this.visGeometry.addPathForAgent(intersectedObject);
      } else {
        if (oldFollowObject !== NO_AGENT) {
          this.visGeometry.removePathForAgent(oldFollowObject);
        }
        if (this.hit) {
          this.hit = false;
        }
        this.visGeometry.setFollowObject(NO_AGENT);
      }
    }
  }, {
    key: "handleTimeChange",
    value: function handleTimeChange(e) {
      var onTimeChange = this.props.onTimeChange;
      if (!Viewport.isCustomEvent(e)) {
        throw new Error("not custom event");
      }
      onTimeChange(e.detail);
    }
  }, {
    key: "dispatchUpdatedTime",
    value: function dispatchUpdatedTime(timeData) {
      var event = new CustomEvent("timeChange", {
        detail: timeData
      });
      if (this.vdomRef.current) {
        this.vdomRef.current.dispatchEvent(event);
      }
    }
  }, {
    key: "getColorId",
    value: function getColorId(color) {
      /**
       * Check if the new color is in our current array of color options, if not,
       * add it before returning the index
       */
      return this.visGeometry.addNewColor(color);
    }
  }, {
    key: "changeAgentsColor",
    value: function changeAgentsColor(colorChanges) {
      var _this5 = this;
      var onUIDisplayDataChanged = this.props.onUIDisplayDataChanged;
      colorChanges.forEach(function (colorChange) {
        var agents = colorChange.agents,
          color = colorChange.color;
        var uiDisplayData = _this5.selectionInterface.getUIDisplayData();
        var agentIds = _this5.selectionInterface.getAgentIdsByNamesAndTags(agents);
        _this5.selectionInterface.updateAgentColors(agentIds, colorChange, uiDisplayData);
        var colorId = _this5.getColorId(color);
        _this5.visGeometry.applyColorToAgents(agentIds, colorId);
        var updatedUiDisplayData = _this5.selectionInterface.getUIDisplayData();
        onUIDisplayDataChanged(updatedUiDisplayData);
      });
    }
  }, {
    key: "stopAnimate",
    value: function stopAnimate() {
      if (this.animationRequestID !== 0) {
        cancelAnimationFrame(this.animationRequestID);
        this.animationRequestID = 0;
      }
    }
  }, {
    key: "animate",
    value: function animate() {
      var simulariumController = this.props.simulariumController;
      var visData = simulariumController.visData;
      var framesPerSecond = 60; // how often the view-port rendering is refreshed per second
      var timePerFrame = 1000 / framesPerSecond; // the time interval at which to re-render
      var now = Date.now();
      var elapsedTime = now - this.lastRenderTime;
      var totalElapsedTime = now - this.startTime;
      if (elapsedTime > timePerFrame) {
        if (simulariumController.isChangingFile) {
          this.visGeometry.render(totalElapsedTime);
          this.lastRenderTime = Date.now();
          this.lastRenderedAgentTime = -1;
          simulariumController.markFileChangeAsHandled();
          this.animationRequestID = requestAnimationFrame(this.animate);
          return;
        }
        if (visData.currentFrameData.time != this.lastRenderedAgentTime) {
          var currentAgents = visData.currentFrame();
          if (currentAgents.length > 0) {
            this.dispatchUpdatedTime(visData.currentFrameData);
            this.visGeometry.update(currentAgents);
            this.lastRenderedAgentTime = visData.currentFrameData.time;
          }
        }
        if (!visData.atLatestFrame() && !simulariumController.paused()) {
          visData.gotoNextFrame();
        }
        this.stats.begin();
        this.visGeometry.render(totalElapsedTime);
        this.stats.end();
        this.lastRenderTime = Date.now();
      }
      this.animationRequestID = requestAnimationFrame(this.animate);
    }
  }, {
    key: "renderViewControls",
    value: function renderViewControls() {
      var simulariumController = this.props.simulariumController;
      return /*#__PURE__*/React.createElement("div", {
        className: "view-controls"
      }, /*#__PURE__*/React.createElement("button", {
        onClick: simulariumController.resetCamera,
        className: "btn"
      }, /*#__PURE__*/React.createElement(FontAwesomeIcon, {
        icon: faSyncAlt,
        transform: "flip-h",
        style: {
          color: "#737373"
        }
      })), /*#__PURE__*/React.createElement("button", {
        onClick: simulariumController.centerCamera,
        className: "btn-work"
      }, "Re-center"), /*#__PURE__*/React.createElement("button", {
        onClick: simulariumController.reOrientCamera,
        className: "btn-word"
      }, "Starting orientation"));
    }
  }, {
    key: "render",
    value: function render() {
      var _this$props4 = this.props,
        width = _this$props4.width,
        height = _this$props4.height,
        showCameraControls = _this$props4.showCameraControls;

      // style is specified below so that the size
      // can be passed as a react property
      return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
        id: "vdom",
        style: {
          height: height,
          width: width,
          position: "relative"
        },
        ref: this.vdomRef,
        tabIndex: 0,
        "data-height": height,
        "data-width": width
      }, showCameraControls && this.renderViewControls()));
    }
  }], [{
    key: "isCustomEvent",
    value: function isCustomEvent(event) {
      return "detail" in event;
    }
  }]);
  return Viewport;
}(React.Component);
_defineProperty(Viewport, "defaultProps", defaultProps);
export { RenderStyle };
export default Viewport;