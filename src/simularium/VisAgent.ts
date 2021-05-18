import {
    CatmullRomCurve3,
    Color,
    LineCurve3,
    Mesh,
    MeshBasicMaterial,
    Object3D,
    SphereBufferGeometry,
    TubeBufferGeometry,
    Vector3,
} from "three";

import PDBModel from "./PDBModel";
import VisTypes from "./VisTypes";
import { AgentData } from "./VisData";

// function getHighlightColor(color: Color): Color {
//     const hiColor = new Color(color);
//     let hsl: {
//         h: number;
//         s: number;
//         l: number;
//     } = { h: 0, s: 0, l: 0 };
//     hsl = hiColor.getHSL(hsl);
//     // increase luminance 80% of the difference toward max
//     hiColor.setHSL(hsl.h, hsl.s, hsl.l + 0.8 * (1.0 - hsl.l));
//     return hiColor;
// }

const NO_AGENT = -1;

export default class VisAgent {
    private static readonly UNASSIGNED_MESH_COLOR = 0xff00ff;
    public static readonly UNASSIGNED_NAME_PREFIX = "Unassigned";
    public static sphereGeometry: SphereBufferGeometry = new SphereBufferGeometry(
        1,
        32,
        32
    );
    // // this material only used in webGL1 fallback rendering mode
    // private static followMaterial: MeshBasicMaterial = new MeshBasicMaterial({
    //     color: new Color(0.14, 1, 0),
    // });

    public agentData: AgentData;

    public mesh: Object3D;
    public fiberCurve?: CatmullRomCurve3;
    // TODO can this default to a trivial single-atom pdb model?
    public pdbModel?: PDBModel;
    public pdbObjects: Object3D[];
    public lod: number;
    public typeId: number;
    public colorIndex: number;
    public active: boolean;
    public color: Color;
    public name: string;
    public followed: boolean;
    public highlighted: boolean;
    public hidden: boolean;
    public visType: number;
    public id: number;

    public constructor(name: string) {
        this.agentData = {
            x: 0,
            y: 0,
            z: 0,
            xrot: 0,
            yrot: 0,
            zrot: 0,
            instanceId: NO_AGENT,
            visType: VisTypes.ID_VIS_TYPE_DEFAULT,
            type: 0,
            cr: 1.0,
            subpoints: [],
        };
        this.id = NO_AGENT;
        this.visType = VisTypes.ID_VIS_TYPE_DEFAULT;
        this.name = name;
        this.color = new Color(VisAgent.UNASSIGNED_MESH_COLOR);
        this.active = false;
        this.typeId = -1;
        this.colorIndex = 0;
        this.followed = false;
        this.hidden = false;
        this.highlighted = false;
        this.mesh = new Mesh(VisAgent.sphereGeometry);
        this.mesh.userData = { id: this.id };
        this.mesh.visible = false;

        this.fiberCurve = undefined;

        this.pdbModel = undefined;
        this.pdbObjects = [];
        this.lod = 0;
    }

    public resetMesh(): void {
        this.id = NO_AGENT;
        this.visType = VisTypes.ID_VIS_TYPE_DEFAULT;
        this.typeId = -1;
        this.mesh = new Mesh(VisAgent.sphereGeometry);
        this.mesh.userData = { id: this.id };
        this.followed = false;
        this.highlighted = false;
        this.setColor(new Color(VisAgent.UNASSIGNED_MESH_COLOR), 0);
        this.agentData = {
            x: 0,
            y: 0,
            z: 0,
            xrot: 0,
            yrot: 0,
            zrot: 0,
            instanceId: NO_AGENT,
            visType: VisTypes.ID_VIS_TYPE_DEFAULT,
            type: 0,
            cr: 1.0,
            subpoints: [],
        };
    }

    public resetPDB(): void {
        this.pdbModel = undefined;
        this.pdbObjects = [];
        this.lod = 0;
    }

    public setColor(color: Color, colorIndex: number): void {
        this.color = color;
        this.colorIndex = colorIndex;
        // because this is a new material, we need to re-install it on the geometry
        // TODO deal with highlight and selection state
        this.assignMaterial();
    }

