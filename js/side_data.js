// 副次業務のデータ
'use strict';

const SIDE = {
  RATE: 0.18,                 // 訪問のうち副次業務になる割合
  WEIGHT: { guide: 40, lost: 35, deposit: 25 },
  REWARD: { guide: 8, lostMap: 8, lostPhone: 10, deposit: 12 }, // 運営本部から
  LOST_WHO: { child: 40, elder: 30, member: 30 },
  TELL_NUMBER: 0.6,           // 子ども・老人が電話番号を教えてくれる確率
  WAIT_MIN: [30, 60],         // 迎えが来るまでの時間（ゲーム内の分）
  DEPOSIT_MAX: 3,             // 同時に預かっていられる数
  DEPOSIT_GAP: [90, 360],     // 1回目から2回目の訪問までの時間（分）
  HINT: { name: 40, feature: 35, none: 25 },
};

const SIDE_NAME = { guide: '道案内', lost: '迷子', deposit: '一時保管' };
const TOOL_NAME = { map: '地図', phone: '電話' };

/* ---------- 地図 ---------- */
// type：symbol（シンボル）／hub（交流所）／place（その他）。kind は規定集の分類。
// x, y は地図の左上を 0、右下を 100 とした位置。
const MAPS = [
  {
    id: 'capital', name: '王都中央区', theme: 'city',
    features: ['大きな噴水があって、立派な聖堂が見えました', '劇場の前に人だかりがしていました'],
    places: [
      { n: '噴水広場', type: 'symbol', kind: '広場', x: 50, y: 48 },
      { n: '金獅子亭', type: 'hub', kind: '酒場', x: 80, y: 74 },
      { n: '大聖堂', type: 'place', x: 50, y: 14 },
      { n: '仕立て屋', type: 'place', x: 16, y: 26 },
      { n: '宝石店', type: 'place', x: 84, y: 24 },
      { n: 'パン屋', type: 'place', x: 18, y: 76 },
      { n: '劇場', type: 'place', x: 50, y: 84 },
      { n: '書店', type: 'place', x: 20, y: 52 },
    ],
  },
  {
    id: 'port', name: '港町マリナ', theme: 'port',
    features: ['海の匂いがして、船がたくさん見えました', '白い灯台がよく見える場所でした'],
    places: [
      { n: '白灯台', type: 'symbol', kind: '塔', x: 86, y: 16 },
      { n: '潮風食堂', type: 'hub', kind: '大衆食堂', x: 46, y: 46 },
      { n: '魚市場', type: 'place', x: 22, y: 64 },
      { n: '造船所', type: 'place', x: 70, y: 66 },
      { n: '教会', type: 'place', x: 20, y: 16 },
      { n: 'パン屋', type: 'place', x: 50, y: 16 },
      { n: '倉庫街', type: 'place', x: 84, y: 44 },
      { n: '薬屋', type: 'place', x: 16, y: 40 },
    ],
  },
  {
    id: 'academy', name: '学園街ルミエ', theme: 'academy',
    features: ['魔法学院の尖った屋根が見えました', '植物園の温室がそばにありました'],
    places: [
      { n: 'ルミエ役場', type: 'symbol', kind: '役場', x: 50, y: 50 },
      { n: '星見の宿', type: 'hub', kind: '宿屋', x: 18, y: 78 },
      { n: '魔法学院', type: 'place', x: 50, y: 14 },
      { n: '書店', type: 'place', x: 82, y: 24 },
      { n: '薬屋', type: 'place', x: 82, y: 76 },
      { n: '教会', type: 'place', x: 16, y: 24 },
      { n: '文具店', type: 'place', x: 50, y: 84 },
      { n: '植物園', type: 'place', x: 84, y: 50 },
    ],
  },
  {
    id: 'craft', name: '職人街ガルド', theme: 'craft',
    features: ['あちこちから槌の音が聞こえました', '物見の塔のそばだったと思います'],
    places: [
      { n: '物見の塔', type: 'symbol', kind: '塔', x: 18, y: 18 },
      { n: '鉄槌武具店', type: 'hub', kind: '武器屋', x: 80, y: 52 },
      { n: '鍛冶屋', type: 'place', x: 50, y: 22 },
      { n: '革細工屋', type: 'place', x: 84, y: 18 },
      { n: '市場', type: 'place', x: 46, y: 54 },
      { n: 'パン屋', type: 'place', x: 16, y: 56 },
      { n: '酒蔵', type: 'place', x: 30, y: 84 },
      { n: '仕立て屋', type: 'place', x: 70, y: 84 },
    ],
  },
  {
    id: 'farm', name: '農村ハルム', theme: 'farm',
    features: ['大きな風車が回っていました', '一面に麦畑が広がっていました'],
    places: [
      { n: '風車広場', type: 'symbol', kind: '広場', x: 52, y: 42 },
      { n: '麦穂亭', type: 'hub', kind: '酒場', x: 20, y: 62 },
      { n: '牧場', type: 'place', x: 84, y: 22 },
      { n: '水車小屋', type: 'place', x: 84, y: 74 },
      { n: '教会', type: 'place', x: 18, y: 18 },
      { n: '鍛冶屋', type: 'place', x: 50, y: 84 },
      { n: '市場', type: 'place', x: 52, y: 14 },
      { n: '墓地', type: 'place', x: 16, y: 88 },
    ],
  },
  {
    id: 'forest', name: '森の集落エルミナ', theme: 'forest',
    features: ['ものすごく大きな木の下でした', '木の上に家がいくつもありました'],
    places: [
      { n: '世界樹', type: 'symbol', kind: '世界樹', x: 50, y: 30 },
      { n: '木漏れ日食堂', type: 'hub', kind: '大衆食堂', x: 82, y: 70 },
      { n: '薬屋', type: 'place', x: 18, y: 22 },
      { n: '墓地', type: 'place', x: 84, y: 20 },
      { n: '花屋', type: 'place', x: 18, y: 58 },
      { n: '狩人小屋', type: 'place', x: 50, y: 66 },
      { n: '泉', type: 'place', x: 30, y: 86 },
      { n: '仕立て屋', type: 'place', x: 62, y: 88 },
    ],
  },
];
const SYMBOL_KINDS = ['広場', '役場', '世界樹', '塔'];
const HUB_KINDS = ['酒場', '大衆食堂', '宿屋', '武器屋'];

