import MembraneShader from "./MembraneShader";
import PDBModel from "../PDBModel";

import {
    BufferGeometry,
    CatmullRomCurve3,
    Color,
    Material,
    MeshLambertMaterial,
    MeshBasicMaterial,
    ShaderMaterial,
    TubeBufferGeometry,
    Vector2,
    WebGLRenderer,
    Group,
    Mesh,
    Object3D,
    Camera,
    Raycaster,
} from "three";

// data and functions for rendering in the low fidelity webgl1 mode
class LegacyRenderer {
    private baseMaterial: Material;
    private highlightMaterial: Material;
    private followMaterial: Material;

    private agentMeshGroup: Group;

    constructor() {
        this.baseMaterial = new MeshLambertMaterial({
            color: new Color(0xff00ff),
        });
        this.highlightMaterial = new MeshBasicMaterial({
            color: new Color(0xffffff),
            transparent: true,
            opacity: 1.0,
        });
        this.followMaterial = new MeshBasicMaterial({
            color: new Color(0xffff00),
        });
        this.agentMeshGroup = new Group();
    }

    public static membraneData: {
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
        LegacyRenderer.membraneData.facesMaterial.uniforms.iTime.value = time;
        LegacyRenderer.membraneData.sidesMaterial.uniforms.iTime.value = time;

        renderer.getDrawingBufferSize(
            LegacyRenderer.membraneData.facesMaterial.uniforms.iResolution.value
        );
        renderer.getDrawingBufferSize(
            LegacyRenderer.membraneData.sidesMaterial.uniforms.iResolution.value
        );
    }

    public beginUpdate(): void {
        // drop the old group as a cheap code way of removing all children.
        this.agentMeshGroup = new Group();
    }

    public addFiber(curve: CatmullRomCurve3 | undefined, scale: number): void {
        if (!curve) {
            console.warn("no curve provided");
            return;
        }
        // expensive
        const fibergeometry = new TubeBufferGeometry(
            curve,
            4 * (curve.points.length - 1), // 4 segments per control point
            scale * 0.5,
            8, // could reduce this with depth?
            false
        );

        // resolve material?
        this.agentMeshGroup.add(new Mesh(fibergeometry));
    }

    public addMesh(
        meshGeom: BufferGeometry,
        x: number,
        y: number,
        z: number,
        rx: number,
        ry: number,
        rz: number,
        scale: number
    ): void {
        const m = new Mesh(meshGeom);
        m.position.x = x;
        m.position.y = y;
        m.position.z = z;

        m.rotation.x = rx;
        m.rotation.y = ry;
        m.rotation.z = rz;

        m.scale.x = scale;
        m.scale.y = scale;
        m.scale.z = scale;

        // resolve material?
        this.agentMeshGroup.add(m);
    }

    public addPdb(
        pdb: PDBModel,
        x: number,
        y: number,
        z: number,
        rx: number,
        ry: number,
        rz: number,
        scale: number
    ): void {
        // TODO: maybe could only instantiate one LOD at this time??

        const pdbObjects: Object3D[] = pdb.instantiate();
        // update pdb transforms too
        for (let lod = 0; lod < pdbObjects.length; ++lod) {
            const obj = pdbObjects[lod];
            obj.position.x = x;
            obj.position.y = y;
            obj.position.z = z;

            obj.rotation.x = rx;
            obj.rotation.y = ry;
            obj.rotation.z = rz;

            obj.scale.x = scale;
            obj.scale.y = scale;
            obj.scale.z = scale;

            obj.visible = false;
            // LOD to be selected at render time, not update time
        }
    }

    public endUpdate(): void {
        // no op
    }

    public clear(): void {
        // delete all and dispose?
        this.agentMeshGroup = new Group();
        // for (let i = this.agentMeshGroup.children.length - 1; i >= 0; i--) {
        //     this.agentMeshGroup.remove(this.agentMeshGroup.children[i]);
        // }
    }

    public hitTest(coords: { x: number; y: number }, camera: Camera): number {
        const raycaster = new Raycaster();
        raycaster.setFromCamera(coords, camera);
        // intersect the agent mesh group.
        const intersects = raycaster.intersectObjects(
            this.agentMeshGroup.children,
            true
        );
        intersects.sort((a, b) => a.distance - b.distance);

        if (intersects && intersects.length) {
            let obj = intersects[0].object;
            // if the object has a parent and the parent is not the scene, use that.
            // assumption: obj file meshes or fibers load into their own Groups
            // and have only one level of hierarchy.
            if (!obj.userData || !obj.userData.id) {
                if (obj.parent && obj.parent !== this.agentMeshGroup) {
                    obj = obj.parent;
                }
            }
            return obj.userData.id;
        } else {
            const NO_AGENT = -1;
            return NO_AGENT;
        }
    }
}

export { LegacyRenderer };
