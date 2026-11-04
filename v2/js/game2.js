// GuildClerkWorkGame v2（基盤の版）
// テーブル・操作分類（紙／本／小物／用紙／道具）・手・設備窓と、縮小した受注対応・終了対応
(() => {
'use strict';

/* ================= 小道具 ================= */
const $ = s => document.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const weighted = obj => { const ks = Object.keys(obj); let r = Math.random() * ks.reduce((s, k) => s + obj[k], 0); for (const k of ks) { r -= obj[k]; if (r <= 0) return k; } return ks[0]; };
const rankIdx = r => RANKS.indexOf(r);
const hhmm = m => { m = Math.floor(m); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const META = window.ADV_META;
const ITEM_NAME2 = ITEM_NAME;

/* ================= 画像 ================= */
const IMGS = {};
const loadImg = (k, src) => new Promise(res => { const im = new Image(); im.onload = res; im.onerror = res; im.src = src; IMGS[k] = im; });

/* ================= テーブルの寸法 ================= */
const TW = 800, TH = 484;
const HANDOVER_H = 22;            // 上の端（依頼者へ渡す）
const PUTAWAY_W = 18;             // 右の端（しまう／郵便）
const SM = 48;                    // 小物・道具の大きさ
const FIX = {
  apply: { x: 10, y: 398, w: 96, h: 78, label: '受注申請用紙' },
  order: { x: 10, y: 398, w: 96, h: 78, label: '注文用紙' },
  calendar: { x: 598, y: 398, w: 112, h: 78 },
  trash: { x: 718, y: 398, w: 74, h: 78 },
};
const TOOL_DEF = {
  pen: { name: '筆記具', desc: '受注申請用紙の却下事項に、左クリックでチェック、右クリックでチェックを消す', home: [226, 414] },
  ar: { name: '認可/却下用ハンコ', desc: '受注申請用紙に押す。ホイール上で「認可」、下で「却下」', home: [282, 414] },
  seal: { name: 'ギルド承認印', desc: '終了対応の受注申請用紙・クエスト要請の写し、注文用紙に押す', home: [338, 414] },
  q2: { name: '数量ハンコ「2」', desc: '注文用紙の品の枠に押す', home: [282, 414] },
  q5: { name: '数量ハンコ「5」', desc: '注文用紙の品の枠に押す', home: [338, 414] },
  q10: { name: '数量ハンコ「10」', desc: '注文用紙の品の枠に押す', home: [394, 414] },
};
// テーブルごとの道具と備品。個人用テーブルの「注文書を書く」セットでは、承認印を左に寄せる
const TABLE_KIT = {
  normal: { tools: { pen: null, ar: null, seal: null }, fix: ['apply', 'calendar', 'trash'] },
  order: { tools: { seal: [226, 414], q2: null, q5: null, q10: null }, fix: ['order', 'calendar', 'trash'] },
};
// 個人用テーブルのセット（そのとき開けるものだけを切り替えられる）
const PSETS = [
  { id: 'wash', name: '内職：容器の洗浄', open: () => S.phase === 'business' },
  { id: 'order', name: '注文書を書く', open: () => S.phase === 'night' },
];
const PAPER = { quest: [196, 262], card: [214, 118], apply: [196, 282], pform: [196, 282], order: [196, 318] };
const BOOK = { roster: [140, 190], manual: [212, 392] };
const SMALL_DESC = {
  gel: '回復ジェル（ギルド支給品）。負傷した人に渡す',
  elixir: '霊薬（ギルド支給品）。幽霊になった人に渡す',
  whale: 'クジラ酒（ギルド支給品）。火傷した人に渡す',
  candy: '陽飴（ギルド支給品）。凍えた人に渡す',
  bband: '黒包帯（ギルド支給品）。麻痺した人に渡す',
  neut: '中和剤（ギルド支給品）。毒を受けた人に渡す',
  tags: '「ギルド支給品」タグの束。持ったまま品を左クリックで付け、右クリックで外す',
};
const EQS = [
  { id: 'shelf', name: '物品棚' },
  { id: 'stock', name: '在庫棚' },
  { id: 'bag', name: '鞄' },
  { id: 'mail', name: '郵便物入れ' },
];

/* ================= 状態 ================= */
const S = {
  day: 1, clock: CFG.OPEN, phase: 'title', paused: false, gold: CFG.START_GOLD,
  shelf: [], stock: [], foot: [], pending: [],
  bag: { manual: true, tags: true }, manualFlip: 0,
  quests: [], returnQueue: [],
  tables: Array.from({ length: CFG.SLOTS }, (_, i) => ({ i, state: 'empty', party: null, objs: [], until: 0, enter: false })),
  selected: 0, hand: null, eq: 0, stats: null, seq: 1, z: 1, rt: 0, nextArrival: CFG.OPEN + 8,
  view: 'table', pset: 'wash',
  ptab: { order: { i: 'order', state: 'empty', party: null, objs: [], kit: 'order' }, wash: { i: 'wash', state: 'empty', party: null, objs: [], kit: 'none' } },
  wash: null,
};
const personal = () => S.view === 'personal';
const tbl = () => personal() ? S.ptab[S.pset] : S.tables[S.selected];
const openSets = () => PSETS.filter(p => p.open());
// 個人用テーブルで今開いているセット（開けるものがなければ null）
const curSet = () => { if (!personal()) return null; const a = openSets(); return a.find(p => p.id === S.pset) ? S.pset : null; };
function newStats() {
  return { visitors: 0, approved: 0, rejected: 0, recMiss: 0, returned: 0, retMiss: 0, lost: 0, incomeHQ: 0, incomeOwner: 0, used: Object.fromEntries(V2.ITEMS.map(k => [k, 0])), closedAway: 0, orderCost: 0, incomeSide: 0, washBoxes: 0 };
}
const today = () => calFrom(calOrd(CAL.START) + S.day - 1);
const todayOrd = () => calOrd(CAL.START) + S.day - 1;
const busy = () => S.phase === 'business' || S.phase === 'afterhours';

/* ================= 棚・在庫 ================= */
function makeShelf(stock) {
  const sh = Array(V2.SHELF_MAX).fill(null); let i = 0;
  for (const k of V2.ITEMS) for (let n = 0; n < (stock[k] || 0); n++) sh[i++] = k;
  return sh;
}
function shelfPut(kind) { const i = S.shelf.indexOf(null); if (i < 0) return false; S.shelf[i] = kind; return true; }
const shelfCount = () => S.shelf.filter(Boolean).length;
const PACK_OF = { 2: 'pouch', 5: 'crate_s', 10: 'crate_l' };

/* ================= テーブル上の物 ================= */
// cls: paper / book / small / tool。personal（個人書類）・util（ユーティリティ）・tray（用紙入れから出した用紙）
function addObj(t, o) { o.id = S.seq++; if (o.cls === 'paper' || o.cls === 'book') o.z = S.z++; t.objs.push(o); return o; }
function makeTools(t) {
  for (const [k, h] of Object.entries(TABLE_KIT[t.kit].tools)) { const [x, y] = h || TOOL_DEF[k].home; addObj(t, { cls: 'tool', tool: k, x, y, home: [x, y], face: 'approve' }); }
}
const kitFix = t => (TABLE_KIT[t.kit] || { fix: [] }).fix;
const objW = o => o.cls === 'small' || o.cls === 'tool' ? SM : o.cls === 'book' ? BOOK[o.book][0] * 2 : PAPER[o.doc][0];
const objH = o => o.cls === 'small' || o.cls === 'tool' ? SM : o.cls === 'book' ? BOOK[o.book][1] : PAPER[o.doc][1];
const rectOf = o => ({ x: o.x, y: o.y, w: objW(o), h: objH(o) });
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
function obstacles(t, except) {
  const r = t.objs.filter(o => (o.cls === 'small' || o.cls === 'tool') && !o.held && o !== except).map(rectOf);
  for (const k of kitFix(t)) { const f = FIX[k]; r.push({ x: f.x, y: f.y, w: f.w, h: f.h }); }
  return r;
}
// 小物・道具は重ならないように置き直す
function settle(t, o) {
  const obs = obstacles(t, o);
  const fits = (x, y) => x >= 0 && y >= HANDOVER_H && x + SM <= TW && y + SM <= TH && !obs.some(r => overlap({ x, y, w: SM, h: SM }, r));
  const x0 = clamp(o.x, 0, TW - SM), y0 = clamp(o.y, HANDOVER_H, TH - SM);
  if (fits(x0, y0)) { o.x = x0; o.y = y0; return; }
  for (let rr = 8; rr < 600; rr += 8) {
    for (let a = 0; a < 16; a++) {
      const x = x0 + Math.round(Math.cos(a / 16 * Math.PI * 2) * rr), y = y0 + Math.round(Math.sin(a / 16 * Math.PI * 2) * rr);
      if (fits(x, y)) { o.x = x; o.y = y; return; }
    }
  }
  o.x = x0; o.y = y0;
}
// 紙・本を出すときの、なるべく空いている位置
function freeSpot(t, w, h) {
  let best = null, bs = 1e9;
  for (let k = 0; k < 40; k++) {
    const x = randi(10, TW - w - 10), y = randi(HANDOVER_H + 4, Math.max(HANDOVER_H + 4, 392 - h));
    const r = { x, y, w, h };
    let s = 0;
    for (const o of tbl().objs) if (!o.held && overlap(r, rectOf(o))) s += 1;
    if (s < bs) { bs = s; best = r; }
  }
  return best;
}
function smallSpot(t) { const o = { x: randi(40, TW - 100), y: randi(60, 330) }; return o; }
function bringFront(o) { if (o.cls === 'paper' || o.cls === 'book') o.z = S.z++; }

/* ================= 手 ================= */
function pickUp(o) { S.hand = o; o.held = true; SFX.grab(); dirty(); }
function releaseTool(o) {
  const hm = o.home || TOOL_DEF[o.tool].home; o.held = false; o.x = hm[0]; o.y = hm[1];
  if (S.hand === o) S.hand = null;
  const t = tbl();
  for (const s of t.objs) if (s.cls === 'small' && !s.held && overlap(rectOf(s), rectOf(o))) settle(t, s);
  SFX.soft(); dirty();
}
function placeSmall(o, x, y) { o.held = false; o.x = x - SM / 2; o.y = y - SM / 2; settle(tbl(), o); if (S.hand === o) S.hand = null; SFX.soft(); dirty(); }
function dropHand() {
  const h = S.hand; if (!h) return;
  if (h.cls === 'tool') releaseTool(h);
  else putAwaySmall(h);
}

/* ================= しまう ================= */
function putAwaySmall(o, switchEq = true) {
  const t = tbl();
  if (o.sub === 'item') {
    if (!shelfPut(o.item)) { toast('物品棚に空きがありません', 'bad'); if (S.hand === o) { placeSmall(o, 400, 200); } return false; }
    if (switchEq) setEq('shelf');
  } else if (o.sub === 'tags') { S.bag.tags = true; if (switchEq) setEq('bag'); }
  t.objs = t.objs.filter(x => x !== o);
  if (S.hand === o) S.hand = null;
  SFX.soft(); dirty(); return true;
}
function putAwayBook(o, switchEq = true) {
  const t = tbl();
  if (o.book === 'manual') { S.bag.manual = true; S.manualFlip = o.flip; t.objs = t.objs.filter(x => x !== o); if (switchEq) setEq('bag'); SFX.paper(); dirty(); return true; }
  return false;
}
// テーブルを移るとき：ユーティリティはしまわれ、道具は所定の位置へ戻る
function stowUtilities(t) {
  if (S.hand) { const h = S.hand; if (h.cls === 'tool') releaseTool(h); else { h.held = false; } S.hand = null; }
  for (const o of t.objs.slice()) {
    if (!o.util) continue;
    if (o.cls === 'small') { if (o.sub === 'item') { if (shelfPut(o.item)) t.objs = t.objs.filter(x => x !== o); } else { S.bag.tags = true; t.objs = t.objs.filter(x => x !== o); } }
    else if (o.cls === 'book' && o.book === 'manual') { S.bag.manual = true; S.manualFlip = o.flip; t.objs = t.objs.filter(x => x !== o); }
  }
}
function selectTable(i) {
  if (i === S.selected && !personal()) return;
  stowUtilities(tbl()); cancelWashDrag();
  S.view = 'table'; S.selected = i; SFX.click(); dirty();
}
// 受付嬢の絵をクリック：個人用テーブルを開く
function openPersonal() {
  if (S.phase === 'title' || S.phase === 'report' || S.paused) return;
  if (personal()) return;
  stowUtilities(tbl());
  S.view = 'personal'; fixPset(); SFX.click(); dirty();
}
function fixPset() { const a = openSets(); if (a.length && !a.find(p => p.id === S.pset)) S.pset = a[0].id; }
function stepSet(d) {
  const a = openSets(); if (a.length < 2) return;
  stowUtilities(tbl()); cancelWashDrag();
  const i = a.findIndex(p => p.id === S.pset);
  S.pset = a[(i + d + a.length) % a.length].id; SFX.click(); dirty();
}

/* ================= 属性（v1 の規則） ================= */
const beats = (a, b) => !!(BEATS[a] && BEATS[a].includes(b));
const memberAttr = m => FAITH_ATTR[m.faith] || null;
// 外部属性：討伐なら魔物の属性、探索・護衛なら場所の環境の属性
function extAttr(q) {
  if (!q.place) return null;
  return q.type === '討伐' ? (q.monster ? q.monster.attr : null) : ENVS[q.place.env].attr;
}
// 内部属性どうしで属性相性が生じている組 [有利側, 不利側]
function attrPairs(members) {
  const at = members.map(memberAttr).filter(Boolean), out = [];
  for (let i = 0; i < at.length; i++) for (let j = i + 1; j < at.length; j++) {
    if (beats(at[i], at[j])) out.push([at[i], at[j]]);
    if (beats(at[j], at[i])) out.push([at[j], at[i]]);
  }
  return out;
}
function attrDanger(members, E) {
  if (!E) return false;
  const at = members.map(memberAttr).filter(Boolean);
  if (E === '光') return !at.includes('闇');
  if (E === '闇') return !at.includes('光');
  if (E === '風') return attrPairs(members).length > 0;
  return !(at.filter(a => beats(a, E)).length > at.filter(a => beats(E, a)).length);
}
// 帰還時に掛かる可能性のある状態異常（場所の環境・魔物の属性・風の外部属性での属性相性）
function ailCandidates(p) {
  const q = p.quest; if (!q.place) return [];
  const set = new Set(ENVS[q.place.env].ail);
  if (q.monster && ATTR_AIL[q.monster.attr]) set.add(ATTR_AIL[q.monster.attr]);
  if (extAttr(q) === '風') for (const [a] of attrPairs(p.members)) if (ATTR_AIL[a]) set.add(ATTR_AIL[a]);
  return [...set];
}
const AIL_TINT = { burn: 'rgba(255,110,50,0.16)', chill: 'rgba(140,200,255,0.38)', para: 'rgba(255,230,70,0.18)', poison: 'rgba(140,70,190,0.32)' };

/* ================= パーティの生成と判定 ================= */
function evaluateCore(members, quest) {
  const d = rankIdx(quest.diff);
  const good = m => JOB_STRONG[m.job] === quest.type;
  const high = m => rankIdx(m.rank) >= d;
  const n = members.length;
  return {
    comp: !(members.some(m => good(m) && high(m)) || members.filter(m => good(m) || high(m)).length >= 3),
    short: (quest.diff === 'A' && n <= 2) || (quest.diff === 'S' && n <= 3),
    attr: attrDanger(members, extAttr(quest)),
  };
}
const DANGERS = ['comp', 'short', 'attr'];
const dangerCount = ev => DANGERS.filter(k => ev[k]).length;
const categoryOf = ev => { const pr = DANGERS.filter(k => ev[k]); return pr.length === 0 ? 'fit' : pr.length >= 2 ? 'multi' : pr[0]; };

/* ---------- クエストの中身：場所 → 魔物 → 素材 → 概要 → 依頼者・題・絵（v2/js/world2.js） ---------- */
const monstersAt = (pl, diff) => MONSTERS2.filter(m => m[2].includes(diff) && m[3].some(t => pl.tags.includes(t)));
const nearOf = (pl, table) => pl.near.flatMap(n => table[n] || []);
const ZONE_W = { low: { C: 4, B: 3, A: 1.5, S: 0.6 }, high: { C: 0.6, B: 1.5, A: 3, S: 4 }, safe: { C: 1, B: 1, A: 1, S: 1 } };
const pickW = (arr, w) => { let r = Math.random() * arr.reduce((a, x) => a + w(x), 0); for (const x of arr) { r -= w(x); if (r <= 0) return x; } return arr[arr.length - 1]; };
function genQuest(type, diff, hours) {
  for (let tries = 0; tries < 60; tries++) {
    const [tpl, zone] = pick(QUEST_PHRASES2[type]);
    const need = k => tpl.includes('{' + k + '}');
    const cands = PLACES.filter(pl => {
      if (zone ? pl.zone !== zone : (need('p') && pl.zone === 'safe')) return false;
      const ms = monstersAt(pl, diff);
      if (type === '討伐' && !ms.length) return false;
      if (need('mat') && !ms.some(m => m[4])) return false;
      if (need('nat') && !(pl.nat && pl.nat.length)) return false;
      if (need('pet') && !nearOf(pl, PETS2).length) return false;
      if (need('who') && !nearOf(pl, WHO2).length) return false;
      return true;
    });
    if (!cands.length) continue;
    // 場所
    const pl = pickW(cands, x => ZONE_W[x.zone][diff]);
    const n = pick(PLACE_NAMES);
    const place = { name: pl.fmt ? pl.fmt.replace('{n}', n) : n + pick(pl.t), env: pl.env, zone: pl.zone, desc: pick(pl.desc || PLACE_BY_ENV[pl.env][1]) };
    // 魔物（その場所に棲み、難易度に合うもの。安全管理区域にはいない）
    const pool = monstersAt(pl, diff).filter(m => !need('mat') || m[4]);
    // 属性のない魔物や、どこにでもいる魔物ばかりにならないように重みを付ける
    const mo = pool.length ? pickW(pool, m => (m[1] ? 1 : 0.45) * (m[3].length > 4 ? 0.4 : 1)) : null;
    const flock = mo && isFlock(mo[0]);
    const monster = mo ? {
      name: mo[0], attr: mo[1],
      traits: shuffle(MONSTER_TRAITS2.filter(([, c]) => !c || (c === 'flock' ? flock : c === 'single' ? !flock : true))).slice(0, 2).map(x => x[0]),
      damage: pick(MONSTER_DAMAGE2.filter(([, c]) => !c || pl.near.includes(c)))[0],
    } : null;
    // 概要
    const phrase = tpl.replace(/\{(\w+)\}/g, (_, k) => k === 'm' ? mo[0] : k === 'mat' ? mo[4] : k === 'nat' ? pick(pl.nat) : k === 'pet' ? pick(nearOf(pl, PETS2)) : k === 'who' ? pick(nearOf(pl, WHO2)) : place.name);
    // 依頼者・題・絵
    const rqPool = Math.random() < 0.2 ? REQUESTERS2.any : nearOf(pl, REQUESTERS2);
    const rq = pick(rqPool.length ? rqPool : REQUESTERS2.any);
    const ctx = { near: pl.near, monster, zone: pl.zone, kind: need('nat') ? 'nat' : need('pet') ? 'pet' : need('p') && !zone ? 'place' : '' };
    const titleOk = list => list.filter(([, c]) => !c || c(ctx));
    let titles = titleOk(Math.random() < 0.4 ? QUEST_TITLES3.共通 : QUEST_TITLES3[type]);
    if (!titles.length) titles = titleOk(QUEST_TITLES3.共通);
    return {
      type, diff, hours, phrase, title: pick(titles)[0],
      requester: rq[0].replace('{n}', n), sig: rq[1].replace('{n}', n),
      pic: 2 * pick(pl.sc) + randi(0, 1), monster, place,
    };
  }
  return null;
}
function genParty() {
  const used = new Set();
  for (const t of S.tables) if (t.party) t.party.members.forEach(m => used.add(m.gid));
  for (const p of S.quests.concat(S.returnQueue)) p.members.forEach(m => used.add(m.gid));
  const pool = [...Array(META.chars.length).keys()].filter(g => !used.has(g));
  const target = weighted(V2.CATEGORY_WEIGHT);
  const maxH = clamp(Math.floor((CFG.CLOSE - S.clock) / 60), 1, 5);
  let best = null;
  for (let t = 0; t < 600; t++) {
    const n = Math.min(pool.length, +weighted({ 1: 10, 2: 28, 3: 36, 4: 26 }));
    const base = +weighted({ 0: 34, 1: 30, 2: 23, 3: 13 });
    const members = shuffle(pool).slice(0, n).map(gid => {
      const job = Math.random() < LOOK_MATCH_RATE ? LOOK_JOB[META.chars[gid].look] : pick(JOBS);
      const r = clamp(base - (Math.random() < 0.35 ? 1 : 0) + (Math.random() < 0.1 ? 1 : 0), 0, 3);
      return { gid, job, rank: RANKS[r], faith: weighted(FAITH_WEIGHT), status: 'ok', ail: null, name: '' };
    });
    const quest = genQuest(pick(QUEST_TYPES), RANKS[clamp(base + +weighted({ '-1': 22, 0: 45, 1: 26, 2: 7 }), 0, 3)], randi(1, maxH));
    if (!quest) continue;
    const ev = evaluateCore(members, quest);
    best = { members, quest, ev };
    if (categoryOf(ev) === target) break;
  }
  const usedNames = new Set();
  for (const m of best.members) { const list = NAMES[META.chars[m.gid].g].filter(x => !usedNames.has(x)); m.name = pick(list); usedNames.add(m.name); }
  // 書類（不備はそれぞれ独立に）
  const T = todayOrd();
  const docs = {
    original: Math.random() < V2.DEFECT.original,
    roster: !(Math.random() < V2.DEFECT.noRoster),
    binding: Math.random() < 0.5 ? 'L' : 'R',
  };
  const noCard = Math.random() < V2.DEFECT.noCard && best.members.length > 1;
  const expired = Math.random() < V2.DEFECT.expired;
  const missingIdx = noCard ? randi(0, best.members.length - 1) : -1;
  const expIdx = expired ? randi(0, best.members.length - 1) : -1;
  best.members.forEach((m, i) => {
    m.card = i !== missingIdx;
    const near = Math.random() < 0.35;
    m.expiry = i === expIdx ? T - (near ? randi(1, 40) : randi(41, 400)) : T + (near ? randi(0, 40) : randi(41, 600));
  });
  if (!docs.roster && best.members.every(m => !m.card)) best.members[0].card = true; // 何も手がかりがない状態は避ける
  return {
    id: S.seq++, members: best.members, quest: best.quest, ev: best.ev, docs,
    name: best.members[0].name + 'のパーティ', bubble: null, form: null, mistakes: 0,
  };
}
const hasDocDefect = p => p.docs.original || !p.docs.roster || p.members.some(m => !m.card) || p.members.some(m => m.card && m.expiry < todayOrd());
// 書類から分かる範囲で却下事項を判定する：must（必ずチェック）／may（判断できないので、どちらでもよい）
function knowable(p) {
  const known = p.members.map(m => p.docs.roster || m.card);
  const res = { must: new Set(), may: new Set() };
  if (hasDocDefect(p)) res.must.add('docs');
  if (p.ev.short) res.must.add('short');
  // 信仰はパーティ名簿にしか書かれない。名簿がなければ、外部属性があるときは判断できない
  if (p.docs.roster) { if (p.ev.attr) res.must.add('attr'); }
  else if (extAttr(p.quest)) res.may.add('attr');
  if (known.every(Boolean)) { if (p.ev.comp) res.must.add('comp'); }
  else {
    // 分からない人を「最も有利」「最も不利」に置いて結果が変わるか
    const q = p.quest, d = rankIdx(q.diff);
    const best = p.members.map((m, i) => known[i] ? m : { job: Object.keys(JOB_STRONG).find(j => JOB_STRONG[j] === q.type), rank: 'S' });
    const worst = p.members.map((m, i) => known[i] ? m : { job: '__', rank: 'C' });
    const cBest = evaluateCore(best, q).comp, cWorst = evaluateCore(worst, q).comp;
    if (cBest) res.must.add('comp'); else if (cWorst) res.may.add('comp');
    void d;
  }
  return res;
}

/* ================= 来訪・進行 ================= */
function say(p, lines, sec) { p.bubble = { text: pick(lines), until: sec == null ? Infinity : S.rt + sec }; }
const bubbleText = p => p && p.bubble && S.rt < p.bubble.until ? p.bubble.text : '';
function lay(t, p) {
  // 個人書類をテーブルに広げる（少し重なるくらいに散らす）
  const qx = randi(20, 300), qy = randi(26, 110);
  addObj(t, { cls: 'paper', doc: 'quest', personal: true, hasBack: !!p.quest.place, x: qx, y: qy, data: { ...p.quest, original: p.docs.original, signed: false } });
  if (p.docs.roster) {
    const sides = rosterSides(p);
    addObj(t, { cls: 'book', book: 'roster', personal: true, binding: p.docs.binding, flip: 0, x: randi(260, 480), y: randi(40, 180), sides, partyName: p.name });
  }
  shuffle(p.members).forEach((m, k) => {
    if (!m.card) return;
    addObj(t, { cls: 'paper', doc: 'card', personal: true, x: randi(380, 570) + k * 8, y: randi(50, 240) + k * 14, data: { gid: m.gid, name: m.name, job: m.job, rank: m.rank, expiry: m.expiry } });
  });
}
function attrBadge(text, attr) {
  const c = ATTR_COLOR[attr] || ['#d8ccb4', '#2a1c14'];
  return `<span class="abadge" style="background:${c[0]};color:${c[1]}">${text}</span>`;
}
const faithBadge = f => f ? attrBadge(f, FAITH_ATTR[f]) : '—';
function rosterSides(p) {
  const sides = [{ cover: true, html: `<div class="r-cover"><div class="r-t">パーティ名簿</div><div class="r-n">${p.name}</div></div>` },
    { html: '<div class="r-note">ギルド運営本部 発行<br>記載は1ページにつき1名</div>' }];
  for (const m of shuffle(p.members)) sides.push({ html: `<div class="r-page"><div class="r-k">名前</div><div class="r-v">${m.name}</div><div class="r-k">職業</div><div class="r-v">${m.job}</div><div class="r-k">ランク</div><div class="r-v big">${m.rank}</div><div class="r-k">信仰</div><div class="r-v">${faithBadge(m.faith)}</div></div>` });
  if (sides.length % 2 === 1) sides.push({ html: '' });
  sides.push({ html: '' }, { cover: true, back: true, html: '<div class="r-cover back"></div>' });
  if (sides.length % 2 === 1) sides.splice(sides.length - 1, 0, { html: '' });
  return sides;
}
function spawnParty(t) {
  const p = genParty();
  t.party = p; t.state = 'reception'; t.enter = true;
  lay(t, p);
  say(p, V2_LINES.arrive);
  S.stats.visitors++;
  toast(`テーブル${t.i + 1}：${p.name}が受注の申請に来ました`); SFX.bell();
}
function seatReturn(t, p) {
  t.party = p; t.state = 'returned'; t.enter = true; p.returned = true;
  if (!p.retDocs.noCopy) addObj(t, { cls: 'paper', doc: 'quest', personal: true, hasBack: !!p.quest.place, x: randi(20, 260), y: randi(26, 120), data: { ...p.quest, original: false, signed: true } });
  if (!p.retDocs.noForm) addObj(t, { cls: 'paper', doc: 'pform', personal: true, x: randi(240, 520), y: randi(26, 140), data: { checks: { ...p.form.checks }, stamps: p.form.stamps.map(s => ({ ...s })) } });
  say(p, V2_LINES.returnOk, 4);
  S.stats.returned++;
  toast(`テーブル${t.i + 1}：${p.name}が帰還しました`); SFX.back();
}
function clearPersonal(t) {
  const pid = t.party ? t.party.id : -1;
  t.objs = t.objs.filter(o => !o.personal && !(o.tray === 'apply' && o.boundTo === pid));
}
function leave(t, lines, extra) {
  t.state = 'leaving'; t.until = S.rt + CFG.LEAVE_SEC + (extra || 0); t.fadeAt = S.rt;
  if (lines) say(t.party, lines, CFG.LEAVE_SEC + (extra || 0));
}
function freeTable(t) { t.state = 'empty'; t.party = null; }

/* ---------- 受注対応を終える ---------- */
function finishReception(t, form) {
  const p = t.party;
  const k = knowable(p);
  const checks = new Set(Object.keys(form.data.checks).filter(c => form.data.checks[c]));
  const decision = form.data.stamps.find(s => s.t === 'approve' || s.t === 'reject').t;
  const shouldReject = k.must.size > 0;
  const miss = [];
  if (decision === 'approve' && shouldReject) miss.push('誤った認可（却下事項：' + [...k.must].map(id => V2_REASONS.find(r => r.id === id).label).join('・') + '）');
  if (decision === 'reject' && !shouldReject) miss.push('誤った却下（却下事項はありませんでした）');
  if (decision === 'reject' && shouldReject) {
    const okSet = [...checks].every(c => k.must.has(c) || k.may.has(c)) && [...k.must].every(c => checks.has(c));
    if (!okSet) miss.push('却下事項のチェック違い（正しくは：' + [...k.must].map(id => V2_REASONS.find(r => r.id === id).label).join('・') + (k.may.size ? '／判断できないもの：' + [...k.may].map(id => V2_REASONS.find(r => r.id === id).label).join('・') : '') + '）');
  }
  p.mistakes += miss.length;
  t.objs = t.objs.filter(o => o !== form);
  for (const m of miss) toast(`テーブル${t.i + 1}：${m}`, 'bad');
  if (miss.length) clerkFace('sad', 1.4);
  S.stats.recMiss += miss.length;
  if (decision === 'approve') {
    S.stats.approved++;
    p.form = { checks: { ...form.data.checks }, stamps: form.data.stamps.map(s => ({ ...s })) };
    // 結果（危険に関わる却下事項だけで決まる）
    const danger = dangerCount(p.ev);
    const n = p.members.length;
    if (danger === 0) for (const m of p.members) m.status = Math.random() < CFG.HURT_RATE_FIT ? 'hurt' : 'ok';
    else if (danger === 1) {
      const kk = n >= 2 ? randi(1, Math.min(3, n - 1)) : 0;
      const g = new Set(shuffle(p.members).slice(0, kk));
      for (const m of p.members) m.status = g.has(m) ? 'ghost' : (Math.random() < CFG.HURT_RATE_UNFIT ? 'hurt' : 'ok');
    }
    p.lost = danger >= 2;
    // 状態異常：生き残った人は、候補から等しい確率で1つ掛かることがある（幽霊は掛からない）
    const cands = ailCandidates(p), rate = danger === 0 ? CFG.AIL_RATE_FIT : CFG.AIL_RATE_UNFIT;
    for (const m of p.members) m.ail = (m.status !== 'ghost' && cands.length && Math.random() < rate) ? pick(cands) : null;
    p.returnAt = S.clock + p.quest.hours * 60;
    p.retDocs = { noCopy: Math.random() < V2.RETURN_DEFECT.noCopy, noForm: Math.random() < V2.RETURN_DEFECT.noForm };
    if (p.lost) S.stats.lost++; else S.quests.push(p);
    leave(t, V2_LINES.approve);
  } else {
    S.stats.rejected++;
    if (!miss.length) clerkFace('happy', 1.6);
    if (shouldReject) {
      const g = Math.round(CFG.REJECT_FEE * Math.max(0, 1 - CFG.MISTAKE_CUT * p.mistakes));
      earn(g, 0);
      if (g) toast(`テーブル${t.i + 1}：却下の手数料 +${g}G（運営本部）`, 'good');
    }
    leave(t, shouldReject ? (miss.length ? V2_LINES.rejectReason : V2_LINES.rejectOk) : V2_LINES.rejectWrong);
  }
  SFX.paper(); dirty();
}

/* ---------- 終了対応を終える ---------- */
function requiredItems(p) {
  const need = Object.fromEntries(V2.ITEMS.map(k => [k, 0]));
  for (const m of p.members) {
    if (m.status === 'hurt') need.gel++;
    if (m.status === 'ghost') need.elixir++;
    if (m.ail) need[AIL_ITEM[m.ail]]++;
  }
  return need;
}
function finishReturn(t, form) {
  const p = t.party;
  const items = t.objs.filter(o => o.cls === 'small' && o.sub === 'item' && !o.held);
  const need = requiredItems(p);
  const got = Object.fromEntries(V2.ITEMS.map(k => [k, items.filter(o => o.item === k).length]));
  const miss = [];
  if (V2.ITEMS.some(k => need[k] !== got[k])) miss.push('渡す数が不適切');
  if (items.some(o => !o.tagged)) miss.push('タグの付け忘れ');
  const copy = t.objs.find(o => o.personal && o.doc === 'quest');
  if (copy && !copy.data.stamps?.some(s => s.t === 'seal')) miss.push('写しへの承認印の押し忘れ');
  p.mistakes += miss.length;
  S.stats.retMiss += miss.length;
  for (const k of V2.ITEMS) S.stats.used[k] += got[k];
  t.objs = t.objs.filter(o => !items.includes(o) && o !== form);
  for (const m of miss) toast(`テーブル${t.i + 1}：手当のミス：${m}`, 'bad');
  if (miss.length) clerkFace('sad', 1.4); else if (!p.mistakes) clerkFace('happy', 1.6);
  const mult = Math.max(0, 1 - CFG.MISTAKE_CUT * p.mistakes);
  const hq = Math.round(CFG.HQ_REWARD[p.quest.diff] * mult);
  const ow = Math.round((CFG.OWNER_REWARD[p.quest.diff] + CFG.OWNER_PER_HOUR * p.quest.hours) * mult);
  earn(hq, ow);
  toast(`テーブル${t.i + 1}：報酬 +${hq + ow}G（運営本部 ${hq}G・依頼主 ${ow}G）`, 'good');
  leave(t, V2_LINES.thanks, 0.4);
  SFX.paper(); dirty();
}
function earn(hq, ow) { S.gold += hq + ow; S.stats.incomeHQ += hq; S.stats.incomeOwner += ow; if (hq + ow > 0) SFX.coin(); }

/* ================= 進行 ================= */
function update(dt) {
  S.rt += dt;
  for (const t of S.tables) if (t.state === 'leaving' && S.rt >= t.until) { clearPersonal(t); freeTable(t); dirty(); }
  if (S.phase === 'business') {
    S.clock += dt * CFG.MIN_PER_SEC;
    if (S.clock >= CFG.CLOSE) closeBusiness();
  }
  // クエストから戻ったパーティは待ち行列へ
  for (const p of S.quests.slice()) if (S.clock >= p.returnAt && p.returnAt <= CFG.CLOSE) { S.quests = S.quests.filter(x => x !== p); S.returnQueue.push(p); }
  // 空いたテーブル：帰還を優先
  if (busy()) {
    for (const t of S.tables) {
      if (t.state !== 'empty') continue;
      if (S.returnQueue.length) { seatReturn(t, S.returnQueue.shift()); dirty(); continue; }
      if (S.phase === 'business' && S.clock <= CFG.CLOSE - 60 && S.clock >= S.nextArrival) {
        spawnParty(t); S.nextArrival = S.clock + rand(CFG.ARRIVAL_GAP[0], CFG.ARRIVAL_GAP[1]) / OPT.visit; dirty();
      }
    }
  }
  if (S.phase === 'afterhours' && !S.tables.some(t => t.state === 'returned' || t.state === 'leaving')) endDay();
}
function closeBusiness() {
  S.clock = CFG.CLOSE; S.phase = 'afterhours';
  for (const t of S.tables) if (t.state === 'reception') { S.stats.closedAway++; leave(t, V2_LINES.closed); }
  toast('営業終了。帰還したパーティの対応を終えるまで受付は続きます');
  SFX.close(); showScene('営業終了', ''); dirty();
}
function endDay() { S.phase = 'report'; dropHand(); showReport(); SFX.fanfare(); dirty(); }
function startDay() {
  S.clock = CFG.OPEN; S.phase = 'business'; S.stats = newStats();
  S.nextArrival = CFG.OPEN + rand(4, 10) / OPT.visit;
  // 前日からクエスト中で、閉店後に戻る予定だったパーティ
  for (const p of S.quests.slice()) if (p.returnAt > CFG.CLOSE - 1e-9 || p.returnAt <= S.clock) { S.quests = S.quests.filter(x => x !== p); S.returnQueue.push(p); }
  toast(`${S.day}日目の営業を開始します`); SFX.open(); showScene(`${S.day}日目　営業開始`, '6:00'); dirty();
}
function toMorning() {
  S.phase = 'morning'; S.clock = CFG.OPEN - 10;
  let n = 0;
  for (const b of S.pending) { if (S.stock.length < V2.STOCK_MAX) { S.stock.push({ kind: b.kind, n: b.n, left: b.n }); n++; } }
  S.pending = [];
  // 前日の閉店後に戻る予定のパーティは、開店と同時に戻る
  for (const p of S.quests) p.returnAt = Math.min(p.returnAt, CFG.OPEN);
  showScene(`${S.day}日目　早朝`, n ? `${n}箱届きました（在庫棚）` : '');
  toast(n ? `${S.day}日目の朝。注文した支給品が${n}箱、在庫棚に届いています` : `${S.day}日目の朝。届いた荷物はありません`);
  dirty();
}
function toNight() { S.phase = 'night'; S.clock = CFG.CLOSE + 10; $('#reportOv').hidden = true; SFX.night(); showScene('深夜', '明日の準備をして休みます'); dirty(); }
function nextDay() {
  if (S.phase !== 'night') return;
  stowUtilities(tbl());
  S.ptab.order.objs = S.ptab.order.objs.filter(o => o.doc !== 'order'); // 出したままの注文用紙は片付ける
  S.day++; save(); toMorning();
}

/* ================= 注文 ================= */
function sendOrder(form) {
  const rows = form.data.qty;
  const kinds = V2.ITEMS.filter(k => rows[k]);
  if (!kinds.length) { toast('注文用紙に数量が押されていません', 'bad'); return false; }
  const boxesAfter = S.stock.length + S.pending.length + kinds.length;
  if (boxesAfter > V2.STOCK_MAX) { toast(`在庫棚に置ける箱は${V2.STOCK_MAX}個までです（在庫棚 ${S.stock.length}箱・届く予定 ${S.pending.length}箱）`, 'bad'); return false; }
  const cost = kinds.reduce((a, k) => a + rows[k] * CFG.PRICE[k], 0);
  if (cost > S.gold) { toast(`支店運営費が足りません（必要 ${cost}G／残り ${S.gold}G）`, 'bad'); return false; }
  S.gold -= cost; S.stats.orderCost += cost;
  for (const k of kinds) S.pending.push({ kind: k, n: rows[k] });
  tbl().objs = tbl().objs.filter(o => o !== form);
  toast(`注文用紙を道具屋へ送りました（${cost}G）。翌朝、在庫棚に届きます`, 'good');
  SFX.paper(); SFX.coin(); dirty();
  return true;
}

/* ================= セーブ ================= */
const SAVE_KEY = 'guild-clerk-work-v2';
function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, day: S.day, gold: S.gold, shelf: S.shelf, stock: S.stock, foot: S.foot, pending: S.pending, quests: S.quests.concat(S.returnQueue), seq: S.seq, manualFlip: S.manualFlip, wash: S.wash }));
  } catch (e) { /* noop */ }
}
function loadSave() { try { const d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); return d && d.v === 1 ? d : null; } catch (e) { return null; } }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* noop */ } }
function reset() {
  Object.assign(S, { day: 1, gold: CFG.START_GOLD, shelf: makeShelf(V2.START_STOCK), stock: [], foot: [], pending: [], bag: { manual: true, tags: true }, manualFlip: 0, quests: [], returnQueue: [], selected: 0, hand: null, eq: 0, stats: newStats(), seq: 1, view: 'table', pset: 'wash', wash: newWash() });
  for (const t of S.tables) { t.state = 'empty'; t.party = null; t.objs = []; t.kit = 'normal'; makeTools(t); }
  S.ptab.order.objs = []; makeTools(S.ptab.order);
}
function applySave(d) {
  reset();
  Object.assign(S, { day: d.day, gold: d.gold, shelf: d.shelf, stock: d.stock || [], foot: d.foot || [], pending: d.pending || [], quests: d.quests || [], seq: d.seq || 1, manualFlip: d.manualFlip || 0, wash: d.wash && d.wash.rack ? d.wash : newWash() });
}

