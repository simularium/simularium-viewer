// to be loaded by jest config's setupFiles
import { Blob } from "blob-polyfill";
global.Blob = Blob;
import { TextDecoder, TextEncoder } from "util";
(global as any).TextDecoder = TextDecoder;
global.TextEncoder = TextEncoder;
