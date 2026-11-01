// GuildClerkWorkGame 本体（第1段階：営業時間）
(() => {
'use strict';

/* ---------- 小道具 ---------- */
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
const ITEM_NAME = { gel: '回復ジェル', elixir: '霊薬' };
const STATE_LABEL = { empty: '空き', reception: '受注対応待ち', departing: '出発', quest: '進行中', returned: '終了対応待ち', leaving: '退出' };

/* ---------- 画像 ---------- */
const IMGS = {};
function loadImg(key, src) {
  return new Promise(res => { const im = new Image(); im.onload = res; im.onerror = res; im.src = src; IMGS[key] = im; });
}

/* ---------- 状態 ---------- */
const S = {
  day: 1, gold: CFG.START_GOLD, stock: { ...CFG.START_STOCK },
  clock: CFG.OPEN, phase: 'title', paused: false,
  slots: Array.from({ length: CFG.SLOTS }, (_, i) => ({ i, state: 'empty', party: null, until: 0, enter: false })),
  selected: 0, hand: null, order: null, ordered: null, packages: [], sheet: null, nextArrival: CFG.OPEN + 8, seq: 1, rt: 0, stats: newStats(),
};
function newStats() {
  return {
    visitors: 0, approved: 0, approveWrong: 0, rejected: 0, rejectOk: 0, rejectReason: 0, rejectWrong: 0,
    returned: 0, success: 0, fail: 0, allowances: 0, allowanceMiss: 0, gelUsed: 0, elixirUsed: 0,
    incomeHQ: 0, incomeOwner: 0, closedAway: 0, carriedIn: 0,
  };
}
const selSlot = () => S.slots[S.selected];
const busy = () => S.phase === 'business' || S.phase === 'afterhours';

/* ---------- 判定 ---------- */
function evaluate(members, quest) {
  const d = rankIdx(quest.diff);
  const good = m => JOB_STRONG[m.job] === quest.type;
  const high = m => rankIdx(m.rank) >= d;
  const cond1 = members.some(m => good(m) && high(m));
  const cond2 = members.filter(m => good(m) || high(m)).length >= 3;
  const n = members.length;
  return {
    comp: !(cond1 || cond2),
    short: (quest.diff === 'A' && n <= 2) || (quest.diff === 'S' && n <= 3),
  };
}
const problemsOf = ev => REASONS.filter(r => ev[r.id]).map(r => r.id);
const reasonText = ids => ids.map(id => REASONS.find(r => r.id === id).label).join('・');

/* ---------- パーティの生成 ---------- */
function genParty() {
  const used = new Set(S.slots.filter(s => s.party).flatMap(s => s.party.members.map(m => m.gid)));
  const pool = [...Array(META.chars.length).keys()].filter(g => !used.has(g));
  const target = weighted(CFG.CATEGORY_WEIGHT);
  const maxH = clamp(Math.floor((CFG.CLOSE - S.clock) / 60), 1, 5);
  let best = null;
  for (let t = 0; t < 500; t++) {
    const n = Math.min(pool.length, +weighted({ 1: 10, 2: 28, 3: 36, 4: 26 }));
    const base = +weighted({ 0: 34, 1: 30, 2: 23, 3: 13 });
    const members = shuffle(pool).slice(0, n).map(gid => {
      const look = META.chars[gid].look;
      const job = Math.random() < LOOK_MATCH_RATE ? LOOK_JOB[look] : pick(JOBS);
      const r = clamp(base - (Math.random() < 0.35 ? 1 : 0) + (Math.random() < 0.1 ? 1 : 0), 0, 3);
      return { gid, job, rank: RANKS[r], status: 'ok', name: '' };
    });
    const type = pick(QUEST_TYPES);
    const diff = RANKS[clamp(base + +weighted({ '-1': 22, 0: 45, 1: 26, 2: 7 }), 0, 3)];
    const quest = { type, diff, hours: randi(1, maxH) };
    const ev = evaluate(members, quest);
    const cat = ev.comp && ev.short ? 'both' : ev.comp ? 'comp' : ev.short ? 'short' : 'fit';
    best = { members, quest, ev };
    if (cat === target) break;
  }
  const usedNames = new Set();
  for (const m of best.members) {
    const list = NAMES[META.chars[m.gid].g].filter(n => !usedNames.has(n));
    m.name = pick(list); usedNames.add(m.name);
  }
  best.quest.title = pick(QUEST_TITLES[best.quest.type][best.quest.diff]);
  return {
    id: S.seq++, members: best.members, quest: best.quest, ev: best.ev,
    name: best.members[0].name + 'のパーティ',
    checks: { comp: false, short: false }, mistakes: 0, wrongApproval: false,
    counter: [], bubble: null, outcome: null, departAt: 0, plannedReturn: 0, returnAt: 0, stamped: false,
  };
}

/* ---------- 進行 ---------- */
function say(p, lines, sec) { p.bubble = { text: pick(lines), until: sec == null ? Infinity : S.rt + sec }; }
function bubbleText(p) { return p && p.bubble && S.rt < p.bubble.until ? p.bubble.text : ''; }

function spawnParty(slot) {
  slot.party = genParty(); slot.state = 'reception'; slot.enter = true;
  say(slot.party, LINES.arrive);
  S.stats.visitors++;
  toast(`窓口${slot.i + 1}：${slot.party.name}が受注の申請に来ました`);
  SFX.bell();
}

function setLeaving(slot, lines) {
  slot.state = 'leaving'; slot.until = S.rt + CFG.LEAVE_SEC;
  if (lines) say(slot.party, lines, CFG.LEAVE_SEC);
}

function freeSlot(slot) {
  slot.state = 'empty'; slot.party = null;
  if (S.phase === 'business') {
    const soon = S.clock + rand(CFG.REFILL_GAP[0], CFG.REFILL_GAP[1]);
    if (S.nextArrival < soon) S.nextArrival = soon;
  }
}

function approve(slot) {
  const p = slot.party; if (!p || slot.state !== 'reception') return;
  const probs = problemsOf(p.ev);
  S.stats.approved++; p.decision = 'approve'; SFX.stamp();
  if (probs.length) {
    p.mistakes++; p.wrongApproval = true; S.stats.approveWrong++; clerkFace('sad', 1.4);
    toast(`窓口${slot.i + 1}：誤った認可です（本来は却下：${reasonText(probs)}）`, 'bad');
  }
  // 結果はこの時点で決まる（サイコロではなく適否で決まり、負傷の有無と幽霊になる人だけ抽選）
  const n = p.members.length;
  p.departAt = S.clock; p.plannedReturn = S.clock + p.quest.hours * 60;
  p.returnAt = p.plannedReturn; p.outcome = 'success';
  if (probs.length === 0) {
    for (const m of p.members) m.status = Math.random() < CFG.HURT_RATE_FIT ? 'hurt' : 'ok';
  } else if (probs.length === 1) {
    const k = n >= 2 ? randi(1, Math.min(3, n - 1)) : 0;
    const ghosts = new Set(shuffle(p.members).slice(0, k));
    for (const m of p.members) m.status = ghosts.has(m) ? 'ghost' : (Math.random() < CFG.HURT_RATE_UNFIT ? 'hurt' : 'ok');
  } else {
    for (const m of p.members) m.status = 'ghost';
    p.outcome = 'fail';
    p.returnAt = S.clock + Math.max(10, Math.round(p.quest.hours * 60 * rand(CFG.WIPE_RETURN[0], CFG.WIPE_RETURN[1])));
  }
  say(p, LINES.approve, CFG.DEPART_SEC);
  slot.state = 'departing'; slot.until = S.rt + CFG.DEPART_SEC;
}

function reject(slot) {
  const p = slot.party; if (!p || slot.state !== 'reception') return;
  const chosen = REASONS.filter(r => p.checks[r.id]).map(r => r.id);
  if (!chosen.length) return;
  const probs = problemsOf(p.ev);
  S.stats.rejected++; p.decision = 'reject'; SFX.stamp();
  if (!probs.length) {
    S.stats.rejectWrong++; clerkFace('sad', 1.4);
    toast(`窓口${slot.i + 1}：誤った却下です。このパーティは受注して問題ありませんでした`, 'bad');
    setLeaving(slot, LINES.rejectWrong);
    return;
  }
  const same = chosen.length === probs.length && chosen.every(c => probs.includes(c));
  if (same) {
    S.stats.rejectOk++; if (!p.mistakes) clerkFace('happy', 1.6);
    earn(CFG.REJECT_FEE, 0);
    toast(`窓口${slot.i + 1}：正しい却下です　+${CFG.REJECT_FEE}G（運営本部）`, 'good');
    setLeaving(slot, LINES.rejectOk);
  } else {
    p.mistakes++; S.stats.rejectReason++; clerkFace('sad', 1.4);
    const g = Math.round(CFG.REJECT_FEE * Math.max(0, 1 - CFG.MISTAKE_CUT * p.mistakes));
    earn(g, 0);
    toast(`窓口${slot.i + 1}：却下理由が違います（正しくは：${reasonText(probs)}）　+${g}G`, 'bad');
    setLeaving(slot, LINES.rejectReason);
  }
}

function earn(hq, owner) {
  S.gold += hq + owner; S.stats.incomeHQ += hq; S.stats.incomeOwner += owner;
  if (hq + owner > 0) { goldPop(hq + owner); SFX.coin(); }
}

function partyReturns(slot) {
  const p = slot.party;
  slot.state = 'returned'; slot.enter = true;
  S.stats.returned++;
  if (p.outcome === 'success') S.stats.success++; else S.stats.fail++;
  say(p, p.outcome === 'success' ? LINES.returnOk : LINES.returnFail, 4);
  toast(`窓口${slot.i + 1}：${p.name}が帰還しました（${p.outcome === 'success' ? 'クエスト完了' : '全滅・クエスト失敗'}）`);
  SFX.back();
}

/* 手当 */
function takeItem(kind) {
  const slot = selSlot(); const p = slot.party;
  if (slot.state !== 'returned' || !p || p.stamped) return;
  if (S.stock[kind] <= 0) { toast(`棚に${ITEM_NAME[kind]}がありません`, 'bad'); return; }
  S.stock[kind]--; p.counter.push({ kind, tagged: false }); SFX.clink();
}
function clickItem(idx) {
  const slot = selSlot(); const p = slot.party;
  if (slot.state !== 'returned' || !p || p.stamped) return;
  const it = p.counter[idx]; if (!it) return;
  if (S.hand === 'tag') { if (!it.tagged) { it.tagged = true; SFX.tag(); } return; }
  p.counter.splice(idx, 1); S.stock[it.kind]++; SFX.soft();
}
function toggleTag() {
  const slot = selSlot();
  if (S.hand !== 'tag' && (slot.state !== 'returned' || !slot.party || slot.party.stamped)) return;
  S.hand = S.hand === 'tag' ? null : 'tag'; SFX.grab();
}
function stamp() {
  const slot = selSlot(); const p = slot.party;
  if (slot.state !== 'returned' || !p || p.stamped) return;
  p.stamped = true; S.hand = null; SFX.stamp();
  const need = { gel: p.members.filter(m => m.status === 'hurt').length, elixir: p.members.filter(m => m.status === 'ghost').length };
  const got = { gel: p.counter.filter(c => c.kind === 'gel').length, elixir: p.counter.filter(c => c.kind === 'elixir').length };
  const miss = [];
  if (need.gel !== got.gel || need.elixir !== got.elixir) miss.push('渡す数が不適切');
  if (p.counter.some(c => !c.tagged)) miss.push('タグの貼り忘れ');
  p.mistakes += miss.length;
  // 1パーティへの対応がすべてミスなく終わったときだけ嬉しそうにする
  if (miss.length) clerkFace('sad', 1.4); else if (!p.mistakes) clerkFace('happy', 1.6);
  S.stats.allowances++; S.stats.allowanceMiss += miss.length;
  S.stats.gelUsed += got.gel; S.stats.elixirUsed += got.elixir;
  const tag = `窓口${slot.i + 1}：`;
  if (miss.length) toast(tag + '手当のミス：' + miss.join('・'), 'bad');
  if (p.outcome === 'success') {
    const mult = Math.max(0, 1 - CFG.MISTAKE_CUT * p.mistakes);
    const hq = Math.round(CFG.HQ_REWARD[p.quest.diff] * mult);
    const ow = Math.round((CFG.OWNER_REWARD[p.quest.diff] + CFG.OWNER_PER_HOUR * p.quest.hours) * mult);
    earn(hq, ow);
    toast(`${tag}報酬 +${hq + ow}G（運営本部 ${hq}G・依頼主 ${ow}G${p.mistakes ? `／ミス${p.mistakes}件で減額` : ''}）`, 'good');
  } else {
    toast(tag + 'クエスト失敗のため、報酬はありません');
  }
  const allGhost = p.members.every(m => m.status === 'ghost');
  slot.state = 'leaving'; slot.until = S.rt + CFG.LEAVE_SEC + 0.6;
  say(p, allGhost ? LINES.thanksGhost : LINES.thanks, CFG.LEAVE_SEC + 0.6);
}

/* 1日の区切り */
function closeBusiness() {
  S.clock = CFG.CLOSE; S.phase = 'afterhours';
  for (const s of S.slots) {
    if (s.state === 'reception') { S.stats.closedAway++; setLeaving(s, LINES.closed); }
  }
  toast('営業終了。帰還したパーティの対応を終えるまで受付は続きます');
  SFX.close(); showScene('営業終了', S.slots.some(s => s.state === 'returned') ? '残りの手当を済ませましょう' : '');
}
function endDay() {
  S.phase = 'report'; S.hand = null;
  showReport(); SFX.fanfare();
}
function startDay() {
  S.clock = CFG.OPEN; S.phase = 'business'; S.stats = newStats();
  S.nextArrival = CFG.OPEN + rand(4, 10);
  let carried = 0;
  for (const s of S.slots) {
    if (s.state === 'quest' || s.state === 'departing') { carried++; partyReturns(s); }
  }
  S.stats.carriedIn = carried;
  S.stats.returned -= carried; // 前日分の帰還は「持ち越し」として別に数える
  toast(`${S.day}日目の営業を開始します`);
  SFX.open(); showScene(`${S.day}日目　営業開始`, '6:00');
}

/* ---------- 早朝・深夜 ---------- */
const PACK_OF = { 2: 'pouch', 5: 'crate_s', 10: 'crate_l' };
const PACK_NAME = { pouch: '皮製の小包', crate_s: '小さな木箱', crate_l: '大きな木箱' };
const KINDS = ['gel', 'elixir'];

function toMorning() {
  S.phase = 'morning'; S.clock = CFG.OPEN - 10; S.hand = null; S.sheet = null; S.ordered = null;
  S.packages = [];
  if (S.order) for (const kind of KINDS) {
    const n = S.order[kind];
    if (n) S.packages.push({ kind, n, left: n, type: PACK_OF[n], open: false });
  }
  S.order = null;
  showScene(`${S.day}日目　早朝`, S.packages.length ? '荷物が届いています' : '');
  toast(S.packages.length ? `${S.day}日目の朝。昨夜注文した支給品が届いています` : `${S.day}日目の朝。届いた荷物はありません`);
}
function clickPackage(pk) {
  if (!pk.open) { pk.open = true; SFX.creak(); return; }
  if (pk.left > 0) { toast('中身を棚に並べ終えてから片付けます', 'bad'); return; }
  S.packages = S.packages.filter(x => x !== pk); SFX.thump();
}
function unpackOne(pk) {
  if (!pk.open || pk.left <= 0) return;
  if (S.stock[pk.kind] >= CFG.SHELF_MAX) { toast(`棚の${ITEM_NAME[pk.kind]}がいっぱいです`, 'bad'); return; }
  pk.left--; S.stock[pk.kind]++; SFX.clink();
}
function openBusiness() {
  if (S.phase !== 'morning') return;
  if (S.packages.length) { toast('届いた荷物を片付けてから営業を始めます', 'bad'); return; }
  startDay();
}
function toNight() {
  S.phase = 'night'; S.clock = CFG.CLOSE + 10; S.hand = null; S.sheet = null; S.ordered = null;
  $('#reportOv').hidden = true;
  SFX.night(); showScene('深夜', '明日の準備をして休みます');
}
// 注文書
function newSheet() { if (S.ordered || S.sheet) return; S.sheet = { gel: 0, elixir: 0 }; SFX.paper(); }
function cancelSheet() { S.sheet = null; if (typeof S.hand === 'number') S.hand = null; SFX.paper(); }
function discardSheet() { S.sheet = { gel: 0, elixir: 0 }; SFX.paper(); toast('注文書を捨てて、新しい用紙を出しました'); }
function grabStamp(n) { if (S.ordered) return; S.hand = S.hand === n ? null : n; SFX.grab(); }
function stampSlot(kind) {
  if (!S.sheet) return;
  if (typeof S.hand !== 'number') { toast('先に「2」「5」「10」のハンコを手に取ります'); return; }
  if (S.sheet[kind]) { toast('この枠にはもう押してあります。書き直すなら注文書を捨てます', 'bad'); return; }
  S.sheet[kind] = S.hand; SFX.stamp();
}
const sheetCost = sh => KINDS.reduce((a, k) => a + sh[k] * CFG.PRICE[k], 0);
function sendOrder() {
  if (S.ordered) return;
  const sh = S.sheet;
  if (!sh) { toast('封筒に入れる注文書がありません'); return; }
  if (!sh.gel && !sh.elixir) { toast('注文書に何も書かれていません', 'bad'); return; }
  for (const k of KINDS) {
    if (S.stock[k] + sh[k] > CFG.SHELF_MAX) { toast(`${ITEM_NAME[k]}が棚に入りきりません（棚は${CFG.SHELF_MAX}個まで）`, 'bad'); return; }
  }
  const cost = sheetCost(sh);
  if (cost > S.gold) { toast(`所持金が足りません（必要 ${cost}G／所持金 ${S.gold}G）`, 'bad'); return; }
  S.gold -= cost; S.ordered = { gel: sh.gel, elixir: sh.elixir, cost }; S.sheet = null; S.hand = null;
  SFX.paper(); SFX.coin(); goldPop(-cost);
  toast(`注文書を封筒に入れて道具屋へ送りました（支払い ${cost}G）`, 'good');
}
function nextDay() {
  if (S.phase !== 'night') return;
  S.order = S.ordered; S.day++;
  save();
  toMorning();
}

/* ---------- セーブ（日の区切りでだけ保存） ---------- */
const SAVE_KEY = 'guild-clerk-work-v1';
function save() {
  const slots = S.slots.map(s => (s.state === 'quest' || s.state === 'departing') ? { party: { ...s.party, bubble: null } } : null);
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, day: S.day, gold: S.gold, stock: S.stock, order: S.order, seq: S.seq, slots }));
  } catch (e) { /* 保存できない環境では何もしない */ }
}
function loadSave() {
  try { const d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); return d && d.v === 1 ? d : null; } catch (e) { return null; }
}
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* noop */ } }
function reset() {
  Object.assign(S, { day: 1, gold: CFG.START_GOLD, stock: { ...CFG.START_STOCK }, order: null, ordered: null, packages: [], sheet: null, hand: null, seq: 1, selected: 0, stats: newStats() });
  for (const s of S.slots) { s.state = 'empty'; s.party = null; s.enter = false; }
}
function applySave(d) {
  reset();
  Object.assign(S, { day: d.day, gold: d.gold, stock: { ...d.stock }, order: d.order, seq: d.seq });
  d.slots.forEach((x, i) => { if (x && S.slots[i]) { S.slots[i].state = 'quest'; S.slots[i].party = x.party; } });
}

