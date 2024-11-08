import {
    Euler,
    Object3D,
    OrthographicCamera,
    PerspectiveCamera,
    Vector3,
    WebGLRenderer,
} from "three";

import { Lut, Volume, VolumeDrawable } from "@aics/volume-viewer";

import { AgentData } from "../simularium/types";

export default class VolumeModel {
    // TODO what to do with this `cancelled` property? Type check fails without it.
    // When should it be set, if ever; what should it be used for, if anything?
    public cancelled = false;
    private drawable?: VolumeDrawable;
    private volume?: Volume;
    private channelsEnabled: boolean[] = [];
    private scale = 1;

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
            this.drawable.setChannelOptions(channelIndex, { enabled });
        }
    }

    public setImage(volumeObject: Volume): void {
        this.volume = volumeObject;
        this.drawable = new VolumeDrawable(this.volume, {});
        this.volume.addVolumeDataObserver(this);
        this.drawable.setBrightness(0.7);
        this.drawable.setGamma(0.15, 0.9, 1.0);
        this.drawable.setDensity(0.7);
    }

    public setAgentData(data: AgentData): void {
        if (this.drawable) {
            this.drawable.setTranslation(new Vector3(data.x, data.y, data.z));
            this.drawable.setRotation(
                new Euler(data.xrot, data.yrot, data.zrot)
            );
            this.scale = data.cr * 2;
            this.drawable.setScale(
                new Vector3(this.scale, this.scale, this.scale)
            );
            // Always defined if `drawable` is, but ts doesn't know that.
            if (this.volume) {
                // Volume agent data may use subpoint 0 as time
                const numPoints = data.subpoints.length;
                // TODO subpoints seem to be getting sliced out of agent data
                //   incorrectly! The index below should be `0`, not `1`.
                const time = numPoints > 0 ? data.subpoints[1] : 0;
                if (this.volume.loadSpec.time !== time) {
                    this.volume.updateRequiredData({ time });
                }
                // If there are more subpoints, they are enabled channel idxes.
                // Otherwise, just channel 0 is enabled.
                // TODO once again, there's an extra subpoint! These `2`s
                //   should be `1`s.
                const channels = numPoints > 2 ? data.subpoints.slice(2) : [0];
                this.setEnabledChannels(channels);
            }
        }
    }

    public loadInitialData(): void {
        this.volume?.loader?.loadVolumeData(this.volume);
    }

    public getObject3D(): Object3D | undefined {
        return this.drawable?.sceneRoot;
    }

    public onChannelLoaded(_vol: Volume, channelIndex: number): void {
        if (this.drawable) {
            const enabled = this.channelsEnabled[channelIndex];
            this.drawable.setChannelOptions(channelIndex, { enabled });
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
        }
    }

    public setViewportSize(
        width: number,
        height: number,
        orthoScale?: number
    ): void {
        if (this.drawable) {
            const isOrtho = orthoScale !== undefined;
            this.drawable.setIsOrtho(isOrtho);
            if (isOrtho) {
                this.drawable.setOrthoScale(orthoScale);
            }
            this.drawable.setResolution(width, height);
        }
    }

    public onBeforeRender(
        renderer: WebGLRenderer,
        camera: PerspectiveCamera | OrthographicCamera
    ): void {
        this.drawable?.onAnimate(renderer, camera, undefined);
    }

    public setSize(width: number, height: number): void {
        this.drawable?.setResolution(width, height);
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
