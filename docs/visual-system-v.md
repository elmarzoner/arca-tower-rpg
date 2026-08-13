# Visual System V

## Direction

`アルカの塔` のゲーム画面は、非ピクセルの高精細な手描き2D JRPGへ統一する。
基準視点は斜め見下ろし3/4。光源は画面左上、人物の接地影は右下へ短く落とす。

## Runtime scale

- 論理画面: 512 x 448
- 描画画面: 1024 x 896
- フィールドタイル: 32 x 32 logical px
- 主人公表示: 48 x 66 logical px
- 人物の足元pivot: セル中央 `(16, 31)`
- フィールド人物: 2.5〜3頭身

## Loading policy

- Title critical: title key art and Sora field sheet only
- Town: village painting and village NPC atlas on entering a town
- Tier 1 dungeon: Tier 1 environment kit on entering floors 2–9
- Battle: battle background, party portraits and enemy atlases on battle start
- Dialogue: each HD character illustration on first portrait use
- Tier 2 dungeon: flooded-corridor kit on entering floors 12–19 or the 20F boss floor
- Legacy environment atlas: load only when entering a tier without a V5 kit

## Character asset roles

- Field: 4方向、各6フレーム歩行。足元pivotと表示寸法を統一する。
- Dialogue: バストアップまたは既存高精細立ち絵。フィールドでは使用しない。
- Battle: 待機、攻撃、詠唱、被弾、戦闘不能を別途用意する。

左右非対称の装備は単純ミラーを禁止する。人物・NPC・敵には共通の接地影を付ける。

## Environment layers

町の背景は次の順序で描画する。

1. ground
2. structures
3. actors sorted by foot Y
4. foreground / canopy
5. light, fog, water and particles
6. UI

衝突判定は背景画像とは別のマスクとして管理し、見た目との差を4 logical px以内にする。

## Palette and materials

- Base: deep navy, weathered limestone, moss green, warm timber
- Accent: restrained cyan magic, antique brass, warm window amber
- Shadows: blue-gray。純黒の面塗りを避ける
- Highlights: 左上の自然光。金属と水以外は白く飛ばさない
- Outline: 暗い有彩色。太い黒縁やステッカー状の白縁を避ける

## Production gate

1F村・2Fダンジョン・通常戦闘・10Fボスを完成品質で確認するまで、全地域の量産を開始しない。
最初の合格条件は、方向別歩行、接地、Y-sort、前景遮蔽、背景と衝突判定の一致、同一画風のNPCである。

## Visual test routes

- `?visualTest=village`
- `?visualTest=dungeon-tier1`
- `?visualTest=battle-tier1`
- `?visualTest=battle-fx`
- `?visualTest=battle-guardio`
- `?visualTest=party-field`
- `?visualTest=dungeon-tier2`
- `?visualTest=battle-tier2`
- `?visualTest=battle-aquera`
- `?visualTest=dungeon-tier3`
- `?visualTest=battle-tier3`
- `?visualTest=battle-dronzo`
- `?visualTest=dungeon-tier4`
- `?visualTest=battle-tier4`
- `?visualTest=battle-nocturna`

これらはセーブデータを書き換えず、画面比較用の固定状態を直接表示する。

## V5 asset manifest

| Asset | Role | Status |
| --- | --- | --- |
| `assets/v5/hero-field-v5.webp` | Sora 4 directions x 6 walk frames | active |
| `assets/v5/village-npcs-v5.webp` | Elder, woman, man, child, merchant, guard | active |
| `assets/v5/tier1-enemies-v5.webp` | Pluru, Komorin, Toge-nezumi, Guardio | active |
| `assets/v5/tier1-environment-v5.webp` | Tier 1 floor, wall, stairs and props | active |
| `assets/v5/party-battle-v5.webp` | Sora, Rino, Gald and Fio battle portraits | active |
| `assets/v5/rino-field-v5.webp` | Rino 4 directions x 6 walk frames | active |
| `assets/v5/gald-field-v5.webp` | Gald 4 directions x 6 walk frames | active |
| `assets/v5/fio-field-v5.webp` | Fio 4 directions x 6 walk frames | active |
| `assets/v5/tier2-environment-v5.webp` | Tier 2 flooded corridor environment kit | active |
| `assets/v5/tier2-enemies-v5.webp` | Gob, Aquan, red Pluru and Aquera | active |
| `assets/v5/tier2-battle-bg-v5.webp` | Flooded-cistern battle arena | active |
| `assets/v5/tier3-environment-v5.webp` | Fungal smugglers' warren kit | active |
| `assets/v5/tier3-enemies-v5.webp` | Kasadon, Doroborg, Gob soldier, Iwakoro and Dronzo | active |
| `assets/v5/tier3-battle-bg-v5.webp` | Smugglers' cistern battle arena | active |
| `assets/v5/tier4-environment-v5.webp` | Midnight dream-gallery kit | active |
| `assets/v5/tier4-enemies-v5.webp` | Yurari, shadow rat, dark bat and Nocturna | active |
| `assets/v5/tier4-battle-bg-v5.webp` | Midnight dream-gallery battle arena | active |
| `assets/v5/town-11-v5.webp` | Ichinose flooded inn town | active |
| `assets/v5/town-21-v5.webp` | Minamo restored waterworks town | active |
| `assets/v5/town-31-v5.webp` | Bazaara midnight merchant town | active |
| `assets/hero-v4.png` | Sora dialogue/status illustration | retained |
| `assets/village-bg-v4.png` | 1F concept/base painting | retained temporarily |
| `assets/environment-atlas-v4.png` | legacy fallback | deprecated |
| `assets/monster-atlas-v4.png` | legacy fallback | deprecated |

