import type {
    Plot,
    SimulariumFileFormat,
    TrajectoryFileInfo,
    VisDataFrame,
    VisDataMessage,
} from "./types";

export interface ISimulariumFile {
    getTrajectoryFileInfo(): TrajectoryFileInfo;
    getPlotData(): Plot[];
    getNumFrames(): number;
    getFrameIndexAtTime(time: number): number;
    getFrame(theFrameNumber: number): VisDataFrame | ArrayBuffer;
    getSpatialData(): VisDataMessage | DataView;
    // Created for the download functionality on the front end.
    // However, what we should do in the long run is create a writer class that
    // reconstitutes a simularium file based on the data stored in the app.
    // this is for handling the case where the user has made changes to a local file
    // by adding plots or changing other parameters and we want to include those in
    // the downloaded file.
    getAsBlob(): Blob;
}
