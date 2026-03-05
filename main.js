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

// ライト（1回だけ追加）
const ambient = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// レンダーループ（1本化）
function animate() {
  requestAnimationFrame(animate);
  // カード全体を少し揺らす演出例（必要なら）
  // cardMeshes.forEach((mesh, i) => { mesh.rotation.y = Math.sin(Date.now() * 0.001 + i) * 0.02; });
  renderer.render(scene, camera);
}
animate();

// リサイズ対応（1つだけ残す）
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// カードデッキ生成
const suits = ['spade', 'heart', 'diamond', 'club'];
const suitColors = { spade: 0x222222, club: 0x222222, heart: 0xb22222, diamond: 0xb22222 };
const ranks = [1,2,3,4,5,6,7,8,9,10,11,12,13];
function createDeck() {
  const deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}
function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

// カードメッシュ生成
function createCardMesh(card, faceUp = true) {
  const geometry = new THREE.BoxGeometry(1, 0.02, 1.4);
  const color = faceUp ? 0xffffff : 0x888888;
  const material = new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, metalness: 0.1, clearcoat: 1 });
  const mesh = new THREE.Mesh(geometry, material);
  if (faceUp) {
    // スート色で端にラインを入れる
    const edgeGeometry = new THREE.BoxGeometry(0.9, 0.021, 0.1);
    const edgeMaterial = new THREE.MeshBasicMaterial({ color: suitColors[card.suit] });
    const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edge.position.z = 0.6;
    edge.position.y = 0.012;
    mesh.add(edge);
  }
  return mesh;
}

// クロンダイク初期配置
const deck = createDeck();
shuffle(deck);

// 7列の場札
const tableau = [[],[],[],[],[],[],[]];
let deckIndex = 0;
for (let col = 0; col < 7; col++) {
  for (let row = 0; row <= col; row++) {
    const card = deck[deckIndex++];
    tableau[col].push({ ...card, faceUp: row === col });
  }
}

// 残りは山札
const stock = [];
while (deckIndex < deck.length) {
  stock.push({ ...deck[deckIndex++], faceUp: false });
}

// 3Dで場札を並べる
const cardMeshes = [];
for (let col = 0; col < 7; col++) {
  for (let row = 0; row < tableau[col].length; row++) {
    const card = tableau[col][row];
    const mesh = createCardMesh(card, card.faceUp);
    mesh.position.x = -4 + col * 1.3;
    mesh.position.z = -2 + row * 0.18;
    mesh.position.y = 0.03 + row * 0.03;
    scene.add(mesh);
    cardMeshes.push(mesh);
  }
}

// 山札の一番上だけ表示
if (stock.length > 0) {
  const mesh = createCardMesh(stock[stock.length - 1], false);
  mesh.position.x = 6;
  mesh.position.z = -2;
  mesh.position.y = 0.03;
  scene.add(mesh);
  cardMeshes.push(mesh);
}


// レンダーループ
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

// リサイズ対応
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
