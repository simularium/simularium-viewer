import { Box3Helper, Euler, Object3D, Vector3 } from "three";

import { Volume, VolumeDrawable } from "@aics/volume-viewer";

import { AgentData } from "../simularium/types";

// TEMPORARY HACK to make things typecheck
import { VolumeRenderImpl } from "@aics/volume-viewer/es/types/VolumeRenderImpl";
interface TempRayMarchedVolume extends VolumeRenderImpl {
    boxHelper: Box3Helper;
}

export default class VolumeModel {
    // TODO what to do with this?
    public cancelled = false;
    private image?: VolumeDrawable;

    public setImage(volumeObject: Volume): void {
        this.image = new VolumeDrawable(volumeObject, {});
    }

    public setAgentData(data: AgentData): void {
        if (this.image) {
            this.image.setTranslation(new Vector3(data.x, data.y, data.z));
            this.image.setRotation(new Euler(data.xrot, data.yrot, data.zrot));
            this.image.setScale(new Vector3(data.cr, data.cr, data.cr));
        }
    }

    public getObject3D(): Object3D | undefined {
        return this.image?.sceneRoot;
    }

    public tempGetBoundingBoxObject(): Box3Helper | undefined {
        this.image?.setShowBoundingBox(true);
        return (this.image?.volumeRendering as TempRayMarchedVolume)?.boxHelper;
    }
}
