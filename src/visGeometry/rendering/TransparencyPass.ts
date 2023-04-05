import {
    DataTexture,
    Group,
    PerspectiveCamera,
    Scene,
    WebGLRenderer,
    WebGLRenderTarget,
} from "three";

import {
    setRenderPass,
    updateColors,
    updateOpacity,
} from "./MultipassMaterials";
import { GeometryInstanceContainer } from "../types";
import { InstancedFiberGroup } from "./InstancedFiber";

class TransparencyPass {
    public instancedMeshGroup: Group;
    public transparentInstancedMeshGroup: Group;

    public transparentMeshTypes: GeometryInstanceContainer[];
    public transparentFibers: InstancedFiberGroup;
    public colorsBuffer: DataTexture | null;
    public opacity: number;

    public constructor() {
        this.instancedMeshGroup = new Group();
        this.transparentInstancedMeshGroup = new Group();
        this.transparentFibers = new InstancedFiberGroup(true);

        this.transparentMeshTypes = [];
        this.colorsBuffer = null;
        this.opacity = 0.5;
    }

    public setMeshGroups(
        instancedMeshGroup: Group,
        transparentInstancedMeshGroup: Group,
        transparentFibers: InstancedFiberGroup,
        transparentMeshTypes: GeometryInstanceContainer[]
    ): void {
        this.instancedMeshGroup = instancedMeshGroup;
        this.transparentInstancedMeshGroup = transparentInstancedMeshGroup;
        this.transparentFibers = transparentFibers;
        this.transparentMeshTypes = transparentMeshTypes;
    }

    public updateColors(colorsTex: DataTexture): void {
        this.colorsBuffer = colorsTex;
    }

    public updateOpacity(opacity: number): void {
        this.opacity = opacity;
    }

    // TODO resize?

    public render(
        renderer: WebGLRenderer,
        scene: Scene,
        camera: PerspectiveCamera,
        target: WebGLRenderTarget
    ): void {
        this.instancedMeshGroup.visible = false;
        this.transparentInstancedMeshGroup.visible = true;

        // TODO does this pass need to be responsible for updating projection
        //   matrix of other objects?
        this.transparentFibers.updateProjectionMatrix(camera.projectionMatrix);
        this.transparentFibers.setRenderPass();
        this.transparentFibers.setColors(this.colorsBuffer);
        this.transparentFibers.setOpacity(this.opacity);

        for (const meshType of this.transparentMeshTypes) {
            setRenderPass(meshType.getMesh(), meshType.getShaders(), true);
            updateColors(meshType.getShaders(), this.colorsBuffer);
            updateOpacity(meshType.getShaders(), this.opacity);
        }

        renderer.autoClear = false;
        renderer.setRenderTarget(target);
        renderer.render(scene, camera);
        renderer.autoClear = true;
    }
}

export default TransparencyPass;
