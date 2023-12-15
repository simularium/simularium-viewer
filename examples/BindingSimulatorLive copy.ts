import { System, Circle, Response } from "detect-collisions";

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

class BindingInstance extends Circle {
    id: number;
    child: BindingInstance | null;
    bound: boolean;
    partners: number[];
    kOn?: number;
    kOff?: number;
    constructor(circle, id, partners, kOn?, kOff?) {
        super(circle.pos, circle.r);
        this.id = id;
        this.partners = partners;
        this.bound = false;
        this.child = null;
        this.kOn = kOn;
        this.kOff = kOff;
    }

    public resolveCollision(other, overlapV, system) {
        this.adjust(other, overlapV);
    }

    public isBoundPair(other) {
        return this.child == other || other.child == this;
    }

    private move(x, y) {
        this.setPosition(this.pos.x + x, this.pos.y + y);
        if (this.child) {
            this.child.setPosition(this.child.pos.x + x, this.child.pos.y + y);
        }
    }

    private adjust(other, overlapV) {
        const { x, y } = overlapV;
        if (!this.bound) {
            this.move(-x, -y);
        } else if (!other.bound) {
            other.move(-x, -y);
        } else {
            //TODO: find parent and move the parent
        }
    }

    public rotateGroup(xStep, yStep) {
        if (!this.child) {
            return;
        }
        const angle = random(-Math.PI / 4, Math.PI / 4);
        const center = this.findCenter(this, this.child);
        const newCirclePosition = this.rotate(
            this.pos.x,
            this.pos.y,
            angle,
            center
        );
        this.setPosition(newCirclePosition[0], newCirclePosition[1]);
        const childPosX = this.child.pos.x + xStep;
        const childPosY = this.child.pos.y + yStep;
        const childPosAndRotation = this.rotate(
            childPosX,
            childPosY,
            angle,
            center
        );
        this.child.setPosition(childPosAndRotation[0], childPosAndRotation[1]);
    }

    public oneStep() {
        if (this.bound) {
            return;
        }

        const amplitude = 1;
        let xStep = random(-amplitude, amplitude, true);
        let yStep = random(-amplitude, amplitude, true);
        let posX = this.pos.x + xStep;
        let posY = this.pos.y + yStep;
        const edge = size / 2;

        if (posX > edge + this.r) {
            const over = posX - edge;
            xStep = xStep - over;
        }
        if (posX < -edge - this.r) {
            const over = posX + edge;
            xStep = xStep - over;
        }
        if (posY > edge + this.r) {
            yStep = yStep - size;
        }
        if (posY < -edge - this.r) {
            yStep = size + yStep;
        }
        this.setPosition(this.pos.x + xStep, this.pos.y + yStep);
        if (this.child) {
            this.rotateGroup(xStep, yStep);
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

    public unBind(ligand: BindingInstance) {
        if (ligand.kOff === undefined) {
            return;
        }
        const willUnBind = random(0, 1, true) > ligand.kOff;
        if (!willUnBind) {
            return;
        }
        this.child = null;
        this.isTrigger = false;
        ligand.bound = false;
        ligand.isTrigger = false;
        return;
    }

    public bind(ligand: BindingInstance) {
        if (ligand.bound || this.child) {
            // already have bound ligand or already bound
            // can't bind to another ligand
            return;
        }
        if (ligand.kOn === undefined) {
            return;
        }
        const willBind = random(0, 1, true) > ligand.kOn;
        if (!willBind) {
            return;
        }
        this.child = ligand;
        this.isTrigger = true;
        ligand.bound = true;
        ligand.isTrigger = true;
        return;
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
        this.createBoundingLines();
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
                    agent.partners,
                    agent.kOn,
                    agent.kOff
                );
                this.system.insert(instance);
                this.instances.push(instance);
            }
        }
        this.currentFrame = 0;
        this.system.separate();
    }

    private createBoundingLines() {
        const points = [
            [-size / 2, -size / 2],
            [-size / 2, size / 2],
            [size / 2, size / 2],
            [size / 2, -size / 2],
        ];
        points.forEach((point, index) => {
            const nextPoint = points[(index + 1) % points.length];
            this.system.createLine(
                new Vector(point[0], point[1]),
                new Vector(nextPoint[0], nextPoint[1]),
                { isStatic: true }
            );
        })
    }

    private randomFloat(min, max) {
        if (max === undefined) {
            max = min;
            min = 0;
        }
        return Math.random() * (max - min) + min;
    }

    private getRandomPointOnSide(side) {
        const dAlongSide = this.randomFloat(-size / 2, size / 2);
        const dFromSide = this.randomFloat(0, size / 2);

        switch (side) {
            case 0:
                return [dFromSide, dAlongSide];
            case 1:
                return [-dFromSide, dAlongSide];
            case 3:
                return [dAlongSide, -dFromSide];
            case 4:
                return [dAlongSide, dFromSide];
            default:
                return [dFromSide, dAlongSide];
        }
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
        for (let ii = 0; ii < this.instances.length; ++ii) {
            this.instances[ii].oneStep();
        }
        this.system.checkAll((response: Response) => {
            const { a, b, overlapV } = response;

            if (response) {
                if (a.isBoundPair(b)) {
                    if (a.r < b.r) {
                        b.unBind(a);
                    } else {
                        // b is the ligand
                        a.unBind(b);
                    }
                }
                if (a.partners.includes(b.id)) {
                    // a is the ligand
                    if (a.r < b.r) {
                        b.bind(a);
                    } else {
                        // b is the ligand
                        a.bind(b);
                    }
                }
                if (a.isTrigger && b.isTrigger && !a.isBoundPair(b)) {
                    a.resolveCollision(b, overlapV, this.system);
                }
            } else {
                console.log("no response");
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
