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
const STATE_LABEL = { empty: '空き', reception: '受注対応待ち', departing: '出発', quest: '進行中', returned: '終了対応待ち', leaving: '退出' };

/* ---------- 画像 ---------- */
const IMGS = {};
function loadImg(key, src) {
  return new Promise(res => { const im = new Image(); im.onload = res; im.onerror = res; im.src = src; IMGS[key] = im; });
}

/* ---------- 状態 ---------- */
const S = {
  day: 1, gold: CFG.START_GOLD, shelf: makeShelf(CFG.START_STOCK), boxes: [], restock: false,
  clock: CFG.OPEN, phase: 'title', paused: false,
  slots: Array.from({ length: CFG.SLOTS }, (_, i) => ({ i, state: 'empty', party: null, until: 0, enter: false })),
  selected: 0, hand: null, order: null, ordered: null, sheet: null, nextArrival: CFG.OPEN + 8, seq: 1, rt: 0, stats: newStats(),
};
function newStats() {
  return {
    visitors: 0, approved: 0, approveWrong: 0, rejected: 0, rejectOk: 0, rejectReason: 0, rejectWrong: 0,
    returned: 0, success: 0, fail: 0, allowances: 0, allowanceMiss: 0,
    incomeHQ: 0, incomeOwner: 0, closedAway: 0, carriedIn: 0,
    used: Object.fromEntries(ITEMS.map(k => [k, 0])),
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
    attr: attrDanger(members, externalAttr(quest)),
  };
}
const beats = (a, b) => !!(BEATS[a] && BEATS[a].includes(b));
const memberAttr = m => FAITH_ATTR[m.faith] || null;
// 外部属性：討伐なら魔物の属性、探索・護衛なら場所の環境の属性
function externalAttr(q) {
  if (!q.monster || !q.place) return null;
  return q.type === '討伐' ? q.monster.attr : ENVS[q.place.env].attr;
}
// 冒険者の内部属性どうしで属性相性が生じている組 [有利側, 不利側]
function attrPairs(members) {
  const at = members.map(memberAttr).filter(Boolean);
  const out = [];
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
  const adv = at.filter(a => beats(a, E)).length;
  const dis = at.filter(a => beats(E, a)).length;
  return !(adv > dis);
}
// 帰還時に掛かる可能性のある状態異常（場所の環境・魔物の属性・風の外部属性での属性相性）
function ailCandidates(p) {
  const q = p.quest;
  if (!q.monster || !q.place) return [];
  const set = new Set(ENVS[q.place.env].ail);
  if (ATTR_AIL[q.monster.attr]) set.add(ATTR_AIL[q.monster.attr]);
  if (externalAttr(q) === '風') for (const [a] of attrPairs(p.members)) if (ATTR_AIL[a]) set.add(ATTR_AIL[a]);
  return [...set];
}
const problemsOf = ev => REASONS.filter(r => ev[r.id]).map(r => r.id);
const reasonText = ids => ids.map(id => REASONS.find(r => r.id === id).label).join('・');

/* ---------- パーティの生成 ---------- */
function genQuest(base, maxH) {
  const type = pick(QUEST_TYPES);
  const diff = RANKS[clamp(base + +weighted({ '-1': 22, 0: 45, 1: 26, 2: 7 }), 0, 3)];
  const mo = pick(MONSTERS.filter(m => m[2].includes(diff)));
  const env = pick(Object.keys(ENVS));
  const [terrains, descs] = PLACE_BY_ENV[env];
  return {
    type, diff, hours: randi(1, maxH),
    monster: { name: mo[0], attr: mo[1], traits: shuffle(MONSTER_TRAITS).slice(0, 2), damage: pick(MONSTER_DAMAGE) },
    place: { name: pick(PLACE_PROPER) + pick(terrains), env, realm: pick(PLACE_REALM), desc: pick(descs) },
  };
}
function categoryOf(ev) {
  const pr = problemsOf(ev);
  return pr.length === 0 ? 'fit' : pr.length >= 2 ? 'multi' : pr[0];
}
function genParty() {
  const used = new Set(S.slots.filter(s => s.party).flatMap(s => s.party.members.map(m => m.gid)));
  const pool = [...Array(META.chars.length).keys()].filter(g => !used.has(g));
  const target = weighted(CFG.CATEGORY_WEIGHT);
  const maxH = clamp(Math.floor((CFG.CLOSE - S.clock) / 60), 1, 5);
  let best = null;
  for (let t = 0; t < 800; t++) {
    const n = Math.min(pool.length, +weighted({ 1: 10, 2: 28, 3: 36, 4: 26 }));
    const base = +weighted({ 0: 34, 1: 30, 2: 23, 3: 13 });
    const members = shuffle(pool).slice(0, n).map(gid => {
      const look = META.chars[gid].look;
      const job = Math.random() < LOOK_MATCH_RATE ? LOOK_JOB[look] : pick(JOBS);
      const r = clamp(base - (Math.random() < 0.35 ? 1 : 0) + (Math.random() < 0.1 ? 1 : 0), 0, 3);
      return { gid, job, rank: RANKS[r], faith: weighted(FAITH_WEIGHT), status: 'ok', ail: null, name: '' };
    });
    const quest = genQuest(base, maxH);
    const ev = evaluate(members, quest);
    best = { members, quest, ev };
    if (categoryOf(ev) === target) break;
  }
  const usedNames = new Set();
  for (const m of best.members) {
    const list = NAMES[META.chars[m.gid].g].filter(n => !usedNames.has(n));
    m.name = pick(list); usedNames.add(m.name);
  }
  const q = best.quest;
  q.title = pick(QUEST_TITLE_TPL[q.type]).replace('{m}', q.monster.name).replace('{p}', q.place.name);
  return {
    id: S.seq++, members: best.members, quest: q, ev: best.ev,
    name: best.members[0].name + 'のパーティ',
    checks: Object.fromEntries(REASONS.map(r => [r.id, false])), mistakes: 0, wrongApproval: false,
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
    const soon = S.clock + rand(CFG.REFILL_GAP[0], CFG.REFILL_GAP[1]) / OPT.visit;
    if (S.nextArrival < soon) S.nextArrival = soon;
  }
}

