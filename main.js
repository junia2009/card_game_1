// ハイライト用
let highlightMeshes = [];

function clearHighlights() {
  for (const mesh of highlightMeshes) scene.remove(mesh);
  highlightMeshes = [];
}

function showHighlights(selected) {
  clearHighlights();
  if (!selected) return;
  // 移動可能な場札列
  if (selected.type === 'tableau' || selected.type === 'waste') {
    for (let col = 0; col < 7; col++) {
      let card = null;
      if (selected.type === 'tableau') card = tableau[selected.col][selected.row];
      if (selected.type === 'waste') card = waste[waste.length - 1];
      if (card && canMoveToTableau(card, col)) {
        // 一番上のカードの上に枠
        let y = 0.03;
        for (let row = 0; row < tableau[col].length; row++) {
          y += tableau[col][row].faceUp ? 0.22 : 0.10;
        }
        const geo = new THREE.BoxGeometry(1.05, 0.025, 1.45);
        const mat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.25 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.x = -4 + col * 1.3;
        mesh.position.z = -2 + tableau[col].length * 0.18;
        mesh.position.y = y + 0.01;
        scene.add(mesh);
        highlightMeshes.push(mesh);
      }
    }
    // 組札
    for (let i = 0; i < 4; i++) {
      let card = null;
      if (selected.type === 'tableau') card = tableau[selected.col][selected.row];
      if (selected.type === 'waste') card = waste[waste.length - 1];
      if (card && canMoveToFoundation(card, foundations[i])) {
        const geo = new THREE.BoxGeometry(1.05, 0.025, 1.45);
        const mat = new THREE.MeshBasicMaterial({ color: 0x0088ff, transparent: true, opacity: 0.25 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.x = -6 + i * 1.7;
        mesh.position.z = 2.2;
        mesh.position.y = 0.06;
        scene.add(mesh);
        highlightMeshes.push(mesh);
      }
    }
  }
}
// カード選択状態
let selected = null;

// カード移動ルール判定
function canMoveToFoundation(card, foundation) {
  if (foundation.length === 0) return card.rank === 1; // エースのみ
  const top = foundation[foundation.length - 1];
  return top.suit === card.suit && card.rank === top.rank + 1;
}
function canMoveToTableau(card, destCol) {
  if (tableau[destCol].length === 0) return card.rank === 13; // キングのみ
  const top = tableau[destCol][tableau[destCol].length - 1];
  // 赤黒交互、数字は1つ小さい
  const isRed = s => s === 'heart' || s === 'diamond';
  return top.faceUp && isRed(top.suit) !== isRed(card.suit) && card.rank === top.rank - 1;
}

// Three.jsのCDNを使って簡単な3Dカード表示サンプル
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js';

const container = document.getElementById('three-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x223);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 11, 0.1); // より上から見下ろす
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


// カード表面テクスチャ生成
function createCardFaceTexture(card) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 180;
  const ctx = canvas.getContext('2d');
  // 背景
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // スート・数字
  const suitSymbols = { spade: '♠', heart: '♥', diamond: '♦', club: '♣' };
  const suitColorsCss = { spade: '#222', club: '#222', heart: '#b22', diamond: '#b22' };
  ctx.font = 'bold 32px Segoe UI, Meiryo, sans-serif';
  ctx.fillStyle = suitColorsCss[card.suit];
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  // 数字
  let rankStr = card.rank;
  if (card.rank === 1) rankStr = 'A';
  else if (card.rank === 11) rankStr = 'J';
  else if (card.rank === 12) rankStr = 'Q';
  else if (card.rank === 13) rankStr = 'K';
  ctx.fillText(rankStr, 10, 8);
  // スート
  ctx.font = 'bold 28px Segoe UI Symbol, serif';
  ctx.fillText(suitSymbols[card.suit], 10, 44);
  // 中央にも大きくスート
  ctx.font = 'bold 60px Segoe UI Symbol, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(suitSymbols[card.suit], canvas.width/2, canvas.height/2);
  return new THREE.CanvasTexture(canvas);
}

// カードメッシュ生成
function createCardMesh(card, faceUp = true) {
  const geometry = new THREE.BoxGeometry(1, 0.02, 1.4);
  let material;
  if (faceUp) {
    // 表面（上面=2番目）にテクスチャ
    const tex = createCardFaceTexture(card);
    // BoxGeometryの面割り当て: [右, 左, 上, 下, 前, 後]
    // 上面(2)にテクスチャ、他は白
    const materials = [
      new THREE.MeshPhysicalMaterial({ color: 0xffffff }), // right
      new THREE.MeshPhysicalMaterial({ color: 0xffffff }), // left
      new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.3, metalness: 0.1, clearcoat: 1 }), // top (表)
      new THREE.MeshPhysicalMaterial({ color: 0xffffff }), // bottom
      new THREE.MeshPhysicalMaterial({ color: 0xffffff }), // front
      new THREE.MeshPhysicalMaterial({ color: 0xffffff })  // back
    ];
    material = materials;
  } else {
    // 裏面はグレー
    material = new THREE.MeshPhysicalMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.1, clearcoat: 1 });
  }
  const mesh = new THREE.Mesh(geometry, material);
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
function layoutTableauMeshes() {
  // 既存の場札メッシュを削除
  for (let i = cardMeshes.length - 1; i >= 0; i--) {
    const mesh = cardMeshes[i];
    if (mesh.userData && mesh.userData.col !== undefined && mesh.userData.row !== undefined) {
      scene.remove(mesh);
      cardMeshes.splice(i, 1);
    }
  }
  for (let col = 0; col < 7; col++) {
    let y = 0.03;
    for (let row = 0; row < tableau[col].length; row++) {
      const card = tableau[col][row];
      const mesh = createCardMesh(card, card.faceUp);
      mesh.position.x = -4 + col * 1.3;
      mesh.position.z = -2 + row * 0.18;
      mesh.position.y = y;
      mesh.userData = { col, row, card };
      scene.add(mesh);
      cardMeshes.push(mesh);
      // 表向きは広め、裏向きは狭めに重ねる
      y += card.faceUp ? 0.22 : 0.10;
    }
  }
}
layoutTableauMeshes();

