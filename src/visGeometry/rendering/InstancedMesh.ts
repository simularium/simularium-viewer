import {
    BufferGeometry,
    Euler,
    InstancedBufferAttribute,
    InstancedBufferGeometry,
    Mesh,
    Points,
    Quaternion,
} from "three";

import InstancedMeshShader from "./InstancedMeshShader";
import { MRTShaders } from "./MultipassMaterials";
import PDBGBufferShaders from "./PDBGBufferShaders";

import { GeometryInstanceContainer } from "../types";

const tmpQuaternion = new Quaternion();
const tmpEuler = new Euler();

export enum InstanceType {
    MESH,
    POINTS,
}

class InstancedMesh implements GeometryInstanceContainer {
    private baseGeometry: BufferGeometry;
    private drawable: Mesh | Points;
    private shaderSet: MRTShaders;
    private instancedGeometry: InstancedBufferGeometry;

    private positionAttribute: InstancedBufferAttribute; // x,y,z,scale
    private rotationAttribute: InstancedBufferAttribute; // quaternion
    private instanceAttribute: InstancedBufferAttribute; // instance id, type id (color index), lod scale

    // while updating instances
    private currentInstance: number;
    private isUpdating: boolean;

    constructor(
        type: InstanceType,
        baseGeometry: BufferGeometry,
        name: string,
        count: number
    ) {
        this.baseGeometry = baseGeometry;
        this.drawable =
            type === InstanceType.MESH
                ? new Mesh(baseGeometry)
                : new Points(baseGeometry);
        this.drawable.name = name;

        this.currentInstance = 0;
        this.isUpdating = false;

        this.instancedGeometry = new InstancedBufferGeometry();
        this.instancedGeometry.instanceCount = 0;

        this.shaderSet =
            type === InstanceType.MESH
                ? InstancedMeshShader.shaderSet
                : PDBGBufferShaders.shaderSet;

        // make typescript happy. these will be reallocated in reallocate()
        this.positionAttribute = new InstancedBufferAttribute(
            Uint8Array.from([]),
            1
        );
        this.rotationAttribute = new InstancedBufferAttribute(
            Uint8Array.from([]),
            1
        );
        this.instanceAttribute = new InstancedBufferAttribute(
            Uint8Array.from([]),
            1
        );

        // because instanced, threejs needs to know not to early cull
        this.drawable.frustumCulled = false;

        this.reallocate(count);
    }

    public getMesh(): Mesh | Points {
        return this.drawable;
    }

    public getShaders(): MRTShaders {
        return this.shaderSet;
    }

    public getCapacity(): number {
        return this.instanceAttribute.count;
    }

    public instanceCount(): number {
        return this.instancedGeometry.instanceCount;
    }

    private updateInstanceCount(n: number): void {
        //console.log("total draws = " + n);
        this.instancedGeometry.instanceCount = n;
    }

    public replaceGeometry(geometry: BufferGeometry, name: string): void {
        // TODO this does not handle changing mesh to points or vice versa.
        // e.g you can't have PDBs start out as spheres and then async transition to PDBs
        this.drawable.name = name;
        this.baseGeometry = geometry;
        this.reallocate(this.getCapacity());
    }

    public reallocate(n: number): void {
        // tell threejs/webgl that we can discard the old buffers
        this.dispose();

        // we must create a new Geometry to have things update correctly
        this.instancedGeometry = new InstancedBufferGeometry().copy(
            // this typecast seems like an error in the copy method's typing
            this.baseGeometry as InstancedBufferGeometry
        );
        // install the new geometry into our Mesh object
        this.drawable.geometry = this.instancedGeometry;

        // make new array,
        // copy old array into it,
        // reset into instancedGeometry

        const newPos = new Float32Array(4 * n);
        newPos.set(this.positionAttribute.array);
        this.positionAttribute = new InstancedBufferAttribute(newPos, 4, false);
        this.instancedGeometry.setAttribute(
            "translateAndScale",
            this.positionAttribute
        );

        const newRot = new Float32Array(4 * n);
        newRot.set(this.rotationAttribute.array);
        this.rotationAttribute = new InstancedBufferAttribute(newRot, 4, false);
        this.instancedGeometry.setAttribute("rotation", this.rotationAttribute);

        const newInst = new Float32Array(3 * n);
        newInst.set(this.instanceAttribute.array);
        this.instanceAttribute = new InstancedBufferAttribute(
            newInst,
            3,
            false
        );
        this.instancedGeometry.setAttribute(
            "instanceAndTypeId",
            this.instanceAttribute
        );
    }

    dispose(): void {
        this.instancedGeometry.dispose();
        //this.meshGeometry.dispose();
    }

    beginUpdate(): void {
        this.isUpdating = true;
        this.currentInstance = 0;
        this.updateInstanceCount(0);
    }

    private checkRealloc(count: number) {
        // do we need to increase storage?
        const increment = 256;
        // total num instances possible in buffer
        // (could also check number of rows in datatexture)
        const currentNumInstances = this.instanceAttribute.count;
        // num of instances needed
        const requestedNumInstances = count;

        if (requestedNumInstances > currentNumInstances) {
            // increase to next multiple of increment
            const newInstanceCount =
                (Math.trunc(requestedNumInstances / increment) + 1) * increment;

            this.reallocate(newInstanceCount);
        }
    }

    addInstance(
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
        _subPoints: number[] = []
    ): void {
        const offset = this.currentInstance;
        this.checkRealloc(this.currentInstance + 1);
        this.positionAttribute.setXYZW(offset, x, y, z, scale);
        const q = tmpQuaternion.setFromEuler(tmpEuler.set(rx, ry, rz));
        this.rotationAttribute.setXYZW(offset, q.x, q.y, q.z, q.w);
        this.instanceAttribute.setXYZ(offset, uniqueAgentId, typeId, lodScale);

        this.currentInstance++;
    }

    endUpdate(): void {
        this.updateInstanceCount(this.currentInstance);

        // assumes the entire buffers are invalidated.
        this.instanceAttribute.needsUpdate = true;
        this.positionAttribute.needsUpdate = true;
        this.rotationAttribute.needsUpdate = true;
        this.isUpdating = false;
    }
}

export { InstancedMesh };
