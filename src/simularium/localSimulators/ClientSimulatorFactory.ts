import { IClientSimulator } from "./IClientSimulator";
import CurveSimulator from "./CurveSimulator";

interface ClientSimulatorParams {
    type: string;
    name: string;
    [x: string]: unknown;
}
export function createSimulator(
    params: ClientSimulatorParams
): IClientSimulator {
    if (params.type === "CURVESIM") {
        return new CurveSimulator(params["nCurves"], params["nTypes"]);
    }
    throw new Error("unknown simulator type");
}
