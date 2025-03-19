import React from "react";
import { CacheLog } from "../../../type-declarations/simularium";

interface CacheLogDisplayProps {
    cacheLog: CacheLog;
    cacheEnabled: boolean;
    maxSize: number;
}

const CacheLogDisplay: React.FC<CacheLogDisplayProps> = ({
    cacheLog,
    cacheEnabled,
    maxSize,
}) => {
    const { size, framesInCache } = cacheLog;

    return (
        <div className="ui-container">
            <div>Cache Enabled: {cacheEnabled ? "Yes" : "No"}</div>
            <div>Current cache size: {size}</div>
            <div> Max Size: {maxSize}</div>
            <div>First Frame Number: {framesInCache[0]}</div>
            <div>
                Last Frame Number: {framesInCache[framesInCache.length - 1]}
            </div>
            <div>
                {framesInCache.length} frames in Cache:{" "}
                {framesInCache.join(", ")}
            </div>
        </div>
    );
};

export default CacheLogDisplay;