function approve(slot) {
  const p = slot.party; if (!p || slot.state !== 'reception') return;
  const probs = problemsOf(p.ev);
  S.stats.approved++; p.decision = 'approve'; markFresh('dec' + p.id); SFX.stamp();
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
  // 状態異常：生存者は怪我の半分ほどの確率で、候補から等しい確率で1つ
  const cands = ailCandidates(p);
  const rate = probs.length === 0 ? CFG.AIL_RATE_FIT : CFG.AIL_RATE_UNFIT;
  for (const m of p.members) m.ail = (m.status !== 'ghost' && cands.length && Math.random() < rate) ? pick(cands) : null;
  say(p, LINES.approve, CFG.DEPART_SEC);
  slot.state = 'departing'; slot.until = S.rt + CFG.DEPART_SEC;
}

function reject(slot) {
  const p = slot.party; if (!p || slot.state !== 'reception') return;
  const chosen = REASONS.filter(r => p.checks[r.id]).map(r => r.id);
  if (!chosen.length) return;
  const probs = problemsOf(p.ev);
  S.stats.rejected++; p.decision = 'reject'; markFresh('dec' + p.id); SFX.stamp();
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
function requiredItems(p) {
  const need = Object.fromEntries(ITEMS.map(k => [k, 0]));
  for (const m of p.members) {
    if (m.status === 'ghost') { need.elixir++; continue; }
    if (m.status === 'hurt') need.gel++;
    if (m.ail) need[AIL_ITEM[m.ail]]++;
  }
  return need;
}

/* 棚（30マス。null は空き） */
function makeShelf(stock) {
  const sh = Array(CFG.SHELF_MAX).fill(null);
  let i = 0;
  for (const k of ITEMS) for (let n = 0; n < (stock[k] || 0) && i < sh.length; n++) sh[i++] = k;
  return sh;
}
const stockOf = k => S.shelf.filter(x => x === k).length;
const shelfCount = () => S.shelf.filter(Boolean).length;
function shelfPut(kind) {
  const i = S.shelf.indexOf(null);
  if (i < 0) return false;
  S.shelf[i] = kind; return true;
}
function moveShelf(from, to) {
  if (from === to || !S.shelf[from]) return;
  [S.shelf[from], S.shelf[to]] = [S.shelf[to], S.shelf[from]];
  SFX.soft();
}
function takeItem(idx) {
  const slot = selSlot(); const p = slot.party;
  if (slot.state !== 'returned' || !p || p.stamped) return;
  const kind = S.shelf[idx]; if (!kind) return;
  S.shelf[idx] = null; p.counter.push({ kind, tagged: false }); SFX.clink();
}
function clickItem(idx) {
  const slot = selSlot(); const p = slot.party;
  if (slot.state !== 'returned' || !p || p.stamped) return;
  const it = p.counter[idx]; if (!it) return;
  if (S.hand === 'tag') { if (!it.tagged) { it.tagged = true; SFX.tag(); } return; }
  if (!shelfPut(it.kind)) { toast('棚に空きがありません', 'bad'); return; }
  p.counter.splice(idx, 1); SFX.soft();
}
function toggleTag() {
  const slot = selSlot();
  if (S.hand !== 'tag' && (slot.state !== 'returned' || !slot.party || slot.party.stamped)) return;
  S.hand = S.hand === 'tag' ? null : 'tag'; SFX.grab();
}
function stamp() {
  const slot = selSlot(); const p = slot.party;
  if (slot.state !== 'returned' || !p || p.stamped) return;
  p.stamped = true; S.hand = null; markFresh('seal' + p.id); SFX.stamp();
  const need = requiredItems(p);
  const got = Object.fromEntries(ITEMS.map(k => [k, p.counter.filter(c => c.kind === k).length]));
  const miss = [];
  if (ITEMS.some(k => need[k] !== got[k])) miss.push('渡す数が不適切');
  if (p.counter.some(c => !c.tagged)) miss.push('タグの貼り忘れ');
  p.mistakes += miss.length;
  // 1パーティへの対応がすべてミスなく終わったときだけ嬉しそうにする
  if (miss.length) clerkFace('sad', 1.4); else if (!p.mistakes) clerkFace('happy', 1.6);
  S.stats.allowances++; S.stats.allowanceMiss += miss.length;
  for (const k of ITEMS) S.stats.used[k] += got[k];
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

function toMorning() {
  S.phase = 'morning'; S.clock = CFG.OPEN - 10; S.hand = null; S.sheet = null; S.ordered = null; S.restock = false;
  let arrived = 0;
  if (S.order) for (const kind of ITEMS) {
    const n = S.order[kind];
    if (n) { S.boxes.push({ kind, n, left: n, type: PACK_OF[n], open: false }); arrived++; }
  }
  S.order = null;
  S.arrived = arrived;
  showScene(`${S.day}日目　早朝`, arrived ? '荷物が届いています' : '');
  toast(arrived ? `${S.day}日目の朝。昨夜注文した支給品が ${arrived}箱 届いています` : `${S.day}日目の朝。届いた荷物はありません`);
}
// 品出し：保管中の箱を広げて、中身を棚へ並べる（早朝・深夜のみ。途中でやめられる）
function startRestock() { if (S.phase === 'morning' || S.phase === 'night') { S.restock = true; S.hand = null; SFX.creak(); } }
function stopRestock() { S.restock = false; SFX.thump(); }
function clickPackage(pk) {
  if (!pk.open) { pk.open = true; SFX.creak(); return; }
  if (pk.left > 0) { toast('中身を棚に並べ終えてから片付けます', 'bad'); return; }
  S.boxes = S.boxes.filter(x => x !== pk); SFX.thump();
}
function unpackOne(pk) {
  if (!pk.open || pk.left <= 0) return;
  if (!shelfPut(pk.kind)) { toast('棚に空きがありません。残りは箱のまま保管されます', 'bad'); return; }
  pk.left--; SFX.clink();
}
function openBusiness() {
  if (S.phase !== 'morning') return;
  S.restock = false;
  startDay();
}
function toNight() {
  S.phase = 'night'; S.clock = CFG.CLOSE + 10; S.hand = null; S.sheet = null; S.ordered = null; S.restock = false;
  $('#reportOv').hidden = true;
  SFX.night(); showScene('深夜', '明日の準備をして休みます');
}
// 注文書
const blankSheet = () => Object.fromEntries(ITEMS.map(k => [k, 0]));
function newSheet() { if (S.ordered || S.sheet) return; S.sheet = blankSheet(); SFX.paper(); }
function cancelSheet() { S.sheet = null; if (typeof S.hand === 'number') S.hand = null; SFX.paper(); }
function discardSheet() { S.sheet = blankSheet(); SFX.paper(); toast('注文書を捨てて、新しい用紙を出しました'); }
function grabStamp(n) { if (S.ordered) return; S.hand = S.hand === n ? null : n; SFX.grab(); }
function stampSlot(kind) {
  if (!S.sheet) return;
  if (typeof S.hand !== 'number') { toast('先に「2」「5」「10」のハンコを手に取ります'); return; }
  if (S.sheet[kind]) { toast('この枠にはもう押してあります。書き直すなら注文書を捨てます', 'bad'); return; }
  S.sheet[kind] = S.hand; markFresh('os' + kind); SFX.stamp();
}
const sheetCost = sh => ITEMS.reduce((a, k) => a + sh[k] * CFG.PRICE[k], 0);
function sendOrder() {
  if (S.ordered) return;
  const sh = S.sheet;
  if (!sh) { toast('封筒に入れる注文書がありません'); return; }
  const kinds = ITEMS.filter(k => sh[k]).length;
  if (!kinds) { toast('注文書に何も書かれていません', 'bad'); return; }
  if (S.boxes.length + kinds > CFG.BOX_MAX) {
    toast(`保管できる箱は${CFG.BOX_MAX}個までです（保管中 ${S.boxes.length}箱＋今回 ${kinds}箱）`, 'bad'); return;
  }
  const cost = sheetCost(sh);
  if (cost > S.gold) { toast(`所持金が足りません（必要 ${cost}G／所持金 ${S.gold}G）`, 'bad'); return; }
  S.gold -= cost; S.ordered = { ...sh, cost }; S.sheet = null; S.hand = null;
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
    localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 2, day: S.day, gold: S.gold, shelf: S.shelf, boxes: S.boxes, order: S.order, seq: S.seq, slots }));
  } catch (e) { /* 保存できない環境では何もしない */ }
}
function loadSave() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!d) return null;
    if (d.v === 1) { // 以前の形式（品ごとの個数）を新しい棚に並べ直す
      d.shelf = makeShelf(d.stock || {}); d.boxes = []; d.v = 2;
    }
    return d.v === 2 ? d : null;
  } catch (e) { return null; }
}
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* noop */ } }
function reset() {
  Object.assign(S, { day: 1, gold: CFG.START_GOLD, shelf: makeShelf(CFG.START_STOCK), boxes: [], restock: false, order: null, ordered: null, sheet: null, hand: null, seq: 1, selected: 0, stats: newStats() });
  for (const s of S.slots) { s.state = 'empty'; s.party = null; s.enter = false; }
}
function applySave(d) {
  reset();
  const shelf = Array(CFG.SHELF_MAX).fill(null);
  (d.shelf || []).forEach((k, i) => { if (i < shelf.length && ITEMS.includes(k)) shelf[i] = k; });
  Object.assign(S, { day: d.day, gold: d.gold, shelf, boxes: (d.boxes || []).map(b => ({ ...b })), order: d.order, seq: d.seq });
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
      S.nextArrival = S.clock + rand(CFG.ARRIVAL_GAP[0], CFG.ARRIVAL_GAP[1]) / OPT.visit;
    }
  }
  if (S.phase === 'afterhours' && !S.slots.some(s => s.state === 'returned' || s.state === 'leaving')) endDay();
}

