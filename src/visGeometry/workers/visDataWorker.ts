import { parseVisDataMessage } from "../../simularium/VisDataParse";

//linked list to do make sure this actually works
self.addEventListener(
    "message",
    (e: MessageEvent) => {
        const visDataMsg = e.data;
        const { agentData, frameData, size } = parseVisDataMessage(visDataMsg);

        postMessage({
            agentData,
            frameData,
            size,
        });
    },
    false
);
