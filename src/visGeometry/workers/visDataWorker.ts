import { parseVisDataMessage } from "../../simularium/VisDataParse";

self.addEventListener(
    "message",
    (e: MessageEvent) => {
        const visDataMsg = e.data;
        const frameData = parseVisDataMessage(visDataMsg);
        postMessage(frameData);
    },
    false
);
