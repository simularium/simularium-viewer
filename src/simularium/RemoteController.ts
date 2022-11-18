import { IConverter } from "./IConverter";
import { ILogger } from "js-logger";
import { FrontEndError, ErrorLevel } from "./FrontEndError";
import { NetMessageEnum } from "./RemoteSimulator";

import jsLogger from "js-logger";

export class RemoteConverter implements IConverter {
    protected logger: ILogger;
    public loadFile: (NetMessage) => void;
    public handleError: (error: FrontEndError) => void | (() => void);

    public constructor(errorHandler?: (error: FrontEndError) => void) {
        this.handleError =
            errorHandler ||
            (() => {
                /* do nothing */
            });

        this.logger = jsLogger.get("netconnection");
        this.logger.setLevel(jsLogger.DEBUG);

        this.loadFile = () => {
            /* do nothing */
        };
    }

    // Sets callback to notify when file conversion is finished and
    // .simularium file is available
    public setLoadFileHandler(
        handler: (msg: Record<string, unknown>) => void
    ): void {
        this.loadFile = handler;
    }

    public convertTrajectory(
        obj: Record<string, unknown>,
        fileType: string
    ): Promise<void> {
        return this.connectToRemoteServer(this.getIp())
            .then(() => {
                this.sendTrajectory(obj, fileType);
            })
            .catch((e) => {
                throw new FrontEndError(e.message, ErrorLevel.ERROR);
            });
    }

    public sendTrajectory(
        obj: Record<string, unknown>,
        fileType: string
    ): void {
        this.sendWebSocketRequest(
            {
                msgType: NetMessageEnum.ID_CONVERT_TRAJECTORY_FILE,
                trajType: fileType.toLowerCase(),
                data: obj,
            },
            "Convert trajectory output to simularium file format"
        );
    }
}