/* ---------- スプライト ---------- */
const TAIL = [[25, 8, 15], [26, 8, 15], [27, 9, 14], [28, 10, 14], [29, 11, 14], [30, 12, 14], [31, 13, 14]];
const WISP = [[2, 2, '#bfe6ff'], [1, 3, '#bfe6ff'], [2, 3, '#ffffff'], [3, 3, '#bfe6ff'], [1, 4, '#7fb8ff'], [2, 4, '#ffffff'], [3, 4, '#7fb8ff'], [2, 5, '#7fb8ff']];
function sprite(gid, status, scale, ail) {
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
    const o = document.createElement('canvas'); o.width = w; o.height = h;
    const ox = o.getContext('2d');
    ox.drawImage(IMGS.adv, sx, sy, w, h, 0, 0, w, h);
    if (status === 'hurt') ox.drawImage(IMGS.bandage, 0, 0);
    if (ail) {
      ox.globalCompositeOperation = 'source-atop';
      ox.fillStyle = AIL_TINT[ail]; ox.fillRect(0, 0, w, h);
      ox.globalCompositeOperation = 'source-over';
      ox.drawImage(IMGS['ail_' + ail], 0, 0);
    }
    x.drawImage(o, 0, 0, w * scale, h * scale);
    if (ail === 'para') c.classList.add('para-shake');
  }
  return c;
}
const AIL_TINT = { burn: 'rgba(255,110,50,0.16)', chill: 'rgba(140,200,255,0.38)', para: 'rgba(255,230,70,0.18)', poison: 'rgba(140,70,190,0.32)' };
function itemImg(kind, cls) { const i = el('img', 'px ' + (cls || '')); i.src = `img/item_${kind}.png`; i.alt = ITEM_NAME[kind] || ''; return i; }