function update(dt) {
  S.rt += dt;
  for (const s of S.slots) {
    if (s.state === 'departing' && S.rt >= s.until) s.state = 'quest';
    else if (s.state === 'leaving' && S.rt >= s.until) freeSlot(s);
  }
  if (S.phase === 'business') {
    S.clock += dt * CFG.MIN_PER_SEC;
    if (S.clock >= CFG.CLOSE) closeBusiness();
  }
  for (const s of S.slots) {
    if (s.state === 'quest' && S.clock >= s.party.returnAt && s.party.returnAt <= CFG.CLOSE) partyReturns(s);
  }
  if (S.phase === 'business' && S.clock <= CFG.CLOSE - 60 && S.clock >= S.nextArrival) {
    const empty = S.slots.find(s => s.state === 'empty');
    if (empty) {
      spawnParty(empty);
      S.nextArrival = S.clock + rand(CFG.ARRIVAL_GAP[0], CFG.ARRIVAL_GAP[1]);
    }
  }
  if (S.phase === 'afterhours' && !S.slots.some(s => s.state === 'returned' || s.state === 'leaving')) endDay();
}

/* ---------- スプライト ---------- */
const TAIL = [[25, 8, 15], [26, 8, 15], [27, 9, 14], [28, 10, 14], [29, 11, 14], [30, 12, 14], [31, 13, 14]];
const WISP = [[2, 2, '#bfe6ff'], [1, 3, '#bfe6ff'], [2, 3, '#ffffff'], [3, 3, '#bfe6ff'], [1, 4, '#7fb8ff'], [2, 4, '#ffffff'], [3, 4, '#7fb8ff'], [2, 5, '#7fb8ff']];
function sprite(gid, status, scale) {
  const { w, h, cols } = META;
  const c = el('canvas', 'px');
  c.width = w * scale; c.height = h * scale;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  const sx = (gid % cols) * w, sy = Math.floor(gid / cols) * h;
  if (status === 'ghost') {
    const o = document.createElement('canvas'); o.width = w; o.height = h;
    const ox = o.getContext('2d');
    ox.drawImage(IMGS.adv, sx, sy, w, 25, 0, 0, w, 25);
    ox.fillStyle = '#e8f2ff';
    for (const [y, x0, x1] of TAIL) ox.fillRect(x0, y, x1 - x0 + 1, 1);
    ox.globalCompositeOperation = 'source-atop';
    ox.fillStyle = 'rgba(150,195,255,0.55)'; ox.fillRect(0, 0, w, h);
    x.globalAlpha = 0.85; x.drawImage(o, 0, 0, w * scale, h * scale); x.globalAlpha = 1;
    for (const [px, py, col] of WISP) { x.fillStyle = col; x.fillRect(px * scale, py * scale, scale, scale); }
    c.classList.add('ghost-float');
  } else {
    x.drawImage(IMGS.adv, sx, sy, w, h, 0, 0, w * scale, h * scale);
    if (status === 'hurt') x.drawImage(IMGS.bandage, 0, 0, w, h, 0, 0, w * scale, h * scale);
  }
  return c;
}
function itemImg(kind, cls) { const i = el('img', 'px ' + (cls || '')); i.src = `img/item_${kind}.png`; i.alt = ITEM_NAME[kind] || ''; return i; }

