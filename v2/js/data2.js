// v2 のデータ（基盤の版）。js/data.js の定数（RANKS・JOBS・NAMES・CFG など）も使う。
'use strict';

const V2 = {
  ITEMS: ['gel', 'elixir', 'whale', 'candy', 'bband', 'neut'],   // 支給品（v1 と同じ6品）
  START_STOCK: { gel: 8, elixir: 4, whale: 2, candy: 2, bband: 2, neut: 2 },
  SHELF_MAX: 30,
  STOCK_MAX: 10,                   // 在庫棚に置ける箱
  FOOT_MAX: 3,                     // 物品棚の足元に置ける箱
  // 受注対応の書類の不備（それぞれ独立に抽選）
  DEFECT: { original: 0.06, noRoster: 0.05, noCard: 0.06, expired: 0.08 },
  // 終了対応の書類の欠け
  RETURN_DEFECT: { noCopy: 0.05, noForm: 0.05 },
  // 来訪するパーティの適否（不備は別に抽選）
  CATEGORY_WEIGHT: { fit: 55, comp: 11, short: 8, attr: 14, multi: 12 },
  NAISHOKU: { reward: 12, rinse: 900, wipe: 600, kinds: { gel: 3, elixir: 1, whale: 1 } },  // 内職：箱1つの手間賃（仮）、振り洗い・拭きに要る動きの量、容器の割合
};

const V2_REASONS = [
  { id: 'comp', label: '構成上の危険' },
  { id: 'short', label: '人員不足' },
  { id: 'attr', label: '属性の危険' },
  { id: 'docs', label: '書類の不備' },
];

/* ---------- 暦（10か月×36日） ---------- */
const CAL = {
  ERA: '法王暦',
  MONTHS: ['炎神の月', '海神の月', '天神の月', '機神の月', '雪神の月', '岩神の月', '野神の月', '灯神の月', '淵神の月', '物神の月'],
  DAYS: 36,
  START: { y: 812, m: 3, d: 14 },   // 1日目＝法王暦812年 機神の月 14日
};
// 日付 ⇔ 通し番号
const calOrd = ({ y, m, d }) => (y * CAL.MONTHS.length + m) * CAL.DAYS + (d - 1);
const calFrom = o => {
  const per = CAL.MONTHS.length * CAL.DAYS;
  const y = Math.floor(o / per), r = o - y * per;
  return { y, m: Math.floor(r / CAL.DAYS), d: (r % CAL.DAYS) + 1 };
};
const calText = c => `${CAL.ERA}${c.y}年 ${CAL.MONTHS[c.m]} ${c.d}日`;
// 月のもう1つの呼び方（「炎神の月」と「炎月」はどちらも正式な名前で、場所や用途で使い分ける。冒険者証は「炎月」の形）
const CAL_SHORT = CAL.MONTHS.map(m => m[0] + '月');
const calShort = c => `${c.y}年 ${CAL_SHORT[c.m]} ${c.d}日`;

/* クエストの中身（場所・魔物・概要・依頼者など）の表は v2/js/world2.js */

/* ---------- 台詞 ---------- */
const V2_LINES = {
  arrive: ['受注をお願いします！', '書類はこちらです', 'このクエストを受けたいです'],
  approve: ['行ってきます！', '任せてください！'],
  rejectOk: ['なるほど…出直します', '確かにそうですね'],
  rejectReason: ['え、そこですか…？ まあ、わかりました'],
  rejectWrong: ['えっ、問題ないはずですけど…'],
  returnOk: ['ただいま戻りました', '依頼、片付けてきました'],
  thanks: ['ありがとうございます！', '助かります！'],
  closed: ['もう閉店か…また来ます'],
};

