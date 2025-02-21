import { DEFAULT_CAMERA_SPEC } from "../constants";
import { UIDisplayData, UIDisplayEntry } from "./SelectionInterface";
import {
    TrajectoryFileInfo,
    VisDataFrame,
    Plot,
    SimulariumFileFormat,
    CachedFrame,
} from "./types";

/**
 * JsonFileWriter
 *
 * Responsible for:
 * 1) Validating and optionally updating trajectory information (color overrides, etc.)
 * 2) Assembling frames from the cache into into a SimulariumFileFormat object
 * 3) Generating a Blob for saving or uploading.
 *
 */
export class JsonFileWriter {
    /**
     * @param trajectoryInfo - Simulation metadata
     * @param frames - An array of frames containing the raw agent data
     * @param plotData - An array of plot specifications (optional)
     * @param uiDisplayData - Optional UI-based overrides for color or other display attributes
     * @param useAppliedColors - Whether to apply color overrides from UI to the typeMapping
     * @param isClientSimRun - If true, modifies the trajectory title and totalSteps handling to
     * allow for non-matching frame counts and non-zero first frame numbers
     */
    constructor(
        private trajectoryInfo: TrajectoryFileInfo,
        private frames: CachedFrame[],
        private plotData: Plot[],
        private uiDisplayData?: UIDisplayData,
        private useAppliedColors = true,
        private isClientSimRun = false
    ) {
        // Sort the frames by frameNumber to ensure correct ordering
        this.frames.sort((a, b) => a.frameNumber - b.frameNumber);

        // Validate essential pieces of trajectoryInfo
        this.validateTrajectoryInfo();

        // If UI overrides are requested, update colors in the trajectory info
        if (this.uiDisplayData && this.useAppliedColors) {
            this.applyUIDisplayColorOverrides();
        }
    }

    /**
     * Apply color overrides found in uiDisplayData to the trajectoryInfo's typeMapping
     */
    private applyUIDisplayColorOverrides(): void {
        if (!this.uiDisplayData) return;

        this.uiDisplayData.forEach((entry: UIDisplayEntry) => {
            if (entry.displayStates?.length > 0) {
                entry.displayStates.forEach((state) => {
                    // Look for the full name including state in the type mapping
                    const fullName = `${entry.name}#${state.id}`;
                    const typeId = Object.entries(
                        this.trajectoryInfo.typeMapping
                    ).find(([_, value]) => value.name === fullName)?.[0];

                    if (
                        typeId &&
                        this.trajectoryInfo.typeMapping[typeId]?.geometry
                    ) {
                        this.trajectoryInfo.typeMapping[typeId].geometry.color =
                            state.color;
                    }
                });
            } else {
                // Handle base type without states
                const typeId = Object.entries(
                    this.trajectoryInfo.typeMapping
                ).find(([_, value]) => value.name === entry.name)?.[0];

                if (
                    typeId &&
                    this.trajectoryInfo.typeMapping[typeId]?.geometry
                ) {
                    this.trajectoryInfo.typeMapping[typeId].geometry.color =
                        entry.color;
                }
            }
        });
    }

    /**
     * Validate that required trajectoryInfo fields are present,
     * set totalSteps, and apply a default camera if none is provided.
     */
    private validateTrajectoryInfo() {
        if (!this.trajectoryInfo.spatialUnits) {
            throw new Error("TrajectoryInfo must include spatialUnits");
        }
        if (
            !this.trajectoryInfo.spatialUnits.magnitude ||
            !this.trajectoryInfo.spatialUnits.name
        ) {
            throw new Error(
                "TrajectoryInfo spatialUnits must include magnitude and name"
            );
        }

        if (!this.trajectoryInfo.timeUnits) {
            throw new Error("TrajectoryInfo must include timeUnits");
        }
        if (
            !this.trajectoryInfo.timeUnits.magnitude ||
            !this.trajectoryInfo.timeUnits.name
        ) {
            throw new Error(
                "TrajectoryInfo timeUnits must include magnitude and name"
            );
        }

        if (!this.trajectoryInfo.size) {
            throw new Error("TrajectoryInfo must include size");
        }
        const { x, y, z } = this.trajectoryInfo.size;
        if (
            typeof x !== "number" ||
            typeof y !== "number" ||
            typeof z !== "number"
        ) {
            throw new Error(
                "TrajectoryInfo.size must include numeric x, y, and z values"
            );
        }

        // Set total steps
        this.trajectoryInfo.totalSteps = this.frames.length;

        // Apply default camera position if not provided
        if (!this.trajectoryInfo.cameraDefault) {
            this.trajectoryInfo.cameraDefault = DEFAULT_CAMERA_SPEC;
        }
    }

    /**
     * Build a SimulariumFileFormat object from the stored trajectory info, frames, and plot data.
     * @returns A JSON SimulariumFileFormat ready object
     */
    public getFileContents(): SimulariumFileFormat {
        // Validate/update number of frames and totalSteps
        if (this.frames.length !== this.trajectoryInfo.totalSteps) {
            if (this.isClientSimRun) {
                console.warn(
                    "Overwriting totalSteps to match output frames for a client simulation run."
                );
                this.trajectoryInfo.totalSteps = this.frames.length;
            } else {
                throw new Error(
                    `Mismatch: totalSteps (${this.trajectoryInfo.totalSteps}) vs number of frames (${this.frames.length})`
                );
            }
        }
        if (!this.trajectoryInfo.trajectoryTitle) {
            this.trajectoryInfo.trajectoryTitle = "untitled";
        }
        if (this.isClientSimRun) {
            this.trajectoryInfo.trajectoryTitle +=
                "_simRunTimestamp:" + new Date().toISOString();
        }
        const visDataFrames = this.frames.map((cachedFrame, index) => {
            // Create a Float32Array view of the frame data
            const floatView = new Float32Array(cachedFrame.data);
            const data: number[] = [];

            // Skip first 3 floats (frameNumber, time, agentCount)
            let offset = 3;

            // Process each agent's data
            for (let i = 0; i < cachedFrame.agentCount; i++) {
                // Read the visualization type from the frame data
                const visType = floatView[offset];
                data.push(visType);

                // Copy the rest of the agent data (instance ID through subpoints)
                const agentData = floatView.slice(offset + 1, offset + 11);
                data.push(...Array.from(agentData));

                // Handle any subpoints
                const subpointsCount = agentData[9]; // Last value is subpoints count
                if (subpointsCount > 0) {
                    const subpoints = floatView.slice(
                        offset + 11,
                        offset + 11 + subpointsCount
                    );
                    data.push(...Array.from(subpoints));
                    offset += 11 + subpointsCount;
                } else {
                    offset += 11;
                }
            }

            return {
                frameNumber: index,
                time: cachedFrame.time,
                data: data,
                agentCount: cachedFrame.agentCount,
            } as VisDataFrame;
        });

        const fileContents: SimulariumFileFormat = {
            trajectoryInfo: this.trajectoryInfo,
            spatialData: {
                msgType: 1,
                bundleStart: 0,
                bundleSize: visDataFrames.length,
                bundleData: visDataFrames,
                fileName: this.trajectoryInfo.trajectoryTitle,
            },
            plotData: {
                version: 1,
                data: this.plotData,
            },
        };
        return fileContents;
    }

    /**
     * @returns A Blob containing the JSON representation of the Simularium file
     */
    public getBlob(): Blob {
        return new Blob([JSON.stringify(this.getFileContents())], {
            type: "text/plain;charset=utf-8",
        });
    }
}
