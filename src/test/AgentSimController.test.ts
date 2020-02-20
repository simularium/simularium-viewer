import { AgentSimController } from "../../dist";

describe("AgentSimController module", () => {
    describe("Play pause tests", () => {
        test("can play from time", () => {
            let controller = new AgentSimController(
                {
                    useIpService: false,
                    serverIp: "localhost",
                    serverPort: 9002,
                },
                {}
            );

            //controller.playFromTime(0);
        });
    });
});
