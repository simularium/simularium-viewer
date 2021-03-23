import {
    CatmullRomCurve3,
    Color,
    Group,
    LineCurve3,
    Material,
    Mesh,
    MeshBasicMaterial,
    MeshLambertMaterial,
    Object3D,
    ShaderMaterial,
    SphereBufferGeometry,
    Vector2,
    Vector3,
    WebGLRenderer,
} from "three";

import FiberGeometry from "./rendering/FiberGeometry";
import MembraneShader from "./rendering/MembraneShader";
import PDBModel from "./PDBModel";
import VisTypes from "./VisTypes";
import { USE_INSTANCE_ENDCAPS } from "./VisTypes";

function getHighlightColor(color: Color): Color {
    const hiColor = new Color(color);
    let hsl: {
        h: number;
        s: number;
        l: number;
    } = { h: 0, s: 0, l: 0 };
    hsl = hiColor.getHSL(hsl);
    // increase luminance 80% of the difference toward max
    hiColor.setHSL(hsl.h, hsl.s, hsl.l + 0.8 * (1.0 - hsl.l));
    return hiColor;
}

const NO_AGENT = -1;

export default class VisAgent {
    private static readonly UNASSIGNED_MESH_COLOR = 0xff00ff;
    public static readonly UNASSIGNED_NAME_PREFIX = "Unassigned";
    public static sphereGeometry: SphereBufferGeometry = new SphereBufferGeometry(
        1,
        32,
        32
    );
    public static fiberEndcapGeometry: SphereBufferGeometry = new SphereBufferGeometry(
        1,
        8,
        8
    );
    // this material only used in webGL1 fallback rendering mode
    private static followMaterial: MeshBasicMaterial = new MeshBasicMaterial({
        color: new Color(0.14, 1, 0),
    });
    private static membraneData: {
        faces: { name: string }[];
        sides: { name: string }[];
        facesMaterial: ShaderMaterial;
        sidesMaterial: ShaderMaterial;
        facesUVScale: Vector2;
        sidesUVScale: Vector2;
    } = {
        faces: [{ name: "curved_5nm_Right" }, { name: "curved_5nm_Left" }],
        sides: [
            { name: "curved_5nm_Bottom" },
            { name: "curved_5nm_Top" },
            { name: "curved_5nm_Back" },
            { name: "curved_5nm_Front" },
        ],
        facesMaterial: MembraneShader.membraneShader.clone() as ShaderMaterial,
        sidesMaterial: MembraneShader.membraneShader.clone() as ShaderMaterial,
        facesUVScale: new Vector2(40.0, 40.0),
        sidesUVScale: new Vector2(2.0, 40.0),
    };
    public static updateMembrane(time: number, renderer: WebGLRenderer): void {
        VisAgent.membraneData.facesMaterial.uniforms.iTime.value = time;
        VisAgent.membraneData.sidesMaterial.uniforms.iTime.value = time;

        renderer.getDrawingBufferSize(
            VisAgent.membraneData.facesMaterial.uniforms.iResolution.value
        );
        renderer.getDrawingBufferSize(
            VisAgent.membraneData.sidesMaterial.uniforms.iResolution.value
        );
    }

    public mesh: Object3D;
    public fiberCurve?: CatmullRomCurve3;
    // TODO can this default to a trivial single-atom pdb model?
    public pdbModel?: PDBModel;
    public pdbObjects: Object3D[];
    public lod: number;
    public typeId: number;
    public colorIndex: number;
    public active: boolean;
    // this material only used in webGL1 fallback rendering mode
    public baseMaterial: Material;
    // this material only used in webGL1 fallback rendering mode
    public highlightMaterial: Material;
    public color: Color;
    public name: string;
    public followed: boolean;
    public highlighted: boolean;
    public hidden: boolean;
    public visType: number;
    public id: number;

    public constructor(name: string) {
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
        this.baseMaterial = new MeshLambertMaterial({
            color: new Color(this.color),
        });
        this.highlightMaterial = new MeshBasicMaterial({
            color: getHighlightColor(this.color),
            transparent: true,
            opacity: 1.0,
        });
        this.mesh = new Mesh(VisAgent.sphereGeometry, this.baseMaterial);
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
        this.mesh = new Mesh(VisAgent.sphereGeometry, this.baseMaterial);
        this.mesh.userData = { id: this.id };
        this.followed = false;
        this.highlighted = false;
        this.setColor(new Color(VisAgent.UNASSIGNED_MESH_COLOR), 0);
    }

    public resetPDB(): void {
        this.pdbModel = undefined;
        this.pdbObjects = [];
        this.lod = 0;
    }

    public setColor(color: Color, colorIndex: number): void {
        this.color = color;
        this.colorIndex = colorIndex;
        this.baseMaterial = new MeshLambertMaterial({
            color: new Color(this.color),
        });
        this.highlightMaterial = new MeshBasicMaterial({
            color: getHighlightColor(this.color),
            transparent: true,
            opacity: 1.0,
        });
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
        if (this.mesh.name.includes("membrane")) {
            return this.assignMembraneMaterial();
        }

        let material = this.baseMaterial;
        if (this.followed) {
            material = VisAgent.followMaterial;
        } else if (this.highlighted) {
            material = this.highlightMaterial;
        }

        for (let i = 0; i < this.pdbObjects.length; ++i) {
            this.pdbObjects[
                i
            ].onBeforeRender = this.onAgentMeshBeforeRender.bind(this);
        }

        if (this.mesh instanceof Mesh) {
            this.mesh.material = material;
            this.mesh.onBeforeRender = this.onAgentMeshBeforeRender.bind(this);
        } else {
            this.mesh.traverse((child) => {
                if (child instanceof Mesh) {
                    child.material = material;
                    child.onBeforeRender = this.onAgentMeshBeforeRender.bind(
                        this
                    );
                }
            });
        }
    }

