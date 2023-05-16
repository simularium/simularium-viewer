// TODO these should not be needed anywhere except ClientSimulatorConnection
export var ClientMessageEnum = /*#__PURE__*/function (ClientMessageEnum) {
  ClientMessageEnum[ClientMessageEnum["ID_UNDEFINED_WEB_REQUEST"] = 0] = "ID_UNDEFINED_WEB_REQUEST";
  ClientMessageEnum[ClientMessageEnum["ID_VIS_DATA_ARRIVE"] = 1] = "ID_VIS_DATA_ARRIVE";
  ClientMessageEnum[ClientMessageEnum["ID_VIS_DATA_REQUEST"] = 2] = "ID_VIS_DATA_REQUEST";
  ClientMessageEnum[ClientMessageEnum["ID_VIS_DATA_FINISH"] = 3] = "ID_VIS_DATA_FINISH";
  ClientMessageEnum[ClientMessageEnum["ID_VIS_DATA_PAUSE"] = 4] = "ID_VIS_DATA_PAUSE";
  ClientMessageEnum[ClientMessageEnum["ID_VIS_DATA_RESUME"] = 5] = "ID_VIS_DATA_RESUME";
  ClientMessageEnum[ClientMessageEnum["ID_VIS_DATA_ABORT"] = 6] = "ID_VIS_DATA_ABORT";
  ClientMessageEnum[ClientMessageEnum["ID_UPDATE_TIME_STEP"] = 7] = "ID_UPDATE_TIME_STEP";
  ClientMessageEnum[ClientMessageEnum["ID_UPDATE_RATE_PARAM"] = 8] = "ID_UPDATE_RATE_PARAM";
  ClientMessageEnum[ClientMessageEnum["ID_MODEL_DEFINITION"] = 9] = "ID_MODEL_DEFINITION";
  ClientMessageEnum[ClientMessageEnum["ID_HEARTBEAT_PING"] = 10] = "ID_HEARTBEAT_PING";
  ClientMessageEnum[ClientMessageEnum["ID_HEARTBEAT_PONG"] = 11] = "ID_HEARTBEAT_PONG";
  ClientMessageEnum[ClientMessageEnum["ID_TRAJECTORY_FILE_INFO"] = 12] = "ID_TRAJECTORY_FILE_INFO";
  ClientMessageEnum[ClientMessageEnum["ID_GOTO_SIMULATION_TIME"] = 13] = "ID_GOTO_SIMULATION_TIME";
  ClientMessageEnum[ClientMessageEnum["ID_INIT_TRAJECTORY_FILE"] = 14] = "ID_INIT_TRAJECTORY_FILE";
  ClientMessageEnum[ClientMessageEnum["ID_UPDATE_SIMULATION_STATE"] = 15] = "ID_UPDATE_SIMULATION_STATE";
  ClientMessageEnum[ClientMessageEnum["LENGTH"] = 16] = "LENGTH";
  return ClientMessageEnum;
}({});

// TODO these should not be needed anywhere except ClientSimulatorConnection
export var ClientPlayBackType = /*#__PURE__*/function (ClientPlayBackType) {
  ClientPlayBackType[ClientPlayBackType["ID_LIVE_SIMULATION"] = 0] = "ID_LIVE_SIMULATION";
  ClientPlayBackType[ClientPlayBackType["ID_PRE_RUN_SIMULATION"] = 1] = "ID_PRE_RUN_SIMULATION";
  ClientPlayBackType[ClientPlayBackType["ID_TRAJECTORY_FILE_PLAYBACK"] = 2] = "ID_TRAJECTORY_FILE_PLAYBACK";
  ClientPlayBackType[ClientPlayBackType["LENGTH"] = 3] = "LENGTH";
  return ClientPlayBackType;
}({});