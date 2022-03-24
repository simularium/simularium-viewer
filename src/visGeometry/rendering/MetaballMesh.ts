import { Color, Mesh, MeshBasicMaterial } from "three";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes";

import { AgentData } from "../../simularium/VisData";

export default class MetaballMesh {
    static generateMesh(agentData: AgentData): Mesh {
        const subpts = agentData.subpoints;
        // MARCHING CUBES

        const resolution = 28;
        const mat = new MeshBasicMaterial();
        const effect = new MarchingCubes(resolution, mat, true, true, 100000);
        effect.position.set(0, 0, 0);
        effect.scale.set(1, 1, 1);

        effect.enableUvs = false;
        effect.enableColors = false;

        for (let i = 0; i < subpts.length; i += 4) {
            effect.addBall(
                subpts[i + 0],
                subpts[i + 1],
                subpts[i + 2],
                subpts[i + 3] * subpts[i + 3],
                1.0,
                new Color(0xffffff)
            );
        }
        //scene.add( effect );

        return effect;
    }
}
