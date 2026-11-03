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
const ITEM_NAME2 = { gel: '回復ジェル', elixir: '霊薬' };

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
  order: { x: 114, y: 398, w: 96, h: 78, label: '注文用紙' },
  calendar: { x: 598, y: 398, w: 112, h: 78 },
  trash: { x: 718, y: 398, w: 74, h: 78 },
};
const TOOL_DEF = {
  pen: { name: '筆記具', desc: '受注申請用紙の却下事項に、左クリックでチェック、右クリックでチェックを消す', home: [226, 414] },
  ar: { name: '認可/却下用ハンコ', desc: '受注申請用紙に押す。ホイール上で「認可」、下で「却下」', home: [282, 414] },
  seal: { name: 'ギルド承認印', desc: '終了対応の受注申請用紙・クエスト要請の写し、注文用紙に押す', home: [338, 414] },
  q2: { name: '数量ハンコ「2」', desc: '注文用紙の品の枠に押す', home: [400, 414] },
  q5: { name: '数量ハンコ「5」', desc: '注文用紙の品の枠に押す', home: [452, 414] },
  q10: { name: '数量ハンコ「10」', desc: '注文用紙の品の枠に押す', home: [504, 414] },
};
const PAPER = { quest: [196, 262], card: [214, 118], apply: [196, 250], pform: [196, 250], order: [196, 206] };
const BOOK = { roster: [140, 190], manual: [196, 262] };
const SMALL_DESC = {
  gel: '回復ジェル（ギルド支給品）。負傷した人に渡す',
  elixir: '霊薬（ギルド支給品）。幽霊になった人に渡す',
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
};
const tbl = () => S.tables[S.selected];
function newStats() {
  return { visitors: 0, approved: 0, rejected: 0, recMiss: 0, returned: 0, retMiss: 0, lost: 0, incomeHQ: 0, incomeOwner: 0, used: { gel: 0, elixir: 0 }, closedAway: 0, orderCost: 0 };
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
  for (const [k, d] of Object.entries(TOOL_DEF)) addObj(t, { cls: 'tool', tool: k, x: d.home[0], y: d.home[1], face: 'approve' });
}
const objW = o => o.cls === 'small' || o.cls === 'tool' ? SM : o.cls === 'book' ? BOOK[o.book][0] * 2 : PAPER[o.doc][0];
const objH = o => o.cls === 'small' || o.cls === 'tool' ? SM : o.cls === 'book' ? BOOK[o.book][1] : PAPER[o.doc][1];
const rectOf = o => ({ x: o.x, y: o.y, w: objW(o), h: objH(o) });
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
function obstacles(t, except) {
  const r = t.objs.filter(o => (o.cls === 'small' || o.cls === 'tool') && !o.held && o !== except).map(rectOf);
  for (const f of Object.values(FIX)) r.push({ x: f.x, y: f.y, w: f.w, h: f.h });
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
  const d = TOOL_DEF[o.tool]; o.held = false; o.x = d.home[0]; o.y = d.home[1];
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
  if (i === S.selected) return;
  stowUtilities(tbl());
  S.selected = i; SFX.click(); dirty();
}