    public setHidden(hidden: boolean): void {
        this.hidden = hidden;
    }

    public setFollowed(followed: boolean): void {
        this.followed = followed;
        this.assignMaterial();
    }

    public setHighlighted(highlighted: boolean): void {
        if (highlighted !== this.highlighted) {
            this.highlighted = highlighted;
            this.assignMaterial();
        }
    }

    private assignMaterial(): void {
        // if (this.mesh.name.includes("membrane")) {
        //     return this.assignMembraneMaterial();
        // }
        // let material = this.baseMaterial;
        // if (this.followed) {
        //     material = VisAgent.followMaterial;
        // } else if (this.highlighted) {
        //     material = this.highlightMaterial;
        // }
        // for (let i = 0; i < this.pdbObjects.length; ++i) {
        //     this.pdbObjects[
        //         i
        //     ].onBeforeRender = this.onAgentMeshBeforeRender.bind(this);
        // }
        // if (this.mesh instanceof Mesh) {
        //     this.mesh.material = material;
        //     this.mesh.onBeforeRender = this.onAgentMeshBeforeRender.bind(this);
        // } else {
        //     this.mesh.traverse((child) => {
        //         if (child instanceof Mesh) {
        //             child.material = material;
        //             child.onBeforeRender = this.onAgentMeshBeforeRender.bind(
        //                 this
        //             );
        //         }
        //     });
        // }
    }

    public assignMembraneMaterial(): void {
        // if (this.highlighted) {
        //     // at this time, assign separate material parameters to the faces and sides of the membrane
        //     const faceNames = LegacyRenderer.membraneData.faces.map((el) => {
        //         return el.name;
        //     });
        //     const sideNames = LegacyRenderer.membraneData.sides.map((el) => {
        //         return el.name;
        //     });
        //     this.mesh.traverse((child) => {
        //         if (child instanceof Mesh) {
        //             if (faceNames.includes(child.name)) {
        //                 child.material =
        //                     LegacyRenderer.membraneData.facesMaterial;
        //                 child.onBeforeRender = this.onAgentMeshBeforeRender.bind(
        //                     this
        //                 );
        //             } else if (sideNames.includes(child.name)) {
        //                 child.material =
        //                     LegacyRenderer.membraneData.sidesMaterial;
        //                 child.onBeforeRender = this.onAgentMeshBeforeRender.bind(
        //                     this
        //                 );
        //             }
        //         }
        //     });
        //     LegacyRenderer.membraneData.facesMaterial.uniforms.uvscale.value =
        //         LegacyRenderer.membraneData.facesUVScale;
        //     LegacyRenderer.membraneData.sidesMaterial.uniforms.uvscale.value =
        //         LegacyRenderer.membraneData.sidesUVScale;
        // } else {
        //     this.mesh.traverse((child) => {
        //         if (child instanceof Mesh) {
        //             child.material = this.baseMaterial;
        //             child.onBeforeRender = this.onAgentMeshBeforeRender.bind(
        //                 this
        //             );
        //         }
        //     });
        // }
    }

    public signedTypeId(): number {
        // Note, adding 1 to colorIndex because it can be 0 and the signed multiplier won't do anything.
        // This means we have to subtract 1 in the downstream code (the shaders) if we need the true value.
        return (this.colorIndex + 1) * (this.highlighted ? 1 : -1);
    }
    private onAgentMeshBeforeRender(
        this: VisAgent,
        renderer,
        scene,
        camera,
        geometry,
        material
        /* group */
    ): void {
        if (!material.uniforms) {
            return;
        }
        // colorIndex is not necessarily equal to typeId but is generally a 1-1 mapping.
        if (material.uniforms.typeId) {
            // negate the value if dehighlighted.
            // see implementation in CompositePass.ts for how the value is interpreted
            material.uniforms.typeId.value = this.signedTypeId();
            material.uniformsNeedUpdate = true;
        }
        if (material.uniforms.instanceId) {
            material.uniforms.instanceId.value = Number(this.id);
            material.uniformsNeedUpdate = true;
        }
        if (material.uniforms.radius) {
            material.uniforms.radius.value = (this.lod + 1) * 0.25; // * 8;
            material.uniformsNeedUpdate = true;
        }
    }

