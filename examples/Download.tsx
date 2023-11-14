/* eslint-disable react/prop-types */
import React, {
    ReactElement,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
// import {
//     Button,
//     Modal,
//     Input,
//     Radio,
//     Space,
//     RadioChangeEvent,
//     InputNumber,
//     App,
//     Progress,
//     Tooltip,
//     Card,
// } from "antd";
// import { CheckCircleOutlined } from "@ant-design/icons";
// import styled from "styled-components";
import { clamp } from "three/src/math/MathUtils";

// import SpinBox from "./SpinBox";
// import ImageSequenceRecorder from "../colorizer/recorders/ImageSequenceRecorder";
import CanvasRecorder, {
    RecordingOptions,
} from "../src/recorders/CanvasRecorder";
// import { AppThemeContext } from "./AppStyle";
import Mp4VideoRecorder, {
    VideoBitrate,
} from "../src/recorders/Mp4Recorder";

type DownloadButtonProps = {
    totalFrames: number;
    // setFrame: (frame: number) => Promise<void>;
    setFrame: (frame: number) => number;
    getCanvas: () => HTMLCanvasElement;
    /** Callback, called whenever the button is clicked. Can be used to stop playback. */
    onClick?: () => void;
    currentFrame: number;
    /** Callback, called whenever the recording process starts or stops. */
    setIsRecording?: (recording: boolean) => void;
    defaultImagePrefix?: string;
    disabled?: boolean;
};

const defaultProps: Partial<DownloadButtonProps> = {
    setIsRecording: () => {},
    defaultImagePrefix: "image",
    disabled: false,
    onClick: () => {},
};

/**
 * A single Export button that opens up an export modal when clicked. Manages starting and stopping
 * an image sequence recording, resetting state when complete.
 * 
 * 
 * 
 * // SIM TODO: for our purposes this will be a component that is a few buttons and divs
 * there wont be a modal
 * 
 */
export default function Download(inputProps: DownloadButtonProps): ReactElement {
    const props = {
        ...defaultProps,
        ...inputProps,
    } as Required<DownloadButtonProps>;

    // SIM TODO: not needed for mp4/sim/mvp
    // const theme = useContext(AppThemeContext);

    // SIM TODO: not needed for mp4/sim/mvp
    // const enum RangeMode {
    //     ALL,
    //     CURRENT,
    //     CUSTOM,
    // }

    // SIM TODO: not needed for mp4/sim/mvp
    // const enum RecordingMode {
    //     IMAGE_SEQUENCE,
    //     VIDEO_MP4,
    // }

    // SIM TODO: not needed for mp4/sim/mvp
    // Static convenience method for creating simple modals + notifications.
    // Used here for the cancel modal and the success notification.
    // Note: notification API seems to only place notifications at the top-level under the
    // <body> tag, which causes some issues with styling.
    // const { modal, notification } = App.useApp();
    // const modalContextRef = useRef<HTMLDivElement>(null);

    // const originalFrameRef = useRef(props.currentFrame);
    // const [isLoadModalOpen, _setIsLoadModalOpen] = useState(false);

    // SIM TODO : seems useful but not for modal...
    const [isRecording, _setIsRecording] = useState(false);

    // SIM TODO: not needed for mp4/sim/mvp
    // const [isPlayingCloseAnimation, setIsPlayingCloseAnimation] =
    //     useState(false);

    // SIM TODO: not needed for mp4/sim/mvp
    // const [recordingMode, _setRecordingMode] = useState(
    //     RecordingMode.IMAGE_SEQUENCE
    // );

    const recorder = useRef<CanvasRecorder | null>(null);
    // SIM TODO: not needed for mp4/sim/mvp
    // const [errorText, setErrorText] = useState<null | string>(null);

    // TODO: Store these settings to local storage so they persist?
    // const [rangeMode, setRangeMode] = useState(RangeMode.ALL);
    const [customMin, setCustomMin] = useState(0);
    const [customMax, setCustomMax] = useState(props.totalFrames - 1);
    const [imagePrefix, setImagePrefix] = useState(props.defaultImagePrefix);
    const [useDefaultImagePrefix, setUseDefaultImagePrefix] = useState(true);
    const [frameIncrement, setFrameIncrement] = useState(1);
    const [fps, setFps] = useState(30);
    const [videoBitsPerSecond, setVideoBitsPerSecond] = useState(
        VideoBitrate.MEDIUM
    );

    // SIM TODO: not needed for mp4/sim/mvp
    // const [percentComplete, setPercentComplete] = useState(0);

    // SIM TODO: not needed for mp4/sim/mvp
    // Override setRecordingMode when switching to video; users should not choose current frame only
    // (since exporting the current frame only as a video doesn't really make sense.)
    // const setRecordingMode = (mode: RecordingMode): void => {
    //     _setRecordingMode(mode);
    //     if (
    //         mode === RecordingMode.VIDEO_MP4 &&
    //         rangeMode === RangeMode.CURRENT
    //     ) {
    //         setRangeMode(RangeMode.ALL);
    //     }
    // };

    // SIM TODO: not needed for mp4/sim/mvp
    // Override setIsLoadModalOpen to store the current frame whenever the modal opens.
    // This is so we can reset to it when the modal is closed.
    // const setIsLoadModalOpen = (isOpen: boolean): void => {
    //     if (isOpen) {
    //         originalFrameRef.current = props.currentFrame;
    //         setErrorText(null);
    //     }
    //     _setIsLoadModalOpen(isOpen);
    // };

    // Notify parent via props if recording state changes
    const setIsRecording = (isRecording: boolean): void => {
        props.setIsRecording(isRecording);
        _setIsRecording(isRecording);
    };

    // SIM TODO: not needed for mp4/sim
    // If dataset changes, update the max range field with the total frames.
    // useEffect(() => {
    //     setCustomMax(props.totalFrames - 1);
    // }, [props.totalFrames]);

    // SIM TODO: not needed for mp4
    // const getImagePrefix = (): string => {
    //     if (useDefaultImagePrefix) {
    //         if (recordingMode === RecordingMode.IMAGE_SEQUENCE) {
    //             // Add separator between prefix and frame number
    //             return props.defaultImagePrefix + "-";
    //         } else {
    //             return props.defaultImagePrefix;
    //         }
    //     } else {
    //         return imagePrefix;
    //     }
    // };

    //////////////// EVENT HANDLERS ////////////////

    /** Stop any ongoing recordings and reset the current frame, optionally closing the modal. */
    const stopRecording = useCallback(
        (closeModal: boolean) => {
            recorder.current?.abort();
            // Reset the frame number (clean up!)
            // props.setFrame(originalFrameRef.current);
            setIsRecording(false);
            recorder.current = null;
            // setIsPlayingCloseAnimation(false);
            // setPercentComplete(0);
            // if (closeModal) {
            //     setIsLoadModalOpen(false);
            // }
        },

        // SIM TODO: removed the prop this had as a dependency
        // [props.setFrame]
        []
    );

    /**
     * Triggered when the user attempts to cancel or exit the main modal.
     *
     * SIM TODO: not using modal functions, are there necessary things here?
     */
    // const handleCancel = useCallback(() => {
    //     // Not recording; exit
    //     if (!isRecording) {
    //         setIsLoadModalOpen(false);
    //         return;
    //     }

    //     // Currently recording; user must be prompted to confirm
    //     modal.confirm({
    //         title: "Cancel export",
    //         content: "Are you sure you want to cancel and exit?",
    //         okText: "Cancel",
    //         cancelText: "Back",
    //         centered: true,
    //         icon: null,
    //         getContainer: modalContextRef.current || undefined,
    //         onOk: () => {
    //             stopRecording(true);
    //         },
    //     });
    // }, [isRecording, modalContextRef.current, stopRecording]);

    /**
     * Stop the recording without closing the modal.
     *
     * SIM TODO: we don't need a modal initially
     */
    const handleStop = useCallback(() => {
        stopRecording(false);
        // setErrorText(null);
    }, [stopRecording]);

    const handleError = useCallback((error: Error) => {
        // Stop current recording and show error message
        // setErrorText(error.message);
        if (recorder.current) {
            recorder.current.abort();
        }
    }, []);

    // Note: This is not wrapped in a useCallback because it has a large number
    // of dependencies, and is likely to update whenever ANY prop or input changes.
    /**
     * Handle the user pressing the Export button and starting a recording.
     */
    const handleStartExport = (): void => {
        if (isRecording) {
            return;
        }
        setIsRecording(true);
        // setErrorText(null);

        /** Min and max are both inclusive */
        // we are only ever going to want a custom range
        // and that range will be defined by playback
        // unless we want an mvp feature that plays it back
        // and exports the whole thing
        // SIM TODO: not needed for mp4/sim/mvp
        let min: number, max: number;
        // switch (rangeMode) {
        //     case RangeMode.ALL:
        //         min = 0;
        //         max = props.totalFrames - 1;
        //         break;
        //     case RangeMode.CURRENT:
        //         min = props.currentFrame;
        //         max = props.currentFrame;
        //         break;
        //     case RangeMode.CUSTOM:
        //         // Clamp range values in case of unsafe input
        //         min = clamp(customMin, 0, props.totalFrames - 1);
        //         max = clamp(customMax, min, props.totalFrames - 1);
        // }

        // we need to set min and max
        min = 0;
        max = props.totalFrames - 1;
        console.log("min: " + min + " max: " + max)

        // Copy configuration to options object
        // want to minimize this as much as possible for MVP
        const recordingOptions: Partial<RecordingOptions> = {
            min: min,
            max: max,
            prefix: props.defaultImagePrefix,
            minDigits: (props.totalFrames - 1).toString().length,
            // Disable download delay for video
            delayMs: 0,
            frameIncrement: frameIncrement,
            fps: fps,
            bitrate: videoBitsPerSecond,
            onCompleted: async () => {
                // Close modal once recording finishes and show completion notification
                // TODO SIM quality of life, can handle these later
                // re: percent complete and notification of success
                // setPercentComplete(100);
                // notification.success({
                //     message: "Export complete.",
                //     placement: "bottomLeft",
                //     duration: 4,
                //     icon: (
                //         <div
                //             // style={{ color: theme.color.text.success }}
                //         />
                //     ),
                // });
                console.log("complete")
            }
        };
        //         // Close the modal after a small delay so the success notification can be seen
        //         setIsPlayingCloseAnimation(true);
        //         setTimeout(() => stopRecording(true), 750);
        //     },
        // SIM TODO: after proof of concept
        //     onRecordedFrame: (frame: number) => {
        //         // Update the progress bar as frames are recorded.
        //         setPercentComplete(
        //             Math.floor(((frame - min) / (max - min)) * 100)
        //         );
        //     },
        //     onError: handleError,
        // };

        // copied over from default
        // const recordingOptions = {
        //     min: 0,
        //     max: 0,
        //     frameIncrement: 1,
        //     prefix: "image-",
        //     delayMs: 100,
        //     fps: 30,
        //     bitrate: 10e6,
        //     outputSize: [730, 500] as [number, number],
        //     onCompleted: async function (): Promise<void> {},
        //     onRecordedFrame: function (_frame: number): void {},
        //     onError: function (_error: Error): void {},
        // };
        //from nucmorph switch statement for initializing different recorders
        // except we just have mp4
        recorder.current = new Mp4VideoRecorder(
            props.setFrame,
            props.getCanvas,
            recordingOptions
        );
        recorder.current.start();
    };

    //////////////// RENDERING ////////////////
    // video quality options
    // is webcodecs enabled
    // custom frame ranger
    //get duration
    //get approximate file size
    // progress bar color and styling

    return (
        /**
         * want to have a component that contains all the relevant pieces of the export button
         * MVP will be:
         * a record button
         * a stop recording button
         * a display of recording state
         *
         * further features:
         * a progress tracker
         * a download tracker
         *
         * bonuses:
         * start/stop recording when playback starts and stops?
         *
         */
        <div>
            <button onClick={handleStartExport}>
                Start Recording
            </button>
            <button
            // onClick={this.stopRecording.bind(this)}
            >
                Stop Recording
            </button>
            {/* {this.state.recordingTime > 0 && (
                <span>Recording length: {this.state.recordingTime} s</span>
            )}
            {this.state.videoOutputStatus && (
                <span> | {this.state.videoOutputStatus}</span>
            )} */}
        </div>
    );
}
