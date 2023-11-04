import {
    IClientSimulatorImpl,
    ClientMessageEnum,
} from "../src/simularium/localSimulators/IClientSimulatorImpl";
import {
    EncodedTypeMapping,
    TrajectoryFileInfo,
    VisDataMessage,
} from "../src/simularium/types";
import VisTypes from "../src/simularium/VisTypes";
import { DEFAULT_CAMERA_SPEC } from "../src/constants";
import { random } from "lodash";

const MAX_DISTANCE = 0;

class Instance {
    id: number;
    radius: number;
    x: number;
    y: number;
    closestParticle: Instance;
    constructor(id, radius, posx, posy) {
        this.id = id;
        this.radius = radius;
        this.x = posx;
        this.y = posy;
    }
    private adjust(dxClosest, dyClosest, distClosest) {
        const adjustSize =  this.radius - distClosest;
        // 6 = squrt (newx2 + newy2)
        // newx**2 = 6**2 - newy**2
        const slope = dyClosest / dxClosest;
        let newdx = Math.sqrt(adjustSize ** 2 / (1 + slope ** 2));
        let newdy = slope * newdx;

        this.x = this.x + newdx;
        this.y = this.y + newdy;


        if (!this.closestParticle) {
            return;
        }
        var newxClosest = this.closestParticle.x - this.x;
        var newyClosest = this.closestParticle.y - this.y;
        var newDistClosest =
            Math.sqrt(newxClosest * newxClosest + newyClosest * newyClosest) -
            this.closestParticle.radius;

        // if (distClosest < MAX_DISTANCE) {
        //     this.adjust(newxClosest, newyClosest, newDistClosest);
        // }
    };

    public move(amplitude) {
        let xStep = random(-amplitude, amplitude);
        this.x = this.x + xStep;

        let yStep = random(-amplitude, amplitude);
        this.y = this.y + yStep;
    }

    public setClosest(closest) {
        this.closestParticle = closest;
    }

    public checkCollisions() {
        var dxClosest = this.closestParticle.x - this.x;
        var dyClosest = this.closestParticle.y - this.y;
        var distClosest =
            Math.sqrt(dxClosest * dxClosest + dyClosest * dyClosest) -
            this.closestParticle.radius;
        if (distClosest - this.radius < 0) {
            this.adjust(dxClosest, dyClosest, distClosest);
        }
    }
}

const size = 100;

export default class BindingSimulator implements IClientSimulatorImpl {
    instances: Instance[];
    currentFrame: number;
    agents: { id: number; radius: number }[] = [];

    constructor(agents) {
        this.agents = agents
        this.instances = [];
        for (let i = 0; i < agents.length; ++i) {
            const agent = agents[i];
            for (let j = 0; j < agent.count; ++j) {
                const position = this.makePoints();
                this.instances.push(new Instance(agent.id, agent.radius,position[0], position[1]))
            }
        }
        this.currentFrame = 0;
    }

    private randomFloat(min, max) {
        if (max === undefined) {
            max = min;
            min = 0;
        }
        return Math.random() * (max - min) + min;
    }

    private getRandomPointInBox(xmin, xmax, ymin, ymax) {
        return [
            this.randomFloat(xmin, xmax),
            this.randomFloat(ymin, ymax),
        ];
    }

    private getClosest (toCheck) {
        let currentDistance = Infinity;
        let closest;

        for (var i = this.instances.length; i--; ) {
            var current = this.instances[i];
            if (toCheck !== current) {
                var dx = current.x - toCheck.x;
                var dy = current.y - toCheck.y;
                var d = dx * dx + dy * dy - current.radius * current.radius;
                if (d < currentDistance) {
                    currentDistance = d;
                    closest = current;
                }
            }
        }

        return closest;
    };

    private makePoints() {
        return  this.getRandomPointInBox(-size/2, size/2, -size/2, size/2);
     
    }

    public updateSimulationState(data: Record<string, unknown>) {
        // TODO a type definition to show the possible fields
        // data: {
        //     agents: {
        //         "1": {
        //             _updater: "accumulate",
        //             position: [0.1, 0, 0],
        //         },
        //     },
        // },

        const agents = data["agents"] as Record<string, unknown>;
        for (const agentid in agents) {
            const agent = agents[agentid] as Record<string, unknown>;
            const position = agent["position"] as number[];
            const id = parseInt(agentid);
            if (agent["_updater"] === "accumulate") {
                this.pointsData[id * 3 + 0] += position[0];
                this.pointsData[id * 3 + 1] += position[1];
                this.pointsData[id * 3 + 2] += position[2];
            } else {
                this.pointsData[id * 3 + 0] = position[0];
                this.pointsData[id * 3 + 1] = position[1];
                this.pointsData[id * 3 + 2] = position[2];
            }
        }
    }

    public update(_dt: number): VisDataMessage {
        //const dt_adjusted = dt / 1000;
        const amplitude = 0.5;
        for (let ii = 0; ii < this.instances.length; ++ii) {
            this.instances[ii].move(amplitude);
            this.instances[ii].setClosest(this.getClosest(this.instances[ii]));
            this.instances[ii].checkCollisions();
        }
        // fill agent data.
        const agentData: number[] = [];
        for (let ii = 0; ii < this.instances.length; ++ii) {
            const instance = this.instances[ii];
            agentData.push(VisTypes.ID_VIS_TYPE_DEFAULT); // vis type
            agentData.push(instance.id); // instance id
            agentData.push(instance.id); // type
            agentData.push(instance.x); // x
            agentData.push(instance.y); // y
            agentData.push(0); // z
            agentData.push(0); // rx
            agentData.push(0); // ry
            agentData.push(0); // rz
            agentData.push(instance.radius); // collision radius
            agentData.push(0); // subpoints
        }
        const frameData: VisDataMessage = {
            // TODO get msgType out of here
            msgType: ClientMessageEnum.ID_VIS_DATA_ARRIVE,
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

    public getInfo(): TrajectoryFileInfo {
        const typeMapping: EncodedTypeMapping = {};
        for (let i = 0; i < this.agents.length; ++i) {
            typeMapping[i] = { name: `point${this.agents[i].id}` };
        }
        return {
            // TODO get msgType and connId out of here
            connId: "hello world",
            msgType: ClientMessageEnum.ID_TRAJECTORY_FILE_INFO,
            version: 2,
            timeStepSize: 1,
            totalSteps: 1000,
            // bounding volume dimensions
            size: {
                x: size,
                y: size,
                z: 1,
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
}
