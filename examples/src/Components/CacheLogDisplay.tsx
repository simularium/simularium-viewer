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
    const first = framesInCache[0];
    const last = framesInCache[framesInCache.length - 1];

    return (
        <div className="readout">
            <div>
                <span className="k">cache </span>
                <span className="v">{cacheEnabled ? "on" : "off"}</span>
                <span className="k"> · size </span>
                <span className="v">{size}</span>
                <span className="k"> / </span>
                <span className="v">
                    {Number.isFinite(maxSize) ? maxSize : "∞"}
                </span>
            </div>
            <div>
                <span className="k">frames </span>
                <span className="v">{framesInCache.length}</span>
                {framesInCache.length > 0 && (
                    <>
                        <span className="k"> · range </span>
                        <span className="v">
                            {first}–{last}
                        </span>
                    </>
                )}
            </div>
        </div>
    );
};

export default CacheLogDisplay;
