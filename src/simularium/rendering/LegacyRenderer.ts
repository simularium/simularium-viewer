import PDBModel from "../PDBModel";
import VisAgent from "../VisAgent";

import {
    BufferGeometry,
    Color,
    Material,
    MeshLambertMaterial,
    MeshBasicMaterial,
    TubeBufferGeometry,
    Group,
    Mesh,
    Object3D,
    Points,
    PointsMaterial,
    Camera,
    Raycaster,
    Scene,
} from "three";

const FOLLOW_COLOR = new Color(0xffff00);
const HIGHLIGHT_COLOR = new Color(0xffffff);

// data and functions for rendering in the low fidelity webgl1 mode
class LegacyRenderer {
    private baseMaterial: MeshLambertMaterial;
    private highlightMaterial: Material;
    private followMaterial: Material;

    private agentMeshGroup: Group;

    constructor() {
        this.baseMaterial = new MeshLambertMaterial({
            color: new Color(0xff00ff),
        });
        this.highlightMaterial = new MeshBasicMaterial({
            color: new Color(HIGHLIGHT_COLOR),
            transparent: true,
            opacity: 0.6,
        });
        this.followMaterial = new MeshBasicMaterial({
            color: new Color(FOLLOW_COLOR),
        });
        this.agentMeshGroup = new Group();
    }

    public beginUpdate(scene: Scene): void {
        scene.remove(this.agentMeshGroup);
        // drop the old group as a cheap code way of removing all children.
        this.agentMeshGroup = new Group();
        this.agentMeshGroup.name = "legacy mesh group";
    }

    public addFiber(visAgent: VisAgent, scale: number, color: Color): void {
        if (!visAgent.fiberCurve) {
            console.warn("no curve provided");
            return;
        }
        // expensive
        const fibergeometry = new TubeBufferGeometry(
            visAgent.fiberCurve,
            4 * (visAgent.fiberCurve.points.length - 1), // 4 segments per control point
            scale * 0.5,
            8, // could reduce this with depth?
            false
        );

        const m = new Mesh(fibergeometry, this.selectMaterial(visAgent, color));
        m.userData = { id: visAgent.agentData.instanceId };

        this.agentMeshGroup.add(m);
    }

    private selectMaterial(visAgent: VisAgent, color: Color): Material {
        if (visAgent.followed) {
            return this.followMaterial;
        } else if (visAgent.highlighted) {
            return this.highlightMaterial;
        } else {
            const material = this.baseMaterial.clone();
            (material as MeshLambertMaterial).color = color;
            return material;
        }
    }

    private selectColor(visAgent: VisAgent, color: Color): Color {
        if (visAgent.followed) {
            return FOLLOW_COLOR;
        } else if (visAgent.highlighted) {
            return HIGHLIGHT_COLOR;
        } else {
            return color;
        }
    }

    public addMesh(
        meshGeom: BufferGeometry,
        visAgent: VisAgent,
        scale: number,
        color: Color
    ): void {
        const m = new Mesh(meshGeom, this.selectMaterial(visAgent, color));
        m.position.x = visAgent.agentData.x;
        m.position.y = visAgent.agentData.y;
        m.position.z = visAgent.agentData.z;

        m.rotation.x = visAgent.agentData.xrot;
        m.rotation.y = visAgent.agentData.yrot;
        m.rotation.z = visAgent.agentData.zrot;

        m.scale.x = scale;
        m.scale.y = scale;
        m.scale.z = scale;

        m.userData = { id: visAgent.agentData.instanceId };

        // resolve material?
        this.agentMeshGroup.add(m);
    }

    public addPdb(pdb: PDBModel, visAgent: VisAgent, color: Color): void {
        // TODO: maybe could only instantiate one LOD at this time??

        const pdbObjects: Object3D[] = pdb.instantiate();
        // update pdb transforms too
        for (let lod = 0; lod < pdbObjects.length; ++lod) {
            const obj = pdbObjects[lod];
            obj.position.x = visAgent.agentData.x;
            obj.position.y = visAgent.agentData.y;
            obj.position.z = visAgent.agentData.z;

            obj.rotation.x = visAgent.agentData.xrot;
            obj.rotation.y = visAgent.agentData.yrot;
            obj.rotation.z = visAgent.agentData.zrot;

            obj.scale.x = 1.0;
            obj.scale.y = 1.0;
            obj.scale.z = 1.0;

            obj.visible = false;
            // LOD to be selected at render time, not update time
            (obj as Points).material = new PointsMaterial({
                color: this.selectColor(visAgent, color),
            });
        }
    }

    public endUpdate(scene: Scene): void {
        if (this.agentMeshGroup.children.length > 0) {
            scene.add(this.agentMeshGroup);
        }
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
