// Three.jsのCDNを使って簡単な3Dカード表示サンプル
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js';

const container = document.getElementById('three-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x223);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

// テーブル
const tableGeometry = new THREE.BoxGeometry(12, 0.5, 8);
const tableMaterial = new THREE.MeshPhysicalMaterial({ color: 0x2e8b57, roughness: 0.5, metalness: 0.2 });
const table = new THREE.Mesh(tableGeometry, tableMaterial);
table.position.y = -0.25;
scene.add(table);

// カード（シンプルな白い板）
const cardGeometry = new THREE.BoxGeometry(1, 0.02, 1.4);
const cardMaterial = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.1, clearcoat: 1 });
const card = new THREE.Mesh(cardGeometry, cardMaterial);
card.position.set(0, 0.03, 0);
scene.add(card);

// ライト
const ambient = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// レンダーループ
function animate() {
  requestAnimationFrame(animate);
  card.rotation.y += 0.005;
  renderer.render(scene, camera);
}
animate();

// リサイズ対応
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
