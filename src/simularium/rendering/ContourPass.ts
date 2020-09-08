import { WebGLRenderer, WebGLRenderTarget } from "three";

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
                outlineThickness: { value: 4.0 },
                outlineAlpha: { value: 0.8 },
                followThickness: { value: 4.0 },
                followAlpha: { value: 0.8 },
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

              bool selected = isSelected(instance.r);
              if (selected) {
//                int typeId = abs(int(instance.r));
                  float thickness = outlineThickness;
                  bool sR = isSelected(texture(instanceIdTex, vUv + vec2(wStep*thickness, 0)).r);
                  bool sL = isSelected(texture(instanceIdTex, vUv + vec2(-wStep*thickness, 0)).r);
                  bool sT = isSelected(texture(instanceIdTex, vUv + vec2(0, hStep*thickness)).r);
                  bool sB = isSelected(texture(instanceIdTex, vUv + vec2(0, -hStep*thickness)).r);
                  if ( (!sR) || (!sL) || (!sT) || (!sB) )
                  {
                    //~ current pixel lies on the edge
                    // outline pixel color is a whitened version of the color
                    finalColor = mix(vec4(1,1,1,1), col, 1.0-outlineAlpha);

                  }

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
                  finalColor = mix(vec4(1,1,1,1), col, 1.0-followAlpha);
  
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
