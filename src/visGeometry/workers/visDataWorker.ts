self.addEventListener(
    "message",
    (e: MessageEvent) => {
        postMessage(e.data);
    },
    false
);
