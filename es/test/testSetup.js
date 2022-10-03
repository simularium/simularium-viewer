// to be loaded by jest config's setupFiles
import { Blob } from "blob-polyfill";
global.Blob = Blob;
import { TextDecoder, TextEncoder } from "util";
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */

global.TextDecoder = TextDecoder;
global.TextEncoder = TextEncoder;