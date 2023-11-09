import "oimo-esm/build/oimo.min.js";

import { Matrix4, Euler, Quaternion } from "three";

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
import { GeometryDisplayType } from "../src/visGeometry/types";

export default class PhysicsSim implements IClientSimulatorImpl {
    nPoints: number;
    currentFrame: number;
    nTypes: number;
    world: any; //OIMO.World;
    bodies: any[]; //OIMO.Body[];
    agentData: number[];

    constructor(nPoints: number, nTypes: number) {
        this.nPoints = nPoints;
        // moving sphere, moving box, sleeping sphere, sleeping box
        this.nTypes = 4; //nTypes;
        this.currentFrame = 0;
        this.world = new OIMO.World({ info: true, worldscale: 100 });
        this.agentData = [];
        this.populate(this.nPoints);
    }

    private populate(n) {
        // The Bit of a collision group
        var group1 = 1 << 0; // 00000000 00000000 00000000 00000001
        var group2 = 1 << 1; // 00000000 00000000 00000000 00000010
        var group3 = 1 << 2; // 00000000 00000000 00000000 00000100
        var all = 0xffffffff; // 11111111 11111111 11111111 11111111

        var max = this.nPoints;

        let type = 3;

        // reset old
        this.world.clear();
        this.bodies = [];

        // Is all the physics setting for rigidbody
        var config = [
            1, // The density of the shape.
            0.4, // The coefficient of friction of the shape.
            0.2, // The coefficient of restitution of the shape.
            1, // The bits of the collision groups to which the shape belongs.
            0xffffffff, // The bits of the collision groups with which the shape collides.
        ];

        //add ground
        var ground = this.world.add({
            size: [400, 40, 400],
            pos: [0, -20, 0],
            config: config,
        });
        // add agent // addStaticBox([400, 40, 400], [0,-20,0], [0,0,0]);

        var ground2 = this.world.add({
            size: [200, 30, 390],
            pos: [130, 40, 0],
            rot: [0, 0, 32],
            config: config,
        });
        // add agent // addStaticBox([200, 30, 390], [130,40,0], [0,0,32]);

        config[3] = group1;
        config[4] = all & ~group2; // all exepte groupe2
        var ground3 = this.world.add({
            size: [5, 100, 390],
            pos: [0, 40, 0],
            rot: [0, 0, 0],
            config: config,
        });
        // add agent // addStaticBox([5, 100, 390], [0,40,0], [0,0,0], true);

        // now add object
        var x, y, z, w, h, d;
        var i = max;

        const agentData: number[] = [];
        while (i--) {
            const t = type === 3 ? Math.floor(Math.random() * 2) + 1 : type;
            x = 150;
            z = -100 + Math.random() * 200;
            y = 100 + Math.random() * 1000;
            w = 10 + Math.random() * 10;
            h = 10 + Math.random() * 10;
            d = 10 + Math.random() * 10;

            config[4] = all;

            if (t === 1) {
                config[3] = group2;
                this.bodies[i] = this.world.add({
                    type: "sphere",
                    size: [w * 0.5],
                    pos: [x, y, z],
                    move: true,
                    config: config,
                });
                //meshs[i] = new THREE.Mesh( buffgeoSphere, matSphere );
                //meshs[i].scale.set( w*0.5, w*0.5, w*0.5 );
                agentData.push(VisTypes.ID_VIS_TYPE_DEFAULT); // vis type
                agentData.push(i); // instance id
                agentData.push(t - 1); // type
                agentData.push(x);
                agentData.push(y);
                agentData.push(z);
                agentData.push(0); // rx
                agentData.push(0); // ry
                agentData.push(0); // rz
                agentData.push(w * 0.5); // collision radius
                agentData.push(0); // subpoints
            } else if (t === 2) {
                config[3] = group3;
                this.bodies[i] = this.world.add({
                    type: "box",
                    size: [w, h, d],
                    pos: [x, y, z],
                    move: true,
                    config: config,
                });
                //meshs[i] = new THREE.Mesh( buffgeoBox, matBox );
                //meshs[i].scale.set( w, h, d );
                agentData.push(VisTypes.ID_VIS_TYPE_DEFAULT); // vis type
                agentData.push(i); // instance id
                agentData.push(t - 1); // type
                agentData.push(x);
                agentData.push(y);
                agentData.push(z);
                agentData.push(0); // rx
                agentData.push(0); // ry
                agentData.push(0); // rz
                agentData.push(w); // collision radius
                agentData.push(0); // subpoints
            }

            //meshs[i].castShadow = true;
            //meshs[i].receiveShadow = true;

            //scene.add( meshs[i] );
        }
        this.agentData = agentData;
    }

