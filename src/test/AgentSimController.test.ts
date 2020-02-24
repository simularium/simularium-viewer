import { AgentSimController } from "../../dist";
import { DummyNetConnection } from "../agentsim/mock/DummyNetConnection";

describe("AgentSimController module", () => {
    describe("AgentSimController Scrubbing", () => {
        test("step forwards working", () => {
            const netConn = new DummyNetConnection({});
            const controller = new AgentSimController({
                netConnection: netConn,
            });
        });
    });
});
