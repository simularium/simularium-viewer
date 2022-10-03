"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _three = require("three");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

// strategy:
// 0. based on depth, aggregate atoms in the molecule into larger spheres using clustering ?
// 1. write spheres as GL_POINTs with appropriately scaled size
// 2. fragment shader: discard pts outside of sphere,
//    write normal
//    write depth
//    write color
//    write instance id (for same molecule...)
// 3. AO shader + blend over color buffer
// 4. outline shader over color buffer
//
// buffer of points to be drawn as sprites
var MoleculePass =
/*#__PURE__*/
function () {
  function MoleculePass(n) {
    _classCallCheck(this, MoleculePass);

    _defineProperty(this, "colorMaterial", void 0);

    _defineProperty(this, "normalMaterial", void 0);

    _defineProperty(this, "positionMaterial", void 0);

    _defineProperty(this, "particles", void 0);

    _defineProperty(this, "scene", void 0);

    _defineProperty(this, "geometry", void 0);

    this.geometry = new _three.BufferGeometry();
    this.createMoleculeBuffer(n);
    var vertexShader = "\n        precision highp float;\n\n        attribute float vTypeId;\n        attribute float vInstanceId;\n\n            uniform float iTime;\n            uniform vec2 iResolution;\n            uniform float Scale;\n            varying vec3 IN_viewPos;\n            varying float IN_radius;\n            flat out int IN_typeId;\n            flat out int IN_instanceId;\n            // varying vec4 IN_color;\n            // flat int IN_atomId;\n            uniform float radius;\n            void main()\t{\n                vec3 p = position.xyz;\n                vec4 modelViewPosition = modelViewMatrix * vec4(p, 1.0);\n                IN_viewPos = modelViewPosition.xyz;\n                //IN_viewZ = modelViewPosition.z;\n                //IN_radius = 20.0;\n                // IN_color = vec4(1.0, 0.0, 0.0, 1.0);\n                // IN_instanceId = 1;\n                // IN_atomId = 1;\n\n                gl_Position = projectionMatrix * modelViewPosition;\n\n                //IN_radius = (gl_Position.w > 0) ? gl_Position.w : 20.0;\n                //gl_PointSize = IN_radius;\n                //center = (0.5 * gl_Position.xy/gl_Position.w + 0.5) * vpSize;\n\n                gl_PointSize = iResolution.y * projectionMatrix[1][1] * radius * Scale / gl_Position.w;\n                //gl_PointSize = 10.0;\n                //gl_Position = vec4(0.0, 0.0, 0.0, 1.0);\n                IN_radius = radius;\n                IN_typeId = int(vTypeId);\n                IN_instanceId = int(vInstanceId);\n            }\n        ";
    var fragmentShader = "\n        precision highp float;\n\n        varying vec3 IN_viewPos;\n        varying float IN_radius;\n        flat in int IN_typeId;\n        flat in int IN_instanceId;\n            // varying vec4 IN_color;\n            // flat int IN_instanceId;\n            // flat int IN_atomId;\n\n            uniform float iTime;\n            uniform vec2 iResolution;\n\n            uniform float Scale;\n            uniform mat4 modelViewMatrix;\n            uniform mat4 projectionMatrix;\n            \n            void main()\t{\n                //gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);\n                //return;\n                \n\n                vec2 uv = (gl_PointCoord - vec2(.5, .5)) * 2.0;\n                float lensqr = dot(uv, uv);\n                if (lensqr > 1.0) discard;\n\n                vec3 normal = vec3(uv.x, uv.y, sqrt(1.0 - lensqr));\n                normal = normalize(normal);\n                vec3 normalOut = normal * 0.5 + 0.5;\n                //out_normal = vec4(normalOut, 1.0);\n  \n                vec3 fragViewPos = IN_viewPos;\n                // adding pushes Z back. so \"center\" of sphere is \"frontmost\"\n                fragViewPos.z += IN_radius * Scale * sqrt(1.0 - lensqr);\n                //out_viewPos = vec4(fragViewPos.x, fragViewPos.y, fragViewPos.z, 1.0); // view space position buffer, for ssao\n              \n                vec4 fragPosClip = projectionMatrix * vec4(fragViewPos, 1.0);\n                vec3 fragPosNDC = fragPosClip.xyz / fragPosClip.w;\n                float n = gl_DepthRange.near;\n                float f = gl_DepthRange.far;\n                float fragPosDepth = (((f - n) * fragPosNDC.z) + n + f) / 2.0;\n                gl_FragDepth = fragPosDepth;\n              \n                //out_color = IN_color;\n                //out_instanceId = vec4(float(IN_instanceId), 0, 0, 1.0);\n                //out_atomId = vec4(float(IN_atomId), 0, 0, 1.0);\n  \n\n                //gl_FragColor = vec4(fragPosDepth, 0.0, 0.0, 1.0);\n                // gl_FragColor = vec4(gl_PointCoord.xy, 0.0, 1.0);\n                \n                gl_FragColor = vec4(float(IN_typeId), float(IN_instanceId), fragViewPos.z, fragPosDepth);\n                //gl_FragColor = vec4(float(IN_typeId)/50.0, float(IN_typeId)/50.0, float(IN_typeId)/50.0, 1.0);\n                //gl_FragColor = vec4(84.0/255.0, 179.0/255.0, 162.0/255.0, 1.0);\n            }\n\n        ";
    var normalShader = "\n        precision highp float;\n\n        varying vec3 IN_viewPos;\n        varying float IN_radius;\n            // varying vec4 IN_color;\n            // flat int IN_instanceId;\n            // flat int IN_atomId;\n\n            uniform float iTime;\n            uniform vec2 iResolution;\n\n            uniform float Scale;\n            uniform mat4 modelViewMatrix;\n            uniform mat4 projectionMatrix;\n            \n            void main()\t{\n                \n                vec2 uv = (gl_PointCoord - vec2(.5, .5)) * 2.0;\n                float lensqr = dot(uv, uv);\n                if (lensqr > 1.0) discard;\n\n                vec3 normal = vec3(uv.x, uv.y, sqrt(1.0 - lensqr));\n                normal = normalize(normal);\n                vec3 normalOut = normal * 0.5 + 0.5;\n                //out_normal = vec4(normalOut, 1.0);\n  \n                vec3 fragViewPos = IN_viewPos;\n                // adding pushes Z back. so \"center\" of sphere is \"frontmost\"\n                fragViewPos.z += IN_radius * Scale * sqrt(1.0 - lensqr);\n                //out_viewPos = vec4(fragViewPos.x, fragViewPos.y, fragViewPos.z, 1.0); // view space position buffer, for ssao\n              \n                vec4 fragPosClip = projectionMatrix * vec4(fragViewPos, 1.0);\n                vec3 fragPosNDC = fragPosClip.xyz / fragPosClip.w;\n                float n = gl_DepthRange.near;\n                float f = gl_DepthRange.far;\n                float fragPosDepth = (((f - n) * fragPosNDC.z) + n + f) / 2.0;\n                gl_FragDepth = fragPosDepth;\n              \n                //out_color = IN_color;\n                //out_instanceId = vec4(float(IN_instanceId), 0, 0, 1.0);\n                //out_atomId = vec4(float(IN_atomId), 0, 0, 1.0);\n  \n\n                //gl_FragColor = vec4(fragPosDepth, 0.0, 0.0, 1.0);\n                gl_FragColor = vec4(normalOut, 1.0);\n            }\n\n        ";
    var positionShader = "\n        precision highp float;\n\n        varying vec3 IN_viewPos;\n        varying float IN_radius;\n            // varying vec4 IN_color;\n            // flat int IN_instanceId;\n            // flat int IN_atomId;\n\n            uniform float iTime;\n            uniform vec2 iResolution;\n\n            uniform float Scale;\n            uniform mat4 modelViewMatrix;\n            uniform mat4 projectionMatrix;\n            \n            void main()\t{\n                \n                vec2 uv = (gl_PointCoord - vec2(.5, .5)) * 2.0;\n                float lensqr = dot(uv, uv);\n                if (lensqr > 1.0) discard;\n\n                vec3 normal = vec3(uv.x, uv.y, sqrt(1.0 - lensqr));\n                normal = normalize(normal);\n                vec3 normalOut = normal * 0.5 + 0.5;\n                //out_normal = vec4(normalOut, 1.0);\n  \n                vec3 fragViewPos = IN_viewPos;\n                // adding pushes Z back. so \"center\" of sphere is \"frontmost\"\n                fragViewPos.z += IN_radius * Scale * sqrt(1.0 - lensqr);\n                //out_viewPos = vec4(fragViewPos.x, fragViewPos.y, fragViewPos.z, 1.0); // view space position buffer, for ssao\n              \n                vec4 fragPosClip = projectionMatrix * vec4(fragViewPos, 1.0);\n                vec3 fragPosNDC = fragPosClip.xyz / fragPosClip.w;\n                float n = gl_DepthRange.near;\n                float f = gl_DepthRange.far;\n                float fragPosDepth = (((f - n) * fragPosNDC.z) + n + f) / 2.0;\n                gl_FragDepth = fragPosDepth;\n              \n                //out_color = IN_color;\n                //out_instanceId = vec4(float(IN_instanceId), 0, 0, 1.0);\n                //out_atomId = vec4(float(IN_atomId), 0, 0, 1.0);\n  \n\n                //gl_FragColor = vec4(fragPosDepth, 0.0, 0.0, 1.0);\n                gl_FragColor = vec4(fragViewPos.x, fragViewPos.y, fragViewPos.z, 1.0);\n            }\n\n        ";
    this.colorMaterial = new _three.ShaderMaterial({
      uniforms: {
        radius: {
          value: 1.0
        },
        color: {
          value: new _three.Color(0x44ff44)
        },
        iTime: {
          value: 1.0
        },
        iResolution: {
          value: new _three.Vector2()
        },
        iChannel0: {
          value: null
        },
        iChannelResolution0: {
          value: new _three.Vector2(2, 2)
        },
        splat: {
          value: new _three.TextureLoader().load("assets/splat.png")
        },
        Scale: {
          value: 1.0
        },
        projectionMatrix: {
          value: new _three.Matrix4()
        }
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      side: _three.FrontSide,
      transparent: false
    });
    this.normalMaterial = new _three.ShaderMaterial({
      uniforms: {
        radius: {
          value: 1.0
        },
        color: {
          value: new _three.Color(0x44ff44)
        },
        iTime: {
          value: 1.0
        },
        iResolution: {
          value: new _three.Vector2()
        },
        iChannel0: {
          value: null
        },
        iChannelResolution0: {
          value: new _three.Vector2(2, 2)
        },
        splat: {
          value: new _three.TextureLoader().load("assets/splat.png")
        },
        Scale: {
          value: 1.0
        },
        projectionMatrix: {
          value: new _three.Matrix4()
        }
      },
      vertexShader: vertexShader,
      fragmentShader: normalShader,
      side: _three.FrontSide,
      transparent: false
    });
    this.positionMaterial = new _three.ShaderMaterial({
      uniforms: {
        radius: {
          value: 1.0
        },
        color: {
          value: new _three.Color(0x44ff44)
        },
        iTime: {
          value: 1.0
        },
        iResolution: {
          value: new _three.Vector2()
        },
        iChannel0: {
          value: null
        },
        iChannelResolution0: {
          value: new _three.Vector2(2, 2)
        },
        splat: {
          value: new _three.TextureLoader().load("assets/splat.png")
        },
        Scale: {
          value: 1.0
        },
        projectionMatrix: {
          value: new _three.Matrix4()
        }
      },
      vertexShader: vertexShader,
      fragmentShader: positionShader,
      side: _three.FrontSide,
      transparent: false
    }); // could break up into a few particles buffers at the cost of separate draw calls...

    this.particles = new _three.Points(this.geometry, this.colorMaterial);
    this.particles.visible = false;
    this.scene = new _three.Scene();
    this.scene.add(this.particles);
  }

  _createClass(MoleculePass, [{
    key: "createMoleculeBuffer",
    value: function createMoleculeBuffer(n) {
      this.geometry = new _three.BufferGeometry();
      var vertices = new Float32Array(n * 4);
      var typeIds = new Float32Array(n);
      var instanceIds = new Float32Array(n);

      for (var i = 0; i < n; i++) {
        // position
        vertices[i * 4] = 0;
        vertices[i * 4 + 1] = 0;
        vertices[i * 4 + 2] = 0;
        vertices[i * 4 + 3] = 1; // particle type id

        typeIds[i] = -1; // particle instance id

        instanceIds[i] = -1;
      }

      this.geometry.setAttribute("position", new _three.Float32BufferAttribute(vertices, 4));
      this.geometry.setAttribute("vTypeId", new _three.Float32BufferAttribute(typeIds, 1));
      this.geometry.setAttribute("vInstanceId", new _three.Float32BufferAttribute(instanceIds, 1));

      if (this.particles) {
        this.particles.geometry = this.geometry;
      }
    }
  }, {
    key: "update",
    value: function update(positions, typeIds, instanceIds, numVertices) {
      // update positions, and reset geoemtry in the particles object.
      var g = this.particles.geometry;
      var pa = g.getAttribute("position");
      pa.set(positions);
      pa.needsUpdate = true;
      var ta = g.getAttribute("vTypeId");
      ta.set(typeIds);
      ta.needsUpdate = true;
      var ia = g.getAttribute("vInstanceId");
      ia.set(instanceIds);
      ia.needsUpdate = true;
      g.setDrawRange(0, numVertices);
      this.particles.visible = true;
    }
  }, {
    key: "setAtomRadius",
    value: function setAtomRadius(r) {
      this.colorMaterial.uniforms.radius.value = r;
      this.normalMaterial.uniforms.radius.value = r;
      this.positionMaterial.uniforms.radius.value = r;
    }
  }, {
    key: "resize",
    value: function resize(width, height) {
      this.colorMaterial.uniforms.iResolution.value = new _three.Vector2(width, height);
      this.normalMaterial.uniforms.iResolution.value = new _three.Vector2(width, height);
      this.positionMaterial.uniforms.iResolution.value = new _three.Vector2(width, height);
    }
  }, {
    key: "render",
    value: function render(renderer, camera, colorBuffer, normalBuffer, positionBuffer) {
      var c = renderer.getClearColor().clone();
      var a = renderer.getClearAlpha(); // alpha == -1 is a marker to discard pixels later

      renderer.setClearColor(new _three.Color(0.0, 0.0, 0.0), -1.0);
      this.colorMaterial.uniforms.projectionMatrix.value = camera.projectionMatrix;
      this.normalMaterial.uniforms.projectionMatrix.value = camera.projectionMatrix;
      this.positionMaterial.uniforms.projectionMatrix.value = camera.projectionMatrix; // TODO : MRT

      renderer.setRenderTarget(colorBuffer);
      this.particles.material = this.colorMaterial;
      renderer.render(this.scene, camera);
      renderer.setRenderTarget(normalBuffer);
      this.particles.material = this.normalMaterial;
      renderer.render(this.scene, camera);
      renderer.setRenderTarget(positionBuffer);
      this.particles.material = this.positionMaterial;
      renderer.render(this.scene, camera);
      renderer.setClearColor(c, a);
    }
  }]);

  return MoleculePass;
}();

var _default = MoleculePass;
exports.default = _default;