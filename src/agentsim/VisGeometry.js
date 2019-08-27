/* globals global Request*/
/* eslint no-undef: "error" */


// Three JS is assumed to be in the global scope in extensions
//  such as OrbitControls.js below
import * as THREE from  'three';
global.THREE = THREE;

import './three/OBJLoader.js';
import './three/OrbitControls.js';

import jsLogger from 'js-logger';

class VisGeometry {
    constructor(loggerLevel) {
        this.visGeomMap = new Map();
        this.meshRegistry = new Map();
        this.meshLoadAttempted = new Map();
        this.scaleMapping = new Map();
        this.geomCount = 100;
        this.materials = [];
        this.runTimeMeshes = [];
        this.runTimeFiberMeshes = new Map();
        this.mlastNumberOfAgents = 0;
        this.mcolorVariant = 50;

        this.mlogger = jsLogger.get('visgeometry');
        this.mlogger.setLevel(loggerLevel);
    }

    get logger() { return this.mlogger; }

    get lastNumberOfAgents() { return this.mlastNumberOfAgents; }

    set lastNumberOfAgents(val) { this.mlastNumberOfAgents = val; }

    get colorVariant() { return this.mcolorVariant; }

    set colorVariant(val) { this.mcolorVariant = val; }

    get renderDom() { return this.renderer.domElement; }

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

        this.dl = new THREE.DirectionalLight(0xffffff, 1);
        this.dl.position.set(-1, 2, 1);
        this.scene.add(this.dl);

        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
        this.hemiLight.color.setHSL(0.6, 1, 0.6);
        this.hemiLight.groundColor.setHSL(0.095, 1, 0.75);
        this.hemiLight.position.set(0, 50, 0);
        this.scene.add(this.hemiLight);

        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(initWidth, initHeight); // expected to change when reparented
        this.renderer.setClearColor(new THREE.Color(0xffffff), 1);
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
        }
    }

    createMeshes(geomCount) {
        const { scene } = this;
        this.geomCount = geomCount;
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

    getMaterial(index) {
        return this.materials[
            Number(index)
            % this.materials.length];
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

    mapFromJSON(filePath) {
        this.resetMapping();
        const jsonRequest = new Request(filePath);
        const self = this;
        fetch(jsonRequest).then(
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

        // The agents sent over are mapped by an integer id
        agents.forEach((agentData, i) => {

            const visType = agentData['vis-type'];
            const typeId = agentData.type;
            const scale = this.getScaleForId(typeId);

            if (visType === visTypes.ID_VIS_TYPE_DEFAULT) {
                const materialType = (typeId + 1) * this.colorVariant;
                const runtimeMesh = this.getMesh(i);

                runtimeMesh.position.x = agentData.x;
                runtimeMesh.position.y = agentData.y;
                runtimeMesh.position.z = agentData.z;

                runtimeMesh.rotation.x = agentData.xrot;
                runtimeMesh.rotation.y = agentData.yrot;
                runtimeMesh.rotation.z = agentData.zrot;

                runtimeMesh.visible = true;
                runtimeMesh.material = this.getMaterial(materialType);

                runtimeMesh.scale.x = agentData.cr * scale;
                runtimeMesh.scale.y = agentData.cr * scale;
                runtimeMesh.scale.z = agentData.cr * scale;

                const meshGeom = this.getGeomFromId(typeId);

                if (meshGeom &&  meshGeom.children) {
                    runtimeMesh.geometry = meshGeom.children[0].geometry;
                } else {
                    runtimeMesh.geometry = this.getSphereGeom();
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
        })
    }

    hideUnusedMeshes(numberOfAgents) {
        let nMeshes = this.runTimeMeshes.length;
        for (let i = numberOfAgents; i < 5000 && i < nMeshes; i += 1) {
            const runtimeMesh = this.getMesh(i);
            if (runtimeMesh.visible === false) {
                break;
            }

            runtimeMesh.visible = false;
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
