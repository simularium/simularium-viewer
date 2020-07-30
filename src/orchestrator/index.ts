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
    private serviceAddr: string;

    public constructor(params: OrchestratorParams) {
        this.serviceAddr = params.serviceAddr || "https://localhost:5000";
    }

    public getNodes(
        params: string
    ): Promise<NodeConfig[]> | Promise<undefined> {
        const nodeFetch = fetch(this.serviceAddr + "/get?" + params);

        return nodeFetch
            .then(response => {
                if (response.ok) {
                    return response.json().then(data => {
                        return Object.keys(data).length > 0 ? data : undefined;
                    });
                } else {
                    return undefined;
                }
            })
            .catch(function() {
                return undefined;
            });
    }

    public getFreeNodes(): Promise<NodeConfig[]> | Promise<undefined> {
        const params = "state=free";
        return this.getNodes(params);
    }

    public getSimNode(
        simId: string
    ): Promise<NodeConfig[]> | Promise<undefined> {
        const params: string = "simulation=" + simId;
        return this.getNodes(params);
    }

    public reserveNode(config: NodeConfig, simulation: string): void {
        fetch(
            this.serviceAddr +
                "/assign" +
                "?command=reserve" +
                "&simulation=" +
                simulation +
                "&name=" +
                config.name
        );
    }

    public freeNode(config: NodeConfig): void {
        fetch(
            this.serviceAddr +
                "/assign?" +
                "command=free" +
                "&name=" +
                config.name
        );
    }
}