/* ================= 画面：テーブル ================= */
let isDirty = true;
function dirty() { isDirty = true; }
function sprite(gid, status, scale, ail) {
  const { w, h, cols } = META;
  const c = el('canvas', 'px'); c.width = w * scale; c.height = h * scale;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  const sx = (gid % cols) * w, sy = Math.floor(gid / cols) * h;
  if (status === 'ghost') {
    const o = document.createElement('canvas'); o.width = w; o.height = h; const ox = o.getContext('2d');
    ox.drawImage(IMGS.adv, sx, sy, w, 25, 0, 0, w, 25);
    ox.fillStyle = '#e8f2ff'; for (const [y, x0, x1] of [[25, 8, 15], [26, 8, 15], [27, 9, 14], [28, 10, 14], [29, 11, 14], [30, 12, 14], [31, 13, 14]]) ox.fillRect(x0, y, x1 - x0 + 1, 1);
    ox.globalCompositeOperation = 'source-atop'; ox.fillStyle = 'rgba(150,195,255,0.55)'; ox.fillRect(0, 0, w, h);
    x.globalAlpha = 0.85; x.drawImage(o, 0, 0, w * scale, h * scale); c.classList.add('ghost-float');
  } else {
    const o = document.createElement('canvas'); o.width = w; o.height = h; const ox = o.getContext('2d');
    ox.drawImage(IMGS.adv, sx, sy, w, h, 0, 0, w, h);
    if (status === 'hurt') ox.drawImage(IMGS.bandage, 0, 0);
    if (ail) {
      ox.globalCompositeOperation = 'source-atop'; ox.fillStyle = AIL_TINT[ail]; ox.fillRect(0, 0, w, h);
      ox.globalCompositeOperation = 'source-over'; ox.drawImage(IMGS['ail_' + ail], 0, 0);
    }
    x.drawImage(o, 0, 0, w * scale, h * scale);
    if (ail === 'para') c.classList.add('para-shake');
  }
  return c;
}
function photo(gid) {
  const { w, cols, h } = META;
  const c = el('canvas', 'px photo'); c.width = 60; c.height = 60;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  x.fillStyle = '#c9d6e0'; x.fillRect(0, 0, 60, 60);
  x.drawImage(IMGS.adv, (gid % cols) * w + 2, Math.floor(gid / cols) * h + 1, 20, 20, 0, 0, 60, 60);
  return c;
}
function stampMark(s) {
  const m = el('div', 'smark ' + s.t, s.t === 'approve' ? '認可' : s.t === 'reject' ? '却下' : s.t === 'seal' ? '承認' : String(s.n));
  m.style.left = s.x + 'px'; m.style.top = s.y + 'px';
  return m;
}
function paperEl(o) {
  const e = el('div', 'obj paper doc-' + o.doc + (o.data.original ? ' original' : ''));
  const d = o.data;
  if (o.doc === 'quest' && o.back) {
    e.classList.add('back');
    e.appendChild(el('div', 'q-btitle', `${d.title}（裏面）`));
    const sec = (h, rows) => {
      e.appendChild(el('div', 'q-sec', h));
      for (const [k, v, html] of rows) { const r = el('div', 'q-brow'); r.appendChild(el('span', 'k', k)); const vv = el('span', 'v'); if (html) vv.innerHTML = v; else vv.textContent = v; r.appendChild(vv); e.appendChild(r); }
    };
    const mo = d.monster;
    sec('魔物', mo ? [['名前', mo.name], ['属性', mo.attr ? attrBadge(mo.attr, mo.attr) : 'なし', true], ['特徴', mo.traits.join('、')], ['被害', mo.damage]] : [['', '確認されている魔物はいない']]);
    sec('場所', [['名称', d.place.name], ['環境', d.place.env], ['様子', d.place.desc]]);
    return e;
  }
  if (o.doc === 'quest') {
    e.appendChild(el('div', 'q-title', d.title));
    const im = el('img', 'px q-pic'); im.src = `img/qpic_${String(d.pic).padStart(2, '0')}.png`; e.appendChild(im);
    e.appendChild(el('div', 'q-phrase', d.phrase));
    const row = el('div', 'q-row'); row.appendChild(el('span', '', `難易度 ${d.diff}級`)); row.appendChild(el('span', '', `所要 ${d.hours}時間`)); e.appendChild(row);
    const rq = el('div', 'q-req', '依頼者：' + d.requester); if (o.hasBack) rq.appendChild(el('span', 'q-turn', '裏面あり')); e.appendChild(rq);
    const sig = el('div', 'q-sig'); sig.appendChild(el('span', 'k', '完了時サイン'));
    if (d.signed) sig.appendChild(el('span', 'sig', (d.sig || d.requester) + '〆'));
    e.appendChild(sig);
    if (d.original) e.appendChild(el('div', 'q-orig', '（原本）'));
  } else if (o.doc === 'card') {
    e.appendChild(el('div', 'c-head', '冒険者証　ギルド運営本部'));
    const b = el('div', 'c-body'); b.appendChild(photo(d.gid));
    const info = el('div', 'c-info');
    info.appendChild(el('div', 'c-name', d.name));
    info.appendChild(el('div', '', `職業　${d.job}`));
    info.appendChild(el('div', '', `ランク　${d.rank}`));
    info.appendChild(el('div', 'c-exp', '更新期限 ' + calShort(calFrom(d.expiry))));
    b.appendChild(info); e.appendChild(b);
  } else if (o.doc === 'apply' || o.doc === 'pform') {
    e.appendChild(el('div', 'f-title', '受注申請用紙'));
    e.appendChild(el('div', 'f-sub', '却下事項'));
    for (const r of V2_REASONS) {
      const row = el('div', 'f-reason' + (d.checks[r.id] ? ' on' : '')); row.dataset.reason = r.id;
      row.appendChild(el('span', 'box')); row.appendChild(el('span', '', r.label));
      e.appendChild(row);
    }
    const boxes = el('div', 'f-boxes');
    boxes.appendChild(el('div', 'f-box', '受注対応')); boxes.appendChild(el('div', 'f-box', '終了対応'));
    e.appendChild(boxes);
  } else if (o.doc === 'order') {
    e.appendChild(el('div', 'f-title', '支給品 注文用紙'));
    let total = 0;
    for (const k of V2.ITEMS) {
      const row = el('div', 'o-row');
      const im = el('img', 'px'); im.src = `img/item_${k}.png`; row.appendChild(im);
      row.appendChild(el('span', 'o-name', ITEM_NAME2[k]));
      row.appendChild(el('span', 'o-price', CFG.PRICE[k] + 'G'));
      const slot = el('span', 'o-slot'); slot.dataset.kind = k;
      if (d.qty[k]) { slot.classList.add('done'); slot.textContent = d.qty[k]; total += d.qty[k] * CFG.PRICE[k]; }
      row.appendChild(slot); e.appendChild(row);
    }
    e.appendChild(el('div', 'o-total', `合計 ${total}G`));
    e.appendChild(el('div', 'o-seal', '承認印'));
  }
  for (const s of d.stamps || []) e.appendChild(stampMark(s));
  return e;
}
function bookSides(o) {
  const sides = o.book === 'manual' ? MANUAL : o.sides;
  const L = sides.length / 2, k = o.flip;
  const lb = o.binding === 'L';
  const left = lb ? (k > 0 ? sides[2 * k - 1] : null) : (k < L ? sides[2 * k] : null);
  const right = lb ? (k < L ? sides[2 * k] : null) : (k > 0 ? sides[2 * k - 1] : null);
  return { left, right, L };
}
function bookEl(o) {
  const [pw, ph] = BOOK[o.book];
  const e = el('div', 'obj book book-' + o.book);
  e.style.width = pw * 2 + 'px'; e.style.height = ph + 'px';
  const { left, right } = bookSides(o);
  for (const [side, pg] of [['left', left], ['right', right]]) {
    if (!pg) continue;
    const h = el('div', 'half ' + side + (pg.cover ? ' cover' : ''));
    h.style.width = pw + 'px'; h.style.left = (side === 'left' ? 0 : pw) + 'px';
    h.innerHTML = pg.html;
    e.appendChild(h);
  }
  return e;
}
function smallEl(o) {
  const e = el('div', 'obj small sm-' + (o.sub === 'item' ? o.item : 'tags'));
  const im = el('img', 'px'); im.src = o.sub === 'item' ? `img/item_${o.item}.png` : 'img/item_tags.png'; e.appendChild(im);
  if (o.tagged) { const tg = el('img', 'px tg'); tg.src = 'img/item_tag.png'; e.appendChild(tg); }
  return e;
}
function toolEl(o) {
  const e = el('div', 'obj tool tool-' + o.tool);
  const im = el('img', 'px');
  im.src = o.tool === 'pen' ? 'img/dep_quill.png' : o.tool === 'ar' ? 'img/stamp_ar.png' : o.tool === 'seal' ? 'img/stamp_seal.png' : 'img/stamp_q.png';
  e.appendChild(im);
  if (o.tool !== 'pen') {
    const lab = o.tool === 'ar' ? (o.face === 'approve' ? '認' : '却') : o.tool === 'seal' ? '承' : o.tool.slice(1);
    e.appendChild(el('span', 'tlab ' + (o.tool === 'ar' ? o.face : o.tool === 'seal' ? 'seal' : 'q'), lab));
  }
  return e;
}
function fixtureEls(t, root) {
  for (const k of kitFix(t)) {
    if (k !== 'apply' && k !== 'order') continue;
    const f = FIX[k];
    const e = el('div', 'fix tray tray-' + k); e.dataset.fix = k;
    Object.assign(e.style, { left: f.x + 'px', top: f.y + 'px', width: f.w + 'px', height: f.h + 'px' });
    e.appendChild(el('div', 'tray-paper')); e.appendChild(el('div', 'tray-label', f.label));
    root.appendChild(e);
  }
  if (!kitFix(t).includes('calendar')) return;
  const c = FIX.calendar, ce = el('div', 'fix calendar'); ce.dataset.fix = 'calendar';
  Object.assign(ce.style, { left: c.x + 'px', top: c.y + 'px', width: c.w + 'px', height: c.h + 'px' });
  const dt = today();
  ce.appendChild(el('div', 'cal-y', `${CAL.ERA} ${dt.y}年`));
  ce.appendChild(el('div', 'cal-m', CAL.MONTHS[dt.m]));
  ce.appendChild(el('div', 'cal-d', `${dt.d}日`));
  ce.appendChild(el('div', 'cal-t', hhmm(S.clock)));
  root.appendChild(ce);
  const tr = FIX.trash, te = el('div', 'fix trash'); te.dataset.fix = 'trash';
  Object.assign(te.style, { left: tr.x + 'px', top: tr.y + 'px', width: tr.w + 'px', height: tr.h + 'px' });
  te.appendChild(el('div', 'trash-can')); te.appendChild(el('div', 'tray-label', 'ゴミ箱'));
  root.appendChild(te);
}
function personalHead(root, set) {
  const hd = el('div', 'p-head');
  hd.appendChild(el('span', 'p-title', '個人用テーブル'));
  if (set) {
    const many = openSets().length > 1;
    const prev = el('button', 'p-arrow' + (many ? '' : ' off'), '◀'); prev.dataset.pset = '-1';
    const next = el('button', 'p-arrow' + (many ? '' : ' off'), '▶'); next.dataset.pset = '1';
    hd.appendChild(prev); hd.appendChild(el('span', 'p-set', PSETS.find(p => p.id === set).name)); hd.appendChild(next);
    if (set === 'wash') hd.appendChild(el('span', 'p-hint', washHint()));
  }
  root.appendChild(hd);
}
function renderTable() {
  const t = tbl();
  const root = $('#table'); root.innerHTML = '';
  root.classList.toggle('personal', personal());
  if (personal()) {
    const set = curSet();
    personalHead(root, set);
    if (!set) { root.appendChild(el('div', 'p-empty', '今はできることがありません')); return; }
    if (set === 'wash') { renderWash(root); return; }
  } else root.appendChild(el('div', 'handover-zone', '↑ 依頼者へ渡す'));
  root.appendChild(el('div', 'putaway-zone'));
  fixtureEls(t, root);
  for (const o of t.objs) {
    if (o.held) continue;
    const e = o.cls === 'paper' ? paperEl(o) : o.cls === 'book' ? bookEl(o) : o.cls === 'small' ? smallEl(o) : toolEl(o);
    e.dataset.id = o.id;
    e.style.left = o.x + 'px'; e.style.top = o.y + 'px';
    if (o.cls === 'paper' || o.cls === 'book') e.style.zIndex = o.z; else e.style.zIndex = 100000;
    if (o.personal && t.state === 'leaving') { e.classList.add('fading'); e.style.animationDelay = -(S.rt - t.fadeAt) + 's'; }
    root.appendChild(e);
  }
}

