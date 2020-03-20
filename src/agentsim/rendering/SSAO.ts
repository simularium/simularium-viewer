import RenderToBuffer from "./RenderToBuffer";

import {
    Color,
    DataTexture,
    FloatType,
    Matrix4,
    RGBAFormat,
    Vector2,
    Vector3,
} from "three";

class SSAO1Pass {
    public pass: RenderToBuffer;

    public constructor(radius, threshold, falloff) {
        this.pass = new RenderToBuffer({
            uniforms: {
                iResolution: { value: new Vector2(2, 2) },
                iTime: { value: 0.0 },
                normalTex: { value: null },
                viewPosTex: { value: null },
                noiseTex: { value: this.createNoiseTex() },
                iChannelResolution0: { value: new Vector2(2, 2) },
                projectionMatrix: { value: new Matrix4() },
                width: { value: 2 },
                height: { value: 2 },
                radius: { value: radius },
                ssao_threshold: { value: threshold }, // = 0.5;
                ssao_falloff: { value: falloff }, // = 0.1;
                samples: { value: this.createSSAOSamples() },
            },
            fragmentShader: `
            uniform float iTime;
            uniform vec2 iResolution;
            uniform vec2 iChannelResolution0;
            varying vec2 vUv;

            uniform sampler2D normalTex;
            uniform sampler2D viewPosTex;
            uniform sampler2D noiseTex;
            uniform vec3 samples[64];
            uniform mat4 projectionMatrix;
            
            uniform float width;
            uniform float height;
            
            //~ SSAO settings
            uniform float radius;
            uniform float ssao_threshold; // = 0.5;
            uniform float ssao_falloff; // = 0.1;
            
            //layout(location = 0) out vec4 ssao_output;
            
            int kernelSize = 64;
            
            void main(void)
            {
                vec2 texCoords = vUv;
              //debug
              //ssao_output = vec4(1);
              //return;
              vec2 noiseScale = vec2(width / 4.0, height / 4.0);
              vec4 viewPos4 = texture(viewPosTex, texCoords).xyzw;
              if (viewPos4.w < 1.0) discard; // testing if this fragment has protein rendered on it, otherwise it's bg
            
              vec3 viewPos = viewPos4.xyz;
              vec3 normal = texture(normalTex, texCoords).xyz;
              vec3 randomVec = texture(noiseTex, texCoords * noiseScale).xyz;
            
              normal = normalize(normal * 2.0 - 1.0);
              vec3 tangent = normalize(randomVec - normal * dot(randomVec, normal));
              vec3 bitangent = cross(normal, tangent);
              mat3 TBN = mat3(tangent, bitangent, normal);
            
              float occlusion = 0.0;
            
              for(int i = 0; i < kernelSize; i++)
              {
                vec3 posSample = TBN * samples[i];
                posSample = viewPos + posSample * radius;
            
                vec4 offset = vec4(posSample, 1.0);
                offset = projectionMatrix * offset;
                offset.xy /= offset.w;
                offset.xy = offset.xy * 0.5 + 0.5;
            
                vec4 sampleViewPos = texture(viewPosTex, offset.xy);
                float sampleDepth = sampleViewPos.z;
                float rangeCheck = smoothstep(0.0, 1.0, radius / abs(viewPos.z - sampleDepth));
                occlusion += (sampleDepth >= posSample.z ? 1.0 : 0.0) * rangeCheck;
              }
            
              //gl_FragColor = vec4(1.0 - occlusion/ float(kernelSize), 1.0 - occlusion / float(kernelSize), 1.0 - occlusion / float(kernelSize), 1.0);
              //return;

              float occlusion_weight = smoothstep(ssao_threshold - ssao_falloff, ssao_threshold, length(viewPos));
              occlusion_weight = 1.0 - occlusion_weight;
              occlusion_weight *= 0.95;
              occlusion = 1.0 - ((occlusion_weight * occlusion) / float(kernelSize));
              //ssao_output = vec4(occlusion, occlusion, occlusion, 1.0);
              gl_FragColor = vec4(occlusion, occlusion, occlusion, 1.0);
            }
            `,
        });
    }

    public resize(x, y): void {
        this.pass.material.uniforms.iResolution.value = new Vector2(x, y);
        this.pass.material.uniforms.width.value = x;
        this.pass.material.uniforms.height.value = y;
    }

    public render(renderer, camera, target, normals, positions): void {
        this.pass.material.uniforms.projectionMatrix.value =
            camera.projectionMatrix;
        this.pass.material.uniforms.viewPosTex.value = positions.texture;
        this.pass.material.uniforms.normalTex.value = normals.texture;

        const c = renderer.getClearColor().clone();
        const a = renderer.getClearAlpha();
        renderer.setClearColor(new Color(1.0, 0.0, 0.0), 1.0);
        this.pass.render(renderer, target);
        renderer.setClearColor(c, a);
    }

    public createNoiseTex(): DataTexture {
        const noisedata = new Float32Array(16 * 4);
        for (let i = 0; i < 16; i++) {
            noisedata[i * 4 + 0] = Math.random() * 2.0 - 1.0;
            noisedata[i * 4 + 1] = Math.random() * 2.0 - 1.0;
            noisedata[i * 4 + 2] = 0;
            noisedata[i * 4 + 3] = 0;
        }
        // TODO half float type?
        return new DataTexture(noisedata, 4, 4, RGBAFormat, FloatType);
    }

    public createSSAOSamples(): Vector3[] {
        const samples: Vector3[] = [];
        for (let i = 0; i < 64; i++) {
            const sample = new Vector3(
                Math.random() * 2.0 - 1.0,
                Math.random() * 2.0 - 1.0,
                Math.random()
            );
            sample.normalize();
            sample.multiplyScalar(Math.random());
            samples.push(sample);
        }
        return samples;
    }
}

export default SSAO1Pass;
