// v2 のクエストの中身を組み立てる表。依存の深い順に決める：
//   場所（環境・区域・地名・絵）→ 魔物（その場所に棲む・難易度で絞る）→ 魔物素材 → 概要の文言 → 依頼者・題・被害の文
// 環境の属性・状態異常（ENVS）、属性相性（BEATS）、信仰（FAITHS）は js/data.js（v1）をそのまま使う。
'use strict';

/* ---------- 場所 ----------
  t：地形の言葉（地名は「固有名＋地形」。fmt があればその形）
  env：環境（ENVS のキー）／zone：safe 安全管理区域・low 低危険度区域・high 高危険度区域
  sc：クエストの絵の景色（tools/quest_pics.py の番号）
  tags：棲む魔物の種類（安全管理区域は空＝魔物はいない）
  near：近くにいる人々（依頼者・護衛の対象・家畜の候補）
  nat：採取・調達できる自然の素材／desc：説明（なければ環境の説明） */
const PLACES = [
  { t: ['砂漠', '熱砂の谷'], env: '酷暑', zone: 'high', sc: [12, 23], tags: ['hot', 'wild'], near: ['road'], nat: ['砂漠薔薇', '陽炎石'] },
  { t: ['火山の麓', '溶岩台地'], env: '高温', zone: 'high', sc: [18], tags: ['hot', 'earth'], near: ['mine'], nat: ['硫黄', '黒曜石'] },
  { t: ['地熱洞'], env: '高温', zone: 'low', sc: [2, 19], tags: ['hot', 'earth'], near: ['mine'], nat: ['硫黄', '火山石'] },
  { t: ['温泉郷'], env: '高温', zone: 'low', sc: [16], tags: ['hot', 'earth'], near: ['village', 'mine'], nat: ['湯の花'], desc: ['湯けむりが絶えない', '地面から熱気が立ちのぼる'] },
  { t: ['湖底遺跡', '水没神殿'], env: '水中', zone: 'high', sc: [15, 5], tags: ['water'], near: ['water', 'lab'], nat: ['水晶貝', '湖底の真珠'] },
  { t: ['海底洞窟'], env: '水中', zone: 'high', sc: [11, 2], tags: ['water'], near: ['port'], nat: ['真珠', '深海の珊瑚'] },
  { t: ['岬', '海岸線'], env: '潮風', zone: 'low', sc: [10, 11], tags: ['water', 'sky'], near: ['port'], nat: ['岩塩', '流木', '珊瑚'] },
  { t: ['灯台'], env: '潮風', zone: 'low', sc: [10], tags: ['water', 'sky'], near: ['port'] },
  { t: ['港町'], env: '潮風', zone: 'safe', sc: [11, 20], tags: [], near: ['port', 'city'] },
  { t: ['風鳴りの峠', '吹きさらしの尾根'], env: '強風', zone: 'high', sc: [1, 23], tags: ['sky', 'wild'], near: ['sky', 'road'], nat: ['風切り羽', '白雲苔'] },
  { t: ['古い見張り塔'], env: '強風', zone: 'low', sc: [10], tags: ['sky', 'wild'], near: ['road'] },
  { t: ['風車の丘'], env: '強風', zone: 'low', sc: [21, 7], tags: ['sky', 'green'], near: ['farm'], nat: ['風草'] },
  { t: ['天空塔', '断崖'], env: '高所', zone: 'high', sc: [10, 23], tags: ['sky', 'earth'], near: ['sky'], nat: ['雲綿', '断崖ツバメの巣'] },
  { t: ['高山'], env: '高所', zone: 'high', sc: [1], tags: ['sky', 'cold', 'earth'], near: ['sky', 'mine'], nat: ['高山草', '雪割り花'] },
  { t: ['雲上の村'], env: '高所', zone: 'low', sc: [16, 1], tags: ['sky'], near: ['sky', 'village'], nat: ['雲綿'], desc: ['雲の上に家々が並ぶ', '空気が薄い'] },
  { t: ['古代機械遺跡'], env: '漏電', zone: 'high', sc: [5], tags: ['mech', 'earth'], near: ['lab', 'mine'], nat: ['雷鳴石'] },
  { t: ['魔導工房跡'], env: '漏電', zone: 'low', sc: [5, 9], tags: ['mech', 'city'], near: ['lab', 'city'], nat: ['雷鳴石'] },
  { t: ['廃線'], env: '漏電', zone: 'low', sc: [3, 23], tags: ['city', 'mech'], near: ['city', 'mine'], desc: ['錆びた線路が続く', '切れた架線が垂れている'] },
  { t: ['機関工房街'], env: '漏電', zone: 'safe', sc: [9, 20], tags: [], near: ['mine', 'city'], desc: ['機械の音が絶えない', '金属に触れると痺れることがある'] },
  { t: ['雷鳴の丘', '嵐の平原'], env: '落雷', zone: 'high', sc: [1, 3], tags: ['storm', 'wild'], near: ['road'], nat: ['雷鳴石'] },
  { t: ['氷原', '永久凍土'], env: '極寒', zone: 'high', sc: [14], tags: ['cold'], near: ['sky', 'water'], nat: ['永久氷', '霜の結晶'] },
  { t: ['雪山'], env: '低温', zone: 'high', sc: [1, 14], tags: ['cold', 'earth'], near: ['mine', 'sky'], nat: ['雪割り花', '霜の結晶'] },
  { t: ['氷穴'], env: '低温', zone: 'low', sc: [19, 2], tags: ['cold', 'earth'], near: ['water'], nat: ['氷晶'] },
  { t: ['霧氷の森'], env: '低温', zone: 'low', sc: [0, 14], tags: ['cold', 'green'], near: ['forest'], nat: ['霧氷の実'] },
  { t: ['雪の宿場町'], env: '低温', zone: 'safe', sc: [16, 9], tags: [], near: ['road', 'water'], desc: ['夜はひどく冷え込む', '雪かきの音で朝が始まる'] },
  { t: ['採石場'], env: '砂埃', zone: 'low', sc: [1, 2], tags: ['earth', 'wild'], near: ['mine'], nat: ['銀鉱石', '石灰岩'] },
  { t: ['砂嵐の荒地'], env: '砂埃', zone: 'high', sc: [12], tags: ['earth', 'wild', 'hot'], near: ['road'] },
  { t: ['地下迷宮', '大空洞'], env: '地底', zone: 'high', sc: [2, 19], tags: ['earth', 'abyss'], near: ['lab', 'mine'], nat: ['霧水晶', '光苔'] },
  { t: ['廃坑'], env: '地底', zone: 'low', sc: [2], tags: ['earth', 'abyss', 'mech'], near: ['mine'], nat: ['銀鉱石'] },
  { t: ['地下水路'], env: '湿気', zone: 'low', sc: [2, 6], tags: ['city', 'water'], near: ['city'], desc: ['水音が反響する', '足元がぬかるんでいる'] },
  { t: ['古代植物園'], env: '原種', zone: 'safe', sc: [0, 4], tags: [], near: ['lab', 'forest'], nat: ['古代種の種子'], desc: ['見たことのない植物が茂る', '立ち入りに許可が要る'] },
  { t: ['原生林'], env: '原種', zone: 'high', sc: [24, 0], tags: ['green'], near: ['forest', 'lab'], nat: ['月光草', '原種の果実'] },
  { t: ['樹海'], env: '樹海', zone: 'high', sc: [24], tags: ['green', 'abyss'], near: ['forest'], nat: ['月光草', '樫の古木'] },
  { t: ['深い森'], env: '樹海', zone: 'low', sc: [0, 24], tags: ['green'], near: ['forest'], nat: ['薬草', '樫の古木'] },
  { t: ['森の集落'], env: '樹海', zone: 'low', sc: [16, 0], tags: ['green'], near: ['forest', 'village'], nat: ['薬草'], desc: ['大樹の根元に家々がある', '夜は琥珀の明かりが灯る'] },
  { t: ['白い塩原'], env: '日射', zone: 'high', sc: [12], tags: ['hot', 'holy'], near: ['road'], nat: ['岩塩'] },
  { t: ['灼光の高原'], env: '日射', zone: 'high', sc: [1, 21], tags: ['hot', 'holy', 'sky'], near: ['sky'], nat: ['陽光花'] },
  { t: ['聖域'], env: '清浄', zone: 'safe', sc: [4, 15], tags: [], near: ['church'] },
  { t: ['神殿跡'], env: '清浄', zone: 'low', sc: [5], tags: ['holy', 'earth'], near: ['church', 'lab'] },
  { t: ['白き湖'], env: '清浄', zone: 'low', sc: [15, 22], tags: ['holy', 'water'], near: ['church', 'water'], nat: ['泉の水'] },
  { t: ['深淵の裂け目', '奈落の淵'], env: '深淵', zone: 'high', sc: [23, 10], tags: ['abyss'], near: ['church'] },
  { t: ['古い墓地'], env: '深淵', zone: 'low', sc: [17], tags: ['abyss'], near: ['church'], desc: ['霧が墓石の間を流れる', '夜は冷気が地を這う'] },
  { t: ['崖下の町'], env: '深淵', zone: 'safe', sc: [16, 23], tags: [], near: ['church', 'village'], desc: ['日が差すのは昼の短い間だけ', '崖の上から冷たい風が下りてくる'] },
  { t: ['歪んだ遺跡', '魔素溜まり'], env: '混沌', zone: 'high', sc: [5, 8], tags: ['abyss', 'mech'], near: ['lab'] },
  { t: ['古城跡'], env: '混沌', zone: 'high', sc: [4, 5], tags: ['abyss', 'earth'], near: ['lab', 'church'] },
  { t: ['王都'], fmt: '王都', env: '都市', zone: 'safe', sc: [9, 4, 20], tags: [], near: ['city'] },
  { t: ['交易都市', '城下町'], env: '都市', zone: 'safe', sc: [20, 9], tags: [], near: ['city', 'road'] },
  { t: ['学院'], env: '都市', zone: 'safe', sc: [4, 9], tags: [], near: ['lab'], desc: ['学生が行き交う', '大きな図書館がある'] },
  { t: ['草原', '丘陵'], env: '自然', zone: 'low', sc: [3, 21, 0], tags: ['green', 'wild'], near: ['road', 'farm'], nat: ['薬草'] },
  { t: ['街道沿い'], env: '自然', zone: 'low', sc: [3, 13], tags: ['wild', 'green'], near: ['road'] },
  { t: ['牧草地', '農村'], env: '自然', zone: 'low', sc: [7, 21, 16], tags: ['green', 'wild'], near: ['farm', 'village'], nat: ['薬草'] },
  { t: ['大河の渡し'], env: '自然', zone: 'low', sc: [6, 3], tags: ['water', 'wild'], near: ['road', 'water'] },
  { t: ['荒野', '岩石砂漠'], env: '荒野', zone: 'high', sc: [12, 13], tags: ['wild', 'earth'], near: ['road'] },
  { t: ['古戦場'], env: '荒野', zone: 'high', sc: [17, 13], tags: ['wild', 'abyss'], near: ['church', 'road'] },
  { t: ['磁鉄鉱の谷'], env: '磁気', zone: 'high', sc: [1, 23], tags: ['earth', 'mech'], near: ['mine'], nat: ['磁鉄鉱'] },
  { t: ['方位狂いの丘'], env: '磁気', zone: 'low', sc: [3, 21], tags: ['wild'], near: ['road'], nat: ['磁鉄鉱'] },
  { t: ['湿地帯'], env: '湿気', zone: 'low', sc: [8, 6], tags: ['water', 'green'], near: ['water'], nat: ['沼蓮', '薬草'] },
  { t: ['霧の沼'], env: '湿気', zone: 'high', sc: [8], tags: ['water', 'abyss', 'green'], near: ['water'], nat: ['沼蓮'] },
  { t: ['湖畔の町'], env: '湿気', zone: 'safe', sc: [15, 16], tags: [], near: ['water', 'lab'], desc: ['霧が朝まで晴れない', '水路が家々の間を通る'] },
  { t: ['乾いた峡谷'], env: '乾燥', zone: 'high', sc: [23, 12], tags: ['wild', 'earth', 'hot'], near: ['road'] },
  { t: ['枯れ谷'], env: '乾燥', zone: 'low', sc: [12], tags: ['wild'], near: ['road'], nat: ['乾燥サボテン'] },
  { t: ['鉱山町'], env: '騒音', zone: 'safe', sc: [16, 2], tags: [], near: ['mine', 'village'] },
  { t: ['大滝の滝つぼ'], env: '騒音', zone: 'low', sc: [22], tags: ['water'], near: ['water'], nat: ['泉の水'] },
  { t: ['灰の平原'], env: '不毛', zone: 'high', sc: [18, 12], tags: ['wild', 'hot', 'abyss'], near: ['road'] },
  { t: ['枯れ野'], env: '不毛', zone: 'low', sc: [12, 21], tags: ['wild'], near: ['road'] },
  { t: ['幻惑の森'], env: '幻覚', zone: 'high', sc: [24, 0], tags: ['green', 'abyss'], near: ['forest'], nat: ['幻茸'] },
  { t: ['蜃気楼の谷'], env: '幻覚', zone: 'high', sc: [12], tags: ['hot', 'wild'], near: ['road'] },
];
const PLACE_NAMES = ['グラスト', 'エルム', 'ベルナ', 'オルド', 'カリス', 'セレン', 'ドーラ', 'フェルン', 'ガルム', 'ハイネ',
  'イストラ', 'ジルベ', 'クロム', 'リンデ', 'マルセ', 'ノーヴァ', 'オーレン', 'ペルト', 'クァンタ', 'ロッカ',
  'サイラ', 'ティーレ', 'ウルム', 'ヴェスタ', 'ヤーデ', 'ゾルカ', 'アルテ', 'ブリム', 'シエル', 'トゥーラ'];
