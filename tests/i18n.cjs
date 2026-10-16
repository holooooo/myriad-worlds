const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/24_i18n.js'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'src/00_shell.html'), 'utf8');
const storageKey = 'myriad-worlds-language';
function environment(languages, saved, denyStorage = false) {
  const writes = [], logs = [], elements = [], events = {}, values = new Map(saved ? [[storageKey, saved]] : []);
  for (const tag of shell.matchAll(/<[^>]+data-i18n[^>]*>/g)) {
    const dataset = {};
    for (const attr of tag[0].matchAll(/data-(i18n(?:-title|-aria|-alt)?)="([^"]+)"/g)) {
      dataset[attr[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = attr[2];
    }
    elements.push({ dataset, attributes: {}, textContent: '', setAttribute(k,v) { this.attributes[k] = v; } });
  }
  const selector = { value: '', addEventListener(k,fn) { events[k] = fn; } }, flag = { textContent: '' };
  const document = { documentElement: { lang: '' }, getElementById: id => id === 'languageSelect' ? selector : id === 'languageFlag' ? flag : null,
    querySelectorAll: selector => elements.filter(el => selector === '[data-i18n]' ? el.dataset.i18n : selector === '[data-i18n-title]' ? el.dataset.i18nTitle : selector === '[data-i18n-aria]' ? el.dataset.i18nAria : el.dataset.i18nAlt) };
  const localStorage = { getItem(k) { if (denyStorage) throw new Error('disabled'); return values.get(k) || null; },
    setItem(k,v) { if (denyStorage) throw new Error('disabled'); writes.push([k,v]); values.set(k,v); } };
  // No render, world or unit globals are supplied: the language module must be boot-safe.
  const I18N = vm.runInNewContext(source + '\nI18N;', { navigator: { languages, language: languages[0] }, localStorage, document });
  I18N.setLogger(Object.fromEntries(['info','debug','warn','error'].map(level => [level, (category,event,detail) => logs.push({level,category,event,...detail})])));
  return { I18N, document, elements, selector, flag, events, writes, logs };
}
for (const [preferences, expected] of [
  [['zh-TW','en-US'], 'zh'], [['ja-JP','en'], 'ja'], [['en-GB','zh-CN'], 'en'], [['fr-FR','ja-JP'], 'ja'], [['de-DE'], 'en'], [[], 'en'],
]) {
  const e = environment(preferences); assert.equal(e.I18N.lang, expected); e.I18N.init();
  assert.equal(e.writes.length, 0, 'Automatic browser detection must not store an explicit preference');
  assert.equal(e.selector.value, expected); assert.equal(e.document.documentElement.lang, expected === 'zh' ? 'zh-CN' : expected);
  assert.equal(e.flag.textContent, {zh:'🇨🇳',ja:'🇯🇵',en:'🇬🇧'}[expected], 'The compact flag entry must follow the browser language');
  assert(!e.logs.some(l => l.level === 'error'));
}
const e = environment(['en-US'], 'ja');
assert.equal(e.I18N.lang, 'ja', 'An explicit selection takes precedence over the browser');
e.I18N.init();
const unchangedWorld = { seed: 'arbitrary-seed', camera: [43,88,-102], theme: 'shanshui', chunks: new Map([['0:0',{}]]) };
const before = JSON.stringify(unchangedWorld), chunks = unchangedWorld.chunks;
let refreshes = 0;
e.I18N.onChange(() => { refreshes++; assert.equal(JSON.stringify(unchangedWorld), before); assert.equal(unchangedWorld.chunks, chunks); });
for (const lang of ['zh','ja','en']) {
  e.events.change({ target: { value: lang } });
  assert.equal(e.I18N.lang, lang); assert.equal(e.writes.at(-1)[1], lang);
  assert.equal(e.flag.textContent, {zh:'🇨🇳',ja:'🇯🇵',en:'🇬🇧'}[lang], 'The flag entry must update after every native dropdown selection');
  for (const key of e.I18N.keys()) assert(e.I18N.t(key).trim() && e.I18N.t(key) !== key, 'Missing ' + lang + ' translation: ' + key);
  for (const el of e.elements) {
    if (el.dataset.i18n) assert.equal(el.textContent, e.I18N.t(el.dataset.i18n));
    if (el.dataset.i18nTitle) assert.equal(el.attributes.title, e.I18N.t(el.dataset.i18nTitle));
    if (el.dataset.i18nAria) assert.equal(el.attributes['aria-label'], e.I18N.t(el.dataset.i18nAria));
    if (el.dataset.i18nAlt) assert.equal(el.attributes.alt, e.I18N.t(el.dataset.i18nAlt));
  }
  for (const theme of ['sakura','shanshui']) {
    for (let id=0;id<14;id++) assert(e.I18N.biomeName(id,theme) !== `biome.${theme}.${id}`);
    for (const kind of ['farmer','merchant','official','carriage','sedan','fishingBoat','merchantBoat','crane','buffalo','bird','fox','deer','fish','train']) {
      const name = e.I18N.unitName({kind,source:{water:{kind:'lake'}}},theme);
      assert(!name.includes('unit.') && name.includes(e.I18N.t('water.lake')));
    }
  }
  assert(e.I18N.t('toast.follow.started',{unit:'Example'}).includes('Example'));
}
assert.equal(refreshes, 3);
assert.equal(e.I18N.setLanguage('unsupported'), false); assert.equal(e.I18N.lang, 'en');
assert.equal(e.I18N.t('missing.key'), 'missing.key'); e.I18N.t('missing.key');
assert.equal(e.logs.filter(l => l.event === 'translation-key-missing').length, 1);
assert(e.logs.some(l => l.level === 'debug' && l.category === 'access' && l.event === 'language-change-requested'));
assert(e.logs.some(l => l.level === 'info' && l.category === 'business' && l.event === 'language-changed'));
e.events.focus();assert(e.logs.some(l=>l.level==='debug'&&l.category==='access'&&l.event==='language-picker-focused'));
assert.match(shell, /id="languageSelect"[^>]*data-i18n-aria="language"/, 'The flag dropdown must retain its translated accessible name');
assert.match(shell, /id="languageFlag" aria-hidden="true"/, 'The decorative flag must not replace the selector name');
for(const lang of ['zh','ja','en'])assert.match(shell,new RegExp('<option value="'+lang+'"'), 'Every supported language must remain a native keyboard-selectable option');
const denied = environment(['zh-CN'],null,true); denied.I18N.init(); assert(denied.I18N.setLanguage('ja')); assert.equal(denied.I18N.lang,'ja');
assert.equal(denied.logs.filter(l => l.category === 'error' && l.level === 'warn').length, 2);
// Verify every profile destination rather than only a fixed hand-picked list.
const manifest = JSON.parse(fs.readFileSync(path.join(root,'world.manifest.json')));
const G = vm.runInNewContext(manifest.generator.map(p => fs.readFileSync(path.join(root,'src',p),'utf8')).join('\n')+'\nGEN;');
let destinations=0;
for (const theme of ['sakura','shanshui']) {
  G.setTheme(theme);
  for (const entry of G.profile.landmarks) for (const lang of ['zh','ja','en']) {
    e.I18N.setLanguage(lang); const place=e.I18N.destination(entry,theme);
    assert(place.label && place.sub); assert(!place.label.startsWith('place.') && !place.sub.startsWith('place.')); destinations++;
  }
}
console.info(JSON.stringify({languages:3,keys:e.I18N.keys().length,destinations,browserFallback:true,explicitPreference:true,compactFlagPicker:true,nativeKeyboardDropdown:true,staticLabels:e.elements.length,preservedWorld:true}));