/* ---------- 画面 ---------- */
/* 受付嬢の表情 */
const CLERK_DIR = 'img/newGraphic(clerk)/';
const CLERK_FACES = ['eyeopen', 'blink_1', 'blink_2', 'happy', 'sad', 'rest'];
const FACE = { kind: null, until: 0, blinkAt: 0, nextBlink: 0, shown: '' };
function clerkFace(kind, sec) { FACE.kind = kind; FACE.until = performance.now() + sec * 1000; }
function renderClerk() {
  const now = performance.now();
  let f;
  if (S.phase === 'night') f = 'rest';
  else if (FACE.kind && now < FACE.until) f = FACE.kind;
  else {
    // まばたき：開いた目 → blink_1 → blink_2 → 開いた目
    if (!S.paused && now >= FACE.nextBlink) { FACE.blinkAt = now; FACE.nextBlink = now + rand(2600, 6200); }
    const t = now - FACE.blinkAt;
    f = t < 80 ? 'blink_1' : t < 160 ? 'blink_2' : 'eyeopen';
  }
  if (f !== FACE.shown) { FACE.shown = f; $('#clerkImg').src = CLERK_DIR + 'clerk_' + f + '.png'; }
}

function goldPop(n) {
  const g = $('#tbGold');
  const e = el('div', 'goldpop ' + (n < 0 ? 'neg' : ''), (n > 0 ? '+' : '') + n + 'G');
  e.style.left = (g.offsetLeft - 6) + 'px';
  $('#stage').appendChild(e);
  setTimeout(() => e.remove(), 1500);
  g.classList.remove('flash'); void g.offsetWidth; g.classList.add('flash');
}
function showScene(title, sub) {
  const c = $('#scene');
  c.innerHTML = '';
  c.appendChild(el('div', 'sc-t', title));
  if (sub) c.appendChild(el('div', 'sc-s', sub));
  c.classList.remove('show'); void c.offsetWidth; c.classList.add('show');
}
function toast(msg, kind) {
  if (kind === 'bad') SFX.bad();
  const box = $('#logList');
  const t = el('div', 'logline new ' + (kind || ''));
  t.appendChild(el('span', 'tm', S.phase !== 'title' ? hhmm(S.clock) : ''));
  t.appendChild(document.createTextNode(msg));
  box.prepend(t);
  while (box.children.length > 8) box.lastChild.remove();
  setTimeout(() => t.classList.remove('new'), 1700);
}

