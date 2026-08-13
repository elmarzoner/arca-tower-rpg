# アルカの塔 — 敵キャラクター案集

新規モンスターのデザイン案。ステータスは現行ゲームバランス(data.js)の階層カーブに合わせてあり、そのまま実装可能。画像は別AIで生成する前提で、各案に発注用の見た目説明(日本語+英語プロンプト)を付記。

---

## 画像発注時の共通仕様

- **スタイル**: スーパーファミコン期のJRPG敵グラフィック風。正面向き(やや斜めも可)、全身、戦闘画面用の一枚絵
- **背景**: 透過PNG(または単色マゼンタ #FF00FF で塗りつぶし→ゲーム側で抜く)
- **輪郭線**: ダークネイビー(#16142a)の1〜2pxアウトライン。ゲーム内の既存絵と統一
- **サイズ**: 通常敵 512×512(ゲームでは48〜64px相当に縮小)、ボス 768×768(96px相当)
- **影**: 地面の影は描かない(ゲーム側で接地影を自動描画)
- **ファイル名**: `m_<英字id>.png`(通常敵)/ `b_<英字id>.png`(ボス)。data.jsのspr名と一致させる
- **共通プロンプト接頭辞(EN)**: `16-bit SNES JRPG enemy sprite, front-facing battle pose, full body, dark navy outline, transparent background, no drop shadow, vibrant retro color palette`

## ステータス基準表(階層カーブ)

| 階層帯 | HP | こうげき | しゅび | すばやさ | EXP | G | 仲間率目安 |
|---|---|---|---|---|---|---|---|
| T1 (2-9F) | 7-15 | 8-12 | 3-8 | 4-10 | 2-5 | 4-8 | 10-14% |
| T2 (11-19F) | 25-38 | 18-25 | 8-14 | 8-16 | 9-13 | 10-18 | 8-10% |
| T3 (21-29F) | 40-72 | 30-40 | 14-42 | 6-24 | 20-32 | 20-48 | 7-8% |
| T4 (31-39F) | 48-65 | 44-54 | 16-24 | 22-40 | 36-45 | 32-45 | 6-8% |
| T5 (41-49F) | 70-90 | 54-64 | 26-38 | 16-42 | 55-65 | 45-60 | 5-7% |
| T6 (51-59F) | 90-135 | 66-85 | 45-85 | 10-32 | 90-110 | 60-115 | 5-6% |
| T7 (61-69F) | 110-165 | 85-100 | 50-80 | 28-58 | 135-170 | 90-135 | 4-6% |
| T8 (71-79F) | 165-205 | 105-128 | 68-108 | 20-55 | 230-270 | 145-175 | 4-5% |
| T9 (81-89F) | 205-265 | 128-150 | 92-118 | 42-78 | 370-430 | 210-265 | 3-5% |
| T10 (91-99F) | 255-310 | 158-175 | 100-128 | 78-98 | 560-660 | 270-350 | 2-4% |

**行動パターンの語彙**(現エンジンで即使用可): `attack` / `doubleattack`(2回攻撃) / `strongattack`(1.7倍) / `sleepattack`(眠り粉) / `poisonattack`(毒牙) / `steal`(ゴールド盗み) / `defend` / `flee`(逃走) / `['spell', 呪文id]` / `['breath', 威力]`
**要エンジン拡張**と書いた行動は新規実装が必要。

---

# T1 いしずえの階層(2〜9F)— 石造・薄暗い最下層

### コケダマン(苔玉系)
- **ステータス**: HP 9 / 攻 8 / 守 7 / 速 4 / EXP 3 / 5G / 仲間率 12%
- **行動**: attack, defend(まるくなる)
- **特徴**: 塔の湿った石段に転がる苔むした球。転がって体当たりする。危険を感じると丸まって固くなる。実は塔の石を少しずつ食べて掃除している益獣で、村人には嫌われていない
- **仲間時**: ニックネーム「コロスケ」。守備型タンク。Lv12でマモール習得
- **見た目**: ふわふわの苔に覆われた緑の球体。つぶらな白い目が2つ、下から短い足が2本。頭に小さな双葉
  - EN: `round moss ball creature, fluffy green moss body, two round white eyes, tiny feet, small sprout on head, cute`
- **色違い展開**: ドクダマン(T3・紫苔・poisonattack)、ハナダマン(T5・花咲き苔・horon使用)

### ヒカリムシ(発光虫系)
- **ステータス**: HP 7 / 攻 9 / 守 3 / 速 11 / EXP 3 / 6G / 仲間率 11%
- **行動**: attack, ['spell', 'hinon'](弱い光弾)
- **特徴**: 塔の照明として「つくりしもの」が放った虫の野生化。腹部が行灯のように光る。倒すと一瞬あたりが明るくなる
- **見た目**: ホタルと提灯を合わせた丸い甲虫。深い藍色の殻、橙色に光る腹、大きな複眼
  - EN: `round firefly beetle, deep indigo shell, glowing orange lantern abdomen, big compound eyes`
- **色違い展開**: ホタルビ(T4・青白い光・sleepattack)、ホシムシ(T9・星色の光・birimga)

### レンガベビー(煉瓦人形系)
- **ステータス**: HP 14 / 攻 11 / 守 8 / 速 5 / EXP 5 / 7G / 仲間率 10%
- **行動**: attack, strongattack
- **特徴**: 塔の壁から剥がれ落ちた煉瓦が寄り集まった小さな人形。塔の自己修復機能の一部が暴走したもの。壁に還りたがっている
- **見た目**: 赤茶色の煉瓦ブロックを積んだ子供型ゴーレム。目は空洞に灯る小さな白い光。頭の煉瓦が一つ斜めにずれている
  - EN: `small golem made of stacked red bricks, childlike proportions, glowing white dot eyes in hollow sockets, one brick tilted on head`
- **色違い展開**: レンガナイト(T3・灰色石材・defend持ち)、レンガロード(T6・黒曜石・doubleattack)

---

# T2 みずわの階層(11〜19F)— 水路と滝の層

### アワプク(泡魚系)
- **ステータス**: HP 26 / 攻 19 / 守 10 / 速 13 / EXP 10 / 12G / 仲間率 10%
- **行動**: attack, ['spell', 'hiyari']
- **特徴**: 泡をまとって宙に浮くフグ。怒ると泡ごと膨らむ。割れた泡は小さな虹を作る。アクエラの水路の掃除係
- **見た目**: 丸い水色のフグが大きな透明の泡の中に浮かんでいる。頬が膨らみ、ヒレは小さく、目は不満げな半目
  - EN: `round light-blue pufferfish floating inside a big transparent bubble, puffy cheeks, grumpy half-closed eyes, tiny fins`
- **色違い展開**: アワキング(T5・王冠つき金泡・hiyariga)

### カサガイン(笠貝系)
- **ステータス**: HP 38 / 攻 18 / 守 26 / 速 6 / EXP 13 / 14G / 仲間率 9%
- **行動**: attack, defend, defend(堅い)
- **特徴**: 壁に張り付く巨大な笠貝。近づくと剥がれて噛みついてくる。殻は水路のミネラルで年輪状に育ち、年寄りほど硬い
- **見た目**: 渦巻き模様の青緑の笠型貝殻。殻の下から覗く軟体部に大きな一つ目と小さな牙
  - EN: `giant limpet shell monster, teal spiral-patterned conical shell, single big eye and small fangs peeking underneath`
- **色違い展開**: マグマガイン(T7・溶岩色・breath 40)

### ヌレネコ(水霊猫系)
- **ステータス**: HP 28 / 攻 22 / 守 9 / 速 18 / EXP 12 / 15G / 仲間率 10%(人気枠・やや高め)
- **行動**: attack, doubleattack, flee
- **特徴**: 水たまりから生まれる猫の形をした小さな水霊。いつも濡れていて不機嫌そう。乾くと消えてしまうので水場から離れない。仲間にすると雨の日だけ機嫌がいい
- **仲間時**: ニックネーム「ピチャ」。速攻アタッカー。Lv14でヒヤリ習得
- **見た目**: 半透明の水でできた子猫。輪郭が波打ち、しっぽの先から雫が垂れる。目は大きな金色
  - EN: `small cat made of translucent flowing water, rippling outline, water drop falling from tail tip, big golden eyes, slightly grumpy`
- **色違い展開**: ユキネコ(T8雲上・雪の結晶をまとう・hiyariga)

---

# T3 すないろの階層(21〜29F)— 砂岩と隊商の層

### スナモグラ(砂潜り系)
- **ステータス**: HP 45 / 攻 34 / 守 16 / 速 20 / EXP 23 / 26G / 仲間率 8%
- **行動**: attack, defend(砂に潜る), strongattack(飛び出し)
- **特徴**: 砂に潜って移動し、足元から奇襲する。鼻先の星型の触手で獲物を探す。掘った穴が商人の荷車を転ばせるので賞金がかけられている
- **見た目**: 砂色のモグラ。ピンクの星型の鼻、大きなシャベル状の前足、目はほぼ閉じている。半身が砂から出ているポーズ
  - EN: `sand-colored mole emerging from sand, pink star-shaped nose, huge shovel claws, squinting eyes`

### ツボワナ(擬態壺系)
- **ステータス**: HP 55 / 攻 38 / 守 20 / 速 8 / EXP 28 / 40G / 仲間率 7%
- **行動**: attack, strongattack, steal
- **特徴**: 商人の壺に化けて隊商に紛れ込む軟体生物。中に貯めた戦利品ごと倒すと少し多めにゴールドを落とす。本体は壺の中の粘体
- **見た目**: 素焼きの壺から紫の粘体が溢れ出し、大きな口と舌が壺の縁にかかっている。壺には隊商の焼き印
  - EN: `mimic clay pot monster, purple slime body overflowing from jar, big mouth with tongue over the rim, merchant brand mark on pot`
- **色違い展開**: タカラワナ(T6・宝箱に擬態・gold 300・仲間率3%)

### バクダンサボテン「サボム」(サボテン系)
- **ステータス**: HP 40 / 攻 30 / 守 24 / 速 10 / EXP 25 / 24G / 仲間率 8%
- **行動**: attack, poisonattack(針)、**じばく(要エンジン拡張: HP30%以下で全体に自HP分ダメージ)**
- **特徴**: 乾いた階に生える歩くサボテン。針に微毒。追い詰めると体を震わせて破裂する習性があり、慣れた冒険者は膨らみ始めたら逃げる
- **見た目**: 二頭身のサボテン。太い胴に短い腕、頭に赤い花一輪、体中に黄色い針。への字口
  - EN: `two-headed-tall walking cactus, stubby arms, single red flower on head, yellow spikes, pouty mouth`

---

# T4 とこよの階層(31〜39F)— 終わらない夜の層

### ユメクイバク(獏系)
- **ステータス**: HP 58 / 攻 46 / 守 20 / 速 26 / EXP 40 / 38G / 仲間率 7%
- **行動**: sleepattack, attack, ['spell', 'nemurin']
- **特徴**: 人の夢を食べる獏。ノクターナに集められた悪夢の掃除係だった。悪夢を食べ過ぎて体が夜空の色に染まった。眠らせてから夢だけ齧るので本人に悪意はない
- **仲間時**: ニックネーム「バクゥ」。眠り特化の補助役。Lv16でネムリン強化版
- **見た目**: ずんぐりした獏。体は星の散った紺色、鼻は長く垂れ、目は常に眠そうな三日月形。足元に小さな夢の泡
  - EN: `chubby tapir creature, dark navy body speckled with tiny stars, long droopy snout, sleepy crescent eyes, little dream bubbles at feet`

### カガミビト(鏡人系)
- **ステータス**: HP 52 / 攻 50 / 守 22 / 速 30 / EXP 42 / 40G / 仲間率 6%
- **行動**: attack, strongattack, **ミラー(要エンジン拡張: 受けた呪文を反射)**
- **特徴**: 割れた姿見に宿った影。向き合った者の構えを真似て戦う。90Fのシャドウソラと同根の存在で、とこよの階層はシャドウの「素材」が湧く場所という伏線要員
- **見た目**: 人型の黒いシルエットが縦長の割れた鏡から半身を乗り出している。鏡面には別の表情が映る
  - EN: `black humanoid silhouette emerging from a tall cracked mirror, mirror surface reflecting a different face, eerie`

### ヨナキドリ(夜啼鳥系)
- **ステータス**: HP 48 / 攻 44 / 守 17 / 速 38 / EXP 38 / 34G / 仲間率 7%
- **行動**: attack, sleepattack(子守歌), flee
- **特徴**: 夜の階層に響く泣き声の主。悲しい歌で獲物を眠らせる。実は迷子のヒナを探して100年鳴き続けている親鳥。倒すと少しの間だけ鳴き声が止み、階が静かになる
- **見た目**: 濃紫の夜鷹。目の下に涙のような白い模様、口を開けて鳴いているポーズ、羽根の先が音符状に散る
  - EN: `dark purple nightjar bird, white teardrop markings under eyes, singing with open beak, feather tips scattering like music notes`

---

# T5 そらにわの階層(41〜49F)— 空中庭園の層

### バラツルギ(薔薇剣士系)
- **ステータス**: HP 78 / 攻 62 / 守 30 / 速 34 / EXP 60 / 52G / 仲間率 6%
- **行動**: attack, doubleattack, poisonattack(棘)
- **特徴**: 庭園の薔薇が剣士の形に絡み合ったもの。ガーデュラ配下の庭の警備兵。剣は硬化した茎で、折れてもすぐ生え変わる。礼儀正しく、戦闘前に一礼する
- **見た目**: 緑の蔓が編み上がった細身の騎士。胸に大輪の赤薔薇、腕は茎の剣、頭部は蕾の兜
  - EN: `slender knight woven from green rose vines, big red rose on chest, thorny stem swords for arms, rosebud helmet, elegant bow pose`
- **色違い展開**: シロバラツルギ(T9・白薔薇・horonga使用の聖騎士)

### ミツロボ(庭師蜂系)
- **ステータス**: HP 72 / 攻 56 / 守 34 / 速 40 / EXP 58 / 55G / 仲間率 6%
- **行動**: attack, poisonattack(針), defend
- **特徴**: 「つくりしもの」が庭の受粉のために作った機械蜂。半分生体で半分機械。T6機械層への伏線。腹の蜜タンクに溜めた花蜜は最高級品(倒すと稀にいやしそうドロップ)
- **見た目**: ずんぐりした蜂。胴体は真鍮の機械、羽根はステンドグラス風の透明板、目は丸いレンズ。お腹に小さな蜜メーター
  - EN: `round mechanical bee, brass clockwork body, stained-glass style transparent wings, round lens eyes, tiny honey gauge on belly`

### タンポポライオン「ワタガミ」(綿毛獅子系)
- **ステータス**: HP 85 / 攻 58 / 守 28 / 速 24 / EXP 62 / 48G / 仲間率 7%
- **行動**: attack, strongattack, sleepattack(綿毛)
- **特徴**: たてがみが綿毛のライオン。吠えると綿毛が舞って眠気を誘う。庭園の日だまりで昼寝するのが日課で、縄張りに入らなければ温厚。セツナの手記45Fの「はなばたけ」の主
- **仲間時**: ニックネーム「ワタタン」。バランス型。仲間人気枠
- **見た目**: 金色の小さなライオン。たてがみが白い綿毛でボリューム満点、風で数本飛んでいる。眠そうな優しい目
  - EN: `small golden lion with a huge fluffy white dandelion-seed mane, a few seeds drifting away, gentle sleepy eyes`

---

# T6 はぐるまの階層(51〜59F)— 機械仕掛けの層

### オルゴロン(オルゴール系)
- **ステータス**: HP 95 / 攻 70 / 守 50 / 速 18 / EXP 95 / 80G / 仲間率 6%
- **行動**: sleepattack(子守歌のねじ巻き), attack, ['spell', 'nemurin']
- **特徴**: 塔の子供たちのために作られた自動オルゴールの野生化。壊れた音程で子守歌を流し続ける。直してあげたいと思う冒険者が多いが近づくと攻撃してくる。倒す(=止める)と正しい音程で最後の一小節を鳴らす
- **見た目**: 歩くアンティークオルゴール箱。開いた蓋から回る真鍮のバレリーナ人形、側面にゼンマイ、音符が漏れ出す
  - EN: `walking antique music box, open lid with spinning brass ballerina figure, big wind-up key on side, leaking music notes`

### ピカット(掃除ロボ系)
- **ステータス**: HP 90 / 攻 66 / 守 60 / 速 30 / EXP 90 / 130G(高め) / 仲間率 5%
- **行動**: attack, flee, steal(ゴミと間違えて所持金を吸引)
- **特徴**: 床磨きロボの生き残り。落ちているものを何でも吸い込むため体内に小銭が溜まっている(gold高め)。すぐ逃げる。仲間にすると宝箱の場所で鳴く…という設定(将来実装)
- **仲間時**: ニックネーム「ピカ丸」。守備型
- **見た目**: 丸い銅色の掃除ロボット。下部に回転ブラシ、頭に一本アンテナ、レンズの目は「へ」の字で働きたくなさそう
  - EN: `round copper cleaning robot, spinning brushes underneath, single antenna, reluctant frowning lens eyes, coins stuck in intake`

### ギアヅモ(歯車力士系)
- **ステータス**: HP 135 / 攻 84 / 守 78 / 速 12 / EXP 108 / 95G / 仲間率 5%
- **行動**: attack, strongattack(張り手), defend
- **特徴**: 塔の大歯車を人力(?)で回していた作業機械。力比べが大好きで、通行人に相撲を挑む。負けを認めると道を譲る律儀な性格
- **見た目**: 力士体型の鉄ゴーレム。胸と肩に大きな歯車が食い込み、腰に注連縄風の配線、突っ張りポーズ
  - EN: `sumo wrestler shaped iron golem, big gears embedded in chest and shoulders, cable rope belt like shimenawa, palm-thrust pose`

---

# T7 りゅうがんの階層(61〜69F)— 竜と溶岩の層

### タマゴロン(竜卵系)
- **ステータス**: HP 110 / 攻 85 / 守 80 / 速 15 / EXP 135 / 90G / 仲間率 9%(高め・かわいい枠)
- **行動**: defend, attack(体当たり), ['breath', 20](殻の隙間から火)
- **特徴**: 孵る前から歩き回る竜の卵。殻にヒビが入っていて中から尻尾だけ出ている。竜族は「気の早いやつ」と呼んで見守っている。仲間にして育てるとプチドラ級に成長(レベルで強化)
- **仲間時**: ニックネーム「タマちゃん」。Lv20で hinonga 習得(孵化の兆し)
- **見た目**: クリーム色の大きな卵。稲妻型のヒビから小さな橙のしっぽと片足が出ている。殻の上部に目の穴が2つ
  - EN: `large cream dragon egg with lightning-shaped cracks, tiny orange tail and one leg sticking out, two eye holes glowing inside`

### マグマサーペント(溶岩蛇系)
- **ステータス**: HP 150 / 攻 95 / 守 62 / 速 42 / EXP 155 / 110G / 仲間率 4%
- **行動**: attack, ['breath', 42], poisonattack(高熱=毒扱い)
- **特徴**: 溶岩の川を泳ぐ長虫。体表は冷えた黒い岩、関節の隙間から溶岩が覗く。脱皮した殻は竜族の鍛冶の燃料になる
- **見た目**: 黒い岩塊が連なる大蛇。節の隙間がオレンジに発光、頭は溶岩が滴る竜頭、とぐろポーズ
  - EN: `serpent made of chained black volcanic rocks, glowing orange lava between segments, dragon-like head dripping lava, coiled pose`

### リュウキシ(竜人剣士系)
- **ステータス**: HP 160 / 攻 98 / 守 74 / 速 50 / EXP 165 / 125G / 仲間率 4%
- **行動**: attack, doubleattack, strongattack
- **特徴**: 直立歩行する若い竜族の剣士。ドラグノアの試練を守る誇り高い武人。人間を認めていないが、卑怯な戦いはしない。勝つと敬礼してくれる
- **見た目**: 深緑の鱗の竜人。片手に骨柄の大剣、赤いマント風の翼膜、胸に竜王の紋章
  - EN: `proud dragonewt swordsman, deep green scales, large bone-hilted sword, red wing membrane like a cape, dragon king emblem on chest`

---

# T8 うんぜんの階層(71〜79F)— 雲海の層

### クジラン(空鯨系)
- **ステータス**: HP 205 / 攻 105 / 守 70 / 速 22 / EXP 245 / 150G / 仲間率 5%(人気レア枠)
- **行動**: attack, ['breath', 38](潮吹き=冷気), defend
- **特徴**: 雲の海を泳ぐ子鯨。歌うと雲が渦を巻く。群れからはぐれた個体だけが通路に迷い込む。仲間にすると移動中たまに鼻歌(BGMに効果音が混ざる…将来実装)
- **仲間時**: ニックネーム「クージー」。高HPタンク。Lv25で hiyariga
- **見た目**: 空色の丸い子鯨が小さな雲に乗って浮いている。腹は白、背に星の斑点、目は大きく穏やか
  - EN: `chubby sky-blue baby whale floating on a small cloud, white belly, star-shaped spots on back, big gentle eyes`

### ゴロタ(雷小僧系)
- **ステータス**: HP 170 / 攻 108 / 守 68 / 速 55 / EXP 235 / 145G / 仲間率 5%
- **行動**: ['spell', 'birim'], ['spell', 'birimga'], attack
- **特徴**: 雷雲から生まれた小鬼。太鼓を叩いて雷を呼ぶ。いたずら好きで、旅人の金属装備に静電気を溜めて驚かせて遊ぶ。泣くと雨が降る
- **見た目**: もこもこの雷雲の体に赤鬼の顔。背中に小さな太鼓を2つ、手にバチ、頭に短い角と稲妻型のツノ飾り
  - EN: `small oni imp with fluffy thundercloud body, red face, two small drums on back, drumsticks in hands, lightning-bolt horns`

### カザミドリウス(風見鶏系)
- **ステータス**: HP 175 / 攻 118 / 守 75 / 速 52 / EXP 250 / 160G / 仲間率 4%
- **行動**: attack, doubleattack(くちばし連撃), flee
- **特徴**: 塔の外壁の風見鶏に風の精が宿ったもの。常に風上を向いてしまう習性があり、戦闘中もくるくる回る。羽根は真鍮製で嵐の夜に音が鳴る
- **見た目**: 真鍮の機械鳥。矢印型の尾羽、体に東西南北の文字盤、首がくるりと後ろを向いている瞬間
  - EN: `brass weathervane rooster come alive, arrow-shaped tail, compass letters on body, head spun backwards mid-turn`

---

# T9 ほしかげの階層(81〜89F)— 記憶と星影の層

### メモリア(記憶結晶系)
- **ステータス**: HP 215 / 攻 132 / 守 105 / 速 48 / EXP 390 / 230G / 仲間率 4%
- **行動**: ['spell', 'hiyariga'], ['spell', 'birimga'], attack
- **特徴**: 塔に染み込んだ千年分の記憶が結晶化したもの。表面に知らない誰かの思い出が映る。倒すと記憶は塔に還り、一瞬だけ懐かしい匂いがする。セツナの記憶が映る個体もいるという噂(手記コンプ勢へのご褒美テキスト)
- **見た目**: 浮遊する紫水晶のクラスター。各結晶面に古い風景や人影がぼんやり映る。中心に淡い光の核
  - EN: `floating amethyst crystal cluster, faint old memories and silhouettes reflected on each facet, soft glowing core`

### ステラウルフ(星狼系)
- **ステータス**: HP 240 / 攻 145 / 守 96 / 速 75 / EXP 410 / 250G / 仲間率 4%
- **行動**: attack, doubleattack, strongattack(流星撃)
- **特徴**: 星影の廊下を駆ける狼。毛皮は夜空そのもので、走った軌跡に星が流れる。群れず、強い者にだけ興味を示す。仲間にすると最速クラスのアタッカー
- **仲間時**: ニックネーム「ホシカゲ」。速攻型エース候補
- **見た目**: 引き締まった狼。毛皮は深紺に星屑が瞬き、目は白金、尾の先が流星のように尾を引く
  - EN: `sleek wolf with deep midnight-blue starfield fur, twinkling stardust, platinum eyes, tail trailing like a shooting star`

### エラッタ(壊れ端末系)
- **ステータス**: HP 225 / 攻 138 / 守 112 / 速 45 / EXP 400 / 240G / 仲間率 3%
- **行動**: attack, doubleattack, **バグる(要エンジン拡張: ランダムな呪文を暴発)**
- **特徴**: アルカの端末機の壊れたもの。「オ客サマ…ゴ案内…デキマセン…」と繰り返しながら攻撃してくる。かつては登り手を案内する係だった。アルカの孤独の年月を物語る存在
- **見た目**: ひび割れた白い卵型ロボット。顔面スクリーンにノイズと「?」表示、片腕がスパークし、案内旗を握ったまま
  - EN: `cracked white egg-shaped guide robot, face screen showing static noise and a question mark, one sparking arm, still holding a small tour flag`

---

# T10 てんがいの階層(91〜99F)— 天蓋直下・光と影の層

### ルクスガード(光衛兵系)
- **ステータス**: HP 270 / 攻 165 / 守 118 / 速 82 / EXP 600 / 300G / 仲間率 3%
- **行動**: attack, strongattack, ['spell', 'horonga'](自己修復)
- **特徴**: アルカが自身の光から編んだ衛兵。実体はなく、鎧の中は光だけ。アルカの「誰も来ないでほしい」と「誰か来てほしい」の矛盾から生まれたため、攻撃の合間にためらう瞬間がある
- **見た目**: 白金の全身鎧が中身なしで浮遊。兜の奥に光の粒子、手には光の槍。鎧の隙間から光が漏れる
  - EN: `floating hollow white-gold full armor, glowing particles inside helmet, spear made of pure light, light leaking through armor gaps`

### ミストレムナント(霧の残滓系)
- **ステータス**: HP 255 / 攻 160 / 守 100 / 速 88 / EXP 580 / 280G / 仲間率 2%
- **行動**: attack, poisonattack(蝕み), ['spell', 'nemurin']
- **特徴**: 千年前に世界を呑んだ「ほしばみの霧」のわずかな残滓。塔内に閉じ込められ薄まりきった末路。もはや世界を呑む力はなく、ただ光を怖がって天蓋の陰に隠れている。ラスボス前に「霧は本当に恐ろしいものだったのか?」を問いかける存在
- **見た目**: 人型になりかけた灰紫の霧。体の中に食べた星の残光が点々と瞬く。輪郭が常に崩れては戻る
  - EN: `humanoid shape of ash-purple mist barely holding form, faint starlight specks swallowed inside, edges constantly dissolving`

### アルカファントム(偽神系)
- **ステータス**: HP 300 / 攻 172 / 守 125 / 速 90 / EXP 650 / 340G / 仲間率 なし(0%)
- **行動**: ['spell', 'hinongia'], ['spell', 'hiyariga'], strongattack
- **特徴**: アルカ=コアの試練用の分身。本体の記憶の一部で動くため、戦闘中に「……コナイデ」「……キテ」と矛盾したことを呟く。倒すと光の羽根になって天へ昇る
- **見た目**: アルカ=コア(白い多面体の核)の小型で不完全な複製。面の一部が欠け、青い光の輪が明滅する
  - EN: `smaller imperfect copy of a white polyhedron core deity, some facets missing, flickering blue halo rings`

---

# レア・特殊枠(全階層)

### ラッキープルル(幸運スライム)
- **出現**: 全階層で极稀(出現率1%枠)
- **ステータス**: HP 30 / 攻 5 / 守 120 / 速 90 / EXP 200 / 500G / 仲間率 3%
- **行動**: flee, flee, attack
- **特徴**: 四つ葉を頭に載せた金色がかったプルル。すぐ逃げるが、倒すと必ず「たね・きのみ」系をドロップ(要ドロップ実装)。仲間になると…毎朝1Gくれる(お守り枠)
- **見た目**: 虹色がかった白金のスライム。頭に四つ葉のクローバー、ウインクしている
  - EN: `pearl-white slime with rainbow sheen, four-leaf clover on head, winking`

### メタプルキング(メタル系最上位)
- **出現**: 96〜99F 极稀
- **ステータス**: HP 25 / 攻 80 / 守 500 / 速 180 / EXP 5000 / 100G / 仲間率 1%
- **行動**: flee, flee, attack
- **特徴**: 王冠を被ったメタプル。経験値の塊。仲間になれば最硬の壁役だが、確率1%は本作最レア
- **見た目**: 鏡面金属のスライムに小さな金の王冠、赤いマント。澄まし顔
  - EN: `mirror-chrome metal slime wearing tiny golden crown and red cape, smug expression`

### ゴールデンゴーレム
- **出現**: 71〜79F 稀
- **ステータス**: HP 220 / 攻 120 / 守 150 / 速 10 / EXP 150 / 1200G / 仲間率 なし
- **行動**: attack, strongattack, defend
- **特徴**: 純金の巨像。「つくりしもの」の財宝庫の番人が持ち場を忘れて徘徊している。倒すと大金。ただし硬い
- **見た目**: 輝く純金の寸胴ゴーレム。継ぎ目にルビーの鋲、拳が大きい。無表情
  - EN: `stocky golem made of polished pure gold, ruby rivets at joints, oversized fists, blank face`

---

# 裏ボス・追加ボス案(クリア後コンテンツ)

### ホシバミ(星喰の王)— 隠し最終ボス
- **想定**: クリア後、101F「そらのうえ」(新規隠し階)
- **ステータス**: HP 6000 / 攻 240 / 守 160 / 速 130 / EXP 0 / 0G
- **行動**: ['breath', 110](星喰の吐息), ['spell', 'hinongia'], ['spell', 'hiyariga'], strongattack, doubleattack, **ほしをくう(要拡張: 1人のMPを吸い尽くす)**
- **特徴**: 千年前に世界を呑んだ霧の中心にいた「何か」の残存意識。霧が晴れた今も星の記憶の中で生き続けている。撃破するとアルカの真の安眠が訪れ、追加エピローグ
- **見た目**: 夜空に空いた穴のような漆黒の鯨型シルエット。体の輪郭に沿って食べた星々が環状に瞬き、目は白い虚
  - EN: `colossal whale-shaped void like a hole in the night sky, ring of swallowed stars twinkling along its outline, hollow white eyes`

### オリジン(つくりしものの残像)
- **想定**: クリア後、50F空中庭園の最深部
- **ステータス**: HP 4500 / 攻 210 / 守 150 / 速 115
- **行動**: ['spell', 'birimga'], ['spell', 'horonall'](自陣回復), strongattack, **めいれい(要拡張: ガーデュラ幻影を呼ぶ)**
- **特徴**: 塔を建てた古代人の意志の残像。「命令は正しかったのか」を千年問い続けている。戦闘は問いの形をした試練で、勝つと『命令の真意=いつか人の手で扉を開けさせるため』が明かされる
- **見た目**: 白い設計士のローブをまとった半透明の人影。顔はなく、頭上に塔の設計図が光の紋様として展開している
  - EN: `translucent faceless figure in white architect robes, glowing blueprint of the tower unfolding above its head like a halo`

### ドラグノア・カイ(竜王・真の姿)
- **想定**: クリア後、70Fで再戦
- **ステータス**: HP 5000 / 攻 230 / 守 155 / 速 120
- **行動**: ['breath', 120], doubleattack, strongattack, ['spell', 'chikaram']
- **特徴**: 全てを認めた竜王が「最後の役目」として全力で挑んでくる名誉の再戦。勝利すると武器「りゅうおうのキバ」(攻90・要アイテム追加)を譲り受ける
- **見た目**: 現ドラグノアの巨大化・金色化。三対の翼、体に竜族の紋章の光る刺青、口元から火の粉
  - EN: `giant golden version of a red dragon king, three pairs of wings, glowing tribal dragon emblems on scales, embers from jaws`

---

# 色違いファミリー一覧(スプライト使い回し設計)

| ベース | T低 | T中 | T高 |
|---|---|---|---|
| コケダマン | コケダマン(T1) | ドクダマン(T3) | ハナダマン(T5) |
| ヒカリムシ | ヒカリムシ(T1) | ホタルビ(T4) | ホシムシ(T9) |
| レンガベビー | レンガベビー(T1) | レンガナイト(T3) | レンガロード(T6) |
| アワプク | アワプク(T2) | — | アワキング(T5) |
| カサガイン | カサガイン(T2) | — | マグマガイン(T7) |
| ヌレネコ | ヌレネコ(T2) | — | ユキネコ(T8) |
| ツボワナ | ツボワナ(T3) | タカラワナ(T6) | — |
| バラツルギ | バラツルギ(T5) | — | シロバラツルギ(T9) |

---

# data.js 追加時の記述例

```js
// 通常敵の例
kokedaman: { name: 'コケダマン', spr: 'm_kokedaman', hp: 9, atk: 8, def: 7, agi: 4,
             exp: 3, gold: 5, tame: 0.12,
             allySpells: [[12, 'mamoru']], acts: ['attack', 'defend'] },

// ボスの例
b_hoshibami: { name: 'ほしばみのおう ホシバミ', spr: 'b_hoshibami', boss: true,
               hp: 6000, atk: 240, def: 160, agi: 130, exp: 0, gold: 0,
               acts: [['breath', 110], ['spell', 'hinongia'], ['spell', 'hiyariga'],
                      'strongattack', 'doubleattack'] },
```

- 画像導入時は `Art.register('m_kokedaman', canvas)` で差し替え可能(chars.jsと同じ仕組み)
- `MON_NICKNAMES` に仲間時ニックネームを追加すること
- `ENCOUNTERS` の該当tierに `['kokedaman', 重み]` を追加して出現させる