/* ================= 画面：テーブルの列（上） ================= */
const boothDom = [];
function renderLobby() {
  const morningNight = S.phase === 'morning' || S.phase === 'night';
  $('#dayCtl').hidden = !morningNight;
  if (morningNight) {
    $('#dayCtlText').textContent = S.phase === 'morning' ? '開店の準備（品出しはいつでもできます）' : '明日の準備（注文は個人用テーブルで）';
    $('#btnDay').textContent = S.phase === 'morning' ? '営業開始' : '次の日へ';
  }
  for (const t of S.tables) {
    const b = boothDom[t.i];
    const p = t.party;
    const key = t.state + '|' + (p ? p.id : '') + '|' + bubbleText(p) + '|' + (p && t.state === 'returned' ? p.members.map(m => m.status + (m.ail || '')).join() : '');
    if (key !== b.key) {
      b.key = key; b.root.innerHTML = '';
      const plate = el('div', 'plate'); plate.appendChild(el('span', 'no', `テーブル${t.i + 1}`));
      const lab = { empty: '空き', reception: '受注対応待ち', returned: '終了対応待ち', leaving: '退出' }[t.state];
      plate.appendChild(el('span', 'badge ' + t.state, lab)); b.root.appendChild(plate);
      if (p) {
        const party = el('div', 'party');
        if (t.enter) { party.classList.add('enter'); t.enter = false; }
        if (t.state === 'leaving') party.classList.add('leave');
        for (const m of p.members) party.appendChild(sprite(m.gid, p.returned ? m.status : 'ok', 2, p.returned && m.status !== 'ghost' ? m.ail : null));
        b.root.appendChild(party);
        const bt = bubbleText(p); if (bt) b.root.appendChild(el('div', 'bubble', bt));
      } else b.root.appendChild(el('div', 'empty-msg', '— 空き —'));
    }
    b.root.classList.toggle('sel', t.i === S.selected && !personal());
  }
  $('#queueInfo').textContent = `クエスト中 ${S.quests.length}組　帰還待ち ${S.returnQueue.length}組`;
}

