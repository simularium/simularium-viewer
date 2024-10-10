import { Euler, Object3D, Vector3 } from "three";

import {
    Lut,
    Volume,
    VolumeDrawable,
    HasThreeJsContext,
} from "@aics/volume-viewer";

import { AgentData } from "../simularium/types";

export default class VolumeModel {
    // TODO what to do with this `cancelled` property? Type check fails without it.
    // When should it be set, if ever; what should it be used for, if anything?
    public cancelled = false;
    private drawable?: VolumeDrawable;
    private volume?: Volume;
    private channelsEnabled: boolean[] = [];

    private setEnabledChannels(channels: number[]): void {
        if (!this.volume || !this.drawable) {
            this.channelsEnabled = [];
            return;
        }
        const { numChannels } = this.volume.imageInfo;
        this.channelsEnabled = new Array(numChannels).fill(false);

        for (const channel of channels) {
            if (channel < numChannels) {
                this.channelsEnabled[channel] = true;
            }
        }

        for (const [channelIndex, enabled] of this.channelsEnabled.entries()) {
            this.drawable.setVolumeChannelEnabled(channelIndex, enabled);
        }
    }

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
            // Always defined if `drawable` is, but ts doesn't know that.
            if (this.volume) {
                // Volume agent data may use subpoint 0 as time
                const numPoints = data.subpoints.length;
                const time = numPoints > 0 ? data.subpoints[0] : 0;
                if (this.volume.loadSpec.time !== time) {
                    this.volume.updateRequiredData({ time });
                }
                // If there are more subpoints, they are enabled channel idxes.
                // Otherwise, just channel 0 is enabled.
                const channels = numPoints > 1 ? data.subpoints.slice(1) : [0];
                this.setEnabledChannels(channels);
            }
        }
    }

    public loadInitialData(): void {
        this.volume?.loader?.loadVolumeData(this.volume);
    }

    public getObject3D(): Object3D | undefined {
        // TODO showing bounding box for debugging purposes.
        //   Do we want it on by default in production? Probably not?
        this.drawable?.setShowBoundingBox(true);
        return this.drawable?.sceneRoot;
    }

    public onChannelLoaded(vol: Volume, channelIndex: number): void {
        if (this.drawable) {
            console.log("load", channelIndex);
            const isEnabled = this.channelsEnabled[channelIndex];
            this.drawable.setVolumeChannelEnabled(channelIndex, isEnabled);
            this.drawable.updateScale();
            this.drawable.onChannelLoaded([channelIndex]);
            if (this.volume) {
                const histo = this.volume.getHistogram(channelIndex);
                const min = histo.findBinOfPercentile(0.5);
                const max = histo.findBinOfPercentile(0.983);
                const lut = new Lut().createFromMinMax(min, max);
                this.volume.setLut(channelIndex, lut);
            }
            this.drawable.updateLuts();
            this.drawable.fuse();
            if (this.drawable && channelIndex === 0) {
                console.log(this.drawable);
            }
        }
    }

    public onBeforeRender(context: HasThreeJsContext): void {
        this.drawable?.onAnimate(context);
    }

    // METHODS FROM `VolumeDataObserver` in volume-viewer

    public onVolumeData(_volume: Volume, channels: number[]): void {
        this.drawable?.updateScale();
        this.drawable?.onChannelLoaded(channels);
    }

    public onVolumeChannelAdded(
        _volume: Volume,
        newChannelIndex: number
    ): void {
        this.drawable?.onChannelAdded(newChannelIndex);
    }

    public onVolumeLoadError(_volume: Volume, error: unknown): void {
        console.error("Volume load error", error);
    }
}