/* ================= パーティの生成と判定（縮小版） ================= */
function evaluateCore(members, quest) {
  const d = rankIdx(quest.diff);
  const good = m => JOB_STRONG[m.job] === quest.type;
  const high = m => rankIdx(m.rank) >= d;
  const n = members.length;
  return {
    comp: !(members.some(m => good(m) && high(m)) || members.filter(m => good(m) || high(m)).length >= 3),
    short: (quest.diff === 'A' && n <= 2) || (quest.diff === 'S' && n <= 3),
  };
}
function fillPhrase(tpl, diff) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => k === 'm' ? pick(MONSTER_NAMES[diff]) : pick(QUEST_WORDS[k]));
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
      return { gid, job, rank: RANKS[r], status: 'ok', name: '' };
    });
    const type = pick(QUEST_TYPES);
    const diff = RANKS[clamp(base + +weighted({ '-1': 22, 0: 45, 1: 26, 2: 7 }), 0, 3)];
    const quest = { type, diff, hours: randi(1, maxH) };
    const ev = evaluateCore(members, quest);
    const cat = ev.comp && ev.short ? 'both' : ev.comp ? 'comp' : ev.short ? 'short' : 'fit';
    best = { members, quest, ev };
    if (cat === target) break;
  }
  const usedNames = new Set();
  for (const m of best.members) { const list = NAMES[META.chars[m.gid].g].filter(x => !usedNames.has(x)); m.name = pick(list); usedNames.add(m.name); }
  const q = best.quest;
  q.phrase = fillPhrase(pick(QUEST_PHRASES[q.type]), q.diff);
  q.title = pick(Math.random() < 0.4 ? QUEST_TITLES2.共通 : QUEST_TITLES2[q.type]);
  q.requester = pick(REQUESTERS);
  q.pic = pick(QUEST_PICS[q.type]);
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
    id: S.seq++, members: best.members, quest: q, ev: best.ev, docs,
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
  addObj(t, { cls: 'paper', doc: 'quest', personal: true, x: qx, y: qy, data: { ...p.quest, original: p.docs.original, signed: false } });
  if (p.docs.roster) {
    const sides = rosterSides(p);
    addObj(t, { cls: 'book', book: 'roster', personal: true, binding: p.docs.binding, flip: 0, x: randi(260, 480), y: randi(40, 180), sides, partyName: p.name });
  }
  shuffle(p.members).forEach((m, k) => {
    if (!m.card) return;
    addObj(t, { cls: 'paper', doc: 'card', personal: true, x: randi(380, 570) + k * 8, y: randi(50, 240) + k * 14, data: { gid: m.gid, name: m.name, job: m.job, rank: m.rank, expiry: m.expiry } });
  });
}
function rosterSides(p) {
  const sides = [{ cover: true, html: `<div class="r-cover"><div class="r-t">パーティ名簿</div><div class="r-n">${p.name}</div></div>` },
    { html: '<div class="r-note">ギルド運営本部 発行<br>記載は1ページにつき1名</div>' }];
  for (const m of shuffle(p.members)) sides.push({ html: `<div class="r-page"><div class="r-k">名前</div><div class="r-v">${m.name}</div><div class="r-k">職業</div><div class="r-v">${m.job}</div><div class="r-k">ランク</div><div class="r-v big">${m.rank}</div></div>` });
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
  if (!p.retDocs.noCopy) addObj(t, { cls: 'paper', doc: 'quest', personal: true, x: randi(20, 260), y: randi(26, 120), data: { ...p.quest, original: false, signed: true } });
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
  t.state = 'leaving'; t.until = S.rt + CFG.LEAVE_SEC + (extra || 0);
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
    const danger = (p.ev.comp ? 1 : 0) + (p.ev.short ? 1 : 0);
    const n = p.members.length;
    if (danger === 0) for (const m of p.members) m.status = Math.random() < CFG.HURT_RATE_FIT ? 'hurt' : 'ok';
    else if (danger === 1) {
      const kk = n >= 2 ? randi(1, Math.min(3, n - 1)) : 0;
      const g = new Set(shuffle(p.members).slice(0, kk));
      for (const m of p.members) m.status = g.has(m) ? 'ghost' : (Math.random() < CFG.HURT_RATE_UNFIT ? 'hurt' : 'ok');
    }
    p.lost = danger >= 2;
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
function finishReturn(t, form) {
  const p = t.party;
  const items = t.objs.filter(o => o.cls === 'small' && o.sub === 'item' && !o.held);
  const need = { gel: p.members.filter(m => m.status === 'hurt').length, elixir: p.members.filter(m => m.status === 'ghost').length };
  const got = { gel: items.filter(o => o.item === 'gel').length, elixir: items.filter(o => o.item === 'elixir').length };
  const miss = [];
  if (need.gel !== got.gel || need.elixir !== got.elixir) miss.push('渡す数が不適切');
  if (items.some(o => !o.tagged)) miss.push('タグの付け忘れ');
  const copy = t.objs.find(o => o.personal && o.doc === 'quest');
  if (copy && !copy.data.stamps?.some(s => s.t === 'seal')) miss.push('写しへの承認印の押し忘れ');
  p.mistakes += miss.length;
  S.stats.retMiss += miss.length;
  S.stats.used.gel += got.gel; S.stats.used.elixir += got.elixir;
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
function nextDay() { if (S.phase !== 'night') return; stowUtilities(tbl()); S.day++; save(); toMorning(); }

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
    localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, day: S.day, gold: S.gold, shelf: S.shelf, stock: S.stock, foot: S.foot, pending: S.pending, quests: S.quests.concat(S.returnQueue), seq: S.seq, manualFlip: S.manualFlip }));
  } catch (e) { /* noop */ }
}
function loadSave() { try { const d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); return d && d.v === 1 ? d : null; } catch (e) { return null; } }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* noop */ } }
function reset() {
  Object.assign(S, { day: 1, gold: CFG.START_GOLD, shelf: makeShelf(V2.START_STOCK), stock: [], foot: [], pending: [], bag: { manual: true, tags: true }, manualFlip: 0, quests: [], returnQueue: [], selected: 0, hand: null, eq: 0, stats: newStats(), seq: 1 });
  for (const t of S.tables) { t.state = 'empty'; t.party = null; t.objs = []; makeTools(t); }
}
function applySave(d) {
  reset();
  Object.assign(S, { day: d.day, gold: d.gold, shelf: d.shelf, stock: d.stock || [], foot: d.foot || [], pending: d.pending || [], quests: d.quests || [], seq: d.seq || 1, manualFlip: d.manualFlip || 0 });
}

