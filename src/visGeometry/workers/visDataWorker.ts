import { parseVisDataMessage } from "../../simularium/VisDataParse";

self.addEventListener(
    "message",
    (e: MessageEvent) => {
        const visDataMsg = e.data;
        const { frameDataArray, parsedAgentDataArray } =
            parseVisDataMessage(visDataMsg);

        postMessage({
            frameDataArray,
            parsedAgentDataArray,
        });
    },
    false
);
