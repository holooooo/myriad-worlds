// Profile registry is data-only except for the three deterministic rule hooks.
// A theme switch clears derived caches; it never changes the world seed.
const WORLD_PROFILES = Object.freeze({
  sakura: Object.freeze({
    id: 'sakura', label: 'Hanami Japan', name: '花见日本',
    natural: sakuraNatural, classify: sakuraClassify, anchor: sakuraAnchor, biomeNames: SAKURA_BIOME_NAMES,
    landmarks: [
      { key: 'temple', label: '山寺', sub: 'Mountain temple' }, { key: 'shrine', label: '朱の鳥居', sub: 'Crimson shrine' },
      { key: 'castle', label: '大名の城', sub: 'Daimyo keep · bailey towers' }, { key: 'teahouse', label: '茶楼', sub: 'Tea rooms · lantern verandas' }, { key: B.SAKURA, label: '桜の森', sub: 'Sakura grove' },
      { key: B.PADDY, label: '棚田', sub: 'Rice terraces' }, { key: B.BAMBOO, label: '竹林', sub: 'Bamboo forest' },
      { key: B.MARSH, label: '湿地', sub: 'Marshland' }, { key: B.LAKE, label: '湖', sub: 'Lake shore' },
      { key: B.PINE, label: '高原', sub: 'Pine highland' }, { key: 'rail', label: '鉄道', sub: 'Railway' },
    ],
    fauna: {
      [B.SATO]: ['butterfly', 'sparrow', 'fox', 'deer', 'hawk'], [B.SAKURA]: ['butterfly', 'sparrow', 'fox', 'hawk'],
      [B.MEADOW]: ['butterfly', 'sparrow', 'deer', 'fox', 'hawk'], [B.MARSH]: ['butterfly', 'sparrow', 'fox', 'fish'],
      [B.PADDY]: ['butterfly', 'sparrow', 'hawk'], [B.BAMBOO]: ['sparrow', 'fox'], [B.CEDAR]: ['sparrow', 'fox', 'hawk', 'deer'],
      [B.PINE]: ['sparrow', 'fox', 'deer', 'hawk'], [B.BEACH]: ['sparrow', 'hawk'], [B.SNOW]: ['fox'],
      [B.LAKE]: ['sparrow', 'hawk', 'fish'], [B.RIVER]: ['sparrow', 'butterfly', 'fish'],
    },
    mist: { cloudSea: false, base: 40, density: 0 },
    water: { shallow: 0x527f76, deep: 0x1a464b, lake: 0x2e8984, river: 0x477f74, ocean: 0x275361 },
    spawnOrder: ['temple', 'castle', 'shrine', 'teahouse', 'farm'],
  }),
  shanshui: Object.freeze({
    id: 'shanshui', label: 'Shanshui China', name: '中式山水',
    natural: shanshuiNatural, classify: shanshuiClassify, anchor: shanshuiAnchor, biomeNames: SHANSHUI_BIOME_NAMES,
    landmarks: [
      { key: 'changan', label: '长安灯市', sub: 'City walls · lantern markets' },
      { key: 'palace', label: '王宫御苑', sub: 'Grand halls · inner courts · galleries' },
      { key: 'chineseTeahouse', label: '临风茶楼', sub: 'Tea rooms · balconies · lanterns' },
      { key: B.CEDAR, label: '黄山云海', sub: 'Granite needles · cliff pines' },
      { key: B.PADDY, label: '云岭梯田', sub: 'Contour terraces · water buffalo' },
      { key: B.LAKE, label: '九寨彩湖', sub: 'Mineral lakes · wooded shores' },
      { key: B.MARSH, label: '荷塘鹤汀', sub: 'Lotus beds · cranes' },
      { key: B.BAMBOO, label: '江南竹海', sub: 'Bamboo groves · quiet trails' },
      { key: B.SAKURA, label: '桃源春色', sub: 'Peach blossom hills' },
      { key: 'monastery', label: '山寺古院', sub: 'Courtyards · tiled eaves' },
      { key: 'waterPavilion', label: '湖心亭榭', sub: 'Pavilions · stone bridges' },
      { key: 'paifang', label: '古道牌楼', sub: 'Timber arches · stone paths' },
      { key: 'rail', label: '山水行旅', sub: 'Railway through the landscape' },
    ],
    fauna: {
      [B.SATO]: ['buffalo', 'deer', 'sparrow', 'butterfly', 'hawk'], [B.SAKURA]: ['deer', 'sparrow', 'butterfly'],
      [B.PADDY]: ['buffalo', 'crane', 'sparrow', 'butterfly'], [B.CEDAR]: ['deer', 'hawk'], [B.PINE]: ['deer', 'sparrow', 'hawk'],
      [B.BAMBOO]: ['deer', 'sparrow'], [B.MEADOW]: ['deer', 'sparrow', 'butterfly'], [B.MARSH]: ['crane', 'buffalo', 'butterfly', 'fish'],
      [B.LAKE]: ['fish', 'crane', 'hawk'], [B.RIVER]: ['fish', 'crane', 'butterfly'], [B.BEACH]: ['sparrow', 'hawk'], [B.SNOW]: ['hawk'],
    },
    mist: { cloudSea: true, base: 44, thickness: 15, density: 0.017, mountainThreshold: 0.35 },
    water: { shallow: 0x75c7b5, deep: 0x125366, lake: 0x42bbae, river: 0x559c91, ocean: 0x386b7a },
    spawnOrder: ['changan', 'monastery', 'mountainPavilion', 'terraceFarm', 'waterPavilion'],
  }),
});
let WORLD_PROFILE = WORLD_PROFILES.sakura;
function setTheme(id) {
  const next = WORLD_PROFILES[id];
  if (!next) throw new RangeError('Unknown world theme: ' + id);
  WORLD_PROFILE = next;
  BIOME_NAMES.splice(0, BIOME_NAMES.length, ...next.biomeNames);
  anchorCache.clear(); railKnots.clear();
  return next.id;
}
setTheme('sakura');
