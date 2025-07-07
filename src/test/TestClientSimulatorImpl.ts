import { DEFAULT_CAMERA_SPEC } from "../constants";
import {
    IClientSimulatorImpl,
    VisDataMessage,
    TrajectoryFileInfo,
    ClientMessageEnum,
    EncodedTypeMapping,
} from "../simularium";

export default class TestClientSimulatorImpl implements IClientSimulatorImpl {
    private frame = 0;
    public name = "test";

    update(_dt: number): VisDataMessage {
        this.frame++;
        return {
            msgType: ClientMessageEnum.ID_VIS_DATA_ARRIVE,
            bundleStart: this.frame,
            bundleSize: 1,
            bundleData: [
                {
                    data: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0.1, 0], // One single point at origin
                    frameNumber: this.frame,
                    time: this.frame,
                },
            ],
            fileName: "test",
        };
    }

    getInfo(): TrajectoryFileInfo {
        const typeMapping: EncodedTypeMapping = { 0: { name: `point0` } };
        return {
            connId: "hello world",
            msgType: ClientMessageEnum.ID_TRAJECTORY_FILE_INFO,
            version: 2,
            timeStepSize: 1,
            totalSteps: 1000,
            // bounding volume dimensions
            size: {
                x: 12,
                y: 12,
                z: 12,
            },
            cameraDefault: DEFAULT_CAMERA_SPEC,
            typeMapping: typeMapping,
            spatialUnits: {
                magnitude: 1,
                name: "m",
            },
            timeUnits: {
                magnitude: 1,
                name: "s",
            },
        };
    }

    updateSimulationState(_data: Record<string, unknown>): void {
        // Empty implementation
    }
}
