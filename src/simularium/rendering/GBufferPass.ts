import MeshGBufferShaders from "./MeshGBufferShaders";
import PDBGBufferShaders from "./PDBGBufferShaders";
import InstanceMeshShaders from "./InstancedFiberEndcapShader";

import {
    Color,
    Group,
    ShaderMaterial,
    Vector2,
    Scene,
    WebGLRenderer,
    PerspectiveCamera,
    WebGLRenderTarget,
} from "three";

// strategy:
// 0. based on depth, aggregate atoms in the molecule into larger spheres using clustering ?
// 1. write spheres as GL_POINTs with appropriately scaled size
// 2. fragment shader: discard pts outside of sphere,
//    write normal
//    write depth
//    write color
//    write instance id (for same molecule...)
// 3. AO shader + blend over color buffer
// 4. outline shader over color buffer
//

// draw positions, normals, and instance and type ids of objects
class GBufferPass {
    public colorMaterialMesh: ShaderMaterial;
    public normalMaterialMesh: ShaderMaterial;
    public positionMaterialMesh: ShaderMaterial;
    public colorMaterialPDB: ShaderMaterial;
    public normalMaterialPDB: ShaderMaterial;
    public positionMaterialPDB: ShaderMaterial;
    public colorMaterialInstancedMesh: ShaderMaterial;
    public normalMaterialInstancedMesh: ShaderMaterial;
    public positionMaterialInstancedMesh: ShaderMaterial;
    public scene: Scene;
    public agentMeshGroup: Group;
    public agentPDBGroup: Group;
    public agentFiberGroup: Group;
    public instancedMeshGroup: Group;

    public constructor() {
        this.agentMeshGroup = new Group();
        this.agentPDBGroup = new Group();
        this.agentFiberGroup = new Group();
        this.instancedMeshGroup = new Group();

        this.colorMaterialMesh = MeshGBufferShaders.colorMaterial;
        this.normalMaterialMesh = MeshGBufferShaders.normalMaterial;
        this.positionMaterialMesh = MeshGBufferShaders.positionMaterial;

        this.colorMaterialPDB = PDBGBufferShaders.colorMaterial;
        this.normalMaterialPDB = PDBGBufferShaders.normalMaterial;
        this.positionMaterialPDB = PDBGBufferShaders.positionMaterial;

        this.colorMaterialInstancedMesh = InstanceMeshShaders.colorMaterial;
        this.normalMaterialInstancedMesh = InstanceMeshShaders.normalMaterial;
        this.positionMaterialInstancedMesh =
            InstanceMeshShaders.positionMaterial;

        this.scene = new Scene();
    }

    public setMeshGroups(
        agentMeshGroup: Group,
        agentPDBGroup: Group,
        agentFiberGroup: Group,
        instancedMeshGroup: Group
    ): void {
        this.agentMeshGroup = agentMeshGroup;
        this.agentPDBGroup = agentPDBGroup;
        this.agentFiberGroup = agentFiberGroup;
        this.instancedMeshGroup = instancedMeshGroup;
    }

    public resize(width: number, height: number): void {
        this.colorMaterialPDB.uniforms.iResolution.value = new Vector2(
            width,
            height
        );
        this.normalMaterialPDB.uniforms.iResolution.value = new Vector2(
            width,
            height
        );
        this.positionMaterialPDB.uniforms.iResolution.value = new Vector2(
            width,
            height
        );
    }

