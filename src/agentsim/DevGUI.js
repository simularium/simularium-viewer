import dat from "dat.gui";
import * as React from 'react';
import { get } from "js-logger";

import "./dat/RemoveFolder.js";

class DevGUI extends React.Component {
    constructor(props) {
        super(props);
        this.gui = new dat.GUI({ autoPlace: false });
        this.msimParameters = props.simParams;
        this.logger = get('devgui');
        this.logger.setLevel(props.loggerLevel);
        this.devGuiRef = React.createRef();
        this.setupGUI = this.setupGUI.bind(this);
        this.updateParameters = this.updateParameters.bind(this);
    }

    componentDidMount() {
        this.reparent(this.devGuiRef.current);
        this.setupGUI();
    }

    get simParameters() { return this.msimParameters; }

    /**
    *   GUI Creation: currently Dat.GUI
    * */
    setupGUI() {
        const { gui } = this;
        const {
            simParams,
            netConnection,
            visData,
        } = this.props

        const cnnfldr = gui.addFolder('Server');
        cnnfldr.add(netConnection, 'serverIp').name('IP');
        cnnfldr.add(netConnection, 'serverPort').name('Port');
        cnnfldr.add(netConnection, 'connect').name('Connect');
        cnnfldr.add(netConnection, 'disconnect').name('Disconnect');

        const dbgfldr = gui.addFolder('Debug');
        dbgfldr.add(visData, 'colorVariant', 1, 100, 1).name('Color Variant');

        const trajplayfldr = gui.addFolder('Trajectory Playback');
        trajplayfldr.add(netConnection, 'guiStartRemoteTrajectoryPlayback').name('Start');
        trajplayfldr.add(simParams, 'trajectoryPlaybackFile', ['microtubules15.h5', 'actin5-1.h5']).name('File Name');
        trajplayfldr.open();

        const livesimfldr = gui.addFolder('Simulation');
        livesimfldr.add(netConnection, 'guiStartRemoteSimPreRun').name('Start');
        livesimfldr.add(simParams, 'preRunTimeStep').name('Time Step');
        livesimfldr.add(simParams, 'preRunNumTimeSteps').name('Num Time Steps');
        livesimfldr.open();

        const simfldr = gui.addFolder('Live Simulation');
        simfldr.add(netConnection, 'guiStartRemoteSimLive').name('Start Live');
        const timegui = simfldr.add(simParams, 'timeStepSliderVal', 0, 100, 1);
        timegui.name('Time Step');
        timegui.listen();
        simfldr.open();

        const playbackfldr = gui.addFolder('Playback');
        const fctp = playbackfldr.add(simParams, 'cachePlaybackFrame');
        fctp.name('Cache Frame');
        fctp.min(0).step(1);
        playbackfldr.add(netConnection, 'guiPlayRemoteSimCache').name('Play from Cache');
        playbackfldr.add(netConnection, 'pauseRemoteSim').name('Pause');
        playbackfldr.add(netConnection, 'resumeRemoteSim').name('Resume');
        playbackfldr.add(netConnection, 'abortRemoteSim').name('Stop');
        playbackfldr.open();

        const prmfldr = gui.addFolder('Parameters');
        Object.keys(simParams.paramList).forEach((parameterName) => {
            const { paramList } = simParams;
            prmfldr.add(paramList[parameterName], 'val', 0, 100, 1).name(parameterName);
        });
    }

    reparent(parent) {
        if(parent === null || parent === 'undefined') {
            return;
        }

        parent.append(this.gui.domElement);
    }

    updateParameters() {
        const {
            simParams,

        } = this.props
        if (simParams.guiNeedsUpdate) {
            this.gui.removeFolder('Parameters');
            const parameterFolder = this.gui.addFolder('Parameters');

            this.logger.debug('Reconstructing GUI from parameter list: ', simParams.paramList);
            Object.keys(simParams.paramList).forEach((parameterName) => {
                const parameterGUIElement = parameterFolder.add(
                    this.simParameters.paramList[parameterName],
                    'val', 0, 100, 1,
                );

                parameterGUIElement.name(parameterName);
                parameterGUIElement.listen();
            });

            parameterFolder.open();
            this.logger.debug('Parameter GUI Succesfully Updated');
            simParams.guiNeedsUpdate = false;
        }
    }
    
    render () {

        let style = {
            position: "relative",
            height: 0,
            overflow: "visible",
        };

        this.updateParameters();
        return (<div style={style} ref={this.devGuiRef} />);
    }
}

export { DevGUI };
export default DevGUI;