// 山札の一番上だけ表示

// 捨て札（waste）
const waste = [];

// 組札（foundation）4つ
const foundations = [[], [], [], []];

// ゴール枠の表示
const foundationMeshes = [];
for (let i = 0; i < 4; i++) {
  const geo = new THREE.BoxGeometry(1, 0.021, 1.4);
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xcccccc, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.25 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.x = -6 + i * 1.7;
  mesh.position.z = 2.2;
  mesh.position.y = 0.03;
  mesh.userData = { foundation: true, index: i };
  scene.add(mesh);
  foundationMeshes.push(mesh);
}


function updateStockAndWasteMeshes() {
  // 既存の stock/waste/foundation メッシュを削除
  for (let i = cardMeshes.length - 1; i >= 0; i--) {
    const mesh = cardMeshes[i];
    if (mesh.userData && (mesh.userData.stock || mesh.userData.waste || mesh.userData.foundationCard)) {
      scene.remove(mesh);
      cardMeshes.splice(i, 1);
    }
  }
  // 山札の一番上
  if (stock.length > 0) {
    const mesh = createCardMesh(stock[stock.length - 1], false);
    mesh.position.x = 6;
    mesh.position.z = -2;
    mesh.position.y = 0.03;
    mesh.userData = { stock: true, index: stock.length - 1 };
    scene.add(mesh);
    cardMeshes.push(mesh);
  }
  // 捨て札の一番上
  if (waste.length > 0) {
    const mesh = createCardMesh(waste[waste.length - 1], true);
    mesh.position.x = 4.5;
    mesh.position.z = -2;
    mesh.position.y = 0.03;
    mesh.userData = { waste: true, index: waste.length - 1 };
    scene.add(mesh);
    cardMeshes.push(mesh);
  }
  // 組札の一番上
  for (let i = 0; i < 4; i++) {
    if (foundations[i].length > 0) {
      const card = foundations[i][foundations[i].length - 1];
      const mesh = createCardMesh(card, true);
      mesh.position.x = -6 + i * 1.7;
      mesh.position.z = 2.2;
      mesh.position.y = 0.03;
      mesh.userData = { foundationCard: true, foundationIndex: i };
      scene.add(mesh);
      cardMeshes.push(mesh);
    }
  }
  // 場札の再レイアウト
  layoutTableauMeshes();
}

updateStockAndWasteMeshes();
// --- カードの表裏切り替え（めくる）機能 ---


