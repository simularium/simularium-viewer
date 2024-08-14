import { parseVisDataMessage } from "../../simularium/VisDataParse";

//linked list to do make sure this actually works
self.addEventListener(
    "message",
    (e: MessageEvent) => {
        const visDataMsg = e.data;
        const frameData = parseVisDataMessage(visDataMsg);
        postMessage(frameData);
    },
    false
);
