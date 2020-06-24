import {
    Color,
    Group,
    Material,
    Mesh,
    MeshBasicMaterial,
    MeshLambertMaterial,
    Object3D,
    Points,
    ShaderMaterial,
    SphereBufferGeometry,
    Vector2,
    WebGLRenderer,
} from "three";

import MembraneShader from "./rendering/MembraneShader";
import PDBModel from "./PDBModel";

function desaturate(color: Color): Color {
    const desatColor = new Color(color);
    let hsl: {
        h: number;
        s: number;
        l: number;
    } = { h: 0, s: 0, l: 0 };
    hsl = desatColor.getHSL(hsl);
    desatColor.setHSL(hsl.h, 0.5 * hsl.s, hsl.l);
    return desatColor;
}

export default class VisAgent {
    public static UNASSIGNED_MESH_COLOR = 0xff00ff;
    public static sphereGeometry: SphereBufferGeometry = new SphereBufferGeometry(
        1,
        32,
        32
    );
    private static highlightMaterial: MeshBasicMaterial = new MeshBasicMaterial(
        {
            color: new Color(1, 0, 0),
        }
    );
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
        facesMaterial: MembraneShader.MembraneShader.clone(),
        sidesMaterial: MembraneShader.MembraneShader.clone(),
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
    // TODO can this default to a trivial single-atom pdb model?
    public pdbModel?: PDBModel;
    public pdbObjects: Group;
    public lod: number;
    public agentIndex: number;
    public typeId: number;
    public colorIndex: number;
    public active: boolean;
    public baseMaterial: Material;
    public desatMaterial: Material;
    public color: Color;
    public name: string;
    public highlighted: boolean;
    public selected: boolean;

    public constructor(name: string) {
        this.name = name;
        this.color = new Color(VisAgent.UNASSIGNED_MESH_COLOR);
        this.active = false;
        this.agentIndex = -1;
        this.typeId = -1;
        this.colorIndex = 0;
        this.highlighted = false;
        // all are selected by default.  deselecting will desaturate.
        this.selected = true;
        this.baseMaterial = new MeshLambertMaterial({
            color: new Color(this.color),
        });
        this.desatMaterial = new MeshBasicMaterial({
            color: desaturate(this.color),
        });
        this.mesh = new Mesh(VisAgent.sphereGeometry, this.baseMaterial);
        this.mesh.userData = { index: this.agentIndex };
        this.mesh.visible = false;

        this.pdbModel = undefined;
        this.pdbObjects = new Group();
        this.lod = 0;
    }

    public resetMesh(): void {
        this.mesh = new Mesh(VisAgent.sphereGeometry, this.baseMaterial);
        this.mesh.userData = { index: this.agentIndex };
        this.highlighted = false;
        this.selected = true;
        this.setColor(new Color(VisAgent.UNASSIGNED_MESH_COLOR));
    }

    public resetPDB(): void {
        this.pdbModel = undefined;
        this.pdbObjects = new Group();
        this.lod = 0;
    }

    public setColor(color: Color, colorIndex: number = 0): void {
        this.color = color;
        this.colorIndex = colorIndex;
        this.baseMaterial = new MeshLambertMaterial({
            color: new Color(this.color),
        });
        this.desatMaterial = new MeshBasicMaterial({
            color: desaturate(this.color),
        });
        // because this is a new material, we need to re-install it on the geometry
        // TODO deal with highlight and selection state
        this.assignMaterial();
    }

    public setHighlighted(highlighted: boolean): void {
        this.highlighted = highlighted;
        this.assignMaterial();
    }

    public setSelected(selected: boolean): void {
        this.selected = selected;
        this.assignMaterial();
    }

    private assignMaterial(): void {
        if (this.mesh.name.includes("membrane")) {
            return this.assignMembraneMaterial();
        }

        let material = this.desatMaterial;
        if (this.highlighted) {
            material = VisAgent.highlightMaterial;
        } else if (this.selected) {
            material = this.baseMaterial;
        }

        this.pdbObjects.traverse(child => {
            if (child instanceof Points) {
                child.onBeforeRender = this.onAgentMeshBeforeRender.bind(this);
            }
        });

        if (this.mesh instanceof Mesh) {
            this.mesh.material = material;
            this.mesh.onBeforeRender = this.onAgentMeshBeforeRender.bind(this);
        } else {
            this.mesh.traverse(child => {
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
        if (this.selected) {
            // at this time, assign separate material parameters to the faces and sides of the membrane
            const faceNames = VisAgent.membraneData.faces.map(el => {
                return el.name;
            });
            const sideNames = VisAgent.membraneData.sides.map(el => {
                return el.name;
            });
            this.mesh.traverse(child => {
                if (child instanceof Mesh) {
                    if (faceNames.includes(child.name)) {
                        child.material = VisAgent.membraneData.facesMaterial;
                    } else if (sideNames.includes(child.name)) {
                        child.material = VisAgent.membraneData.sidesMaterial;
                    }
                }
            });
            VisAgent.membraneData.facesMaterial.uniforms.uvscale.value =
                VisAgent.membraneData.facesUVScale;
            VisAgent.membraneData.sidesMaterial.uniforms.uvscale.value =
                VisAgent.membraneData.sidesUVScale;
        } else {
            this.mesh.traverse(child => {
                if (child instanceof Mesh) {
                    child.material = this.desatMaterial;
                }
            });
        }
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
        if (material.uniforms.IN_typeId) {
            material.uniforms.IN_typeId.value = this.colorIndex;
            material.uniformsNeedUpdate = true;
        }
        if (material.uniforms.IN_instanceId) {
            material.uniforms.IN_instanceId.value = Number(this.agentIndex);
            material.uniformsNeedUpdate = true;
        }
        if (material.uniforms.radius) {
            material.uniforms.radius.value = (this.lod + 1) * 0.25; // * 8;
            material.uniformsNeedUpdate = true;
        }
    }

    public setupMeshGeometry(meshGeom): void {
        // remember current transform
        const p = this.mesh.position;
        const r = this.mesh.rotation;
        const s = this.mesh.scale;

        const visible = this.mesh.visible;

        this.mesh = meshGeom.clone();
        this.mesh.userData = { index: this.agentIndex };

        this.mesh.visible = visible;
        // restore transform
        this.mesh.position.copy(p);
        this.mesh.rotation.copy(r);
        this.mesh.scale.copy(s);

        this.assignMaterial();
    }

    public setupPdb(pdb): void {
        this.pdbModel = pdb;
        this.pdbObjects = pdb.instantiate();
    }

    public selectLOD(index): void {
        this.setPDBInvisible();
        this.pdbObjects.visible = true;
        if (index < 0 || index >= this.pdbObjects.children.length) {
            index = this.pdbObjects.children.length - 1;
        }
        this.lod = index;
        this.pdbObjects.children[index].visible = true;
    }

    public setPDBInvisible(): void {
        this.pdbObjects.visible = false;
        for (let j = 0; j < this.pdbObjects.children.length; ++j) {
            this.pdbObjects.children[j].visible = false;
        }
    }

    public hideAndDeactivate(): void {
        this.mesh.visible = false;
        this.setPDBInvisible();
        this.active = false;
    }

    public hasDrawablePDB(): boolean {
        return (
            this.pdbModel !== undefined &&
            this.pdbModel.pdb !== null &&
            this.pdbObjects.children.length > 0
        );
    }
}
