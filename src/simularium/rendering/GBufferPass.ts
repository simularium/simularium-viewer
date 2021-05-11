import MeshGBufferShaders from "./MeshGBufferShaders";
import PDBGBufferShaders from "./PDBGBufferShaders";
import { InstancedFiberGroup } from "./InstancedFiber";
import { InstancedMesh } from "./InstancedMesh";

import {
    GbufferRenderPass,
    MultipassShaders,
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
    public meshGbufferMaterials: MultipassShaders;
    public pdbGbufferMaterials: MultipassShaders;

    public scene: Scene;
    public agentMeshGroup: Group;
    public agentPDBGroup: Group;
    public agentFiberGroup: Group;

    public instancedMeshGroup: Group;
    // instancedMeshGroup consists of fibers and meshes:
    public fibers: InstancedFiberGroup;
    public meshTypes: InstancedMesh[];

    public constructor() {
        this.agentMeshGroup = new Group();
        this.agentPDBGroup = new Group();
        this.agentFiberGroup = new Group();
        this.instancedMeshGroup = new Group();
        this.fibers = new InstancedFiberGroup();
        this.meshTypes = [];

        this.meshGbufferMaterials = MeshGBufferShaders.shaderSet;

        this.pdbGbufferMaterials = PDBGBufferShaders.shaderSet;

        this.scene = new Scene();
    }

    public setMeshGroups(
        agentMeshGroup: Group,
        agentPDBGroup: Group,
        agentFiberGroup: Group,
        instancedMeshGroup: Group,
        fibers: InstancedFiberGroup,
        meshes: InstancedMesh[]
    ): void {
        this.agentMeshGroup = agentMeshGroup;
        this.agentPDBGroup = agentPDBGroup;
        this.agentFiberGroup = agentFiberGroup;
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
        colorBuffer: WebGLRenderTarget,
        normalBuffer: WebGLRenderTarget,
        positionBuffer: WebGLRenderTarget
    ): void {
        const c = renderer.getClearColor(new Color()).clone();
        const a = renderer.getClearAlpha();

        updateProjectionMatrix(
            this.meshGbufferMaterials,
            camera.projectionMatrix
        );
        updateProjectionMatrix(
            this.pdbGbufferMaterials,
            camera.projectionMatrix
        );
        this.fibers.updateProjectionMatrix(camera.projectionMatrix);
        for (let i = 0; i < this.meshTypes.length; ++i) {
            const s = this.meshTypes[i].getShaders();
            updateProjectionMatrix(s, camera.projectionMatrix);
        }

        // 1. fill colorbuffer
        let renderPass: GbufferRenderPass = GbufferRenderPass.COLOR;

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

        const DO_MESHES = false;
        const DO_INSTANCED = true;
        const DO_PDB = true;

        if (DO_MESHES) {
            // begin draw meshes
            this.agentMeshGroup.visible = true;
            this.agentFiberGroup.visible = true;
            this.agentPDBGroup.visible = false;
            this.instancedMeshGroup.visible = false;

            setSceneRenderPass(scene, this.meshGbufferMaterials, renderPass);
            renderer.render(scene, camera);
            // end draw meshes
            renderer.autoClear = false;
            scene.overrideMaterial = null;
        }

        if (DO_INSTANCED) {
            // draw instanced things
            this.agentMeshGroup.visible = false;
            this.agentFiberGroup.visible = false;
            this.agentPDBGroup.visible = false;
            this.instancedMeshGroup.visible = true;

            this.fibers.setRenderPass(renderPass);
            for (let i = 0; i < this.meshTypes.length; ++i) {
                setRenderPass(
                    this.meshTypes[i].getMesh(),
                    this.meshTypes[i].getShaders(),
                    renderPass
                );
            }
            renderer.render(scene, camera);
            // end draw instanced things
            renderer.autoClear = false;
            scene.overrideMaterial = null;
        }

        if (DO_PDB) {
            // begin draw pdb
            this.agentMeshGroup.visible = false;
            this.agentFiberGroup.visible = false;
            this.agentPDBGroup.visible = true;
            this.instancedMeshGroup.visible = false;

            setSceneRenderPass(scene, this.pdbGbufferMaterials, renderPass);
            renderer.render(scene, camera);
            //end draw pdb
            renderer.autoClear = false;
            scene.overrideMaterial = null;
        }

        renderer.autoClear = true;

        // 2. fill normalbuffer
        renderPass = GbufferRenderPass.NORMAL;

        const NORMAL_CLEAR = new Color(0.0, 0.0, 0.0);
        const NORMAL_ALPHA = -1.0;

        renderer.setClearColor(NORMAL_CLEAR, NORMAL_ALPHA);
        renderer.setRenderTarget(normalBuffer);

        if (DO_MESHES) {
            this.agentMeshGroup.visible = true;
            this.agentFiberGroup.visible = true;
            this.agentPDBGroup.visible = false;
            this.instancedMeshGroup.visible = false;

            setSceneRenderPass(scene, this.meshGbufferMaterials, renderPass);
            renderer.render(scene, camera);

            renderer.autoClear = false;
            scene.overrideMaterial = null;
        }

        if (DO_INSTANCED) {
            // draw instanced things
            this.agentMeshGroup.visible = false;
            this.agentFiberGroup.visible = false;
            this.agentPDBGroup.visible = false;
            this.instancedMeshGroup.visible = true;

            this.fibers.setRenderPass(renderPass);
            for (let i = 0; i < this.meshTypes.length; ++i) {
                setRenderPass(
                    this.meshTypes[i].getMesh(),
                    this.meshTypes[i].getShaders(),
                    renderPass
                );
            }
            renderer.render(scene, camera);
            // end draw instanced things
            renderer.autoClear = false;
            scene.overrideMaterial = null;
        }

        if (DO_PDB) {
            this.agentMeshGroup.visible = false;
            this.agentFiberGroup.visible = false;
            this.agentPDBGroup.visible = true;
            this.instancedMeshGroup.visible = false;

            setSceneRenderPass(scene, this.pdbGbufferMaterials, renderPass);
            renderer.render(scene, camera);
            renderer.autoClear = false;
            scene.overrideMaterial = null;
        }

        renderer.autoClear = true;

        // 3. fill positionbuffer
        renderPass = GbufferRenderPass.POSITION;

        const POSITION_CLEAR = new Color(0.0, 0.0, 0.0);
        const POSITION_ALPHA = -1.0;

        renderer.setClearColor(POSITION_CLEAR, POSITION_ALPHA);
        renderer.setRenderTarget(positionBuffer);

        if (DO_MESHES) {
            this.agentMeshGroup.visible = true;
            this.agentFiberGroup.visible = true;
            this.agentPDBGroup.visible = false;
            this.instancedMeshGroup.visible = false;

            setSceneRenderPass(scene, this.meshGbufferMaterials, renderPass);
            renderer.render(scene, camera);

            renderer.autoClear = false;
            scene.overrideMaterial = null;
        }

        if (DO_INSTANCED) {
            // draw instanced things
            this.agentMeshGroup.visible = false;
            this.agentFiberGroup.visible = false;
            this.agentPDBGroup.visible = false;
            this.instancedMeshGroup.visible = true;

            this.fibers.setRenderPass(renderPass);
            for (let i = 0; i < this.meshTypes.length; ++i) {
                setRenderPass(
                    this.meshTypes[i].getMesh(),
                    this.meshTypes[i].getShaders(),
                    renderPass
                );
            }
            renderer.render(scene, camera);
            // end draw instanced things
            renderer.autoClear = false;
            scene.overrideMaterial = null;
        }

        if (DO_PDB) {
            this.agentMeshGroup.visible = false;
            this.agentFiberGroup.visible = false;
            this.agentPDBGroup.visible = true;
            this.instancedMeshGroup.visible = false;

            setSceneRenderPass(scene, this.pdbGbufferMaterials, renderPass);
            renderer.render(scene, camera);
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