const boothDom = [];
function boothKey(s) {
  const p = s.party;
  let k = s.state + '|' + (p ? p.id : '') + '|' + bubbleText(p);
  if (p && s.state === 'returned') k += '|' + p.members.map(m => m.status).join(',');
  if (s.state === 'quest') k += '|' + S.phase;
  return k;
}
function buildBooth(s) {
  const b = boothDom[s.i];
  b.root.innerHTML = '';
  b.bar = null;
  const p = s.party;
  const plate = el('div', 'plate');
  plate.appendChild(el('span', 'no', `窓口${s.i + 1}`));
  plate.appendChild(el('span', 'badge ' + (s.state === 'departing' ? 'quest' : s.state), STATE_LABEL[s.state]));
  b.root.appendChild(plate);
  if (!p) { b.root.appendChild(el('div', 'empty-msg', '— 空き —')); return; }
  const q = p.quest;
  if (s.state === 'quest') {
    const n = el('div', 'notice');
    n.appendChild(el('div', 't', `${p.name}`));
    n.appendChild(el('div', '', `${q.type}・${q.diff}級・${q.hours}時間`));
    n.appendChild(el('div', '', '帰還予定 ' + (p.plannedReturn <= CFG.CLOSE ? hhmm(p.plannedReturn) : S.phase === 'morning' ? '本日の開店時' : '翌日の開店時')));
    const bar = el('div', 'bar'); const fill = el('i'); bar.appendChild(fill); n.appendChild(bar);
    b.bar = { fill, p };
    b.root.appendChild(n);
    return;
  }
  let info = '';
  if (s.state === 'reception') info = `受注申請：${q.type}・${q.diff}級・${q.hours}時間`;
  else if (s.state === 'returned') info = p.outcome === 'success' ? '帰還（クエスト完了）' : '帰還（全滅）';
  b.root.appendChild(el('div', 'info', info));
  const party = el('div', 'party');
  if (s.enter) { party.classList.add('enter'); s.enter = false; }
  if (s.state === 'leaving' || s.state === 'departing') party.classList.add('leave');
  const showStatus = s.state === 'returned' || (s.state === 'leaving' && p.stamped);
  for (const m of p.members) party.appendChild(sprite(m.gid, showStatus ? m.status : 'ok', 2));
  b.root.appendChild(party);
  const bt = bubbleText(p);
  if (bt) b.root.appendChild(el('div', 'bubble', bt));
}
function renderBooths() {
  for (const s of S.slots) {
    const b = boothDom[s.i];
    const k = boothKey(s);
    if (k !== b.key) { b.key = k; buildBooth(s); }
    b.root.classList.toggle('sel', s.i === S.selected);
    if (b.bar) {
      const p = b.bar.p;
      b.bar.fill.style.width = clamp((S.clock - p.departAt) / (p.plannedReturn - p.departAt), 0, 1) * 100 + '%';
    }
  }
}

