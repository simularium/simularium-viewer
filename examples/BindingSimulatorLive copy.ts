import { System, Circle, Response, rad2deg, deg2rad } from "detect-collisions";

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
import { Vector } from "sat";
import { GeometryDisplayType } from "../src/visGeometry/types";

const MAX_DISTANCE = 0;
const NUDGE_DISTANCE = 0.4;
class BindingInstance extends Circle {
    id: number;
    child: BindingInstance | null;
    bound: boolean;
    partners: number[];
    constructor(circle, id, partners) {
        super(circle.pos, circle.r);
        this.id = id;
        this.partners = partners;
        this.bound = false;
        this.child = null;
    }

    private adjust(dxClosest, dyClosest, neededDistance, curDistance) {
        const slope = dyClosest / dxClosest;
        let dy = (neededDistance * dyClosest) / curDistance;
        let dx = dy / slope;

        this.x = this.x + dx - dxClosest;
        this.y = this.y + dy - dyClosest;
        if (this.child) {
            this.child.x = this.child.x + dx - dxClosest;
            this.child.y = this.child.y + dy - dyClosest;
        }
    }
}

const size = 100;

export default class BindingSimulator implements IClientSimulatorImpl {
    instances: BindingInstance[];
    currentFrame: number;
    agents: { id: number; radius: number }[] = [];
    system: System;
    constructor(agents) {
        this.system = new System();
        this.agents = agents;
        this.instances = [];
        this.system.createLine(
            new Vector(-size / 2, -size / 2),
            new Vector(-size / 2, size / 2),
            { isStatic: true }
        );
        this.system.createLine(
            new Vector(-size / 2, size / 2),
            new Vector(size / 2, size / 2),
            { isStatic: true }
        );
        this.system.createLine(
            new Vector(size / 2, size / 2),
            new Vector(size / 2, -size / 2),
            { isStatic: true }
        );
        this.system.createLine(
            new Vector(size / 2, -size / 2),
            new Vector(-size / 2, -size / 2),
            { isStatic: true }
        );
        for (let i = 0; i < agents.length; ++i) {
            const agent = agents[i];
            for (let j = 0; j < agent.count; ++j) {
                const position: number[] = this.getRandomPointOnSide(i);
                const circle = new Circle(
                    new Vector(...position),
                    agent.radius
                );
                const instance = new BindingInstance(
                    circle,
                    agent.id,
                    agent.partners
                );
                this.system.insert(instance);
                this.instances.push(instance);
            }
        }
        this.currentFrame = 0;
        this.system.separate();
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

    private getRandomPointOnSide(side) {
        const dAlongSide = this.randomFloat(-size / 2, size / 2);
        const dFromSide = this.randomFloat(0, size / 2 );

        switch (side) {
            case 0:
                return [dFromSide, dAlongSide];
            case 1:
                return [-dFromSide, dAlongSide];
            case 3:
                return [dAlongSide, -dFromSide];
            case 4:
                return [dAlongSide, dFromSide];
        }
    }

    public move(circle: BindingInstance) {
        if (circle.bound) {
            return;
        }

        const amplitude = 1;
        let xStep = random(-amplitude, amplitude);
        let yStep = random(-amplitude, amplitude);
        let posX = circle.pos.x + xStep;
        let posY = circle.pos.y + yStep;
        const edge = size / 2;

        if (posX > edge + circle.r) {
            const over = posX - edge;
            xStep = xStep - over;
        }
        if (posX < -edge - circle.r) {
            const over = posX + edge;

            xStep = xStep - over;
        }
        if (posY > edge + circle.r) {
            yStep = yStep - size;
        }
        if (posY < -edge - circle.r) {
            yStep = size + yStep;
        }
        circle.setPosition(circle.pos.x + xStep, circle.pos.y + yStep);
        if (circle.child) {
            const angle = random(-Math.PI/2, Math.PI/2);
            const center = this.findCenter(circle, circle.child);
            const newCirclePosition = this.rotate(
                circle.pos.x,
                circle.pos.y,
                angle,
                center
            );
            circle.setPosition(newCirclePosition[0], newCirclePosition[1]);
            const childPosX = circle.child.pos.x + xStep;
            const childPosY = circle.child.pos.y + yStep;
            const childPosAndRotation = this.rotate(
                childPosX,
                childPosY,
                angle,
                center
            );
            circle.child.setPosition(
                childPosAndRotation[0],
                childPosAndRotation[1]
            );
        }
    }

    private rotate(x, y, angle, center: number[]) {
        // center of rotation is (𝛼,𝛽) and the rotation angle is 𝜃
        //(𝑥,𝑦)↦(𝑥′,𝑦′)=(𝛼+(𝑥−𝛼)cos𝜃−(𝑦−𝛽)sin𝜃, 𝛽+(𝑥−𝛼)sin𝜃+(𝑦−𝛽)cos𝜃).
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const newX = center[0] + (x - center[0]) * cos - (y - center[1]) * sin;
        const newY = center[1] + (x - center[0]) * sin + (y - center[1]) * cos;
        return [newX, newY];
    }

    private findCenter(agent: BindingInstance, ligand: BindingInstance) {
        const dx = ligand.pos.x - agent.pos.x;
        const dy = ligand.pos.y - agent.pos.y;
        const halfdx = dx / 2;
        const halfdy = dy / 2;
        const x = agent.pos.x + halfdx;
        const y = agent.pos.y + halfdy;
        return [x, y];
    }

    private bind(agent: BindingInstance, ligand: BindingInstance) {
        if (ligand.bound || agent.child) {
            return true;
        }
        const willBind = random(0, 1) > 0.5;
        if (!willBind) {
            return false;
        }
        // a is the ligand
        agent.child = ligand;
        agent.isStatic = true;
        ligand.bound = true;
        ligand.isStatic = true;
        return false;
    }

    private makePoints(): number[] {
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
    }

    public update(_dt: number): VisDataMessage {
        //const dt_adjusted = dt / 1000;
        for (let ii = 0; ii < this.instances.length; ++ii) {
            this.move(this.instances[ii]);
        }
        this.system.checkAll((response: Response) => {
            const { a, b, overlapV, aInB, bInA } = response;

            if (response) {
                if (a.partners.includes(b.id)) {
                    let needToResolveCollision = false;
                    // a is the ligand
                    if (a.r < b.r) {
                        needToResolveCollision = this.bind(b, a);
                        if (needToResolveCollision) {
                            const dxClosest = b.pos.x - a.pos.x;
                            const dyClosest = b.pos.y - a.pos.y;
                            const curDistance = Math.sqrt(
                                dxClosest * dxClosest + dyClosest * dyClosest
                            );
                            const neededDistance = a.r + b.r;

                            b.adjust(
                                -dxClosest,
                                -dyClosest,
                                neededDistance,
                                curDistance
                            );
                        }
                    } else {
                        // b is the ligand
                        needToResolveCollision = this.bind(a, b);
                        if (needToResolveCollision) {
                            const dxClosest = b.pos.x - a.pos.x;
                            const dyClosest = b.pos.y - a.pos.y;
                            const curDistance = Math.sqrt(
                                dxClosest * dxClosest + dyClosest * dyClosest
                            );
                            const neededDistance = a.r + b.r;
                            a.adjust(
                                dxClosest,
                                dyClosest,
                                neededDistance,
                                curDistance
                            );
                        }
                    }
                } else {
                    a.setPosition(a.pos.x - overlapV.x, a.pos.y - overlapV.y);
                }
            }
        });
        this.system.separate();
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
            agentData.push(instance.pos.x); // x
            agentData.push(instance.pos.y); // y
            agentData.push(0); // z
            agentData.push(0); // rx
            agentData.push(0); // ry
            agentData.push(0); // rz
            agentData.push(instance.r); // collision radius
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
                geometry: {
                    color: "#81dbe6",
                    displayType: GeometryDisplayType.SPHERE,
                },
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
                magnitude: 10,
                name: "nm",
            },
            timeUnits: {
                magnitude: 100,
                name: "ns",
            },
        };
    }
}
