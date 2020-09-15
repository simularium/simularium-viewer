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
                highlightInstance: { value: -1 },
                outlineThickness: { value: 2.0 },
                outlineAlpha: { value: 0.8 },
                outlineColor: { value: new Color(1, 1, 1) },
                followThickness: { value: 3.0 },
                followAlpha: { value: 0.8 },
                followColor: { value: new Color(1, 1, 0) },
            },
            fragmentShader: `
            in vec2 vUv;
            
            uniform sampler2D colorTex;
            uniform sampler2D instanceIdTex;
            uniform sampler2D normalsTex;
            uniform float highlightInstance;
            uniform float outlineThickness;
            uniform float followThickness;
            uniform float followAlpha;
            uniform float outlineAlpha;
            uniform vec3 followColor;
            uniform vec3 outlineColor;

            bool isSelected(float typevalue) {
              return (sign(typevalue) > 0.0);
            }

            void main(void)
            {
              vec4 col = texture(colorTex, vUv);
              //output_col = col;
              //return;
            
              ivec2 resolution = textureSize(colorTex, 0);
            
              vec2 pixelPos = vUv * vec2(float(resolution.x), float(resolution.y));
              float wStep = 1.0 / float(resolution.x);
              float hStep = 1.0 / float(resolution.y);
            
              vec4 instance = texture(instanceIdTex, vUv);
              // instance.g is the agent id
              int X = int(instance.g);
              int R = int(texture(instanceIdTex, vUv + vec2(wStep, 0)).g);
              int L = int(texture(instanceIdTex, vUv + vec2(-wStep, 0)).g);
              int T = int(texture(instanceIdTex, vUv + vec2(0, hStep)).g);
              int B = int(texture(instanceIdTex, vUv + vec2(0, -hStep)).g);
            
              vec4 finalColor;
              if ( (X == R) && (X == L) && (X == T) && (X == B) )
              {
                //~ current pixel is NOT on the edge
                finalColor = col;
              }
              else
              {
                //~ current pixel lies on the edge
                // outline pixel color is a blackened version of the color
                finalColor = mix(vec4(0,0,0,1), col, 0.8);

              }

              // instance.r is the type id
              bool selected = isSelected(instance.r);
              if (selected) {
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
                    bool v = isSelected(
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
                finalColor = mix(col, vec4(outlineColor.rgb,1), g*outlineAlpha);

              }



              if (X >= 0 && X == int(highlightInstance)) {
                float thickness = followThickness;
                R = int(texture(instanceIdTex, vUv + vec2(wStep*thickness, 0)).g);
                L = int(texture(instanceIdTex, vUv + vec2(-wStep*thickness, 0)).g);
                T = int(texture(instanceIdTex, vUv + vec2(0, hStep*thickness)).g);
                B = int(texture(instanceIdTex, vUv + vec2(0, -hStep*thickness)).g);
                if ( (X != R) || (X != L) || (X != T) || (X != B) )
                {
                  //~ current pixel lies on the edge
                  // outline pixel color is a whitened version of the color
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

    public render(
        renderer: WebGLRenderer,
        target: WebGLRenderTarget | null,
        colorBuffer: WebGLRenderTarget,
        instanceIdBuffer: WebGLRenderTarget,
        normalsBuffer: WebGLRenderTarget
    ): void {
        // this render pass has to fill frag depth for future render passes
        this.pass.material.depthWrite = true;
        this.pass.material.depthTest = true;
        this.pass.material.uniforms.colorTex.value = colorBuffer.texture;
        this.pass.material.uniforms.instanceIdTex.value =
            instanceIdBuffer.texture;
        this.pass.material.uniforms.normalsTex.value = normalsBuffer.texture;

        // const c = renderer.getClearColor().clone();
        // const a = renderer.getClearAlpha();
        // renderer.setClearColor(new THREE.Color(1.0, 0.0, 0.0), 1.0);

        this.pass.render(renderer, target);

        // renderer.setClearColor(c, a);
    }
}

export default ContourPass;
