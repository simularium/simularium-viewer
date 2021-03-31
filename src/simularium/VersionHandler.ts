import { NetMessage } from "./NetConnection";

class VersionHandler {
    msg: NetMessage;

    constructor(msg: NetMessage) {
        this.msg = msg;
    }
}

export default VersionHandler;
