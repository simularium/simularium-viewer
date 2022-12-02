interface NodeConfig {
    ip: string;
    name: string;
    state: string;
    simulation: string;
    environment: string;
}
interface OrchestratorParams {
    serviceAddr: string;
}
export default class Orchestrator {
    private serviceAddr;
    constructor(params: OrchestratorParams);
    getNodes(params: string): Promise<NodeConfig[]> | Promise<undefined>;
    getFreeNodes(): Promise<NodeConfig[]> | Promise<undefined>;
    getSimNode(simId: string): Promise<NodeConfig[]> | Promise<undefined>;
    reserveNode(config: NodeConfig, simulation: string): void;
    freeNode(config: NodeConfig): void;
}
export { Orchestrator };
