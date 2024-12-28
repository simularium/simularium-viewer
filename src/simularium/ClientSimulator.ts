import jsLogger from "js-logger";
import { ILogger } from "js-logger";

import { VisDataMessage, TrajectoryFileInfo } from "./types.js";
import {
    ClientMessageEnum,
    ClientPlayBackType,
    IClientSimulatorImpl,
} from "./localSimulators/IClientSimulatorImpl.js";
import { ISimulator } from "./ISimulator.js";

// a ClientSimulator is a ISimulator that is expected to run purely in procedural javascript in the browser client,
// with the procedural implementation in a IClientSimulatorImpl
export class ClientSimulator implements ISimulator {
    private localSimulator: IClientSimulatorImpl;
    private simulatorIntervalId = 0;
    // throttle the data interval so that the local client can keep up
    // ideally the client (VisData) needs to be able to handle the data rate
    private dataInterval = 66;
    protected logger: ILogger;
    public onTrajectoryFileInfoArrive: (msg: TrajectoryFileInfo) => void;
    public onTrajectoryDataArrive: (msg: VisDataMessage) => void;
    public handleError: (error: Error) => void;

    public constructor(sim: IClientSimulatorImpl) {
        this.logger = jsLogger.get("netconnection");
        this.logger.setLevel(jsLogger.DEBUG);

        this.onTrajectoryFileInfoArrive = () => {
            /* do nothing */
        };
        this.onTrajectoryDataArrive = () => {
            /* do nothing */
        };
        this.handleError = () => {
            /* do nothing */
        };
        this.localSimulator = sim;
    }

    public setTrajectoryFileInfoHandler(
        handler: (msg: TrajectoryFileInfo) => void
    ): void {
        this.onTrajectoryFileInfoArrive = handler;
    }
    public setTrajectoryDataHandler(
        handler: (msg: VisDataMessage) => void
    ): void {
        this.onTrajectoryDataArrive = handler;
    }
    public setErrorHandler(handler: (msg: Error) => void): void {
        this.handleError = handler;
    }

    private sendSimulationRequest(
        jsonData: Record<string, unknown>,
        _requestDescription: string
    ): void {
        switch (jsonData.msgType) {
            case ClientMessageEnum.ID_UPDATE_TIME_STEP:
                break;
            case ClientMessageEnum.ID_UPDATE_RATE_PARAM:
                break;
            case ClientMessageEnum.ID_MODEL_DEFINITION:
                break;
            case ClientMessageEnum.ID_UPDATE_SIMULATION_STATE:
                {
                    this.localSimulator.updateSimulationState(
                        jsonData["data"] as Record<string, unknown>
                    );
                }
                break;
            case ClientMessageEnum.ID_VIS_DATA_REQUEST:
                {
                    if (jsonData["frameNumber"] !== undefined) {
                        const frame = this.localSimulator.update(
                            jsonData["frameNumber"] as number
                        );
                        this.onTrajectoryDataArrive(frame);
                    } else {
                        const a: TrajectoryFileInfo =
                            this.localSimulator.getInfo();
                        this.onTrajectoryFileInfoArrive(a);
                    }
                }
                break;
            case ClientMessageEnum.ID_VIS_DATA_PAUSE:
                {
                    window.clearInterval(this.simulatorIntervalId);
                    this.simulatorIntervalId = 0;
                }
                break;
            case ClientMessageEnum.ID_VIS_DATA_RESUME:
                {
                    this.simulatorIntervalId = window.setInterval(() => {
                        const frame = this.localSimulator.update(0);
                        this.onTrajectoryDataArrive(frame);
                    }, this.dataInterval);
                }
                break;
            case ClientMessageEnum.ID_VIS_DATA_ABORT:
                {
                    window.clearInterval(this.simulatorIntervalId);
                    this.simulatorIntervalId = 0;
                }
                break;
            case ClientMessageEnum.ID_GOTO_SIMULATION_TIME:
                {
                    const frame = this.localSimulator.update(
                        jsonData["time"] as number
                    );
                    this.onTrajectoryDataArrive(frame);
                }
                break;
            case ClientMessageEnum.ID_INIT_TRAJECTORY_FILE:
                {
                    const a: TrajectoryFileInfo = this.localSimulator.getInfo();
                    console.log("receive trajectory file info");
                    this.onTrajectoryFileInfoArrive(a);
                }
                break;
        }
    }

    public sendTimeStepUpdate(newTimeStep: number): void {
        const jsonData = {
            msgType: ClientMessageEnum.ID_UPDATE_TIME_STEP,
            timeStep: newTimeStep,
        };
        this.sendSimulationRequest(jsonData, "Update Time-Step");
    }

    public sendUpdate(obj: Record<string, unknown>): Promise<void> {
        obj.msgType = ClientMessageEnum.ID_UPDATE_SIMULATION_STATE;
        this.sendSimulationRequest(obj, "Simulation State Update");
        return Promise.resolve();
    }

    /**
     * Simulation Control
     *
     * Simulation Run Modes:
     *  Live : Results are sent as they are calculated
     *  Pre-Run : All results are evaluated, then sent piecemeal
     *  Trajectory File: No simulation run, stream a result file piecemeal
     *
     */
    public initialize(fileName: string): Promise<void> {
        const jsonData = {
            msgType: ClientMessageEnum.ID_VIS_DATA_REQUEST,
            mode: ClientPlayBackType.ID_TRAJECTORY_FILE_PLAYBACK,
            fileName: fileName,
        };

        return Promise.resolve().then(() => {
            this.sendSimulationRequest(
                jsonData,
                "Start Trajectory File Playback"
            );
        });
    }

    public pause(): void {
        this.sendSimulationRequest(
            { msgType: ClientMessageEnum.ID_VIS_DATA_PAUSE },
            "Pause Simulation"
        );
    }

    public stream(): void {
        this.sendSimulationRequest(
            { msgType: ClientMessageEnum.ID_VIS_DATA_RESUME },
            "Resume Simulation"
        );
    }

    public destroy(): void {
        this.sendSimulationRequest(
            { msgType: ClientMessageEnum.ID_VIS_DATA_ABORT },
            "Abort Simulation"
        );
    }

    public requestSingleFrame(startFrameNumber: number): void {
        this.sendSimulationRequest(
            {
                msgType: ClientMessageEnum.ID_VIS_DATA_REQUEST,
                mode: ClientPlayBackType.ID_TRAJECTORY_FILE_PLAYBACK,
                frameNumber: startFrameNumber,
            },
            "Request Single Frame"
        );
    }

    public requestFrameByTime(time: number): void {
        this.sendSimulationRequest(
            {
                msgType: ClientMessageEnum.ID_GOTO_SIMULATION_TIME,
                time: time,
            },
            "Load single frame at specified Time"
        );
    }

    public requestTrajectoryFileInfo(fileName: string): void {
        this.sendSimulationRequest(
            {
                msgType: ClientMessageEnum.ID_INIT_TRAJECTORY_FILE,
                fileName: fileName,
            },
            "Initialize trajectory file info"
        );
    }
}
