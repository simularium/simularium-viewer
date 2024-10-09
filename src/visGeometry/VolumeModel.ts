import { Box3Helper, Euler, Object3D, Vector3 } from "three";

import { Volume, VolumeDrawable } from "@aics/volume-viewer";

import { AgentData } from "../simularium/types";

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

    public loadInitialData(): void {
        this.volume?.loader?.loadVolumeData(this.volume);
    }

    public setAgentData(data: AgentData): void {
        if (this.drawable) {
            this.drawable.setTranslation(new Vector3(data.x, data.y, data.z));
            this.drawable.setRotation(
                new Euler(data.xrot, data.yrot, data.zrot)
            );
            const r = data.cr * 2;
            this.drawable.setScale(new Vector3(r, r, r));
            // Volume agent data may use subpoint 0 as time
            const time = data.subpoints?.length > 0 ? data.subpoints[0] : 0;
            if (this.volume && this.volume.loadSpec.time !== time) {
                this.volume.updateRequiredData({ time });
            }
        }
    }

    public getObject3D(): Object3D | undefined {
        // TODO showing bounding box for debugging purposes.
        //   Do we want it on by default in production?
        this.drawable?.setShowBoundingBox(true);
        return this.drawable?.sceneRoot;
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
