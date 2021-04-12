import jsLogger from "js-logger";
import { ILogger } from "js-logger";

import { VisDataMessage, TrajectoryFileInfoV2 } from "./types";
import { NetConnection } from "./NetConnection";
import {
    ClientMessageEnum,
    ClientPlayBackType,
} from "./localSimulators/IClientSimulator";
import { createSimulator } from "./localSimulators/ClientSimulatorFactory";

const localSimulator = createSimulator({
    name: "my curve sim",
    type: "CURVESIM",
    nCurves: 1000,
    nTypes: 4,
});

// setInterval is the playback engine for now
let simulatorIntervalId = 0;

export class SimulatorConnection extends NetConnection {
    protected logger: ILogger;
    public onTrajectoryFileInfoArrive: (msg: TrajectoryFileInfoV2) => void;
    public onTrajectoryDataArrive: (msg: VisDataMessage) => void;

    public constructor() {
        super({});
        this.logger = jsLogger.get("netconnection");
        this.logger.setLevel(jsLogger.DEBUG);

        this.onTrajectoryFileInfoArrive = () => {
            /* do nothing */
        };
        this.onTrajectoryDataArrive = () => {
            /* do nothing */
        };
        console.log("NEW SIMULATORCONNECTION");
    }

    public socketIsValid(): boolean {
        return true;
    }

    /**
     * WebSocket Connect
     * */
    public connectToUri(uri: string): void {
        if (this.socketIsValid()) {
            this.disconnect();
        }
        this.logger.debug("WS Connection Request Sent: ", uri);
    }

    public disconnect(): void {
        if (!this.socketIsValid()) {
            this.logger.warn("disconnect failed, client is not connected");
            return;
        }
    }

    public getIp(): string {
        return "";
    }

    public connectToRemoteServer(address: string): Promise<string> {
        return Promise.resolve("Remote sim successfully started");
    }

    private sendSimulationRequest(
        jsonData: Record<string, unknown>,
        requestDescription: string
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
                    if (jsonData["frameNumber"]) {
                        const frame = localSimulator.update(
                            jsonData["frameNumber"] as number
                        );
                        this.onTrajectoryDataArrive(frame);
                    } else {
                        const a: TrajectoryFileInfoV2 = localSimulator.getInfo();
                        this.onTrajectoryFileInfoArrive(a);
                    }
                }
                break;
            case ClientMessageEnum.ID_VIS_DATA_PAUSE:
                {
                    window.clearInterval(simulatorIntervalId);
                    simulatorIntervalId = 0;
                }
                break;
            case ClientMessageEnum.ID_VIS_DATA_RESUME:
                {
                    simulatorIntervalId = window.setInterval(() => {
                        const frame = localSimulator.update(0);
                        this.onTrajectoryDataArrive(frame);
                    }, 1);
                }
                break;
            case ClientMessageEnum.ID_VIS_DATA_ABORT:
                {
                    window.clearInterval(simulatorIntervalId);
                    simulatorIntervalId = 0;
                }
                break;
            case ClientMessageEnum.ID_GOTO_SIMULATION_TIME:
                {
                    const frame = localSimulator.update(
                        jsonData["time"] as number
                    );
                    this.onTrajectoryDataArrive(frame);
                }
                break;
            case ClientMessageEnum.ID_INIT_TRAJECTORY_FILE:
                const a: TrajectoryFileInfoV2 = localSimulator.getInfo();
                console.log("receive trajectory file info");
                this.onTrajectoryFileInfoArrive(a);
                break;
        }
        // for frames:
        //        this.onTrajectoryDataArrive({});
    }

    /**
     * Websocket Update Parameters
     */
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
     * WebSocket Simulation Control
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

    public gotoRemoteSimulationTime(timeNanoSeconds: number): void {
        this.sendSimulationRequest(
            {
                msgType: ClientMessageEnum.ID_GOTO_SIMULATION_TIME,
                time: timeNanoSeconds,
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
