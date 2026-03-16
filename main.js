class GameManager {
  /**
   * ハイライトを全て消去
   */
  clearHighlights() {
    for (const mesh of this.highlightMeshes) this.scene.remove(mesh);
    this.highlightMeshes = [];
  }

  /**
   * 移動可能な場所をハイライト表示
   */
  showHighlights(selected) {
    this.clearHighlights();
    if (!selected) return;
    // テーブル中心基準で配置
    const startX = -this.tableWidth / 2 + 1.1;
    const startZ = -this.tableHeight / 2 + 1.0;
    // 移動可能な場札列
    if (selected.type === 'tableau' || selected.type === 'waste') {
      for (let col = 0; col < 7; col++) {
        let card = null;
        if (selected.type === 'tableau') card = this.tableau[selected.col][selected.row];
        if (selected.type === 'waste') card = this.waste[this.waste.length - 1];
        if (card && this.canMoveToTableau(card, col)) {
          // 一番上のカードの上に枠 or 空列枠
          let y = 0.03;
          let z = startZ;
          if (this.tableau[col].length > 0) {
            for (let row = 0; row < this.tableau[col].length; row++) {
              y += this.tableau[col][row].faceUp ? 0.22 : 0.10;
            }
            z = startZ + this.tableau[col].length * 0.18;
          } else {
            z = startZ;
            y = 0.03;
          }
          const geo = new THREE.BoxGeometry(1.2, 0.05, 1.7);
          const mat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 1.0 });
          mat.depthTest = false;
          const mesh = new THREE.Mesh(geo, mat);
          mesh.renderOrder = 9999;
          mesh.position.y = y + 0.01;
          mesh.position.x = startX + col * 1.3;
          mesh.position.z = z;
          mesh.userData = { highlightTableau: true, col };
          if (mesh.children) {
            for (const child of mesh.children) {
              child.userData = mesh.userData;
            }
          }
          this.scene.add(mesh);
          this.highlightMeshes.push(mesh);
        }
      }
      // 組札（座標計算を枠・カードと統一）
      const goalSpacing = 1.7;
      const goalCenterX = -this.tableWidth / 2 + this.tableWidth / 2;
      const goalOffset = -goalSpacing * 1.5;
      const goalZ = -this.tableHeight / 2 + this.tableHeight - 1.1;
      for (let i = 0; i < 4; i++) {
        let card = null;
        if (selected.type === 'tableau') card = this.tableau[selected.col][selected.row];
        if (selected.type === 'waste') card = this.waste[this.waste.length - 1];
        if (card && this.canMoveToFoundation(card, this.foundations[i])) {
          const geo = new THREE.BoxGeometry(1.2, 0.05, 1.7);
          const mat = new THREE.MeshBasicMaterial({ color: 0x0088ff, transparent: true, opacity: 1.0 });
          mat.depthTest = false;
          const mesh = new THREE.Mesh(geo, mat);
          mesh.renderOrder = 9999;
          mesh.position.y = 0.06;
          mesh.position.x = goalCenterX + goalOffset + i * goalSpacing;
          mesh.position.z = goalZ;
          mesh.userData = { highlightFoundation: true, foundationIndex: i };
          if (mesh.children) {
            for (const child of mesh.children) {
              child.userData = mesh.userData;
            }
          }
          this.scene.add(mesh);
          this.highlightMeshes.push(mesh);
        }
      }
    }
  }

  /**
   * カードが組札に移動可能か判定
   */
  canMoveToFoundation(card, foundation) {
    if (foundation.length === 0) return card.rank === 1;
    const top = foundation[foundation.length - 1];
    return top.suit === card.suit && card.rank === top.rank + 1;
  }

  /**
   * カードが場札列に移動可能か判定
   */
  canMoveToTableau(card, destCol) {
    if (this.tableau[destCol].length === 0) return card.rank === 13;
    const top = this.tableau[destCol][this.tableau[destCol].length - 1];
    const isRed = s => s === 'heart' || s === 'diamond';
    return top.faceUp && isRed(top.suit) !== isRed(card.suit) && card.rank === top.rank - 1;
  }
}

// --- GameManagerインスタンス生成 ---
var game = new GameManager();

// Three.jsのCDNを使って簡単な3Dカード表示サンプル


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
const tableWidth = 10.5;
const tableHeight = 6.5;
  // ハイライト用メッシュ管理はコンストラクタで初期化
const tableMaterial = new THREE.MeshPhysicalMaterial({ color: 0x2e8b57, roughness: 0.5, metalness: 0.2 });
const table = new THREE.Mesh(tableGeometry, tableMaterial);
table.position.y = -0.25;
scene.add(table);


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


