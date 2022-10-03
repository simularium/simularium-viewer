"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FILE_STATUS_SUCCESS = exports.FILE_STATUS_FAIL = void 0;
// TODO: see proposed new NetMessage data type
//       Remove msgType and fileName from this data structure
//       Then this data structure appears as a payload of the NetMessage
// TODO: see proposed new NetMessage data type
//       Remove msgType and connId from this data structure.
//       Then this data structure appears as a payload of the NetMessage
// This should always point to the latest version
var FILE_STATUS_SUCCESS = "success";
exports.FILE_STATUS_SUCCESS = FILE_STATUS_SUCCESS;
var FILE_STATUS_FAIL = "fail";
exports.FILE_STATUS_FAIL = FILE_STATUS_FAIL;