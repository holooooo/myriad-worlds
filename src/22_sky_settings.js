// Per-mood sky controls share the existing dome and volumetric uniforms.
// No settings-dependent meshes, ray steps or post-processing passes.
var SKY_SETTINGS = (() => {
  const storageKey = 'myriad-worlds-sky-v1';
  const limits = { cloudAmount: [0, 1], sunRedshift: [0, 1], sunDiameter: [0.3, 2.4], sunBrightness: [0, 3], starCount: [0, 2400], starDensity: [0.25, 2], starBrightness: [0, 2.5],
    moonPhase: [0, 1], moonDiameter: [0.3, 8], moonHalo: [0, 3], moonBrightness: [0, 3],
    planetSize: [8, 110], planetAzimuth: [0, 360], planetElevation: [-15, 70], planetBrightness: [0, 1.5], ringTilt: [-85, 85] };
  const planetTypes = ['off', 'ice-rings', 'gas-giant', 'near-rings'];
  const toggles = new Set(['clouds', 'sunMoon']);
  const groups = { clouds: ['clouds', 'cloudAmount'], sun: ['sunRedshift', 'sunDiameter', 'sunBrightness'], stars: ['starCount', 'starDensity', 'starBrightness'],
    moon: ['moonPhase', 'moonDiameter', 'moonHalo', 'moonBrightness', 'sunMoon'], planet: ['planetType', 'planetSize', 'planetAzimuth', 'planetElevation', 'planetBrightness', 'ringTilt'] };
  const defaults = (name) => {
    const m = MOODS[name];
    return { clouds: m.cloud > 0, cloudAmount: m.cloud, sunRedshift: 0,
      sunDiameter: m.sunCol ? Math.acos(1 - m.sunSize) * 360 / Math.PI : 0.8, sunBrightness: m.sunCol ? 1.7 : 0,
      starCount: Math.round(m.stars * 18) * 50, starDensity: 1, starBrightness: m.stars || 1,
      moonPhase: 0.18, moonDiameter: 3.2, moonHalo: 0.55, moonBrightness: 0.85, sunMoon: false,
      planetType: 'off', planetSize: 44, planetAzimuth: 220, planetElevation: 16, planetBrightness: 0.9, ringTilt: 32 };
  };
  const clean = (name, input = {}) => {
    const value = defaults(name);
    // Preserve choices saved before phase and redshift became sliders.
    input = { ...input };
    if (input.sunRedshift === undefined && typeof input.redSun === 'boolean') input.sunRedshift = input.redSun ? 1 : 0;
    if (input.moonPhase === undefined && typeof input.fullMoon === 'boolean') input.moonPhase = input.fullMoon ? 0.5 : value.moonPhase;
    for (const key of Object.keys(value)) {
      if (key === 'planetType') { if (planetTypes.includes(input[key])) value[key] = input[key]; }
      else if (toggles.has(key)) { if (typeof input[key] === 'boolean') value[key] = input[key]; }
      else if (typeof input[key] === 'number' && Number.isFinite(input[key])) value[key] = clamp(input[key], ...limits[key]);
    }
    value.starCount = Math.round(value.starCount);
    return value;
  };
  const values = Object.fromEntries(Object.keys(MOODS).map(name => [name, defaults(name)]));
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    // Planet appearance is opt-in for each page visit. Keep its saved
    // proportions and direction while restoring every mood with it hidden.
    for (const name of Object.keys(values)) if (saved[name] && typeof saved[name] === 'object') values[name] = clean(name, { ...saved[name], planetType: 'off' });
    LOG.debug('business', 'sky-settings-loaded', { moods: Object.keys(values).length, planetType: 'off' });
  } catch (error) { LOG.warn('error', 'sky-settings-load-failed', { message: String(error.message || error) }); }
  const text = {
    zh: { title: '天空', note: '设置仅应用于当前时段', clouds: '多云', cloudAmount: '云量', sunRedshift: '太阳红移', sunDiameter: '太阳直径', sunBrightness: '太阳亮度', starCount: '星星数量', starDensity: '星星密度', starBrightness: '星星亮度', moonPhase: '月相', moonDiameter: '月亮直径', moonHalo: '月亮光晕', moonBrightness: '月亮亮度', sunMoon: '日月同辉', reset: '重置当前时段', morning: '晨雾', golden: '暮光', dusk: '薄暮', night: '月夜', rain: '细雨', coexistNote: '晨雾与薄暮可同时显示太阳和月亮', planetType: '巨行星异象', planetNote: '行星的大小与方位可单独调整', 'off': '关闭', 'ice-rings': '冰蓝星环', 'gas-giant': '木星风暴', 'near-rings': '近地白色星环', planetSize: '行星直径', planetAzimuth: '行星方位', planetElevation: '行星仰角', planetBrightness: '行星亮度', ringTilt: '星环倾角', groupClouds: '云层', groupSun: '太阳', groupStars: '星空', groupMoon: '月亮', groupPlanet: '巨行星', phases: ['新月', '娥眉月', '上弦月', '盈凸月', '满月', '亏凸月', '下弦月', '残月', '新月'] },
    en: { title: 'Sky', note: 'Settings apply to the current mood', clouds: 'Clouds', cloudAmount: 'Cloud cover', sunRedshift: 'Sun redshift', sunDiameter: 'Sun diameter', sunBrightness: 'Sun brightness', starCount: 'Star count', starDensity: 'Star density', starBrightness: 'Star brightness', moonPhase: 'Moon phase', moonDiameter: 'Moon diameter', moonHalo: 'Moon halo', moonBrightness: 'Moon brightness', sunMoon: 'Sun and moon', reset: 'Reset current mood', morning: 'Morning mist', golden: 'Golden hour', dusk: 'Blue hour', night: 'Moonlit night', rain: 'Rain', coexistNote: 'Sun and moon can appear together in morning mist and blue hour', planetType: 'Giant planet', planetNote: 'Planet size and direction are independent of the sun', 'off': 'Off', 'ice-rings': 'Ringed ice giant', 'gas-giant': 'Jupiter storm', 'near-rings': 'Close white rings', planetSize: 'Planet diameter', planetAzimuth: 'Planet azimuth', planetElevation: 'Planet elevation', planetBrightness: 'Planet brightness', ringTilt: 'Ring tilt', groupClouds: 'Clouds', groupSun: 'Sun', groupStars: 'Stars', groupMoon: 'Moon', groupPlanet: 'Giant planet', phases: ['New', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full', 'Waning gibbous', 'Last quarter', 'Waning crescent', 'New'] },
    ja: { title: '空', note: '現在の時間帯にのみ適用', clouds: '雲を表示', cloudAmount: '雲量', sunRedshift: '太陽の赤方偏移', sunDiameter: '太陽の直径', sunBrightness: '太陽の明るさ', starCount: '星の数', starDensity: '星の密度', starBrightness: '星の明るさ', moonPhase: '月相', moonDiameter: '月の直径', moonHalo: '月の光輪', moonBrightness: '月の明るさ', sunMoon: '日月同輝', reset: '現在の時間帯をリセット', morning: '朝霧', golden: '夕焼け', dusk: '薄暮', night: '月夜', rain: '春雨', coexistNote: '朝霧と薄暮では太陽と月を同時に表示できます', planetType: '巨大惑星', planetNote: '惑星の大きさと方角は太陽と別に調整できます', 'off': 'オフ', 'ice-rings': '氷青の環状惑星', 'gas-giant': '木星の大嵐', 'near-rings': '近接する白い環', planetSize: '惑星の直径', planetAzimuth: '惑星の方位', planetElevation: '惑星の仰角', planetBrightness: '惑星の明るさ', ringTilt: '環の傾き', groupClouds: '雲', groupSun: '太陽', groupStars: '星空', groupMoon: '月', groupPlanet: '巨大惑星', phases: ['新月', '三日月', '上弦', '満ちる月', '満月', '欠ける月', '下弦', '細い月', '新月'] },
  };
  let language = 'zh', panel = null, refreshTimer = null;
  const controls = new Map(), groupLabels = new Map();
  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(values)); }
    catch (error) { LOG.warn('error', 'sky-settings-save-failed', { message: String(error.message || error) }); }
  }
  function changed() {
    if (!booted) return;
    applyAtmosphere();
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      try { refreshEnv(); }
      catch (error) { LOG.error('error', 'sky-environment-refresh-failed', { message: String(error.message || error) }); }
    }, 180);
  }
  function set(name, key, raw) {
    if (key === 'redSun' && typeof raw === 'boolean') { key = 'sunRedshift'; raw = raw ? 1 : 0; }
    if (key === 'fullMoon' && typeof raw === 'boolean') { key = 'moonPhase'; raw = raw ? 0.5 : 0.18; }
    if (!Object.hasOwn(values, name) || !Object.hasOwn(defaults(name), key)) { LOG.warn('business', 'sky-setting-rejected', { mood: name, setting: key }); return false; }
    if (key === 'planetType' ? !planetTypes.includes(raw) : toggles.has(key) ? typeof raw !== 'boolean' : typeof raw !== 'number' || !Number.isFinite(raw)) return false;
    values[name] = clean(name, { ...values[name], [key]: raw });
    LOG.info('access', 'sky-setting-changed', { mood: name, setting: key, value: values[name][key] });
    persist(); sync(); if (name === moodName) changed();
    return true;
  }
  function reset(name = moodName) {
    if (!Object.hasOwn(values, name)) return;
    values[name] = defaults(name); persist(); sync(); if (name === moodName) changed();
    LOG.info('business', 'sky-settings-reset', { mood: name });
  }
  function format(key, value) {
    if (key === 'cloudAmount' || key === 'sunRedshift') return Math.round(value * 100) + '%';
    if (key === 'moonPhase') return Math.round(value * 100) + '% · ' + text[language].phases[Math.round(value * 8)];
    if (key === 'sunDiameter' || key === 'moonDiameter') return value.toFixed(2) + '°';
    if (['planetSize', 'planetAzimuth', 'planetElevation', 'ringTilt'].includes(key)) return Math.round(value) + '°';
    if (key === 'starCount') return String(Math.round(value));
    return value.toFixed(2) + '×';
  }
  function sync() {
    if (!panel) return;
    const words = text[language], v = values[moodName];
    const entry = panel.querySelector('#skyToggle');
    entry.setAttribute('aria-label', words.title + ' · ' + words[moodName]);
    entry.setAttribute('title', words.title + ' · ' + words[moodName]);
    entry.setAttribute('aria-expanded', String(panel.open));
    panel.querySelector('[data-sky-title]').textContent = words.title;
    panel.querySelector('[data-sky-mood]').textContent = words[moodName];
    panel.querySelector('[data-sky-note]').textContent = words.note;
    panel.querySelector('[data-sky-planet-note]').textContent = words.planetNote;
    panel.querySelector('[data-sky-reset]').textContent = words.reset;
    for (const [key, label] of groupLabels) label.textContent = words['group' + key[0].toUpperCase() + key.slice(1)];
    for (const [key, row] of controls) {
      row.label.textContent = words[key];
      if (key === 'planetType') { row.input.value = v[key]; for (const option of row.input.options) option.textContent = words[option.value]; }
      else if (toggles.has(key)) row.input.checked = v[key]; else { row.input.value = v[key]; row.output.textContent = format(key, v[key]); }
      row.input.disabled = key === 'sunMoon' && !['morning', 'dusk'].includes(moodName) || key !== 'planetType' && (key.startsWith('planet') || key === 'ringTilt') && (v.planetType === 'off' || key === 'ringTilt' && v.planetType === 'gas-giant');
      row.root.classList.toggle('skyDisabled', row.input.disabled);
      if (key === 'sunMoon') row.root.title = words.coexistNote;
    }
  }
  function init() {
    if (panel || !$('hud')) return;
    const style = document.createElement('style');
    style.textContent = `#skyPanel{position:absolute;bottom:24px;right:28px;width:44px;height:44px;pointer-events:auto;color:var(--paper);font-size:.76rem;z-index:11}#skyPanel summary{display:flex;align-items:center;gap:9px;cursor:pointer;list-style:none;user-select:none}#skyPanel summary::-webkit-details-marker{display:none}#skyPanel>summary{justify-content:center;width:44px;height:44px;background:var(--panel);border:1px solid var(--line);box-shadow:0 8px 24px #0002;color:var(--muted)}#skyPanel>summary:hover,#skyPanel[open]>summary{color:var(--accent);border-color:var(--accent)}#skyPanel>summary svg{width:22px;height:22px;stroke:currentColor;stroke-width:1.5;fill:none;stroke-linecap:round;stroke-linejoin:round}#skyPanel .skyBody{position:absolute;bottom:52px;right:0;width:min(286px,calc(100vw - 32px));padding:0 14px 14px;max-height:calc(100dvh - 220px);overflow:auto;background:var(--panel);border:1px solid var(--line);box-shadow:0 8px 24px #0002}#skyPanel .skyHeader{display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--line)}#skyPanel .skyHeader span:last-child{color:var(--muted);font-size:.65rem}#skyPanel .skyNote{color:var(--muted);font-size:.65rem;line-height:1.5;padding:11px 0}#skyPanel .skyRow{display:grid;grid-template-columns:1fr auto;gap:9px;padding:9px 0;border-bottom:1px solid var(--line);align-items:center}#skyPanel .skyRow output{font-size:.65rem;color:var(--muted);font-variant-numeric:tabular-nums}#skyPanel .skyRow input[type=range]{grid-column:1/-1;width:100%;height:16px;accent-color:var(--accent)}#skyPanel .skyRow input[type=checkbox]{width:16px;height:16px;accent-color:var(--accent)}#skyPanel .skyDisabled{opacity:.4}#skyPanel button{margin-top:13px;border:1px solid var(--line);padding:9px 10px;color:var(--accent);width:100%;text-align:center}#skyPanel button:hover{background:#d5b77b15}@media(max-width:900px){#skyPanel{bottom:136px}#skyPanel .skyBody{max-height:calc(100dvh - 300px)}}@media(max-width:600px){#skyPanel{bottom:calc(124px + env(safe-area-inset-bottom));right:16px}}`;
    style.textContent += '#skyPanel select{max-width:150px;font:inherit;font-size:.68rem;background:#142326;color:var(--paper);border:1px solid var(--line);padding:6px 5px;cursor:pointer}#skyPanel select:focus-visible{outline:2px solid var(--accent);outline-offset:3px}';
    style.textContent += '#skyPanel .skyGroup{border-top:1px solid var(--line)}#skyPanel .skyGroup>summary{padding:12px 0;color:var(--accent)}#skyPanel .skyGroup>summary span:last-child{margin-left:0;color:inherit;font-size:.76rem}#skyPanel .skyGroup:not([open])>summary:before{content:"+"}#skyPanel .skyGroup[open]>summary:before{content:"−"}#skyPanel summary:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}#skyPanel .skyGroup .skyRow:last-child{border-bottom:0;margin-bottom:5px}';
    document.head.appendChild(style);
    panel = document.createElement('details'); panel.id = 'skyPanel';
    panel.innerHTML = '<summary id="skyToggle" aria-controls="skyPanelBody" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="16" cy="8" r="3"/><path d="M16 2v1m0 10v1M10 8H9m14 0h-1m-2-4 .8-.8M11.2 3.2 12 4M6 19a4 4 0 1 1 1-8 5 5 0 0 1 8 3 2.5 2.5 0 1 1 1 5H6Z"/></svg></summary><div id="skyPanelBody" class="skyBody"><div class="skyHeader"><span data-sky-title></span><span data-sky-mood></span></div><p class="skyNote" data-sky-note></p><div data-sky-controls></div><button type="button" data-sky-reset></button></div>';
    const allGroups = panel.querySelector('[data-sky-controls]');
    for (const [group, fields] of Object.entries(groups)) {
      const section = document.createElement('details'), summary = document.createElement('summary'), heading = document.createElement('span');
      section.className = 'skyGroup'; section.dataset.skyGroup = group; section.open = group === 'sun';
      summary.appendChild(heading); section.appendChild(summary); allGroups.appendChild(section); groupLabels.set(group, heading);
      const container = document.createElement('div'); section.appendChild(container);
      if (group === 'planet') { const note = document.createElement('p'); note.className = 'skyNote'; note.setAttribute('data-sky-planet-note', ''); container.appendChild(note); }
      section.addEventListener('toggle', () => LOG.debug('access', 'sky-group-toggled', { group, open: section.open }));
      for (const key of fields) {
        const root = document.createElement('label'); root.className = 'skyRow';
        const label = document.createElement('span'), input = document.createElement(key === 'planetType' ? 'select' : 'input'); input.id = 'sky-' + key; root.htmlFor = input.id;
        root.appendChild(label);
        let output = null;
        if (key === 'planetType') for (const type of planetTypes) { const option = document.createElement('option'); option.value = type; input.appendChild(option); }
        else if (toggles.has(key)) input.type = 'checkbox';
        else {
          input.type = 'range'; [input.min, input.max] = limits[key]; input.step = key === 'starCount' ? '50' : key.startsWith('planet') && key !== 'planetBrightness' || key === 'ringTilt' ? '1' : '0.01';
          output = document.createElement('output'); output.htmlFor = input.id; root.appendChild(output);
        }
        root.appendChild(input); container.appendChild(root); controls.set(key, { root, label, input, output });
        input.addEventListener('input', () => set(moodName, key, key === 'planetType' ? input.value : toggles.has(key) ? input.checked : Number(input.value)));
      }
    }
    panel.addEventListener('toggle', event => {
      if (event.target !== panel) return;
      panel.querySelector('#skyToggle').setAttribute('aria-expanded', String(panel.open));
      LOG.info('access', 'sky-panel-toggled', { open: panel.open });
    });
    panel.addEventListener('keydown', event => {
      if ([' ', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) event.stopPropagation();
      if (event.key === 'Escape' && panel.open) {
        event.preventDefault(); event.stopPropagation(); panel.open = false; panel.querySelector('#skyToggle').focus();
      }
    });
    panel.querySelector('[data-sky-reset]').addEventListener('click', () => reset());
    $('hud').appendChild(panel); sync();
  }
  const sunTint = C(0xff603b), fallbackSun = C(0xffd4ad), scatterTint = new THREE.Color(), solarColor = new THREE.Color(), moonDirection = new THREE.Vector3();
  function apply() {
    const v = values[moodName], coexist = v.sunMoon && ['morning', 'dusk'].includes(moodName);
    const sunBrightness = coexist && moodName === 'dusk' ? Math.max(v.sunBrightness, 0.7) : v.sunBrightness;
    solarColor.copy(ATM.sunCol.getHex() ? ATM.sunCol : fallbackSun).lerp(sunTint, v.sunRedshift);
    SKY_U.uSunCol.value.copy(solarColor).multiplyScalar(sunBrightness);
    SKY_U.uSunSize.value = 1 - Math.cos(v.sunDiameter * Math.PI / 360);
    SKY_U.uCloud.value = v.clouds ? v.cloudAmount : 0;
    SKY_U.uStars.value = v.starBrightness; SKY_U.uStarCount.value = v.starCount; SKY_U.uStarDensity.value = v.starDensity;
    SKY_U.uMoonPhase.value = v.moonPhase;
    SKY_U.uMoonRadius.value = 2 * Math.sin(v.moonDiameter * Math.PI / 720);
    SKY_U.uMoonHalo.value = v.moonHalo; SKY_U.uMoonBrightness.value = v.moonBrightness;
    const azimuth = v.planetAzimuth * Math.PI / 180, elevation = v.planetElevation * Math.PI / 180;
    SKY_U.uPlanetType.value = planetTypes.indexOf(v.planetType);
    SKY_U.uPlanetDir.value.set(Math.sin(azimuth) * Math.cos(elevation), Math.sin(elevation), Math.cos(azimuth) * Math.cos(elevation));
    SKY_U.uPlanetRadius.value = Math.sin(v.planetSize * Math.PI / 360);
    SKY_U.uPlanetBrightness.value = v.planetBrightness;
    SKY_U.uRingTilt.value = v.ringTilt * Math.PI / 180;
    if (coexist) {
      SKY_U.uMoon.value = Math.max(ATM.moon, moodName === 'morning' ? 0.42 : 0.65);
      moonDirection.set(-ATM.sunDir.x, 0.42, -ATM.sunDir.z).normalize(); SKY_U.uMoonDir.value.copy(moonDirection);
    }
    if (ATM.sunCol.getHex() || coexist) {
      const ratio = sunBrightness / 1.7;
      SKY_U.uGlow.value.copy(ATM.glow).lerp(sunTint, v.sunRedshift).multiplyScalar(Math.min(ratio, 1.4));
      FOGU.glow.x *= ratio; FOGU.glow.y *= ratio; FOGU.glow.z *= ratio;
      volPass.mat.uniforms.uSunCol.value.multiplyScalar(ratio);
      volPass.mat.uniforms.uSunCol.value.lerp(scatterTint.copy(sunTint).multiplyScalar(ATM.vSunI * ratio), v.sunRedshift * 0.28);
    }
  }
  init();
  return { set, reset, sync, apply, init, setLanguage(lang) { language = text[lang] ? lang : 'zh'; sync(); }, get(name = moodName) { return { ...values[name] }; } };
})();
// Function and var hoisting allow atmosphere code to load before this module.
function applySkySettings() { if (SKY_SETTINGS) SKY_SETTINGS.apply(); }
