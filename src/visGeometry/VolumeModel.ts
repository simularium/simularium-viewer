import {
    Euler,
    Object3D,
    OrthographicCamera,
    PerspectiveCamera,
    Vector3,
    WebGLRenderer,
} from "three";

import { Lut, Volume, VolumeDrawable } from "@aics/vole-core";

import { AgentData } from "../simularium/types";

export default class VolumeModel {
    // TODO what to do with this `cancelled` property? Type check fails without it.
    // When should it be set, if ever; what should it be used for, if anything?
    public cancelled = false;
    private drawable?: VolumeDrawable;
    private volume?: Volume;
    private channelsEnabled: Set<number> = new Set();
    /** When true, this model just shows up as an empty bounding box */
    private hidden = false;
    private scale = 1;

    /**
     * Syncs the current value of `this.channelsEnabled` and `this.hidden` to
     * the volume object.
     *
     * Not to be confused with `setChannelsEnabled`, which sets
     * `this.channelsEnabled` first, or with `setHidden`, which sets
     * `this.hidden` first. You probably want to use one of those instead!
     */
    private applyChannelsEnabled(
        volume: Volume,
        drawable: VolumeDrawable
    ): void {
        const { numChannels } = volume.imageInfo;
        for (let c = 0; c < numChannels; c++) {
            drawable.setChannelOptions(c, {
                enabled: this.hidden ? false : this.channelsEnabled.has(c),
            });
        }
    }

    /** Sets currently enabled channels. */
    private setChannelsEnabled(channels: number[]): void {
        if (!this.volume || !this.drawable) {
            if (this.channelsEnabled.size > 0) {
                this.channelsEnabled = new Set();
            }
            return;
        }
        const { numChannels } = this.volume.imageInfo;
        this.channelsEnabled = new Set(channels.filter((c) => c < numChannels));

        this.applyChannelsEnabled(this.volume, this.drawable);
    }

    /**
     * Sets whether this model is hidden. A hidden model shows a bounding box
     * outline rather than a rendered volume.
     */
    private setHidden(hidden: boolean): void {
        if (this.hidden === hidden || !this.drawable || !this.volume) {
            return;
        }
        this.hidden = hidden;

        this.applyChannelsEnabled(this.volume, this.drawable);
        this.drawable.setBoundingBoxColor([1, 1, 1]);
        this.drawable.setShowBoundingBox(hidden);
    }

    public setImage(volumeObject: Volume): void {
        this.volume = volumeObject;
        this.drawable = new VolumeDrawable(this.volume, {});
        this.volume.addVolumeDataObserver(this);
        this.drawable.setBrightness(0.7);
        this.drawable.setGamma(0.15, 0.9, 1.0);
        this.drawable.setDensity(0.7);
    }

    public async setAgentData(
        data: AgentData,
        syncLoading?: boolean,
        hideWhileLoading?: boolean
    ): Promise<void> {
        if (!this.volume || !this.drawable) {
            return;
        }

        // Volume agent data may use subpoint 0 as time
        const numPoints = data.subpoints.length;
        const time = numPoints > 0 ? data.subpoints[0] : 0;
        // If there are more subpoints, they are enabled channel idxes.
        // Otherwise, just channel 0 is enabled.
        const { numChannels } = this.volume.imageInfo;
        const channels =
            numPoints > 1
                ? data.subpoints.slice(1).filter((c) => c < numChannels)
                : [0];

        if (this.volume.loadSpec.time !== time) {
            const volume = this.volume;

            if (hideWhileLoading) {
                this.setHidden(true);
            }

            const promise: Promise<void> = new Promise((resolve) => {
                // SEMI-HACK: `setHidden` above disables all channels, including ones we want to load.
                // So, when hidden, force those channels to load anyway.
                volume.updateRequiredData({ time, channels }, () => {
                    this.setHidden(false);
                    resolve();
                });
            });

            if (syncLoading) {
                await promise;
            }
        }

        this.setChannelsEnabled(channels);
        this.drawable.setTranslation(new Vector3(data.x, data.y, data.z));
        this.drawable.setRotation(new Euler(data.xrot, data.yrot, data.zrot));
        this.scale = data.cr * 2;
        this.drawable.setScale(new Vector3(this.scale, this.scale, this.scale));
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
