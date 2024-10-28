import { CatmullRomCurve3, Color, Vector3 } from "three";

import VisTypes from "../simularium/VisTypes";
import { AgentData } from "../simularium/types";
import { AgentColorInfo } from "./types";

const NO_AGENT = -1;

export default class VisAgent {
    private static readonly UNASSIGNED_MESH_COLOR = 0xff00ff;
    public static readonly UNASSIGNED_NAME_PREFIX = "Unassigned";

    public agentData: AgentData;

    public fiberCurve?: CatmullRomCurve3;

    public colorIndex: number;
    public active: boolean;
    public color: Color;
    public name: string;
    public followed: boolean;
    public highlighted: boolean;
    public hidden: boolean;

    public constructor(name: string) {
        this.agentData = {
            x: 0,
            y: 0,
            z: 0,
            xrot: 0,
            yrot: 0,
            zrot: 0,
            instanceId: NO_AGENT,
            visType: VisTypes.ID_VIS_TYPE_DEFAULT,
            type: 0,
            cr: 1.0,
            subpoints: [],
        };
        this.name = name;
        this.color = new Color(VisAgent.UNASSIGNED_MESH_COLOR);
        this.active = false;
        this.colorIndex = 0;
        this.followed = false;
        this.hidden = false;
        this.highlighted = false;

        this.fiberCurve = undefined;
    }

    public resetAgent(): void {
        this.active = false;
        this.hidden = false;
        this.followed = false;
        this.fiberCurve = undefined;
    }

    public resetMesh(): void {
        this.followed = false;
        this.highlighted = false;
        this.setColor({
            color: new Color(VisAgent.UNASSIGNED_MESH_COLOR),
            colorId: 0,
        });
        this.agentData = {
            x: 0,
            y: 0,
            z: 0,
            xrot: 0,
            yrot: 0,
            zrot: 0,
            instanceId: NO_AGENT,
            visType: VisTypes.ID_VIS_TYPE_DEFAULT,
            type: 0,
            cr: 1.0,
            subpoints: [],
        };
    }

    public setColor(colorInfo: AgentColorInfo): void {
        this.color = colorInfo.color;
        this.colorIndex = colorInfo.colorId;
    }

    public setHidden(hidden: boolean): void {
        this.hidden = hidden;
    }

    public setFollowed(followed: boolean): void {
        this.followed = followed;
    }

    public setHighlighted(highlighted: boolean): void {
        if (highlighted !== this.highlighted) {
            this.highlighted = highlighted;
        }
    }

    public signedTypeId(): number {
        // Note, adding 1 to colorIndex because it can be 0 and the signed multiplier won't do anything.
        // This means we have to subtract 1 in the downstream code (the shaders) if we need the true value.
        return (this.colorIndex + 1) * (this.highlighted ? 1 : -1);
    }

    private onPdbBeforeRender(
        this: VisAgent,
        renderer,
        scene,
        camera,
        geometry,
        material
        /* group */
    ): void {
        if (!material.uniforms) {
            return;
        }
        // colorIndex is not necessarily equal to typeId but is generally a 1-1 mapping.
        if (material.uniforms.typeId) {
            // negate the value if dehighlighted.
            // see implementation in CompositePass.ts for how the value is interpreted
            material.uniforms.typeId.value = this.signedTypeId();
            material.uniformsNeedUpdate = true;
        }
        if (material.uniforms.instanceId) {
            material.uniforms.instanceId.value = Number(
                this.agentData.instanceId
            );
            material.uniformsNeedUpdate = true;
        }
        if (material.uniforms.radius) {
            const lod = 0;
            material.uniforms.radius.value = (lod + 1) * 0.25; // * 8;
            material.uniformsNeedUpdate = true;
        }
    }

    public hideAndDeactivate(): void {
        this.active = false;
    }

    public updateFiber(subpoints: number[]): void {
        const numSubPoints = subpoints.length;
        const numPoints = numSubPoints / 3;
        if (numSubPoints % 3 !== 0) {
            console.warn(
                "Warning, subpoints array does not contain a multiple of 3"
            );
            return;
        }
        if (numPoints < 2) {
            console.warn(
                "Warning, subpoints array does not have enough points for a curve"
            );
            return;
        }
        // put all the subpoints into a Vector3[]
        const curvePoints: Vector3[] = [];
        for (let j = 0; j < numSubPoints; j += 3) {
            const x = subpoints[j];
            const y = subpoints[j + 1];
            const z = subpoints[j + 2];
            curvePoints.push(new Vector3(x, y, z));
        }

        // set up new fiber as curved tube
        this.fiberCurve = new CatmullRomCurve3(curvePoints);
    }

    public getFollowPosition(): Vector3 {
        const pos = new Vector3(
            this.agentData.x,
            this.agentData.y,
            this.agentData.z
        );
        if (
            this.agentData.visType === VisTypes.ID_VIS_TYPE_FIBER &&
            this.fiberCurve
        ) {
            return this.fiberCurve.getPoint(0.5).add(pos);
        } else {
            return pos;
        }
    }
}