## Generation record: hero field sheet

- Tool path: built-in image generation, followed by local chroma-key removal
- Identity reference: `assets/hero-v4.png`
- Layout: 4 rows x 6 columns; down, left, right, up
- Background key: flat `#ff00ff`
- Final alpha master: `assets/v5/hero-field-v5.png`
- Runtime lossless asset: `assets/v5/hero-field-v5.webp`

## Generation record: village NPC atlas

- Tool path: built-in image generation, followed by local chroma-key removal
- Style references: `assets/v5/hero-field-v5-source.png`, `assets/village-bg-v4.png`
- Layout: 3 columns x 2 rows; elder, woman, man / child, merchant, guard
- Background key: flat `#ff00ff`
- Final alpha master: `assets/v5/village-npcs-v5.png`
- Runtime lossless asset: `assets/v5/village-npcs-v5.webp`

## Generation record: Tier 1 enemy atlas

- Tool path: built-in image generation, followed by local chroma-key removal
- Style references: `assets/v5/hero-field-v5-source.png`, `assets/battle-bg-v4.png`
- Layout: 4 columns; Pluru, Komorin, Toge-nezumi, Guardio
- Runtime mapping: explicit enemy ID to cell index in `js/battle.js`
- Background key: flat `#ff00ff`
- Final alpha master: `assets/v5/tier1-enemies-v5.png`
- Runtime lossless asset: `assets/v5/tier1-enemies-v5.webp`

## Generation record: Tier 1 environment kit

- Tool path: built-in image generation, followed by local chroma-key removal
- Style references: `assets/village-bg-v4.png`, `assets/battle-bg-v4.png`
- Layout: 4 x 4; floors, walls, corners, stairs, chests, pillars, sigil, sign, rubble, door
- Renderer: ground pass followed by independent structure and prop pass
- Runtime asset: `assets/v5/tier1-environment-v5.webp`

## Generation record: party battle portraits

- Tool path: built-in image generation, followed by local chroma-key removal
- Identity references: the four V4 full-body character illustrations
- Layout: 4 columns; Sora, Rino, Gald, Fio
- Runtime asset: `assets/v5/party-battle-v5.webp`

## Generation record: companion field sheets

- Tool path: built-in image generation, followed by local chroma-key removal
- Identity references: `assets/rino-v4.png`, `assets/gald-v4.png`, `assets/fio-v4.png`
- Style reference: `assets/v5/hero-field-v5-source.png`
- Layout: individual 4 rows x 6 columns sheets; down, left, right, up
- Runtime: active human party members follow the player's settled tile path with movement interpolation and Y-sort

## Generation record: Tier 2 flooded corridor

- Tool path: built-in image generation, followed by local chroma-key removal
- Environment layout: 4 x 4 wet floor, shallow water, walls, watergate, stairs, chests, pipe, column, rune and spillway
- Enemy layout: Gob, Aquan, red Pluru and unique boss Aquera in 4 columns
- Runtime: floors 12-19 and floor 20 boss use explicit Tier 2 assets; both sets are lazy-loaded

## Generation record: Tiers 3 and 4

- Tool path: built-in image generation, followed by local chroma-key removal for transparent atlases
- Tier 3: ochre smugglers' cistern, timber structures, violet fungi, four normal enemies and unique boss Dronzo
- Tier 4: indigo dream gallery, moonstone structures, dream mist, three normal enemies and unique boss Nocturna
- Regional battle backgrounds: Tier 2, Tier 3 and Tier 4 load their own 16:9 arena only when battle starts
- Runtime: enemy IDs map explicitly to regional atlas cells; legacy name-based fallback is restricted to later unfinished tiers

## Generation record: front-half towns

- Tool path: built-in image generation, followed by local lossy WebP conversion
- References: `assets/village-bg-v4.png` for gameplay composition and the matching regional environment source for materials
- Town 11: flooded limestone inn town with brass pumps and cyan waterways
- Town 21: restored waterworks settlement with ochre stone, timber and restrained fungi
- Town 31: midnight merchant city with moonstone, violet crystal stalls and warm lanterns
- Runtime: each town painting is loaded only when entering its floor