/* ---------- 画面 ---------- */
/* ハンコの押印アニメーションは、押した直後の描画でだけ付ける */
const FRESH = new Map();
function markFresh(key) { FRESH.set(key, performance.now()); }
function freshCls(key) { const t = FRESH.get(key); return t != null && performance.now() - t < 400 ? ' anim' : ''; }

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
  for (const m of p.members) party.appendChild(sprite(m.gid, showStatus ? m.status : 'ok', 2, showStatus && m.status !== 'ghost' ? m.ail : null));
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
function attrBadge(text, attr) {
  const b = el('span', 'abadge', text);
  const c = ATTR_COLOR[attr];
  if (c) { b.style.background = c[0]; b.style.color = c[1]; } else b.classList.add('none');
  return b;
}
function memberCard(m, status, cls, ail) {
  const c = el('div', 'member ' + (cls || ''));
  c.appendChild(sprite(m.gid, status, 3, ail));
  const meta = el('div', 'meta');
  meta.appendChild(el('div', 'nm', m.name));
  const jb = el('div', 'jb');
  jb.appendChild(el('span', '', m.job));
  jb.appendChild(el('span', 'rank ' + m.rank, m.rank));
  meta.appendChild(jb);
  if (m.faith) {
    const fa = el('div', 'fa');
    fa.appendChild(el('span', 'fl', '信仰'));
    fa.appendChild(attrBadge(m.faith, FAITH_ATTR[m.faith]));
    meta.appendChild(fa);
  }
  c.appendChild(meta);
  return c;
}
function questSheet(q, p) {
  const sh = el('div', 'sheet quest-sheet');
  sh.appendChild(el('h3', '', q.title ? `「${q.title}」` : 'クエスト受注申請書'));
  const top = el('div', 'qtop');
  for (const [k, v] of [['概要', q.type], ['難易度', q.diff + '級'], ['所要', q.hours + '時間'], ['人数', p.members.length + '人']]) {
    const c = el('div', 'qc'); c.appendChild(el('span', 'k', k)); c.appendChild(el('b', '', v)); top.appendChild(c);
  }
  sh.appendChild(top);
  const block = (title, rows) => {
    const b = el('div', 'qblock');
    b.appendChild(el('div', 'qbh', title));
    for (const [k, v, strong] of rows) {
      const r = el('div', 'qr' + (strong ? ' st' : ''));
      r.appendChild(el('span', 'k', k));
      if (k === '属性') { const v2 = el('span', 'v'); v2.appendChild(attrBadge(v, v)); r.appendChild(v2); }
      else r.appendChild(el('span', 'v', v));
      b.appendChild(r);
    }
    sh.appendChild(b);
  };
  if (q.monster) {
    block(q.type === '討伐' ? '魔物（討伐対象）' : '魔物（出没）', [
      ['名前', q.monster.name], ['属性', q.monster.attr || 'なし', true],
      ['特徴', q.monster.traits.join('／')], ['被害', q.monster.damage]]);
  }
  if (q.place) {
    block('場所', [['名前', q.place.name], ['環境', q.place.env, true], ['領土', q.place.realm], ['説明', q.place.desc]]);
  }
  if (p.decision) sh.appendChild(el('div', 'decision-stamp ' + p.decision + freshCls('dec' + p.id), p.decision === 'approve' ? '認可' : '却下'));
  return sh;
}
function deskKeyOf() {
  const s = selSlot(); const p = s.party;
  if (S.phase === 'morning' || S.phase === 'night') return S.phase + JSON.stringify([S.restock, S.boxes, S.sheet, S.ordered, S.hand, S.gold, S.shelf]);
  let k = S.selected + '|' + s.state + '|' + (p ? p.id : '') + '|' + S.hand + '|' + S.phase;
  if (p) k += '|' + p.decision + '|' + REASONS.map(r => +!!p.checks[r.id]).join('') + '|' + p.counter.map(c => c.kind + (c.tagged ? 1 : 0)).join(',') + '|' + p.stamped;
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
  if ((S.phase === 'morning' || S.phase === 'night') && S.restock) return deskRestock(d);
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
  for (const m of p.members) mem.appendChild(memberCard(m, m.status, '', m.status !== 'ghost' ? m.ail : null));
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
  doc.appendChild(el('div', 'seal' + (p.stamped ? ' done' + freshCls('seal' + p.id) : ''), p.stamped ? '済' : '印'));
  doc.addEventListener('click', stamp);
  tray.appendChild(doc);
  d.appendChild(tray);
}

