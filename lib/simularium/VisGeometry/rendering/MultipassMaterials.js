"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.updateProjectionMatrix = updateProjectionMatrix;
exports.updateResolution = updateResolution;
exports.setRenderPass = setRenderPass;
exports.setSceneRenderPass = setSceneRenderPass;

var _three = require("three");

function updateProjectionMatrix(s, m) {
  s.mat.uniforms.projectionMatrix.value = m;
}

function updateResolution(s, x, y) {
  s.mat.uniforms.iResolution.value = new _three.Vector2(x, y);
}

function setRenderPass(obj, shaderSet) {
  obj.material = shaderSet.mat;
}

function setSceneRenderPass(scene, shaderSet) {
  scene.overrideMaterial = shaderSet.mat;
  return scene.overrideMaterial;
}