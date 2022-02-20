// to be loaded by jest config's setupFiles
const { TextEncoder } = require("util");
global.TextEncoder = TextEncoder;