// =============================
// カード情報を管理するクラス
// =============================
class Card {
  /**
   * カード情報
   * @param {string} suit - スート名（spade, heart, diamond, club）
   * @param {number} rank - ランク（1〜13）
   * @param {boolean} faceUp - 表向きかどうか
   */
  constructor(suit, rank, faceUp = false) {
    this.suit = suit;
    this.rank = rank;
    this.faceUp = faceUp;
  }
}

// =============================
// デッキ（山札）を管理するクラス
// =============================
class Deck {
  /**
   * デッキ生成・シャッフル管理
   */
  constructor() {
    this.suits = ['spade', 'heart', 'diamond', 'club'];
    this.ranks = [1,2,3,4,5,6,7,8,9,10,11,12,13];
    this.cards = [];
    this.createDeck();
  }

  /**
   * 52枚のカードを生成
   */
  createDeck() {
    this.cards = [];
    for (const suit of this.suits) {
      for (const rank of this.ranks) {
        this.cards.push(new Card(suit, rank));
      }
    }
  }

  /**
   * デッキをシャッフル
   */
  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  /**
   * デッキから1枚引く
   */
  draw() {
    return this.cards.pop();
  }
}

// ...existing code...



// =============================
// Cardクラスに描画用メソッドを追加
// =============================
Card.prototype.createFaceTexture = function() {
  // カード表面テクスチャ生成
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
  ctx.fillStyle = suitColorsCss[this.suit];
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  // 数字
  let rankStr = this.rank;
  if (this.rank === 1) rankStr = 'A';
  else if (this.rank === 11) rankStr = 'J';
  else if (this.rank === 12) rankStr = 'Q';
  else if (this.rank === 13) rankStr = 'K';
  ctx.fillText(rankStr, 10, 8);
  // スート
  ctx.font = 'bold 28px Segoe UI Symbol, serif';
  ctx.fillText(suitSymbols[this.suit], 10, 44);
  // 中央にも大きくスート
  ctx.font = 'bold 60px Segoe UI Symbol, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(suitSymbols[this.suit], canvas.width/2, canvas.height/2);
  return new THREE.CanvasTexture(canvas);
};

/**
 * カードの3Dメッシュを生成
 * @param {boolean} faceUp - 表向きか
 * @returns {THREE.Mesh}
 */
Card.prototype.createMesh = function(faceUp = true) {
  const geometry = new THREE.BoxGeometry(1, 0.02, 1.4);
  let material;
  if (faceUp) {
    // 表面（上面=2番目）にテクスチャ
    const tex = this.createFaceTexture();
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
};


// =============================
// ゲーム初期化処理
// =============================

// デッキ生成・シャッフル
const deck = new Deck();
deck.shuffle();

// 7列の場札（tableau）
const tableau = [[],[],[],[],[],[],[]];
let deckIndex = 0;
for (let col = 0; col < 7; col++) {
  for (let row = 0; row <= col; row++) {
    // 最下段のみ表向き
    const card = deck.cards[deckIndex++];
    card.faceUp = (row === col);
    tableau[col].push(card);
  }
}

// 残りは山札（stock）
const stock = [];
while (deckIndex < deck.cards.length) {
  const card = deck.cards[deckIndex++];
  card.faceUp = false;
  stock.push(card);
}

// 3Dで場札を並べる
const cardMeshes = [];
/**
 * 場札（tableau）のカードメッシュを再配置
 */
function layoutTableauMeshes() {
  // 既存の場札メッシュを削除
  for (let i = cardMeshes.length - 1; i >= 0; i--) {
    const mesh = cardMeshes[i];
    if (mesh.userData && mesh.userData.col !== undefined && mesh.userData.row !== undefined) {
      scene.remove(mesh);
      cardMeshes.splice(i, 1);
    }
  }
  // テーブル中心基準で配置
  const startX = -tableWidth / 2 + 1.1;
  const startZ = -tableHeight / 2 + 1.0;
  for (let col = 0; col < 7; col++) {
    let y = 0.03;
    for (let row = 0; row < tableau[col].length; row++) {
      const card = tableau[col][row];
      // CardクラスのcreateMeshを利用
      const mesh = card.createMesh(card.faceUp);
      mesh.position.x = startX + col * 1.3;
      mesh.position.z = startZ + row * 0.18;
      mesh.position.y = y;
      mesh.userData = { col, row, card };
      scene.add(mesh);
      cardMeshes.push(mesh);
      y += card.faceUp ? 0.22 : 0.10;
    }
  }
}
layoutTableauMeshes();


// ...existing code...
// --- カードの表裏切り替え（めくる）機能 ---






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
