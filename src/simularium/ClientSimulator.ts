import jsLogger from "js-logger";
import { ILogger } from "js-logger";

import { VisDataMessage, TrajectoryFileInfo } from "./types";
import {
    ClientMessageEnum,
    ClientPlayBackType,
    IClientSimulatorImpl,
} from "./localSimulators/IClientSimulatorImpl";
import { ISimulator } from "./ISimulator";

// a ClientSimulator is a ISimulator that is expected to run purely in procedural javascript in the browser client,
// with the procedural implementation in a IClientSimulatorImpl
export class ClientSimulator implements ISimulator {
    private localSimulator: IClientSimulatorImpl;
    private simulatorIntervalId = 0;
    private dataInterval = 100;
    protected logger: ILogger;
    public onTrajectoryFileInfoArrive: (msg: TrajectoryFileInfo) => void;
    public onTrajectoryDataArrive: (msg: VisDataMessage) => void;

    public constructor(sim: IClientSimulatorImpl) {
        this.logger = jsLogger.get("netconnection");
        this.logger.setLevel(jsLogger.DEBUG);

        this.onTrajectoryFileInfoArrive = () => {
            /* do nothing */
        };
        this.onTrajectoryDataArrive = () => {
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

    public socketIsValid(): boolean {
        return true;
    }

    /**
     * Connect
     * */
    public disconnect(): void {
        if (!this.socketIsValid()) {
            this.logger.warn("disconnect failed, client is not connected");
            return;
        }
    }

    public getIp(): string {
        return "";
    }

    public connectToRemoteServer(_address: string): Promise<string> {
        return Promise.resolve("Local client sim successfully started");
    }

    private sendSimulationRequest(
        jsonData: Record<string, unknown>,
        _requestDescription: string
    ): void {
        // do processing, then return!
        //this.logWebSocketRequest(requestDescription, jsonData);

        switch (jsonData.msgType) {
            case ClientMessageEnum.ID_UPDATE_TIME_STEP:
                break;
            case ClientMessageEnum.ID_UPDATE_RATE_PARAM:
                break;
            case ClientMessageEnum.ID_MODEL_DEFINITION:
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
        if (!this.socketIsValid()) {
            return;
        }

        const jsonData = {
            msgType: ClientMessageEnum.ID_UPDATE_TIME_STEP,
            timeStep: newTimeStep,
        };
        this.sendSimulationRequest(jsonData, "Update Time-Step");
    }

    public sendParameterUpdate(paramName: string, paramValue: number): void {
        if (!this.socketIsValid()) {
            return;
        }

        const jsonData = {
            msgType: ClientMessageEnum.ID_UPDATE_RATE_PARAM,
            paramName: paramName,
            paramValue: paramValue,
        };
        this.sendSimulationRequest(jsonData, "Rate Parameter Update");
    }

    public sendModelDefinition(model: string): void {
        if (!this.socketIsValid()) {
            return;
        }

        const dataToSend = {
            model: model,
            msgType: ClientMessageEnum.ID_MODEL_DEFINITION,
        };
        this.sendSimulationRequest(dataToSend, "Model Definition");
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
    public startRemoteSimPreRun(timeStep: number, numTimeSteps: number): void {
        const jsonData = {
            msgType: ClientMessageEnum.ID_VIS_DATA_REQUEST,
            mode: ClientPlayBackType.ID_PRE_RUN_SIMULATION,
            timeStep: timeStep,
            numTimeSteps: numTimeSteps,
        };

        this.connectToRemoteServer(this.getIp()).then(() => {
            this.sendSimulationRequest(jsonData, "Start Simulation Pre-Run");
        });
    }

    public startRemoteSimLive(): void {
        const jsonData = {
            msgType: ClientMessageEnum.ID_VIS_DATA_REQUEST,
            mode: ClientPlayBackType.ID_LIVE_SIMULATION,
        };

        this.connectToRemoteServer(this.getIp()).then(() => {
            this.sendSimulationRequest(jsonData, "Start Simulation Live");
        });
    }

    public startRemoteTrajectoryPlayback(fileName: string): Promise<void> {
        const jsonData = {
            msgType: ClientMessageEnum.ID_VIS_DATA_REQUEST,
            mode: ClientPlayBackType.ID_TRAJECTORY_FILE_PLAYBACK,
            "file-name": fileName,
        };

        return this.connectToRemoteServer(this.getIp()).then(() => {
            this.sendSimulationRequest(
                jsonData,
                "Start Trajectory File Playback"
            );
        });
    }

    public pauseRemoteSim(): void {
        if (!this.socketIsValid()) {
            return;
        }
        this.sendSimulationRequest(
            { msgType: ClientMessageEnum.ID_VIS_DATA_PAUSE },
            "Pause Simulation"
        );
    }

    public resumeRemoteSim(): void {
        if (!this.socketIsValid()) {
            return;
        }
        this.sendSimulationRequest(
            { msgType: ClientMessageEnum.ID_VIS_DATA_RESUME },
            "Resume Simulation"
        );
    }

    public abortRemoteSim(): void {
        if (!this.socketIsValid()) {
            return;
        }
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

    public gotoRemoteSimulationTime(time: number): void {
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