    public assignMembraneMaterial(): void {
        if (this.highlighted) {
            // at this time, assign separate material parameters to the faces and sides of the membrane
            const faceNames = VisAgent.membraneData.faces.map((el) => {
                return el.name;
            });
            const sideNames = VisAgent.membraneData.sides.map((el) => {
                return el.name;
            });
            this.mesh.traverse((child) => {
                if (child instanceof Mesh) {
                    if (faceNames.includes(child.name)) {
                        child.material = VisAgent.membraneData.facesMaterial;
                        child.onBeforeRender = this.onAgentMeshBeforeRender.bind(
                            this
                        );
                    } else if (sideNames.includes(child.name)) {
                        child.material = VisAgent.membraneData.sidesMaterial;
                        child.onBeforeRender = this.onAgentMeshBeforeRender.bind(
                            this
                        );
                    }
                }
            });
            VisAgent.membraneData.facesMaterial.uniforms.uvscale.value =
                VisAgent.membraneData.facesUVScale;
            VisAgent.membraneData.sidesMaterial.uniforms.uvscale.value =
                VisAgent.membraneData.sidesUVScale;
        } else {
            this.mesh.traverse((child) => {
                if (child instanceof Mesh) {
                    child.material = this.baseMaterial;
                    child.onBeforeRender = this.onAgentMeshBeforeRender.bind(
                        this
                    );
                }
            });
        }
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

    public updateFiber(
        subpoints: number[],
        collisionRadius: number,
        scale: number
    ): void {
        // examine current curve and compare with new curve
        const oldNumPoints = this.fiberCurve
            ? this.fiberCurve.points.length
            : 0;

        // assume a known structure.
        // first child is fiber
        // second and third children are endcaps

        // put all the subpoints into a Vector3[]
        const curvePoints: Vector3[] = [];
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
        for (let j = 0; j < numSubPoints; j += 3) {
            const x = subpoints[j];
            const y = subpoints[j + 1];
            const z = subpoints[j + 2];
            curvePoints.push(new Vector3(x, y, z));
        }

        // set up new fiber as curved tube
        this.fiberCurve = new CatmullRomCurve3(curvePoints);

        if (oldNumPoints !== numPoints) {
            const fibergeometry = new FiberGeometry(
                this.fiberCurve,
                4 * (numPoints - 1), // 4 segments per control point
                collisionRadius * scale * 0.5,
                8, // could reduce this with depth?
                false
            );
            (this.mesh.children[0] as Mesh).geometry = fibergeometry;
        } else {
            const fibergeometry = (this.mesh.children[0] as Mesh)
                .geometry as FiberGeometry;
            fibergeometry.updateFromCurve(
                this.fiberCurve,
                collisionRadius * scale * 0.5
            );
        }

        if (this.mesh.children.length === 3) {
            // update transform of endcap 0
            const runtimeFiberEncapMesh0 = this.mesh.children[1] as Mesh;
            runtimeFiberEncapMesh0.position.x = curvePoints[0].x;
            runtimeFiberEncapMesh0.position.y = curvePoints[0].y;
            runtimeFiberEncapMesh0.position.z = curvePoints[0].z;
            runtimeFiberEncapMesh0.scale.x = collisionRadius * scale * 0.5;
            runtimeFiberEncapMesh0.scale.y = collisionRadius * scale * 0.5;
            runtimeFiberEncapMesh0.scale.z = collisionRadius * scale * 0.5;

            // update transform of endcap 1
            const runtimeFiberEncapMesh1 = this.mesh.children[2] as Mesh;
            runtimeFiberEncapMesh1.position.x =
                curvePoints[curvePoints.length - 1].x;
            runtimeFiberEncapMesh1.position.y =
                curvePoints[curvePoints.length - 1].y;
            runtimeFiberEncapMesh1.position.z =
                curvePoints[curvePoints.length - 1].z;
            runtimeFiberEncapMesh1.scale.x = collisionRadius * scale * 0.5;
            runtimeFiberEncapMesh1.scale.y = collisionRadius * scale * 0.5;
            runtimeFiberEncapMesh1.scale.z = collisionRadius * scale * 0.5;
        }
    }

    // make a single generic fiber and return it
    public static makeFiber(): Group {
        const fibercurve = new LineCurve3(
            new Vector3(0, 0, 0),
            new Vector3(1, 1, 1)
        );
        const geometry = new FiberGeometry(fibercurve, 1, 1, 1, false);
        const fiberMesh = new Mesh(geometry);
        fiberMesh.name = `Fiber`;

        const fiberGroup = new Group();
        fiberGroup.add(fiberMesh);
        if (!USE_INSTANCE_ENDCAPS) {
            const fiberEndcapMesh0 = new Mesh(VisAgent.fiberEndcapGeometry);
            fiberEndcapMesh0.name = `FiberEnd0`;

            const fiberEndcapMesh1 = new Mesh(VisAgent.fiberEndcapGeometry);
            fiberEndcapMesh1.name = `FiberEnd1`;
            fiberGroup.add(fiberEndcapMesh0);
            fiberGroup.add(fiberEndcapMesh1);
        }
        // downstream code will switch this flag
        fiberGroup.visible = false;
        return fiberGroup;
    }

    public getFollowPosition(): Vector3 {
        if (this.visType === VisTypes.ID_VIS_TYPE_FIBER && this.fiberCurve) {
            return this.fiberCurve.getPoint(0.5);
        } else {
            return new Vector3().copy(this.mesh.position);
        }
    }
}
