// ============================================================
//  3D Solitaire (Klondike)  –  main.js  v2.0.0
// ============================================================

// ─── canvas.roundRect ポリフィル ──────────────────────────────
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    const R = Math.min(r, w/2, h/2);
    this.beginPath();
    this.moveTo(x + R, y);
    this.arcTo(x+w, y,   x+w, y+h, R);
    this.arcTo(x+w, y+h, x,   y+h, R);
    this.arcTo(x,   y+h, x,   y,   R);
    this.arcTo(x,   y,   x+w, y,   R);
    this.closePath();
    return this;
  };
}

// ─── Three.js セットアップ ────────────────────────────────────
const container = document.getElementById('three-container');
const scene     = new THREE.Scene();
scene.background = new THREE.Color(0x1a2035);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

// アスペクト比に応じてカメラを調整
// ポートレート時はテーブル全幅が収まるよう高度とFOVを引き上げる
function fitCamera() {
  const aspect = window.innerWidth / window.innerHeight;
  camera.aspect = aspect;
  if (aspect < 1) {
    // ポートレート: カメラを高く、FOVを広く
    camera.position.set(0, 20, 2.5);
    camera.fov = 78;
  } else {
    // ランドスケープ: 通常設定
    camera.position.set(0, 14, 2);
    camera.fov = 45;
  }
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
fitCamera();

window.addEventListener('resize', fitCamera);

// ─── ライト ───────────────────────────────────────────────────
const ambient  = new THREE.AmbientLight(0xffffff, 0.65);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
dirLight.position.set(4, 12, 6);
dirLight.castShadow = true;
scene.add(dirLight);

// ─── テーブル ─────────────────────────────────────────────────
const TABLE_W = 11.5;
const TABLE_H = 8.0;
const tableGeo = new THREE.BoxGeometry(TABLE_W, 0.3, TABLE_H);
const tableMat = new THREE.MeshPhysicalMaterial({
  color: 0x2a7a50, roughness: 0.75, metalness: 0.05
});
const tableMesh = new THREE.Mesh(tableGeo, tableMat);
tableMesh.position.y = -0.18;
tableMesh.receiveShadow = true;
scene.add(tableMesh);

// ─── 定数 ─────────────────────────────────────────────────────
const CARD_W   = 1.05;
const CARD_H   = 0.025;
const CARD_D   = 1.5;
const COL_GAP  = 1.45;       // 場札列の横間隔
const OPEN_DZ  = 0.26;       // 表向きカードの縦オフセット
const CLOSE_DZ = 0.10;       // 裏向きカードの縦オフセット
const TABLEAU_X0 = -(COL_GAP * 3);   // 場札列左端X
const TABLEAU_Z  =  1.0;             // 場札手前Z基点
const FOUND_X0   = TABLEAU_X0 + COL_GAP * 3; // 組札左端X（場札3列目に揃える = 0）
const FOUND_Z    = -2.6;             // 組札Z
const STOCK_X    = -(COL_GAP * 3);   // 山札X
const STOCK_Z    = -2.6;             // 山札Z
const WASTE_X    = STOCK_X + COL_GAP;// 捨て札X
const WASTE_Z    = -2.6;             // 捨て札Z

// ─── 効果音（Web Audio APIで生成） ───────────────────────────
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) audioCtx = new AudioCtx();
}
function playTone(freq, dur = 0.08, type = 'sine', vol = 0.18) {
  try {
    ensureAudio();
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
  } catch (_) {}
}
function sfxClick()     { playTone(440, 0.07, 'triangle', 0.15); }
function sfxPlace()     { playTone(330, 0.10, 'sine',     0.20); }
function sfxFlip()      { playTone(520, 0.06, 'triangle', 0.12); }
function sfxFoundation(){ playTone(660, 0.15, 'sine',     0.22); playTone(880, 0.12, 'sine', 0.15); }
function sfxClear()     {
  [523,659,784,1047].forEach((f,i) => setTimeout(()=>playTone(f,0.2,'sine',0.25), i*120));
}
function sfxError()     { playTone(180, 0.12, 'sawtooth', 0.15); }

