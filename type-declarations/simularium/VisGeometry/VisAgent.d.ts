import { CatmullRomCurve3, Color, SphereBufferGeometry, Vector3 } from "three";
import { AgentData } from "../VisData";
export default class VisAgent {
    private static readonly UNASSIGNED_MESH_COLOR;
    static readonly UNASSIGNED_NAME_PREFIX = "Unassigned";
    static sphereGeometry: SphereBufferGeometry;
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
    resetMesh(): void;
    setColor(color: Color, colorIndex: number): void;
    setHidden(hidden: boolean): void;
    setFollowed(followed: boolean): void;
    setHighlighted(highlighted: boolean): void;
    signedTypeId(): number;
    private onPdbBeforeRender;
    hideAndDeactivate(): void;
    updateFiber(subpoints: number[]): void;
    getFollowPosition(): Vector3;
}
