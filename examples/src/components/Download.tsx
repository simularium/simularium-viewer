import React from "react";
import { SimulariumFile } from "../types";

interface DownloadProps {
    simulariumFile: SimulariumFile | null;
}

const Download = (props: DownloadProps): JSX.Element => {
    const { simulariumFile } = props;

    const downloadFile = () => {
        if (!simulariumFile) {
            return;
        }
        let href = "";
        if (!simulariumFile.data) {
            href = `https://aics-simularium-data.s3.us-east-2.amazonaws.com/trajectory/${simulariumFile.name}`;
        } else {
            href = URL.createObjectURL(simulariumFile.data.getAsBlob());
        }
        const downloadLink = document.createElement("a");
        downloadLink.download = simulariumFile.name;
        downloadLink.style.display = "none";
        downloadLink.href = href;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(downloadLink.href);
    }

    return (
        <>
            <button onClick={downloadFile}>Download</button>
        </>
    );
};

export default Download;