/* ================= 画面：設備窓 ================= */
function setEq(id) { const i = EQS.findIndex(e => e.id === id); if (i >= 0 && i !== S.eq) { S.eq = i; dirty(); } }
function stepEq(d) { S.eq = (S.eq + d + EQS.length) % EQS.length; SFX.click(); dirty(); }
const BOX_LAYOUT = { pouch: { x: 5, y: 5, per: 2, dx: 8 }, crate_s: { x: 3, y: 4, per: 3, dx: 9 }, crate_l: { x: 3, y: 4, per: 5, dx: 7 } };
function boxEl(b, cls) {
  const type = PACK_OF[b.n] || 'crate_s', L = BOX_LAYOUT[type], k = 2;
  const e = el('div', 'box box-' + type + ' ' + (cls || ''));
  const back = el('img', 'px box-back'); back.src = `img/box_${type}_back.png`; e.appendChild(back);
  const inner = el('div', 'box-inner');
  for (let i = 0; i < b.left; i++) {
    const row = Math.floor(i / L.per), col = i % L.per;
    const it = el('img', 'px'); it.src = `img/mini_${b.kind}.png`;
    it.style.left = (L.x + col * L.dx + (row ? 4 : 0)) * k + 'px'; it.style.top = (L.y + row * 3) * k + 'px';
    inner.appendChild(it);
  }
  e.appendChild(inner);
  const front = el('img', 'px box-front'); front.src = `img/box_${type}_front.png`; e.appendChild(front);
  if (type !== 'pouch') { const lab = el('img', 'px box-label'); lab.src = `img/item_${b.kind}.png`; e.appendChild(lab); }
  e.appendChild(el('span', 'box-n', `${ITEM_NAME2[b.kind]} ${b.left}/${b.n}`));
  return e;
}
function renderEq() {
  const eq = EQS[S.eq];
  $('#eqName').textContent = eq.name;
  const body = $('#eqBody'); body.innerHTML = ''; body.className = 'eq-' + eq.id;
  if (eq.id === 'shelf') {
    const g = el('div', 'sgrid');
    S.shelf.forEach((k, i) => {
      const c = el('div', 'scell' + (k ? '' : ' empty')); c.dataset.shelf = i;
      if (k) { const im = el('img', 'px'); im.src = `img/item_${k}.png`; im.title = ITEM_NAME2[k]; c.appendChild(im); }
      g.appendChild(c);
    });
    body.appendChild(g);
    const foot = el('div', 'foot');
    for (let i = 0; i < V2.FOOT_MAX; i++) {
      const slot = el('div', 'fslot'); slot.dataset.foot = i;
      if (S.foot[i]) slot.appendChild(boxEl(S.foot[i]));
      foot.appendChild(slot);
    }
    body.appendChild(foot);
    const bottom = el('div', 'shelf-bottom');
    const tr = el('div', 'etrash'); tr.dataset.etrash = '1'; tr.appendChild(el('div', 'trash-can')); tr.appendChild(el('span', '', '空き箱'));
    bottom.appendChild(tr);
    bottom.appendChild(el('div', 'eq-note', `棚 ${shelfCount()}/${V2.SHELF_MAX}　足元の箱 ${S.foot.length}/${V2.FOOT_MAX}`));
    body.appendChild(bottom);
  } else if (eq.id === 'stock') {
    const g = el('div', 'stockgrid');
    for (let i = 0; i < V2.STOCK_MAX; i++) {
      const c = el('div', 'stslot'); c.dataset.stock = i;
      if (S.stock[i]) c.appendChild(boxEl(S.stock[i]));
      g.appendChild(c);
    }
    body.appendChild(g);
    body.appendChild(el('div', 'eq-note', `在庫の箱 ${S.stock.length}/${V2.STOCK_MAX}${S.pending.length ? `　明朝届く ${S.pending.length}箱` : ''}`));
  } else if (eq.id === 'bag') {
    const bag = el('div', 'bag');
    if (S.bag.manual) { const m = el('div', 'bag-item bag-manual'); m.dataset.bag = 'manual'; m.appendChild(el('div', 'mini-book', 'マニュアル')); m.appendChild(el('span', '', '対応マニュアル')); bag.appendChild(m); }
    if (S.bag.tags) { const m = el('div', 'bag-item'); m.dataset.bag = 'tags'; const im = el('img', 'px'); im.src = 'img/item_tags.png'; m.appendChild(im); m.appendChild(el('span', '', 'タグの束')); bag.appendChild(m); }
    if (!S.bag.manual && !S.bag.tags) bag.appendChild(el('div', 'eq-note', '鞄の中は空です'));
    body.appendChild(bag);
  } else {
    const mb = el('div', 'mailbox'); mb.appendChild(el('div', 'mail-slot')); mb.appendChild(el('div', 'mail-body', 'POST'));
    body.appendChild(mb);
    body.appendChild(el('div', 'eq-note', '承認印を押した注文用紙を、テーブルの右の端へ持っていくと送れます。'));
  }
}

