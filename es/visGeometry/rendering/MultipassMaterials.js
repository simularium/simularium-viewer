import { Vector2 } from "three";
export function updateProjectionMatrix(s, m) {
  s.mat.uniforms.projectionMatrix.value = m;
}
export function updateResolution(s, x, y) {
  s.mat.uniforms.iResolution.value = new Vector2(x, y);
}
export function setRenderPass(obj, shaderSet) {
  obj.material = shaderSet.mat;
}
export function setSceneRenderPass(scene, shaderSet) {
  scene.overrideMaterial = shaderSet.mat;
  return scene.overrideMaterial;
}