// ─── ユーティリティ ───────────────────────────────────────────
function isRed(suit)  { return suit === 'heart' || suit === 'diamond'; }
function rankStr(r) {
  if (r === 1) return 'A'; if (r === 11) return 'J';
  if (r === 12) return 'Q'; if (r === 13) return 'K';
  return String(r);
}
const SUIT_SYM = { spade: '♠', heart: '♥', diamond: '♦', club: '♣' };
const SUIT_COLOR = { spade: '#111', heart: '#c00', diamond: '#c00', club: '#111' };

// ─── テクスチャキャッシュ ────────────────────────────────────
const texCache = {};
function getCardTexture(suit, rank) {
  const key = `${suit}_${rank}`;
  if (texCache[key]) return texCache[key];
  const cv = document.createElement('canvas');
  cv.width = 130; cv.height = 182;
  const c = cv.getContext('2d');
  // 背景
  c.fillStyle = '#fff';
  c.roundRect(0, 0, 130, 182, 10);
  c.fill();
  // 枠
  c.strokeStyle = '#ccc'; c.lineWidth = 1.5;
  c.roundRect(1, 1, 128, 180, 9);
  c.stroke();
  const col = SUIT_COLOR[suit];
  const sym = SUIT_SYM[suit];
  const rs  = rankStr(rank);
  // 左上
  c.fillStyle = col;
  c.font = 'bold 26px Arial, sans-serif';
  c.textAlign = 'left'; c.textBaseline = 'top';
  c.fillText(rs, 8, 6);
  c.font = '22px Arial, sans-serif';
  c.fillText(sym, 8, 34);
  // 右下（180度回転）
  c.save();
  c.translate(130, 182); c.rotate(Math.PI);
  c.font = 'bold 26px Arial, sans-serif';
  c.textAlign = 'left'; c.textBaseline = 'top';
  c.fillText(rs, 8, 6);
  c.font = '22px Arial, sans-serif';
  c.fillText(sym, 8, 34);
  c.restore();
  // 中央
  c.font = '64px Arial, sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(sym, 65, 95);
  const tex = new THREE.CanvasTexture(cv);
  texCache[key] = tex;
  return tex;
}
function getBackTexture() {
  if (texCache['_back']) return texCache['_back'];
  const cv = document.createElement('canvas');
  cv.width = 130; cv.height = 182;
  const c = cv.getContext('2d');
  c.fillStyle = '#1a3a7a';
  c.roundRect(0, 0, 130, 182, 10); c.fill();
  c.strokeStyle = '#3060cc'; c.lineWidth = 3;
  c.roundRect(6, 6, 118, 170, 7); c.stroke();
  // 格子模様
  c.strokeStyle = 'rgba(80,130,220,0.4)'; c.lineWidth = 1;
  for (let x = 16; x < 130; x += 14) {
    c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 182); c.stroke();
  }
  for (let y = 16; y < 182; y += 14) {
    c.beginPath(); c.moveTo(0, y); c.lineTo(130, y); c.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  texCache['_back'] = tex;
  return tex;
}
function getEmptySlotTexture(label='') {
  const key = '_empty_' + label;
  if (texCache[key]) return texCache[key];
  const cv = document.createElement('canvas');
  cv.width = 130; cv.height = 182;
  const c = cv.getContext('2d');
  c.fillStyle = 'rgba(0,60,30,0.55)';
  c.roundRect(0, 0, 130, 182, 10); c.fill();
  c.strokeStyle = 'rgba(100,220,140,0.5)'; c.lineWidth = 2.5;
  c.roundRect(3, 3, 124, 176, 9); c.stroke();
  if (label) {
    c.fillStyle = 'rgba(120,240,160,0.6)';
    c.font = 'bold 48px Arial';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(label, 65, 91);
  }
  const tex = new THREE.CanvasTexture(cv);
  texCache[key] = tex;
  return tex;
}