    public render(
        renderer: WebGLRenderer,
        scene: Scene,
        camera: PerspectiveCamera,
        colorBuffer: WebGLRenderTarget,
        normalBuffer: WebGLRenderTarget,
        positionBuffer: WebGLRenderTarget
    ): void {
        const c = renderer.getClearColor(new Color()).clone();
        const a = renderer.getClearAlpha();

        this.colorMaterialMesh.uniforms.projectionMatrix.value =
            camera.projectionMatrix;
        this.normalMaterialMesh.uniforms.projectionMatrix.value =
            camera.projectionMatrix;
        this.positionMaterialMesh.uniforms.projectionMatrix.value =
            camera.projectionMatrix;

        this.colorMaterialPDB.uniforms.projectionMatrix.value =
            camera.projectionMatrix;
        this.normalMaterialPDB.uniforms.projectionMatrix.value =
            camera.projectionMatrix;
        this.positionMaterialPDB.uniforms.projectionMatrix.value =
            camera.projectionMatrix;

        this.colorMaterialInstancedMesh.uniforms.projectionMatrix.value =
            camera.projectionMatrix;
        this.normalMaterialInstancedMesh.uniforms.projectionMatrix.value =
            camera.projectionMatrix;
        this.positionMaterialInstancedMesh.uniforms.projectionMatrix.value =
            camera.projectionMatrix;

        // 1. fill colorbuffer

        // clear color:
        // x:0 agent type id (0 so that type ids can be positive or negative integers)
        // y:-1 agent instance id (-1 so that 0 remains a distinct instance id from the background)
        // z:0 view space depth
        // alpha == -1 is a marker to discard pixels later, will be filled with frag depth
        const COLOR_CLEAR = new Color(0.0, -1.0, 0.0);
        const COLOR_ALPHA = -1.0;
        renderer.setClearColor(COLOR_CLEAR, COLOR_ALPHA);
        renderer.setRenderTarget(colorBuffer);
        renderer.autoClear = true;

        const DO_MESHES = true;
        const DO_INSTANCED = true;
        const DO_PDB = true;

        if (DO_MESHES) {
            // begin draw meshes
            this.agentMeshGroup.visible = true;
            this.agentFiberGroup.visible = true;
            this.agentPDBGroup.visible = false;
            this.instancedMeshGroup.visible = false;

            scene.overrideMaterial = this.colorMaterialMesh;
            renderer.render(scene, camera);
            // end draw meshes
            renderer.autoClear = false;
        }

        if (DO_INSTANCED) {
            // draw instanced things
            this.agentMeshGroup.visible = false;
            this.agentFiberGroup.visible = false;
            this.agentPDBGroup.visible = false;
            this.instancedMeshGroup.visible = true;

            scene.overrideMaterial = this.colorMaterialInstancedMesh;
            renderer.render(scene, camera);
            // end draw instanced things
            renderer.autoClear = false;
        }

        if (DO_PDB) {
            // begin draw pdb
            this.agentMeshGroup.visible = false;
            this.agentFiberGroup.visible = false;
            this.agentPDBGroup.visible = true;
            this.instancedMeshGroup.visible = false;

            scene.overrideMaterial = this.colorMaterialPDB;
            renderer.render(scene, camera);
            //end draw pdb
            renderer.autoClear = false;
        }

        renderer.autoClear = true;

        // 2. fill normalbuffer
        const NORMAL_CLEAR = new Color(0.0, 0.0, 0.0);
        const NORMAL_ALPHA = -1.0;

        renderer.setClearColor(NORMAL_CLEAR, NORMAL_ALPHA);
        renderer.setRenderTarget(normalBuffer);

        if (DO_MESHES) {
            this.agentMeshGroup.visible = true;
            this.agentFiberGroup.visible = true;
            this.agentPDBGroup.visible = false;
            this.instancedMeshGroup.visible = false;

            scene.overrideMaterial = this.normalMaterialMesh;
            renderer.render(scene, camera);

            renderer.autoClear = false;
        }

        if (DO_INSTANCED) {
            // draw instanced things
            this.agentMeshGroup.visible = false;
            this.agentFiberGroup.visible = false;
            this.agentPDBGroup.visible = false;
            this.instancedMeshGroup.visible = true;

            scene.overrideMaterial = this.normalMaterialInstancedMesh;
            renderer.render(scene, camera);
            // end draw instanced things
            renderer.autoClear = false;
        }

        if (DO_PDB) {
            this.agentMeshGroup.visible = false;
            this.agentFiberGroup.visible = false;
            this.agentPDBGroup.visible = true;
            this.instancedMeshGroup.visible = false;

            scene.overrideMaterial = this.normalMaterialPDB;
            renderer.render(scene, camera);
            renderer.autoClear = false;
        }

        renderer.autoClear = true;

        // 3. fill positionbuffer
        const POSITION_CLEAR = new Color(0.0, 0.0, 0.0);
        const POSITION_ALPHA = -1.0;

        renderer.setClearColor(POSITION_CLEAR, POSITION_ALPHA);
        renderer.setRenderTarget(positionBuffer);

        if (DO_MESHES) {
            this.agentMeshGroup.visible = true;
            this.agentFiberGroup.visible = true;
            this.agentPDBGroup.visible = false;
            this.instancedMeshGroup.visible = false;

            scene.overrideMaterial = this.positionMaterialMesh;
            renderer.render(scene, camera);

            renderer.autoClear = false;
        }

        if (DO_INSTANCED) {
            // draw instanced things
            this.agentMeshGroup.visible = false;
            this.agentFiberGroup.visible = false;
            this.agentPDBGroup.visible = false;
            this.instancedMeshGroup.visible = true;

            scene.overrideMaterial = this.positionMaterialInstancedMesh;
            renderer.render(scene, camera);
            // end draw instanced things
            renderer.autoClear = false;
        }

        if (DO_PDB) {
            this.agentMeshGroup.visible = false;
            this.agentFiberGroup.visible = false;
            this.agentPDBGroup.visible = true;
            this.instancedMeshGroup.visible = false;

            scene.overrideMaterial = this.positionMaterialPDB;
            renderer.render(scene, camera);
            renderer.autoClear = false;
        }

        // restore state before returning
        scene.overrideMaterial = null;

        renderer.autoClear = true;

        // restore saved clear color
        renderer.setClearColor(c, a);
    }
}

export default GBufferPass;
