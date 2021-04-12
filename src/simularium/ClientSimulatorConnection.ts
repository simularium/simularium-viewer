import jsLogger from "js-logger";
import { ILogger } from "js-logger";

import VisTypes from "./VisTypes";
import {
    VisDataMessage,
    TrajectoryFileInfoV2,
    EncodedTypeMapping,
} from "./types";
import { NetConnection } from "./NetConnection";

class CurveSim {
    nCurves: number;
    curveData: number[];
    nPointsPerCurve: number;
    currentFrame: number;
    nTypes: number;

    constructor(nCurves: number, nTypes: number) {
        this.nCurves = nCurves;
        this.nTypes = nTypes;
        this.nPointsPerCurve = 5;
        this.curveData = this.makeCurveBundle(nCurves, this.nPointsPerCurve);
        this.currentFrame = 0;
    }

    private randomFloat(min, max) {
        if (max === undefined) {
            max = min;
            min = 0;
        }
        return Math.random() * (max - min) + min;
    }

    private randomSpherePoint(x0, y0, z0, radius): number[] {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const x = x0 + radius * Math.sin(phi) * Math.cos(theta);
        const y = y0 + radius * Math.sin(phi) * Math.sin(theta);
        const z = z0 + radius * Math.cos(phi);
        return [x, y, z];
    }
    private randomPtInBox(xmin, xmax, ymin, ymax, zmin, zmax) {
        return [
            this.randomFloat(xmin, xmax),
            this.randomFloat(ymin, ymax),
            this.randomFloat(zmin, zmax),
        ];
    }

    private makeCurveBundle(nCurves, nPts) {
        const curves: number[] = [];
        let p: number[];
        if (nPts === 3) {
            for (let i = 0; i < nCurves; ++i) {
                p = this.randomSpherePoint(0, 0, 0, 4.0);
                curves.push(p[0]);
                curves.push(p[1]);
                curves.push(p[2]);
                p = this.randomSpherePoint(0, 0, 0, 0.25);
                curves.push(p[0]);
                curves.push(p[1]);
                curves.push(p[2]);
                p = this.randomSpherePoint(0, 0, 0, 2.0);
                curves.push(p[0]);
                curves.push(p[1]);
                curves.push(p[2]);
            }
        } else if (nPts === 5) {
            for (let i = 0; i < nCurves; ++i) {
                p = this.randomPtInBox(-4, -3, -2, 2, -2, 2);
                curves.push(p[0]);
                curves.push(p[1]);
                curves.push(p[2]);
                p = this.randomPtInBox(-2.5, -2, -1, 1, -1, 1);
                curves.push(p[0]);
                curves.push(p[1]);
                curves.push(p[2]);
                p = this.randomPtInBox(-1, 1, -0.5, 0.5, -0.5, 0.5);
                curves.push(p[0]);
                curves.push(p[1]);
                curves.push(p[2]);
                p = this.randomPtInBox(2, 2.5, -1, 1, -1, 1);
                curves.push(p[0]);
                curves.push(p[1]);
                curves.push(p[2]);
                p = this.randomPtInBox(3, 4, -2, 2, -2, 2);
                curves.push(p[0]);
                curves.push(p[1]);
                curves.push(p[2]);
            }
        }
        return curves;
    }

