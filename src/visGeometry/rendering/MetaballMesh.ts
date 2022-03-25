import { Color, Euler, Group, Mesh, Quaternion, Vector3, Vector4 } from "three";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes";

import MetaballMeshShaders from "./MetaballMeshShader";
import { MRTShaders } from "./MultipassMaterials";

class MetaballMesh {
    private drawable: Group;
    private shaderSet: MRTShaders;

    // to act like an instancedmesh for GeometryStore purposes
    // but each instance is a whole MarchingCubes object
    constructor(name: string) {
        this.drawable = new Group();
        this.drawable.name = name;
        this.shaderSet = MetaballMeshShaders.shaderSet;
    }

    public getMesh(): Group {
        return this.drawable;
    }

    public getShaders(): MRTShaders {
        return this.shaderSet;
    }

    public instanceCount(): number {
        return this.drawable.children.length;
    }

    public beginUpdate(): void {
        // remove all from group!
        for (let i = this.drawable.children.length - 1; i >= 0; i--) {
            this.drawable.remove(this.drawable.children[i]);
        }
    }

    public endUpdate(): void {
        // no op
    }

    public replaceGeometry(newGeom: Mesh, meshName: string): void {
        // no op
    }

    public addInstance(
        x: number,
        y: number,
        z: number,
        scale: number,
        rx: number,
        ry: number,
        rz: number,
        uniqueAgentId: number,
        typeId: number,
        lodScale = 1,
        subPoints: number[] = []
    ): Mesh {
        // MARCHING CUBES

        const mat = this.shaderSet.mat.clone();
        mat.uniforms.translateAndScale.value = new Vector4(x, y, z, scale);
        mat.uniforms.rotation.value = new Quaternion().setFromEuler(
            new Euler(rx, ry, rz)
        );
        mat.uniforms.instanceAndTypeId.value = new Vector3(
            uniqueAgentId,
            typeId,
            lodScale
        );

        const resolution = 28;
        const enableNormals = true;
        const enableColors = false;
        const enableUvs = false;
        // buffer will be this size * 3 floats (?)
        const maxPolyCount = 65535;
        const effect = new MarchingCubes(
            resolution,
            mat,
            enableNormals,
            enableColors,
            maxPolyCount
        );
        effect.position.set(0, 0, 0);
        effect.scale.set(1, 1, 1);

        effect.enableUvs = enableUvs;
        effect.enableColors = enableColors;

        for (let i = 0; i < subPoints.length; i += 4) {
            // radius = sqrt(strenght/subtract)
            const strength = 1.0; //(subPoints[i + 3]*subPoints[i+3]);
            const subtract = 1.0;

            effect.addBall(
                subPoints[i + 0],
                subPoints[i + 1],
                subPoints[i + 2],
                strength,
                subtract
            );
        }
        this.drawable.add(effect);

        return effect;
    }
}

export { MetaballMesh };