/* ---------- 電話 ---------- */
// 9種類の記号（20x20 の線画）。番号は記号の添え字4つ。
const GLYPHS = [
  'M10 3 A7 7 0 1 1 9.9 3',                       // 輪
  'M10 3 L17 16 L3 16 Z',                          // 三角
  'M3 7 H17 M3 13 H17',                            // 二本線
  'M4 4 L16 16 M16 4 L4 16',                       // ばつ
  'M14 3 A7 7 0 1 0 14 17 A5 5 0 1 1 14 3',        // 三日月
  'M4 4 H16 V16 H4 Z M10 9.5 V10.5',               // 四角と点
  'M3 6 L8 14 L12 6 L17 14',                       // ぎざぎざ
  'M10 3 V17 M4 8 L10 3 L16 8',                    // 矢
  'M10 4 V5 M5 15 V16 M15 15 V16',                 // 三つの点
];
const GUARD_NUMBER = [5, 0, 5, 3];

/* ---------- 一時保管の預かり物 ---------- */
// similar：支給品に似た見た目かどうか（見た目の割合の確認用）
const DEPOSIT_ITEMS = {
  watch: { name: '銀の懐中時計', feature: '銀色で丸くて、鎖がついたもの' },
  letters: { name: '手紙の束', feature: '赤い紐で縛った紙の束' },
  doll: { name: '木彫りの人形', feature: '木でできた、小さな人の形のもの' },
  scarf: { name: '赤いスカーフ', feature: '赤い布で、端がふさふさしているもの' },
  keys: { name: '鍵束', feature: '金色の輪に、いくつもぶら下がっているもの' },
  quill: { name: '羽ペン', feature: '白くて細長い、羽のもの' },
  jewel: { name: '宝石箱', feature: '紫色の小箱で、石がはめ込まれているもの' },
  compass: { name: '方位磁石', feature: '丸くて、針がついているもの' },
  mittens: { name: '毛糸の手袋', feature: '青くて、二つで一組のもの' },
  perfume: { name: '香水瓶', feature: '緑色の丸い瓶で、花の絵が描いてあるもの', similar: true },
  ink: { name: 'インク瓶', feature: '紺色の液体が入った、首の細い瓶', similar: true },
  drops: { name: '目薬', feature: '水色の液体の小瓶で、目の絵のラベルのもの', similar: true },
  caramel: { name: 'キャラメルの包み', feature: '両端をねじった包み紙のもの', similar: true },
  notebook: { name: '黒革の手帳', feature: '黒くて四角い、星の飾りがあるもの', similar: true },
  tea: { name: '茶葉の小袋', feature: '白い小袋で、中に緑の葉が入っているもの', similar: true },
};

/* ---------- 台詞 ---------- */
const SIDE_LINES = {
  guideArrive: ['道をお尋ねしたいのですが…', 'すみません、道を教えてほしくて'],
  guideOpen: ['その地図で教えてもらえますか', '地図、助かります！'],
  guideOk: ['ありがとうございます、行ってみます！', 'よくわかりました！'],
  guideNg: ['ありがとうございます…（首をかしげながら）', 'えっと…はい、行ってみます…'],
  childArrive: ['おうちの人と、はぐれちゃった…', 'ママがいないの…'],
  elderArrive: ['家族とはぐれてしまってのう…', '連れとはぐれてしまいましてな'],
  memberArrive: ['仲間とはぐれてしまって…', 'パーティのみんなを見失ってしまって'],
  numberUnknown: ['ばんごう…わかんない…', '番号は…すまん、思い出せん'],
  waitChild: ['（おとなしく待っている）'],
  waitElder: ['（椅子に座って待っている）'],
  pickupOk: ['ありがとうございました！', 'ご迷惑をおかけしました'],
  pickupGuard: ['警備隊です。責任を持ってお連れします'],
  pickupNg: ['え…うちの子では…いえ、一緒に探してみます', '…どなたでしょう？ でも、放っておけませんね'],
  memberOk: ['ありがとう、行ってみます！'],
  memberNg: ['…本当にそこかなあ。行ってみます'],
  depositArrive: ['これを少しの間、預かってもらえますか', 'しばらく預かってほしいものがあって'],
  depositLeave: ['では、また後で取りに来ます'],
  returnNone: ['前に預けたものを返してほしいんです', '預けていたもの、受け取りに来ました'],
  returnWrong: ['これじゃないです…', 'うーん、違います'],
  returnOk: ['これです、ありがとうございます！'],
  returnRefused: ['えっ…そんな…', '困ります…'],
};
