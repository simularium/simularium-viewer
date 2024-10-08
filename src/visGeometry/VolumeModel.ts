import { Box3Helper, Euler, Object3D, Vector3 } from "three";

import { Volume, VolumeDrawable } from "@aics/volume-viewer";

import { AgentData } from "../simularium/types";

// TEMPORARY HACK to make things typecheck. TODO remove!
import { VolumeRenderImpl } from "@aics/volume-viewer/es/types/VolumeRenderImpl";
interface TempRayMarchedVolume extends VolumeRenderImpl {
    boxHelper: Box3Helper;
}

export default class VolumeModel {
    // TODO what to do with this `cancelled` property? Type check fails without it.
    // When should it be set, if ever; what should it be used for, if anything?
    public cancelled = false;
    private drawable?: VolumeDrawable;
    private volume?: Volume;

    public setImage(volumeObject: Volume): void {
        this.volume = volumeObject;
        this.drawable = new VolumeDrawable(this.volume, {});
        this.volume.addVolumeDataObserver(this);
    }

    public setAgentData(data: AgentData): void {
        if (this.drawable) {
            this.drawable.setTranslation(new Vector3(data.x, data.y, data.z));
            this.drawable.setRotation(
                new Euler(data.xrot, data.yrot, data.zrot)
            );
            const r = data.cr * 2;
            this.drawable.setScale(new Vector3(r, r, r));
        }
    }

    public getObject3D(): Object3D | undefined {
        return this.drawable?.sceneRoot;
    }

    public tempGetBoundingBoxObject(): Box3Helper | undefined {
        this.drawable?.setShowBoundingBox(true);
        return (this.drawable?.volumeRendering as TempRayMarchedVolume)
            ?.boxHelper;
    }

    // METHODS FROM `VolumeDataObserver` in volume-viewer

    onVolumeData(_volume: Volume, channels: number[]): void {
        this.drawable?.updateScale();
        this.drawable?.onChannelLoaded(channels);
    }

    onVolumeChannelAdded(_volume: Volume, newChannelIndex: number): void {
        this.drawable?.onChannelAdded(newChannelIndex);
    }

    onVolumeLoadError(_volume: Volume, error: unknown): void {
        console.error("Volume load error", error);
    }
}
