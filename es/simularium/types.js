// TODO: see proposed new NetMessage data type
//       Remove msgType and fileName from this data structure
//       Then this data structure appears as a payload of the NetMessage
// TODO: see proposed new NetMessage data type
//       Remove msgType and connId from this data structure.
//       Then this data structure appears as a payload of the NetMessage
// This should always point to the latest version
export var FILE_STATUS_SUCCESS = "success";
export var FILE_STATUS_FAIL = "fail";
// IMPORTANT: Order of this array needs to perfectly match the incoming data.
export var AGENT_OBJECT_KEYS = [
// TODO: convert "vis-type" to visType at parse time
"vis-type", "instanceId", "type", "x", "y", "z", "xrot", "yrot", "zrot", "cr", "nSubPoints"];

/**
 * Parse Agents from Net Data
 * */