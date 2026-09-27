import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

export function modelFormat(name: string | undefined, url: string) {
  const key = new URL(url, 'https://local.invalid').searchParams.get('key');
  return (name || key || url.split('?')[0]).split('.').pop()?.toLowerCase();
}

export function parseSTL(bytes: ArrayBuffer) {
  const geometry = new STLLoader().parse(bytes);
  const positions = geometry.getAttribute('position');
  if (!positions || positions.count < 3 || positions.count % 3 !== 0) {
    geometry.dispose();
    throw new Error('Il file STL non contiene triangoli validi.');
  }
  for (let i = 0; i < positions.array.length; i++) {
    if (!Number.isFinite(positions.array[i])) {
      geometry.dispose();
      throw new Error('Il file STL contiene coordinate non valide.');
    }
  }
  geometry.computeBoundingBox();
  const size = geometry.boundingBox!.getSize(new THREE.Vector3());
  const scale = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(scale) || scale <= 0) {
    geometry.dispose();
    throw new Error('Il modello STL è vuoto o privo di dimensioni.');
  }
  // Center the geometry itself before rendering, including CAD exports far from the origin.
  geometry.center();
  geometry.scale(2 / scale, 2 / scale, 2 / scale);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    color: 0xb8c0ca, roughness: 0.65, side: THREE.DoubleSide,
  }));
}

export function fitCamera(camera: THREE.PerspectiveCamera, object: THREE.Object3D) {
  object.updateMatrixWorld(true);
  const sphere = new THREE.Box3().setFromObject(object).getBoundingSphere(new THREE.Sphere());
  if (!Number.isFinite(sphere.radius) || sphere.radius <= 0) throw new Error('Il modello non contiene una geometria visibile.');
  const vertical = THREE.MathUtils.degToRad(camera.fov) / 2;
  const horizontal = Math.atan(Math.tan(vertical) * camera.aspect);
  const distance = sphere.radius / Math.sin(Math.min(vertical, horizontal)) * 1.15;
  camera.position.copy(sphere.center).add(new THREE.Vector3(0.65, 0.3, 1).normalize().multiplyScalar(distance));
  camera.near = Math.max(sphere.radius / 1000, 0.000001);
  camera.far = distance + sphere.radius * 100;
  camera.lookAt(sphere.center);
  camera.updateProjectionMatrix();
  return sphere;
}