let deskKey = '', deskBar = null;
function memberCard(m, status, cls) {
  const c = el('div', 'member ' + (cls || ''));
  c.appendChild(sprite(m.gid, status, 3));
  const meta = el('div', 'meta');
  meta.appendChild(el('div', 'nm', m.name));
  const jb = el('div', 'jb');
  jb.appendChild(el('span', '', m.job));
  jb.appendChild(el('span', 'rank ' + m.rank, m.rank));
  meta.appendChild(jb);
  c.appendChild(meta);
  return c;
}
function questSheet(q, p) {
  const sh = el('div', 'sheet quest-sheet');
  sh.appendChild(el('h3', '', 'クエスト受注申請書'));
  for (const [k, v] of [['概要', q.type], ['難易度', q.diff + '級'], ['所要時間', q.hours + '時間'], ['人数', p.members.length + '人']]) {
    const r = el('div', 'qrow'); r.appendChild(el('span', 'k', k)); r.appendChild(el('span', 'v', v)); sh.appendChild(r);
  }
  sh.appendChild(el('div', 'qflavor', `「${q.title}」`));
  if (p.decision) sh.appendChild(el('div', 'decision-stamp ' + p.decision, p.decision === 'approve' ? '認可' : '却下'));
  return sh;
}
function deskKeyOf() {
  const s = selSlot(); const p = s.party;
  if (S.phase === 'morning' || S.phase === 'night') return S.phase + JSON.stringify([S.packages, S.sheet, S.ordered, S.hand, S.gold]);
  let k = S.selected + '|' + s.state + '|' + (p ? p.id : '') + '|' + S.hand + '|' + S.phase;
  if (p) k += '|' + p.decision + '|' + p.checks.comp + p.checks.short + '|' + p.counter.map(c => c.kind[0] + (c.tagged ? 1 : 0)).join('') + '|' + p.stamped;
  return k;
}
function renderDesk() {
  const k = deskKeyOf();
  if (k === deskKey) {
    if (deskBar) deskBar.fill.style.width = clamp((S.clock - deskBar.p.departAt) / (deskBar.p.plannedReturn - deskBar.p.departAt), 0, 1) * 100 + '%';
    return;
  }
  deskKey = k; deskBar = null;
  const d = $('#desk'); d.innerHTML = '';
  if (S.phase === 'morning') return deskMorning(d);
  if (S.phase === 'night') return deskNight(d);
  const s = selSlot(); const p = s.party;
  const head = el('div', 'desk-head');
  head.appendChild(el('span', '', `窓口${s.i + 1}`));
  d.appendChild(head);
  if (!p || s.state === 'empty') {
    head.appendChild(el('span', 'sub', '空き'));
    d.appendChild(el('div', 'desk-empty', S.phase === 'business' ? 'この窓口は空いています。次のパーティを待ちましょう。' : 'この窓口は空いています。'));
    return;
  }
  head.appendChild(el('span', '', p.name));
  head.appendChild(el('span', 'sub', STATE_LABEL[s.state]));
  if (s.state === 'reception') return deskReception(d, s, p);
  if (s.state === 'departing' || s.state === 'quest') return deskQuest(d, s, p);
  if (s.state === 'returned' || (s.state === 'leaving' && p.stamped)) return deskReturned(d, s, p, head);
  deskDecided(d, s, p);
}
function deskReception(d, s, p) {
  d.appendChild(questSheet(p.quest, p));
  const mem = el('div', 'members');
  for (const m of p.members) mem.appendChild(memberCard(m, 'ok'));
  d.appendChild(mem);
  const dec = el('div', 'decide');
  dec.appendChild(el('span', 'lbl', '却下の理由'));
  for (const r of REASONS) {
    const c = el('button', 'chk' + (p.checks[r.id] ? ' on' : ''));
    c.title = r.desc;
    c.appendChild(el('span', 'box')); c.appendChild(el('span', '', r.label));
    c.addEventListener('click', () => { p.checks[r.id] = !p.checks[r.id]; SFX.click(); });
    dec.appendChild(c);
  }
  const ok = el('button', 'btn approve', '認可する');
  ok.addEventListener('click', () => approve(s));
  const ng = el('button', 'btn reject', '却下する');
  ng.disabled = !REASONS.some(r => p.checks[r.id]);
  ng.addEventListener('click', () => reject(s));
  dec.appendChild(ok); dec.appendChild(ng);
  d.appendChild(dec);
}
function deskDecided(d, s, p) {
  d.appendChild(questSheet(p.quest, p));
  const mem = el('div', 'members');
  for (const m of p.members) mem.appendChild(memberCard(m, 'ok', 'dim'));
  d.appendChild(mem);
  const why = !p.decision ? '閉店のため、受注できずに帰っていきます。'
    : `却下の理由：${REASONS.filter(r => p.checks[r.id]).map(r => r.label).join('・')}`;
  d.appendChild(el('div', 'trip', why));
}
function deskQuest(d, s, p) {
  d.appendChild(questSheet(p.quest, p));
  const mem = el('div', 'members');
  for (const m of p.members) mem.appendChild(memberCard(m, 'ok', 'dim'));
  d.appendChild(mem);
  const trip = el('div', 'trip');
  trip.appendChild(el('div', '', `出発 ${hhmm(p.departAt)}　／　帰還予定 ${p.plannedReturn > CFG.CLOSE ? '翌日の営業開始時' : hhmm(p.plannedReturn)}`));
  const bar = el('div', 'bar'); const fill = el('i'); bar.appendChild(fill); trip.appendChild(bar);
  deskBar = { fill, p };
  d.appendChild(trip);
}
function deskReturned(d, s, p, head) {
  const flag = el('span', 'result-flag ' + (p.outcome === 'success' ? 'ok' : 'ng'), p.outcome === 'success' ? 'クエスト完了' : '全滅（クエスト失敗）');
  flag.style.position = 'static'; flag.style.marginLeft = 'auto'; flag.style.fontSize = '14px'; flag.style.padding = '0 10px';
  head.appendChild(flag);
  const mem = el('div', 'members wide');
  for (const m of p.members) mem.appendChild(memberCard(m, m.status));
  d.appendChild(mem);
  d.appendChild(el('div', 'hint-line', p.stamped ? '手当を渡しました。' : '棚から品を取ってカウンターへ。カウンターの品をクリックすると棚に戻します。'));
  const tray = el('div', 'tray');
  const ts = el('div', 'tagspot' + (S.hand === 'tag' ? ' holding' : ''));
  if (S.hand !== 'tag') { ts.appendChild(itemImg('tags')); ts.appendChild(el('div', '', 'タグの束')); }
  else ts.appendChild(el('div', '', 'クリックで\nタグの束を\n置く'));
  ts.style.whiteSpace = 'pre-line';
  ts.addEventListener('click', toggleTag);
  tray.appendChild(ts);
  const items = el('div', 'items');
  if (!p.counter.length) items.appendChild(el('div', 'ph', '（カウンターに品はありません）'));
  p.counter.forEach((c, i) => {
    const b = el('button', 'item');
    b.title = ITEM_NAME[c.kind] + (c.tagged ? '（タグ済み）' : '');
    b.appendChild(itemImg(c.kind));
    if (c.tagged) b.appendChild(itemImg('tag', 'tg'));
    b.addEventListener('click', () => clickItem(i));
    items.appendChild(b);
  });
  tray.appendChild(items);
  const doc = el('div', 'docsheet');
  doc.appendChild(el('h4', '', 'クエスト後手当 書類'));
  doc.appendChild(el('div', '', `${p.name}`));
  doc.appendChild(el('div', '', `${p.quest.type}・${p.quest.diff}級`));
  doc.appendChild(el('div', 'seal' + (p.stamped ? ' done' : ''), p.stamped ? '済' : '印'));
  doc.addEventListener('click', stamp);
  tray.appendChild(doc);
  d.appendChild(tray);
}