function boxSummary() {
  const n = S.boxes.length;
  const items = S.boxes.reduce((a, b) => a + b.left, 0);
  return n ? `保管中の箱 ${n}/${CFG.BOX_MAX}（品物 ${items}個）` : `保管中の箱 0/${CFG.BOX_MAX}`;
}
function deskMorning(d) {
  const head = el('div', 'desk-head');
  head.appendChild(el('span', '', '早朝'));
  head.appendChild(el('span', 'sub', '開店の準備'));
  d.appendChild(head);
  const info = el('div', 'phase-info');
  info.appendChild(el('div', 'pi-big', S.arrived ? `昨夜注文した支給品が ${S.arrived}箱 届きました。` : '今朝届いた荷物はありません。'));
  info.appendChild(el('div', '', boxSummary()));
  info.appendChild(el('div', '', `棚 ${shelfCount()}/${CFG.SHELF_MAX}`));
  const carried = S.slots.filter(s => s.state === 'quest').length;
  if (carried) info.appendChild(el('div', '', `前日からクエスト中のパーティ ${carried}組は、営業開始と同時に帰還します。`));
  info.appendChild(el('div', 'pi-note', '品出しをすると、箱の中身を棚に並べられます。棚は右側でドラッグして並べ替えられます。'));
  d.appendChild(info);
  const foot = el('div', 'phase-foot');
  foot.appendChild(el('div', 'phase-note', ''));
  const rs = el('button', 'btn', `品出しへ（箱 ${S.boxes.length}個）`);
  rs.addEventListener('click', startRestock);
  foot.appendChild(rs);
  const go = el('button', 'btn go', '営業開始');
  go.addEventListener('click', openBusiness);
  foot.appendChild(go);
  d.appendChild(foot);
}

