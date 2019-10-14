class RenderToBuffer {
    constructor(paramsObj) {
        // paramsobj should have:
        // fragmentShader
        // uniforms
      this.frameCounter = 0;
      this.sampleCounter = 0;
      this.renderUpdateListener = null;
      this.scene = new THREE.Scene();
      this.geometry = new THREE.PlaneBufferGeometry(2, 2);

      // augment uniforms (and shader source?)
      this.material = new THREE.ShaderMaterial({
        vertexShader: [
            "varying vec2 vUv;",
    
            "void main()",
            "{",
            "vUv = uv;",
            "gl_Position = vec4( position, 1.0 );",
            "}",
          ].join("\n"),
        fragmentShader: paramsObj.fragmentShader,
        uniforms: paramsObj.uniforms
      });
  
      // in order to guarantee the whole quad is drawn every time optimally:
      this.material.depthWrite = false;
      this.material.depthTest = false;
      
      this.mesh = new THREE.Mesh(
        this.geometry,
        this.material
      );
      this.scene.add(this.mesh);
  
      // quadCamera is simply the camera to help render the full screen quad (2 triangles),
      // It is an Orthographic camera that sits facing the view plane.
      // This camera will not move or rotate for the duration of the app.
      this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    }
  
    render(renderer, target) {
      renderer.setRenderTarget(target);
      renderer.render(
        this.scene,
        this.camera
      );
    }
}

export default RenderToBuffer;

  