function deskMorning(d) {
  const head = el('div', 'desk-head');
  head.appendChild(el('span', '', '早朝'));
  head.appendChild(el('span', 'sub', '支給品の受け取り'));
  d.appendChild(head);
  const area = el('div', 'packs');
  if (!S.packages.length) area.appendChild(el('div', 'packs-empty', '棚の準備はできています。'));
  for (const pk of S.packages) {
    const box = el('div', 'pack');
    const b = el('button', 'pack-btn ' + pk.type);
    const im = el('img', 'px'); im.src = `img/item_${pk.type}${pk.open ? '_open' : ''}.png`; im.alt = PACK_NAME[pk.type];
    b.appendChild(im);
    b.addEventListener('click', () => clickPackage(pk));
    box.appendChild(b);
    box.appendChild(el('div', 'pack-name', `${PACK_NAME[pk.type]}（${ITEM_NAME[pk.kind]} ${pk.n}個）`));
    box.appendChild(el('div', 'pack-cap', !pk.open ? 'クリックで開ける' : pk.left ? '中身をクリックして棚へ' : '空になった。包みをクリックで片付ける'));
    if (pk.open) {
      const row = el('div', 'pack-items');
      for (let i = 0; i < pk.left; i++) {
        const it = el('button', 'item');
        it.appendChild(itemImg(pk.kind));
        it.addEventListener('click', () => unpackOne(pk));
        row.appendChild(it);
      }
      box.appendChild(row);
    }
    area.appendChild(box);
  }
  d.appendChild(area);
  const foot = el('div', 'phase-foot');
  const carried = S.slots.filter(s => s.state === 'quest').length;
  foot.appendChild(el('div', 'phase-note', (carried ? `前日からクエスト中のパーティ ${carried}組は、営業開始と同時に帰還します。` : '') + (S.packages.length ? '荷物を片付けると営業を始められます。' : '')));
  const go = el('button', 'btn go', '営業開始');
  go.disabled = S.packages.length > 0;
  go.addEventListener('click', openBusiness);
  foot.appendChild(go);
  d.appendChild(foot);
}

function deskNight(d) {
  const head = el('div', 'desk-head');
  head.appendChild(el('span', '', '深夜'));
  head.appendChild(el('span', 'sub', '明日の支給品の注文'));
  d.appendChild(head);
  // ハンコ台
  const stand = el('div', 'stamp-stand');
  stand.appendChild(el('div', 'stand-cap', 'ハンコ'));
  for (const n of CFG.ORDER_STAMPS) {
    const b = el('button', 'ostamp' + (S.hand === n ? ' held' : ''));
    if (S.hand !== n) { b.appendChild(itemImg('stamp')); b.appendChild(el('span', 'num', String(n))); }
    else b.appendChild(el('span', 'put', `「${n}」を\n戻す`));
    b.addEventListener('click', () => grabStamp(n));
    stand.appendChild(b);
  }
  d.appendChild(stand);
  // 注文書
  if (S.ordered) {
    const sh = el('div', 'sheet order-sheet');
    sh.appendChild(el('h3', '', '注文済み'));
    for (const k of KINDS) sh.appendChild(el('div', 'orow', `${ITEM_NAME[k]}　${S.ordered[k] ? S.ordered[k] + '個' : '—'}`));
    sh.appendChild(el('div', 'orow total', `支払い ${S.ordered.cost}G`));
    sh.appendChild(el('div', 'onote', '明日の早朝に届きます。'));
    d.appendChild(sh);
  } else if (S.sheet) {
    const sh = el('div', 'sheet order-sheet');
    sh.appendChild(el('h3', '', '支給品 注文書'));
    for (const k of KINDS) {
      const r = el('div', 'orow');
      r.appendChild(el('span', 'oname', ITEM_NAME[k]));
      r.appendChild(el('span', 'oprice', `単価 ${CFG.PRICE[k]}G`));
      const slot = el('button', 'oslot' + (S.sheet[k] ? ' done' : ''));
      slot.appendChild(el('span', '', S.sheet[k] ? String(S.sheet[k]) : ''));
      slot.title = 'ハンコを持ってクリック（空欄は0個）';
      slot.addEventListener('click', () => stampSlot(k));
      r.appendChild(slot);
      sh.appendChild(r);
    }
    sh.appendChild(el('div', 'orow total', `合計 ${sheetCost(S.sheet)}G`));
    const btns = el('div', 'obtns');
    const tr = el('button', 'btn small', '捨てて書き直す'); tr.addEventListener('click', discardSheet);
    const cn = el('button', 'btn small', 'やめる'); cn.addEventListener('click', cancelSheet);
    btns.appendChild(tr); btns.appendChild(cn);
    sh.appendChild(btns);
    d.appendChild(sh);
  } else {
    const pad = el('button', 'sheet order-pad');
    pad.appendChild(el('div', 'pad-t', '注文書の束'));
    pad.appendChild(el('div', 'pad-s', 'クリックで書き始める'));
    pad.addEventListener('click', newSheet);
    d.appendChild(pad);
  }
  // 封筒
  const env = el('button', 'envelope' + (S.ordered ? ' sent' : ''));
  env.appendChild(itemImg('envelope'));
  env.appendChild(el('div', '', S.ordered ? '送付済み' : '封筒に入れて送る'));
  env.addEventListener('click', sendOrder);
  d.appendChild(env);
  // メモ
  const memo = el('div', 'night-memo');
  memo.appendChild(el('div', '', `本日使った品：回復ジェル ${S.stats.gelUsed}個・霊薬 ${S.stats.elixirUsed}個`));
  memo.appendChild(el('div', '', `価格：回復ジェル ${CFG.PRICE.gel}G・霊薬 ${CFG.PRICE.elixir}G`));
  memo.appendChild(el('div', '', `棚は各${CFG.SHELF_MAX}個まで`));
  d.appendChild(memo);
  const go = el('button', 'btn go', '次の日へ');
  go.addEventListener('click', nextDay);
  d.appendChild(go);
}

