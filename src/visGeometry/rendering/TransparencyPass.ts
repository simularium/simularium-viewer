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

class TransparencyPass {
    public instancedMeshGroup: Group;
    public transparentInstancedMeshGroup: Group;

    public transparentMeshTypes: GeometryInstanceContainer[];
    public colorsBuffer: DataTexture | null;
    public opacity: number;

    public constructor() {
        this.instancedMeshGroup = new Group();
        this.transparentInstancedMeshGroup = new Group();

        this.transparentMeshTypes = [];
        this.colorsBuffer = null;
        this.opacity = 0.5;
    }

    public setMeshGroups(
        instancedMeshGroup: Group,
        transparentInstancedMeshGroup: Group,
        transparentMeshTypes: GeometryInstanceContainer[]
    ): void {
        this.instancedMeshGroup = instancedMeshGroup;
        this.transparentInstancedMeshGroup = transparentInstancedMeshGroup;
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
