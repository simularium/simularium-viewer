import { IClientSimulatorImpl } from "./IClientSimulatorImpl";
import CurveSimulator from "./CurveSimulator";
import PointSimulator from "./PointSimulator";
import PdbSimulator from "./PdbSimulator";

export interface ClientSimulatorParams {
    type: string;
    name: string;
    [x: string]: unknown;
}
export function createSimulator(
    params: ClientSimulatorParams
): IClientSimulatorImpl {
    if (params.type === "CURVESIM") {
        return new CurveSimulator(
            params["nCurves"] as number,
            params["nTypes"] as number
        );
    } else if (params.type === "POINTSIM") {
        return new PointSimulator(
            params["nPoints"] as number,
            params["nTypes"] as number
        );
    } else if (params.type === "PDBSIM") {
        return new PdbSimulator();
    }
    throw new Error("unknown simulator type");
}