    public setupMeshGeometry(meshGeom: Object3D): void {
        // remember current transform
        const p = this.mesh.position;
        const r = this.mesh.rotation;
        const s = this.mesh.scale;

        const visible = this.mesh.visible;

        this.mesh = meshGeom.clone();
        this.mesh.userData = { id: this.id };

        this.mesh.visible = visible;
        // restore transform
        this.mesh.position.copy(p);
        this.mesh.rotation.copy(r);
        this.mesh.scale.copy(s);

        this.assignMaterial();
    }

    public setupPdb(pdb: PDBModel): void {
        this.pdbModel = pdb;
        this.pdbObjects = pdb.instantiate();

        this.assignMaterial();
    }

    public selectLOD(index: number): void {
        this.setPDBInvisible();
        if (index < 0 || index >= this.pdbObjects.length) {
            index = this.pdbObjects.length - 1;
        }
        this.lod = index;
        this.pdbObjects[index].visible = true;
    }

    public setPDBInvisible(): void {
        for (let j = 0; j < this.pdbObjects.length; ++j) {
            this.pdbObjects[j].visible = false;
        }
    }

    public renderAsMesh(): void {
        this.setPDBInvisible();
        this.mesh.visible = true;
    }

    public renderAsPDB(
        myDistance: number,
        distanceStops: number[],
        lodBias: number
    ): void {
        this.mesh.visible = false;

        for (let j = 0; j < distanceStops.length; ++j) {
            // the first distance less than.
            if (myDistance < distanceStops[j]) {
                this.selectLOD(j + lodBias);
                break;
            }
        }
    }

    public hide(): void {
        this.mesh.visible = false;
        this.setPDBInvisible();
    }

    public hideAndDeactivate(): void {
        this.hide();
        this.active = false;
    }

    public hasDrawablePDB(): boolean {
        return (
            this.pdbModel !== undefined &&
            this.pdbModel.pdb !== null &&
            this.pdbObjects.length > 0 &&
            !this.pdbModel.name.startsWith(VisAgent.UNASSIGNED_NAME_PREFIX)
        );
    }

    public updateFiber(subpoints: number[]): void {
        const numSubPoints = subpoints.length;
        const numPoints = numSubPoints / 3;
        if (numSubPoints % 3 !== 0) {
            console.warn(
                "Warning, subpoints array does not contain a multiple of 3"
            );
            return;
        }
        if (numPoints < 2) {
            console.warn(
                "Warning, subpoints array does not have enough points for a curve"
            );
            return;
        }
        // put all the subpoints into a Vector3[]
        const curvePoints: Vector3[] = [];
        for (let j = 0; j < numSubPoints; j += 3) {
            const x = subpoints[j];
            const y = subpoints[j + 1];
            const z = subpoints[j + 2];
            curvePoints.push(new Vector3(x, y, z));
        }

        // set up new fiber as curved tube
        this.fiberCurve = new CatmullRomCurve3(curvePoints);
    }

    // make a single generic fiber and return it
    public static makeFiber(): Mesh {
        const fibercurve = new LineCurve3(
            new Vector3(0, 0, 0),
            new Vector3(1, 1, 1)
        );
        const geometry = new TubeBufferGeometry(fibercurve, 1, 1, 1, false);
        const fiberMesh = new Mesh(geometry);
        fiberMesh.name = `Fiber`;

        // downstream code will switch this flag
        fiberMesh.visible = false;
        return fiberMesh;
    }

    public getFollowPosition(): Vector3 {
        if (this.visType === VisTypes.ID_VIS_TYPE_FIBER && this.fiberCurve) {
            return this.fiberCurve.getPoint(0.5);
        } else {
            return new Vector3(
                this.agentData.x,
                this.agentData.y,
                this.agentData.z
            );
        }
    }
}