/* ---------- 属性相性の図（マニュアル用の小さい版） ---------- */
const AFFINITY_SVG = (() => {
  const node = (x, y, a) => `<rect x="${x}" y="${y}" width="32" height="18" rx="3" fill="${ATTR_COLOR[a][0]}" stroke="#1c110b" stroke-width="1.5"/><text x="${x + 16}" y="${y + 13}" text-anchor="middle" font-size="11" fill="${ATTR_COLOR[a][1]}">${a}</text>`;
  const ar = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#2a1c14" stroke-width="1.3" marker-end="url(#mah)"/>`;
  return `<svg viewBox="0 0 192 122" width="188" height="120" role="img" aria-label="属性相性の図"><defs><marker id="mah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#2a1c14"/></marker></defs>
    ${ar(38, 52, 78, 30)}${ar(38, 60, 78, 82)}${ar(112, 24, 150, 14)}${ar(112, 30, 150, 54)}${ar(112, 82, 150, 60)}${ar(112, 88, 150, 98)}
    <path d="M184,13 H189 M184,56 H189 M184,99 H189 M189,13 V116 H20 V68" fill="none" stroke="#6a5444" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#mah)"/>
    ${node(4, 47, '水')}${node(78, 18, '火')}${node(78, 76, '地')}${node(152, 4, '氷')}${node(152, 47, '草')}${node(152, 90, '雷')}</svg>`;
})();