/* ================= 画面：テーブル ================= */
let isDirty = true;
function dirty() { isDirty = true; }
function sprite(gid, status, scale) {
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
    x.drawImage(IMGS.adv, sx, sy, w, h, 0, 0, w * scale, h * scale);
    if (status === 'hurt') x.drawImage(IMGS.bandage, 0, 0, w, h, 0, 0, w * scale, h * scale);
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
  if (o.doc === 'quest') {
    e.appendChild(el('div', 'q-title', d.title));
    const im = el('img', 'px q-pic'); im.src = `img/qpic_${String(d.pic).padStart(2, '0')}.png`; e.appendChild(im);
    e.appendChild(el('div', 'q-phrase', d.phrase));
    const row = el('div', 'q-row'); row.appendChild(el('span', '', `難易度 ${d.diff}級`)); row.appendChild(el('span', '', `所要 ${d.hours}時間`)); e.appendChild(row);
    e.appendChild(el('div', 'q-req', '依頼者：' + d.requester));
    const sig = el('div', 'q-sig'); sig.appendChild(el('span', 'k', '完了時サイン'));
    if (d.signed) sig.appendChild(el('span', 'sig', d.requester.split(' ').pop().slice(0, 4) + '〆'));
    e.appendChild(sig);
    if (d.original) e.appendChild(el('div', 'q-orig', '（原本）'));
  } else if (o.doc === 'card') {
    e.appendChild(el('div', 'c-head', '冒険者証　ギルド運営本部'));
    const b = el('div', 'c-body'); b.appendChild(photo(d.gid));
    const info = el('div', 'c-info');
    info.appendChild(el('div', 'c-name', d.name));
    info.appendChild(el('div', '', `職業　${d.job}`));
    info.appendChild(el('div', '', `ランク　${d.rank}`));
    info.appendChild(el('div', 'c-exp', '更新期限　' + calText(calFrom(d.expiry)).replace(CAL.ERA, '')));
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
  if (o.tool === 'pen') { const im = el('img', 'px'); im.src = 'img/dep_quill.png'; e.appendChild(im); }
  else {
    const im = el('img', 'px'); im.src = 'img/item_stamp.png'; e.appendChild(im);
    const lab = o.tool === 'ar' ? (o.face === 'approve' ? '認' : '却') : o.tool === 'seal' ? '承' : o.tool.slice(1);
    e.appendChild(el('span', 'tlab ' + (o.tool === 'ar' ? o.face : o.tool), lab));
  }
  return e;
}
function fixtureEls(t, root) {
  for (const k of ['apply', 'order']) {
    const f = FIX[k];
    const e = el('div', 'fix tray tray-' + k); e.dataset.fix = k;
    Object.assign(e.style, { left: f.x + 'px', top: f.y + 'px', width: f.w + 'px', height: f.h + 'px' });
    e.appendChild(el('div', 'tray-paper')); e.appendChild(el('div', 'tray-label', f.label));
    root.appendChild(e);
  }
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
function renderTable() {
  const t = tbl();
  const root = $('#table'); root.innerHTML = '';
  root.appendChild(el('div', 'handover-zone', '↑ 依頼者へ渡す'));
  root.appendChild(el('div', 'putaway-zone'));
  fixtureEls(t, root);
  for (const o of t.objs) {
    if (o.held) continue;
    const e = o.cls === 'paper' ? paperEl(o) : o.cls === 'book' ? bookEl(o) : o.cls === 'small' ? smallEl(o) : toolEl(o);
    e.dataset.id = o.id;
    e.style.left = o.x + 'px'; e.style.top = o.y + 'px';
    if (o.cls === 'paper' || o.cls === 'book') e.style.zIndex = o.z; else e.style.zIndex = 100000;
    root.appendChild(e);
  }
}

/* ================= 画面：テーブルの列（上） ================= */
const boothDom = [];
function renderLobby() {
  const morningNight = S.phase === 'morning' || S.phase === 'night';
  $('#dayCtl').hidden = !morningNight;
  if (morningNight) {
    $('#dayCtlText').textContent = S.phase === 'morning' ? '開店の準備（品出しはいつでもできます）' : '明日の準備（注文用紙は郵便物入れへ）';
    $('#btnDay').textContent = S.phase === 'morning' ? '営業開始' : '次の日へ';
  }
  for (const t of S.tables) {
    const b = boothDom[t.i];
    const p = t.party;
    const key = t.state + '|' + (p ? p.id : '') + '|' + bubbleText(p) + '|' + (p && t.state === 'returned' ? p.members.map(m => m.status).join() : '');
    if (key !== b.key) {
      b.key = key; b.root.innerHTML = '';
      const plate = el('div', 'plate'); plate.appendChild(el('span', 'no', `テーブル${t.i + 1}`));
      const lab = { empty: '空き', reception: '受注対応待ち', returned: '終了対応待ち', leaving: '退出' }[t.state];
      plate.appendChild(el('span', 'badge ' + t.state, lab)); b.root.appendChild(plate);
      if (p) {
        const party = el('div', 'party');
        if (t.enter) { party.classList.add('enter'); t.enter = false; }
        if (t.state === 'leaving') party.classList.add('leave');
        for (const m of p.members) party.appendChild(sprite(m.gid, p.returned ? m.status : 'ok', 2));
        b.root.appendChild(party);
        const bt = bubbleText(p); if (bt) b.root.appendChild(el('div', 'bubble', bt));
      } else b.root.appendChild(el('div', 'empty-msg', '— 空き —'));
    }
    b.root.classList.toggle('sel', t.i === S.selected);
  }
  $('#queueInfo').textContent = `クエスト中 ${S.quests.length}組　帰還待ち ${S.returnQueue.length}組`;
}

/* ================= 画面：設備窓 ================= */
function setEq(id) { const i = EQS.findIndex(e => e.id === id); if (i >= 0 && i !== S.eq) { S.eq = i; dirty(); } }
function stepEq(d) { S.eq = (S.eq + d + EQS.length) % EQS.length; SFX.click(); dirty(); }
function boxEl(b, cls) {
  const e = el('div', 'box ' + (cls || ''));
  const type = PACK_OF[b.n] || 'crate_s';
  const im = el('img', 'px box-img'); im.src = `img/item_${type}_open.png`; e.appendChild(im);
  const inner = el('div', 'box-inner');
  for (let i = 0; i < b.left; i++) { const it = el('img', 'px'); it.src = `img/item_${b.kind}.png`; inner.appendChild(it); }
  e.appendChild(inner);
  const lab = el('img', 'px box-label'); lab.src = `img/item_${b.kind}.png`; e.appendChild(lab);
  e.appendChild(el('span', 'box-n', `${b.left}/${b.n}`));
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
    const tr = el('div', 'etrash'); tr.dataset.etrash = '1'; tr.appendChild(el('div', 'trash-can')); tr.appendChild(el('span', '', '空き箱'));
    foot.appendChild(tr);
    body.appendChild(foot);
    body.appendChild(el('div', 'eq-note', `棚 ${shelfCount()}/${V2.SHELF_MAX}　足元の箱 ${S.foot.length}/${V2.FOOT_MAX}`));
  } else if (eq.id === 'stock') {
    const g = el('div', 'stockgrid');
    for (let i = 0; i < V2.STOCK_MAX; i++) {
      const c = el('div', 'stslot'); c.dataset.stock = i;
      if (S.stock[i]) c.appendChild(boxEl(S.stock[i], 'closed'));
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
let lastClockMin = -1;
function render() {
  renderTop(); renderLobby();
  const cm = Math.floor(S.clock);
  if (cm !== lastClockMin) { lastClockMin = cm; const ct = document.querySelector('.calendar .cal-t'); if (ct) ct.textContent = hhmm(S.clock); }
  if (isDirty) { isDirty = false; renderTable(); renderEq(); }
  renderHand();
  renderClerk();
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
  if (f !== FACE.shown) { FACE.shown = f; $('#clerkImg').src = CLERK_DIR + 'clerk_' + f + '.png'; }
}
function showReport() {
  const st = S.stats;
  $('#repTitle').textContent = `${S.day}日目　営業成績`;
  const rows = [
    ['来訪したパーティ', st.visitors + '組'], ['閉店で帰したパーティ', st.closedAway + '組'],
    ['認可', st.approved + '件'], ['却下', st.rejected + '件'], ['受注対応のミス', st.recMiss + '件', st.recMiss],
    ['帰還したパーティ', st.returned + '組'], ['戻らなかったパーティ', st.lost + '組', st.lost], ['終了対応のミス', st.retMiss + '件', st.retMiss],
    ['使った回復ジェル', st.used.gel + '個'], ['使った霊薬', st.used.elixir + '個'],
    ['運営本部から', st.incomeHQ + 'G'], ['依頼主から', st.incomeOwner + 'G'],
    ['クエスト中のパーティ', S.quests.length + S.returnQueue.length + '組'], ['物品棚', `${shelfCount()}/${V2.SHELF_MAX}`],
  ];
  const g = el('div', 'rep-grid');
  for (const r of rows) { const d = el('div', r[2] ? 'neg' : ''); d.appendChild(el('span', '', r[0])); d.appendChild(el('span', '', r[1])); g.appendChild(d); }
  const tot = el('div', 'total'); tot.appendChild(el('span', '', `本日の収入 ${st.incomeHQ + st.incomeOwner}G　／　支店運営費 ${S.gold}G`)); g.appendChild(tot);
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
  const hit = hitAt(e);
  press = { x: e.clientX, y: e.clientY, button: e.button, hit, drag: false, pid: e.pointerId };
  if (e.button === 0 && isDraggable(hit.obj)) {
    const p = tablePoint(e); press.off = { x: p.x - hit.obj.x, y: p.y - hit.obj.y };
  }
}
function onMove(e) {
  moveHand(e);
  if (!press || press.button !== 0) return;
  const o = press.hit.obj;
  if (!press.drag) {
    if (!isDraggable(o) || Math.hypot(e.clientX - press.x, e.clientY - press.y) < 5) return;
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
  hideZones();
  if (pr.drag) { dropObj(pr.hit.obj, e); return; }
  if (Math.hypot(e.clientX - pr.x, e.clientY - pr.y) >= 5) return;
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
  // 上の端：依頼者へ渡す
  if (p.y < HANDOVER_H && o.cls === 'paper') {
    if (tryHandOver(t, o)) return;
  }
  // 右の端・設備窓：しまう／郵便
  if (p.x > TW - PUTAWAY_W || overEq) {
    if (o.cls === 'book' && o.util) { putAwayBook(o); return; }
    if (o.cls === 'paper' && o.doc === 'order') {
      if (EQS[S.eq].id === 'mail' && o.data.stamps.some(s => s.t === 'seal')) { sendOrder(o); return; }
    }
  }
  // ゴミ箱・用紙入れ（取り出した用紙だけ）
  if (o.cls === 'paper' && o.tray) {
    if (inRect(p, FIX.trash)) { t.objs = t.objs.filter(x => x !== o); SFX.paper(); dirty(); return; }
    const blank = !(o.data.stamps || []).length && !Object.values(o.data.checks || {}).some(Boolean) && !Object.values(o.data.qty || {}).some(Boolean);
    if (blank && inRect(p, FIX[o.tray])) { t.objs = t.objs.filter(x => x !== o); SFX.paper(); dirty(); return; }
  }
  // 普通に置く（テーブルの中へ収める）
  if (o.cls === 'small') { settle(t, o); }
  else { o.x = clamp(o.x, -objW(o) + 40, TW - 40); o.y = clamp(o.y, HANDOVER_H, TH - 40); }
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
  if (t.objs.some(o => o.tray === kind)) { SFX.deny(); toast('用紙はテーブルに1枚まで出せます'); return; }
  const [w, h] = PAPER[kind];
  const sp = freeSpot(t, w, h);
  const data = kind === 'apply' ? { checks: { comp: false, short: false, docs: false }, stamps: [] } : { qty: { gel: 0, elixir: 0 }, stamps: [] };
  addObj(t, { cls: 'paper', doc: kind, tray: kind, x: sp.x, y: sp.y, data, boundTo: null });
  SFX.paper(); dirty();
}
// ハンコを押せるか（押すべき物にだけ押せる）
function stampTarget(tool, o, hit) {
  const t = tbl();
  if (!o || o.cls !== 'paper') return null;
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
  if (Math.hypot(e.clientX - epress.x, e.clientY - epress.y) < 5) return;
  let src = null;
  if (epress.shelf != null && S.shelf[epress.shelf]) src = `img/item_${S.shelf[epress.shelf]}.png`;
  else if (epress.foot != null && S.foot[epress.foot]) src = `img/item_${PACK_OF[S.foot[epress.foot].n] || 'crate_s'}_open.png`;
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
  if (Math.hypot(e.clientX - pr.x, e.clientY - pr.y) >= 5) return;
  eqClick(pr, e);
}
function overTable(e) { const r = $('#table').getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; }
function eqDrop(pr, e) {
  const t = tbl();
  if (overTable(e)) {
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
      if (btn === 0) { S.shelf[pr.shelf] = null; const t = tbl(); const sp = smallSpot(t); const o = addObj(t, { cls: 'small', sub: 'item', item: k, util: true, x: sp.x, y: sp.y }); settle(t, o); SFX.clink(); dirty(); return; }
      if (btn === 2) { const b = S.foot.find(x => x.kind === k && x.left < x.n); if (b) { S.shelf[pr.shelf] = null; b.left++; SFX.clink(); dirty(); } else SFX.deny(); return; }
    }
    if (pr.foot != null && S.foot[pr.foot]) {
      const b = S.foot[pr.foot];
      if (btn === 0) { if (b.left > 0 && shelfPut(b.kind)) { b.left--; SFX.clink(); dirty(); } else SFX.deny(); return; }
      if (btn === 2) { if (S.stock.length < V2.STOCK_MAX) { S.foot.splice(pr.foot, 1); S.stock.push(b); SFX.thump(); dirty(); } else SFX.deny(); return; }
    }
  } else if (eq === 'stock') {
    if (pr.stock != null && S.stock[pr.stock] && btn === 0) {
      if (S.foot.length >= V2.FOOT_MAX) { SFX.deny(); toast(`物品棚の足元に置ける箱は${V2.FOOT_MAX}つまでです`); return; }
      S.foot.push(S.stock.splice(pr.stock, 1)[0]); SFX.thump(); toast('箱を物品棚の足元に運びました'); dirty(); return;
    }
  } else if (eq === 'bag') {
    if (pr.bag && btn === 0) { takeFromBag(pr.bag, null); return; }
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

/* ================= オプション（訪問頻度） ================= */
const OPT_KEY = 'guild-clerk-options';
const OPT = { visit: CFG.VISIT_RATE.def };
try { const o = JSON.parse(localStorage.getItem(OPT_KEY) || 'null'); if (o && typeof o.visit === 'number') OPT.visit = clamp(o.visit, CFG.VISIT_RATE.min, CFG.VISIT_RATE.max); } catch (e) { /* noop */ }
function saveOpt() { try { localStorage.setItem(OPT_KEY, JSON.stringify(OPT)); } catch (e) { /* noop */ } }
function renderOptions() {
  $('#optVisit').textContent = '×' + OPT.visit.toFixed(1);
  $('#optVisitNote').textContent = `来訪の間隔：平均 約${Math.round((CFG.ARRIVAL_GAP[0] + CFG.ARRIVAL_GAP[1]) / 2 / OPT.visit)}分（ゲーム内）`;
}
function setPaused(v) { if (!busy()) v = false; S.paused = v; $('#pauseOv').hidden = !v; if (v) { $('#optBox').hidden = true; $('#pauseMain').hidden = false; } }

/* ================= 起動 ================= */
let MANUAL = [];
function fit() {
  const k = Math.min(innerWidth / 1280, innerHeight / 720); scale = k;
  const st = $('#stage'); st.style.transform = `scale(${k})`;
  st.style.left = Math.max(0, (innerWidth - 1280 * k) / 2) + 'px'; st.style.top = Math.max(0, (innerHeight - 720 * k) / 2) + 'px';
}
function setup() {
  MANUAL = manualPages();
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
Promise.all([loadImg('adv', 'img/adventurers.png'), loadImg('bandage', 'img/bandage.png')]).then(() => { setup(); requestAnimationFrame(frame); });

// 動作確認用
window.__v2 = { S, update, dirty, knowable, hasDocDefect, finishReception, tbl, startDay, toNight, nextDay, selectTable };
})();
