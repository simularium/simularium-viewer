// to be loaded by jest config's setupFiles
import { Blob as CustomBlob } from "blob-polyfill";
Blob = CustomBlob;
// import {
//     TextDecoder as CustomTextDecoder,
//     TextEncoder as CustomTextEncoder,
// } from "util";
// /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
// TextDecoder = CustomTextDecoder;
// TextEncoder = CustomTextEncoder;
