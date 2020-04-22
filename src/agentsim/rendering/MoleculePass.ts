import MeshGBufferShaders from "./MeshGBufferShaders";
import MoleculeGBufferShaders from "./MoleculeGBufferShaders";

import {
    BufferAttribute,
    BufferGeometry,
    Color,
    Float32BufferAttribute,
    Group,
    ShaderMaterial,
    Vector2,
    Points,
    Scene,
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

// buffer of points to be drawn as sprites
class MoleculePass {
    public colorMaterial: ShaderMaterial;
    public normalMaterial: ShaderMaterial;
    public positionMaterial: ShaderMaterial;
    public colorMaterialMesh: ShaderMaterial;
    public normalMaterialMesh: ShaderMaterial;
    public positionMaterialMesh: ShaderMaterial;
    public particles: Points;
    public scene: Scene;
    public geometry: BufferGeometry;
    public agentMeshGroup: Group;
    public agentFiberGroup: Group;
    private showAtoms: boolean;

    public constructor(n) {
        this.showAtoms = false;
        this.agentMeshGroup = new Group();
        this.agentFiberGroup = new Group();
        this.geometry = new BufferGeometry();

        this.createMoleculeBuffer(n);

        this.colorMaterial = MoleculeGBufferShaders.colorMaterial;
        this.normalMaterial = MoleculeGBufferShaders.normalMaterial;
        this.positionMaterial = MoleculeGBufferShaders.positionMaterial;

        this.colorMaterialMesh = MeshGBufferShaders.colorMaterial;
        this.normalMaterialMesh = MeshGBufferShaders.normalMaterial;
        this.positionMaterialMesh = MeshGBufferShaders.positionMaterial;

        // could break up into a few particles buffers at the cost of separate draw calls...
        this.particles = new Points(this.geometry, this.colorMaterial);
        this.scene = new Scene();
        this.scene.add(this.particles);
    }

    public createMoleculeBuffer(n): void {
        this.geometry = new BufferGeometry();
        var vertices = new Float32Array(n * 4);
        var typeIds = new Float32Array(n);
        var instanceIds = new Float32Array(n);
        for (var i = 0; i < n; i++) {
            // position
            vertices[i * 4] = 0;
            vertices[i * 4 + 1] = 0;
            vertices[i * 4 + 2] = 0;
            vertices[i * 4 + 3] = 1;
            // particle type id
            typeIds[i] = -1;
            // particle instance id
            instanceIds[i] = -1;
        }
        this.geometry.setAttribute(
            "position",
            new Float32BufferAttribute(vertices, 4)
        );
        this.geometry.setAttribute(
            "vTypeId",
            new Float32BufferAttribute(typeIds, 1)
        );
        this.geometry.setAttribute(
            "vInstanceId",
            new Float32BufferAttribute(instanceIds, 1)
        );
        if (this.particles) {
            this.particles.geometry = this.geometry;
        }
    }

    public setMeshGroups(agentMeshGroup: Group, agentFiberGroup: Group): void {
        this.agentMeshGroup = agentMeshGroup;
        this.agentFiberGroup = agentFiberGroup;
    }

    public setShowAtoms(show: boolean): void {
        this.showAtoms = show;
    }
    public getShowAtoms(): boolean {
        return this.showAtoms;
    }

    public update(positions, typeIds, instanceIds, numVertices): void {
        // update positions, and reset geoemtry in the particles object.
        const g = this.particles.geometry as BufferGeometry;

        const pa = g.getAttribute("position") as BufferAttribute;
        pa.set(positions);
        pa.needsUpdate = true;

        const ta = g.getAttribute("vTypeId") as BufferAttribute;
        ta.set(typeIds);
        ta.needsUpdate = true;

        const ia = g.getAttribute("vInstanceId") as BufferAttribute;
        ia.set(instanceIds);
        ia.needsUpdate = true;

        g.setDrawRange(0, numVertices);

        this.particles.visible = true;
    }

    public setAtomRadius(r): void {
        this.colorMaterial.uniforms.radius.value = r;
        this.normalMaterial.uniforms.radius.value = r;
        this.positionMaterial.uniforms.radius.value = r;
    }

    public resize(width, height): void {
        this.colorMaterial.uniforms.iResolution.value = new Vector2(
            width,
            height
        );
        this.normalMaterial.uniforms.iResolution.value = new Vector2(
            width,
            height
        );
        this.positionMaterial.uniforms.iResolution.value = new Vector2(
            width,
            height
        );
    }

    public render(
        renderer,
        camera,
        colorBuffer,
        normalBuffer,
        positionBuffer
    ): void {
        const c = renderer.getClearColor().clone();
        const a = renderer.getClearAlpha();
        // alpha == -1 is a marker to discard pixels later
        renderer.setClearColor(new Color(0.0, 0.0, 0.0), -1.0);

        this.colorMaterial.uniforms.projectionMatrix.value =
            camera.projectionMatrix;
        this.normalMaterial.uniforms.projectionMatrix.value =
            camera.projectionMatrix;
        this.positionMaterial.uniforms.projectionMatrix.value =
            camera.projectionMatrix;
        this.colorMaterialMesh.uniforms.projectionMatrix.value =
            camera.projectionMatrix;
        this.normalMaterialMesh.uniforms.projectionMatrix.value =
            camera.projectionMatrix;
        this.positionMaterialMesh.uniforms.projectionMatrix.value =
            camera.projectionMatrix;

        if (!this.showAtoms) {
            const meshScene = new Scene();
            // note that these groups will have to be restored back to the scene they lived in
            meshScene.add(this.agentMeshGroup);
            meshScene.add(this.agentFiberGroup);
            const prevVisMesh = this.agentMeshGroup.visible;
            this.agentMeshGroup.visible = true;
            const prevVisFiber = this.agentFiberGroup.visible;
            this.agentFiberGroup.visible = true;

            // TODO : MRT
            renderer.setRenderTarget(colorBuffer);
            meshScene.overrideMaterial = this.colorMaterialMesh;
            renderer.render(meshScene, camera);

            renderer.setRenderTarget(normalBuffer);
            meshScene.overrideMaterial = this.normalMaterialMesh;
            renderer.render(meshScene, camera);

            renderer.setRenderTarget(positionBuffer);
            meshScene.overrideMaterial = this.positionMaterialMesh;
            renderer.render(meshScene, camera);

            this.agentMeshGroup.visible = prevVisMesh;
            this.agentFiberGroup.visible = prevVisFiber;
            meshScene.overrideMaterial = null;
        } else {
            // TODO : MRT
            renderer.setRenderTarget(colorBuffer);
            this.particles.material = this.colorMaterial;
            renderer.render(this.scene, camera);

            renderer.setRenderTarget(normalBuffer);
            this.particles.material = this.normalMaterial;
            renderer.render(this.scene, camera);

            renderer.setRenderTarget(positionBuffer);
            this.particles.material = this.positionMaterial;
            renderer.render(this.scene, camera);
        }

        renderer.setClearColor(c, a);
    }
}

export default MoleculePass;
