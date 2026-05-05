// to be loaded by jest config's setupFiles
import { Blob as CustomBlob } from "blob-polyfill";
Blob = CustomBlob;
