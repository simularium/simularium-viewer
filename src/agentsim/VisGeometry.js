/* globals global Request*/
/* eslint no-undef: "error" */


// Three JS is assumed to be in the global scope in extensions
//  such as OrbitControls.js below
import * as THREE from  'three';
global.THREE = THREE;

import './three/OBJLoader.js';
import './three/OrbitControls.js';

import jsLogger from 'js-logger';

const MAX_PATH_LEN = 32;
const SKIP_PATH = 100;
const MAX_MESHES = 5000;
const BACKGROUND_COLOR = new THREE.Color(0xcccccc);
const PATH_END_COLOR = BACKGROUND_COLOR;
// FIXME Hard-coded for actin simulation.  needs to be data coming from backend.
const VOLUME_DIMS = new THREE.Vector3(300, 300, 300);

function lerp(x0, x1, alpha) {
    return x0 + (x1 - x0) * alpha;
}

class VisGeometry {
    constructor(loggerLevel) {
        this.visGeomMap = new Map();
        this.meshRegistry = new Map();
        this.meshLoadAttempted = new Map();
        this.scaleMapping = new Map();
        this.geomCount = MAX_MESHES;
        this.materials = [];
        this.desatMaterials = [];
        this.highlightMaterial = new THREE.MeshBasicMaterial({color: new THREE.Color(1,0,0)});
        this.followObject = null;
        this.runTimeMeshes = [];
        this.runTimeFiberMeshes = new Map();
        this.mlastNumberOfAgents = 0;
        this.mcolorVariant = 50;
        this.fixLightsToCamera = true;
        this.highlightedId = -1;

        // will store data for all agents that are drawing paths
        this.paths = [];

        this.mlogger = jsLogger.get('visgeometry');
        this.mlogger.setLevel(loggerLevel);
    }

    get logger() { return this.mlogger; }

    get lastNumberOfAgents() { return this.mlastNumberOfAgents; }

    set lastNumberOfAgents(val) { this.mlastNumberOfAgents = val; }

    get colorVariant() { return this.mcolorVariant; }

    set colorVariant(val) { this.mcolorVariant = val; }

    get renderDom() { return this.renderer.domElement; }

    setFollowObject(obj) {
        this.followObject = obj;
        // put the camera on it
        if (obj) {
            this.controls.target.copy(obj.position);
            obj.material = this.highlightMaterial;
        }
    }

    // equivalent to setFollowObject(null)
    unfollow() {
        this.followObject = null;
    }

    setHighlightById(id) {
        this.highlightedId = id;
    }

    // equivalent to setHighlightById(-1)
    dehighlight() {
        this.highlightedId = -1;
    }

    /**
    *   Setup ThreeJS Scene
    * */
    setupScene() {
        let initWidth = 100;
        let initHeight = 100;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            75, initWidth / initHeight, 0.1, 10000,
        );
        this.controls = new THREE.OrbitControls(this.camera);
        this.controls.maxDistance = 750;
        this.controls.minDistance = 5;
        this.controls.zoomSpeed = 5;
        this.controls.enablePan = false;

