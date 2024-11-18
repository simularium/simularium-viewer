## Simularium repositories

This repository is part of the Simularium project ([simularium.allencell.org](https://simularium.allencell.org)), which includes repositories:

-   [simulariumIO](https://github.com/allen-cell-animated/simulariumio) - Python package that converts simulation outputs to the format consumed by the Simularium viewer website
-   [simularium-engine](https://github.com/allen-cell-animated/simularium-engine) - C++ backend application that interfaces with biological simulation engines and serves simulation data to the front end website
-   [simularium-viewer](https://github.com/allen-cell-animated/simularium-viewer) - NPM package to view Simularium trajectories in 3D
-   [simularium-website](https://github.com/allen-cell-animated/simularium-website) - Front end website for the Simularium project, includes the Simularium viewer

---

![Node.js CI](https://github.com/allen-cell-animated/simularium-viewer/workflows/Node.js%20CI/badge.svg)
![NPM Package Publish](https://github.com/allen-cell-animated/simularium-viewer/workflows/NPM%20Package/badge.svg)

# Simularium Viewer

simularium-viewer is an NPM package to view simularium trajectories in 3D
https://www.npmjs.com/package/@aics/simularium-viewer

---

## Description

This viewer can visualize trajectories that are in Simularium format (see the file format documentation [here](https://github.com/allen-cell-animated/simulariumio/blob/main/file_format.md)). The viewer can operate in the following modes:

**drag-and-drop**  
Drag a Simularium file into the window (WebGL) area of the viewer.

**remote-streaming**  
Connect to a [simularium-engine](https://github.com/allen-cell-animated/simularium-engine) instance, and stream data through a web-socket connection.

---

## Installation in your project

1. `npm i @aics/simularium-viewer`
2. In Viewer.jsx/tsx

```javascript
import SimulariumViewer, { SimulariumController } from "@aics/simularium-viewer";
import "@aics/simularium-viewer/style/style.css";

const netConnectionSettings = {
    serverIp: "staging-node1-agentviz-backend.cellexplore.net",
    serverPort: 9002,
};

const simulariumController = new SimulariumController({
    trajectoryPlaybackFile: "ATPsynthase_9.h5",
    netConnectionSettings: netConnectionSettings,
});
class Viewer extends React.Component {

    public constructor(props) {
        super(props);
        this.viewerRef = React.createRef();

        this.state = {
                highlightId: -1,
                particleTypeIds: [],
                currentFrame: 0,
                currentTime: 0,
                hideAllAgents: false,
                showPaths: true,
                timeStep: 1,
                totalDuration: 100,
                }
    }

    handleTimeChange = (timeData) => {
        console.log(timeData)
    }

    handleJsonMeshData = (jsonData) => {
        console.log(jsonData)
    }
    onTrajectoryFileInfoChanged = (trajData) => {
        console.log(trajData)
    }

    render () {

        return (<SimulariumViewer
                    ref={this.viewerRef}
                    height={500}
                    width={500}
                    onTimeChange={this.handleTimeChange}
                    simulariumController={simulariumController}
                    onJsonDataArrived={this.handleJsonMeshData}
                    onTrajectoryFileInfoChanged={this.handleTrajectoryInfo}
                    highlightedParticleType={this.state.highlightId}
                    loadInitialData={true}
                    hideAllAgents={this.state.hideAllAgents}
                    showPaths={this.state.showPaths}
                />)
    }
```

## Run an example app locally

1. Run `npm run install-examples` to install the dependencies.
2. Run `npm start`
3. Navigate to `http://localhost:8080/public/` - the `/` at the end is required

This will run the example in `/examples/src/`, demonstrating the viewer's functionality.

---

## Quick Start

| script        | comments                                                                                                                                                                                                              |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| build         | create ES module build                                                                                                                                                                                                |
| clean         | remove generated artifacts                                                                                                                                                                                            |
| generateTypes | generate type declarations                                                                                                                                                                                            |
| lint          | run eslint on `src` directory                                                                                                                                                                                         |
| transpileES   | run babel on `src` directory; _do not_ transpile `import/export` statements for an ES module compatible build (used by bundlers for tree-shaking)                                                                     |
| test          | run `jest`; searches for any files matching the pattern "src/\*_/_.test.js"                                                                                                                                           |
| typeCheck     | run `tsc` in type-check only mode                                                                                                                                                                                     |
| start         | runs an example app from `examples` for testing. Runs at `localhost:8080/public/`. Use `--localserver` to run backend locally. With no flags, this script will default to using the staging octopus server as backend |

---

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for information related to developing the code.
