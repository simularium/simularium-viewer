// to be loaded by jest config's setupFiles
import { TextEncoder } from "util";
global.TextEncoder = TextEncoder;
