import PDBGBufferShaders from "./PDBGBufferShaders";
import { InstancedFiberGroup } from "./InstancedFiber";
import { InstancedMesh } from "./InstancedMesh";

import {
    MRTShaders,
    setRenderPass,
    setSceneRenderPass,
    updateProjectionMatrix,
    updateResolution,
} from "./MultipassMaterials";

import {
    Color,
    Group,
    Scene,
    WebGLRenderer,
    PerspectiveCamera,
    WebGLMultipleRenderTargets,
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
    public pdbGbufferMaterials: MRTShaders;

    public scene: Scene;
    public agentPDBGroup: Group;

    public instancedMeshGroup: Group;
    // instancedMeshGroup consists of fibers and meshes:
    public fibers: InstancedFiberGroup;
    public meshTypes: InstancedMesh[];

    public constructor() {
        this.agentPDBGroup = new Group();
        this.instancedMeshGroup = new Group();
        this.fibers = new InstancedFiberGroup();
        this.meshTypes = [];

        this.pdbGbufferMaterials = PDBGBufferShaders.shaderSet;

        this.scene = new Scene();
    }

    public setMeshGroups(
        agentPDBGroup: Group,
        instancedMeshGroup: Group,
        fibers: InstancedFiberGroup,
        meshes: InstancedMesh[]
    ): void {
        this.agentPDBGroup = agentPDBGroup;
        this.instancedMeshGroup = instancedMeshGroup;
        this.fibers = fibers;
        this.meshTypes = meshes;
    }

    public resize(width: number, height: number): void {
        updateResolution(this.pdbGbufferMaterials, width, height);
    }

    public render(
        renderer: WebGLRenderer,
        scene: Scene,
        camera: PerspectiveCamera,
        gbuffer: WebGLMultipleRenderTargets
    ): void {
        const c = renderer.getClearColor(new Color()).clone();
        const a = renderer.getClearAlpha();

        updateProjectionMatrix(
            this.pdbGbufferMaterials,
            camera.projectionMatrix
        );
        // this.pdbGbufferMaterials.mat.uniforms.modelViewMatrix.value =
        //     camera.modelViewMatrix;
        this.fibers.updateProjectionMatrix(camera.projectionMatrix);
        for (let i = 0; i < this.meshTypes.length; ++i) {
            const s = this.meshTypes[i].getShaders();
            updateProjectionMatrix(s, camera.projectionMatrix);
        }

        // clear color:
        // x:0 agent type id (0 so that type ids can be positive or negative integers)
        // y:-1 agent instance id (-1 so that 0 remains a distinct instance id from the background)
        // z:0 view space depth
        // alpha == -1 is a marker to discard pixels later, will be filled with frag depth
        const COLOR_CLEAR = new Color(0.0, -1.0, 0.0);
        const COLOR_ALPHA = -1.0;
        // const NORMAL_CLEAR = new Color(0.0, 0.0, 0.0);
        // const NORMAL_ALPHA = -1.0;
        // const POSITION_CLEAR = new Color(0.0, 0.0, 0.0);
        // const POSITION_ALPHA = -1.0;

        renderer.setClearColor(COLOR_CLEAR, COLOR_ALPHA);
        renderer.setRenderTarget(gbuffer);
        renderer.clear();
        // renderer.setClearColor(NORMAL_CLEAR, NORMAL_ALPHA);
        // renderer.setRenderTarget(normalBuffer);
        // renderer.clear();
        // renderer.setClearColor(POSITION_CLEAR, POSITION_ALPHA);
        // renderer.setRenderTarget(positionBuffer);
        // renderer.clear();
        renderer.autoClear = false;

        const DO_INSTANCED = true;
        const DO_PDB = true;

        if (DO_INSTANCED) {
            // draw instanced things
            this.agentPDBGroup.visible = false;
            this.instancedMeshGroup.visible = true;

            this.fibers.setRenderPass();
            for (let i = 0; i < this.meshTypes.length; ++i) {
                setRenderPass(
                    this.meshTypes[i].getMesh(),
                    this.meshTypes[i].getShaders()
                );
            }
            renderer.render(scene, camera);
            // end draw instanced things
            renderer.autoClear = false;
            scene.overrideMaterial = null;
        }

        if (DO_PDB) {
            // begin draw pdb
            this.agentPDBGroup.visible = true;
            this.instancedMeshGroup.visible = false;

            setSceneRenderPass(scene, this.pdbGbufferMaterials);
            renderer.render(scene, camera);
            //end draw pdb
            renderer.autoClear = false;
            scene.overrideMaterial = null;
        }

        // restore state before returning
        scene.overrideMaterial = null;

        renderer.autoClear = true;

        // restore saved clear color
        renderer.setClearColor(c, a);
    }
}

export default GBufferPass;