        this.dl = null;
        this.dl = new THREE.DirectionalLight(0xffffff, 0.6);
        this.dl.position.set(0, 0, 1);
        this.scene.add(this.dl);

        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x000000, 0.6);
        this.hemiLight.color.setHSL(0.095, 1, 0.75);
        this.hemiLight.groundColor.setHSL(0.6, 1, 0.6);
        this.hemiLight.position.set(0, 1, 0);
        this.scene.add(this.hemiLight);

        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(initWidth, initHeight); // expected to change when reparented
        this.renderer.setClearColor(BACKGROUND_COLOR, 1);
        this.renderer.clear();

        this.camera.position.z = 5;

        this.loadObj = (meshName) => {
            const objLoader = new THREE.OBJLoader();
            objLoader.load(
                `https://aics-agentviz-data.s3.us-east-2.amazonaws.com/meshes/obj/${meshName}`,
                (object) => {
                    this.logger.debug('Finished loading mesh: ', meshName);
                    this.addMesh(meshName, object);
                },
                (xhr) => {
                    this.logger.debug(meshName, ' ', `${xhr.loaded / xhr.total * 100}% loaded`);
                },
                (error) => {
                    this.logger.debug('Failed to load mesh: ', error, meshName);
                },
            );
        };
    }

    resize(width, height) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    reparent(parent) {
        if(parent === 'undefined' || parent == null) {
            return;
        }

        let height = parent.scrollHeight;
        let width = parent.scrollWidth;
        parent.appendChild(this.renderer.domElement);

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.renderer.clear();

        this.renderer.domElement.position = "absolute";
        this.renderer.domElement.top = "0px";
        this.renderer.domElement.left = "0px";

        this.renderer.domElement.onmouseenter = () => this.enableControls();
        this.renderer.domElement.onmouseleave = () => this.disableControls();
    }

    disableControls() {
        this.controls.enabled = false;
    }

    enableControls() {
        this.controls.enabled = true;
    }

    render() {
        if(this.runTimeMeshes.length == 0) { return; }

        this.controls.update();

        if (this.dl && this.fixLightsToCamera) {
            // position directional light at camera (facing scene, as headlight!)
            this.dl.position.copy(this.camera.position);
        }
        if (this.hemiLight && this.fixLightsToCamera) {
            // make hemi light come down from vertical of screen (camera up)
            this.hemiLight.position.setFromMatrixColumn(this.camera.matrixWorld, 1);
        }

        this.renderer.render(this.scene, this.camera);
    }

    /**
    *   Run Time Mesh functions
    */
    createMaterials(colors) {
        const numColors = colors.length;
        for (let i = 0; i < numColors; i += 1) {
            this.materials.push(
                new THREE.MeshLambertMaterial({ color: colors[i] }),
            );
            const hsl = {};
            const desatColor = new THREE.Color(colors[i]);
            hsl = desatColor.getHSL(hsl);
            desatColor.setHSL(hsl.h, 0.5*hsl.s, hsl.l);
            this.desatMaterials.push(
                new THREE.MeshLambertMaterial({ color: desatColor, opacity: 0.25, transparent: true }),
            );
        }
    }

    createMeshes() {
        const { scene } = this;
        this.geomCount = MAX_MESHES;
        const sphereGeom = this.getSphereGeom();
        const { materials } = this;

        for (let i = 0; i < this.geomCount; i += 1) {
            const runtimeMesh = new THREE.Mesh(sphereGeom, materials[0]);

            runtimeMesh.name = `Mesh_${i.toString()}`;
            runtimeMesh.visible = false;
            this.runTimeMeshes[i] = runtimeMesh;
            scene.add(runtimeMesh);

            const fibercurve = new THREE.LineCurve3(
                new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 1),
            );
            const geometry = new THREE.TubeBufferGeometry(fibercurve, 1, 1, 1, false);
            const runtimeFiberMesh = new THREE.Mesh(geometry, materials[0]);
            runtimeFiberMesh.name = `Fiber_${i.toString()}`;
            runtimeFiberMesh.visible = false;
            this.runTimeFiberMeshes.set(runtimeFiberMesh.name, runtimeFiberMesh);
            scene.add(runtimeFiberMesh);

            const runtimeFiberEndcapMesh0 = new THREE.Mesh(sphereGeom, materials[0]);
            runtimeFiberEndcapMesh0.name = `FiberEnd0_${i.toString()}`;
            runtimeFiberEndcapMesh0.visible = false;
            this.runTimeFiberMeshes.set(runtimeFiberEndcapMesh0.name, runtimeFiberEndcapMesh0);
            scene.add(runtimeFiberEndcapMesh0);

            const runtimeFiberEndcapMesh1 = new THREE.Mesh(sphereGeom, materials[0]);
            runtimeFiberEndcapMesh1.name = `FiberEnd1_${i.toString()}`;
            runtimeFiberEndcapMesh1.visible = false;
            this.runTimeFiberMeshes.set(runtimeFiberEndcapMesh1.name, runtimeFiberEndcapMesh1);
            scene.add(runtimeFiberEndcapMesh1);
        }
    }

    addMesh(meshName, mesh) {
        this.meshRegistry.set(meshName, mesh);
    }

    getMesh(index) {
        return this.runTimeMeshes[index];
    }

    getFiberMesh(name) {
        return this.runTimeFiberMeshes.get(name);
    }

    getMaterial(index, typeId) {
        // if no highlight, or if this is the highlighed type, then use regular material, otherwise use desaturated.
        // todo strings or numbers for these ids?????
        let matArray = (this.highlightedId == -1 || this.highlightedId == typeId) ? this.materials : this.desatMaterials;
        return matArray[Number(index) % matArray.length];
    }

    /**
    *   Data Management
    */
    resetMapping() {
        this.visGeomMap.clear();
        this.meshRegistry.clear();
        this.meshLoadAttempted.clear();
        this.scaleMapping.clear();
    }

    /**
    *   Map Type ID -> Geometry
    */
    mapIdToGeom(id, meshName) {
        this.logger.debug('Mesh for id ', id, ' set to ', meshName);
        this.visGeomMap.set(id, meshName);

        if (!this.meshRegistry.has(meshName) && !this.meshLoadAttempted.get(meshName)) {
            this.loadObj(meshName);
            this.meshLoadAttempted.set(meshName, true);
        }
    }

    getGeomFromId(id) {
        if (this.visGeomMap.has(id)) {
            const meshName = this.visGeomMap.get(id);
            return this.meshRegistry.get(meshName);
        }

        return null;
    }

    mapFromJSON(filePath, callback) {
        this.resetMapping();
        const jsonRequest = new Request(filePath);
        const self = this;
        return fetch(jsonRequest).then(
            response => response.json(),
        ).then(
            (data) => {
                const jsonData = data;
                self.logger.debug('JSON Mesh mapping loaded: ', jsonData);
                Object.keys(jsonData).forEach((id) => {
                    const entry = jsonData[id];
                    self.mapIdToGeom(Number(id), entry.mesh);
                    self.setScaleForId(Number(id), entry.scale);
                });
                if (callback) {
                    callback(jsonData);
                }
            },
        );
    }

    setScaleForId(id, scale) {
        this.logger.debug('Scale for id ', id, ' set to ', scale);
        this.scaleMapping.set(id, scale);
    }

    getScaleForId(id) {
        if (this.scaleMapping.has(id)) {
            return this.scaleMapping.get(id);
        }

        return 1;
    }

    /**
    *   Default Geometry
    */
    getSphereGeom() {
        const sphereId = -1;
        if (!this.meshRegistry.has(sphereId)) {
            this.meshRegistry.set(sphereId, new THREE.SphereBufferGeometry(1, 32, 32));
        }

        return this.meshRegistry.get(sphereId);
    }

    /**
    *   Update Scene
    * */
    updateScene(agents) {
        let fiberIndex = 0;

        // these have been set to correspond to backend values
        const visTypes = Object.freeze({
            ID_VIS_TYPE_DEFAULT: 1000,
            ID_VIS_TYPE_FIBER: 1001,
        });

        let dx, dy, dz;
        // The agents sent over are mapped by an integer id
        agents.forEach((agentData, i) => {

            const visType = agentData['vis-type'];
            const typeId = agentData.type;
            const scale = this.getScaleForId(typeId);

            if (visType === visTypes.ID_VIS_TYPE_DEFAULT) {
                const materialType = (typeId + 1) * this.colorVariant;
                const runtimeMesh = this.getMesh(i);
                if (!runtimeMesh.userData) {
                    // assumes this will not change with later updates.
                    runtimeMesh.userData = { 
                        baseMaterial: this.getMaterial(materialType, typeId),
                    }
                }

                dx = agentData.x - runtimeMesh.position.x; 
                dy = agentData.y - runtimeMesh.position.y; 
                dz = agentData.z - runtimeMesh.position.z; 
                runtimeMesh.position.x = agentData.x;
                runtimeMesh.position.y = agentData.y;
                runtimeMesh.position.z = agentData.z;

                runtimeMesh.rotation.x = agentData.xrot;
                runtimeMesh.rotation.y = agentData.yrot;
                runtimeMesh.rotation.z = agentData.zrot;

                runtimeMesh.visible = true;
                if (runtimeMesh === this.followObject) {
                    runtimeMesh.material = this.highlightMaterial;
                }
                else {
                    runtimeMesh.material = this.getMaterial(materialType, typeId);
                }

                runtimeMesh.scale.x = agentData.cr * scale;
                runtimeMesh.scale.y = agentData.cr * scale;
                runtimeMesh.scale.z = agentData.cr * scale;

                const meshGeom = this.getGeomFromId(typeId);

                if (meshGeom && meshGeom.children) {
                    runtimeMesh.geometry = meshGeom.children[0].geometry;
                } else {
                    runtimeMesh.geometry = this.getSphereGeom();
                }

                if (i % SKIP_PATH === 0) {
                    const path = this.addPathForAgentIndex(i);
                    this.addPointToPath(path, agentData.x, agentData.y, agentData.z, dx, dy, dz);
                }
            } else if (visType === visTypes.ID_VIS_TYPE_FIBER) {
                const name = `Fiber_${fiberIndex.toString()}`;

                const runtimeFiberMesh = this.getFiberMesh(name);

                const curvePoints = [];
                const { subpoints } = agentData;
                const numSubPoints = subpoints.length;
                const collisionRadius = agentData.cr;
                for (let j = 0; j < numSubPoints; j += 3) {
                    const x = subpoints[j];
                    const y = subpoints[j + 1];
                    const z = subpoints[j + 2];
                    curvePoints.push(new THREE.Vector3(x, y, z));
                }
                const fibercurve = new THREE.CatmullRomCurve3(curvePoints);
                const fibergeometry = new THREE.TubeBufferGeometry(
                    fibercurve, 4 * numSubPoints / 3, collisionRadius * scale * 0.5, 8, false,
                );
                runtimeFiberMesh.geometry.copy(fibergeometry);
                runtimeFiberMesh.geometry.needsUpdate = true;
                runtimeFiberMesh.visible = true;

                const nameEnd0 = `FiberEnd0_${fiberIndex.toString()}`;
                const runtimeFiberEncapMesh0 = this.getFiberMesh(nameEnd0);
                runtimeFiberEncapMesh0.position.x = curvePoints[0].x;
                runtimeFiberEncapMesh0.position.y = curvePoints[0].y;
                runtimeFiberEncapMesh0.position.z = curvePoints[0].z;
                runtimeFiberEncapMesh0.scale.x = collisionRadius * scale * 0.5;
                runtimeFiberEncapMesh0.scale.y = collisionRadius * scale * 0.5;
                runtimeFiberEncapMesh0.scale.z = collisionRadius * scale * 0.5;
                runtimeFiberEncapMesh0.visible = true;
                const nameEnd1 = `FiberEnd1_${fiberIndex.toString()}`;
                const runtimeFiberEncapMesh1 = this.getFiberMesh(nameEnd1);
                runtimeFiberEncapMesh1.position.x = curvePoints[curvePoints.length - 1].x;
                runtimeFiberEncapMesh1.position.y = curvePoints[curvePoints.length - 1].y;
                runtimeFiberEncapMesh1.position.z = curvePoints[curvePoints.length - 1].z;
                runtimeFiberEncapMesh1.scale.x = collisionRadius * scale * 0.5;
                runtimeFiberEncapMesh1.scale.y = collisionRadius * scale * 0.5;
                runtimeFiberEncapMesh1.scale.z = collisionRadius * scale * 0.5;
                runtimeFiberEncapMesh1.visible = true;

                fiberIndex += 1;
            }
        });
        if (this.followObject) {
            // keep camera at same distance from target.
            const direction = new THREE.Vector3().subVectors( this.camera.position, this.controls.target );
            const distance = direction.length();

            // update controls target for orbiting
            this.controls.target.copy(this.followObject.position);

            direction.normalize();
            this.camera.position.subVectors(this.controls.target, direction.multiplyScalar(-distance));
        }
    }

    getMaterialOfAgentIndex(idx) {
        const runtimeMesh = this.getMesh(idx);
        if (runtimeMesh.userData) {
            return runtimeMesh.userData.baseMaterial;
        }
        return undefined;
    }

    findPathForAgentIndex(idx) {
        return this.paths.find((path)=>{return path.agent===idx;});
    }

    // assumes color is a threejs color, or null/undefined
    addPathForAgentIndex(idx, color) {
        // make sure the idx is not already in our list.
        // could be optimized...
        const foundpath = this.findPathForAgentIndex(idx);
        if (foundpath) {
            foundpath.line.visible = true;
            return foundpath;
        }

        if (!color) {
            // get the agent's color. is there a simpler way?
            const mat = this.getMaterialOfAgentIndex(idx);
            color = mat ? mat.color.clone() : new THREE.Color(0xffffff);
        }

        const pathdata = {
            agent: idx,
            numSegments: 0,
            color: color,
            points: new Float32Array(MAX_PATH_LEN * 3 * 2),
            colors: new Float32Array(MAX_PATH_LEN * 3 * 2),
            geometry: new THREE.BufferGeometry(),
            material: new THREE.LineBasicMaterial({
                // the line will be colored per-vertex
                vertexColors: THREE.VertexColors,
            }),
            // will create line "lazily" when the line has more than 1 point(?)
            line: null,
        };
        
        pathdata.geometry.addAttribute( 'position', new THREE.BufferAttribute( pathdata.points, 3 ) );
        pathdata.geometry.addAttribute( 'color', new THREE.BufferAttribute( pathdata.colors, 3 ) );
        // path starts empty: draw range spans nothing
        pathdata.geometry.setDrawRange( 0, 0 );
        pathdata.line = new THREE.LineSegments(pathdata.geometry, pathdata.material);
        this.scene.add(pathdata.line);


        this.paths.push(pathdata);
        return pathdata;
    }

    removePathForAgentIndex(idx) {
        const pathindex = this.paths.findIndex((path)=>{return path.agent===idx;});
        if (pathindex === -1) {
            console.log("attempted to remove path for agent " + idx + " that doesn't exist.");
            return;
        }
        const path = this.paths[pathindex];
        this.scene.remove(path.line);

        this.paths.splice(pathindex, 1);
    }

    addPointToPath(path, x, y, z, dx, dy, dz) {
        if ((x === dx) && (y === dy) && (z === dz)) {
            return;
        }
        // Check for periodic boundary condition:
        // if any agent moved more than half the volume size in one step, 
        // assume it jumped the boundary going the other way.
        if (Math.abs(dx) > VOLUME_DIMS.x/2 || Math.abs(dy) > VOLUME_DIMS.y/2 || Math.abs(dz) > VOLUME_DIMS.z/2) {
            // now what?
            // TODO: clip line segment from x-dx to x against the bounds,
            // compute new line segments from x-dx to bound, and from x to opposite bound
            // For now, add a degenerate line segment 
            dx = 0;
            dy = 0;
            dz = 0;
        }

        // check for paths at max length
        if (path.numSegments === MAX_PATH_LEN) {
            // because we append to the end, we can copyWithin to move points up to the beginning
            // as a means of removing the first point in the path.
            // shift the points:
            path.points.copyWithin(0, 3*2, MAX_PATH_LEN*3*2);
            path.numSegments = MAX_PATH_LEN-1;
        }
        else {
            // rewrite all the colors. this might be prohibitive for lots of long paths.
            for (let ic = 0; ic < path.numSegments+1; ++ic) {
                // the very first point should be a=1
                const a = 1.0 - (ic)/(path.numSegments+1);
                path.colors[ic*6+0] = lerp(path.color.r, PATH_END_COLOR.r, a);
                path.colors[ic*6+1] = lerp(path.color.g, PATH_END_COLOR.g, a);
                path.colors[ic*6+2] = lerp(path.color.b, PATH_END_COLOR.b, a);

                // the very last point should be b=0
                const b = 1.0 - (ic+1)/(path.numSegments+1); 
                path.colors[ic*6+3] = lerp(path.color.r, PATH_END_COLOR.r, b);
                path.colors[ic*6+4] = lerp(path.color.g, PATH_END_COLOR.g, b);
                path.colors[ic*6+5] = lerp(path.color.b, PATH_END_COLOR.b, b);
            }
            path.line.geometry.attributes.color.needsUpdate = true;
        }
        // add a segment to this line
        path.points[path.numSegments*2*3+0] = x-dx;
        path.points[path.numSegments*2*3+1] = y-dy;
        path.points[path.numSegments*2*3+2] = z-dz;
        path.points[path.numSegments*2*3+3] = x;
        path.points[path.numSegments*2*3+4] = y;
        path.points[path.numSegments*2*3+5] = z;

        path.numSegments++;

        path.line.geometry.setDrawRange( 0, path.numSegments*2 );
        path.line.geometry.attributes.position.needsUpdate = true; // required after the first render
    }

    setShowPaths(showPaths) {
        for (let i = 0; i < this.paths.length; ++i) {
            this.paths[i].line.visible = showPaths;
        }
    }

    setShowMeshes(showMeshes) {
        let nMeshes = this.runTimeMeshes.length;
        for (let i = 0; i < MAX_MESHES && i < nMeshes; i += 1) {
            const runtimeMesh = this.getMesh(i);
            runtimeMesh.visible = showMeshes;
        }
    }

    showPathForAgentIndex(idx, visible) {
        const path = this.findPathForAgentIndex(idx);
        if (path) {
            path.line.visible = visible;
        }
    }

    hideUnusedMeshes(numberOfAgents) {
        let nMeshes = this.runTimeMeshes.length;
        for (let i = numberOfAgents; i < MAX_MESHES && i < nMeshes; i += 1) {
            const runtimeMesh = this.getMesh(i);
            if (runtimeMesh.visible === false) {
                break;
            }

            runtimeMesh.visible = false;
            this.showPathForAgentIndex(i, false);
        }
    }

    clear() {
        this.hideUnusedMeshes(0);
    }

    update(agents) {
        const numberOfAgents = agents.length;
        this.updateScene(agents, numberOfAgents);

        if (this.lastNumberOfAgents > numberOfAgents) {
            this.hideUnusedMeshes(numberOfAgents);

        }

        this.lastNumberOfAgents = numberOfAgents;
    }
}

export { VisGeometry };
export default VisGeometry;
