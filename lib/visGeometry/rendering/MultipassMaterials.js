"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setRenderPass = setRenderPass;
exports.setSceneRenderPass = setSceneRenderPass;
exports.updateProjectionMatrix = updateProjectionMatrix;
exports.updateResolution = updateResolution;

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