function renderHand() {
  const h = $('#hand');
  if (S.hand == null) { h.hidden = true; return; }
  h.hidden = false;
  const src = S.hand === 'tag' ? 'img/item_tag.png' : 'img/item_stamp.png';
  const im = $('#handImg'); if (!im.src.endsWith(src)) im.src = src;
  const num = S.hand === 'tag' ? '' : String(S.hand);
  const nn = $('#handNum'); if (nn.textContent !== num) nn.textContent = num;
}

let shelfKey = '';
function renderShelf() {
  const s = selSlot();
  const can = s.state === 'returned' && s.party && !s.party.stamped;
  const k = S.stock.gel + '|' + S.stock.elixir + '|' + can + '|' + S.phase;
  if (k === shelfKey) return;
  shelfKey = k;
  const sh = $('#shelf'); sh.innerHTML = '';
  sh.appendChild(el('h3', '', '支給品棚'));
  for (const kind of ['gel', 'elixir']) {
    const c = el('div', 'compart' + (can ? ' can' : ''));
    const cap = el('div', 'cap');
    cap.appendChild(el('span', '', ITEM_NAME[kind]));
    const n = el('b', '', `${S.stock[kind]} / ${CFG.SHELF_MAX}`); cap.appendChild(n);
    c.appendChild(cap);
    const g = el('div', 'grid');
    for (let i = 0; i < CFG.SHELF_MAX; i++) {
      const sp = el('span', i < S.stock[kind] ? '' : 'no');
      if (i < S.stock[kind]) sp.appendChild(itemImg(kind));
      g.appendChild(sp);
    }
    c.appendChild(g);
    c.addEventListener('click', () => takeItem(kind));
    sh.appendChild(c);
  }
  const note = S.phase === 'morning' ? '開けた包みの中身をクリックすると、ここに並びます。'
    : S.phase === 'night' ? '明日の分が足りなければ、注文書で道具屋に注文します。'
    : can ? 'クリックで1つ取り出します。' : '帰還したパーティの窓口を選ぶと、ここから品を取り出せます。';
  sh.appendChild(el('div', 'shelf-note', note));
}

function renderTop() {
  $('#tbDay').textContent = `${S.day}日目`;
  $('#tbClock').textContent = hhmm(S.clock);
  const st = $('#tbStatus');
  const txt = { business: '営業中', afterhours: '営業終了・対応中', report: '営業終了', morning: '早朝・開店前', night: '深夜・閉店後' }[S.phase] || '開店前';
  if (st.textContent !== txt) st.textContent = txt;
  st.classList.toggle('closed', S.phase !== 'business');
  $('#tbGold').textContent = S.gold;
  $('#tbStock').textContent = `回復ジェル ${S.stock.gel}　霊薬 ${S.stock.elixir}`;
}

function render() {
  renderTop(); renderBooths(); renderDesk(); renderShelf();
  renderHand();
  const lob = $('#lobby');
  lob.classList.toggle('night', S.phase === 'night');
  lob.classList.toggle('dawn', S.phase === 'morning');
  const dusk = busy() || S.phase === 'report' ? clamp((S.clock - 17 * 60) / (5 * 60), 0, 1) : 0;
  lob.style.setProperty('--dusk', dusk.toFixed(3));
  renderClerk();
}

/* ---------- 重ね表示 ---------- */
function showReport() {
  const st = S.stats;
  const carried = S.slots.filter(s => s.state === 'quest' || s.state === 'departing').length;
  $('#repTitle').textContent = `${S.day}日目　営業成績`;
  const rows = [
    ['h', '受付'],
    ['来訪したパーティ', st.visitors + '組'],
    ['閉店で帰したパーティ', st.closedAway + '組'],
    ['認可', st.approved + '件'],
    ['うち誤った認可', st.approveWrong + '件', st.approveWrong],
    ['却下', st.rejected + '件'],
    ['うち誤った却下・理由違い', (st.rejectWrong + st.rejectReason) + '件', st.rejectWrong + st.rejectReason],
    ['h', 'クエストと手当'],
    ['帰還（クエスト完了）', st.success + '組'],
    ['帰還（全滅）', st.fail + '組'],
    ['前日からの持ち越し', st.carriedIn + '組'],
    ['翌日へ持ち越し', carried + '組'],
    ['手当の対応', st.allowances + '件'],
    ['手当のミス', st.allowanceMiss + '件', st.allowanceMiss],
    ['使った回復ジェル', st.gelUsed + '個'],
    ['使った霊薬', st.elixirUsed + '個'],
    ['h', '収入と在庫'],
    ['運営本部から', st.incomeHQ + 'G'],
    ['依頼主から', st.incomeOwner + 'G'],
    ['棚の回復ジェル', `${S.stock.gel} / ${CFG.SHELF_MAX}`],
    ['棚の霊薬', `${S.stock.elixir} / ${CFG.SHELF_MAX}`],
    ['total', `本日の収入 ${st.incomeHQ + st.incomeOwner}G　／　所持金 ${S.gold}G`],
  ];
  const g = el('div', 'rep-grid');
  for (const r of rows) {
    if (r[0] === 'h') { g.appendChild(el('div', 'h', r[1])); continue; }
    if (r[0] === 'total') { const t = el('div', 'total'); t.appendChild(el('span', '', r[1])); g.appendChild(t); continue; }
    const d = el('div', r[2] ? 'neg' : '');
    d.appendChild(el('span', '', r[0])); d.appendChild(el('span', '', r[1]));
    g.appendChild(d);
  }
  const body = $('#repBody'); body.innerHTML = ''; body.appendChild(g);
  $('#reportOv').hidden = false;
}

