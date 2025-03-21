import { vi, describe, test, expect } from "vitest";
import { FrontEndError, ErrorLevel } from "../simularium";
import { BaseRemoteClient } from "../simularium/RemoteClient";
import { WebsocketClient } from "../simularium/WebsocketClient";
const CONNECTION_SETTINGS = { serverIp: "dummy.uri.com", serverPort: 1234 };

// Create a dummy subclass so we can check if onConnected is called.
class DummyRemoteClient extends BaseRemoteClient {
    public onConnectedCalled = false;
    public onConnected(): void {
        this.onConnectedCalled = true;
    }
}

describe("BaseRemoteClient", () => {
    // Clear all mocks before each test to prevent interference
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // Restore all mocks after each test to prevent interference with other test files
    afterEach(() => {
        vi.restoreAllMocks();
    });
    describe("connectToRemoteServer", () => {
        test("resolves with success message when WebsocketClient connects", async () => {
            // Stub the WebsocketClient methods
            vi.spyOn(
                WebsocketClient.prototype,
                "connectToRemoteServer"
            ).mockResolvedValue("Connected to remote server");
            vi.spyOn(
                WebsocketClient.prototype,
                "socketIsValid"
            ).mockReturnValue(true);
            const client = new DummyRemoteClient(
                CONNECTION_SETTINGS,
                "dummyFile"
            );
            const message = await client.connectToRemoteServer();
            expect(message).toEqual("Connected to remote server");
            expect(client.isConnectedToRemoteServer()).toBe(true);
        });
        test("throws FrontEndError when connection fails", async () => {
            vi.spyOn(
                WebsocketClient.prototype,
                "connectToRemoteServer"
            ).mockRejectedValue(new Error("Original failure"));
            const client = new DummyRemoteClient(
                CONNECTION_SETTINGS,
                "dummyFile"
            );
            await expect(client.connectToRemoteServer()).rejects.toEqual(
                new FrontEndError(
                    "Failed to connect to remote server",
                    ErrorLevel.ERROR
                )
            );
        });
    });

    describe("initialize", () => {
        test("calls onConnected if connectToRemoteServer succeeds", async () => {
            vi.spyOn(
                BaseRemoteClient.prototype,
                "connectToRemoteServer"
            ).mockResolvedValue("Connected to remote server");
            const client = new DummyRemoteClient(
                CONNECTION_SETTINGS,
                "testFile"
            );
            await client.initialize("testFile");
            expect(client.onConnectedCalled).toBe(true);
        });
        test("calls handleError if connectToRemoteServer fails", async () => {
            const errorHandler = vi.fn();
            vi.spyOn(
                BaseRemoteClient.prototype,
                "connectToRemoteServer"
            ).mockRejectedValue(new Error("Original failure"));
            const client = new DummyRemoteClient(
                CONNECTION_SETTINGS,
                "testFile",
                errorHandler
            );
            await client.initialize("testFile");
            expect(errorHandler).toHaveBeenCalled();
        });
    });

    describe("disconnect and getIp", () => {
        test("disconnect sets _webSocketClient to null", async () => {
            vi.spyOn(
                WebsocketClient.prototype,
                "connectToRemoteServer"
            ).mockResolvedValue("Connected to remote server");
            vi.spyOn(
                WebsocketClient.prototype,
                "socketIsValid"
            ).mockReturnValue(true);
            vi.spyOn(WebsocketClient.prototype, "getIp").mockReturnValue(
                "dummy.uri.com"
            );
            const client = new DummyRemoteClient(
                CONNECTION_SETTINGS,
                "dummyFile"
            );
            await client.connectToRemoteServer();
            expect(client.isConnectedToRemoteServer()).toBe(true);
            client.disconnect();
            expect(client.isConnectedToRemoteServer()).toBe(false);
        });
        test("getIp returns correct ip", async () => {
            vi.spyOn(
                WebsocketClient.prototype,
                "connectToRemoteServer"
            ).mockResolvedValue("Connected to remote server");
            vi.spyOn(
                WebsocketClient.prototype,
                "socketIsValid"
            ).mockReturnValue(true);
            vi.spyOn(WebsocketClient.prototype, "getIp").mockReturnValue(
                "dummy.uri.com"
            );
            const client = new DummyRemoteClient(
                CONNECTION_SETTINGS,
                "dummyFile"
            );
            await client.connectToRemoteServer();
            expect(client.getIp()).toEqual("dummy.uri.com");
        });
    });
});