renderer.domElement.addEventListener('pointerdown', (event) => {
  clearHighlights();
  const rect = renderer.domElement.getBoundingClientRect();
  const mouse = {
    x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
    y: -((event.clientY - rect.top) / rect.height) * 2 + 1
  };
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(cardMeshes.concat(foundationMeshes), true);
  if (intersects.length > 0) {
    let obj = intersects[0].object;
    while (obj && !obj.userData && obj.parent) obj = obj.parent;
    const mesh = obj;

    // 1. カード選択（場札・捨て札・組札）
    if (!selected) {
      // 場札の表向きカード
      if (mesh.userData && mesh.userData.col !== undefined && mesh.userData.row !== undefined) {
        const { col, row } = mesh.userData;
        if (tableau[col][row].faceUp && row === tableau[col].length - 1) {
          selected = { type: 'tableau', col, row };
          // 選択中カードを少し上に浮かせる
          const mesh = cardMeshes.find(m => m.userData && m.userData.col === col && m.userData.row === row);
          if (mesh) mesh.position.y += 0.18;
          showHighlights(selected);
        }
        // 裏向きカードをめくる
        if (!tableau[col][row].faceUp && row === tableau[col].length - 1) {
          tableau[col][row].faceUp = true;
          updateStockAndWasteMeshes(); // レイアウトも再描画
        }
      }
      // 捨て札の一番上
      else if (mesh.userData && mesh.userData.waste && waste.length > 0 && mesh.userData.index === waste.length - 1) {
        selected = { type: 'waste' };
        // 捨て札選択時もハイライト
        showHighlights(selected);
      }
      // 組札の一番上
      else if (mesh.userData && mesh.userData.foundationCard) {
        const i = mesh.userData.foundationIndex;
        if (foundations[i].length > 0) {
          selected = { type: 'foundation', index: i };
          // 組札選択時は特にハイライトなし
        }
      }
      // 山札クリックで1枚めくる
      else if (mesh.userData && mesh.userData.stock) {
        if (stock.length > 0) {
          const card = stock.pop();
          card.faceUp = true;
          waste.push(card);
          updateStockAndWasteMeshes();
        } else if (waste.length > 0) {
          while (waste.length > 0) {
            const card = waste.pop();
            card.faceUp = false;
            stock.push(card);
          }
          updateStockAndWasteMeshes();
        }
      }
    } else {
      // 2. 移動先クリック
      clearHighlights();
      // 組札枠
      if (mesh.userData && mesh.userData.foundation) {
        const fIdx = mesh.userData.index;
        let card = null;
        if (selected.type === 'tableau') {
          card = tableau[selected.col][selected.row];
        } else if (selected.type === 'waste') {
          card = waste[waste.length - 1];
        }
        if (card && canMoveToFoundation(card, foundations[fIdx])) {
          // 移動
          if (selected.type === 'tableau') tableau[selected.col].pop();
          if (selected.type === 'waste') waste.pop();
          foundations[fIdx].push(card);
          updateStockAndWasteMeshes();
        }
        selected = null;
      }
      // 場札列
      else if (mesh.userData && mesh.userData.col !== undefined && mesh.userData.row !== undefined) {
        const destCol = mesh.userData.col;
        let card = null;
        if (selected.type === 'tableau') {
          // 1枚のみ移動（複数移動は未対応）
          card = tableau[selected.col][selected.row];
        } else if (selected.type === 'waste') {
          card = waste[waste.length - 1];
        }
        if (card && canMoveToTableau(card, destCol)) {
          if (selected.type === 'tableau') tableau[selected.col].pop();
          if (selected.type === 'waste') waste.pop();
          tableau[destCol].push(card);
          updateStockAndWasteMeshes();
        }
        selected = null;
      } else {
        // それ以外クリックで選択解除
        selected = null;
      }
    }
  } else {
    // 何もヒットしなければ選択解除
    selected = null;
  }
});



// レンダーループ（1本だけ残す）
function animate() {
  requestAnimationFrame(animate);
  // カード全体を少し揺らす演出例（必要なら）
  // cardMeshes.forEach((mesh, i) => { mesh.rotation.y = Math.sin(Date.now() * 0.001 + i) * 0.02; });
  renderer.render(scene, camera);
}
animate();

// リサイズ対応
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
