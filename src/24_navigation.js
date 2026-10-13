// World navigation and guide stay separate from the camera/simulation loop.
const menuEl = $('menu'), menuBox = $('menuBox');
let previousMenuFocus = null, activeMenu = null;
const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const menuText = key => escapeHTML(I18N.t(key));
const SAKURA_TELEPORTS = [
  { key: 'temple' }, { key: 'castle' }, { key: 'shrine' }, { key: 'farm' }, { key: 4 },
  { key: 'teahouse' }, { key: 'lighthouse' }, { key: 'hut' }, { key: 'pavilion' },
  { key: 'seaTorii' }, { key: 'rail' }, { key: 3 }, { key: 8 },
];
const TELEPORTS = GEN.profile.landmarks || SAKURA_TELEPORTS;

function openMenu(html, render = null) {
  if (!menuEl.classList.contains('show')) previousMenuFocus = document.activeElement;
  activeMenu = render;
  menuBox.innerHTML = html;
  menuBox.setAttribute('aria-modal', 'true'); menuEl.classList.add('show');
  menuBox.querySelector('button,input,select')?.focus();
}
function closeMenu() {
  activeMenu = null;
  menuEl.classList.remove('show'); menuBox.removeAttribute('aria-modal');
  previousMenuFocus?.focus();
}
menuEl.addEventListener('click', e => { if (e.target === menuEl) closeMenu(); });
menuEl.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeMenu(); return; }
  if (e.key !== 'Tab') return;
  const elements = [...menuBox.querySelectorAll('button:not(:disabled),input,select,a[href]')];
  const first = elements[0], last = elements.at(-1);
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
});
function navigateWorld(theme, seed = SEED) {
  const query = new URLSearchParams(location.search);
  query.set('theme', theme); query.set('seed', seed); query.set('q', QUALITY);
  LOG.info('access', 'world-change-requested', { theme, seed });
  location.search = query.toString();
}
function openWorldMenu() {
  openMenu('<h2 id="menuTitle">'+menuText('menu.world.title')+'</h2><p>'+menuText('menu.world.intro')+'</p>'
    + '<div class="worldGrid"><button class="worldCard" data-world="shanshui" aria-current="'+(THEME==='shanshui')+'"><span class="index">01 / SHANSHUI</span><strong>'+menuText('world.shanshui.name')+'</strong><span>'+menuText('menu.world.shanshui')+'<br>'+menuText('menu.world.shanshui2')+'</span></button>'
    + '<button class="worldCard" data-world="sakura" aria-current="'+(THEME==='sakura')+'"><span class="index">02 / HANAMI</span><strong>'+menuText('world.sakura.name')+'</strong><span>'+menuText('menu.world.sakura')+'<br>'+menuText('menu.world.sakura2')+'</span></button></div>'
    + '<div class="futureWorld">'+menuText('menu.world.future')+'<br>'+menuText('menu.world.futureText')+'</div>'
    + '<div class="btnRow"><button class="btnPri" id="menuClose">'+menuText('action.return')+'</button></div>', openWorldMenu);
  menuBox.querySelectorAll('[data-world]').forEach(b => b.onclick = () => navigateWorld(b.dataset.world));
  $('menuClose').onclick = closeMenu;
}
function openGuideMenu() {
  openMenu('<h2 id="menuTitle">'+menuText('menu.guide.title')+'</h2>'
    + '<h3>'+menuText('menu.guide.explore')+'</h3><ul><li>'+menuText('menu.guide.look')+'</li><li>'+menuText('menu.guide.move')+'</li><li>'+menuText('menu.guide.keys')+'</li></ul>'
    + '<h3>'+menuText('menu.guide.follow')+'</h3><p>'+menuText('menu.guide.followText')+'</p>'
    + '<h3>'+menuText('menu.guide.atmosphere')+'</h3><p>'+menuText('menu.guide.atmosphereText')+'</p>'
    + '<h3>'+menuText('menu.guide.quality')+'</h3><label><input type="checkbox" id="qualitySwitch" '+(QUALITY==='high'?'checked':'')+'> '+menuText('menu.guide.highQuality')+'</label><p>'+menuText('menu.guide.qualityText')+'</p>'
    + '<div class="btnRow"><button class="btnPri" id="menuClose">'+menuText('action.continue')+'</button></div>', openGuideMenu);
  $('menuClose').onclick = closeMenu;
  $('qualitySwitch').onchange = e => { autoChecked = true; prScale = 1; applyQuality(e.target.checked ? 'high' : 'lite'); };
}
function openPlacesMenu() {
  openMenu('<h2 id="menuTitle">'+menuText('menu.places.title')+'</h2><p>'+menuText('menu.places.intro')+'</p>'
    + '<h3>'+menuText('menu.places.seed')+'</h3><div id="seedBox"><input id="seedInput" value="'+escapeHTML(SEED)+'" spellcheck="false" aria-label="'+menuText('menu.places.seed')+'"><button class="btnSec" id="seedGo">'+menuText('menu.places.generate')+'</button><button class="btnSec" id="seedRand">'+menuText('menu.places.random')+'</button></div>'
    + '<h3>'+menuText('menu.places.destinations')+'</h3><div id="teleList">'
    + TELEPORTS.map((entry,i) => { const t = I18N.destination(entry, THEME); return '<button class="btnSec" data-tele="'+i+'"><b>'+escapeHTML(t.label)+'</b><span>'+escapeHTML(t.sub)+'</span></button>'; }).join('')
    + '</div><div class="btnRow"><button class="btnPri" id="menuClose">'+menuText('action.return')+'</button></div>', openPlacesMenu);
  $('menuClose').onclick = closeMenu;
  $('seedGo').onclick = () => {
    const v = $('seedInput').value.trim() || 'sakura';
    try { localStorage.setItem('myriad-worlds-seed', v); }
    catch (e) { LOG.warn('error', 'seed-preference-write-failed', { message: String(e.message || e) }); }
    navigateWorld(THEME, v);
  };
  $('seedInput').onkeydown = e => { if (e.key === 'Enter') $('seedGo').click(); };
  $('seedRand').onclick = () => { $('seedInput').value = Math.random().toString(36).slice(2,8); };
  menuBox.querySelectorAll('[data-tele]').forEach(b => b.onclick = () => { closeMenu(); teleport(TELEPORTS[+b.dataset.tele].key); });
}
function refreshNavigationLanguage() {
  document.title = I18N.t('product.name') + ' · ' + I18N.t('world.' + THEME + '.name');
  $('worldBadge').textContent = I18N.t('world.' + THEME + '.badge');
  if (!activeMenu || !menuEl.classList.contains('show')) return;
  const input = $('seedInput'), draft = input?.value;
  const focused = document.activeElement?.id, selection = input ? [input.selectionStart, input.selectionEnd] : null;
  activeMenu();
  if (draft !== undefined && $('seedInput')) { $('seedInput').value = draft; $('seedInput').setSelectionRange(...selection); }
  if (focused && $(focused)) $(focused).focus();
}
$('btnWorld').addEventListener('click', openWorldMenu);
$('btnHelp').addEventListener('click', openGuideMenu);
$('btnTele').addEventListener('click', openPlacesMenu);
I18N.onChange(refreshNavigationLanguage);