const ZONE_NAME = { safe: '安全管理区域', low: '低危険度区域', high: '高危険度区域' };

/* ---------- 魔物 ----------
  [名前, 属性(null は属性なし), 出てくる難易度, 棲む場所の種類, 素材(null は素材の調達の対象にならない)] */
const MONSTERS2 = [
  ['サラマンダー', '火', 'CB', ['hot', 'earth'], 'サラマンダーの尾'], ['火吹きトカゲ', '火', 'C', ['hot', 'wild'], '火吹きトカゲの皮'],
  ['炎の精霊', '火', 'BA', ['hot'], null], ['火喰い鳥', '火', 'B', ['hot', 'sky'], '火喰い鳥の羽根'],
  ['溶岩ゴーレム', '火', 'A', ['hot', 'earth'], '溶岩ゴーレムの核石'], ['紅蓮の火竜', '火', 'S', ['hot', 'sky'], '火竜の鱗'],
  ['大ガニ', '水', 'C', ['water'], '大ガニの甲羅'], ['沼ガエル', '水', 'C', ['water', 'green'], '沼ガエルの粘液'],
  ['水妖', '水', 'B', ['water'], null], ['サハギンの群れ', '水', 'BA', ['water'], 'サハギンの鱗'],
  ['大海蛇', '水', 'A', ['water'], '大海蛇の抜け殻'], ['クラーケン', '水', 'S', ['water'], 'クラーケンの墨'],
  ['ハーピーの群れ', '風', 'CB', ['sky', 'wild'], 'ハーピーの羽根'], ['大鷲', '風', 'C', ['sky'], '大鷲の爪'],
  ['風の精霊', '風', 'B', ['sky', 'storm'], null], ['ワイバーン', '風', 'A', ['sky', 'earth'], 'ワイバーンの鱗'], ['嵐の巨鳥', '風', 'S', ['sky', 'storm'], '巨鳥の風切り羽'],
  ['さまよう自動人形', '雷', 'C', ['mech'], '自動人形のゼンマイ'], ['電気ウナギ', '雷', 'C', ['water', 'mech'], '電気ウナギの発電器官'],
  ['雷獣', '雷', 'B', ['storm', 'mech', 'wild'], '雷獣の毛皮'], ['機械仕掛けの番兵', '雷', 'BA', ['mech'], '番兵の歯車'],
  ['雷鳥', '雷', 'A', ['storm', 'sky'], '雷鳥の尾羽'], ['雷雲の精霊', '雷', 'A', ['storm'], null], ['天雷竜', '雷', 'S', ['storm', 'sky', 'mech'], '天雷竜の角'],
  ['雪ウサギの群れ', '氷', 'C', ['cold'], '雪ウサギの毛'], ['氷狼の群れ', '氷', 'CB', ['cold', 'wild'], '氷狼の毛皮'],
  ['雪男', '氷', 'B', ['cold'], '雪男の毛皮'], ['氷の精霊', '氷', 'BA', ['cold'], null], ['霜の巨人', '氷', 'A', ['cold'], '霜の巨人の爪'], ['氷晶竜', '氷', 'S', ['cold'], '氷晶竜の鱗'],
  ['岩トカゲ', '地', 'C', ['earth', 'wild'], '岩トカゲの皮'], ['大モグラ', '地', 'C', ['earth', 'green'], '大モグラの爪'],
  ['ゴーレム', '地', 'B', ['earth', 'holy'], 'ゴーレムの核'], ['大ムカデ', '地', 'B', ['earth', 'city'], '大ムカデの毒腺'],
  ['バジリスク', '地', 'A', ['earth', 'wild'], 'バジリスクの目'], ['大地竜', '地', 'S', ['earth'], '大地竜の甲殻'],
  ['人食い花', '草', 'C', ['green'], '人食い花の蜜'], ['毒キノコの群れ', '草', 'C', ['green', 'earth'], '毒キノコの胞子'],
  ['大蛇', '草', 'B', ['green', 'water'], '大蛇の抜け殻'], ['トレント', '草', 'B', ['green'], 'トレントの樹皮'], ['マンドラゴラ', '草', 'B', ['green'], 'マンドラゴラの根'],
  ['茨の魔獣', '草', 'A', ['green'], '茨の魔獣の棘'], ['森の古き王', '草', 'S', ['green'], null],
  ['光虫の大群', '光', 'C', ['holy', 'green'], '光虫の発光器'], ['光の精霊', '光', 'B', ['holy'], null],
  ['狂った聖獣', '光', 'A', ['holy'], '聖獣の角'], ['白銀の天馬', '光', 'A', ['holy', 'sky'], '天馬のたてがみ'], ['堕ちた守護天使', '光', 'S', ['holy', 'sky'], null],
  ['スケルトン', '闇', 'C', ['abyss'], null], ['大コウモリ', '闇', 'C', ['abyss', 'earth', 'city'], '大コウモリの翼膜'],
  ['レイス', '闇', 'B', ['abyss'], null], ['影の魔獣', '闇', 'B', ['abyss', 'wild'], '影の魔獣の牙'],
  ['吸血鬼', '闇', 'A', ['abyss', 'city'], null], ['冥府の魔将', '闇', 'S', ['abyss'], null],
  ['大ネズミ', null, 'C', ['city', 'earth', 'wild'], '大ネズミの尾'], ['スライムの群れ', null, 'C', ['city', 'water', 'green'], 'スライムの基質'],
  ['巨大スライム', null, 'BA', ['city'], 'スライムの基質'], ['大猪', null, 'C', ['wild', 'green'], '大猪の牙'],
  ['ゴブリンの群れ', null, 'CB', ['wild', 'green', 'earth'], null], ['魔狼の群れ', null, 'B', ['wild', 'green', 'cold'], '魔狼の毛皮'],
  ['オーク', null, 'B', ['wild', 'green', 'earth'], 'オークの牙'], ['オーガ', null, 'A', ['wild', 'earth', 'green'], 'オーガの角'],
  ['ミノタウロス', null, 'A', ['earth', 'wild', 'abyss'], 'ミノタウロスの角'], ['キマイラ', null, 'S', ['wild', 'hot', 'green'], 'キマイラのたてがみ'],
  ['古竜', null, 'S', ['wild', 'earth', 'sky', 'cold', 'water', 'abyss', 'holy', 'city', 'mech', 'storm'], '古竜の鱗'],
];
const isFlock = name => /群れ|大群/.test(name);
// 魔物欄の特徴と被害（[文, 条件]。条件は near の種類、または 'flock'（群れ）・'single'（群れでない））
const MONSTER_TRAITS2 = [['群れで行動する', 'flock'], ['群れのボスがいる', 'flock'], ['夜行性', null], ['体長は人の倍ほど', 'single'], ['動きが素早い', null],
  ['硬い外皮に覆われている', null], ['縄張り意識が強い', null], ['人の声を真似る', null], ['追い詰められると凶暴になる', null], ['光り物を集める習性がある', null],
  ['鳴き声が遠くまで響く', null], ['知能が高い', null], ['数年ぶりに現れた', null], ['近年数が増えている', null], ['昼間は姿を隠している', null],
  ['食欲が旺盛', null], ['傷の治りが早い', null], ['好奇心が強い', null]];
