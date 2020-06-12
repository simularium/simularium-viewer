import {
    Color,
    Material,
    Mesh,
    MeshBasicMaterial,
    MeshLambertMaterial,
    Object3D,
    ShaderMaterial,
    SphereBufferGeometry,
    Vector2,
} from "three";

import MembraneShader from "./rendering/MembraneShader";

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

export default class AgentMesh {
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

    public mesh: Object3D;
    public agentIndex: number;
    public typeId: number;
    public active: boolean;
    public baseMaterial: Material;
    public desatMaterial: Material;
    public color: Color;
    public name: string;

    public constructor(name: string) {
        this.name = name;
        this.color = new Color(1, 0, 0);
        this.active = false;
        this.agentIndex = -1;
        this.typeId = -1;
        this.baseMaterial = new MeshLambertMaterial({
            color: new Color(this.color),
        });
        this.desatMaterial = new MeshBasicMaterial({
            color: desaturate(this.color),
        });
        this.mesh = new Mesh(AgentMesh.sphereGeometry, this.baseMaterial);
        this.mesh.visible = false;
    }

    public resetMesh() {
        this.mesh = new Mesh(AgentMesh.sphereGeometry, this.baseMaterial);
    }

    public setColor(color) {
        this.color = color;
        this.baseMaterial = new MeshLambertMaterial({
            color: new Color(this.color),
        });
        this.desatMaterial = new MeshBasicMaterial({
            color: desaturate(this.color),
        });
    }

    public setHighlighted(highlighted: boolean) {
        this.assignMaterial(
            highlighted ? AgentMesh.highlightMaterial : this.baseMaterial
        );
    }

    public setSelected(selected: boolean) {
        this.assignMaterial(selected ? this.baseMaterial : this.desatMaterial);
    }

    private assignMaterial(material: Material) {
        if (this.name.includes("membrane")) {
            return this.assignMembraneMaterial();
        }

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
        // TODO: highlight/dehighlight
        const isHighlighted = true;

        if (isHighlighted) {
            // at this time, assign separate material parameters to the faces and sides of the membrane
            const faceNames = AgentMesh.membraneData.faces.map(el => {
                return el.name;
            });
            const sideNames = AgentMesh.membraneData.sides.map(el => {
                return el.name;
            });
            this.mesh.traverse(child => {
                if (child instanceof Mesh) {
                    if (faceNames.includes(child.name)) {
                        child.material = AgentMesh.membraneData.facesMaterial;
                    } else if (sideNames.includes(child.name)) {
                        child.material = AgentMesh.membraneData.sidesMaterial;
                    }
                }
            });
            AgentMesh.membraneData.facesMaterial.uniforms.uvscale.value =
                AgentMesh.membraneData.facesUVScale;
            AgentMesh.membraneData.sidesMaterial.uniforms.uvscale.value =
                AgentMesh.membraneData.sidesUVScale;
        } else {
            this.mesh.traverse(child => {
                if (child instanceof Mesh) {
                    child.material = this.desatMaterial;
                }
            });
        }
    }

    private onAgentMeshBeforeRender(
        this: AgentMesh,
        renderer,
        scene,
        camera,
        geometry,
        material,
        group
    ): void {
        if (!material.uniforms) {
            return;
        }
        if (material.uniforms.IN_typeId) {
            material.uniforms.IN_typeId.value = Number(this.typeId);
            material.uniformsNeedUpdate = true;
        }
        if (material.uniforms.IN_instanceId) {
            material.uniforms.IN_instanceId.value = Number(this.agentIndex);
            material.uniformsNeedUpdate = true;
        }
    }

    public setupMeshGeometry(meshGeom) {
        // remember current transform
        const p = this.mesh.position;
        const r = this.mesh.rotation;
        const s = this.mesh.scale;

        const visible = this.mesh.visible;

        this.mesh = meshGeom.clone();

        this.mesh.visible = visible;
        // restore transform
        this.mesh.position.copy(p);
        this.mesh.rotation.copy(r);
        this.mesh.scale.copy(s);

        // TODO : maintain proper highlight or selection state!
        this.assignMaterial(this.baseMaterial);
    }
}
