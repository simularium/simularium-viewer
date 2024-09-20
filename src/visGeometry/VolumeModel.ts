import { Volume } from "@aics/volume-viewer";

export default class VolumeModel {
    // TODO what to do with this?
    public cancelled = false;
    constructor(private volume: Volume) {}
}