    public update(dt: number): VisDataMessage {
        const nFloatsPerCurve = this.nPointsPerCurve * 3;
        //const dt_adjusted = dt / 1000;
        const amplitude = 0.05;
        for (let ii = 0; ii < this.nCurves; ++ii) {
            for (let jj = 0; jj < this.nPointsPerCurve; ++jj) {
                this.curveData[
                    ii * nFloatsPerCurve + jj * 3 + 0
                ] += this.randomFloat(-amplitude, amplitude);
                this.curveData[
                    ii * nFloatsPerCurve + jj * 3 + 1
                ] += this.randomFloat(-amplitude, amplitude);
                this.curveData[
                    ii * nFloatsPerCurve + jj * 3 + 2
                ] += this.randomFloat(-amplitude, amplitude);
            }
        }
        // fill agent data.
        const agentData: number[] = [];
        for (let ii = 0; ii < this.nCurves; ++ii) {
            agentData.push(VisTypes.ID_VIS_TYPE_FIBER); // vis type
            agentData.push(ii); // instance id
            agentData.push(ii % this.nTypes); // type
            agentData.push(0); // x
            agentData.push(0); // y
            agentData.push(0); // z
            agentData.push(0); // rx
            agentData.push(0); // ry
            agentData.push(0); // rz
            agentData.push(0.1); // collision radius
            agentData.push(nFloatsPerCurve);
            for (let jj = 0; jj < nFloatsPerCurve; ++jj) {
                agentData.push(this.curveData[ii * nFloatsPerCurve + jj]);
            }
        }
        const frameData: VisDataMessage = {
            msgType: NetMessageEnum.ID_VIS_DATA_ARRIVE,
            bundleStart: this.currentFrame,
            bundleSize: 1, // frames
            bundleData: [
                {
                    data: agentData,
                    frameNumber: this.currentFrame,
                    time: this.currentFrame,
                },
            ],
            fileName: "hello world",
        };
        this.currentFrame++;
        return frameData;
    }