/* ---------- 対応マニュアル（左綴じの本。1要素＝1ページ。開くと 1-2, 3-4 … の見開き） ---------- */
function manualPages() {
  const strong = {};
  for (const j of JOBS) (strong[JOB_STRONG[j]] = strong[JOB_STRONG[j]] || []).push(j);
  const typePage = (t, about, words) => ({ html: `<h4>クエスト概要：${t}</h4><p>${about}</p><p class="m-h">▼推奨職業</p><p>・${strong[t].join('／')}</p><p class="m-h">▼「${t}」に当たる概要の書き方</p><ul class="m-list">${words.map(w => `<li>${w}</li>`).join('')}</ul>` });
  return [
    { cover: true, html: '<div class="m-cover"><div class="m-t">受付対応<br>マニュアル</div><div class="m-s">ギルド運営本部</div></div>' },
    { html: `<h4>目次</h4><ol class="m-toc">${['受注対応の手順', 'クエスト内容の読み方', 'クエスト要請の裏面', 'クエスト概要（討伐・探索・護衛）', '却下事項（構成・人員）', '却下事項（属性の危険）', '却下事項（書類の不備）', '終了対応の手順', '支給品の渡し方', '状態異常の原因', '暦', '支給品の注文', '品出し', '個人用テーブル・内職'].map(x => `<li>${x}</li>`).join('')}</ol>` },
    { html: `<h4>受注対応の手順</h4><p class="m-h">▼パーティが出す書類</p><ul class="m-list"><li>クエスト要請の写し</li><li>パーティ名簿（信仰も書かれている）</li><li>メンバー全員分の冒険者証</li></ul><p class="m-h">▼手順</p><ol><li>受注申請用紙を用紙入れから1枚出す。</li><li>却下事項に当たるものを、筆記具ですべてチェックする。</li><li>認可/却下用ハンコを押す。ホイールで「認可」「却下」を切り替える。</li><li>ハンコを押した受注申請用紙を、テーブルの上の端へ渡す。</li></ol><p>書類が欠けていても、分かる範囲で却下事項を確かめる。</p>` },
    { html: `<h4>クエスト内容の読み方</h4><p>クエスト要請の写しには、上から次のことが書かれている。</p><ul class="m-list"><li>クエスト名と、内容に関わる絵</li><li><b>概要</b>：何をするクエストか。書き方はさまざまなので、次の3ページで討伐・探索・護衛のどれに当たるかを確かめる。</li><li><b>難易度</b>：低い順に C級・B級・A級・S級。</li><li><b>所要時間</b>：受注の判断には使わない。</li><li>依頼者と、完了時のサイン欄</li></ul><p>魔物と場所のことは<b>裏面</b>に書かれている。</p><p>受注のときに出すのは<b>写し</b>。原本は紙の色が濃く、角や辺に傷がある。</p>` },
    { html: `<h4>クエスト要請の裏面</h4><p>写しを<b>右クリック</b>すると裏返り、<b>左クリック</b>で表に戻る。裏面のある写しには、依頼者の欄に「裏面あり」とある。</p><p class="m-h">▼魔物</p><ul class="m-list"><li>名前・属性・特徴・被害</li><li>討伐では、この属性が<b>外部属性</b>になる</li><li>魔物が確認されていない場所もある</li></ul><p class="m-h">▼場所</p><ul class="m-list"><li>名称・環境・様子</li><li>探索・護衛では、<b>環境</b>の属性が外部属性になる</li></ul><p>ハンコは表に押す。</p>` },
    typePage('討伐', '魔物を倒したり、追い払ったり、捕らえたりするクエスト。', ['討伐／駆除／殲滅／鎮圧', '捕獲（魔物を対象とする場合）', '調達（魔物の素材を対象とする場合）', '非常時対応（低危険度区域内）']),
    typePage('探索', '場所を調べたり、物を探して集めたりするクエスト。', ['探索／採取', '捕獲（家畜やペットを対象とする場合）', '調達（自然の素材を対象とする場合）', '非常時対応（安全管理区域内）']),
    typePage('護衛', '人や荷物を守りながら、目的地まで送り届けるクエスト。', ['護衛／付き添い／身辺警護', '非常時対応（高危険度区域内）']),
    { html: `<h4>却下事項（構成・人員）</h4><p>冒険者の<b>ランク</b>は、冒険者証とパーティ名簿に書かれている。低い順に C・B・A・S で、クエストの<b>難易度</b>と同じ段階で比べる。</p><p class="m-h">▼構成上の危険</p><p>次のどちらも満たさないとき。</p><ol><li>難易度以上のランクで、かつ推奨職業の人が1人以上いる。</li><li>難易度以上のランクか推奨職業の、どちらかを満たす人が3人以上いる。</li></ol><p class="m-h">▼人員不足</p><p>A級を2人以下、S級を3人以下で受けるとき。</p>` },
    { html: `<h4>却下事項（属性の危険）</h4><p>クエストの<b>外部属性</b>は、討伐なら裏面の魔物の属性、探索・護衛なら場所の環境で決まる。ないこともある。冒険者の<b>内部属性</b>は、パーティ名簿の<b>信仰</b>で決まる。</p><table class="m-tb m-attr"><tr><td>属性</td><td>信仰</td><td>環境</td></tr>${ATTRS.map(a => `<tr><td>${a}</td><td>${Object.keys(FAITH_ATTR).find(f => FAITH_ATTR[f] === a)}</td><td>${Object.keys(ENVS).filter(e => ENVS[e].attr === a).join('・')}</td></tr>`).join('')}</table><p class="m-small">属性を持たないもの<br>信仰：物神・無信仰<br>環境：${Object.keys(ENVS).filter(e => !ENVS[e].attr).join('・')}</p>` },
    { html: `<h4>属性相性と、属性の危険</h4>${AFFINITY_SVG}<p class="m-small">矢印の根元が、先に対して有利。風・光・闇には属性相性がない。</p><ul class="m-list"><li>外部属性が<b>火・水・雷・氷・地・草</b>：有利な内部属性の人数が、不利な内部属性の人数より<b>多く</b>なければ危険（同数も危険）。</li><li><b>光</b>：内部属性が闇の人がいなければ危険。</li><li><b>闇</b>：内部属性が光の人がいなければ危険。</li><li><b>風</b>：冒険者どうしの内部属性に、属性相性が1組でもあれば危険。</li></ul>` },
    { html: `<h4>却下事項（書類の不備）</h4><p>次のどれかに当たれば<b>書類の不備</b>。</p><ul class="m-list"><li>クエスト要請の<b>写し</b>でなく<b>原本</b>を出している。</li><li>パーティ名簿がない。</li><li>冒険者証が人数分ない。</li><li>冒険者証の<b>更新期限</b>が今日より前（今日までは有効）。今日の日付は電子カレンダーで確かめる。</li></ul><p>書類の不備があるときも、ほかの却下事項を分かる範囲で確かめる。書類が欠けていて判断できないものは、チェックしてもしなくてもよい。</p><p>パーティ名簿がないと信仰が分からないので、属性の危険は判断できない（外部属性がなければ当たらない）。</p>` },
    { html: `<h4>終了対応の手順</h4><p class="m-h">▼パーティが出す書類</p><ul class="m-list"><li>依頼者のサインが入った、クエスト要請の写し</li><li>受注対応のときに書いた受注申請用紙</li></ul><p class="m-h">▼手順</p><ol><li>必要な支給品を物品棚から出す。</li><li>出した品すべてに、タグの束でタグを付ける。</li><li>受注申請用紙とクエスト要請の写しに、ギルド承認印を押す。</li><li>承認印を押した受注申請用紙を、テーブルの上の端へ渡す。</li></ol><p>受注申請用紙がなければ、新しい用紙を出して承認印を押し、それを渡す。</p><p class="m-h">▼ミスになること</p><ul class="m-list"><li>渡した品の数が合わない</li><li>タグが付いていない品がある</li><li>写しに承認印がない</li></ul>` },
    { html: `<h4>支給品の渡し方</h4><table class="m-tb"><tr><td>見た目</td><td>渡す品（1人に1つ）</td></tr><tr><td>包帯を巻いている（負傷）</td><td>回復ジェル</td></tr><tr><td>幽霊になっている</td><td>霊薬</td></tr><tr><td>頭上の炎・焦げ跡（火傷）</td><td>クジラ酒</td></tr><tr><td>青白い顔色・つらら（凍え）</td><td>陽飴</td></tr><tr><td>両脇の稲妻・震え（麻痺）</td><td>黒包帯</td></tr><tr><td>紫の顔色・頭上の泡（毒）</td><td>中和剤</td></tr></table><p class="m-small">負傷と状態異常に同時に掛かっていれば両方渡す。幽霊は状態異常に掛からない。</p><p>出した品すべてに、タグの束でタグを付ける（左クリックで付け、右クリックで外す）。</p>` },
    { html: `<h4>状態異常の原因</h4><p>帰還したパーティは、次のものが原因で状態異常に掛かっていることがある。</p>${AILMENTS.map(a => `<p class="m-h">▼${AIL_NAME[a]}</p><p class="m-small">環境：${Object.keys(ENVS).filter(e => ENVS[e].ail.includes(a)).join('・')}<br>魔物の属性：${Object.keys(ATTR_AIL).find(k => ATTR_AIL[k] === a)}</p>`).join('')}<p class="m-small">外部属性が風で、属性の危険があるまま出発したときは、内部属性どうしの有利な側（火・氷・雷・草）に応じた状態異常にも掛かることがある。</p>` },
    { html: `<h4>暦</h4><p>${CAL.ERA}。1年は10か月、ひと月は36日。</p><p>月には「機神の月」と「機月」の2つの呼び方があり、どちらも正式な名前。土地や書類によって使い分けられる。冒険者証は「機月」の形で書かれる。</p><p class="m-h">▼月の順番</p><ol class="m-months">${CAL.MONTHS.map((m, i) => `<li>${m}（${CAL_SHORT[i]}）</li>`).join('')}</ol>` },
    { html: `<h4>支給品の注文</h4><p>注文は深夜に、個人用テーブルの「注文書を書く」で行う。</p><ol><li>注文用紙を用紙入れから1枚出す。</li><li>品ごとの枠に、数量ハンコ（2・5・10）を1回ずつ押す。空欄は0個。</li><li>注文用紙にギルド承認印を押す。</li><li>設備窓を「郵便物入れ」にして、注文用紙をテーブルの右の端へ。</li></ol><p>代金はその場で支店運営費から払う。届くのは翌朝で、在庫棚に入る。在庫棚の箱は${V2.STOCK_MAX}個まで。</p>` },
    { html: `<h4>品出し</h4><ol><li>設備窓を「在庫棚」にして、箱をクリックすると物品棚の足元へ運ぶ（${V2.FOOT_MAX}箱まで）。</li><li>設備窓を「物品棚」にして、足元の箱をクリックすると、中の品を1つ棚に並べる。</li><li>足元の箱を右クリックすると在庫棚へ戻す。</li><li>空になった箱は、物品棚のゴミ箱へドラッグして捨てる。</li></ol><p>足元に箱があるとき、棚の品を右クリックすると、同じ品の箱へしまえる。</p>` },
    { html: `<h4>個人用テーブル・内職</h4><p>受付嬢の絵をクリックすると開く。上のテーブルをクリックすると戻る。ほかのテーブルの物は置けない。</p><p class="m-h">▼容器の洗浄（営業中）</p><ol class="m-list"><li>回収箱の容器を作業布へ。タグと栓を引いて外す。</li><li>桶に入れて左右に振り、布でこすって拭く。</li><li>乾燥棚へ。10本で次へ進む。</li><li>容器を作業布に出し、合う栓をはめて仮置き台へ。</li><li>棚が空いたら、箱に10本詰める。</li></ol><p>箱1つで手間賃${V2.NAISHOKU.reward}G。途中でやめても続きからできる。</p>` },
    { html: '<p class="m-end">（メモ）</p>' },
    { html: '' },
    { cover: true, back: true, html: '<div class="m-cover back"></div>' },
  ];
}
