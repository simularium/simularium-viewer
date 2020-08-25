![Node.js CI](https://github.com/allen-cell-animated/simularium-viewer/workflows/Node.js%20CI/badge.svg)
![NPM Package Publish](https://github.com/allen-cell-animated/simularium-viewer/workflows/NPM%20Package/badge.svg)
# Simularium Viewer

npm package to view simularium trajectories
https://www.npmjs.com/package/@aics/simularium-viewer

---

## Description
This viewer can visualize trajectories that are in the Simularium Visualization-Data-Format. The viewer can operate in the following modes:

**drag-and-drop**  
Drag a Simularium Visualization-Data-Format file into the window (WebGL) area of the viewer.

**remote-streaming**  
Connect to a [simularium-engine](https://github.com/allen-cell-animated/simularium-engine) instance, and stream data through a web-socket connection.

## Installation in your project
1. `npm i @aics/simularium-viewer`
2. In Viewer.jsx/tsx 
```
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
                pauseOn: -1,
                particleTypeIds: [],
                currentFrame: 0,
                currentTime: 0,
                showMeshes: true,
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
                    showMeshes={this.state.showMeshes}
                    showPaths={this.state.showPaths}
                />)
    }
```

## Run an example app locally

1. Run `npm install` to install the dependencies.
2. Run `npm start`
3. Navigate to http://localhost:8080/public/

This will run the example in `/examples/Viewer.tsx`, demonstrating the viewer's functionality.

## Documentation

If you have more extensive technical documentation (whether generated or not), ensure they are published to the following address:
For full package documentation please visit
[organization.github.io/projectname](https://organization.github.io/projectname/index.html).

## Quick Start

| script | comments |
| ------ | -------- |
| build  | create CommonJS, ES module, and UMD builds |
| bundle | run Webpack to create a UMD bundle |
| clean | remove generated artifacts |
| format | run prettier on `src` directory |
| generateTypes | generate type declarations |
| lint | run eslint on `src` directory |
| transpileCommonJs | run babel on `src` directory; transpile `import/export` statements for a CommonJS compatible build |
| transpileES |  run babel on `src` directory; *do not* transpile `import/export` statements for an ES module compatible build (used by bundlers for tree-shaking) |
| test | run `mocha`; searches for any files matching the pattern "src/**/*.test.js" |
| typeCheck | run `tsc` in type-check only mode |
| start  | runs an example app from `examples` for testing. Runs at `localhost:8080/public/`. Run ./gradlew build to see new changes from `src` |

## Development

Before pushing a branch run the following checks locally:
1. `npm run lint`
2. `npm run typeCheck`
3. `npm run test`

See [CONTRIBUTING.md](CONTRIBUTING.md) for information related to developing the code.

## Publishing
1. Make a new version: `npm version [patch/minor/major]`
2. Push the new package.json version: `git push origin master`
3. Push the new tag: `git push origin [NEW_TAG]`