    public update(_dt: number): VisDataMessage {
        this.world.step();

        var p, r, m, x, y, z;
        var mtx = new Matrix4();
        var i = this.bodies.length;
        var mesh;
        var body;
        const e = new Euler();
        const q = new Quaternion();
        while (i--) {
            body = this.bodies[i];
            //mesh = meshs[i];
            const btype = body.shapes.type;

            if (!body.sleeping) {
                const p = body.getPosition();
                this.agentData[i * 11 + 3] = p.x;
                this.agentData[i * 11 + 4] = p.y - 550;
                this.agentData[i * 11 + 5] = p.z;
                const bq = body.getQuaternion();
                q.set(bq.x, bq.y, bq.z, bq.w);
                e.setFromQuaternion(q);
                this.agentData[i * 11 + 6] = isNaN(e.x) ? 0.0 : e.x;
                this.agentData[i * 11 + 7] = isNaN(e.y) ? 0.0 : e.y;
                this.agentData[i * 11 + 8] = isNaN(e.z) ? 0.0 : e.z;

                //mesh.position.copy(body.getPosition());
                //mesh.quaternion.copy(body.getQuaternion());

                // change material
                // set type based on orig type
                if (btype === OIMO.SHAPE_SPHERE) {
                    this.agentData[i * 11 + 2] = 0;
                } else if (btype === OIMO.SHAPE_BOX) {
                    this.agentData[i * 11 + 2] = 1;
                }
                //if (mesh.material.name === "sbox") mesh.material = matBox;
                //if (mesh.material.name === "ssph") mesh.material = matSphere;

                // reset position
                if (p.y < -100) {
                    x = 150;
                    z = -100 + Math.random() * 200;
                    y = 100 + Math.random() * 1000;
                    body.resetPosition(x, y, z);
                }
            } else {
                // set type based on asleep type
                if (btype === OIMO.SHAPE_SPHERE) {
                    this.agentData[i * 11 + 2] = 2;
                } else if (btype === OIMO.SHAPE_BOX) {
                    this.agentData[i * 11 + 2] = 3;
                }
            }
        }
        const frameData: VisDataMessage = {
            // TODO get msgType out of here
            msgType: ClientMessageEnum.ID_VIS_DATA_ARRIVE,
            bundleStart: this.currentFrame,
            bundleSize: 1, // frames
            bundleData: [
                {
                    data: this.agentData,
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
        const colors = ["#ff0000", "#00ff00", "#0000ff", "#00ffff"];
        const meshes = [
            "https://raw.githubusercontent.com/McNopper/OpenGL/master/Binaries/teapot.obj",
            "https://raw.githubusercontent.com/McNopper/OpenGL/master/Binaries/monkey.obj",
            "https://raw.githubusercontent.com/McNopper/OpenGL/master/Binaries/teapot.obj",
            "https://raw.githubusercontent.com/McNopper/OpenGL/master/Binaries/monkey.obj",
        ];
        for (let i = 0; i < this.nTypes; ++i) {
            typeMapping[i] = {
                name: `point${i}`,
                geometry: {
                    displayType: GeometryDisplayType.OBJ,
                    url: meshes[i],
                    color: colors[i],
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
                x: 500,
                y: 1500,
                z: 500,
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
            cameraDefault: {
                position: {
                    x: 0,
                    y: 0,
                    z: -1000,
                },
                lookAtPosition: {
                    x: 0,
                    y: 0,
                    z: 0,
                },
                upVector: {
                    x: 0,
                    y: 1,
                    z: 0,
                },
                fovDegrees: 75,
            },
        };
    }

    updateSimulationState(data: Record<string, unknown>) {}
}
