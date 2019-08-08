import dat from "dat.gui";
import { get, OFF } from "js-logger";
import "../dat/RemoveFolder.js";
class DevGUI {
    constructor(simParameters) {
        this.DAT_GUI_LIB = dat;
        this.gui = null;
        this.msimParameters = simParameters;
        this.logger = get('devgui');
        this.logger.setLevel(OFF);
    }

    get simParameters() { return this.msimParameters; }

    /**
    *   GUI Creation: currently Dat.GUI
    * */
    setupGUI(visData, netConnection, simParameters) {
        this.gui = new this.DAT_GUI_LIB.GUI({ autoPlace: false });
        const { gui } = this;

        const cnnfldr = gui.addFolder('Server');
        cnnfldr.add(netConnection, 'serverIp').name('IP');
        cnnfldr.add(netConnection, 'serverPort').name('Port');
        cnnfldr.add(netConnection, 'connect').name('Connect');
        cnnfldr.add(netConnection, 'disconnect').name('Disconnect');

        const dbgfldr = gui.addFolder('Debug');
        dbgfldr.add(visData, 'colorVariant', 1, 100, 1).name('Color Variant');

        const trajplayfldr = gui.addFolder('Trajectory Playback');
        trajplayfldr.add(netConnection, 'guiStartRemoteTrajectoryPlayback').name('Start');
        trajplayfldr.add(simParameters, 'trajectoryPlaybackFile', ['microtubules15.h5', 'actin5-1.h5']).name('File Name');
        trajplayfldr.open();

        const livesimfldr = gui.addFolder('Simulation');
        livesimfldr.add(netConnection, 'guiStartRemoteSimPreRun').name('Start');
        livesimfldr.add(simParameters, 'preRunTimeStep').name('Time Step');
        livesimfldr.add(simParameters, 'preRunNumTimeSteps').name('Num Time Steps');
        livesimfldr.open();

        const simfldr = gui.addFolder('Live Simulation');
        simfldr.add(netConnection, 'guiStartRemoteSimLive').name('Start Live');
        const timegui = simfldr.add(simParameters, 'timeStepSliderVal', 0, 100, 1);
        timegui.name('Time Step');
        timegui.listen();
        simfldr.open();

        const playbackfldr = gui.addFolder('Playback');
        const fctp = playbackfldr.add(simParameters, 'cachePlaybackFrame');
        fctp.name('Cache Frame');
        fctp.min(0).step(1);
        playbackfldr.add(netConnection, 'guiPlayRemoteSimCache').name('Play from Cache');
        playbackfldr.add(netConnection, 'pauseRemoteSim').name('Pause');
        playbackfldr.add(netConnection, 'resumeRemoteSim').name('Resume');
        playbackfldr.add(netConnection, 'abortRemoteSim').name('Stop');
        playbackfldr.open();

        const prmfldr = gui.addFolder('Parameters');
        Object.keys(simParameters.paramList).forEach((parameterName) => {
            const { paramList } = simParameters;
            prmfldr.add(paramList[parameterName], 'val', 0, 100, 1).name(parameterName);
        });
    }

    reparent(parent)
    {
        if(parent === null || parent === 'undefined')
        {
            return;
        }

        parent.append(this.gui.domElement);
    }

    updateParameters() {
        if (this.simParameters.guiNeedsUpdate) {
            this.gui.removeFolder('Parameters');
            const parameterFolder = this.gui.addFolder('Parameters');

            this.logger.debug('Reconstructing GUI from parameter list: ', this.simParameters.paramList);
            Object.keys(this.simParameters.paramList).forEach((parameterName) => {
                const parameterGUIElement = parameterFolder.add(
                    this.simParameters.paramList[parameterName],
                    'val', 0, 100, 1,
                );

                parameterGUIElement.name(parameterName);
                parameterGUIElement.listen();
            });

            parameterFolder.open();
            this.logger.debug('Parameter GUI Succesfully Updated');
            this.simParameters.guiNeedsUpdate = false;
        }
    }
}

export { DevGUI };
export default DevGUI;