// ─── カードメッシュ生成 ───────────────────────────────────────
function makeCardMesh(suit, rank, faceUp) {
  const geo = new THREE.BoxGeometry(CARD_W, CARD_H, CARD_D);
  const faceTex = faceUp ? getCardTexture(suit, rank) : getBackTexture();
  const mats = [
    new THREE.MeshPhysicalMaterial({ color: 0xfefefe }),
    new THREE.MeshPhysicalMaterial({ color: 0xfefefe }),
    new THREE.MeshPhysicalMaterial({ map: faceTex, roughness: 0.25, metalness: 0.05, clearcoat: 0.8 }),
    new THREE.MeshPhysicalMaterial({ map: getBackTexture(), roughness: 0.3, metalness: 0.05 }),
    new THREE.MeshPhysicalMaterial({ color: 0xfefefe }),
    new THREE.MeshPhysicalMaterial({ color: 0xfefefe }),
  ];
  const mesh = new THREE.Mesh(geo, mats);
  mesh.castShadow = true;
  return mesh;
}

// ─── スロットプレースホルダー ─────────────────────────────────
function makeSlotMesh(label='') {
  const geo = new THREE.BoxGeometry(CARD_W, 0.01, CARD_D);
  const mat = new THREE.MeshBasicMaterial({ map: getEmptySlotTexture(label) });
  const mesh = new THREE.Mesh(geo, mat);
  return mesh;
}

// ─── ハイライト枠 ────────────────────────────────────────────
function makeHighlightMesh(color = 0x00ff88) {
  const geo = new THREE.BoxGeometry(CARD_W + 0.08, 0.04, CARD_D + 0.08);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthTest: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 9999;
  return mesh;
}

// ─── パーティクルエフェクト（クリア演出） ────────────────────
function launchConfetti(n = 120) {
  const particles = [];
  const geo = new THREE.PlaneGeometry(0.25, 0.35);
  const colors = [0xff4466, 0xffcc00, 0x44aaff, 0x66ff88, 0xff88ff, 0xffaa44];
  for (let i = 0; i < n; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: colors[i % colors.length], side: THREE.DoubleSide });
    const m = new THREE.Mesh(geo, mat);
    m.position.set((Math.random()-0.5)*12, 3+Math.random()*4, (Math.random()-0.5)*8);
    m.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
    m.userData.vy = -(0.04 + Math.random()*0.06);
    m.userData.rx = (Math.random()-0.5)*0.05;
    m.userData.rz = (Math.random()-0.5)*0.05;
    scene.add(m);
    particles.push(m);
  }
  let frame = 0;
  function tick() {
    frame++;
    for (const p of particles) {
      p.position.y += p.userData.vy;
      p.rotation.x += p.userData.rx;
      p.rotation.z += p.userData.rz;
    }
    if (frame < 220) requestAnimationFrame(tick);
    else particles.forEach(p => scene.remove(p));
  }
  tick();
}

// ─── カードフリップアニメーション ────────────────────────────
function animateFlip(mesh, suit, rank, onDone) {
  let progress = 0;
  function tick() {
    progress += 0.08;
    const angle = Math.PI * Math.min(progress, 1);
    mesh.rotation.x = angle;
    if (progress >= 0.5 && !mesh.userData._flipped) {
      mesh.userData._flipped = true;
      // テクスチャを表に切り替え
      mesh.material[2].map = getCardTexture(suit, rank);
      mesh.material[2].needsUpdate = true;
    }
    if (progress < 1) requestAnimationFrame(tick);
    else { mesh.rotation.x = 0; if (onDone) onDone(); }
  }
  tick();
}

// ─── カード移動アニメーション ─────────────────────────────────
function animateMove(mesh, targetPos, onDone, lift = 1.2) {
  const startPos = mesh.position.clone();
  const midPos   = new THREE.Vector3(
    (startPos.x + targetPos.x) / 2,
    Math.max(startPos.y, targetPos.y) + lift,
    (startPos.z + targetPos.z) / 2
  );
  let t = 0;
  function tick() {
    t += 0.06;
    const tt = Math.min(t, 1);
    // ベジェ曲線
    const inv = 1 - tt;
    mesh.position.x = inv*inv*startPos.x + 2*inv*tt*midPos.x + tt*tt*targetPos.x;
    mesh.position.y = inv*inv*startPos.y + 2*inv*tt*midPos.y + tt*tt*targetPos.y;
    mesh.position.z = inv*inv*startPos.z + 2*inv*tt*midPos.z + tt*tt*targetPos.z;
    if (tt < 1) requestAnimationFrame(tick);
    else { mesh.position.copy(targetPos); if (onDone) onDone(); }
  }
  tick();
}

