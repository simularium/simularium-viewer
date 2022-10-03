"use strict";

var _blobPolyfill = require("blob-polyfill");

var _util = require("util");

// to be loaded by jest config's setupFiles
global.Blob = _blobPolyfill.Blob;

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
global.TextDecoder = _util.TextDecoder;
global.TextEncoder = _util.TextEncoder;