import { Color, WebGLRenderer, WebGLRenderTarget } from "three";

import RenderToBuffer from "./RenderToBuffer";

class ContourPass {
    public pass: RenderToBuffer;

    public constructor() {
        this.pass = new RenderToBuffer({
            uniforms: {
                colorTex: { value: null },
                instanceIdTex: { value: null },
                normalsTex: { value: null },
                followedInstance: { value: -1 },
                outlineThickness: { value: 2.0 },
                outlineAlpha: { value: 0.8 },
                outlineColor: { value: new Color(1, 1, 1) },
                followThickness: { value: 3.0 },
                followAlpha: { value: 0.8 },
                followColor: { value: new Color(0.14, 1, 0) },
            },
            fragmentShader: `
            in vec2 vUv;
            
            uniform sampler2D colorTex;
            uniform sampler2D instanceIdTex;
            uniform sampler2D normalsTex;
            uniform float followedInstance;
            uniform float outlineThickness;
            uniform float followThickness;
            uniform float followAlpha;
            uniform float outlineAlpha;
            uniform vec3 followColor;
            uniform vec3 outlineColor;

            bool isHighlighted(float typevalue) {
              return (sign(typevalue) > 0.0);
            }

            bool isSameInstance(float x, float y) {
              // typeIds and instanceIds are integers written to float gpu buffers.
              // This fudge factor is working around a strange float bug on nvidia/Windows hardware.
              // The numbers read are noisy and not uniform across faces.
              // I can't tell if the bug occurs on read or on write, but the workaround is
              // needed here at read time when we need to do comparisons.
              // (TODO: dump buffer after read to inspec?)
              // Straight equality works on MacOS and Intel/Windows gpu 
              // This should be tested periodically with new nvidia drivers on windows
              // TODO: try "round(abs(x-y)) == 0" here
              return abs(x-y) < 0.1;
            }
            bool isAdjacentToSame(float x, float l, float r, float b, float t) {
              return isSameInstance(x, l) && isSameInstance(x, r) && isSameInstance(x, b) && isSameInstance(x, t);
            }

            void main(void)
            {
              vec4 col = texture(colorTex, vUv);
           
              ivec2 resolution = textureSize(colorTex, 0);
            
              vec2 pixelPos = vUv * vec2(float(resolution.x), float(resolution.y));
              float wStep = 1.0 / float(resolution.x);
              float hStep = 1.0 / float(resolution.y);
            
              vec4 instance = texture(instanceIdTex, vUv);
              // instance.g is the agent id
              float X = instance.g;
              float R = texture(instanceIdTex, vUv + vec2(wStep, 0)).g;
              float L = texture(instanceIdTex, vUv + vec2(-wStep, 0)).g;
              float T = texture(instanceIdTex, vUv + vec2(0, hStep)).g;
              float B = texture(instanceIdTex, vUv + vec2(0, -hStep)).g;
            
              vec4 finalColor = col;
              if (isAdjacentToSame(X, R, L, T, B) )
              {
                // current pixel is NOT on the edge
                finalColor = col;
              }
              else
              {
                // current pixel lies on the edge of an agent
                // outline pixel color is a darkened version of the color
                finalColor = mix(vec4(0.0,0.0,0.0,1.0), col, 0.8);

              }

              // instance.r is the type id
              bool highlighted = isHighlighted(instance.r);
              if (highlighted) {
                float thickness = outlineThickness;
                mat3 sx = mat3( 
                    1.0, 2.0, 1.0, 
                    0.0, 0.0, 0.0, 
                   -1.0, -2.0, -1.0 
                );
                mat3 sy = mat3( 
                    1.0, 0.0, -1.0, 
                    2.0, 0.0, -2.0, 
                    1.0, 0.0, -1.0 
                );
                mat3 I;
                for (int i=0; i<3; i++) {
                  for (int j=0; j<3; j++) {
                    bool v = isHighlighted(
                      texelFetch(instanceIdTex, 
                        ivec2(gl_FragCoord) + 
                        ivec2(
                          (i-1)*int(thickness),
                          (j-1)*int(thickness)
                        ), 
                        0 ).r
                    );
                    I[i][j] = v ? 1.0 : 0.0; 
                  }
                }
                float gx = dot(sx[0], I[0]) + dot(sx[1], I[1]) + dot(sx[2], I[2]); 
                float gy = dot(sy[0], I[0]) + dot(sy[1], I[1]) + dot(sy[2], I[2]);

                float g = sqrt(pow(gx, 2.0)+pow(gy, 2.0));
                finalColor = mix(finalColor, vec4(outlineColor.rgb,1), g*outlineAlpha);

              }

              if (X >= 0.0 && isSameInstance(X, followedInstance)) {
                float thickness = followThickness;
                R = (texture(instanceIdTex, vUv + vec2(wStep*thickness, 0)).g);
                L = (texture(instanceIdTex, vUv + vec2(-wStep*thickness, 0)).g);
                T = (texture(instanceIdTex, vUv + vec2(0, hStep*thickness)).g);
                B = (texture(instanceIdTex, vUv + vec2(0, -hStep*thickness)).g);
                if ( !isAdjacentToSame(X, R, L, T, B) )
                {
                  // current pixel lies on the edge of the followed agent
                  // outline pixel color is blended toward the followColor
                  finalColor = mix(vec4(followColor.rgb,1), col, 1.0-followAlpha);
                }
              }
        
              gl_FragDepth = instance.w >= 0.0 ? instance.w : 1.0;
              gl_FragColor = finalColor;
            }
            `,
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public resize(x: number, y: number): void {
        /* do nothing */
    }

    public setOutlineColor(value: number[]): void {
        this.pass.material.uniforms.outlineColor.value = new Color(
            value[0] / 255.0,
            value[1] / 255.0,
            value[2] / 255.0
        );
    }

    public setOutlineAlpha(value: number): void {
        this.pass.material.uniforms.outlineAlpha.value = value;
    }

    public setOutlineThickness(value: number): void {
        this.pass.material.uniforms.outlineThickness.value = value;
    }

    public setFollowColor(value: number[]): void {
        this.pass.material.uniforms.followColor.value = new Color(value[0] / 255.0, value[1] / 255.0, value[2] / 255.0);
    }

    public setFollowAlpha(value: number): void {
        this.pass.material.uniforms.followAlpha.value = value;
    }

    public setFollowOutlineThickness(value: number): void {
        this.pass.material.uniforms.followThickness.value = value;
    }

    public setFollowedInstance(instance: number): void {
        this.pass.material.uniforms.followedInstance.value = instance;
    }

    public render(
        renderer: WebGLRenderer,
        target: WebGLRenderTarget | null,
        colorBuffer: WebGLRenderTarget,
        instanceIdBuffer: WebGLTexture,
        normalsBuffer: WebGLTexture
    ): void {
        // this render pass has to fill frag depth for future render passes
        this.pass.material.depthWrite = true;
        this.pass.material.depthTest = true;
        this.pass.material.uniforms.colorTex.value = colorBuffer.texture;
        this.pass.material.uniforms.instanceIdTex.value = instanceIdBuffer;
        this.pass.material.uniforms.normalsTex.value = normalsBuffer;

        // const c = renderer.getClearColor().clone();
        // const a = renderer.getClearAlpha();
        // renderer.setClearColor(new THREE.Color(1.0, 0.0, 0.0), 1.0);

        this.pass.render(renderer, target);

        // renderer.setClearColor(c, a);
    }
}

export default ContourPass;