const MONSTER_DAMAGE2 = [['街道で荷馬車が襲われた', 'road'], ['商隊が足止めされている', 'road'], ['見張り小屋が壊された', 'road'], ['郵便が届かなくなった', 'road'],
  ['家畜の被害が続いている', 'farm'], ['畑が荒らされた', 'farm'], ['井戸が使えなくなった', 'village'], ['村の子どもが目撃した', 'village'], ['祭りが延期になった', 'village'],
  ['漁に出られなくなった', 'port'], ['船が港に戻れずにいる', 'port'], ['水門が開かなくなった', 'water'], ['坑道が封鎖された', 'mine'], ['山道が通れない', 'mine'],
  ['郵便の配達が止まった', 'sky'], ['観光の客足が途絶えた', 'sky'], ['薪拾いができない', 'forest'], ['森番が怪我をした', 'forest'],
  ['墓が荒らされた', 'church'], ['巡礼が取りやめになった', 'church'], ['調査が中断されている', 'lab'], ['夜の外出が禁じられている', 'city'], ['地下の配管が壊された', 'city'],
  ['旅人が行方不明になった', null], ['まだ被害は出ていない', null], ['冒険者が一度撤退した', null], ['被害の詳細は不明', null], ['目撃情報が相次いでいる', null]];