function deskRestock(d) {
  const head = el('div', 'desk-head');
  head.appendChild(el('span', '', '品出し'));
  head.appendChild(el('span', 'sub', boxSummary() + `　／　棚 ${shelfCount()}/${CFG.SHELF_MAX}`));
  d.appendChild(head);
  const area = el('div', 'boxes');
  if (!S.boxes.length) area.appendChild(el('div', 'packs-empty', '保管中の箱はありません。'));
  for (const pk of S.boxes) {
    const box = el('div', 'box');
    const b = el('button', 'pack-btn ' + pk.type);
    const im = el('img', 'px'); im.src = `img/item_${pk.type}${pk.open ? '_open' : ''}.png`; im.alt = PACK_NAME[pk.type];
    b.appendChild(im);
    b.title = !pk.open ? 'クリックで開ける' : pk.left ? '中身をクリックして棚へ' : 'クリックで片付ける';
    b.addEventListener('click', () => clickPackage(pk));
    box.appendChild(b);
    box.appendChild(el('div', 'pack-name', `${ITEM_NAME[pk.kind]} ${pk.left}/${pk.n}`));
    box.appendChild(el('div', 'pack-cap', !pk.open ? '開ける' : pk.left ? '中身を棚へ' : '片付ける'));
    if (pk.open && pk.left) {
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
  const back = el('button', 'btn go', '品出しをやめる');
  back.addEventListener('click', stopRestock);
  d.appendChild(back);
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
    for (const k of ITEMS) {
      const r = el('div', 'orow');
      r.appendChild(itemImg(k, 'oicon'));
      r.appendChild(el('span', 'oname', ITEM_NAME[k]));
      r.appendChild(el('span', 'oprice', S.ordered[k] ? S.ordered[k] + '個' : '—'));
      sh.appendChild(r);
    }
    sh.appendChild(el('div', 'orow total', `支払い ${S.ordered.cost}G`));
    sh.appendChild(el('div', 'onote', '明日の早朝に届きます。'));
    d.appendChild(sh);
  } else if (S.sheet) {
    const sh = el('div', 'sheet order-sheet');
    sh.appendChild(el('h3', '', '支給品 注文書'));
    for (const k of ITEMS) {
      const r = el('div', 'orow');
      r.appendChild(itemImg(k, 'oicon'));
      r.appendChild(el('span', 'oname', ITEM_NAME[k]));
      r.appendChild(el('span', 'oprice', `${CFG.PRICE[k]}G`));
      const slot = el('button', 'oslot' + (S.sheet[k] ? ' done' + freshCls('os' + k) : ''));
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
  // 在庫と使用量の表
  const memo = el('table', 'night-memo');
  const hr = el('tr'); for (const t of ['', '棚', '箱', '本日使用', '単価']) hr.appendChild(el('th', '', t)); memo.appendChild(hr);
  for (const k of ITEMS) {
    const tr = el('tr');
    tr.appendChild(el('td', 'nm', ITEM_NAME[k]));
    tr.appendChild(el('td', '', String(stockOf(k))));
    tr.appendChild(el('td', '', String(S.boxes.filter(b => b.kind === k).reduce((a, b) => a + b.left, 0))));
    tr.appendChild(el('td', '', String(S.stats.used[k])));
    tr.appendChild(el('td', '', CFG.PRICE[k] + 'G'));
    memo.appendChild(tr);
  }
  d.appendChild(memo);
  d.appendChild(el('div', 'night-sub', `棚 ${shelfCount()}/${CFG.SHELF_MAX}　${boxSummary()}`));
  // 封筒
  const env = el('button', 'envelope' + (S.ordered ? ' sent' : ''));
  env.appendChild(itemImg('envelope'));
  env.appendChild(el('div', '', S.ordered ? '送付済み' : '封筒に入れて送る'));
  env.addEventListener('click', sendOrder);
  d.appendChild(env);
  const rs = el('button', 'btn night-restock', `品出しへ（箱 ${S.boxes.length}個）`);
  rs.addEventListener('click', startRestock);
  d.appendChild(rs);
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
  const can = busy() && s.state === 'returned' && s.party && !s.party.stamped;
  const drag = S.phase === 'morning' || S.phase === 'night';
  const k = S.shelf.join(',') + '|' + can + '|' + S.phase;
  if (k === shelfKey) return;
  shelfKey = k;
  const sh = $('#shelf'); sh.innerHTML = '';
  sh.appendChild(el('h3', '', `支給品棚　${shelfCount()}/${CFG.SHELF_MAX}`));
  const g = el('div', 'sgrid' + (can ? ' can' : ''));
  S.shelf.forEach((kind, i) => {
    const cell = el('div', 'scell' + (kind ? '' : ' empty'));
    if (kind) {
      const im = itemImg(kind);
      im.title = ITEM_NAME[kind];
      if (drag) {
        im.draggable = true;
        im.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', String(i)); e.dataTransfer.effectAllowed = 'move'; cell.classList.add('dragging'); });
        im.addEventListener('dragend', () => cell.classList.remove('dragging'));
      } else im.draggable = false;
      cell.appendChild(im);
      if (can) cell.addEventListener('click', () => takeItem(i));
    }
    if (drag) {
      cell.addEventListener('dragover', e => { e.preventDefault(); cell.classList.add('over'); });
      cell.addEventListener('dragleave', () => cell.classList.remove('over'));
      cell.addEventListener('drop', e => { e.preventDefault(); cell.classList.remove('over'); const from = +e.dataTransfer.getData('text/plain'); moveShelf(from, i); });
    }
    g.appendChild(cell);
  });
  sh.appendChild(g);
  const note = drag ? 'ドラッグで並べ替えられます。'
    : can ? '品をクリックしてカウンターに出します。' : '帰還したパーティの窓口を選ぶと、ここから品を出せます。';
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
  $('#tbStock').textContent = `棚 ${shelfCount()}/${CFG.SHELF_MAX}　箱 ${S.boxes.length}/${CFG.BOX_MAX}`;
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
    ...ITEMS.map(k => ['使った' + ITEM_NAME[k], st.used[k] + '個']),
    ['h', '収入と在庫'],
    ['運営本部から', st.incomeHQ + 'G'],
    ['依頼主から', st.incomeOwner + 'G'],
    ['棚の品物', `${shelfCount()} / ${CFG.SHELF_MAX}`],
    ['保管中の箱', `${S.boxes.length} / ${CFG.BOX_MAX}`],
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

function affinitySvg() {
  const node = (x, y, a) => `<g><rect x="${x}" y="${y}" width="96" height="40" rx="6" fill="${ATTR_COLOR[a][0]}" stroke="#1c110b" stroke-width="3"/>
    <text x="${x + 48}" y="${y + 27}" text-anchor="middle" font-size="20" fill="${ATTR_COLOR[a][1]}">${a}</text></g>`;
  const arrow = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#2a1c14" stroke-width="2.5" marker-end="url(#ah)"/>`;
  return `<svg class="aff" viewBox="0 0 640 318" width="640" height="318" role="img" aria-label="属性相性の図">
    <defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#2a1c14"/></marker></defs>
    ${arrow(116, 132, 252, 82)}${arrow(116, 148, 252, 202)}
    ${arrow(348, 68, 484, 26)}${arrow(348, 82, 484, 134)}
    ${arrow(348, 198, 484, 146)}${arrow(348, 212, 484, 254)}
    <path d="M580,20 H612 M580,140 H612 M580,260 H612 M612,20 V290 H66 V166" fill="none" stroke="#6a5444" stroke-width="2.5" stroke-dasharray="7 5" marker-end="url(#ah)"/>
    ${node(20, 120, '水')}${node(252, 55, '火')}${node(252, 185, '地')}${node(484, 0, '氷')}${node(484, 120, '草')}${node(484, 240, '雷')}
    <text x="340" y="312" text-anchor="middle" font-size="15" fill="#2a1c14">氷・草・雷は、いずれも水に有利</text>
  </svg>`;
}
function buildRules() {
  const strong = {};
  for (const j of JOBS) (strong[JOB_STRONG[j]] = strong[JOB_STRONG[j]] || []).push(j);
  const envBy = {};
  for (const [e, v] of Object.entries(ENVS)) (envBy[v.attr || 'なし'] = envBy[v.attr || 'なし'] || []).push(e);
  const faithBy = a => Object.keys(FAITH_ATTR).find(f => FAITH_ATTR[f] === a);
  const ailEnv = a => Object.keys(ENVS).filter(e => ENVS[e].ail.includes(a)).join('・');
  const ailAttr = a => Object.keys(ATTR_AIL).find(k => ATTR_AIL[k] === a);
  const icon = k => `<img class="px ricon" src="img/item_${k}.png" alt="">`;
  const chip = a => `<span class="abadge" style="background:${ATTR_COLOR[a][0]};color:${ATTR_COLOR[a][1]}">${a}</span>`;
  $('#rulesBody').innerHTML = `
  <h3>受注の判断</h3>
  <p>次の3つのどれにも当たらなければ認可します。当たる場合は、当てはまる理由を<b>すべて</b>選んで却下します。所要時間は判断に関係ありません。</p>
  <h4>構成上の危険</h4>
  <table><tr><th>概要</th><th>得意な職業</th></tr>
  ${QUEST_TYPES.map(t => `<tr><td>${t}</td><td>${strong[t].join('・')}</td></tr>`).join('')}</table>
  <p>冒険者ランクと難易度は、低い順に C → B → A → S。<br>次のどちらも満たさない場合は、構成上の危険です。</p>
  <ol>
    <li>「難易度以上のランク」で、かつ「概要が得意な職業」のメンバーが<b>1人以上</b>いる。</li>
    <li>「難易度以上のランク」か「概要が得意な職業」の、<b>どちらかを満たす</b>メンバーが<b>3人以上</b>いる。</li>
  </ol>
  <h4>人員不足</h4>
  <p>A級を2人以下、S級を3人以下で受ける場合。</p>
  <h4>属性の危険</h4>
  <p>クエストの<b>外部属性</b>は、概要が討伐なら「魔物」欄の<b>属性</b>、探索・護衛なら「場所」欄の<b>環境</b>で決まります。<br>外部属性がないこともあります。
  冒険者の<b>内部属性</b>は、<b>信仰</b>で決まります。</p>
  <table class="attr-table"><tr><th>属性</th><th>信仰</th><th>環境</th></tr>
  ${ATTRS.map(a => `<tr><td>${chip(a)}</td><td>${faithBy(a)}</td><td>${envBy[a].join('・')}</td></tr>`).join('')}</table>
  <p class="small">属性を持たないもの　信仰：物神・無信仰　／　環境：${envBy['なし'].join('・')}</p>
  <p>属性相性（矢印の根元が、矢印の先に有利）</p>
  ${affinitySvg()}
  <p class="small">風・光・闇には、属性相性がありません。</p>
  <ul>
    <li>外部属性が<b>火・水・雷・氷・地・草</b>のとき：<br>外部属性に<b>有利</b>な内部属性の人数が、<b>不利</b>な内部属性の人数より<b>多く</b>なければ、属性の危険（同数も危険）。</li>
    <li>外部属性が<b>光</b>のとき：内部属性が闇の冒険者が1人もいなければ、属性の危険。</li>
    <li>外部属性が<b>闇</b>のとき：内部属性が光の冒険者が1人もいなければ、属性の危険。</li>
    <li>外部属性が<b>風</b>のとき：冒険者どうしの内部属性の間に、属性相性が1組でもあれば属性の危険。</li>
  </ul>
  <h3>クエスト後手当</h3>
  <ul>
    <li>包帯を巻いている（負傷した）メンバー1人につき、${icon('gel')}<b>回復ジェル</b>を1つ。</li>
    <li>幽霊になったメンバー1人につき、${icon('elixir')}<b>霊薬</b>を1つ（幽霊は状態異常に掛かりません）。</li>
    <li>状態異常1つにつき、対応する品を1つ（負傷と同時に掛かっていることもあります）。</li>
  </ul>
  <table class="ail-table"><tr><th>状態異常</th><th>見た目</th><th>渡す品</th><th>掛かる可能性がある環境</th><th>魔物の属性</th></tr>
    <tr><td>火傷</td><td>頭上の炎、焦げ跡</td><td>${icon('whale')}クジラ酒</td><td>${ailEnv('burn')}</td><td>${chip(ailAttr('burn'))}</td></tr>
    <tr><td>凍え</td><td>青白い顔色、つらら</td><td>${icon('candy')}陽飴</td><td>${ailEnv('chill')}</td><td>${chip(ailAttr('chill'))}</td></tr>
    <tr><td>麻痺</td><td>両脇の稲妻、震え</td><td>${icon('bband')}黒包帯</td><td>${ailEnv('para')}</td><td>${chip(ailAttr('para'))}</td></tr>
    <tr><td>毒</td><td>紫の顔色、頭上の泡</td><td>${icon('neut')}中和剤</td><td>${ailEnv('poison')}</td><td>${chip(ailAttr('poison'))}</td></tr>
  </table>
  <p class="small">外部属性が風のクエストに属性の危険があるまま出発した場合は、内部属性の属性相性の有利側（火・氷・雷・草）に応じた状態異常にも掛かることがあります。</p>
  <ul>
    <li>カウンターに出した品すべてに、<b>ギルド支給品のタグ</b>を貼る。</li>
    <li>書類にハンコを押すと、パーティがカウンターの品を受け取る。</li>
  </ul>
  <p>渡す数の誤り（品の種類違い・在庫切れも含む）と、タグの貼り忘れは、それぞれ1件のミスになり報酬が減ります。</p>
  <h3>支給品の注文（深夜）と品出し</h3>
  <p>注文書の各品の枠に、「2」「5」「10」のどれかのハンコを1回だけ押します（空欄は0個）。押し間違えたら、注文書を捨てて書き直します。<br>
  封筒に入れると道具屋へ送られ、その場で代金を所持金から払います。所持金が足りないときは送れません。</p>
  <p>品は品ごとに1箱で翌日の早朝に届き、<b>保管中の箱</b>になります。早朝か深夜に「品出し」で箱を開け、中身を棚に並べます。<br>
  棚は全部で${CFG.SHELF_MAX}個まで、保管できる箱は大きさを問わず${CFG.BOX_MAX}個までです。注文で届く箱を加えると${CFG.BOX_MAX}個を超える場合は送れません。</p>
  <p>単価　${ITEMS.map(k => `${ITEM_NAME[k]} ${CFG.PRICE[k]}G`).join('・')}</p>
  <h3>報酬</h3>
  <p>クエスト完了時は、運営本部と依頼主から。正しく却下したときは、運営本部から少額。全滅したときは報酬なし。<br>
  不適の理由が2つ以上あるまま出発すると、全滅します。</p>`;
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
  if (v) showOptions(false);
}

/* ---------- オプション（一時停止中に開く） ---------- */
const OPT_KEY = 'guild-clerk-options';
const OPT = { visit: CFG.VISIT_RATE.def };
try { const o = JSON.parse(localStorage.getItem(OPT_KEY) || 'null'); if (o && typeof o.visit === 'number') OPT.visit = clamp(o.visit, CFG.VISIT_RATE.min, CFG.VISIT_RATE.max); } catch (e) { /* noop */ }
function saveOpt() { try { localStorage.setItem(OPT_KEY, JSON.stringify(OPT)); } catch (e) { /* noop */ } }
function showOptions(v) {
  $('#optBox').hidden = !v; $('#pauseMain').hidden = v;
  if (v) renderOptions();
}
function renderOptions() {
  const avg = (CFG.ARRIVAL_GAP[0] + CFG.ARRIVAL_GAP[1]) / 2 / OPT.visit;
  $('#optVisit').textContent = '×' + OPT.visit.toFixed(1);
  $('#optVisitNote').textContent = `来訪の間隔：平均 約${Math.round(avg)}分（ゲーム内）`;
  $('#optVisitDown').disabled = OPT.visit <= CFG.VISIT_RATE.min + 1e-9;
  $('#optVisitUp').disabled = OPT.visit >= CFG.VISIT_RATE.max - 1e-9;
}
function stepVisit(d) {
  const r = CFG.VISIT_RATE;
  OPT.visit = Math.round(clamp(OPT.visit + d * r.step, r.min, r.max) * 10) / 10;
  saveOpt(); renderOptions(); SFX.click();
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
  $('#btnOptions').addEventListener('click', () => { showOptions(true); SFX.click(); });
  $('#btnOptBack').addEventListener('click', () => { showOptions(false); SFX.click(); });
  $('#optVisitDown').addEventListener('click', () => stepVisit(-1));
  $('#optVisitUp').addEventListener('click', () => stepVisit(1));
  $('#optVisitReset').addEventListener('click', () => { OPT.visit = CFG.VISIT_RATE.def; saveOpt(); renderOptions(); SFX.click(); });
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
  ...AILMENTS.map(a => loadImg('ail_' + a, `img/ail_${a}.png`)),
  ...CLERK_FACES.map(f => loadImg('clerk_' + f, CLERK_DIR + 'clerk_' + f + '.png'))]).then(() => {
  setup();
  requestAnimationFrame(frame);
});

// 動作確認用（ブラウザのコンソールから参照できるようにしておく）
window.__guild = { S, evaluate, update, save, loadSave, attrDanger, ailCandidates, requiredItems, externalAttr, genParty, categoryOf };
})();