/* ================= 画面：その他 ================= */
function renderTop() {
  $('#tbDay').textContent = `${S.day}日目`;
  $('#tbDate').textContent = calText(today()).replace(CAL.ERA, '');
  $('#tbClock').textContent = hhmm(S.clock);
  const txt = { business: '営業中', afterhours: '営業終了・対応中', report: '営業終了', morning: '早朝・開店前', night: '深夜・閉店後' }[S.phase] || '開店前';
  const st = $('#tbStatus'); if (st.textContent !== txt) st.textContent = txt;
  st.classList.toggle('closed', S.phase !== 'business');
  $('#tbGold').textContent = S.gold;
}
let lastClockMin = -1, lastPhase = '';
function render() {
  renderTop(); renderLobby();
  const cm = Math.floor(S.clock);
  if (cm !== lastClockMin) { lastClockMin = cm; const ct = document.querySelector('.calendar .cal-t'); if (ct) ct.textContent = hhmm(S.clock); }
  if (isDirty) { isDirty = false; renderTable(); renderEq(); }
  renderHand();
  renderClerk();
  $('#clerkPanel').classList.toggle('open', personal());
  if (S.phase !== lastPhase) { lastPhase = S.phase; if (personal()) { stowUtilities(tbl()); cancelWashDrag(); fixPset(); } dirty(); }
  const lob = $('#lobby'); lob.classList.toggle('night', S.phase === 'night'); lob.classList.toggle('dawn', S.phase === 'morning');
}
function renderHand() {
  const h = S.hand, e = $('#hand');
  if (!h) { e.hidden = true; return; }
  e.hidden = false;
  const key = h.id + '|' + (h.face || '') + '|' + (h.tagged || '');
  if (e.dataset.key !== key) {
    e.dataset.key = key; e.innerHTML = '';
    e.appendChild(h.cls === 'tool' ? toolEl(h) : smallEl(h));
  }
}
function toast(msg, kind) {
  if (kind === 'bad') SFX.bad();
  const box = $('#logList');
  const t = el('div', 'logline new ' + (kind || ''));
  t.appendChild(el('span', 'tm', S.phase !== 'title' ? hhmm(S.clock) : ''));
  t.appendChild(document.createTextNode(msg));
  box.prepend(t);
  while (box.children.length > 10) box.lastChild.remove();
  setTimeout(() => t.classList.remove('new'), 1700);
}
function showScene(title, sub) {
  const c = $('#scene'); c.innerHTML = '';
  c.appendChild(el('div', 'sc-t', title)); if (sub) c.appendChild(el('div', 'sc-s', sub));
  c.classList.remove('show'); void c.offsetWidth; c.classList.add('show');
}
let popTimer = 0;
function popup(text, cx, cy) {
  const p = $('#popup'); p.textContent = text; p.hidden = false;
  const st = $('#stage').getBoundingClientRect();
  p.style.left = Math.min(1280 - 260, (cx - st.left) / scale + 12) + 'px';
  p.style.top = Math.max(0, (cy - st.top) / scale - 10) + 'px';
  clearTimeout(popTimer); popTimer = setTimeout(() => { p.hidden = true; }, 2600);
}
const CLERK_DIR = 'img/newGraphic(clerk)/';
const FACE = { kind: null, until: 0, blinkAt: 0, nextBlink: 0, shown: '' };
function clerkFace(kind, sec) { FACE.kind = kind; FACE.until = performance.now() + sec * 1000; }
function renderClerk() {
  const now = performance.now(); let f;
  if (S.phase === 'night') f = 'rest';
  else if (FACE.kind && now < FACE.until) f = FACE.kind;
  else { if (!S.paused && now >= FACE.nextBlink) { FACE.blinkAt = now; FACE.nextBlink = now + rand(2600, 6200); } const t = now - FACE.blinkAt; f = t < 80 ? 'blink_1' : t < 160 ? 'blink_2' : 'eyeopen'; }
  if (f !== FACE.shown) { FACE.shown = f; document.querySelectorAll('#clerkFaces img').forEach(im => { im.hidden = im.dataset.face !== f; }); }
}
function showReport() {
  const st = S.stats;
  $('#repTitle').textContent = `${S.day}日目　営業成績`;
  const rows = [
    ['来訪したパーティ', st.visitors + '組'], ['閉店で帰したパーティ', st.closedAway + '組'],
    ['認可', st.approved + '件'], ['却下', st.rejected + '件'], ['受注対応のミス', st.recMiss + '件', st.recMiss],
    ['帰還したパーティ', st.returned + '組'], ['戻らなかったパーティ', st.lost + '組', st.lost], ['終了対応のミス', st.retMiss + '件', st.retMiss],
    ...V2.ITEMS.map(k => ['使った' + ITEM_NAME[k], st.used[k] + '個']),
    ['運営本部から', st.incomeHQ + 'G'], ['依頼主から', st.incomeOwner + 'G'],
    ['内職（容器の洗浄）', `${st.washBoxes}箱 ${st.incomeSide}G`], ['注文の代金', st.orderCost + 'G'],
    ['クエスト中のパーティ', S.quests.length + S.returnQueue.length + '組'], ['物品棚', `${shelfCount()}/${V2.SHELF_MAX}`],
  ];
  const g = el('div', 'rep-grid');
  for (const r of rows) { const d = el('div', r[2] ? 'neg' : ''); d.appendChild(el('span', '', r[0])); d.appendChild(el('span', '', r[1])); g.appendChild(d); }
  const tot = el('div', 'total'); tot.appendChild(el('span', '', `本日の収入 ${st.incomeHQ + st.incomeOwner + st.incomeSide}G　／　支店運営費 ${S.gold}G`)); g.appendChild(tot);
  const body = $('#repBody'); body.innerHTML = ''; body.appendChild(g);
  $('#reportOv').hidden = false;
}

/* ================= 操作：テーブル ================= */
let scale = 1;
const findObj = id => tbl().objs.find(o => o.id === +id);
function tablePoint(e) { const r = $('#table').getBoundingClientRect(); return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale }; }
function hitAt(e) {
  const els = document.elementsFromPoint(e.clientX, e.clientY);
  for (const x of els) {
    if (x.closest('#hand') || x.closest('#popup')) continue;
    const ob = x.closest('.obj'); if (ob && $('#table').contains(ob)) return { obj: findObj(ob.dataset.id), node: x };
    const fx = x.closest('.fix'); if (fx) return { fix: fx.dataset.fix, node: x };
    if (x.id === 'table') return {};
  }
  return {};
}
const isDraggable = o => o && (o.cls === 'paper' || o.cls === 'book' || o.cls === 'small');
let press = null;
function onDown(e) {
  if (!busyOrPrep()) return;
  e.preventDefault();
  SFX.init();
  const arrow = e.target.closest && e.target.closest('[data-pset]');
  if (arrow) { if (e.button === 0) stepSet(+arrow.dataset.pset); return; }
  if (personal()) { const set = curSet(); if (!set) return; if (set === 'wash') { washDown(e); return; } }
  const hit = hitAt(e);
  press = { x: e.clientX, y: e.clientY, button: e.button, hit, drag: false, pid: e.pointerId };
  if (e.button === 0 && isDraggable(hit.obj)) {
    const p = tablePoint(e); press.off = { x: p.x - hit.obj.x, y: p.y - hit.obj.y };
  }
}
function onMove(e) {
  moveHand(e);
  if (press && press.wash) { washMove(e); return; }
  if (!press || press.button !== 0) return;
  const o = press.hit.obj;
  if (!press.drag) {
    if (!isDraggable(o) || Math.hypot(e.clientX - press.x, e.clientY - press.y) < OPT.drag) return;
    press.drag = true; bringFront(o);
    const node = document.querySelector(`#table [data-id="${o.id}"]`);
    if (node) { node.style.zIndex = o.cls === 'small' ? 100001 : o.z; node.classList.add('dragging'); }
    showZones(o);
  }
  const p = tablePoint(e);
  o.x = p.x - press.off.x; o.y = p.y - press.off.y;
  const node = document.querySelector(`#table [data-id="${o.id}"]`);
  if (node) { node.style.left = o.x + 'px'; node.style.top = o.y + 'px'; }
}
function onUp(e) {
  if (!press) return;
  const pr = press; press = null;
  if (pr.wash) { washUp(pr, e); return; }
  hideZones();
  if (pr.drag) { dropObj(pr.hit.obj, e); return; }
  if (Math.hypot(e.clientX - pr.x, e.clientY - pr.y) >= OPT.drag) return;
  clickTable(pr.button, pr.hit, e);
}
function showZones(o) {
  $('#table').classList.toggle('show-handover', o.cls === 'paper' && (o.doc === 'apply' || o.doc === 'pform'));
  $('#table').classList.toggle('show-putaway', o.cls === 'book' || o.doc === 'order');
}
function hideZones() { $('#table').classList.remove('show-handover', 'show-putaway'); }
function inRect(p, f) { return p.x >= f.x && p.x <= f.x + f.w && p.y >= f.y && p.y <= f.y + f.h; }
function dropObj(o, e) {
  const t = tbl(), p = tablePoint(e);
  const overEq = !!document.elementsFromPoint(e.clientX, e.clientY).find(x => x.closest && x.closest('#equip'));
  const w = objW(o), h = objH(o);
  const atTop = p.y < HANDOVER_H || o.y < HANDOVER_H - 6;
  const atRight = p.x > TW - PUTAWAY_W || overEq || o.x + w > TW + 6;
  // 上の端：依頼者へ渡す
  if (atTop && o.cls === 'paper' && tryHandOver(t, o)) return;
  // 右の端・設備窓：しまう／郵便
  if (atRight) {
    if (o.cls === 'book' && o.util) { putAwayBook(o); return; }
    if (o.cls === 'small') { putAwaySmall(o); return; }
    if (o.cls === 'paper' && o.doc === 'order' && EQS[S.eq].id === 'mail' && o.data.stamps.some(s => s.t === 'seal')) { if (sendOrder(o)) return; }
  }
  // ゴミ箱・用紙入れ（取り出した用紙だけ）
  if (o.cls === 'paper' && o.tray) {
    if (inRect(p, FIX.trash)) { t.objs = t.objs.filter(x => x !== o); SFX.paper(); dirty(); return; }
    const blank = !(o.data.stamps || []).length && !Object.values(o.data.checks || {}).some(Boolean) && !Object.values(o.data.qty || {}).some(Boolean);
    if (blank && inRect(p, FIX[o.tray])) { t.objs = t.objs.filter(x => x !== o); SFX.paper(); dirty(); return; }
  }
  // 普通に置く（テーブルの中に収める）
  if (o.cls === 'small') settle(t, o);
  else { o.x = clamp(o.x, 0, TW - w); o.y = clamp(o.y, HANDOVER_H, TH - h); }
  SFX.soft(); dirty();
}
function tryHandOver(t, o) {
  if (t.state === 'reception' && o.tray === 'apply' && o.boundTo === t.party.id && o.data.stamps.some(s => s.t === 'approve' || s.t === 'reject')) { finishReception(t, o); return true; }
  if (t.state === 'returned') {
    const pform = t.objs.find(x => x.doc === 'pform');
    const ok = o.data.stamps?.some(s => s.t === 'seal') && ((o.doc === 'pform') || (!pform && o.tray === 'apply' && o.boundTo === t.party.id));
    if (ok) { finishReturn(t, o); return true; }
  }
  return false;
}
function clickTable(btn, hit, e) {
  const h = S.hand, o = hit.obj, p = tablePoint(e);
  // 小物・道具に触れた
  if (o && (o.cls === 'small' || o.cls === 'tool')) {
    if (h && h.cls === 'small' && h.sub === 'tags' && o.cls === 'small' && o.sub === 'item') {
      if (btn === 0 && !o.tagged) { o.tagged = true; SFX.tag(); dirty(); }
      else if (btn === 2 && o.tagged) { o.tagged = false; SFX.soft(); dirty(); }
      return;
    }
    if (h) { swap(h, o); return; }
    if (btn === 2) { popup(o.cls === 'tool' ? `${TOOL_DEF[o.tool].name}：${TOOL_DEF[o.tool].desc}` : SMALL_DESC[o.sub === 'item' ? o.item : 'tags'], e.clientX, e.clientY); return; }
    if (btn === 0) pickUp(o);
    return;
  }
  // 用紙入れ
  if (hit.fix === 'apply' || hit.fix === 'order') {
    if (!h) {
      if (btn === 2) { popup(`用紙入れ：${FIX[hit.fix].label}。左クリックで1枚出す（1枚まで）`, e.clientX, e.clientY); return; }
      if (btn === 0) { takeForm(hit.fix); return; }
    }
  }
  if (h) {
    if (h.cls === 'tool') {
      // 筆記具は却下事項の行で左右の操作が決まる
      if (h.tool === 'pen') {
        const row = hit.node && hit.node.closest && hit.node.closest('[data-reason]');
        if (row && o && (o.doc === 'apply' || o.doc === 'pform')) {
          const id = row.dataset.reason;
          if (!penAllowed(o)) { SFX.deny(); return; }
          if (btn === 0 && !o.data.checks[id]) { o.data.checks[id] = true; SFX.tag(); dirty(); }
          else if (btn === 2 && o.data.checks[id]) { o.data.checks[id] = false; SFX.soft(); dirty(); }
          return;
        }
      }
      if (btn === 2) { releaseTool(h); return; }
      if (btn === 0) { useStamp(h, o, hit, p); return; }
    } else {
      if (btn === 2) { placeSmall(h, p.x, p.y); return; }
      return;
    }
  }
  // 何も持っていない
  if (o && o.cls === 'paper') { if (btn === 0 && o.back) { o.back = false; dirty(); } else if (btn === 2 && !o.back && o.hasBack) { o.back = true; dirty(); } return; }
  if (o && o.cls === 'book') { flipBook(o, btn === 2 ? 'R' : 'L'); }
}
const usable = (o, t) => o.tray === 'apply' && t.party && (o.boundTo == null || o.boundTo === t.party.id);
function penAllowed(o) {
  const t = tbl();
  if (!(usable(o, t) && t.state === 'reception' && !o.data.stamps.some(s => s.t === 'approve' || s.t === 'reject'))) return false;
  o.boundTo = t.party.id; return true;
}
function swap(h, o) {
  if (h.cls === 'tool') releaseTool(h);
  else { h.held = false; h.x = o.x; h.y = o.y; S.hand = null; }
  pickUp(o);
  if (h.cls === 'small') settle(tbl(), h);
  dirty();
}
function takeForm(kind) {
  const t = tbl();
  if (kind === 'order' && S.phase !== 'night') return;
  if (t.objs.some(o => o.tray === kind)) { SFX.deny(); toast('用紙はテーブルに1枚まで出せます'); return; }
  const [w, h] = PAPER[kind];
  const sp = freeSpot(t, w, h);
  const data = kind === 'apply' ? { checks: Object.fromEntries(V2_REASONS.map(r => [r.id, false])), stamps: [] } : { qty: Object.fromEntries(V2.ITEMS.map(k => [k, 0])), stamps: [] };
  addObj(t, { cls: 'paper', doc: kind, tray: kind, x: sp.x, y: sp.y, data, boundTo: null });
  SFX.paper(); dirty();
}
// ハンコを押せるか（押すべき物にだけ押せる）
function stampTarget(tool, o, hit) {
  const t = tbl();
  if (!o || o.cls !== 'paper' || o.back) return null;
  const st = o.data.stamps || [];
  if (tool === 'ar') {
    if (t.state === 'reception' && usable(o, t) && !st.some(s => s.t === 'approve' || s.t === 'reject')) { o.boundTo = t.party.id; return o; }
    return null;
  }
  if (tool === 'seal') {
    if (st.some(s => s.t === 'seal')) return null;
    if (o.doc === 'order') return o;
    if (t.state === 'returned') {
      if (o.personal && (o.doc === 'quest' || o.doc === 'pform')) return o;
      if (usable(o, t) && !t.objs.some(x => x.doc === 'pform')) { o.boundTo = t.party.id; return o; }
    }
    return null;
  }
  if (tool[0] === 'q') {
    const slot = hit.node && hit.node.closest && hit.node.closest('[data-kind]');
    if (o.doc === 'order' && slot && !o.data.qty[slot.dataset.kind]) return o;
  }
  return null;
}
function useStamp(h, o, hit, p) {
  const target = stampTarget(h.tool, o, hit);
  if (!target) { SFX.deny(); return; }
  const lx = p.x - target.x - 28, ly = p.y - target.y - 16;
  if (h.tool === 'ar') target.data.stamps.push({ t: h.face, x: lx, y: ly });
  else if (h.tool === 'seal') target.data.stamps = (target.data.stamps || []).concat({ t: 'seal', x: lx, y: ly });
  else { const k = hit.node.closest('[data-kind]').dataset.kind; target.data.qty[k] = +h.tool.slice(1); }
  bringFront(target); SFX.stamp(); dirty();
}
function flipBook(o, dir) {
  const L = (o.book === 'manual' ? MANUAL : o.sides).length / 2;
  const lb = o.binding === 'L';
  const delta = dir === 'R' ? (lb ? 1 : -1) : (lb ? -1 : 1);
  const nk = clamp(o.flip + delta, 0, L);
  if (nk !== o.flip) { o.flip = nk; SFX.paper(); dirty(); }
}
function onWheel(e) {
  if (!busyOrPrep()) return;
  e.preventDefault();
  if (personal() && curSet() !== 'order') return;
  const h = S.hand;
  if (h && h.tool === 'ar') { const f = e.deltaY < 0 ? 'approve' : 'reject'; if (h.face !== f) { h.face = f; SFX.click(); } return; }
  const hit = hitAt(e);
  if (hit.obj && hit.obj.cls === 'book') { flipBook(hit.obj, e.deltaY > 0 ? 'R' : 'L'); }
}
function moveHand(e) {
  const st = $('#stage').getBoundingClientRect();
  const hd = $('#hand');
  hd.style.left = (e.clientX - st.left) / scale + 'px'; hd.style.top = (e.clientY - st.top) / scale + 'px';
}
const busyOrPrep = () => (busy() || S.phase === 'morning' || S.phase === 'night') && !S.paused;

