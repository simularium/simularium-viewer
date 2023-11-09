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
const NUDGE_DISTANCE = 0.4;
class Instance {
    id: number;
    radius: number;
    x: number;
    y: number;
    lastXStep: number;
    lastYStep: number;
    child: Instance;
    bound: boolean;
    closestParticles: Instance[];
    constructor(id, radius, posx, posy) {
        this.id = id;
        this.radius = radius;
        this.x = posx;
        this.y = posy;
        this.bound = false;
    }

    private adjust(dxClosest, dyClosest, neededDistance, curDistance) {
        const slope = dyClosest / dxClosest;
        let dy = neededDistance * dyClosest / curDistance ;
        let dx = dy / slope;

        this.x = this.x + dx - dxClosest;
        this.y = this.y + dy - dyClosest;
        if (this.child) {
            this.child.x = this.child.x + dx - dxClosest;
            this.child.y = this.child.y + dy - dyClosest;
        }
    }

    public move(amplitude) {
        if (this.bound) {
            return;
        }
        let xStep = random(-amplitude, amplitude);
        let yStep = random(-amplitude, amplitude);

        let posX = this.x + xStep;
        let posY = this.y + yStep;
        const edge = size / 2;

        if (posX > edge + this.radius) {
            xStep = xStep - size;
        }
        if (posX < -edge - this.radius) {
            xStep = size + xStep;
        }
        if (posY > edge + this.radius) {
            yStep = yStep - size;
        }
        if (posY < -edge - this.radius) {
            yStep = size + yStep;
        }
        this.x += xStep;
        this.y += yStep;
        this.lastXStep = xStep;
        this.lastYStep = yStep;
        if (this.child) {
            this.child.x += xStep;
            this.child.y += yStep;
        }
    }

    public setClosest(closest) {
        this.closestParticles = closest;
    }

    private isBindingPair(instance) {
        return this.child === instance || this === instance.child;
    }

    private checkCollision(closeParticle) {
        if (this.isBindingPair(closeParticle)) {
            return;
        }
        var dxClosest = this.x - closeParticle.x;
        var dyClosest = this.y - closeParticle.y;
        var distClosest = Math.sqrt(dxClosest ** 2 + dyClosest ** 2);
        const neededDistance = this.radius + closeParticle.radius;
        const adjustSize = distClosest - neededDistance;

        if (adjustSize < 0) {
            const isLigand = this.radius < closeParticle.radius;
            const additionalDistance = random(0, NUDGE_DISTANCE);
            if (closeParticle.id !== this.id) {
                if (isLigand) {
                    if (this.bound) {
                        return;
                    }
                    if (closeParticle.child) {
                        return this.adjust(
                            dxClosest,
                            dyClosest,
                            neededDistance,
                            distClosest
                        );
                    } else {
                        this.adjust(
                            dxClosest,
                            dyClosest,
                            neededDistance,
                            distClosest
                        );
                        closeParticle.child = this;
                        this.bound = true;
                    }
                } else {
                    if (closeParticle.bound) {
                        return;
                    }
                    if (this.child) {
                        return closeParticle.adjust(
                            dxClosest,
                            dyClosest,
                            neededDistance,
                            distClosest
                        );
                    } else {
                        closeParticle.adjust(
                            dxClosest,
                            dyClosest,
                            neededDistance,
                            distClosest
                        );
                        this.child = closeParticle;
                        closeParticle.bound = true;
                    }
                }
            }
            // both are ligands
            if (isLigand) {
                if (!this.bound) {
                    this.adjust(dxClosest, dyClosest, neededDistance, distClosest);
                } else if (!closeParticle.bound) {
                    closeParticle.adjust(
                        dxClosest,
                        dyClosest,
                        neededDistance,
                        distClosest
                    );
                } else {
                    return;
                }
            } else {
                this.adjust(dxClosest, dyClosest, neededDistance, distClosest);
            }
        }
    }

    public checkCollisions() {
        if (!this.closestParticles.length) {
            return;
        }
        for (let i = 0; i < this.closestParticles.length; ++i) {
            this.checkCollision(this.closestParticles[i]);
        }
    }
}

const size = 100;

export default class BindingSimulator implements IClientSimulatorImpl {
    instances: Instance[];
    currentFrame: number;
    agents: { id: number; radius: number }[] = [];

    constructor(agents) {
        this.agents = agents;
        this.instances = [];
        for (let i = 0; i < agents.length; ++i) {
            const agent = agents[i];
            for (let j = 0; j < agent.count; ++j) {
                const position = this.makePoints();
                this.instances.push(
                    new Instance(
                        agent.id,
                        agent.radius,
                        position[0],
                        position[1]
                    )
                );
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
        return [this.randomFloat(xmin, xmax), this.randomFloat(ymin, ymax)];
    }

    private getClosest(toCheck) {
        let currentDistance = Infinity;
        let closest: Instance[] = [];

        for (var i = this.instances.length; i--; ) {
            var current = this.instances[i];
            if (toCheck !== current) {
                var dx = current.x - toCheck.x;
                var dy = current.y - toCheck.y;
                var d = Math.sqrt(dx ** 2 + dy ** 2) - current.radius - toCheck.radius;
                if (d < 8) {
                    // currentDistance = d;
                    closest.push(current);
                }
            }
        }

        return closest;
    }

    private makePoints() {
        return this.getRandomPointInBox(
            -size / 2,
            size / 2,
            -size / 2,
            size / 2
        );
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
            agentData.push(
                instance.bound || instance.child
                    ? 100 + instance.id
                    : instance.id
            ); // instance id
            agentData.push(
                instance.bound || instance.child
                    ? 100 + instance.id
                    : instance.id
            ); // type
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
            typeMapping[this.agents[i].id] = {
                name: `${this.agents[i].id}`,
            };
            typeMapping[this.agents[i].id + 100] = {
                name: `${this.agents[i].id}#bound`,
            };
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