    public getInfo(): TrajectoryFileInfoV2 {
        const typeMapping: EncodedTypeMapping = {};
        for (let i = 0; i < this.nTypes; ++i) {
            typeMapping[i] = { name: `fiber${i}` };
        }
        return {
            connId: "hello world",
            msgType: NetMessageEnum.ID_TRAJECTORY_FILE_INFO,
            version: 2,
            timeStepSize: 1,
            totalSteps: 1000,
            // bounding volume dimensions
            size: {
                x: 12,
                y: 12,
                z: 12,
            },
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
}

const curveSim = new CurveSim(1000, 4);
let curveSimIntervalId = 0;

// these have been set to correspond to backend values
export const enum NetMessageEnum {
    ID_UNDEFINED_WEB_REQUEST = 0,
    ID_VIS_DATA_ARRIVE = 1,
    ID_VIS_DATA_REQUEST = 2,
    ID_VIS_DATA_FINISH = 3,
    ID_VIS_DATA_PAUSE = 4,
    ID_VIS_DATA_RESUME = 5,
    ID_VIS_DATA_ABORT = 6,
    ID_UPDATE_TIME_STEP = 7,
    ID_UPDATE_RATE_PARAM = 8,
    ID_MODEL_DEFINITION = 9,
    ID_HEARTBEAT_PING = 10,
    ID_HEARTBEAT_PONG = 11,
    ID_TRAJECTORY_FILE_INFO = 12,
    ID_GOTO_SIMULATION_TIME = 13,
    ID_INIT_TRAJECTORY_FILE = 14,
    // insert new values here before LENGTH
    LENGTH,
}
// these have been set to correspond to backend values
const enum PlayBackType {
    ID_LIVE_SIMULATION = 0,
    ID_PRE_RUN_SIMULATION = 1,
    ID_TRAJECTORY_FILE_PLAYBACK = 2,
    // insert new values here before LENGTH
    LENGTH,
}

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
            case NetMessageEnum.ID_UPDATE_TIME_STEP:
                break;
            case NetMessageEnum.ID_UPDATE_RATE_PARAM:
                break;
            case NetMessageEnum.ID_MODEL_DEFINITION:
                break;
            case NetMessageEnum.ID_VIS_DATA_REQUEST:
                {
                    if (jsonData["frameNumber"]) {
                        const frame = curveSim.update(jsonData["frameNumber"]);
                        this.onTrajectoryDataArrive(frame);
                    } else {
                        const a: TrajectoryFileInfoV2 = curveSim.getInfo();
                        this.onTrajectoryFileInfoArrive(a);
                    }
                }
                break;
            case NetMessageEnum.ID_VIS_DATA_PAUSE:
                {
                    window.clearInterval(curveSimIntervalId);
                    curveSimIntervalId = 0;
                }
                break;
            case NetMessageEnum.ID_VIS_DATA_RESUME:
                {
                    curveSimIntervalId = window.setInterval(() => {
                        const frame = curveSim.update(0);
                        this.onTrajectoryDataArrive(frame);
                    }, 1);
                }
                break;
            case NetMessageEnum.ID_VIS_DATA_ABORT:
                {
                    window.clearInterval(curveSimIntervalId);
                    curveSimIntervalId = 0;
                }
                break;
            case NetMessageEnum.ID_GOTO_SIMULATION_TIME:
                {
                    const frame = curveSim.update(jsonData["time"]);
                    this.onTrajectoryDataArrive(frame);
                }
                break;
            case NetMessageEnum.ID_INIT_TRAJECTORY_FILE:
                const a: TrajectoryFileInfoV2 = curveSim.getInfo();
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
            msgType: NetMessageEnum.ID_UPDATE_TIME_STEP,
            timeStep: newTimeStep,
        };
        this.sendSimulationRequest(jsonData, "Update Time-Step");
    }

    public sendParameterUpdate(paramName: string, paramValue: number): void {
        if (!this.socketIsValid()) {
            return;
        }

        const jsonData = {
            msgType: NetMessageEnum.ID_UPDATE_RATE_PARAM,
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
            msgType: NetMessageEnum.ID_MODEL_DEFINITION,
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
            msgType: NetMessageEnum.ID_VIS_DATA_REQUEST,
            mode: PlayBackType.ID_PRE_RUN_SIMULATION,
            timeStep: timeStep,
            numTimeSteps: numTimeSteps,
        };

        this.connectToRemoteServer(this.getIp()).then(() => {
            this.sendSimulationRequest(jsonData, "Start Simulation Pre-Run");
        });
    }

    public startRemoteSimLive(): void {
        const jsonData = {
            msgType: NetMessageEnum.ID_VIS_DATA_REQUEST,
            mode: PlayBackType.ID_LIVE_SIMULATION,
        };

        this.connectToRemoteServer(this.getIp()).then(() => {
            this.sendSimulationRequest(jsonData, "Start Simulation Live");
        });
    }

    public startRemoteTrajectoryPlayback(fileName: string): Promise<void> {
        const jsonData = {
            msgType: NetMessageEnum.ID_VIS_DATA_REQUEST,
            mode: PlayBackType.ID_TRAJECTORY_FILE_PLAYBACK,
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
            { msgType: NetMessageEnum.ID_VIS_DATA_PAUSE },
            "Pause Simulation"
        );
    }

    public resumeRemoteSim(): void {
        if (!this.socketIsValid()) {
            return;
        }
        this.sendSimulationRequest(
            { msgType: NetMessageEnum.ID_VIS_DATA_RESUME },
            "Resume Simulation"
        );
    }

    public abortRemoteSim(): void {
        if (!this.socketIsValid()) {
            return;
        }
        this.sendSimulationRequest(
            { msgType: NetMessageEnum.ID_VIS_DATA_ABORT },
            "Abort Simulation"
        );
    }

    public requestSingleFrame(startFrameNumber: number): void {
        this.sendSimulationRequest(
            {
                msgType: NetMessageEnum.ID_VIS_DATA_REQUEST,
                mode: PlayBackType.ID_TRAJECTORY_FILE_PLAYBACK,
                frameNumber: startFrameNumber,
            },
            "Request Single Frame"
        );
    }

    public gotoRemoteSimulationTime(timeNanoSeconds: number): void {
        this.sendSimulationRequest(
            {
                msgType: NetMessageEnum.ID_GOTO_SIMULATION_TIME,
                time: timeNanoSeconds,
            },
            "Load single frame at specified Time"
        );
    }

    public requestTrajectoryFileInfo(fileName: string): void {
        this.sendSimulationRequest(
            {
                msgType: NetMessageEnum.ID_INIT_TRAJECTORY_FILE,
                fileName: fileName,
            },
            "Initialize trajectory file info"
        );
    }
}
