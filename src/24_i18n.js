// One language table keeps the UI independent of world generation and camera state.
// Rows are Chinese, Japanese and English; only explicit choices are persisted.
const I18N = (() => {
  const languages = ['zh', 'ja', 'en'], storageKey = 'myriad-worlds-language';
  const flags = { zh: '🇨🇳', ja: '🇯🇵', en: '🇬🇧' };
  const text = {
    'product.name': ['万境', '万境', 'Myriad Worlds'],
    'product.subtitle': ['MYRIAD WORLDS', 'MYRIAD WORLDS', 'LIVING LANDSCAPES'],
    'language': ['语言', '言語', 'Language'],
    'social.links': ['作者与源码', '作者とソースコード', 'Creator and source code'],
    'social.github': ['GitHub · 项目源码（新标签页）', 'GitHub · ソースコード（新しいタブ）', 'GitHub · source code (opens in a new tab)'],
    'social.x': ['X · @holooooox（新标签页）', 'X · @holooooox（新しいタブ）', 'X · @holooooox (opens in a new tab)'],
    'world.shanshui.name': ['山水中国', '山水中国', 'Shanshui China'],
    'world.sakura.name': ['花见日本', '花見日本', 'Hanami Japan'],
    'world.shanshui.badge': ['山水 · 中国', '山水 · 中国', 'SHANSHUI · CHINA'],
    'world.sakura.badge': ['花见 · 日本', '花見 · 日本', 'HANAMI · JAPAN'],
    'mood.sunrise': ['日出', '日の出', 'Sunrise'],
    'mood.morning': ['晨雾', '朝霧', 'Morning mist'],
    'mood.golden': ['暮光', '夕映え', 'Golden hour'],
    'mood.dusk': ['薄暮', '薄暮', 'Dusk'],
    'mood.night': ['月夜', '月夜', 'Moonlit night'],
    'mood.rain': ['细雨', '小雨', 'Soft rain'],
    'mood.group': ['天气与时段', '天候と時間帯', 'Weather and time of day'],
    'time.mode': ['自由时间', '自由時間', 'Free time'],
    'time.mode.title': ['自由时间：拖动以观察天体运动', '自由時間：ドラッグして天体の動きを見る', 'Free time: scrub to watch the sky move'],
    'time.slider': ['时间', '時刻', 'Time of day'],
    'time.phase.night': ['深夜', '深夜', 'Night'],
    'time.phase.dawn': ['黎明', '明け方', 'Dawn'],
    'time.phase.day': ['白昼', '昼', 'Day'],
    'time.phase.dusk': ['黄昏', '夕暮れ', 'Gloaming'],
    'toast.time.on': ['自由时间已开启', '自由時間を開始', 'Free time on'],
    'toast.time.off': ['自由时间已关闭', '自由時間を終了', 'Free time off'],
    // Help panel
    'help.title': ['漫游指南', '散策ガイド', 'Wandering the worlds'],
    'help.drag.key': ['拖拽', 'ドラッグ', 'Drag'],
    'help.drag.val': ['环顾四周', '見回す', 'Look around'],
    'help.scroll.key': ['滚轮 / 双指', 'ホイール / ピンチ', 'Scroll / pinch'],
    'help.scroll.val': ['前进 & 后退', '前後に移動', 'Move forward & back'],
    'help.wasd.val': ['自由漫步 · Q / E 升降', '自由に歩く · Q / E で昇降', 'Walk freely · Q / E to rise & fall'],
    'help.tm.val': ['环游 · 环境音', '周遊 · 環境音', 'Tour · Ambient sound'],
    'help.hp.val': ['隐藏界面 · 截图', 'UI非表示 · 撮影', 'Hide interface · Screenshot'],
    'help.footer': ['所有景色均由体素实时生成 — 无图片或模型加载', 'すべての景色はリアルタイムに生成 — 画像もモデルも読み込みません', 'Everything you see is generated live from cubes — no images or models are loaded.'],
    'fatal.reload': ['重新加载', '再読み込み', 'Reload page'],
    'stat.altitude': ['海拔', '標高', 'ALTITUDE'],
    'stat.biome': ['群落', 'バイオーム', 'BIOME'],
    'stat.fps': ['帧率', 'フレームレート', 'FPS'],
    'action.world': ['世界', '世界', 'Worlds'],
    'action.world.title': ['选择世界', '世界を選ぶ', 'Choose a world'],
    'action.places': ['寻境', '景勝地', 'Places'],
    'action.places.title': ['景点与种子', '景勝地とシード', 'Places and seed'],
    'action.follow': ['跟随', '随行', 'Follow'],
    'action.follow.title': ['第一视角跟随', '移動するユニットの視点', 'Ride with a moving unit'],
    'action.follow.exit': ['退出跟随', '随行を終了', 'Leave ride'],
    'follow.view.group': ['列车视角', '列車の視点', 'Train view'],
    'follow.view.first': ['驾驶', '運転席', 'Driver'],
    'follow.view.side': ['侧面', '側面', 'Side view'],
    'follow.view.first.title': ['车头驾驶视角', '先頭車両の運転席から見る', 'View from the locomotive driver'],
    'follow.view.side.title': ['侧面跟随整列火车', '列車全体を側面から追う', 'Follow the whole train from the side'],
    'action.tour': ['环游', '周遊', 'Tour'],
    'action.tour.title': ['环游 (T)', '周遊 (T)', 'Scenic tour (T)'],
    'action.tour.stop': ['停止环游', '周遊を停止', 'Stop tour'],
    'action.sound': ['环境音', '環境音', 'Ambient sound'],
    'action.shot': ['保存截图', 'スクリーンショットを保存', 'Save screenshot'],
    'action.shot.title': ['留影 (P)', '撮影 (P)', 'Screenshot (P)'],
    'action.guide': ['指南', '案内', 'Guide'],
    'action.guide.title': ['操作指南', '操作ガイド', 'Field guide'],
    'action.return': ['返回天地', '世界に戻る', 'Return to the world'],
    'action.continue': ['继续行游', '探索を続ける', 'Continue exploring'],
    'action.close': ['关闭', '閉じる', 'Close'],
    'menu.world.title': ['万境 · 世界图鉴', '万境 · 世界図鑑', 'Myriad Worlds · Atlas'],
    'menu.world.intro': ['一颗种子，无尽山河。选择一方天地，沿铁路、街巷与水路探索。', 'ひとつのシードから、果てしない山河へ。世界を選び、鉄道、街路、水路を巡りましょう。', 'One seed, endless landscapes. Choose a world and explore its railways, streets and waterways.'],
    'menu.world.shanshui': ['黄山云海 · 九寨彩湖 · 山间梯田', '黄山の雲海 · 九寨溝の彩湖 · 山間の棚田', 'Huangshan cloud seas · Jiuzhai lakes · mountain terraces'],
    'menu.world.shanshui2': ['长安灯火，王宫与江南茶楼', '長安の灯り、王宮と江南の茶楼', 'Chang’an lanterns, palaces and Jiangnan tea houses'],
    'menu.world.sakura': ['樱林与竹海 · 湖畔茶屋 · 大名城', '桜の森と竹林 · 湖畔の茶屋 · 大名の城', 'Blossom forests · lakeside tea houses · daimyo castles'],
    'menu.world.sakura2': ['城下町、神社与海边铁道', '城下町、神社と海辺の鉄道', 'Castle towns, shrines and coastal railways'],
    'menu.world.future': ['下一世界 · 西方奇幻', '次の世界 · 西洋ファンタジー', 'Next world · Western fantasy'],
    'menu.world.futureText': ['德国城镇、瑞士雪山村庄与挪威峡湾，将沿用独立世界规则扩展。', 'ドイツの街、スイスの雪山の村、ノルウェーのフィヨルドを、独立した世界ルールで拡張する予定です。', 'German towns, Swiss alpine villages and Norwegian fjords will expand through their own world rules.'],
    'menu.guide.title': ['行游指南', '探索ガイド', 'Field guide'],
    'menu.guide.explore': ['自由探索', '自由に探索', 'Free exploration'],
    'menu.guide.look': ['拖动画面环顾，滚轮或双指缩放前进、后退。', '画面をドラッグして見回し、ホイールやピンチ操作で前後に移動します。', 'Drag to look around. Use the wheel or a pinch gesture to move forward and back.'],
    'menu.guide.move': ['W A S D 移动 · Space / E 上升 · Q 下降 · Shift 加速 · Alt / C 下蹲', 'W A S D 移動 · Space / E 上昇 · Q 下降 · Shift 加速 · Alt / C しゃがむ', 'W A S D move · Space / E rise · Q descend · Shift speed up · Alt / C crouch'],
    'menu.guide.keys': ['T 环游 · 1–5 切换时段天气 · H 隐藏界面 · P 留影 · Esc 返回', 'T 周遊 · 1–5 時間帯と天候 · H UIを隠す · P 撮影 · Esc 戻る', 'T tour · 1–5 time/weather · H hide UI · P screenshot · Esc return'],
    'menu.guide.follow': ['随行视角', '随行の視点', 'First-person rides'],
    'menu.guide.followText': ['点击鸟、鱼、动物、火车、居民或船只，或从「跟随」选择单位。视角随它移动，拖动可环顾；按 Esc 退出。', '鳥、魚、動物、列車、住民、船をクリックするか、「随行」から選びます。そのユニットの視点で移動し、ドラッグで見回せます。Escで終了します。', 'Click a bird, fish, animal, train, resident or boat, or choose one under Follow. Travel from its viewpoint, drag to look around and press Esc to leave.'],
    'menu.guide.atmosphere': ['天地与气候', '世界と天候', 'World and atmosphere'],
    'menu.guide.atmosphereText': ['「世界」切换生成规则，「寻境」选择景点或种子。晨雾、暮光、薄暮、月夜与细雨共同改变光照、水面、雾气和灯火。夜晚中式城市会放飞孔明灯。', '「世界」で生成ルール、「景勝地」で目的地やシードを選びます。朝霧、夕映え、薄暮、月夜、小雨が光、水面、霧、灯りを変えます。中国の街では夜に天灯が浮かびます。', 'Worlds changes the landscape rules; Places selects destinations or seeds. Morning mist, golden hour, dusk, moonlight and rain change the light, water, fog and lanterns. Chinese cities release sky lanterns at night.'],
    'menu.guide.quality': ['画质', '画質', 'Rendering'],
    'menu.guide.highQuality': ['精细画质', '高画質', 'High quality'],
    'menu.guide.qualityText': ['取消勾选使用轻量画质；地形和资产布局保持一致。环境音通过工具栏开启。', 'チェックを外すと軽量画質になります。地形やオブジェクトの配置は同じです。環境音はツールバーで有効にできます。', 'Uncheck to use Lite quality. Terrain and asset positions stay consistent. Enable ambient sound from the toolbar.'],
    'menu.places.title': ['寻境', '景勝地', 'Places'],
    'menu.places.intro': ['选择景点，或用新的种子展开另一片山河。', '景勝地を選ぶか、新しいシードで別の山河を生成します。', 'Choose a destination, or use a new seed to unfold another landscape.'],
    'menu.places.seed': ['世界种子', 'ワールドシード', 'World seed'],
    'menu.places.generate': ['生成', '生成', 'Generate'],
    'menu.places.random': ['随机', 'ランダム', 'Random'],
    'menu.places.destinations': ['景点', '目的地', 'Destinations'],
    'menu.follow.title': ['跟随移动单位', '移動するユニットに随行', 'Ride with a moving unit'],
    'menu.follow.intro': ['点击单位切换到它的第一视角。拖动环顾，按 Esc 或退出按钮返回。', 'ユニットを選ぶとその視点に切り替わります。ドラッグで見回し、Escまたは終了ボタンで戻ります。', 'Select a unit to enter its viewpoint. Drag to look around, then press Esc or Leave ride to return.'],
    'menu.follow.empty': ['附近暂时没有移动单位，向城镇、乡间道路、水边或铁路移动。', '近くに移動するユニットがいません。街、田舎道、水辺、線路へ移動してみましょう。', 'No moving units nearby. Head toward a town, country road, shore or railway.'],
    'menu.follow.count': ['{count} 个单位', '{count} 体', '{count} units'],
    'menu.follow.shown': ['显示 {shown} / {total} 个单位', '{total} 体中 {shown} 体を表示', 'Showing {shown} of {total} units'],
    'menu.follow.distance': ['{distance} 米', '{distance} m', '{distance} m'],
    'followGroup.bird': ['飞鸟', '鳥の群れ', 'Birds'], 'followGroup.sparrow': ['麻雀', 'スズメ', 'Sparrows'],
    'followGroup.hawk': ['鹰', 'タカ', 'Hawks'], 'followGroup.butterfly': ['蝴蝶', '蝶', 'Butterflies'],
    'followGroup.fox': ['狐狸', 'キツネ', 'Foxes'], 'followGroup.deer': ['鹿', '鹿', 'Deer'],
    'followGroup.fish': ['鱼', '魚', 'Fish'], 'followGroup.train': ['火车', '列車', 'Trains'],
    'followGroup.crane': ['仙鹤', '鶴', 'Cranes'], 'followGroup.buffalo': ['水牛', '水牛', 'Water buffalo'],
    'followGroup.shanshui.farmer': ['农人', '農夫', 'Farmers'], 'followGroup.shanshui.merchant': ['行商', '行商人', 'Merchants'],
    'followGroup.shanshui.official': ['官员', '官吏', 'Officials'], 'followGroup.shanshui.carriage': ['马车', '馬車', 'Horse carriages'],
    'followGroup.shanshui.sedan': ['轿子', '輿', 'Sedan chairs'], 'followGroup.shanshui.fishingBoat': ['渔舟', '漁船', 'Fishing boats'],
    'followGroup.shanshui.merchantBoat': ['商船', '商船', 'Trading vessels'],
    'followGroup.sakura.farmer': ['稻农', '稲作農家', 'Rice farmers'], 'followGroup.sakura.merchant': ['町人', '町人', 'Town merchants'],
    'followGroup.sakura.official': ['侍臣', '家臣', 'Retainers'], 'followGroup.sakura.carriage': ['牛车', '牛車', 'Ox carts'],
    'followGroup.sakura.sedan': ['驾笼', '駕籠', 'Kago'], 'followGroup.sakura.fishingBoat': ['和船', '和船', 'Japanese fishing boats'],
    'followGroup.sakura.merchantBoat': ['廻船', '廻船', 'Coastal traders'],
    'toast.follow.started': ['{unit} · 第一视角 · 拖动环顾，按 Esc 退出', '{unit} · 随行視点 · ドラッグで見回す、Escで終了', '{unit} · First person · Drag to look around, Esc to leave'],
    'toast.follow.ended': ['已退出跟随', '随行を終了しました', 'Ride ended'],
    'toast.follow.trainView': ['列车 · {view}视角', '列車 · {view}視点', 'Train · {view}'],
    'toast.tour.started': ['开始巡游 · Esc 结束 · 1–5 切换天气', '周遊を開始 · Escで終了 · 1–5 天候', 'Scenic tour started · Esc to stop · 1–5 weather'],
    'toast.tour.ended': ['巡游结束', '周遊を終了しました', 'Tour ended'],
    'toast.shot.failed': ['无法保存截图', '画像を保存できませんでした', 'Could not capture the image'],
    'toast.shot.saved': ['已保存 PNG 图片', 'PNG画像を保存しました', 'Saved as PNG'],
    'toast.teleport.search': ['正在寻找景点…', '景勝地を探しています…', 'Finding a destination…'],
    'toast.teleport.missing': ['附近未找到，可以尝试另一颗种子', '近くに見つかりません。別のシードを試してください', 'No destination nearby. Try another seed'],
    'toast.teleport.arrived': ['已抵达', '到着しました', 'Arrived'],
    'toast.sound.on': ['环境音已开启', '環境音を有効にしました', 'Ambient sound on'],
    'toast.sound.off': ['环境音已关闭', '環境音を無効にしました', 'Sound off'],
    'toast.sound.failed': ['环境音暂不可用', '環境音を利用できません', 'Audio not available'],
    'toast.quality.lite': ['已切换为轻量画质，让移动更流畅', '軽量画質に切り替えて動きを滑らかにしました', 'Switched to Lite rendering for smoother motion'],
    'toast.explore': ['拖动环顾 · 滚轮或 W A S D 探索', 'ドラッグで見回す · ホイールまたは W A S D で探索', 'Drag to look around · Wheel or W A S D to explore'],
    'loading.chunks': ['生成中 · {percent}%', '生成中 · {percent}%', 'Generating · {percent}%'],
    'loading.initialize': ['正在初始化…', '初期化しています…', 'Initializing…'],
    'error.world.title': ['无法生成世界', '世界を生成できませんでした', 'The world could not be generated'],
    'error.world.unexpected': ['场景加载时遇到了意外错误。', '予期しないエラーでシーンの読み込みが停止しました。', 'An unexpected error stopped the scene from loading.'],
    'error.webgl2.title': ['WebGL 2 不可用', 'WebGL 2 を利用できません', 'WebGL 2 is not available'],
    'error.webgl2.message': ['探索世界需要 WebGL 2 硬件加速。请开启浏览器的硬件加速，或使用新版 Chrome、Edge、Firefox 或 Safari。', 'この世界の探索には WebGL 2 のハードウェアアクセラレーションが必要です。ブラウザーのハードウェアアクセラレーションを有効にするか、最新の Chrome、Edge、Firefox、Safari で開いてください。', 'This explorable world needs WebGL 2 (hardware-accelerated graphics). Enable hardware acceleration or open the page in a current Chrome, Edge, Firefox or Safari.'],
    'error.engine.title': ['无法加载三维引擎', '3Dエンジンを読み込めませんでした', 'The 3D engine could not be downloaded'],
    'error.engine.message': ['请检查网络连接或内容拦截设置，然后重新加载。', 'インターネット接続やコンテンツブロック設定を確認し、再読み込みしてください。', 'Please check your internet connection (or any content blocker) and reload.'],
    'error.context.title': ['无法启动 WebGL', 'WebGL を開始できませんでした', 'WebGL could not start'],
    'error.context.message': ['浏览器未能创建 WebGL 环境。请开启硬件加速，或关闭其他占用显卡的页面后重试。', 'ブラウザーが WebGL コンテキストを作成できませんでした。ハードウェアアクセラレーションを有効にするか、GPUを多く使う他のタブを閉じて再試行してください。', 'The browser refused to create a WebGL context. Try enabling hardware acceleration or closing other GPU-heavy tabs.'],
    'error.lost.title': ['图形环境已中断', 'グラフィックスコンテキストが失われました', 'The graphics context was lost'],
    'error.lost.message': ['显卡发生重置或内存不足，请重新加载页面。轻量画质使用更少的内存。', 'GPUがリセットされたか、メモリーが不足しました。ページを再読み込みしてください。軽量画質ではメモリー使用量を抑えられます。', 'The GPU reset or ran out of memory. Reload the page (Lite quality uses less memory).'],
    'loading.generator': ['启动世界生成器…', 'ワールド生成を開始…', 'Starting the world generator…'],
    'loading.vantage': ['寻找一处好风景…', '眺めのよい場所を探しています…', 'Searching for a good vantage…'],
    'loading.firstChunks': ['生成初始地形…', '最初の地形を生成しています…', 'Generating the first chunks…'],
    'loading.light': ['编织光影…', '光を織り込んでいます…', 'Weaving the light…'],
    'loading.shaders': ['编译着色器…', 'シェーダーをコンパイルしています…', 'Compiling shaders…'],
    'loading.welcome': ['欢迎来到万境', '万境へようこそ', 'Welcome to Myriad Worlds'],
    'biome.rail': ['铁路', '鉄道', 'Railway'],
    'unit.bird': ['鸟', '鳥', 'Bird'], 'unit.sparrow': ['麻雀', 'スズメ', 'Sparrow'],
    'unit.hawk': ['鹰', 'タカ', 'Hawk'], 'unit.butterfly': ['蝴蝶', '蝶', 'Butterfly'],
    'unit.fox': ['狐狸', 'キツネ', 'Fox'], 'unit.deer': ['鹿', '鹿', 'Deer'],
    'unit.fish': ['鱼', '魚', 'Fish'], 'unit.train': ['火车', '列車', 'Train'],
    'unit.crane': ['仙鹤', '鶴', 'Crane'], 'unit.buffalo': ['水牛', '水牛', 'Water buffalo'],
    'unit.unknown': ['移动单位', '移動するユニット', 'Moving unit'],
    'unit.shanshui.farmer': ['农人', '農夫', 'Farmer'], 'unit.shanshui.merchant': ['行商', '行商人', 'Merchant'],
    'unit.shanshui.official': ['官员', '官吏', 'Official'], 'unit.shanshui.carriage': ['马车', '馬車', 'Horse carriage'],
    'unit.shanshui.sedan': ['轿子', '輿', 'Sedan chair'], 'unit.shanshui.fishingBoat': ['渔舟', '漁船', 'Fishing boat'],
    'unit.shanshui.merchantBoat': ['商船', '商船', 'Trading vessel'],
    'unit.sakura.farmer': ['稻农', '稲作農家', 'Rice farmer'], 'unit.sakura.merchant': ['町人', '町人', 'Town merchant'],
    'unit.sakura.official': ['侍臣', '家臣', 'Retainer'], 'unit.sakura.carriage': ['牛车', '牛車', 'Ox cart'],
    'unit.sakura.sedan': ['驾笼', '駕籠', 'Kago'], 'unit.sakura.fishingBoat': ['和船', '和船', 'Japanese fishing boat'],
    'unit.sakura.merchantBoat': ['廻船', '廻船', 'Coastal trader'],
    'water.river': ['河', '川', 'River'], 'water.lake': ['湖', '湖', 'Lake'], 'water.ocean': ['海', '海', 'Sea'],
  };
  const biomes = {
    sakura: [
      ['海岸与海洋', '海', 'Coast & sea'], ['松林海滩', '浜', 'Pine beach'], ['里山', '里山', 'Satoyama'],
      ['樱花林', '桜の森', 'Sakura grove'], ['稻田梯田', '棚田', 'Rice terraces'], ['城下町', '城下町', 'Castle town'],
      ['杉山', '杉山', 'Cedar mountains'], ['竹林', '竹林', 'Bamboo forest'], ['雪山', '雪山', 'Snow peaks'],
      ['湖泊', '湖', 'Lake'], ['河流', '川', 'River'], ['草甸', '草原', 'Meadow'], ['湿地', '湿地', 'Marshland'], ['松林高地', '高原', 'Pine highland'],
    ],
    shanshui: [
      ['东海', '東海', 'Eastern coast'], ['松湾', '松の湾', 'Pine bays'], ['江南', '江南', 'Jiangnan hills'],
      ['桃源', '桃源', 'Peach groves'], ['梯田', '棚田', 'Cloud terraces'], ['长安', '長安', 'Chang’an wards'],
      ['黄山', '黄山', 'Granite peak forest'], ['竹海', '竹海', 'Bamboo sea'], ['雪岭', '雪嶺', 'Snow ridges'],
      ['彩湖', '彩湖', 'Jiuzhai lakes'], ['溪谷', '渓谷', 'River valleys'], ['花甸', '花の草原', 'Wildflower meadow'], ['荷泽', '蓮の湿地', 'Lotus wetlands'], ['云松', '雲松', 'Cloud pines'],
    ],
  };
  const places = {
    sakura: {
      temple: [['山寺', '山寺', 'Mountain temple'], ['山寺与佛塔', '山腹の寺と塔', 'Hillside temple and pagoda']],
      shrine: [['朱红神社', '朱の鳥居', 'Crimson shrine'], ['林间鸟居小径', '森の鳥居の道', 'Torii path in the woods']],
      castle: [['大名城', '大名の城', 'Daimyo castle'], ['天守与城郭', '天守と郭の櫓', 'Keep and bailey towers']],
      teahouse: [['湖畔茶楼', '茶楼', 'Lakeside tea house'], ['茶室与灯笼回廊', '茶室と提灯の縁側', 'Tea rooms and lantern verandas']],
      farm: [['农家田园', '農家', 'Farmstead'], ['农舍与田野', '農家と田畑', 'Farmhouse and fields']],
      lighthouse: [['海岬灯塔', '灯台', 'Lighthouse'], ['岩石海岬', '岩の岬', 'Rocky cape']],
      hut: [['雪线山屋', '山小屋', 'Mountain cabin'], ['雪线附近的小屋', '雪線の小屋', 'Snow-line cabin']],
      pavilion: [['湖中亭', '湖の東屋', 'Lake pavilion'], ['水边亭榭', '水辺の東屋', 'Water pavilion']],
      seaTorii: [['海上鸟居', '海の鳥居', 'Sea torii'], ['浪间鸟居', '波間の鳥居', 'Torii in the surf']],
      rail: [['海边铁道', '鉄道', 'Railway'], ['静候列车', '列車を待つ', 'Wait for the train']],
    },
    shanshui: {
      changan: [['长安灯市', '長安の灯市', 'Chang’an lantern markets'], ['城墙与灯火市集', '城壁と灯りの市', 'City walls and lantern markets']],
      palace: [['王宫御苑', '王宮と御苑', 'Imperial palace'], ['大殿、内庭与回廊', '大殿、中庭と回廊', 'Grand halls, inner courts and galleries']],
      chineseTeahouse: [['临风茶楼', '風を望む茶楼', 'Breezy tea house'], ['茶室、露台与灯笼', '茶室、露台と提灯', 'Tea rooms, balconies and lanterns']],
      monastery: [['山寺古院', '山寺の古院', 'Mountain monastery'], ['庭院与青瓦飞檐', '中庭と瓦の軒', 'Courtyards and tiled eaves']],
      waterPavilion: [['湖心亭榭', '湖心の亭', 'Lake pavilions'], ['亭榭与石桥', '亭と石橋', 'Pavilions and stone bridges']],
      paifang: [['古道牌楼', '古道の牌楼', 'Old-road archway'], ['木牌楼与石径', '木の牌楼と石の道', 'Timber arches and stone paths']],
      rail: [['山水行旅', '山水の旅', 'Landscape railway'], ['穿行山水的铁路', '山水を巡る鉄道', 'Railway through the landscape']],
    },
  };
  const landscapePlaces = {
    sakura: {
      3: [['樱花林', '桜の森', 'Sakura grove'], ['盛开的樱花森林', '桜が咲く森', 'Cherry blossom forest']],
      4: [['稻田梯田', '棚田', 'Rice terraces'], ['水光交映的梯田', '水を張った棚田', 'Flooded rice paddies']],
      7: [['竹林', '竹林', 'Bamboo forest'], ['竹影与小径', '竹の影と小道', 'Bamboo groves and quiet trails']],
      8: [['雪山', '雪山', 'Snow peaks'], ['冬日高地', '冬の高原', 'Winter highlands']],
      9: [['湖泊', '湖', 'Lake shore'], ['树林环抱的湖岸', '森に囲まれた湖畔', 'Wooded lake shores']],
      12: [['湿地', '湿地', 'Marshland'], ['芦苇与水岸', '葦と水辺', 'Reeds and wet shores']],
      13: [['松林高地', '高原', 'Pine highland'], ['高地松林', '高原の松林', 'Highland pine forests']],
    },
    shanshui: {
      3: [['桃源春色', '桃源の春', 'Peach blossom hills'], ['春日桃花山坡', '春の桃の丘', 'Spring peach blossom slopes']],
      4: [['云岭梯田', '雲嶺の棚田', 'Cloud terraces'], ['等高梯田与水牛', '等高線に沿う棚田と水牛', 'Contour terraces and water buffalo']],
      6: [['黄山云海', '黄山の雲海', 'Huangshan cloud sea'], ['花岗岩奇峰与崖松', '花崗岩の奇峰と崖の松', 'Granite needles and cliff pines']],
      7: [['江南竹海', '江南の竹海', 'Jiangnan bamboo sea'], ['竹海与幽静小径', '竹林と静かな小道', 'Bamboo groves and quiet trails']],
      9: [['九寨彩湖', '九寨溝の彩湖', 'Jiuzhai mineral lakes'], ['彩色湖泊与林间水岸', '色彩豊かな湖と森の岸辺', 'Mineral lakes and wooded shores']],
      12: [['荷塘鹤汀', '蓮池と鶴の汀', 'Lotus and crane wetlands'], ['荷花群落与仙鹤', '蓮の群落と鶴', 'Lotus beds and cranes']],
    },
  };
  for (const [theme, entries] of Object.entries({ sakura: { ...places.sakura, ...landscapePlaces.sakura }, shanshui: { ...places.shanshui, ...landscapePlaces.shanshui } })) {
    for (const [key, pair] of Object.entries(entries)) { text[`place.${theme}.${key}.name`] = pair[0]; text[`place.${theme}.${key}.sub`] = pair[1]; }
  }
  for (const [theme, rows] of Object.entries(biomes)) rows.forEach((row, i) => { text[`biome.${theme}.${i}`] = row; });
  let lang = resolveLanguage(navigator.languages?.length ? navigator.languages : [navigator.language]);
  let logger = null, initialized = false;
  const listeners = new Set(), missing = new Set(), pendingLogs = [];
  function log(level, category, event, detail) {
    if (logger) logger[level](category, event, detail);
    else pendingLogs.push({ level, category, event, detail });
  }
  function normalize(value) { const base = String(value || '').toLowerCase().split(/[-_]/)[0]; return languages.includes(base) ? base : null; }
  function resolveLanguage(preferences) { for (const value of preferences || []) { const code = normalize(value); if (code) return code; } return 'en'; }
  try { const saved = normalize(localStorage.getItem(storageKey)); if (saved) lang = saved; }
  catch (e) { log('warn', 'error', 'language-preference-read-failed', { message: String(e.message || e) }); }
  function t(key, args = {}) {
    const row = text[key];
    if (!row) { if (!missing.has(key)) { missing.add(key); log('warn', 'business', 'translation-key-missing', { key }); } return key; }
    return (row[languages.indexOf(lang)] || row[2]).replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(args, name) ? String(args[name]) : match);
  }
  function applyLabels(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    for (const [attribute, data] of [['title', 'i18nTitle'], ['aria-label', 'i18nAria']]) {
      root.querySelectorAll(attribute === 'title' ? '[data-i18n-title]' : '[data-i18n-aria]').forEach(el => el.setAttribute(attribute, t(el.dataset[data])));
    }
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;
    const selector = document.getElementById('languageSelect'); if (selector) selector.value = lang;
    const flag = document.getElementById('languageFlag'); if (flag) flag.textContent = flags[lang];
  }
  function refresh() {
    applyLabels();
    listeners.forEach(fn => { try { fn(lang); } catch (e) { log('error', 'error', 'language-ui-refresh-failed', { message: String(e.stack || e) }); } });
  }
  function setLanguage(value) {
    const next = normalize(value);
    log('debug', 'access', 'language-change-requested', { language: value });
    if (!next) { log('warn', 'business', 'language-change-rejected', { language: value }); return false; }
    try { localStorage.setItem(storageKey, next); }
    catch (e) { log('warn', 'error', 'language-preference-write-failed', { message: String(e.message || e) }); }
    if (lang !== next) { lang = next; refresh(); log('info', 'business', 'language-changed', { language: lang }); }
    return true;
  }
  function init() {
    if (initialized) return;
    initialized = true;
    const selector = document.getElementById('languageSelect');
    // A native select covers the flag entry, preserving platform dropdown and keyboard behavior.
    selector?.addEventListener('focus', () => log('debug', 'access', 'language-picker-focused', { language: lang }));
    selector?.addEventListener('change', e => setLanguage(e.target.value));
    refresh(); log('info', 'access', 'language-initialized', { language: lang });
  }
  function destination(entry, theme) {
    const base = `place.${theme}.${entry.key}`;
    return { label: text[base + '.name'] ? t(base + '.name') : entry.label, sub: text[base + '.sub'] ? t(base + '.sub') : entry.sub };
  }
  function unitName(unit, theme) {
    const specific = `unit.${theme}.${unit.kind}`, generic = 'unit.' + unit.kind;
    const name = t(text[specific] ? specific : text[generic] ? generic : 'unit.unknown');
    const water = unit.source?.water?.kind || unit.water?.kind;
    return name + (water && text['water.' + water] ? ' · ' + t('water.' + water) : '');
  }
  function followGroupName(kind, theme) {
    const specific = `followGroup.${theme}.${kind}`, generic = 'followGroup.' + kind;
    return text[specific] ? t(specific) : text[generic] ? t(generic) : t('unit.unknown');
  }
  return {
    get lang() { return lang; }, t, init, setLanguage, applyLabels, resolveLanguage, destination, unitName, followGroupName,
    biomeName: (id, theme) => t(`biome.${theme}.${id}`),
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    setLogger(value) { logger = value; pendingLogs.splice(0).forEach(e => logger[e.level](e.category, e.event, e.detail)); },
    keys: () => Object.keys(text),
  };
})();