/* ---------- 近くにいる人々 ---------- */
// 依頼者 [名前, 完了時のサイン]。{n} は場所の固有名
const REQUESTERS2 = {
  city: [['王都商人組合', '商人組合'], ['中央市場 組合', '市場組合'], ['王立図書館', '王立図書館'], ['衛兵詰所', '衛兵詰所'], ['下水道管理局', '管理局']],
  road: [['街道警備詰所', '警備詰所'], ['旅籠「麦穂亭」主人', '麦穂亭'], ['運送組合', '運送組合']],
  port: [['港町漁業組合', '漁業組合'], ['灯台守', '灯台守'], ['水運組合', '水運組合']],
  water: [['{n}町 町長', '{n}町長'], ['水門番', '水門番'], ['学院 水棲生物研究室', '学院研究室']],
  sky: [['雲上郵便局', '雲上郵便局'], ['極地観光案内所', '観光案内所']],
  mine: [['鉱山組合', '鉱山組合'], ['機関工房 親方', '工房親方'], ['鉄道保線区', '保線区']],
  forest: [['森の集落 長老', '長老'], ['製材所', '製材所'], ['森番', '森番']],
  church: [['教会', '教会'], ['修道院', '修道院'], ['墓守', '墓守']],
  lab: [['学院 研究室', '学院研究室'], ['魔法学会', '魔法学会'], ['遺跡調査団', '調査団']],
  farm: [['牧場主', '牧場主'], ['農夫組合', '農夫組合']],
  village: [['{n}村 村長', '{n}村長']],
  any: [['伯爵家 執事', '伯爵家'], ['薬師ギルド', '薬師ギルド'], ['個人（匿名）', '匿名']],
};
// 護衛の対象
const WHO2 = {
  city: ['貴族の令嬢', '楽団', '大使の一行'], road: ['行商隊', '郵便馬車', '旅芸人の一座'], port: ['水夫の一団', '積み荷の荷馬車'],
  water: ['測量士の一行', '学者の一行'], sky: ['極地観光の一行', '郵便配達員'], mine: ['鉱夫の一団', '技師の一行'],
  forest: ['薬師', '森番'], church: ['巡礼者の一行', '教会の職員'], lab: ['学者の一行', '遺跡調査団'], farm: ['牧童', '家畜を運ぶ荷車'], village: ['村の子どもたち', '行商隊'],
};
// 捕獲（探索）する家畜やペット
const PETS2 = { farm: ['逃げた羊の群れ', '迷い馬', '牧場の鶏'], village: ['迷い馬', '村の番犬'], city: ['伯爵家の猫', '見世物小屋の猿', '郵便鳩'], sky: ['郵便鳩'] };

