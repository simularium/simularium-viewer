import PDBGBufferShaders from "./PDBGBufferShaders";
import { InstancedFiberGroup } from "./InstancedFiber";
import {
    MRTShaders,
    setRenderPass,
    updateProjectionMatrix,
    updateResolution,
} from "./MultipassMaterials";

import { GeometryInstanceContainer } from "../types";

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

    public instancedMeshGroup: Group;
    public transparentInstancedMeshGroup: Group;
    // instancedMeshGroup consists of fibers and meshes:
    public fibers: InstancedFiberGroup;
    public meshTypes: GeometryInstanceContainer[];

    public constructor() {
        this.instancedMeshGroup = new Group();
        this.transparentInstancedMeshGroup = new Group();
        this.fibers = new InstancedFiberGroup();
        this.meshTypes = [];

        this.pdbGbufferMaterials = PDBGBufferShaders.shaderSet;

        this.scene = new Scene();
    }

    public setMeshGroups(
        instancedMeshGroup: Group,
        transparentInstancedMeshGroup: Group,
        fibers: InstancedFiberGroup,
        meshes: GeometryInstanceContainer[]
    ): void {
        this.instancedMeshGroup = instancedMeshGroup;
        this.transparentInstancedMeshGroup = transparentInstancedMeshGroup;
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

        // TODO necessary??  now handled in the meshTypes loop below
        updateProjectionMatrix(
            this.pdbGbufferMaterials,
            camera.projectionMatrix
        );
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
        // note that current multiple render target implementation does not allow for separate clear values
        const COLOR_CLEAR = new Color(0.0, -1.0, 0.0);
        const COLOR_ALPHA = -1.0;

        renderer.setClearColor(COLOR_CLEAR, COLOR_ALPHA);
        renderer.setRenderTarget(gbuffer);
        renderer.clear();
        renderer.autoClear = false;

        // everybody (pdb, mesh, and fiber) is instanced now
        const DO_INSTANCED = true;

        if (DO_INSTANCED) {
            // draw instanced things
            this.instancedMeshGroup.visible = true;
            this.transparentInstancedMeshGroup.visible = false;

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

        // restore state before returning
        scene.overrideMaterial = null;

        renderer.autoClear = true;

        // restore saved clear color
        renderer.setClearColor(c, a);
    }
}

export default GBufferPass;