/* ================= 操作：設備窓 ================= */
let epress = null, ghost = null;
function onEqDown(e) {
  if (!busyOrPrep()) return;
  e.preventDefault(); SFX.init();
  const node = e.target;
  const shelfCell = node.closest('[data-shelf]'), footSlot = node.closest('[data-foot]'), stockSlot = node.closest('[data-stock]'), bagItem = node.closest('[data-bag]');
  epress = { x: e.clientX, y: e.clientY, button: e.button, shelf: shelfCell ? +shelfCell.dataset.shelf : null, foot: footSlot ? +footSlot.dataset.foot : null, stock: stockSlot ? +stockSlot.dataset.stock : null, bag: bagItem ? bagItem.dataset.bag : null, drag: false };
}
function onEqMove(e) {
  moveHand(e);
  if (!epress || epress.button !== 0 || epress.drag) { if (ghost) moveGhost(e); return; }
  if (Math.hypot(e.clientX - epress.x, e.clientY - epress.y) < OPT.drag) return;
  let src = null;
  if (epress.shelf != null && S.shelf[epress.shelf]) src = `img/item_${S.shelf[epress.shelf]}.png`;
  else if (epress.foot != null && S.foot[epress.foot]) src = `img/box_${PACK_OF[S.foot[epress.foot].n] || 'crate_s'}_back.png`;
  else if (epress.bag === 'tags') src = 'img/item_tags.png';
  else if (epress.bag === 'manual') src = null;
  if (!src && epress.bag !== 'manual') return;
  epress.drag = true;
  ghost = el('div', 'ghost');
  if (src) { const im = el('img', 'px'); im.src = src; ghost.appendChild(im); } else ghost.appendChild(el('div', 'mini-book', 'マニュアル'));
  $('#stage').appendChild(ghost); moveGhost(e);
}
function moveGhost(e) { if (!ghost) return; const st = $('#stage').getBoundingClientRect(); ghost.style.left = (e.clientX - st.left) / scale - 24 + 'px'; ghost.style.top = (e.clientY - st.top) / scale - 24 + 'px'; }
function onEqUp(e) {
  if (!epress) return;
  const pr = epress; epress = null;
  if (ghost) { ghost.remove(); ghost = null; }
  if (pr.drag) { eqDrop(pr, e); return; }
  if (Math.hypot(e.clientX - pr.x, e.clientY - pr.y) >= OPT.drag) return;
  eqClick(pr, e);
}
function overTable(e) { const r = $('#table').getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; }
let noteAt = 0;
function noPersonal() { SFX.deny(); if (S.rt - noteAt > 2 || S.phase !== 'business') { noteAt = S.rt; toast('個人用テーブルには、ほかの物を出せません'); } }
function eqDrop(pr, e) {
  const t = tbl();
  if (overTable(e)) {
    if (personal()) { noPersonal(); return; }
    const p = tablePoint(e);
    if (pr.shelf != null) { const k = S.shelf[pr.shelf]; S.shelf[pr.shelf] = null; const o = addObj(t, { cls: 'small', sub: 'item', item: k, util: true, x: p.x - SM / 2, y: p.y - SM / 2 }); settle(t, o); SFX.clink(); dirty(); }
    else if (pr.bag) { takeFromBag(pr.bag, p); }
    return;
  }
  const hit = document.elementsFromPoint(e.clientX, e.clientY);
  const cell = hit.map(x => x.closest && x.closest('[data-shelf]')).find(Boolean);
  if (pr.shelf != null && cell) { const to = +cell.dataset.shelf; [S.shelf[pr.shelf], S.shelf[to]] = [S.shelf[to], S.shelf[pr.shelf]]; SFX.soft(); dirty(); return; }
  const tr = hit.find(x => x.closest && x.closest('[data-etrash]'));
  if (pr.foot != null && tr) { const b = S.foot[pr.foot]; if (b && b.left === 0) { S.foot.splice(pr.foot, 1); SFX.thump(); dirty(); } else { SFX.deny(); toast('中身の残っている箱は捨てられません'); } }
}
function eqClick(pr, e) {
  const btn = pr.button, h = S.hand;
  // 小物を持ったまま設備窓で右クリック：しまう
  if (btn === 2 && h && h.cls === 'small') { h.held = false; putAwaySmall(h); return; }
  const eq = EQS[S.eq].id;
  if (eq === 'shelf') {
    if (pr.shelf != null && S.shelf[pr.shelf]) {
      const k = S.shelf[pr.shelf];
      if (btn === 0) { if (personal()) { noPersonal(); return; } S.shelf[pr.shelf] = null; const t = tbl(); const sp = smallSpot(t); const o = addObj(t, { cls: 'small', sub: 'item', item: k, util: true, x: sp.x, y: sp.y }); settle(t, o); SFX.clink(); dirty(); return; }
      if (btn === 2) { const b = S.foot.find(x => x.kind === k && x.left < x.n); if (b) { S.shelf[pr.shelf] = null; b.left++; SFX.clink(); dirty(); } else SFX.deny(); return; }
    }
    if (pr.foot != null && S.foot[pr.foot]) {
      const b = S.foot[pr.foot];
      if (btn === 0) { if (b.left > 0 && shelfPut(b.kind)) { b.left--; SFX.clink(); dirty(); } else SFX.deny(); return; }
      if (btn === 2) { if (S.stock.length < V2.STOCK_MAX) { S.foot.splice(pr.foot, 1); S.stock.push(b); SFX.thump(); toast('箱を在庫棚に戻しました'); dirty(); } else { SFX.deny(); toast(`在庫棚に置ける箱は${V2.STOCK_MAX}個までです`); } return; }
    }
  } else if (eq === 'stock') {
    if (pr.stock != null && S.stock[pr.stock] && btn === 0) {
      if (S.foot.length >= V2.FOOT_MAX) { SFX.deny(); toast(`物品棚の足元に置ける箱は${V2.FOOT_MAX}つまでです`); return; }
      S.foot.push(S.stock.splice(pr.stock, 1)[0]); SFX.thump(); toast('箱を物品棚の足元に運びました'); dirty(); return;
    }
  } else if (eq === 'bag') {
    if (pr.bag && btn === 0) { if (personal()) { noPersonal(); return; } takeFromBag(pr.bag, null); return; }
  }
}
function takeFromBag(what, p) {
  const t = tbl();
  if (what === 'manual' && S.bag.manual) {
    const [pw, ph] = BOOK.manual;
    const sp = p ? { x: p.x - pw, y: p.y - 30 } : freeSpot(t, pw * 2, ph);
    addObj(t, { cls: 'book', book: 'manual', util: true, binding: 'L', flip: S.manualFlip, x: clamp(sp.x, 0, TW - pw * 2), y: clamp(sp.y, HANDOVER_H, TH - ph) });
    S.bag.manual = false; SFX.paper(); dirty();
  } else if (what === 'tags' && S.bag.tags) {
    const sp = p ? { x: p.x - SM / 2, y: p.y - SM / 2 } : smallSpot(t);
    const o = addObj(t, { cls: 'small', sub: 'tags', util: true, x: sp.x, y: sp.y }); settle(t, o);
    S.bag.tags = false; SFX.grab(); dirty();
  }
}

/* ================= 内職：容器の洗浄 ================= */
// ① 回収箱 → 作業布 → タグと栓を外す（栓はトレーへ）→ 桶で振り洗い → 布で拭く → 乾燥棚（10本）
// ③ 乾燥棚 → 作業布 → 合う栓を付ける → 仮置き台 → 乾燥棚が空になったら箱に詰める → 箱が閉じて手間賃
const WK = 3;                                     // 素材の表示倍率
const WBW = 16 * WK, WBH = 20 * WK;               // 容器の表示サイズ
const WB_CORK = { gel: [2, 3], elixir: [4, 5], whale: [5, 3] };  // 容器の絵の中での栓とタグの位置（素材の座標）
const WB_TAG = { gel: [11, 7], elixir: [9, 9], whale: [10, 8] };
const CORK_SZ = { gel: [12, 4], elixir: [7, 6], whale: [6, 6] };
const WL = {
  rbox: { x: 14, y: 34, w: 180, h: 132 },
  mat: { x: 206, y: 32, w: 144, h: 152 },
  bucket: { x: 362, y: 36, w: 168, h: 144 },
  temp: { x: 538, y: 32, w: 254, h: 152 },
  cloth: { x: 232, y: 206, w: 54, h: 42 },
  tray: { x: 14, y: 300, w: 192, h: 90 },
  rack: { x: 514, y: 300, w: 276, h: 174 },
  cbox: { x: 514, y: 318, w: 276, h: 156 },
};
const MAT_POS = { x: WL.mat.x + (WL.mat.w - WBW) / 2, y: WL.mat.y + 62 };
const WDESC = {
  rbox: '回収箱：使い終わった容器が戻ってくる。ドラッグ（クリックでも）で作業布へ',
  tag: 'タグ：ドラッグで引っぱって外す',
  cork: '栓：ドラッグで引き抜く。抜いた栓はトレーへ',
  bucket: '水を張った桶：容器を持ったまま入れて、左右に振って洗う',
  cloth: '布：洗った容器の上でこすって拭く',
  rack: '乾燥棚：拭いた容器を逆さにして干す（10本）',
  tray: '栓のトレー：外した栓を並べておく',
  temp: '仮置き台：栓をした容器を並べておく',
  cbox: '緩衝材入りの箱：栓をした容器を10本詰めると閉じる',
  mat: '作業布：容器はここで扱う',
};
function newWash() { return { stage: 1, mat: null, rack: Array(10).fill(null), tray: Array(10).fill(null), temp: Array(10).fill(null), box: [], cycles: 0 }; }
const W = () => S.wash;
const boxOpen = () => W().stage === 3 && W().rack.every(k => !k);
const randKind = () => weighted(V2.NAISHOKU.kinds);
function washHint() {
  const w = W(), m = w.mat;
  if (w.stage === 1) {
    const n = w.rack.filter(Boolean).length;
    const step = !m ? '回収箱から容器を作業布へ' : (m.tag || m.cork) ? 'タグと栓を外す' : m.rinse < 1 ? '桶に入れて左右に振る' : m.wipe < 1 ? '布でこすって拭く' : '乾燥棚へ';
    return `① 洗う（乾燥棚 ${n}/10）　${step}`;
  }
  if (!boxOpen()) return `③ 栓をする　${!m ? '乾燥棚から容器を作業布へ' : !m.cork ? '合う栓をトレーから付ける' : '仮置き台へ'}`;
  return `③ 箱に詰める（${w.box.length}/10）`;
}
// 位置
const rackPos = i => ({ x: WL.rack.x + (4 + (i % 5) * 17) * WK, y: WL.rack.y + (8 + Math.floor(i / 5) * 28) * WK });
const trayCell = i => ({ x: WL.tray.x + (3 + (i % 5) * 12) * WK, y: WL.tray.y + (3 + Math.floor(i / 5) * 13) * WK, w: 11 * WK, h: 11 * WK });
const tempPos = i => ({ x: WL.temp.x + 4 + (i % 5) * 50, y: WL.temp.y + 8 + Math.floor(i / 5) * 72 });
const boxPos = i => { const r = i < 5 ? 0 : 1, c = i % 5; return { x: WL.cbox.x + ((r ? 10 : 6) + c * 16) * WK, y: WL.cbox.y + (r ? 10 : 4) * WK }; };
const nearest = (n, pos, p, ok) => { let b = -1, bd = 1e9; for (let i = 0; i < n; i++) { if (!ok(i)) continue; const q = pos(i), d = Math.hypot(q.x + 24 - p.x, q.y + 30 - p.y); if (d < bd) { bd = d; b = i; } } return b; };