/* ---------- 概要の書き方 ----------
  {m} 魔物、{mat} 魔物の素材、{nat} 自然の素材、{pet} 家畜やペット、{p} 場所、{who} 護衛の対象
  zone を持つものは、その区域の場所でだけ使う */
const QUEST_PHRASES2 = {
  討伐: [['{m}の討伐'], ['討伐：{m}'], ['{m}の駆除'], ['駆除：{m}'], ['{m}の殲滅'], ['{m}の鎮圧'], ['{m}の捕獲'], ['{mat}の調達'], ['{p}（低危険度区域）での非常時対応', 'low']],
  探索: [['{p}の探索'], ['探索：{p}'], ['{nat}の採取'], ['採取：{nat}'], ['{pet}の捕獲'], ['{nat}の調達'], ['{p}（安全管理区域）での非常時対応', 'safe']],
  護衛: [['{who}の護衛'], ['護衛：{who}'], ['{who}の付き添い'], ['{who}の身辺警護'], ['{p}（高危険度区域）での非常時対応', 'high']],
};
// クエスト名 [名前, 条件]
const QUEST_TITLES3 = {
  共通: [['急ぎの依頼'], ['至急求む'], ['腕の立つ方へ'], ['どうかお力を'], ['長期の悩みを解決して'], ['村の困りごと', q => q.near.includes('village') || q.near.includes('farm')]],
  討伐: [['夜の脅威'], ['街道の安全確保', q => q.near.includes('road')], ['畑を守れ', q => q.near.includes('farm')], ['群れの排除', q => q.monster && isFlock(q.monster.name)]],
  探索: [['眠れる資源', q => q.kind === 'nat'], ['失せ物探し', q => q.kind === 'pet'], ['未踏の地へ', q => q.zone === 'high'], ['品薄の素材', q => q.kind === 'nat'], ['現地の調査', q => q.kind === 'place']],
  護衛: [['安全な旅路を'], ['大切な人を守って'], ['道中の守り'], ['帰り道の手助け']],
};
