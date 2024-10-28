import { CatmullRomCurve3, Color, Vector3 } from "three";
import { AgentData } from "../simularium/types";
import { AgentColorInfo } from "./types";
export default class VisAgent {
    private static readonly UNASSIGNED_MESH_COLOR;
    static readonly UNASSIGNED_NAME_PREFIX = "Unassigned";
    agentData: AgentData;
    fiberCurve?: CatmullRomCurve3;
    colorIndex: number;
    active: boolean;
    color: Color;
    name: string;
    followed: boolean;
    highlighted: boolean;
    hidden: boolean;
    constructor(name: string);
    resetAgent(): void;
    resetMesh(): void;
    setColor(colorInfo: AgentColorInfo): void;
    setHidden(hidden: boolean): void;
    setFollowed(followed: boolean): void;
    setHighlighted(highlighted: boolean): void;
    signedTypeId(): number;
    private onPdbBeforeRender;
    hideAndDeactivate(): void;
    updateFiber(subpoints: number[]): void;
    getFollowPosition(): Vector3;
}