/* ---------- 描画 ---------- */
function wimg(src, cls) { const im = el('img', 'px ' + (cls || '')); im.src = 'img/naishoku/' + src + '.png'; im.draggable = false; return im; }
function corkEl(kind) { const c = wimg('cork_' + kind, 'wcork'); c.style.width = CORK_SZ[kind][0] * WK + 'px'; c.style.height = CORK_SZ[kind][1] * WK + 'px'; return c; }
// it: { kind, tag, cork, rinse, wipe }
function bottleEl(it, o = {}) {
  const e = el('div', 'wb' + (o.inv ? ' inv' : ''));
  e.appendChild(wimg('bottle_' + it.kind));
  if (it.rinse != null && it.rinse < 1) { const g = wimg('grime_' + it.kind, 'grime'); g.style.opacity = 1 - it.rinse; e.appendChild(g); }
  if (it.rinse > 0 && it.wipe < 1) { const d = wimg('drops_' + it.kind, 'drops'); d.style.opacity = it.rinse >= 1 ? 1 - it.wipe : it.rinse; e.appendChild(d); }
  if (it.cork) { const c = corkEl(it.kind); c.style.left = WB_CORK[it.kind][0] * WK + 'px'; c.style.top = WB_CORK[it.kind][1] * WK + 'px'; if (o.live) c.dataset.w = 'cork'; e.appendChild(c); }
  if (it.tag) { const t = wimg('tag', 'wtag'); t.style.left = WB_TAG[it.kind][0] * WK + 'px'; t.style.top = WB_TAG[it.kind][1] * WK + 'px'; if (o.live) t.dataset.w = 'tag'; e.appendChild(t); }
  return e;
}
const cleanOf = (kind, cork) => ({ kind, tag: false, cork, rinse: 1, wipe: 1 });
function place(root, e, x, y) { e.style.left = x + 'px'; e.style.top = y + 'px'; root.appendChild(e); return e; }
function box(cls, r, w) { const e = el('div', 'wfix ' + cls); Object.assign(e.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' }); if (w) e.dataset.w = w; return e; }
const WFX = [];   // 消えていく物（タグ・閉じた箱・きらめき）。作り直しても続きから再生する
function fxAge(f) { return (performance.now() - f.at) / 1000; }
function renderWash(root) {
  const w = W(), st3 = w.stage === 3, open = boxOpen(), d = wdrag;
  const hide = (what, i) => d && d.from === what && (i == null || d.idx === i);
  // 回収箱
  const rb = box('wrbox' + (st3 ? ' idle' : ''), WL.rbox, 'rbox'); rb.appendChild(wimg('returnbox')); rb.appendChild(el('span', 'wlab', '回収箱')); root.appendChild(rb);
  // 作業布
  const mat = box('wmat', WL.mat, 'mat'); mat.appendChild(el('span', 'wlab', '作業布')); root.appendChild(mat);
  // 桶
  const bk = box('wbucket' + (st3 ? ' idle' : ''), WL.bucket, 'bucket');
  bk.appendChild(wimg('bucket_back', 'b-back')); bk.appendChild(wimg('bucket_water', 'b-water')); bk.appendChild(wimg('bucket_front', 'b-front'));
  root.appendChild(bk);
  // 仮置き台
  const tp = box('wtemp' + (st3 ? '' : ' idle'), WL.temp); tp.appendChild(el('span', 'wlab', '仮置き台'));
  root.appendChild(tp);
  for (let i = 0; i < 10; i++) {
    const q = tempPos(i), s = place(root, el('div', 'wslot'), q.x, q.y); s.dataset.w = 'temp:' + i;
    if (w.temp[i] && !hide('temp', i)) s.appendChild(bottleEl(cleanOf(w.temp[i], true)));
  }
  // 栓のトレー
  const tr = box('wtray', WL.tray); tr.appendChild(wimg('tray')); tr.appendChild(el('span', 'wlab', '栓のトレー')); root.appendChild(tr);
  for (let i = 0; i < 10; i++) {
    const c = trayCell(i), s = place(root, el('div', 'wcell'), c.x, c.y); s.style.width = c.w + 'px'; s.style.height = c.h + 'px'; s.dataset.w = 'tray:' + i;
    if (w.tray[i] && !hide('tray', i)) s.appendChild(corkEl(w.tray[i]));
  }
  // 乾燥棚／箱
  const boxFx = WFX.find(f => f.k === 'box' && fxAge(f) < 1.9);
  if (!open) {
    const rk = box('wrack', WL.rack); rk.appendChild(wimg('rack')); rk.appendChild(el('span', 'wlab', '乾燥棚')); root.appendChild(rk);
    if (boxFx) { rk.classList.add('appear'); rk.style.animationDelay = -fxAge(boxFx) + 's'; }
    for (let i = 0; i < 10; i++) {
      const q = rackPos(i), s = place(root, el('div', 'wslot rk'), q.x, q.y); s.dataset.w = 'rack:' + i;
      if (w.rack[i] && !hide('rack', i)) s.appendChild(bottleEl(cleanOf(w.rack[i], false), { inv: true }));
    }
  } else {
    const cb = box('wcbox', WL.cbox, 'cbox'); cb.appendChild(wimg('cbox_back', 'x-back'));
    w.box.forEach((k, i) => { const q = boxPos(i); place(cb, bottleEl(cleanOf(k, true)), q.x - WL.cbox.x, q.y - WL.cbox.y); });
    cb.appendChild(wimg('cbox_front', 'x-front')); cb.appendChild(el('span', 'wlab', '緩衝材入りの箱'));
    root.appendChild(cb);
  }
  // 布
  if (!hide('cloth')) { const c = box('wcloth' + (st3 ? ' idle' : ''), WL.cloth, 'cloth'); c.appendChild(wimg('cloth')); root.appendChild(c); }
  // 作業布の上の容器
  if (w.mat && !hide('mat')) {
    const b = bottleEl(w.mat, { live: true }); b.dataset.w = 'mat-bottle'; b.classList.add('onmat');
    if (w.mat.rinse >= 1 && w.mat.wipe >= 1 && !st3) b.classList.add('shine');
    place(root, b, MAT_POS.x, MAT_POS.y);
  }
  // 消えていく物
  for (let i = WFX.length - 1; i >= 0; i--) {
    const f = WFX[i], age = fxAge(f);
    if (age > f.dur) { WFX.splice(i, 1); continue; }
    let e;
    if (f.k === 'tag') { e = wimg('tag', 'fx-tag'); e.style.setProperty('--dx', f.dx + 'px'); e.style.setProperty('--dy', f.dy + 'px'); }
    else if (f.k === 'spark') e = el('div', 'fx-spark');
    else if (f.k === 'box') {
      e = el('div', 'fx-box'); e.appendChild(wimg('cbox_back', 'x-back'));
      f.kinds.forEach((k, j) => { const q = boxPos(j); place(e, bottleEl(cleanOf(k, true)), q.x - WL.cbox.x, q.y - WL.cbox.y); });
      e.appendChild(wimg('cbox_front', 'x-front')); e.appendChild(wimg('cbox_lid', 'x-lid'));
    }
    e.style.animationDelay = -age + 's'; if (e.firstChild && f.k === 'box') e.querySelector('.x-lid').style.animationDelay = -age + 's';
    place(root, e, f.x, f.y);
  }
  // ドラッグ中の物
  if (d && d.what !== 'none') washDragNode(root);
}

/* ---------- 操作 ---------- */
let wdrag = null;   // { what, from, idx, item, kind, off, node, ... }
function washHit(e) {
  for (const x of document.elementsFromPoint(e.clientX, e.clientY)) {
    if (x.closest('#hand') || x.closest('#popup')) continue;
    const n = x.closest('[data-w]'); if (n && $('#table').contains(n)) return n.dataset.w;
    if (x.id === 'table') return null;
  }
  return null;
}
function washDown(e) {
  if (wdrag) return;
  press = { wash: true, x: e.clientX, y: e.clientY, button: e.button, w: washHit(e), drag: false };
}
function washMove(e) {
  const pr = press;
  if (S.paused) return;
  if (!pr.drag) {
    if (pr.button !== 0 || Math.hypot(e.clientX - pr.x, e.clientY - pr.y) < OPT.drag) return;
    pr.drag = true;
    const r = $('#table').getBoundingClientRect();
    beginWashDrag(pr.w, { x: (pr.x - r.left) / scale, y: (pr.y - r.top) / scale });
  }
  if (wdrag) moveWashDrag(tablePoint(e));
}
function washUp(pr, e) {
  if (pr.drag) { if (wdrag) endWashDrag(tablePoint(e)); return; }
  if (!pr.w) return;
  const key = pr.w.split(':')[0];
  if (pr.button === 2) { popup(washDesc(key), e.clientX, e.clientY); return; }
  // クリックで済む運び（回収箱→作業布、乾燥棚→作業布）
  const w = W();
  if (key === 'rbox' && w.stage === 1 && !w.mat) { w.mat = { kind: randKind(), tag: true, cork: true, rinse: 0, wipe: 0 }; SFX.clink(); dirty(); }
  else if (key === 'rack' && w.stage === 3 && !w.mat) { const i = +pr.w.split(':')[1]; if (w.rack[i]) { w.mat = cleanOf(w.rack[i], false); w.rack[i] = null; SFX.clink(); rackEmptied(); dirty(); } }
}
function washDesc(key) {
  if (key === 'mat-bottle') {
    const m = W().mat; const nm = ITEM_NAME[m.kind] + 'の容器';
    return W().stage === 3 ? `${nm}：${m.cork ? '仮置き台へ' : '合う栓を付ける'}` : `${nm}：${m.tag || m.cork ? 'タグと栓を外す' : m.rinse < 1 ? '桶に入れて左右に振る' : m.wipe < 1 ? '布でこすって拭く' : '乾燥棚へ'}`;
  }
  return WDESC[key] || '';
}
function beginWashDrag(hit, p) {
  const w = W(); if (!hit) return;
  const [key, si] = hit.split(':'), i = si != null ? +si : null;
  const st3 = w.stage === 3, m = w.mat;
  let d = null;
  if (key === 'rbox' && !st3 && !m) d = { what: 'bottle', from: 'rbox', item: { kind: randKind(), tag: true, cork: true, rinse: 0, wipe: 0 }, off: { x: WBW / 2, y: WBH / 2 } };
  else if (key === 'tag' && m && m.tag) { const tx = MAT_POS.x + WB_TAG[m.kind][0] * WK, ty = MAT_POS.y + WB_TAG[m.kind][1] * WK; d = { what: 'tag', sx: p.x, sy: p.y, ox: tx, oy: ty, kind: m.kind }; }
  else if (key === 'cork' && m && m.cork && !st3) { const cx = MAT_POS.x + WB_CORK[m.kind][0] * WK, cy = MAT_POS.y + WB_CORK[m.kind][1] * WK; d = { what: 'cork', sx: p.x, sy: p.y, ox: cx, oy: cy, kind: m.kind, pulled: false, off: { x: p.x - cx, y: p.y - cy } }; }
  else if (key === 'mat-bottle' && m) {
    if (!st3 && (m.tag || m.cork)) { SFX.deny(); wiggle(); return; }
    d = { what: 'bottle', from: 'mat', item: m, off: { x: p.x - MAT_POS.x, y: p.y - MAT_POS.y } };
  } else if (key === 'rack' && st3 && w.rack[i]) d = { what: 'bottle', from: 'rack', idx: i, item: cleanOf(w.rack[i], false), off: { x: WBW / 2, y: WBH / 2 } };
  else if (key === 'temp' && st3 && w.temp[i]) d = { what: 'bottle', from: 'temp', idx: i, item: cleanOf(w.temp[i], true), off: { x: WBW / 2, y: WBH / 2 } };
  else if (key === 'tray' && st3 && w.tray[i]) d = { what: 'trayCork', from: 'tray', idx: i, kind: w.tray[i], off: { x: CORK_SZ[w.tray[i]][0] * WK / 2, y: CORK_SZ[w.tray[i]][1] * WK / 2 } };
  else if (key === 'cloth') d = { what: 'cloth', from: 'cloth', off: { x: p.x - WL.cloth.x, y: p.y - WL.cloth.y }, last: p };
  if (!d) return;
  d.x = p.x - (d.off ? d.off.x : 0); d.y = p.y - (d.off ? d.off.y : 0);
  if (d.what === 'tag' || d.what === 'cork') { d.x = d.ox; d.y = d.oy; }
  d.last = p; d.dist = 0;
  wdrag = d; SFX.grab(); renderTable();
}
function wiggle() { const n = document.querySelectorAll('#table .onmat .wtag, #table .onmat .wcork'); n.forEach(x => { x.classList.remove('wiggle'); void x.offsetWidth; x.classList.add('wiggle'); }); }
function washDragNode(root) {
  const d = wdrag;
  let e;
  if (d.what === 'bottle') e = bottleEl(d.item);
  else if (d.what === 'trayCork' || d.what === 'cork') e = corkEl(d.kind);
  else if (d.what === 'tag') e = wimg('tag');
  else if (d.what === 'cloth') e = wimg('cloth');
  e.classList.add('wdrag', 'wd-' + d.what);
  if (d.what === 'tag') {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'wstring'); svg.setAttribute('width', TW); svg.setAttribute('height', TH);
    const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line'); svg.appendChild(ln); root.appendChild(svg); d.line = ln;
  }
  d.node = e; d.dipped = false; root.appendChild(e);
  posDrag();
}
function posDrag() {
  const d = wdrag, e = d.node; if (!e) return;
  if (d.dipped) { e.style.left = d.x - WL.bucket.x + 'px'; e.style.top = -10 + 'px'; }
  else { e.style.left = d.x + 'px'; e.style.top = d.y + 'px'; }
  if (d.line) { const nx = d.ox + 2, ny = d.oy + 2; d.line.setAttribute('x1', nx - (d.x - d.ox)); d.line.setAttribute('y1', ny - (d.y - d.oy)); d.line.setAttribute('x2', d.x + 3); d.line.setAttribute('y2', d.y + 3); }
}
const inBucket = p => p.x > WL.bucket.x + 14 && p.x < WL.bucket.x + WL.bucket.w - 14 && p.y > WL.bucket.y && p.y < WL.bucket.y + 110;
let sndAt = 0;
function moveWashDrag(p) {
  const d = wdrag, w = W();
  if (d.what === 'none') return;
  const dx = p.x - d.last.x, dy = p.y - d.last.y; d.last = p;
  if (d.what === 'tag') {
    const ddx = p.x - d.sx, ddy = p.y - d.sy, dist = Math.hypot(ddx, ddy);
    // 糸が張るまでは少しだけ動き、張りきると切れて外れる
    const k = Math.min(1, dist / 46) * 0.6;
    d.x = d.ox + ddx * k; d.y = d.oy + ddy * k;
    if (dist > 46) {
      w.mat.tag = false;
      const n = Math.max(1, dist);
      WFX.push({ k: 'tag', at: performance.now(), dur: 0.7, x: d.x, y: d.y, dx: ddx / n * 26, dy: ddy / n * 26 });
      SFX.paper(); d.what = 'none'; if (d.line) d.line.remove(); d.line = null; dirty(); return;
    }
    posDrag(); return;
  }
  if (d.what === 'cork') {
    const ddx = p.x - d.sx, ddy = p.y - d.sy;
    if (!d.pulled) {
      d.x = d.ox + ddx * 0.25; d.y = d.oy + ddy * 0.25;
      if (Math.hypot(ddx, ddy) > 34) { d.pulled = true; w.mat.cork = false; SFX.pop(); const b = document.querySelector('#table .onmat .wcork'); if (b) b.remove(); }
    } else { d.x = p.x - d.off.x; d.y = p.y - d.off.y; }
    posDrag(); return;
  }
  d.x = p.x - d.off.x; d.y = p.y - d.off.y;
  if (d.what === 'bottle' && d.from === 'mat' && w.stage === 1) {
    const inB = inBucket(p);
    if (inB !== d.dipped) {
      d.dipped = inB;
      if (inB) { const bk = document.querySelector('#table .wbucket'); bk.insertBefore(d.node, bk.querySelector('.b-water')); d.node.classList.add('dipped'); SFX.splash(); }
      else { $('#table').appendChild(d.node); d.node.classList.remove('dipped'); }
    }
    if (inB) {
      d.x = clamp(d.x, WL.bucket.x + 18, WL.bucket.x + WL.bucket.w - 18 - WBW);
      const it = d.item;
      if (it.rinse < 1) {
        it.rinse = Math.min(1, it.rinse + Math.abs(dx) / V2.NAISHOKU.rinse);
        const g = d.node.querySelector('.grime'); if (g) g.style.opacity = 1 - it.rinse;
        d.dist += Math.abs(dx);
        if (d.dist > 70) { d.dist = 0; bubble(d.x + WBW / 2 - WL.bucket.x); if (performance.now() - sndAt > 140) { sndAt = performance.now(); SFX.splash(); } }
        if (it.rinse >= 1) { SFX.sparkle(); bubble(d.x + WBW / 2 - WL.bucket.x, true); refreshHint(); }
      }
    }
  }
  if (d.what === 'cloth' && w.mat && w.stage === 1 && w.mat.rinse >= 1 && w.mat.wipe < 1 && !d.dipped) {
    const r = { x: d.x, y: d.y, w: WL.cloth.w, h: WL.cloth.h }, b = { x: MAT_POS.x + 4, y: MAT_POS.y + 16, w: WBW - 8, h: WBH - 16 };
    if (overlap(r, b)) {
      const m = Math.hypot(dx, dy);
      w.mat.wipe = Math.min(1, w.mat.wipe + m / V2.NAISHOKU.wipe);
      const dr = document.querySelector('#table .onmat .drops'); if (dr) dr.style.opacity = 1 - w.mat.wipe;
      d.dist += m;
      if (d.dist > 40 && performance.now() - sndAt > 110) { d.dist = 0; sndAt = performance.now(); SFX.rub(); }
      if (w.mat.wipe >= 1) { SFX.sparkle(); WFX.push({ k: 'spark', at: performance.now(), dur: 0.8, x: MAT_POS.x + 8, y: MAT_POS.y + 14 }); dirty(); }
    }
  }
  posDrag();
}
function bubble(x, big) {
  const bk = document.querySelector('#table .wbucket'); if (!bk) return;
  for (let n = 0; n < (big ? 5 : 2); n++) {
    const b = el('div', 'fx-bubble'); b.style.left = x + randi(-16, 16) + 'px'; b.style.top = randi(18, 30) + 'px';
    bk.appendChild(b); setTimeout(() => b.remove(), 700);
  }
}
function endWashDrag(p) {
  const d = wdrag, w = W(); wdrag = null;
  if (d.line) d.line.remove();
  const it = d.item;
  const over = r => inRect(p, r);
  if (d.what === 'bottle') {
    if (d.from === 'rbox') { if (over(WL.mat) && !w.mat) { w.mat = it; SFX.clink(); } else SFX.soft(); }
    else if (d.from === 'mat') {
      if (w.stage === 1) {
        if (it.wipe >= 1 && over(WL.rack)) {
          let i = nearest(10, rackPos, p, j => !w.rack[j]);
          if (i >= 0) { w.rack[i] = it.kind; w.mat = null; SFX.clink(); if (w.rack.every(Boolean)) toStage3(); }
        } else SFX.soft();
      } else {
        if (it.cork && over(WL.temp)) { const i = nearest(10, tempPos, p, j => !w.temp[j]); if (i >= 0) { w.temp[i] = it.kind; w.mat = null; SFX.clink(); } }
        else if (it.cork && boxOpen() && over(WL.cbox)) { w.mat = null; putInBox(it.kind); }
        else if (!it.cork && over(WL.rack) && !boxOpen()) { const i = nearest(10, rackPos, p, j => !w.rack[j]); if (i >= 0) { w.rack[i] = it.kind; w.mat = null; SFX.clink(); } }
        else SFX.soft();
      }
    } else if (d.from === 'rack') {
      if (over(WL.mat) && !w.mat) { w.mat = it; w.rack[d.idx] = null; SFX.clink(); rackEmptied(); }
      else if (over(WL.rack)) { const i = nearest(10, rackPos, p, j => !w.rack[j] || j === d.idx); if (i >= 0 && i !== d.idx) { w.rack[i] = w.rack[d.idx]; w.rack[d.idx] = null; } SFX.soft(); }
      else SFX.soft();
    } else if (d.from === 'temp') {
      if (boxOpen() && over(WL.cbox)) { w.temp[d.idx] = null; putInBox(it.kind); }
      else if (over(WL.temp)) { const i = nearest(10, tempPos, p, j => !w.temp[j] || j === d.idx); if (i >= 0 && i !== d.idx) { w.temp[i] = w.temp[d.idx]; w.temp[d.idx] = null; } SFX.soft(); }
      else SFX.soft();
    }
  } else if (d.what === 'cork') {
    if (d.pulled) {
      let i = -1;
      if (over(WL.tray)) for (let j = 0; j < 10; j++) if (!w.tray[j] && inRect(p, trayCell(j))) i = j;
      if (i < 0) i = w.tray.indexOf(null);
      if (i >= 0) w.tray[i] = d.kind;
      SFX.soft();
    }
  } else if (d.what === 'trayCork') {
    const m = w.mat, b = { x: MAT_POS.x - 10, y: MAT_POS.y - 10, w: WBW + 20, h: WBH + 20 };
    if (m && !m.cork && inRect(p, b)) {
      if (m.kind === d.kind) { m.cork = true; w.tray[d.idx] = null; SFX.pop(); }
      else { SFX.buzz(); requestAnimationFrame(() => { const n = document.querySelector('#table .onmat'); if (n) n.classList.add('shake'); }); }
    } else if (over(WL.tray)) {
      let i = -1; for (let j = 0; j < 10; j++) if (inRect(p, trayCell(j)) && !w.tray[j]) i = j;
      if (i >= 0) { w.tray[i] = w.tray[d.idx]; w.tray[d.idx] = null; }
      SFX.soft();
    } else SFX.soft();
  } else if (d.what === 'cloth') SFX.soft();
  dirty();
}
// 中断：持っている物は元の場所へ（途中までの洗い具合はそのまま）
function cancelWashDrag() {
  if (!wdrag) return;
  const d = wdrag; wdrag = null;
  if (d.line) d.line.remove();
  if (d.what === 'cork' && d.pulled) { const i = W().tray.indexOf(null); if (i >= 0) W().tray[i] = d.kind; }
  if (press && press.wash) press = null;
  dirty();
}
function rackEmptied() { if (boxOpen()) { SFX.creak(); toast('乾燥棚が空きました。乾燥棚を片付けて、箱を出しました'); } }
const refreshHint = () => { const h = document.querySelector('#table .p-hint'); if (h) h.textContent = washHint(); };
function toStage3() {
  W().stage = 3;
  SFX.good(); toast('乾燥棚が埋まりました。栓をして箱に詰めます');
}
function putInBox(kind) {
  const w = W();
  w.box.push(kind); SFX.clink();
  if (w.box.length < 10) return;
  // 最後の1本で箱が閉じる
  const g = V2.NAISHOKU.reward;
  WFX.push({ k: 'box', at: performance.now(), dur: 1.9, x: WL.cbox.x, y: WL.cbox.y, kinds: w.box.slice() });
  S.gold += g; S.stats.incomeSide += g; S.stats.washBoxes++;
  setTimeout(() => SFX.thump(), 380); setTimeout(() => SFX.coin(), 700);
  toast(`内職：容器10本を箱に詰めました　手間賃 +${g}G`, 'good');
  clerkFace('happy', 1.6);
  S.wash = Object.assign(newWash(), { cycles: w.cycles + 1 });
}

/* ================= オプション（訪問頻度） ================= */
const OPT_KEY = 'guild-clerk-options';
const DRAG = { min: 1, max: 30, def: 5 };
const OPT = { visit: CFG.VISIT_RATE.def, drag: DRAG.def };
try {
  const o = JSON.parse(localStorage.getItem(OPT_KEY) || 'null');
  if (o && typeof o.visit === 'number') OPT.visit = clamp(o.visit, CFG.VISIT_RATE.min, CFG.VISIT_RATE.max);
  if (o && typeof o.drag === 'number') OPT.drag = clamp(o.drag, DRAG.min, DRAG.max);
} catch (e) { /* noop */ }
function saveOpt() { try { localStorage.setItem(OPT_KEY, JSON.stringify(OPT)); } catch (e) { /* noop */ } }
function renderOptions() {
  $('#optVisit').textContent = '×' + OPT.visit.toFixed(1);
  $('#optDrag').textContent = OPT.drag + 'px';
  $('#optVisitNote').textContent = `来訪の間隔：平均 約${Math.round((CFG.ARRIVAL_GAP[0] + CFG.ARRIVAL_GAP[1]) / 2 / OPT.visit)}分（ゲーム内）`;
}
function setPaused(v) { if (!busy()) v = false; if (v) cancelWashDrag(); S.paused = v; $('#pauseOv').hidden = !v; if (v) { $('#optBox').hidden = true; $('#pauseMain').hidden = false; } }

/* ================= 起動 ================= */
let MANUAL = [];
function fit() {
  const k = Math.min(innerWidth / 1280, innerHeight / 720); scale = k;
  const st = $('#stage'); st.style.transform = `scale(${k})`;
  st.style.left = Math.max(0, (innerWidth - 1280 * k) / 2) + 'px'; st.style.top = Math.max(0, (innerHeight - 720 * k) / 2) + 'px';
}
function setup() {
  MANUAL = manualPages();
  const faces = $('#clerkFaces');
  for (const f of ['eyeopen', 'blink_1', 'blink_2', 'happy', 'sad', 'rest']) { const im = el('img', 'px'); im.src = CLERK_DIR + 'clerk_' + f + '.png'; im.dataset.face = f; im.alt = '受付嬢'; im.hidden = f !== 'eyeopen'; faces.appendChild(im); }
  faces.title = '個人用テーブルを開く';
  faces.addEventListener('click', () => { SFX.init(); openPersonal(); });
  const booths = $('#booths');
  for (let i = 0; i < CFG.SLOTS; i++) {
    const r = el('div', 'booth'); r.style.left = (12 + i * 211) + 'px';
    r.addEventListener('click', () => selectTable(i));
    booths.appendChild(r); boothDom.push({ root: r, key: null });
  }
  const table = $('#table');
  table.addEventListener('pointerdown', onDown);
  addEventListener('pointermove', e => { onMove(e); onEqMove(e); });
  addEventListener('pointerup', e => { onUp(e); onEqUp(e); });
  table.addEventListener('wheel', onWheel, { passive: false });
  $('#stage').addEventListener('contextmenu', e => e.preventDefault());
  $('#equip').addEventListener('pointerdown', e => { if (e.target.closest('.eq-arrow')) return; onEqDown(e); });
  $('#eqPrev').addEventListener('click', () => stepEq(-1));
  $('#eqNext').addEventListener('click', () => stepEq(1));
  $('#btnDay').addEventListener('click', () => { if (S.phase === 'morning') startDay(); else if (S.phase === 'night') nextDay(); });
  addEventListener('keydown', e => {
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { setPaused(!S.paused); e.preventDefault(); return; }
    if (S.paused) return;
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') { stepEq(-1); e.preventDefault(); return; }
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') { stepEq(1); e.preventDefault(); return; }
    const n = parseInt(e.key, 10); if (n >= 1 && n <= CFG.SLOTS) selectTable(n - 1);
  });
  const saved = loadSave();
  if (saved) { $('#btnContinue').hidden = false; $('#btnContinue').textContent = `続きから（${saved.day}日目の早朝）`; $('#btnStart').textContent = 'はじめから'; }
  let armed = false;
  $('#btnStart').addEventListener('click', () => {
    if (loadSave() && !armed) { armed = true; $('#btnStart').textContent = '記録を消してはじめから（もう一度押す）'; return; }
    SFX.init(); clearSave(); reset(); $('#titleOv').hidden = true; toMorning();
  });
  $('#btnContinue').addEventListener('click', () => { const d = loadSave(); if (!d) return; SFX.init(); applySave(d); $('#titleOv').hidden = true; toMorning(); });
  $('#btnNextDay').addEventListener('click', toNight);
  $('#btnPause').addEventListener('click', () => setPaused(!S.paused));
  $('#btnResume').addEventListener('click', () => setPaused(false));
  $('#btnOptions').addEventListener('click', () => { $('#pauseMain').hidden = true; $('#optBox').hidden = false; renderOptions(); });
  $('#btnOptBack').addEventListener('click', () => { $('#pauseMain').hidden = false; $('#optBox').hidden = true; });
  $('#optVisitDown').addEventListener('click', () => { OPT.visit = Math.round(clamp(OPT.visit - 0.1, CFG.VISIT_RATE.min, CFG.VISIT_RATE.max) * 10) / 10; saveOpt(); renderOptions(); });
  $('#optVisitUp').addEventListener('click', () => { OPT.visit = Math.round(clamp(OPT.visit + 0.1, CFG.VISIT_RATE.min, CFG.VISIT_RATE.max) * 10) / 10; saveOpt(); renderOptions(); });
  $('#optVisitReset').addEventListener('click', () => { OPT.visit = CFG.VISIT_RATE.def; saveOpt(); renderOptions(); });
  $('#optDragDown').addEventListener('click', () => { OPT.drag = clamp(OPT.drag - 1, DRAG.min, DRAG.max); saveOpt(); renderOptions(); });
  $('#optDragUp').addEventListener('click', () => { OPT.drag = clamp(OPT.drag + 1, DRAG.min, DRAG.max); saveOpt(); renderOptions(); });
  $('#optDragReset').addEventListener('click', () => { OPT.drag = DRAG.def; saveOpt(); renderOptions(); });
  const sb = $('#btnSound'); const sl = () => { sb.textContent = SFX.isOn() ? '音 入' : '音 切'; }; sl();
  sb.addEventListener('click', () => { SFX.init(); SFX.setOn(!SFX.isOn()); sl(); });
  addEventListener('resize', fit); fit();
  reset();
}
let last = performance.now();
function frame(t) {
  const dt = Math.min(0.1, (t - last) / 1000); last = t;
  if (busy() && !S.paused) update(dt);
  render();
  requestAnimationFrame(frame);
}
Promise.all([loadImg('adv', 'img/adventurers.png'), loadImg('bandage', 'img/bandage.png'), ...AILMENTS.map(a => loadImg('ail_' + a, `img/ail_${a}.png`))]).then(() => { setup(); requestAnimationFrame(frame); });

// 動作確認用
window.__v2 = { S, update, dirty, knowable, hasDocDefect, finishReception, finishReturn, tbl, startDay, toNight, nextDay, selectTable, openPersonal, stepSet, newWash, genParty, genQuest, categoryOf, requiredItems, extAttr, ailCandidates, seatReturn };
})();
