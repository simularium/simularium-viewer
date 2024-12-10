import { vi } from "vitest";

import {
    WebsocketClient,
    NetMessageEnum,
    MessageEventLike,
} from "../simularium/WebsocketClient.js";

class TestWebsocketClient extends WebsocketClient {
    // exposing the protected onMessage() method for testing purposes
    public exposedOnMessage(event: MessageEventLike) {
        return this.onMessage(event);
    }
}

describe("WebsocketClient", () => {
    const CONNECTION_SETTINGS = {
        serverIp: "dummy.uri.com",
        serverPort: 1234,
    };

    describe("addJsonMessageHandler", () => {
        const websocketClient = new TestWebsocketClient(CONNECTION_SETTINGS);
        websocketClient.socketIsValid = vi.fn().mockReturnValue(true);

        test("handles defined websocket event", () => {
            const mockCallback = vi.fn((x) => x["data"]);
            websocketClient.addJsonMessageHandler(
                NetMessageEnum.ID_CONVERT_TRAJECTORY_FILE,
                mockCallback
            );
            const definedEvent = {
                data: JSON.stringify({
                    msgType: NetMessageEnum.ID_CONVERT_TRAJECTORY_FILE,
                    data: "test_data",
                }),
            };
            websocketClient.exposedOnMessage(definedEvent);

            expect(mockCallback.mock.calls.length).toBe(1);
            expect(mockCallback.mock.results[0].value).toBe("test_data");
        });

        test("ignores websocket events that don't have a defined handler", () => {
            const mockCallback = vi.fn((x) => x["data"]);

            websocketClient.addJsonMessageHandler(
                NetMessageEnum.ID_CONVERT_TRAJECTORY_FILE,
                mockCallback
            );
            const randomEvent0 = {
                data: JSON.stringify({
                    msgType: NetMessageEnum.ID_MODEL_DEFINITION,
                    data: "ignore_this_data",
                }),
            };
            const randomEvent1 = {
                data: JSON.stringify({
                    msgType: NetMessageEnum.ID_TRAJECTORY_FILE_INFO,
                    data: "ignore_this_data_too",
                }),
            };
            websocketClient.exposedOnMessage(randomEvent0);
            websocketClient.exposedOnMessage(randomEvent1);

            expect(mockCallback.mock.calls.length).toBe(0);
        });

        test("calls correct callback for event with multiple defined", () => {
            const mockCallback0 = vi.fn((x) => x["data"]);
            const mockCallback1 = vi.fn((x) => x["data"]);

            websocketClient.addJsonMessageHandler(
                NetMessageEnum.ID_CONVERT_TRAJECTORY_FILE,
                mockCallback0
            );
            websocketClient.addJsonMessageHandler(
                NetMessageEnum.ID_MODEL_DEFINITION,
                mockCallback1
            );
            const definedEvent0 = {
                data: JSON.stringify({
                    msgType: NetMessageEnum.ID_CONVERT_TRAJECTORY_FILE,
                    data: "data_0",
                }),
            };
            const definedEvent1 = {
                data: JSON.stringify({
                    msgType: NetMessageEnum.ID_MODEL_DEFINITION,
                    data: "data_1",
                }),
            };
            // just send one message, should result in callback 0 being called once
            websocketClient.exposedOnMessage(definedEvent0);
            expect(mockCallback0.mock.calls.length).toBe(1);
            expect(mockCallback1.mock.calls.length).toBe(0);
            expect(mockCallback0.mock.results[0].value).toBe("data_0");

            // send 2 messages, one for each type of callback
            websocketClient.exposedOnMessage(definedEvent1);
            websocketClient.exposedOnMessage(definedEvent0);
            expect(mockCallback0.mock.calls.length).toBe(2);
            expect(mockCallback1.mock.calls.length).toBe(1);
            expect(mockCallback0.mock.results[0].value).toBe("data_0");
            expect(mockCallback0.mock.results[1].value).toBe("data_0");
            expect(mockCallback1.mock.results[0].value).toBe("data_1");
        });
    });
});
