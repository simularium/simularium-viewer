import { parseVisDataMessage } from "../../simularium/VisDataParse";
self.addEventListener("message", function (e) {
  var visDataMsg = e.data;
  var _parseVisDataMessage = parseVisDataMessage(visDataMsg),
    frameDataArray = _parseVisDataMessage.frameDataArray,
    parsedAgentDataArray = _parseVisDataMessage.parsedAgentDataArray;
  postMessage({
    frameDataArray: frameDataArray,
    parsedAgentDataArray: parsedAgentDataArray
  });
}, false);