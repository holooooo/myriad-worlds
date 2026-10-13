const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
async function main() {
  const THREE = await import(pathToFileURL(path.join(root,'node_modules/three/build/three.module.js')).href);
  const nodes = new Map();
  let document;
  class Element {
    constructor(tag) { this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.style={};this.attributes={};this.textContent='';this.events={};this.classes=new Set();this.classList={add:c=>this.classes.add(c),remove:c=>this.classes.delete(c),contains:c=>this.classes.has(c)}; }
    set id(v) { if(this._id)nodes.delete(this._id);this._id=v;if(v)nodes.set(v,this); } get id(){return this._id||'';}
    set innerHTML(value) {
      const remove=node=>{if(node.id)nodes.delete(node.id);node.children.forEach(remove);};this.children.forEach(remove);this.children=[];
      this.html=value;
      for(const match of value.matchAll(/<(\w+)[^>]*\bid="([^"]+)"[^>]*>/g)){const e=new Element(match[1]);e.id=match[2];this.appendChild(e);}
    }
    appendChild(e){e.parentNode=this;this.children.push(e);return e;}
    setAttribute(k,v){this.attributes[k]=v;} removeAttribute(k){delete this.attributes[k];} getAttribute(k){return this.attributes[k]||null;}
    addEventListener(k,fn){this.events[k]=fn;} focus(){document.activeElement=this;}
    querySelectorAll(selector){const matches=e=>selector.split(',').some(s=>s==='button:not(:disabled)'?e.tagName==='BUTTON'&&!e.disabled:s.startsWith('[data-')?e.dataset[s.slice(6,-1).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]!==undefined:e.tagName===s.toUpperCase());const out=[];const scan=e=>e.children.forEach(c=>{if(matches(c))out.push(c);scan(c);});scan(this);return out;}
    querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  }
  const body = new Element('body');
  for(const id of ['hud','btnFollow','btnWorld','btnHelp','btnTele','menu','menuBox','worldBadge']){const e=new Element(id.startsWith('btn')?'button':'div');e.id=id;body.appendChild(e);}
  document={body,head:new Element('head'),activeElement:nodes.get('btnFollow'),documentElement:{lang:''},createElement:tag=>new Element(tag),getElementById:id=>nodes.get(id)||null,querySelectorAll:s=>body.querySelectorAll(s)};
  const camera=new THREE.PerspectiveCamera(55,1.5,.4,7000);camera.position.set(0,0,0);
  const make=(kind,id,distance)=>{const g=new THREE.Group();g.position.set(distance,0,0);return {kind,id,g,active:true,eye:[0,1,0]};};
  const residents = [...Array.from({length:35},(_,i)=>make('farmer','farmer-'+i,5+i)),...Array.from({length:35},(_,i)=>make('merchant','merchant-'+i,60+i))];
  residents.push(make('carriage','carriage-0',760),make('sedan','sedan-0',770),make('fishingBoat','boat-0',810),make('merchantBoat','vessel-0',830));
  residents.filter(u=>u.kind.includes('Boat')).forEach(u=>{u.water={kind:'river'};});
  const distant=make('fishingBoat','out-of-range',1200),inactive=make('merchant','inactive',1),hidden=make('merchant','hidden',2);inactive.active=false;hidden.g.visible=false;
  residents.push(distant,inactive,hidden);
  const fauna = ['fox','deer','fish','sparrow','hawk','butterfly','crane','buffalo'].flatMap((kind,k)=>Array.from({length:10},(_,i)=>make(kind,kind+'-'+i,100+k*45+i)));
  const birds=Array.from({length:12},(_,i)=>make('bird','fx-'+i,650+i).g),cars=Array.from({length:6},(_,i)=>({g:make('train','car-'+i,900+i).g}));
  const logs=[],storage=new Map(),location={search:'?theme=shanshui&seed=arbitrary',pathname:'/'};
  let terrain = () => 0;
  const context={THREE,camera,document,navigator:{languages:['en-US'],language:'en-US'},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    GEN:{theme:'shanshui',profile:{landmarks:[]},heightAt:(x,z)=>terrain(x,z)},THEME:'shanshui',SEED:'arbitrary',QUALITY:'lite',location,URLSearchParams,
    FAUNA:fauna,SETTLEMENTS:{units:residents},FX:{birds},TRAIN:{cars,len:59.6,line:2,periodK:-1,phase:.234},ST:{chunks:new Map()},
    LOG:Object.fromEntries(['debug','info','warn','error'].map(level=>[level,(category,event,detail)=>logs.push({level,category,event,...detail})])),
    $:id=>nodes.get(id)||null,stopTour(){},tour:false,introT:1,keys:new Set(),toastKey(){},
    camS:{pos:new THREE.Vector3(),yaw:0,pitch:0},camG:{pos:new THREE.Vector3(),yaw:0,pitch:0},clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),wrapA:a=>Math.atan2(Math.sin(a),Math.cos(a)),canvas:{}};
  const source=['24_i18n.js','24_follow.js','24_navigation.js'].map(p=>fs.readFileSync(path.join(root,'src',p),'utf8')).join('\n');
  const api=vm.runInNewContext(source+'\n({I18N,FOLLOW,nearbyUnits,followMenuGroups,renderFollowMenu,openFollowMenu,startFollow,stopFollow,setFollowViewMode,updateFollow,camS});',context);
  api.I18N.setLogger(context.LOG);api.I18N.init();
  const units=api.nearbyUnits(),groups=api.followMenuGroups(units);
  assert.equal(units.length,172,'Registry must retain every eligible unit, including kinds beyond the first 24');
  assert.equal(groups.length,16);
  assert.equal(groups.reduce((n,g)=>n+g.entries.length,0),units.length);
  assert(groups.reduce((n,g)=>n+g.visible.length,0)<=48);
  for(let i=0;i<groups.length;i++){
    const g=groups[i];assert(g.visible.length>0&&g.visible.length<=g.limit);
    if(i)assert(groups[i-1].entries[0].distance<=g.entries[0].distance);
    for(let j=1;j<g.visible.length;j++)assert(g.visible[j-1].distance<=g.visible[j].distance);
    for(const e of g.entries)assert.equal(e.distance,e.unit.g.position.distanceTo(camera.position));
  }
  for(const kind of ['bird','train','carriage','sedan','fishingBoat','merchantBoat'])assert(groups.some(g=>g.kind===kind&&g.visible.length),'Traffic/birds must survive a saturated nearby population');
  assert.equal(api.followMenuGroups(birds.map((g,i)=>({g,id:'bird-'+i,kind:'bird'})))[0].visible.length,12,'The bounded bird group can show the complete 12-bird flock');
  assert(!units.some(u=>['out-of-range','inactive','hidden'].includes(u.id)));
  api.openFollowMenu();
  const sections=nodes.get('unitList').children;assert.equal(sections.length,groups.length);
  for(const section of sections){assert.equal(section.getAttribute('role'),'group');assert.equal(section.getAttribute('aria-labelledby'),section.children[0].id);}
  const saturated=sections.find(e=>e.dataset.kind==='farmer');assert(saturated.children.at(-1).textContent.includes('35'));
  const visibleMerchant=sections.find(e=>e.dataset.kind==='merchant').children[1].children.at(-1),focusedId=visibleMerchant.dataset.unit;
  visibleMerchant.focus();const moving=residents.find(u=>u.id===focusedId);moving.g.position.x=740;
  const pose=camera.position.toArray(),registry=context.SETTLEMENTS.units;
  for(const lang of ['zh','ja','en']){
    api.I18N.setLanguage(lang);assert.equal(document.activeElement.id,'follow-unit-'+focusedId,'Rebuilding translated groups must preserve keyboard focus');
    assert.equal(context.SETTLEMENTS.units,registry);assert.deepEqual(camera.position.toArray(),pose);
    assert(document.activeElement.textContent.includes('740'));
    const birdSection=nodes.get('unitList').children.find(e=>e.dataset.kind==='bird');
    assert(birdSection.children[0].textContent.startsWith(api.I18N.followGroupName('bird','shanshui')));
  }
  // Select actual source objects from each previously crowded-out group.
  for(const kind of ['fishingBoat','merchantBoat','carriage','bird','train']){
    api.renderFollowMenu();const group=nodes.get('unitList').children.find(e=>e.dataset.kind===kind),button=group.children[1].children[0],id=button.dataset.unit;
    const expected=kind==='train'?{g:cars[0].g}:api.nearbyUnits().find(u=>u.id===id);button.onclick();
    assert.equal(api.FOLLOW.target.g,expected.g);assert.equal(expected.g.visible,false);assert.equal(camera.near,.08);
    expected.g.updateMatrixWorld(true);const eye=new THREE.Vector3(...api.FOLLOW.target.eye).applyMatrix4(expected.g.matrixWorld);assert(eye.distanceTo(api.camS.pos)<1e-9);
    api.I18N.setLanguage('ja');assert.equal(api.FOLLOW.target.g,expected.g);assert.equal(expected.g.visible,false);api.stopFollow(false);assert.equal(camera.near,.4);
  }
  // Coach selection boards the locomotive; modes keep the same moving convoy.
  const train=context.TRAIN,phase=train.phase;
  const offsets=[0,9.1,19.3,33.1,46.9,60.7];cars.forEach((car,i)=>{car.g.position.set(900-offsets[i],4,0);car.g.rotation.y=.35;car.g.visible=true;});
  api.startFollow({id:'train-4',kind:'train',g:cars[4].g,line:train.line,periodK:train.periodK});
  const bound=api.FOLLOW.target;
  assert.equal(bound.g,cars[0].g);assert.equal(bound.id,'train-0');assert.equal(bound.line,2);assert.equal(bound.periodK,-1);
  assert.equal(api.FOLLOW.viewMode,'first');assert.equal(camera.near,.08);assert.equal(cars[0].g.visible,false);assert(cars.slice(1).every(c=>c.g.visible));
  assert.equal(nodes.get('followViewControls').hidden,false);
  nodes.get('followViewSide').onclick();
  assert.equal(api.FOLLOW.target,bound);assert.equal(api.FOLLOW.viewMode,'side');assert.equal(camera.near,.4);assert(cars.every(c=>c.g.visible));
  const expectedSide=new THREE.Vector3(-train.len/2,11,55).applyMatrix4(bound.g.matrixWorld);
  assert(expectedSide.distanceTo(api.camS.pos)<1e-9,'Side view must frame the convoy from its own moving coordinate system');
  camera.position.copy(api.camS.pos);
  const forward=new THREE.Vector3(Math.sin(api.camS.yaw)*Math.cos(api.camS.pitch),Math.sin(api.camS.pitch),Math.cos(api.camS.yaw)*Math.cos(api.camS.pitch));
  camera.lookAt(camera.position.clone().add(forward));camera.updateMatrixWorld(true);
  const inFrame=cars.filter(c=>{const p=c.g.position.clone().add(new THREE.Vector3(0,2.5,0)).project(camera);return Math.abs(p.x)<1&&Math.abs(p.y)<1&&p.z>-1&&p.z<1;});
  assert(inFrame.length>=4,'Side view must show several actual carriage centers in the camera frustum');
  const beforeMove=api.camS.pos.clone();cars.forEach(c=>{c.g.position.x+=4;});api.updateFollow(.05);
  assert(api.camS.pos.x>beforeMove.x&&api.camS.pos.x<beforeMove.x+4,'Side camera must damp train motion');
  const sideButton=nodes.get('followViewSide');sideButton.focus();
  for(const lang of ['zh','ja','en']){api.I18N.setLanguage(lang);assert.equal(document.activeElement,sideButton);assert.equal(sideButton.getAttribute('aria-pressed'),'true');assert.equal(sideButton.textContent,api.I18N.t('follow.view.side'));assert.equal(api.FOLLOW.target,bound);assert.equal(train.phase,phase);assert.equal(bound.line,2);assert.equal(bound.periodK,-1);}
  let stopped=false,prevented=false;
  nodes.get('followViewControls').events.keydown({key:' ',stopPropagation(){stopped=true;},preventDefault(){prevented=true;}});
  assert(stopped&&!prevented,'Space must activate a focused mode button without reaching free-flight movement');
  nodes.get('followViewFirst').onclick();assert.equal(api.FOLLOW.viewMode,'first');assert.equal(camera.near,.08);assert.equal(bound.g.visible,false);
  const driverEye=new THREE.Vector3(...bound.eye).applyMatrix4(bound.g.matrixWorld);assert(driverEye.distanceTo(api.camS.pos)<1e-9);
  // Sloped rail cuts are sampled in world space, including the convoy's rotation.
  const trainInverse=bound.g.matrixWorld.clone().invert();
  const localZ=(x,z)=>new THREE.Vector3(x,0,z).applyMatrix4(trainInverse).z;
  terrain=(x,z)=>35+35*Math.tanh(localZ(x,z)/15);
  api.setFollowViewMode('side');
  assert.equal(api.FOLLOW.sideSign,-1,'A high positive-side bank must choose the lower negative side');
  const openSide=new THREE.Vector3(-train.len/2,11,-55).applyMatrix4(bound.g.matrixWorld);
  assert(openSide.distanceTo(api.camS.pos)<1e-9,'Selected camera position must use the rotated convoy coordinates');
  terrain=(x,z)=>35-35*Math.tanh(localZ(x,z)/15);
  api.updateFollow(.05);
  assert.equal(api.FOLLOW.sideSign,-1,'A moving follow view must keep its chosen side when the opposite bank becomes lower');
  assert(api.camS.pos.y>=terrain(api.camS.pos.x,api.camS.pos.z)+3,'The actual camera must rise above newly encountered terrain');
  terrain=(x,z)=>60+12*Math.cos(localZ(x,z)/22);
  api.setFollowViewMode('first');api.setFollowViewMode('side');
  assert(api.camS.pos.y>=terrain(api.camS.pos.x,api.camS.pos.z)+4,'Both elevated banks must still leave the desired camera above ground');
  const destination=api.camS.pos.clone(),origin=destination.clone().add(new THREE.Vector3(20,0,0)),ridge=origin.clone().lerp(destination,.5);
  terrain=(x,z)=>20+120*Math.exp(-((x-ridge.x)**2+(z-ridge.z)**2)/16);
  api.camS.pos.copy(origin);api.camS.pos.y=24;
  api.updateFollow(Math.log(2)/8);
  assert(Math.hypot(api.camS.pos.x-ridge.x,api.camS.pos.z-ridge.z)<1e-9,'The damped camera must actually cross the ridge fixture');
  assert(api.camS.pos.y>=terrain(api.camS.pos.x,api.camS.pos.z)+3,'Collision protection must check the damped point, not only its endpoint');
  assert(context.camG.pos.distanceTo(api.camS.pos)<1e-9,'The camera goal must receive the protected actual position');
  assert.equal(api.FOLLOW.target,bound);assert.equal(bound.line,2);assert.equal(bound.periodK,-1);assert.equal(train.phase,phase);assert(cars.every(c=>c.g.visible));
  api.setFollowViewMode('first');
  assert(driverEye.distanceTo(api.camS.pos)<1e-9,'Terrain protection must not alter the rigid first-person driver eye');
  assert.equal(camera.near,.08);assert.equal(bound.g.visible,false);assert(cars.slice(1).every(c=>c.g.visible));
  assert.equal(api.FOLLOW.target,bound);assert.equal(bound.line,2);assert.equal(bound.periodK,-1);assert.equal(train.phase,phase);
  terrain=()=>0;
  sideButton.focus();api.stopFollow(false);assert.equal(nodes.get('followViewControls').hidden,true);assert.equal(document.activeElement.id,'btnFollow');assert.equal(camera.near,.4);assert(cars.every(c=>c.g.visible));
  assert.equal(api.setFollowViewMode('side'),false,'Third-person controls only apply while riding a train');
  assert(logs.some(e=>e.category==='access'&&e.event==='follow-menu-opened'));
  assert(!logs.some(e=>e.level==='error'));
  console.info(JSON.stringify({nearbyUnits:units.length,kinds:groups.length,shown:groups.reduce((n,g)=>n+g.visible.length,0),localized:true,focusedUnitPreserved:true,rides:['fishingBoat','merchantBoat','carriage','bird','train'],trainFrontDefault:true,sideCarsInFrame:inFrame.length,trainModePreservesPhase:true,trainSideTerrainSafe:true}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
