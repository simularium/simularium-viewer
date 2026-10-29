import {
    ClientMessageEnum,
    IClientSimulatorImpl,
} from "../simularium/localSimulators/IClientSimulatorImpl.js";
import { TrajectoryFileInfo, VisDataMessage } from "../simularium/types.js";

// counts up forever, like the live example simulators
export class CountingSim implements IClientSimulatorImpl {
    curFrame = -1;

    constructor(public totalSteps: number) {}

    update(requestedTime?: number): VisDataMessage {
        this.curFrame =
            requestedTime === undefined ? this.curFrame + 1 : requestedTime;
        return {
            msgType: ClientMessageEnum.ID_VIS_DATA_ARRIVE,
            bundleStart: this.curFrame,
            bundleSize: 1,
            bundleData: [
                { data: [], frameNumber: this.curFrame, time: this.curFrame },
            ],
            fileName: "test",
        };
    }

    getInfo(): TrajectoryFileInfo {
        return {
            connId: "test",
            msgType: ClientMessageEnum.ID_TRAJECTORY_FILE_INFO,
            version: 3,
            timeStepSize: 1,
            totalSteps: this.totalSteps,
            size: { x: 1, y: 1, z: 1 },
            typeMapping: {},
            spatialUnits: { magnitude: 1, name: "m" },
            timeUnits: { magnitude: 1, name: "s" },
        } as TrajectoryFileInfo;
    }

    updateSimulationState(_data: Record<string, unknown>): void {
        // no op
    }
}