// ============================================================
//  ゲームロジック
// ============================================================
class SolitaireGame {
  constructor() {
    this.score    = 0;
    this.moves    = 0;
    this.history  = [];   // アンドゥ用スナップショット
    this.animating = false;

    // 3D座標上のオブジェクト群
    this.slotMeshes    = [];   // スロットプレースホルダー
    this.cardMeshes    = [];   // すべてのカードMesh
    this.hlMeshes      = [];   // ハイライト
    this.selected      = null; // 選択中 { type, col?, row?, stackFrom? }
    this.selectedMeshes = [];  // 選択ハイライトMesh

    this._init();
    this._buildSlots();
    this._render();
    this._bindEvents();
  }

  // ── データ初期化 ──────────────────────────────────────────
  _init() {
    const suits = ['spade','heart','diamond','club'];
    let cards = [];
    for (const s of suits)
      for (let r=1; r<=13; r++) cards.push({ suit:s, rank:r, faceUp:false });
    // シャッフル
    for (let i = cards.length-1; i > 0; i--) {
      const j = Math.floor(Math.random()*(i+1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    // 場札（tableau）
    this.tableau = Array.from({length:7}, () => []);
    let idx = 0;
    for (let col=0; col<7; col++) {
      for (let row=0; row<=col; row++) {
        const card = {...cards[idx++]};
        card.faceUp = (row === col);
        this.tableau[col].push(card);
      }
    }
    // 組札（foundation）
    this.foundations = Array.from({length:4}, () => []);
    // 山札（stock）
    this.stock = [];
    while (idx < cards.length) {
      this.stock.push({...cards[idx++], faceUp:false});
    }
    // 捨て札（waste）
    this.waste = [];
    this.selected = null;
  }

  // ── スロットメッシュ配置 ──────────────────────────────────
  _buildSlots() {
    // クリアして再生成
    for (const m of this.slotMeshes) scene.remove(m);
    this.slotMeshes = [];

    // 組札スロット
    for (let i=0; i<4; i++) {
      const m = makeSlotMesh(['A♠','A♥','A♦','A♣'][i]);
      m.position.set(FOUND_X0 + i*COL_GAP, 0, FOUND_Z);
      m.userData = { slotType:'foundation', index:i };
      scene.add(m);
      this.slotMeshes.push(m);
    }
    // 場札スロット
    for (let col=0; col<7; col++) {
      const m = makeSlotMesh('K');
      m.position.set(TABLEAU_X0 + col*COL_GAP, 0, TABLEAU_Z);
      m.userData = { slotType:'tableau', col };
      scene.add(m);
      this.slotMeshes.push(m);
    }
    // 山札スロット
    const stockSlot = makeSlotMesh('↺');
    stockSlot.position.set(STOCK_X, 0, STOCK_Z);
    stockSlot.userData = { slotType:'stock' };
    scene.add(stockSlot);
    this.slotMeshes.push(stockSlot);
    // 捨て札スロット
    const wasteSlot = makeSlotMesh('');
    wasteSlot.position.set(WASTE_X, 0, WASTE_Z);
    wasteSlot.userData = { slotType:'waste' };
    scene.add(wasteSlot);
    this.slotMeshes.push(wasteSlot);
  }

  // ── 全カードMeshを再構築 ──────────────────────────────────
  _render() {
    for (const m of this.cardMeshes) scene.remove(m);
    this.cardMeshes = [];
    this.clearHighlights();

    // 山札
    for (let i=0; i<this.stock.length; i++) {
      const card = this.stock[i];
      const mesh = makeCardMesh(card.suit, card.rank, false);
      mesh.position.set(STOCK_X, 0.01 + i*0.008, STOCK_Z);
      mesh.userData = { zone:'stock', index:i, card };
      scene.add(mesh);
      this.cardMeshes.push(mesh);
    }
    // 捨て札（上の3枚だけ表示）
    const wStart = Math.max(0, this.waste.length - 3);
    for (let i=wStart; i<this.waste.length; i++) {
      const card = this.waste[i];
      const mesh = makeCardMesh(card.suit, card.rank, true);
      const offset = i - wStart;
      mesh.position.set(WASTE_X + offset*0.15, 0.01 + i*0.008, WASTE_Z);
      mesh.userData = { zone:'waste', index:i, card };
      scene.add(mesh);
      this.cardMeshes.push(mesh);
    }
    // 組札
    for (let fi=0; fi<4; fi++) {
      const pile = this.foundations[fi];
      for (let i=0; i<pile.length; i++) {
        const card = pile[i];
        const mesh = makeCardMesh(card.suit, card.rank, true);
        mesh.position.set(FOUND_X0 + fi*COL_GAP, 0.01 + i*0.006, FOUND_Z);
        mesh.userData = { zone:'foundation', fi, index:i, card };
        scene.add(mesh);
        this.cardMeshes.push(mesh);
      }
    }
    // 場札
    for (let col=0; col<7; col++) {
      let y = 0.01;
      for (let row=0; row<this.tableau[col].length; row++) {
        const card = this.tableau[col][row];
        const mesh = makeCardMesh(card.suit, card.rank, card.faceUp);
        mesh.position.set(TABLEAU_X0 + col*COL_GAP, y, TABLEAU_Z + row*(card.faceUp ? OPEN_DZ : CLOSE_DZ));
        mesh.userData = { zone:'tableau', col, row, card };
        scene.add(mesh);
        this.cardMeshes.push(mesh);
        y += card.faceUp ? 0.022 : 0.010;
      }
    }

    this._updateUI();
  }

  // ── UIスコア更新 ──────────────────────────────────────────
  _updateUI() {
    document.getElementById('score-value').textContent = this.score;
    document.getElementById('moves-value').textContent = this.moves;
  }

  // ── ハイライトクリア ──────────────────────────────────────
  clearHighlights() {
    for (const m of this.hlMeshes) scene.remove(m);
    this.hlMeshes = [];
    for (const m of this.selectedMeshes) scene.remove(m);
    this.selectedMeshes = [];
  }

  // ── 選択ハイライト ────────────────────────────────────────
  _highlightSelected(meshes) {
    for (const mesh of meshes) {
      const h = makeHighlightMesh(0xffdd00);
      h.position.set(mesh.position.x, mesh.position.y + 0.04, mesh.position.z);
      scene.add(h);
      this.selectedMeshes.push(h);
    }
  }

  // ── 移動可能先のハイライト ────────────────────────────────
  _showMoveHints(card) {
    // 組札
    for (let fi=0; fi<4; fi++) {
      if (this._canToFoundation(card, fi)) {
        const h = makeHighlightMesh(0x44aaff);
        h.position.set(FOUND_X0 + fi*COL_GAP, 0.05, FOUND_Z);
        scene.add(h);
        this.hlMeshes.push(h);
      }
    }
    // 場札
    for (let col=0; col<7; col++) {
      if (this._canToTableau(card, col)) {
        const pile = this.tableau[col];
        const row  = pile.length;
        const z    = TABLEAU_Z + (row > 0
          ? row * (pile[row-1]?.faceUp ? OPEN_DZ : CLOSE_DZ)
          : 0);
        const h = makeHighlightMesh(0x00ff88);
        h.position.set(TABLEAU_X0 + col*COL_GAP, 0.05, z);
        scene.add(h);
        this.hlMeshes.push(h);
      }
    }
  }

  // ── ルール判定 ────────────────────────────────────────────
  _canToFoundation(card, fi) {
    const pile = this.foundations[fi];
    if (pile.length === 0) return card.rank === 1;
    const top = pile[pile.length-1];
    return top.suit === card.suit && card.rank === top.rank + 1;
  }
  _canToTableau(card, col) {
    const pile = this.tableau[col];
    if (pile.length === 0) return card.rank === 13;
    const top = pile[pile.length-1];
    return top.faceUp && isRed(top.suit) !== isRed(card.suit) && card.rank === top.rank - 1;
  }

  // ── 山札をめくる ──────────────────────────────────────────
  _drawStock() {
    this._saveHistory();
    if (this.stock.length === 0) {
      // リセット
      this.stock = this.waste.reverse().map(c => ({...c, faceUp:false}));
      this.waste = [];
      sfxClick();
    } else {
      const card = this.stock.pop();
      card.faceUp = true;
      this.waste.push(card);
      sfxFlip();
      this.score = Math.max(0, this.score - 5);
    }
    this.moves++;
    this._render();
  }

  // ── スナップショット保存 ──────────────────────────────────
  _saveHistory() {
    const snap = {
      tableau:     this.tableau.map(col => col.map(c => ({...c}))),
      foundations: this.foundations.map(f => f.map(c => ({...c}))),
      stock:       this.stock.map(c => ({...c})),
      waste:       this.waste.map(c => ({...c})),
      score:       this.score,
      moves:       this.moves,
    };
    this.history.push(snap);
    if (this.history.length > 30) this.history.shift();
  }

  // ── アンドゥ ──────────────────────────────────────────────
  undo() {
    if (this.history.length === 0) { sfxError(); return; }
    const snap = this.history.pop();
    this.tableau     = snap.tableau;
    this.foundations = snap.foundations;
    this.stock       = snap.stock;
    this.waste       = snap.waste;
    this.score       = snap.score;
    this.moves       = snap.moves;
    this.selected    = null;
    sfxClick();
    this._render();
  }

  // ── クリック処理 ──────────────────────────────────────────
  _onCardClick(userData) {
    if (this.animating) return;
    const { zone, col, row, fi, index, card } = userData;

    // 山札クリック
    if (zone === 'stock') { this._drawStock(); return; }

    // 何も選択していない場合
    if (!this.selected) {
      // 捨て札の一番上
      if (zone === 'waste' && index === this.waste.length - 1) {
        this.selected = { zone:'waste', card: this.waste[this.waste.length-1] };
        sfxClick();
        const mesh = this.cardMeshes.find(m => m.userData.zone === 'waste' && m.userData.index === index);
        if (mesh) this._highlightSelected([mesh]);
        this._showMoveHints(this.selected.card);
        return;
      }
      // 組札のトップ
      if (zone === 'foundation') {
        const pile = this.foundations[fi];
        if (index === pile.length - 1) {
          this.selected = { zone:'foundation', fi, card: pile[pile.length-1] };
          sfxClick();
          const mesh = this.cardMeshes.find(m => m.userData.zone==='foundation' && m.userData.fi===fi && m.userData.index===index);
          if (mesh) this._highlightSelected([mesh]);
          this._showMoveHints(this.selected.card);
          return;
        }
      }
      // 場札
      if (zone === 'tableau') {
        const pile = this.tableau[col];
        if (!card.faceUp) return;
        // 選択したrowから下のスタックをまとめて動かす
        this.selected = { zone:'tableau', col, row, card: pile[row], stackFrom: row };
        sfxClick();
        const selMeshes = this.cardMeshes.filter(m => m.userData.zone==='tableau' && m.userData.col===col && m.userData.row>=row);
        this._highlightSelected(selMeshes);
        this._showMoveHints(pile[row]);
        return;
      }
      return;
    }

    // 既に選択中 → 移動先を決定
    const src = this.selected;
    this.selected = null;
    this.clearHighlights();

    // 同じカードをクリック → 選択解除
    if (zone === src.zone && col === src.col && fi === src.fi && index === src.index && row === src.row) {
      return;
    }

    // 組札へ移動
    if (zone === 'foundation') {
      if (src.zone === 'tableau' && src.stackFrom !== this.tableau[src.col].length - 1) {
        sfxError(); this._render(); return; // スタック途中は組札不可
      }
      if (this._canToFoundation(src.card, fi)) {
        this._moveToFoundation(src, fi);
        return;
      }
      sfxError(); this._render(); return;
    }

    // 場札へ移動
    if (zone === 'tableau') {
      const destCol = col;
      if (this._canToTableau(src.card, destCol)) {
        this._moveToTableau(src, destCol);
        return;
      }
      sfxError(); this._render(); return;
    }

    // 捨て札・山札クリックは選択中に押された場合は解除だけ
    this._render();
  }

  // ── 組札へ移動 ────────────────────────────────────────────
  _moveToFoundation(src, fi) {
    this._saveHistory();
    let movedCard;
    if (src.zone === 'waste') {
      movedCard = this.waste.pop();
    } else if (src.zone === 'tableau') {
      movedCard = this.tableau[src.col].pop();
      this._flipTopTableau(src.col);
    } else if (src.zone === 'foundation') {
      movedCard = this.foundations[src.fi].pop();
    }
    movedCard.faceUp = true;
    this.foundations[fi].push(movedCard);
    this.score += 15;
    this.moves++;
    sfxFoundation();
    this._render();
    this._checkWin();
  }

  // ── 場札へ移動 ────────────────────────────────────────────
  _moveToTableau(src, destCol) {
    this._saveHistory();
    if (src.zone === 'waste') {
      const card = this.waste.pop();
      card.faceUp = true;
      this.tableau[destCol].push(card);
      this.score += 5;
    } else if (src.zone === 'foundation') {
      const card = this.foundations[src.fi].pop();
      card.faceUp = true;
      this.tableau[destCol].push(card);
      this.score = Math.max(0, this.score - 10);
    } else if (src.zone === 'tableau') {
      const stack = this.tableau[src.col].splice(src.stackFrom);
      for (const c of stack) {
        c.faceUp = true;
        this.tableau[destCol].push(c);
      }
      this._flipTopTableau(src.col);
      this.score += 3;
    }
    this.moves++;
    sfxPlace();
    this._render();
  }

  // ── 場札の先頭を自動めくり ────────────────────────────────
  _flipTopTableau(col) {
    const pile = this.tableau[col];
    if (pile.length > 0 && !pile[pile.length-1].faceUp) {
      pile[pile.length-1].faceUp = true;
      this.score += 10;
      sfxFlip();
    }
  }

  // ── 勝利判定 ──────────────────────────────────────────────
  _checkWin() {
    const total = this.foundations.reduce((s,f) => s + f.length, 0);
    if (total === 52) {
      sfxClear();
      launchConfetti();
      setTimeout(() => {
        document.getElementById('clear-score').textContent =
          `スコア: ${this.score}点 / ${this.moves}手`;
        document.getElementById('clear-overlay').style.display = 'flex';
      }, 800);
    }
  }

  // ── ヒント（自動移動候補を1つハイライト） ────────────────
  hint() {
    this.clearHighlights();
    this.selected = null;
    // 捨て札→組札
    if (this.waste.length > 0) {
      const wCard = this.waste[this.waste.length-1];
      for (let fi=0; fi<4; fi++) {
        if (this._canToFoundation(wCard, fi)) {
          const mesh = this.cardMeshes.find(m => m.userData.zone==='waste' && m.userData.index===this.waste.length-1);
          if (mesh) { const h = makeHighlightMesh(0xff8800); h.position.set(mesh.position.x, mesh.position.y+0.05, mesh.position.z); scene.add(h); this.hlMeshes.push(h); }
          sfxClick(); return;
        }
      }
    }
    // 場札→組札
    for (let col=0; col<7; col++) {
      const pile = this.tableau[col];
      if (pile.length > 0 && pile[pile.length-1].faceUp) {
        const top = pile[pile.length-1];
        for (let fi=0; fi<4; fi++) {
          if (this._canToFoundation(top, fi)) {
            const mesh = this.cardMeshes.find(m => m.userData.zone==='tableau' && m.userData.col===col && m.userData.row===pile.length-1);
            if (mesh) { const h = makeHighlightMesh(0xff8800); h.position.set(mesh.position.x, mesh.position.y+0.05, mesh.position.z); scene.add(h); this.hlMeshes.push(h); }
            sfxClick(); return;
          }
        }
      }
    }
    // 場札→場札
    for (let col=0; col<7; col++) {
      const pile = this.tableau[col];
      for (let row=0; row<pile.length; row++) {
        if (!pile[row].faceUp) continue;
        for (let dc=0; dc<7; dc++) {
          if (dc === col) continue;
          if (this._canToTableau(pile[row], dc)) {
            const mesh = this.cardMeshes.find(m => m.userData.zone==='tableau' && m.userData.col===col && m.userData.row===row);
            if (mesh) { const h = makeHighlightMesh(0xff8800); h.position.set(mesh.position.x, mesh.position.y+0.05, mesh.position.z); scene.add(h); this.hlMeshes.push(h); }
            sfxClick(); return;
          }
        }
      }
    }
    // 山札めくりを推奨
    if (this.stock.length > 0) {
      const stockMesh = this.cardMeshes.find(m => m.userData.zone==='stock');
      if (stockMesh) { const h = makeHighlightMesh(0xff8800); h.position.set(stockMesh.position.x, stockMesh.position.y+0.05, stockMesh.position.z); scene.add(h); this.hlMeshes.push(h); }
      sfxClick(); return;
    }
    sfxError();
  }

  // ── イベントバインド ──────────────────────────────────────
  _bindEvents() {
    const raycaster = new THREE.Raycaster();
    const mouse     = new THREE.Vector2();

    // touch-action: none でブラウザのスクロール・ズームを無効化
    renderer.domElement.style.touchAction = 'none';

    // pointerup = マウスクリック・タップ両対応（iOS 300ms遅延なし）
    renderer.domElement.addEventListener('pointerup', (e) => {
      // ドラッグ後の誤タップを除外（5px以上動いた場合は無視）
      if (e.pointerType === 'touch' && this._touchMoved) return;

      mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      // カードに当たり判定
      const hits = raycaster.intersectObjects(this.cardMeshes, false);
      if (hits.length > 0) {
        this._onCardClick(hits[0].object.userData);
        return;
      }
      // スロット（空き列・山札エリア）
      const slotHits = raycaster.intersectObjects(this.slotMeshes, false);
      if (slotHits.length > 0) {
        const { slotType, index, col } = slotHits[0].object.userData;
        if (slotType === 'stock') { this._onCardClick({ zone:'stock' }); return; }
        if (slotType === 'tableau' && this.selected) {
          this._onCardClick({ zone:'tableau', col, row:0, card: null });
          return;
        }
        if (slotType === 'foundation') {
          const fi = slotHits[0].object.userData.index;
          if (this.selected) {
            this._onCardClick({ zone:'foundation', fi, card:null });
          } else {
            // 山札なければ空スロットクリックは何もしない
          }
          return;
        }
      }
      // 空クリック → 選択解除
      if (this.selected) { this.selected = null; this.clearHighlights(); this._render(); }
    });

    // タッチ移動検知（ドラッグ誤タップ防止）
    this._touchMoved = false;
    renderer.domElement.addEventListener('pointerdown', () => { this._touchMoved = false; });
    renderer.domElement.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') this._touchMoved = true;
    });

    // UI ボタン
    document.getElementById('btn-new-game').addEventListener('click', () => {
      document.getElementById('clear-overlay').style.display = 'none';
      for (const m of this.cardMeshes) scene.remove(m); this.cardMeshes = [];
      this.clearHighlights();
      this._init();
      this._buildSlots();
      this._render();
      sfxClick();
    });
    document.getElementById('btn-undo').addEventListener('click', () => this.undo());
    document.getElementById('btn-hint').addEventListener('click', () => this.hint());
    document.getElementById('btn-clear-new').addEventListener('click', () => {
      document.getElementById('clear-overlay').style.display = 'none';
      document.getElementById('btn-new-game').click();
    });
    document.getElementById('btn-guide-open').addEventListener('click', () => {
      document.getElementById('guide-box').classList.toggle('visible');
    });
    document.getElementById('btn-guide-close').addEventListener('click', () => {
      document.getElementById('guide-box').classList.remove('visible');
    });
  }
}

// ─── レンダーループ ───────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

// ─── ゲーム開始 ───────────────────────────────────────────────
const game = new SolitaireGame();