function buildRules() {
  const strong = {};
  for (const j of JOBS) (strong[JOB_STRONG[j]] = strong[JOB_STRONG[j]] || []).push(j);
  $('#rulesBody').innerHTML = `
  <h3>受注の判断</h3>
  <p>クエストの<b>概要</b>と<b>難易度</b>、パーティの<b>人数</b>と各メンバーの<b>職業・冒険者ランク</b>で判断します（所要時間は関係ありません）。</p>
  <table><tr><th>概要</th><th>得意な職業</th></tr>
  ${QUEST_TYPES.map(t => `<tr><td>${t}</td><td>${strong[t].join('・')}</td></tr>`).join('')}</table>
  <p>冒険者ランクと難易度は低い順に C → B → A → S。</p>
  <p>次のどちらかを満たせば、構成は適しています。</p>
  <ol>
    <li>「難易度以上のランク」で、かつ「概要が得意な職業」のメンバーが<b>1人以上</b>いる</li>
    <li>「難易度以上のランク」か「概要が得意な職業」の<b>どちらかを満たす</b>メンバーが<b>3人以上</b>いる</li>
  </ol>
  <p>どちらも満たさない場合は <b>構成上の危険</b>。<br>
  A級を2人以下、S級を3人以下で受ける場合は <b>人員不足</b>。</p>
  <p>どちらにも当たらなければ認可します。当たる場合は、当てはまる理由を<b>すべて</b>選んで却下します。</p>
  <h3>クエスト後手当</h3>
  <ul>
    <li>包帯を巻いている（負傷した）メンバー1人につき <b>回復ジェル</b> 1つ</li>
    <li>幽霊になったメンバー1人につき <b>霊薬</b> 1つ</li>
    <li>カウンターに出した品すべてに <b>ギルド支給品のタグ</b> を貼る</li>
    <li>書類にハンコを押すと、パーティがカウンターの品を受け取る</li>
  </ul>
  <p>渡す数の誤り（在庫切れも含む）とタグの貼り忘れは、それぞれ1件のミスになり、報酬が減ります。</p>
  <h3>支給品の注文（深夜）</h3>
  <p>注文書の各品の枠に「2」「5」「10」のどれかのハンコを1回だけ押します（空欄は0個）。押し間違えたら注文書を捨てて書き直します。
  封筒に入れると道具屋へ送られ、その場で代金を所持金から払います。所持金が足りないときや、棚（各${CFG.SHELF_MAX}個まで）に入りきらないときは送れません。
  届いた品は翌日の早朝に、包みを開けて1つずつ棚に並べます。</p>
  <p>単価：回復ジェル ${CFG.PRICE.gel}G・霊薬 ${CFG.PRICE.elixir}G</p>
  <h3>報酬</h3>
  <p>クエスト完了時は運営本部と依頼主から。正しく却下したときは運営本部から少額。全滅したときは報酬なし。</p>`;
}

/* ---------- 入力 ---------- */
let scale = 1;
function fit() {
  const k = Math.min(innerWidth / 1280, innerHeight / 720);
  scale = k;
  const st = $('#stage');
  st.style.transform = `scale(${k})`;
  st.style.left = Math.max(0, (innerWidth - 1280 * k) / 2) + 'px';
  st.style.top = Math.max(0, (innerHeight - 720 * k) / 2) + 'px';
}
function setPaused(v) {
  if (!busy()) v = false;
  S.paused = v; $('#pauseOv').hidden = !v;
}
function setup() {
  const booths = $('#booths');
  for (let i = 0; i < CFG.SLOTS; i++) {
    const r = el('div', 'booth');
    r.style.left = (12 + i * 211) + 'px';
    r.addEventListener('click', () => { if (S.selected !== i) SFX.click(); S.selected = i; });
    booths.appendChild(r);
    boothDom.push({ root: r, key: null, bar: null });
  }
  buildRules();
  const saved = loadSave();
  if (saved) {
    $('#btnContinue').hidden = false;
    $('#btnContinue').textContent = `続きから（${saved.day}日目の早朝）`;
    $('#btnStart').textContent = 'はじめから';
  }
  let armed = false;
  $('#btnStart').addEventListener('click', () => {
    if (loadSave() && !armed) { armed = true; $('#btnStart').textContent = '記録を消してはじめから（もう一度押す）'; return; }
    clearSave(); reset();
    $('#titleOv').hidden = true; toMorning();
  });
  $('#btnContinue').addEventListener('click', () => {
    const d = loadSave(); if (!d) return;
    applySave(d);
    $('#titleOv').hidden = true; toMorning();
  });
  $('#btnNextDay').addEventListener('click', toNight);
  $('#btnRules').addEventListener('click', () => { $('#rulesOv').hidden = false; });
  $('#btnRulesClose').addEventListener('click', () => { $('#rulesOv').hidden = true; });
  $('#btnPause').addEventListener('click', () => setPaused(!S.paused));
  $('#btnResume').addEventListener('click', () => setPaused(false));
  addEventListener('keydown', e => {
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      if (!$('#rulesOv').hidden && e.key === 'Escape') { $('#rulesOv').hidden = true; return; }
      setPaused(!S.paused); e.preventDefault(); return;
    }
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= CFG.SLOTS && !S.paused) S.selected = n - 1;
  });
  const stage = $('#stage');
  stage.addEventListener('pointerdown', () => SFX.init(), true);
  const sb = $('#btnSound');
  const setSoundLabel = () => { sb.innerHTML = SFX.isOn() ? '音 入' : '音 切'; };
  setSoundLabel();
  sb.addEventListener('click', () => { SFX.init(); SFX.setOn(!SFX.isOn()); setSoundLabel(); SFX.click(); });
  stage.addEventListener('mousemove', e => {
    const b = stage.getBoundingClientRect();
    const c = $('#hand');
    c.style.left = (e.clientX - b.left) / scale + 'px';
    c.style.top = (e.clientY - b.top) / scale + 'px';
  });
  addEventListener('resize', fit); fit();
}

let last = performance.now();
function frame(t) {
  const dt = Math.min(0.1, (t - last) / 1000); last = t;
  if (busy() && !S.paused && $('#rulesOv').hidden) update(dt);
  render();
  requestAnimationFrame(frame);
}

Promise.all([loadImg('adv', 'img/adventurers.png'), loadImg('bandage', 'img/bandage.png'),
  ...CLERK_FACES.map(f => loadImg('clerk_' + f, CLERK_DIR + 'clerk_' + f + '.png'))]).then(() => {
  setup();
  requestAnimationFrame(frame);
});

// 動作確認用（ブラウザのコンソールから参照できるようにしておく）
window.__guild = { S, evaluate, update, save, loadSave };
})();
