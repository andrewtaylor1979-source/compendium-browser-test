import * as E from './engine.js?v=memory131';
const $=id=>document.getElementById(id), esc=x=>String(x??'').replace(/[&<>"']/g,y=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[y]));
const display=n=>roster.find(c=>c.asset_name===n)?.full_name||n;
const KEY='sgc-browser-v1-save',DIRDB='sgc_browser_feasibility',HANDKEY='assets-directory';
let roster=[],packs={},view='menu',mode='dice',game=null,selected=['Ahsoka','Jack'],human='Ahsoka',rosterTab=0,search='',spectator=false,playerName='Player',gender='male',confidence=3,background='Nightclub',discard=new Set(),folder=null,assets=new Map(),objects=new Map(),loadedImgs=new Map(),sceneSprites=new Map(),folderInfo='',lastSpin=-1,immersive=false,sceneViewerData='',sceneZoom=1;
const menuModes=[['dice','🎲','Dice','Highest chooses. Lowest loses.'],['memory','🃏','Strip Memory','Reveal a character, choose a penalty.'],['wheel','🎡','Wheel of Misfortune','Sixteen segments, votes and recovery.'],['holdem','♠','Strip Hold’em','Flop, turn, river and showdown.'],['draw','♥','Five-Card Draw','Two exchange rounds per hand.'],['one','✦','One-on-One','Private booth · one opponent · character-driven banter.'],['rps','✊','Rock–Paper–Scissors','Challenge a rival. Winner chooses the penalty.'],['mayhem','⚡','Mayhem','Target anyone directly — no cards or dice.']];
const backgroundFiles={'Nightclub':'Background_Nightclub.png','Strip Club':'Background_Strip_Club.png','Sleek Office':'Background_Sleek_Office.png','Market Square':'Background_Market_Square.png','London Eye':'Background_London_Eye.png','The White House':'Background_The_Whitehouse.png','Skyscraper Roof':'Background_Skyscraper_Roof.png','Park':'Background_Park.png','Field':'Background_Field.png','Tropical Beach':'Background_Tropical_Beach.png','Mars':'Background_Mars.png','Dungeon':'Background_Dungeon.png','Sex Shop':'Background_Sex_Shop.png','Theatre':'Background_Theatre.png','Haunted Church':'Background_Haunted_Church.png','Haunted Graveyard':'Background_Haunted_Graveyard.png','Enchanted Forest':'Background_Enchanted_Forest.png'};
const saveAll=()=>{try{localStorage.setItem(KEY,JSON.stringify({games:saves,selected,soloSelected,soloGender,human,playerName,gender,confidence,background,spectator,mode,memoryGender,memoryAvatar,memoryOpponents}))}catch(e){console.warn('Could not save game',e);toast('Browser storage is full; export your saves.')}};
let saves={};
let historyExpanded=false;
let soloSelected=null,soloGender='male',uiDrawer='',dialogueBrief=true;
let memoryGender='male',memoryAvatar='',memoryOpponents=[];

// Preferences live outside the existing saves: upgrading cannot reset a game.
const PREFKEY='sgc-browser-v11-preferences';
const SPEEDS=['off','slow','normal','fast'];
let aiSpeed='normal',autoTimer=null,autoToken=0,lastWheelSpinTime=0;
function loadPreferences(){try{const o=JSON.parse(localStorage.getItem(PREFKEY)||'{}');if(SPEEDS.includes(o.aiSpeed))aiSpeed=o.aiSpeed;}catch(err){console.warn('Preferences unavailable',err)}}
function savePreferences(){try{localStorage.setItem(PREFKEY,JSON.stringify({aiSpeed}));}catch(err){console.warn(err)}}
function setAiSpeed(speed){if(!SPEEDS.includes(speed))return;aiSpeed=speed;savePreferences();render();toast(aiSpeed==='off'?'Automatic AI turns paused':`Automatic AI turns: ${aiSpeed}.`);}
function cycleAiSpeed(){setAiSpeed(SPEEDS[(SPEEDS.indexOf(aiSpeed)+1)%SPEEDS.length]);}
const aiCaption=()=>aiSpeed==='off'?'AI: Manual':`AI: ${aiSpeed[0].toUpperCase()+aiSpeed.slice(1)}`;
function cancelAuto(){autoToken++;if(autoTimer!==null){clearTimeout(autoTimer);autoTimer=null;}}
// Only advance stages with no required human choice. A turn made by a human
// (choosing an opponent, card, garment or recovery) always stops automation.
function autoAction(g){
 if(!g||g.phase==='game_over')return null;
 const human=g.human;
 switch(g.mode){
  case 'dice':
   return g.phase==='apply'?'diceApply':null;
  case 'memory':
   if(g.phase==='choose_card'&&E.memoryCurrent(g)?.id!==human)return 'ai';
   if(g.phase==='card_revealed'&&g.pending?.chooser!==human)return 'memoryShowChoices';
   if(g.phase==='choose_penalty'&&g.pending?.chooser!==human)return 'aiChoose';
   if(g.phase==='apply')return 'memoryApply';
   if(g.phase==='memory_continue')return 'memoryNext';
   return null;
  case 'wheel':
   if(g.phase==='ready'&&E.wheelSpinner(g)?.id!==human)return 'spin';
   if(g.phase==='between_turns')return 'wheelNext';
   if(g.phase==='vote'&&E.wheelVoter(g)!==human)return 'ai';
   if(['choose_target','choose_target_layer','recover_choice'].includes(g.phase)&&E.wheelSpinner(g)?.id!==human)return 'ai';
   if(g.phase==='apply')return 'wheelApply';
   return null;
  case 'draw':
   if(g.phase==='draw'&&E.pokerActor(g)?.id!==human)return 'ai';
   if(g.phase==='showdown_penalty')return 'showdownPenalty';
   if(g.phase==='apply')return 'pokerApply';
   return null;
  case 'rps':
   if(g.phase==='rps_ready'&&E.rpsCurrent(g)?.id!==human)return 'rpsBegin';
   if(g.phase==='rps_ai_match')return 'rpsAi';
   if(g.phase==='rps_ai_penalty')return 'rpsAiPenalty';
   if(g.phase==='rps_apply')return 'rpsApply';
   if(g.phase==='rps_tie')return 'rpsReplay';
   if(g.phase==='rps_between')return 'rpsContinue';
   return null;
  case 'mayhem':
   if(g.phase==='mayhem_turn'&&E.mayhemCurrent(g)?.id!==human)return 'mayhemBegin';
   if(['mayhem_ai_target','mayhem_ai_penalty'].includes(g.phase))return 'mayhemAi';
   if(g.phase==='mayhem_preview'&&g.pending?.chooser!==human)return 'mayhemApply';
   if(g.phase==='mayhem_between')return 'mayhemContinue';
   return null;
  case 'holdem':
   if(['preflop','flop','turn','river'].includes(g.phase))return 'holdemNext';
   if(g.phase==='showdown_penalty')return 'showdownPenalty';
   if(g.phase==='apply')return 'pokerApply';
   return null;
 }
 return null;
}
function flowHint(g){
 if(g.phase==='game_over')return 'Finished · start another game from the menu';
 const act=autoAction(g);
 if(act&&aiSpeed!=='off')return act==='holdemNext'?'Automatic card reveal · watch the table':
    act==='spin'?'AI spinner · wheel turns automatically':'Automatic step · pause AI to control it manually';
 if(act&&aiSpeed==='off')return 'Manual AI mode · tap the next action';
 if(g.mode==='one')return 'Your private booth · choose a line or continue';
 if(g.mode==='dice')return g.phase==='choose_penalty'?'Your choice · select a clothing penalty':g.phase==='choose_loser'?'Your choice · select a tied-low player':'Ready · roll when you choose';
 if(g.mode==='memory')return g.phase==='choose_card'?'Your turn · reveal a Memory Card':g.phase==='choose_penalty'?'Your choice · choose a penalty':'Ready for the next step';
 if(g.mode==='wheel')return g.phase==='ready'?'Your turn · spin the wheel':g.phase==='vote'?'Your vote · select a layer':g.phase==='choose_target'?'Your turn · choose an opponent':'Your decision · choose the result';
 if(g.mode==='draw')return g.phase==='draw'?'Your hand · tap cards to exchange':'Deal again when ready';
 if(g.mode==='rps')return g.phase==='rps_move'?'Your move · choose Rock, Paper or Scissors':'A new challenge is approaching';
 if(g.mode==='mayhem')return g.phase==='mayhem_target'?'Your choice · select an opponent':g.phase==='mayhem_penalty'?'Your choice · select their penalty':'Mayhem · choose the next action';
 return 'Your turn · continue when ready';
}
function scheduleAuto(){
 cancelAuto();
 if(aiSpeed==='off'||view!=='game'||!game||document.hidden||document.getElementById('sceneViewer'))return;
 const action=autoAction(game);if(!action)return;
 const fingerprint=game;const token=autoToken;
 const delay={slow:1400,normal:760,fast:340}[aiSpeed]||760;
 const afterSpin=game.mode==='wheel'&&game.wheelIndex>=0&&game.phase!=='ready'?Math.max(0,2850-(Date.now()-lastWheelSpinTime)):0;
 // Slow enough to see newly revealed poker cards, even at Fast speed.
 const revealPause=game.mode==='memory'&&game.phase==='card_revealed'?{slow:4200,normal:3000,fast:2100}[aiSpeed]:0;
 const wait=Math.max(delay,afterSpin,revealPause,action==='holdemNext'?Math.max(delay,850):0);
 autoTimer=setTimeout(()=>{
  autoTimer=null;
  if(token!==autoToken||document.hidden||view!=='game'||game!==fingerprint||aiSpeed==='off'||document.getElementById('sceneViewer'))return;
  if(autoAction(game)!==action)return;
  gameAction(action,'',true);
 },wait);
}

function loadSaved(){try{const o=JSON.parse(localStorage.getItem(KEY)||'{}');saves=o.games||{};selected=o.selected||selected;if(Object.hasOwn(o,'soloSelected'))soloSelected=o.soloSelected;if(['male','female','neutral'].includes(o.soloGender))soloGender=o.soloGender;human=o.human||human;playerName=o.playerName||playerName;gender=o.gender||gender;confidence=o.confidence||confidence;background=o.background||background;spectator=!!o.spectator;mode=o.mode||mode;memoryGender=['male','female'].includes(o.memoryGender)?o.memoryGender:(['male','female'].includes(gender)?gender:'male');memoryAvatar=o.memoryAvatar||'';memoryOpponents=Array.isArray(o.memoryOpponents)?o.memoryOpponents:[];}catch(e){console.warn(e);}}
function toast(message){const t=$('toast');if(!t)return;t.textContent=message;t.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.hidden=true,4500);}
function openDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DIRDB,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('settings'))req.result.createObjectStore('settings')};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function dbHandle(action,h){const db=await openDb();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('settings',action==='save'?'readwrite':'readonly');const r=action==='save'?tx.objectStore('settings').put(h,HANDKEY):tx.objectStore('settings').get(HANDKEY);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}finally{db.close()}}
function cleanAssets(){for(const url of objects.values())URL.revokeObjectURL(url);objects.clear();loadedImgs.clear();sceneSprites.clear();}
async function connect(handle){let m=new Map();for await(const entry of handle.values())if(entry.kind==='file'&&/\.(png|webp|jpe?g)$/i.test(entry.name))m.set(entry.name.toLowerCase(),entry);
 folder=handle;assets=m;cleanAssets();folderInfo=`${handle.name}: ${m.size} image files`;render();toast(`Assets connected — ${m.size} images available.`);}
async function selectFolder(){try{const h=await window.showDirectoryPicker({id:'compendium-assets',mode:'read'});await dbHandle('save',h);await connect(h);}catch(err){if(err.name!=='AbortError')toast(`Folder error: ${err.message}`)}}
async function reconnect(){try{let h=folder||await dbHandle('load');if(!h){toast('No saved folder. Select Assets folder.');return;}let perm=await h.queryPermission({mode:'read'});if(perm!=='granted')perm=await h.requestPermission({mode:'read'});if(perm!=='granted')throw Error('Folder permission was not granted');await connect(h);}catch(err){toast(`Cannot reconnect: ${err.message}`)}}
// One flat phone Assets folder. Prefer the Compendium's own card art before
// presenting a clearly-marked text fallback; all matching is case-insensitive.
function findAsset(...candidates){
 for(const name of candidates){if(name&&assets.has(name.toLowerCase()))return assets.get(name.toLowerCase()).name;}
 return null;
}
function memoryBack(){return findAsset('strip_memory_card_back.png','memory_card_back.png','MemoryCard_Back.png','compendium_memory_back.png','card_back.png','compendium_card_back.png','PlayingCard_Back.png');}
function pokerBack(){return findAsset('playing_card_back.png','compendium_card_back.png','card_back.png','Card_Back.png','cards_back.png','strip_memory_card_back.png');}
function memoryFace(asset){return findAsset('MemoryCard_'+asset+'.png','memory_card_'+asset+'.png',asset+'_MemoryCard.png',asset+'_card.png',asset+'.png');}
const has=n=>assets.has(n.toLowerCase());
async function urlFor(filename){let key=filename.toLowerCase();if(objects.has(key))return objects.get(key);const h=assets.get(key);if(!h)return null;const f=await h.getFile(),url=URL.createObjectURL(f);objects.set(key,url);return url;}
async function imgFor(filename){const key=filename.toLowerCase();if(loadedImgs.has(key))return loadedImgs.get(key);const url=await urlFor(filename);if(!url)return null;let image=new Image();image.src=url;try{await image.decode();loadedImgs.set(key,image);return image;}catch(_e){return null;}}
function filename(asset,state='TJBP'){return `${asset}_${state}.png`}
function header(){return `<header class="top"><div class="brand" data-nav="menu"><img class="compendium-header-logo" src="./header_logo.png" alt="Strip Games Compendium logo"><div class="brand-subtitle">THE PRIVATE CLUB <small>Browser Edition</small></div></div><div class="top-actions"><span class="pill">v1.3.1</span><button class="small-btn" data-action="folder">${folder?'📁 '+assets.size:'📁 Assets'}</button></div></header>`;}
function frame(content){$('app').innerHTML=`${header()}<main class="main">${content}</main>`;}
function menu(){const tiles=menuModes.map(([id,ico,title,descr])=>`<button class="menu-tile" data-open="${id}"><span class="menu-icon">${ico}</span><span class="menu-title">${esc(title)}</span><span class="menu-description">${esc(descr)}</span><span class="menu-resume">${saves[id]?'RESUME OR NEW GAME':'CHOOSE PLAYERS'}</span></button>`).join('');
 frame(`<section class="menu"><div class="menu-heading"><span class="eyebrow">OFFLINE • EIGHT GAMES • ${roster.length} CHARACTERS</span><h1>Choose your game</h1><p>Entirely on your phone. All artwork stays in your own separate Assets folder.</p></div><div class="menu-tiles">${tiles}</div><div class="menu-bottom"><span>${folder?'✓ '+esc(folderInfo):'⚠ Connect your separate Assets folder to display portraits'}</span><button class="small-btn" data-nav="settings">Assets &amp; saves</button></div></section>`);}
function settingsView(){frame(`<div class="settings panel"><h1>Assets &amp; saved games</h1><p>Artwork is loaded only from one selected folder on this device. The website never uploads it.</p><div class="button-row"><button data-action="folder" class="primary">Select Assets folder</button><button data-action="reconnect">Reconnect saved folder</button></div><p class="muted">${folder?esc(folderInfo):'No folder currently connected'}</p><div class="button-row"><button data-action="export">Export saved games</button><label class="file-btn">Import saved games<input id="import" type="file" accept="application/json,.json" hidden></label></div><p class="muted">Saves belong to this browser's local storage. Export a backup before clearing Chrome data or moving phones.</p><div class="settings-subhead">Mobile play preferences</div><label>Automatic opponent turns<select id="aiSpeed">${SPEEDS.map(s=>`<option value="${s}" ${aiSpeed===s?'selected':''}>${s==='off'?'Manual':s[0].toUpperCase()+s.slice(1)}</option>`).join('')}</select></label><p class="muted">Automatic turns stop at decisions you must make. Tap the AI button during a game to switch speed or pause. Your unfinished games are saved as before.</p><div class="settings-subhead">Home screen installation</div><p class="muted">In Chrome, open the ⋮ menu and choose Install app or Add to Home screen. Launching from its icon normally removes Chrome's address bar. The game also has its existing double-tap full-screen mode.</p><button data-nav="menu">← Back to games</button></div>`);}
const bgSelect=()=>Object.keys(backgroundFiles).map(n=>`<option ${background===n?'selected':''}>${esc(n)}</option>`).join('');

function randomAvatar(exclude=''){
 const pool=roster.filter(c=>c.gender===memoryGender&&c.asset_name!==exclude);
 if(!pool.length)throw Error('No characters match the selected player gender.');
 return pool[Math.floor(Math.random()*pool.length)].asset_name;
}
function randomMemoryOpponents(){
 const choices=roster.map(c=>c.asset_name).filter(n=>n!==memoryAvatar);
 for(let i=choices.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]];}
 memoryOpponents=choices.slice(0,4);
}
function ensureMemoryLineup(){
 const c=roster.find(c=>c.asset_name===memoryAvatar);
 if(!c||c.gender!==memoryGender)memoryAvatar=randomAvatar();
 memoryOpponents=[...new Set(memoryOpponents)].filter(n=>n!==memoryAvatar&&roster.some(c=>c.asset_name===n)).slice(0,4);
 if(memoryOpponents.length!==4)randomMemoryOpponents();
}
function memorySetupView(){
 ensureMemoryLineup();
 frame(`<div class="setup memory-setup"><div class="setup-top"><button class="small-btn" data-nav="menu">← Menu</button><div><span class="eyebrow">STRIP MEMORY · FIVE PLAYERS</span><h1>Your character and four AI opponents</h1></div>${saves.memory?'<button class="small-btn" data-action="resume">Resume</button>':''}</div>
 <section class="setup-options panel memory-setup-options"><div class="memory-identity"><label>Your gender <select id="memoryGender"><option value="male" ${memoryGender==='male'?'selected':''}>Male</option><option value="female" ${memoryGender==='female'?'selected':''}>Female</option></select></label><div class="memory-avatar-preview"><span class="memory-avatar-pic">${has(filename(memoryAvatar))?`<img data-asset="${esc(filename(memoryAvatar))}" alt="Your randomly assigned character">`:''}</span><span><strong>You play as ${esc(display(memoryAvatar))}</strong><small>Randomly selected ${memoryGender} character, using their actual artwork and clothing states</small></span></div><button class="small-btn" data-action="randomMemoryAvatar">↻ New avatar</button></div><div class="memory-ai-setup"><span>Four AI opponents: ${memoryOpponents.map(display).map(esc).join(' · ')}</span><button class="small-btn" data-action="randomMemoryOpponents">↻ Randomise opponents</button></div><label class="memory-background-label">Scene <select id="background">${bgSelect()}</select></label></section>
 <section class="roster-panel panel"><div class="roster-heading"><div class="section-title">CHOOSE FOUR AI OPPONENTS <span>${memoryOpponents.length}/4</span></div><input id="search" placeholder="Search roster…" value="${esc(search)}" aria-label="Search characters"></div><div id="rosterHere">${rosterGrid()}</div></section><div class="setup-bottom"><span>You: ${esc(display(memoryAvatar))} · Four AI opponents</span><button class="primary" data-action="start" ${memoryOpponents.length!==4?'disabled':''}>Start five-player Memory</button></div></div>`);
 fillAssets();
}

function rosterGrid(){const sorted=[...roster].sort((a,b)=>(a.full_name||a.asset_name).localeCompare((b.full_name||b.asset_name),'en',{sensitivity:'base'}));const visible=search?sorted.filter(x=>`${x.full_name} ${x.asset_name} ${x.occupation}`.toLowerCase().includes(search.toLowerCase())):sorted.slice(rosterTab*25,rosterTab*25+25);const max=mode==='one'?1:mode==='memory'?4:spectator?5:4;const picked=mode==='one'?(soloSelected?[soloSelected]:[]):mode==='memory'?memoryOpponents:selected;return `<div class="tabs">${[0,1,2].map(i=>`<button class="tab ${rosterTab===i&&!search?'active':''}" data-tab="${i}">${i*25+1}–${Math.min((i+1)*25,roster.length)}</button>`).join('')}</div><div class="roster-viewport"><div class="portrait-grid">${visible.map(c=>`<button class="portrait ${picked.includes(c.asset_name)?'picked':''}" data-pick="${esc(c.asset_name)}" ${mode==='memory'&&c.asset_name===memoryAvatar?'disabled':mode!=='one'&&!picked.includes(c.asset_name)&&picked.length>=max?'disabled':''}><span class="pic"><span class="initial">${esc(c.asset_name.slice(0,2))}</span>${has(filename(c.asset_name))?`<img data-asset="${esc(filename(c.asset_name))}" loading="lazy" alt="">`:''}</span><span class="portrait-name">${esc(c.full_name||c.asset_name)}</span>${picked.includes(c.asset_name)?'<span class="tick">✓</span>':''}</button>`).join('')}</div></div>`;}
function setupView(){if(mode==='memory'){memorySetupView();return;}if(mode==='one'){frame(`<div class="setup solo-setup"><div class="setup-top"><button class="small-btn" data-nav="menu">← Menu</button><div><span class="eyebrow">ONE-ON-ONE · PRIVATE BOOTH</span><h1>Choose one character</h1></div>${saves.one?'<button class="small-btn" data-action="resume">Resume</button>':''}</div><section class="roster-panel panel"><div class="roster-heading"><div class="section-title">${roster.length} CHARACTERS · TAP TO SELECT OR CHANGE</div><input id="search" placeholder="Search roster…" value="${esc(search)}" aria-label="Search characters"></div><div id="rosterHere">${rosterGrid()}</div></section><div class="setup-bottom"><label class="solo-visitor-gender">Your gender <select id="soloGender" aria-label="Your gender for private-booth dialogue"><option value="male" ${soloGender==='male'?'selected':''}>Male</option><option value="female" ${soloGender==='female'?'selected':''}>Female</option><option value="neutral" ${soloGender==='neutral'?'selected':''}>Other / neutral</option></select></label><span>Private booth · ${soloSelected?esc(display(soloSelected)):'No character selected'} · <strong>${has('booth.png')?'Booth ready':'booth.png needed'}</strong></span><button class="primary" data-action="start" ${!soloSelected?'disabled':''}>Enter private booth</button></div></div>`);fillAssets();return;}const isMemory=mode==='memory';const max=spectator?5:4;
 frame(`<div class="setup"><div class="setup-top"><button class="small-btn" data-nav="menu">← Menu</button><div><span class="eyebrow">${esc(E.MODES[mode])} • New game</span><h1>Choose your opponents</h1></div>${saves[mode]?`<button class="small-btn" data-action="resume">Resume saved game</button>`:''}</div><section class="setup-options panel"><div class="two-cols">${isMemory?`<label>You're playing as<select id="human">${selected.map(n=>`<option value="${esc(n)}" ${n===human?'selected':''}>${esc(display(n))}</option>`).join('')}</select></label>`:`<label>Mode<select id="spectator"><option value="false" ${!spectator?'selected':''}>Play</option><option value="true" ${spectator?'selected':''}>Spectator</option></select></label>`}<label>Scene<select id="background">${bgSelect()}</select></label></div>${!isMemory&&!spectator?`<div class="three-cols"><label>Your name<input id="playerName" maxlength="35" value="${esc(playerName)}"></label><label>Avatar gender<select id="gender"><option value="male" ${gender==='male'?'selected':''}>Male</option><option value="female" ${gender==='female'?'selected':''}>Female</option><option value="neutral" ${gender==='neutral'?'selected':''}>Neutral</option></select></label><label>Confidence<select id="confidence">${[1,2,3,4,5].map(i=>`<option value="${i}" ${i===confidence?'selected':''}>${i} / 5</option>`).join('')}</select></label></div>`:''}</section><section class="roster-panel panel"><div class="roster-heading"><div class="section-title">SELECT CHARACTERS <span>${selected.length} / ${max}</span></div><input id="search" placeholder="Search roster…" value="${esc(search)}" aria-label="Search characters"></div><div id="rosterHere">${rosterGrid()}</div></section><div class="setup-bottom"><span>${selected.map(display).join(' • ')||'Select characters'}</span><button class="primary" data-action="start" ${selected.length<2?'disabled':''}>Start ${esc(E.MODES[mode])}</button></div></div>`);fillAssets();}
function actorName(id){return game?.people.find(p=>p.id===id)?.name||id||'';}
function dialogueText(event,actor=game?.highlight,vars={}){let p=game?.people.find(x=>x.id===actor);if(!p||p.id==='__user__')return '';
 let bank=packs[game.mode],list=null;
 if(game.mode==='memory'){const family=bank?.styleFamilies?.[bank.characterStyles?.[p.asset]||'wry']||'wry';list=bank?.families?.[family]?.[event]||bank?.families?.[family]?.turn;}
 else if(game.mode==='rps'){const entry=bank?.rps_dialogue?.characters?.[p.asset]||bank?.rps_dialogue?.global;list=entry?.[event]||bank?.rps_dialogue?.global?.[event];}
 else if(game.mode==='mayhem'){const entry=bank?.characters?.find(x=>x.asset_name===p.asset);list=entry?.dialogue?.[event]||bank?.player_voices?.[event];}
 else if(game.mode==='draw'){let profile=bank?.characters?.find(x=>x.asset_name===p.asset);list=profile?.dialogue?.[event];}
 else{list=bank?.characters?.[p.asset]?.events?.[event]||bank?.global_pools?.[event];}
 let line=Array.isArray(list)?list[Math.floor(Math.random()*list.length)]:list;if(typeof line!=='string')return '';
 const pairs={name:p.name,loser:actorName(game?.pending?.loser),target:actorName(game?.pending?.loser),winner:actorName(game?.pending?.chooser),garment:game?.pending?.item||'',total:game?.rolls?.find(r=>r.id===p.id)?.total||'',...vars};return line.replace(/\{([a-z_]+)\}/gi,(full,k)=>pairs[k]===undefined?'':String(pairs[k]));}

// Personality-led banter; stage-specific responses always come from each of
// the current character profiles. The other lines vary by confidence,
// role, conversation type, and recent utterances to avoid mechanical repeats.

// One-on-One: gender is a visitor preference stored in the individual game save.
// The speaker's roster gender is kept separate. This matrix changes the
// flavour, never whether a particular garment/action is legal.
const oneGenderPools={
 'female:male':{
  tease:["You naughty boy. You look rather pleased with yourself.","Such a cheeky boy! You haven't even tried to hide that grin.","Oh, you're enjoying getting to call the shots, aren't you?"],
  compliment:["Well, aren't you a charming gentleman tonight?","Thank you. I suspect there's a mischievous boy behind those manners.","Sweet talk, then? You're quite good at that."],
  challenge:["Confident, are we? We'll see about that, naughty boy.","You gentlemen do like a challenge. Very well.","You set a high bar. I intend to meet it."]},
 'male:male':{
  tease:["Another bloke asking for a private show? That's a bit unusual, mate.","This is a weird situation for two blokes to end up in, isn't it?","I wasn't expecting a chap like you to be directing the proceedings!"],
  compliment:["Cheers, mate. That's a surprisingly nice thing to hear.","I won't lie, this is an unusual setup for me—but I appreciate the compliment.","You know, I never pictured a bloke cheering me on in a booth."],
  challenge:["A challenge from another bloke? All right, let's make it sporting.","Still an odd situation, mate, but I'm not backing down now.","This is not how I imagined my evening going. Challenge accepted!"]},
 'female:female':{
  tease:["You naughty girl! At least you know exactly how cheeky you're being.","Two women having this much fun? Someone should probably keep score.","You're a cheeky one. I rather like your confidence."],
  compliment:["Coming from another woman, that means rather a lot.","Thank you, lovely. You have an eye for the details.","Oh, now you're making me blush. I thought we were meant to be teasing!"],
  challenge:["Girls' night suddenly got competitive, didn't it?","All right, let's see which of us has the stronger nerve.","You're being very bold tonight. I can match that."]},
 'male:female':{
  tease:["You really are enjoying winding me up, aren't you?","A lady with a wicked sense of humour. I should have known.","I see you're quite happy to keep me on my toes."],
  compliment:["Thank you. I'll attempt to be worthy of the compliment.","You certainly know how to make a man feel appreciated.","Flattery from you? That's difficult to argue with."],
  challenge:["You're calling the shots, then? I can respect that.","I don't intend to lose my nerve just because you're watching.","All right. Let's see if I can rise to your challenge."]},
 'default':{
  tease:["You have a mischievous streak, don't you?","You're enjoying this conversation a little too much!","Careful. I might start teasing you back."],
  compliment:["Thank you. That was genuinely kind.","You do know how to make a compliment land.","That's rather flattering. I'll remember it."],
  challenge:["That's a bold challenge. I accept.","You won't make me give in quite so easily.","Let's find out who has the steadier nerve."]}
};
const oneChoice=arr=>arr[Math.floor(Math.random()*arr.length)];
function oneGenderLine(g,style){
 const p=g.people[0],key=`${p.gender||'female'}:${g.settings?.visitorGender||'male'}`;
 return oneChoice((oneGenderPools[key]||oneGenderPools.default)[style]||oneGenderPools.default.tease);
}
// Distinguish T -> B (ending in JP), J -> P (ending in TB), and
// normal outer-clothing progression towards BP. They are *different* routes.
const oneRemovalPools={
 firstT:["The {upper} first? I see you're not wasting time tonight.","Starting with my {upper}, are we? You're full of surprises.","{Upper} before {lower}? Interesting choice. Let's see where you're going with this."],
 firstJ:["{Lower} first? Well, that changes the mood rather quickly.","You went for the {lower}? Not the choice I expected!","Starting with my {lower}? You really do enjoy keeping me guessing."],
 braBeforeJeans:["The bra before the {lower}? Now that's a rather unexpected order.","You've left the {lower} on and gone for my bra? How inventive.","So we're going {upper}, then bra, and leaving the {lower} for later? Very cheeky."],
 underwearBeforeTop:["Underwear before the {upper}? Well, you do like doing things differently!","{Lower} then underwear, with the {upper} still on? That's a bold order.","You're keeping my {upper} on and changing everything else? Interesting tactics."],
 reachBP:["Both outer layers gone now. You've left me with quite a decision.","So we're down to bra and underwear. I see your plan.","Right, the {upper} and {lower} are both gone. What next, then?"],
 removeB:["The bra next? I knew that cheeky grin meant something.","So that's the bra. You really are directing this confidently.","Well, that's another choice made. You're enjoying this, aren't you?"],
 removeP:["Underwear next? You haven't lost your nerve, I see.","That's a cheeky choice. I hope you're pleased with yourself!","Well, we're certainly not following a conventional order now."],
 finishClothes:["And that's the last garment. You haven't missed a step.","There we are. Every choice accounted for. Happy now?","Well, that is quite a finale to your little wardrobe strategy."],
 pose:["Another pose? You certainly don't do things by halves.","You want to keep the scene going? I thought you might.","A fresh pose, then. You really are an exacting audience."]
};
function oneRemovalLine(g,item,after){
 const p=g.people[0],c=roster.find(x=>x.asset_name===p.asset)||{};
 const countBefore=p.items.length;
 let type=item==='Naked'?'pose':countBefore===1?'finishClothes':item==='T'&&countBefore===4?'firstT':item==='J'&&countBefore===4?'firstJ':after==='JP'?'braBeforeJeans':after==='TB'?'underwearBeforeTop':after==='BP'?'reachBP':item==='B'?'removeB':item==='P'?'removeP':'reachBP';
 let line=oneChoice(oneRemovalPools[type]);
 const lower=c.clothing?.J||'lower garment',upper=c.clothing?.T||'top';
 line=line.replaceAll('{lower}',lower).replaceAll('{Lower}',lower.charAt(0).toUpperCase()+lower.slice(1)).replaceAll('{upper}',upper).replaceAll('{Upper}',upper.charAt(0).toUpperCase()+upper.slice(1));
 // In selected moments, the opponent addresses the *actual* visitor gender.
 // Other moments remain grounded in their established character-stage bank.
 const genderKey=`${p.gender||'female'}:${g.settings?.visitorGender||'male'}`;
 if((g.one?.order?.length||0)===0||type==='braBeforeJeans'||type==='underwearBeforeTop'||type==='finishClothes'){
  const gender=oneChoice(oneGenderPools[genderKey]?.tease||oneGenderPools.default.tease);
  line=`${line} ${gender}`;
 }
 const flavour=c.stage_dialogue?.[after];
 // Never override a path-aware line with a generic BP-only reaction.
 if(flavour&&type!=='braBeforeJeans'&&type!=='underwearBeforeTop'&&flavour.length<160&&Math.random()<0.45)line+=` ${flavour}`;
 return line;
}

function oneBanter(style){
 const g=game,p=g.people[0],c=roster.find(x=>x.asset_name===p.asset)||{};
 const name=c.full_name||p.name,job=c.occupation||'your particular line of work';
 const confident=(+c.confidence_level||3)>=4;
 const direct={
  Ahsoka:{tease:['Careful. I can sense that grin from across the booth.','You think a Jedi will be so easily distracted? Interesting strategy.'],compliment:['Kind words can be useful. So can a clear mind.','I appreciate the compliment. Now try keeping a straight face.'],challenge:['I have faced much tougher challenges. But I am listening.','Confident, are we? Very well. Let us see who blinks first.']},
  Jasmine:{tease:['A cheeky comment? You know I have escaped far stricter company than yours.','Careful. A princess is perfectly capable of teasing back.','That grin is almost as bold as your last decision.'],compliment:['That was unexpectedly charming. You have better manners than half the palace.','Flattery is pleasant, but freedom to choose matters more to me.','A lovely compliment. I might even admit I enjoyed it.'],challenge:['You want a challenge? Excellent. I have never been fond of easy victories.','I did not sneak out of a palace to be told I cannot do something.','Go on, then. Surprise me. I love proving doubters wrong.']},
  Smurfette:{tease:['Oooh, cheeky. You are enjoying trying to make me blush, aren\'t you?','That sounded mischievous... I approve, but only a little.','Careful now. I can tease back, you know.'],compliment:['Aw, that was sweet. You do know how to make a girl smile.','That was lovely. I might start enjoying this conversation too much.','You are being charming now. That is dangerous.'],challenge:['A challenge? All right, but do not look so smug if I surprise you.','You like pushing your luck, don\'t you? Fine. Let\'s see how brave you are.','Heehee... now that does sound interesting. Go on then.']},
  Jack:{tease:['A mischievous guest! You have come to the right haunt.','Boo! I was saving that line for a more dramatic entrance.'],compliment:['Flattery? My lantern is glowing brighter already.','Careful, or I might make you my official Halloween publicist.'],challenge:['You dare challenge the pumpkin king? Delightful!','Oh, now this is turning into a proper ghost story.']},
  Susie:{tease:['You are enjoying yourself far too much. I can tell.','You are skating on thin ice. Fortunately, I like a challenge.'],compliment:['Flattery is cheaper than good Scotch, but I will allow it.','That was surprisingly well judged. Keep going.'],challenge:['I have negotiated tougher deals than this.','You can make your case. Whether I agree is another matter.']}
 };
 const pool=direct[p.asset]?.[style]||{
  tease:confident?[`You have a bold sense of humour. I will give you that.`,`I can see where this conversation is going. Very cheeky.`,`You are enjoying this a little too much, aren't you?`,`If that was meant to unsettle me, you will need better material.`,`Very amusing. I was hoping you would be a little more original.`]:[`Oh! I wasn't expecting you to put it like that.`,`You are going to make me blush if you carry on.`,`That is rather cheeky. I cannot decide whether to laugh.`,`I thought this was going to be a quiet conversation!`,`Please tell me you have a better line than that.`],
  compliment:confident?[`Now that is a compliment delivered with confidence.`,`I appreciate a guest with good taste.`,`You have a way with words. I shall remember that.`,`Thank you. I do enjoy someone who notices the details.`]:[`That is kind of you to say.`,`Oh, thank you. I did not quite expect that.`,`Now you've caught me off guard, in a good way.`,`You are making this sound rather flattering.`],
  challenge:confident?[`You want to test my nerve? Very well.`,`I never back down from a good challenge.`,`I can see a competitive streak in you. I respect that.`,`I hope your confidence is justified.`]:[`That sounds like a challenge. I suppose I should accept.`,`I am nervous, but not quite ready to surrender.`,`All right. Let us see how this goes.`,`You certainly know how to raise the stakes.`]
 }[style];
 const history=g.one?.lastLines||[];
 let options=pool.filter(line=>!history.includes(line));if(!options.length)options=pool;
 let line=options[Math.floor(Math.random()*options.length)];
 // Alternate personality-led lines with gender-appropriate address.
 // Keep specially scripted characters recognizable rather than rewriting their voice.
 if((g.one.talks+1)%2===0)line=oneGenderLine(g,style);
 // Profile hooks add individual character context without replacing their voice.
 if((g.one.talks+1)%4===0&&c.favourite_drink)line+=` I could do with ${c.favourite_drink.toLowerCase()} right about now.`;
 else if((g.one.talks+1)%5===0&&job)line+=` Being ${job.toLowerCase()} did not prepare me for quite this conversation.`;
 g.one.lastLines=[...history.slice(-3),line];return line;
}
function oneActions(){const g=game,p=g.people[0],profile=roster.find(c=>c.asset_name===p.asset),st=E.stateOf(p);
 const legal=E.allowed(p);
 const garmentButtons=legal.map(item=>{
  const name=profile?.clothing?.[item]||item;
  const label=item==='Naked'?'Continue to next pose':`Remove · ${name}`;
  return `<button class="${item==='Naked'?'primary one-advance':'solo-remove'}" data-go="oneRemove" data-value="${esc(item)}">${esc(label)}</button>`;
 }).join('');
 return `<div class="one-prompt">${esc(p.name)} · <strong>${esc(st)}</strong> · ${Math.min(9,g.round)} / 9 stages</div><div class="one-choices"><button data-go="oneTalk" data-value="tease">😉 Tease</button><button data-go="oneTalk" data-value="compliment">✦ Compliment</button><button data-go="oneTalk" data-value="challenge">⚡ Challenge</button></div><div class="one-removal-label">${legal.includes('Naked')?'Continue when you are ready':'Choose which item to remove next'}</div><div class="one-removal-options">${garmentButtons}</div>`;
}
function actionBtn(label,action,value='',style=''){return `<button class="${style}" data-go="${action}" data-value="${esc(value)}">${esc(label)}</button>`;}
function choosePenaltyButtons(){const p=game.people.find(x=>x.id===game.pending?.loser);return p?E.allowed(p).map(k=>actionBtn(k==='Naked'?'Next pose':(roster.find(c=>c.asset_name===p.asset)?.clothing?.[k]||k),'pick',k)).join(''):'';}
function memoryRevealPanel(g,large=false){
 const chooser=g.people.find(p=>p.id===g.pending?.chooser),target=g.people.find(p=>p.id===g.pending?.loser);
 if(!chooser||!target)return '<p class="guide">No card is currently revealed.</p>';
 const file=memoryFace(target.asset),aiTurn=chooser.id!==g.human;
 const card=file?`<img data-asset="${esc(file)}" alt="${esc(target.name)}'s revealed Memory Card">`:`<div class="missing-memory-face"><strong>${esc(target.name)}</strong><small>Memory Card image missing: MemoryCard_${esc(target.asset)}.png</small></div>`;
 return `<div class="memory-reveal-stage ${large?'large-reveal':''}"><div class="memory-reveal-heading"><span class="eyebrow">${aiTurn?'AI TURN':'YOUR TURN'} · CARD ${g.pending.slot+1}</span><strong>${esc(chooser.name)} revealed ${esc(target.name)}!</strong><small>${chooser.id===target.id?'Their own card was picked':`Card drawn by ${esc(chooser.name)}`}</small></div><div class="memory-reveal-art">${card}</div>${large?`<div class="memory-reveal-continue">${actionBtn(aiTurn?'Continue to AI penalty':'Continue — choose a penalty','memoryShowChoices','','primary')}</div>`:''}</div>`;
}
function memoryRevealOverlay(){return game?.mode==='memory'&&game.phase==='card_revealed'?`<div class="memory-reveal-overlay" role="dialog" aria-label="Revealed Memory Card">${memoryRevealPanel(game,true)}</div>`:'';}
const playMemory=()=>{const g=game;let html='';
 if(g.phase==='choose_card'){
  const actor=E.memoryCurrent(g),userTurn=actor.id===g.human,back=memoryBack();
  html=`<p class="guide memory-turn-title">${userTurn?'YOUR TURN':`AI TURN · ${esc(actor.name)}`} — ${userTurn?'choose a face-down card':`${esc(actor.name)} is choosing a card`}</p><div class="memory-deck">${g.deck.map((_,i)=>`<button class="memory-card" data-go="flip" data-value="${i}" ${!userTurn?'disabled':''}>${back?`<img data-asset="${esc(back)}" alt="Compendium Memory Card back">`:'<span class="missing-card-art">Memory Card back missing</span>'}<small>Card ${i+1}</small></button>`).join('')}</div>`;
  if(!userTurn)html+=actionBtn(`Reveal ${esc(actor.name)}'s card`,'ai','','primary');
 }else if(g.phase==='card_revealed'){
  html='<p class="guide">The revealed card is being displayed. The clothing decisions appear only after continuing.</p>';
 }else if(g.phase==='choose_penalty'){
  const target=g.people.find(p=>p.id===g.pending.loser),actor=g.people.find(p=>p.id===g.pending.chooser);
  const file=memoryFace(target.asset);
  html=`<div class="memory-choice-heading"><strong>${esc(actor.name)} picks the penalty for ${esc(target.name)}</strong><small>Revealed card: ${esc(target.name)}</small></div>${file?`<div class="memory-choice-thumb"><img data-asset="${esc(file)}" alt="${esc(target.name)}'s Memory Card"></div>`:''}<div class="memory-penalties">${actor.id===g.human?choosePenaltyButtons():actionBtn(`Let ${esc(actor.name)} choose the penalty`,'aiChoose','','primary')}</div>`;
 }else if(g.phase==='apply')html=`<p class="guide">${esc(g.people.find(p=>p.id===g.pending?.chooser)?.name||'Player')} chose a penalty for ${esc(g.people.find(p=>p.id===g.pending?.loser)?.name||'the revealed character')}.</p>`+actionBtn('Apply selected penalty','memoryApply','','primary');
 else if(g.phase==='memory_continue')html=actionBtn('Next player’s turn','memoryNext','','primary');
 return html;
};
function wheelDisc(){const labels=E.WHEEL_SEGMENTS.map((x,i)=>`<span class="wheel-word" style="transform:rotate(${i*22.5+11.25}deg) translateY(-76px) rotate(90deg)">${esc(E.WHEEL_LABEL[x])}</span>`).join('');return `<div class="wheel-assembly"><div class="wheel-pointer">▼</div><div class="wheel-disc" id="wheelDisc">${labels}</div></div>`;}
function wheelActions(){const g=game,spinner=E.wheelSpinner(g);let html=`<div class="wheel-result">${g.wheelIndex>=0?'RESULT: '+esc(E.WHEEL_LABEL[g.segment]||g.segment):'SPIN THE WHEEL'}</div>`+wheelDisc();let buttons='';
 if(g.phase==='ready')buttons=actionBtn(`Spin for ${spinner.name}`,'spin','','primary');
 else if(g.phase==='between_turns')buttons=actionBtn('Next spinner','wheelNext','','primary');
 else if(g.phase==='vote'){const voter=E.wheelVoter(g),target=g.people.find(p=>p.id===g.pending.loser);html+=`<p class="guide">${esc(actorName(voter))} votes on ${esc(target.name)}'s next removal. Vote ${g.voteIndex+1} of ${g.voteOrder.length}.</p>`;buttons=voter===g.human?E.allowed(target).map(k=>actionBtn(k==='Naked'?'Next pose':k,'vote',k)).join(''):actionBtn(`AI vote: ${actorName(voter)}`,'ai','','primary');}
 else if(g.phase==='choose_target'){buttons=spinner.id===g.human?g.people.filter(p=>!p.eliminated&&p.id!==spinner.id).map(p=>actionBtn(p.name,'target',p.id)).join(''):actionBtn('AI chooses target','ai','','primary');}
 else if(g.phase==='choose_target_layer')buttons=spinner.id===g.human?E.allowed(g.people.find(p=>p.id===g.pending.loser)).map(k=>actionBtn(k==='Naked'?'Next pose':k,'layer',k)).join(''):actionBtn('AI chooses layer','ai','','primary');
 else if(g.phase==='recover_choice')buttons=spinner.id===g.human?E.recoveries(spinner).map(k=>actionBtn(k==='__POSE_BACK__'?'Recover previous pose':k,'recover',k)).join(''):actionBtn('AI recovers','ai','','primary');
 else if(g.phase==='apply')buttons=actionBtn('Apply wheel result','wheelApply','','primary');
 return html+`<div class="action-row">${buttons}</div>`;}
function cardArt(c){if(!c){const back=pokerBack();return `<span class="card back">${back?`<img data-asset="${esc(back)}" alt="Compendium playing card back">`:'<small class="missing-card-art">Missing card_back.png</small>'}</span>`;}const rankName= c.r===14?'ace':c.r===13?'king':c.r===12?'queen':c.r===11?'jack':String(c.r),suit=['spades','hearts','diamonds','clubs'][c.s];const file=findAsset(`${rankName}_of_${suit}${c.r>=11&&c.r<=13?'2':''}.png`,`${rankName}_of_${suit}.png`,`PlayingCard_${rankName}_${suit}.png`);
 return `<span class="card ${c.s===1||c.s===2?'red':''}"><span class="card-label">${esc(E.cardLabel(c))}</span>${file?`<img data-asset="${esc(file)}" alt="" loading="lazy">`:''}</span>`;}
function drawActions(){const g=game;let html=`<div class="hand-caption">Hand ${g.handNum} · Draw round ${g.drawRound} / 2 · ${esc(g.phase==='draw'?E.pokerActor(g).name+' to exchange':'Showdown')}</div>`;
 if(g.phase==='draw'){
  const actor=E.pokerActor(g),isHuman=!!g.human&&actor.id===g.human;
  html+=isHuman?`<p class="guide">Your hand — tap cards to exchange.</p>`:`<p class="guide">${esc(actor.name)} is exchanging cards. Opponents' hands remain face-down until showdown.</p>`;
  html+=`<div class="playing-row">${actor.hand.map((c,i)=>isHuman?`<button class="select-card ${discard.has(i)?'discarded':''}" data-discard="${i}" aria-label="${discard.has(i)?'Exchange':'Keep'} ${esc(E.cardLabel(c))}">${cardArt(c)}<small>${discard.has(i)?'EXCHANGE':'KEEP'}</small></button>`:`<span class="select-card ai-card">${cardArt(null)}<small>HIDDEN</small></span>`).join('')}</div>`;
  html+=isHuman?actionBtn(`Exchange ${discard.size} selected / Stand pat`,'exchange','','primary'):actionBtn(`Play ${actor.name}'s exchange`,'ai','','primary');
 }else{
  html+=`<div class="showdown-rows poker-showdown">${g.showdown.map(s=>{
   const p=g.people.find(p=>p.id===s.id);
   return `<div class="showdown-hand"><div class="showdown-title">${esc(s.name)}: <strong>${esc(s.rank.label)}</strong></div><div class="playing-row showdown-cards">${(p?.hand||[]).map(cardArt).join('')}</div></div>`;
  }).join('')}</div>`+pokerButtons();
 }return html;}
function holdemActions(){const g=game;let html=`<div class="hand-caption">Hand ${g.handNum} · ${esc(g.phase==='preflop'?'Pre-flop':g.phase)}</div><div class="playing-row board">${g.board.map((c,i)=>i<g.revealed?cardArt(c):cardArt(null)).join('')}</div>`;
 const user=g.people.find(p=>p.id===g.human);if(user)html+=`<div class="hand-caption">Your cards</div><div class="playing-row hole">${user.hand.map(cardArt).join('')}</div>`;
 if(g.phase==='preflop')html+=actionBtn('Reveal flop','holdemNext','','primary');else if(g.phase==='flop')html+=actionBtn('Reveal turn','holdemNext','','primary');else if(g.phase==='turn')html+=actionBtn('Reveal river','holdemNext','','primary');else if(g.phase==='river')html+=actionBtn('Showdown','holdemNext','','primary');else html+=`<div class="showdown-rows">${g.showdown.map(s=>`<span>${esc(s.name)}: <strong>${esc(s.rank.label)}</strong></span>`).join('')}</div>`+pokerButtons();return html;}
function pokerButtons(){const g=game;if(g.phase==='showdown_penalty')return actionBtn('Resolve showdown penalty','showdownPenalty','','primary');if(g.phase==='choose_penalty')return choosePenaltyButtons();if(g.phase==='apply')return actionBtn('Apply clothing penalty','pokerApply','','primary');if(g.phase==='between_hands')return actionBtn('Deal next hand','nextHand','','primary');return '';}
function dieImage(num){const file=has('Dice_'+num+'.png')?'Dice_'+num+'.png':has('die_'+num+'.png')?'die_'+num+'.png':null;return file?`<img class="dice-token" data-asset="${file}" alt="Die showing ${num}">`:`<span class="die-text">⚄ ${num}</span>`;}
function diceActions(){const g=game;let buttons='';if(['ready','between_rounds'].includes(g.phase))buttons=actionBtn('Roll two dice for everyone','diceRoll','','primary');else if(g.phase==='choose_loser')buttons=g.low.map(id=>actionBtn(actorName(id),'diceLoser',id)).join('');else if(g.phase==='choose_penalty')buttons=choosePenaltyButtons();else if(g.phase==='apply')buttons=actionBtn('Apply selected penalty','diceApply','','primary');return `<div class="dice-rolls">${g.rolls.map(r=>`<div class="roll-pill ${g.chooser===r.id?'high':''} ${g.low?.includes(r.id)?'low':''}"><span>${esc(r.name)}</span><strong class="dice-pair">${dieImage(r.die1)}${dieImage(r.die2)}<span>${r.total}</span></strong></div>`).join('')}</div><div class="action-row">${buttons}</div>`;}
function rpsToken(move,who){
 const p=game.people.find(p=>p.id===who);
 const gender=p?.gender==='male'?'male':'female';
 const f=findAsset(`${move.toLowerCase()}_${gender}.png`,`rps_${move.toLowerCase()}_${gender}.png`);
 return f?`<img class="rps-icon" data-asset="${esc(f)}" alt="${esc(move)}">`:`<b>${{Rock:'✊',Paper:'✋',Scissors:'✌️'}[move]||'?'}</b>`;
}
function rpsActions(){const g=game,actor=E.rpsCurrent(g),target=g.people.find(p=>p.id===g.rpsTarget);
 let content=`<div class="hand-caption">Challenge ${g.round||1} · ${esc(actor.name)}${target?' vs '+esc(target.name):''}</div>`;
 if(g.rpsMatch)content+=`<div class="rps-result"><span>${esc(actor.name)} ${rpsToken(g.rpsMatch.cMove,actor.id)}<small>${esc(g.rpsMatch.cMove)}</small></span><strong>VS</strong><span>${esc(target?.name||'Opponent')} ${rpsToken(g.rpsMatch.tMove,target?.id)}<small>${esc(g.rpsMatch.tMove)}</small></span></div>`;
 if(g.phase==='rps_ready')return content+actionBtn(`Begin ${esc(actor.name)}'s challenge`,'rpsBegin','','primary');
 if(g.phase==='rps_target')return content+`<p class="guide">Choose someone to challenge.</p><div class="action-row">${g.people.filter(p=>!p.eliminated&&p.id!==actor.id).map(p=>actionBtn(p.name,'rpsTarget',p.id)).join('')}</div>`;
 if(g.phase==='rps_move')return content+`<p class="guide">Your move — Rock, Paper or Scissors?</p><div class="rps-choices">${E.RPS_MOVES.map(m=>`<button data-go="rpsMove" data-value="${m}">${rpsToken(m,g.human)}<span>${m}</span></button>`).join('')}</div>`;
 if(g.phase==='rps_ai_match')return content+actionBtn('Play AI showdown','rpsAi','','primary');
 if(g.phase==='rps_tie')return content+actionBtn('Tie! Replay challenge','rpsReplay','','primary');
 if(g.phase==='rps_penalty'){const loser=g.people.find(p=>p.id===g.pending?.loser),c=roster.find(c=>c.asset_name===loser?.asset);return content+`<p class="guide">You won. Choose what ${esc(loser?.name||'the loser')} removes:</p><div class="action-row">${E.allowed(loser).map(k=>actionBtn(k==='Naked'?'Next pose':c?.clothing?.[k]||k,'rpsChoose',k)).join('')}</div>`;}
 if(g.phase==='rps_ai_penalty')return content+actionBtn('AI chooses the penalty','rpsAiPenalty','','primary');
 if(g.phase==='rps_apply')return content+actionBtn('Apply selected penalty','rpsApply','','primary');
 if(g.phase==='rps_between')return content+actionBtn('Next challenge','rpsContinue','','primary');
 return content;
}
function mayhemActions(){const g=game,actor=E.mayhemCurrent(g),target=g.people.find(p=>p.id===g.pending?.loser),c=roster.find(x=>x.asset_name===target?.asset);
 let content=`<div class="hand-caption">Mayhem turn ${g.round||1} · ${esc(actor.name)}</div>`;
 if(g.phase==='mayhem_turn')return content+actionBtn(`Begin ${esc(actor.name)}'s turn`,'mayhemBegin','','primary');
 if(g.phase==='mayhem_ai_target'||g.phase==='mayhem_ai_penalty')return content+actionBtn(`Play ${esc(actor.name)}'s choice`,'mayhemAi','','primary');
 if(g.phase==='mayhem_target')return content+`<p class="guide">Pick one opponent to target.</p><div class="action-row">${g.people.filter(p=>!p.eliminated&&p.id!==actor.id).map(p=>actionBtn(p.name,'mayhemTarget',p.id)).join('')}</div>`;
 if(g.phase==='mayhem_penalty')return content+`<p class="guide">Choose a legal removal for ${esc(target?.name||'opponent')}.</p><div class="action-row">${E.allowed(target).map(k=>actionBtn(k==='Naked'?'Next pose':c?.clothing?.[k]||k,'mayhemPenalty',k)).join('')}</div>`;
 if(g.phase==='mayhem_preview')return content+`<div class="mayhem-preview"><strong>${esc(actor.name)}</strong> chooses <strong>${esc(g.pending.item==='Naked'?'next pose':c?.clothing?.[g.pending.item]||g.pending.item)}</strong> for <strong>${esc(target?.name||'the target')}</strong>.</div>`+actionBtn('Apply penalty','mayhemApply','','primary');
 if(g.phase==='mayhem_between')return content+actionBtn('Next Mayhem turn','mayhemContinue','','primary');
 return content;
}
function phaseActions(){if(game.phase==='game_over')return game.mode==='one'?`<div class="winner">✦ Private booth session complete</div><p class="guide">${esc(game.people[0].name)} has reached the final stage.</p><button class="primary" data-action="new">Choose another character</button>`:`<div class="winner">🏆 ${esc(game.winner)} wins!</div>`;switch(game.mode){case 'dice':return diceActions();case 'memory':return playMemory();case 'wheel':return wheelActions();case 'holdem':return holdemActions();case 'draw':return drawActions();case 'one':return oneActions();case 'rps':return rpsActions();case 'mayhem':return mayhemActions();}}
function participants(){return `<div class="people">${game.people.map(p=>`<div class="person ${p.id===game.highlight?'focus':''} ${p.eliminated?'out':''}"><span>${esc(p.name)}</span><strong>${esc(E.stateOf(p))}</strong></div>`).join('')}</div>`;}
// Make a display-only cut-out for the scene. Character assets often contain
// broad transparent or near-white borders which must NOT count as figure width.
// Nothing is written back to the user's selected Assets folder.
async function sceneSprite(file){
 const key=file.toLowerCase();
 if(sceneSprites.has(key))return sceneSprites.get(key);
 const image=await imgFor(file);if(!image)return null;
 // Downsample large artwork to a practical drawing resolution on Android.
 const k=Math.min(1,800/image.naturalHeight);
 const w=Math.max(1,Math.round(image.naturalWidth*k)),h=Math.max(1,Math.round(image.naturalHeight*k));
 const surface=document.createElement('canvas');surface.width=w;surface.height=h;
 const cx=surface.getContext('2d',{willReadFrequently:true});cx.drawImage(image,0,0,w,h);
 const pixels=cx.getImageData(0,0,w,h),rgba=pixels.data;
 const pixel=(x,y)=>4*(y*w+x);
 // Some older Compendium character files are opaque on an almost-white field.
 // Only remove pale pixels connected to the OUTER EDGE, not enclosed white
 // clothing, faces or highlights. Transparent PNGs need no colour-keying.
 const pale=(i)=>{const r=rgba[i],g=rgba[i+1],b=rgba[i+2];return rgba[i+3]<16||(Math.min(r,g,b)>216&&Math.max(r,g,b)-Math.min(r,g,b)<48)};
 const corners=[[0,0],[w-1,0],[0,h-1],[w-1,h-1]];
 const whiteCorners=corners.filter(([x,y])=>{const i=pixel(x,y);return rgba[i+3]>220&&pale(i)}).length;
 if(whiteCorners>=3){
   const seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let front=0,back=0;
   const add=(pos)=>{if(seen[pos])return;seen[pos]=1;if(pale(pos*4))queue[back++]=pos;};
   for(let x=0;x<w;x++){add(x);add((h-1)*w+x)}
   for(let y=0;y<h;y++){add(y*w);add(y*w+w-1)}
   while(front<back){const p=queue[front++],i=p*4;rgba[i+3]=0;
     const x=p%w,y=(p-x)/w;
     if(x>0)add(p-1);if(x<w-1)add(p+1);
     if(y>0)add(p-w);if(y<h-1)add(p+w);
   }
   cx.putImageData(pixels,0,0);
 }
 let minX=w,minY=h,maxX=-1,maxY=-1;
 // Scan remaining visible artwork, ignoring nearly invisible antialias pixels.
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   if(rgba[pixel(x,y)+3]<24)continue;
   if(x<minX)minX=x;if(x>maxX)maxX=x;
   if(y<minY)minY=y;if(y>maxY)maxY=y;
 }
 if(maxX<0){minX=minY=0;maxX=w-1;maxY=h-1}
 const padX=Math.max(2,Math.round(w*.006)),padY=Math.max(2,Math.round(h*.006));
 const sx=Math.max(0,minX-padX),sy=Math.max(0,minY-padY);
 const ex=Math.min(w,maxX+1+padX),ey=Math.min(h,maxY+1+padY);
 const sprite={surface,sx,sy,sw:ex-sx,sh:ey-sy};
 sceneSprites.set(key,sprite);return sprite;
}
async function drawBoothScene(cv,ctx,W,H){
 const p=game.people[0],booth=await imgFor('booth.png');
 ctx.fillStyle='#190c13';ctx.fillRect(0,0,W,H);
 if(booth){
  // Cover naturally, crop only as much of the original 2:3 source as required.
  const scale=Math.max(W/booth.naturalWidth,H/booth.naturalHeight);
  const bw=booth.naturalWidth*scale,bh=booth.naturalHeight*scale;
  ctx.drawImage(booth,(W-bw)/2,(H-bh)/2,bw,bh);
 }else{
  ctx.fillStyle='#ddb478';ctx.textAlign='center';ctx.font='bold 28px system-ui';
  ctx.fillText('booth.png not found in Assets folder',W/2,H/2);
 }
 const st=E.stateOf(p);
 let sprite=await sceneSprite(filename(p.asset,st));
 if(!sprite&&st!=='TJBP')sprite=await sceneSprite(filename(p.asset));
 if(!cv.isConnected)return;
 if(sprite){
  // Protect the entire visible figure, including feet, from the 50px
  // nameplate drawn below. Previously feet=97.5% placed the bottoms of
  // the character INSIDE that nameplate, so the bar hid their feet.
  const nameplateTop=H-50;
  const floorGap=Math.max(10,Math.round(H*.012));
  const headGap=Math.max(16,Math.round(H*.018));
  const feet=nameplateTop-floorGap;
  const usable=Math.min(H*.93,feet-headGap);
  const scale=Math.min(W*.91/sprite.sw,usable/sprite.sh);
  const dw=sprite.sw*scale,dh=sprite.sh*scale;
  ctx.shadowColor='rgba(0,0,0,.60)';ctx.shadowBlur=22;
  ctx.drawImage(sprite.surface,sprite.sx,sprite.sy,sprite.sw,sprite.sh,(W-dw)/2,feet-dh,dw,dh);
  ctx.shadowBlur=0;
 }
 ctx.fillStyle='rgba(19,10,17,.80)';ctx.fillRect(0,H-50,W,50);
 ctx.fillStyle='#fff0d8';ctx.textAlign='center';ctx.font='bold 21px system-ui';
 ctx.fillText(`${p.name} · ${st}`,W/2,H-18);
}
async function drawScene(){
 const cv=$('scene');if(!cv||!game)return;
 const ctx=cv.getContext('2d');const W=cv.width,H=cv.height;
 if(game.mode==='one'){await drawBoothScene(cv,ctx,W,H);return;}
 ctx.fillStyle='#160f14';ctx.fillRect(0,0,W,H);
 const b=await imgFor(backgroundFiles[game.settings.background]||'Background_Nightclub.png');
 if(b){const s=Math.max(W/b.width,H/b.height);ctx.globalAlpha=.48;ctx.drawImage(b,(W-b.width*s)/2,(H-b.height*s)/2,b.width*s,b.height*s);ctx.globalAlpha=1;}
 const people=game.people,count=people.length,slotW=W/count,feet=H-44,usableHeight=feet-12;
 for(let i=0;i<count;i++){
   // The game may have re-rendered while a different file was being decoded.
   if(!cv.isConnected)return;
   const p=people[i],x=i*slotW,st=E.stateOf(p);
   let sprite=await sceneSprite(filename(p.asset,st));
   if(!sprite&&st!=='TJBP')sprite=await sceneSprite(filename(p.asset,'TJBP'));
   if(p.id===game.highlight){ctx.fillStyle='rgba(222,181,97,.14)';ctx.fillRect(x+3,0,slotW-6,feet-5);}
   if(sprite){
     // Fit the VISIBLE character, not the empty padding in the original PNG.
     // A small overlap allowance is useful for capes/wide poses without
     // allowing one player to hide a neighbouring character.
     const scale=Math.min((slotW+12)/sprite.sw,usableHeight/sprite.sh);
     const dw=sprite.sw*scale,dh=sprite.sh*scale;
     ctx.drawImage(sprite.surface,sprite.sx,sprite.sy,sprite.sw,sprite.sh,
       x+(slotW-dw)/2,feet-dh,dw,dh);
   }else{
     ctx.fillStyle='#50333a';ctx.fillRect(x+14,H*.27,slotW-28,H*.60);
     ctx.fillStyle='#eee1ce';ctx.textAlign='center';ctx.font='18px system-ui';
     ctx.fillText('No artwork',x+slotW/2,H*.58);
   }
   ctx.fillStyle='rgba(14,9,14,.87)';ctx.fillRect(x+2,H-43,slotW-4,43);
   ctx.fillStyle='#f3e6d9';ctx.textAlign='center';ctx.font=`bold ${Math.max(11,17-count)}px system-ui`;
   ctx.fillText(p.name.slice(0,Math.round(slotW/10)),x+slotW/2,H-23);
   ctx.fillStyle=p.eliminated?'#e5a2a2':'#dabb82';ctx.font='12px system-ui';
   ctx.fillText(st+(p.eliminated?' · OUT':''),x+slotW/2,H-6);
 }
}
async function fillAssets(){const images=document.querySelectorAll('img[data-asset]');await Promise.all([...images].map(async el=>{let file=el.dataset.asset,url=await urlFor(file);if(el.isConnected&&url)el.src=url;}));}
function historyPanel(g){const rows=(g.history||[]).slice(-8);if(rows.length<2)return '';
 return `<details class="recent-log" ${historyExpanded?'open':''}><summary>Recent turns · ${rows.length} events</summary><ol>${[...rows].reverse().map(x=>`<li>${esc(x)}</li>`).join('')}</ol></details>`;}
function drawerHtml(){if(!uiDrawer||!game)return '';
 const g=game,words=g.dialogue||'',t={players:'Players',dialogue:'Dialogue',history:'Recent turns',settings:'Game options'}[uiDrawer]||'Details';
 let content='';
 if(uiDrawer==='players')content=`<div class="drawer-players">${g.people.map(p=>`<div><strong>${esc(p.name)}</strong><span>${esc(E.stateOf(p))}${p.eliminated?' · OUT':''}</span></div>`).join('')}</div>`;
 if(uiDrawer==='dialogue')content=`<p class="drawer-quote">${words?esc(words):'No dialogue yet. Continue playing to hear from your opponents.'}</p>`;
 if(uiDrawer==='history')content=`<ol class="drawer-history">${[...(g.history||[])].reverse().map(x=>`<li>${esc(x)}</li>`).join('')||'<li>No turns yet</li>'}</ol>`;
 if(uiDrawer==='settings')content=`<div class="drawer-settings"><button data-action="aiSpeedCycle">⚡ ${esc(aiCaption())}</button><button data-action="sceneView">⛶ View / Save image</button><button data-action="new">New game</button><button data-action="folder">Select Assets folder</button><button data-action="export">Export saves</button></div>`;
 return `<div class="drawer-shade" data-action="closeDrawer"></div><div class="game-drawer panel" role="dialog" aria-label="${t}"><div class="drawer-head"><strong>${t}</strong><button data-action="closeDrawer" aria-label="Close details">✕</button></div>${content}</div>`;
}
function updateDrawer(){let e=$('gameDrawer');if(e)e.innerHTML=drawerHtml();}
function gameView(){if(!game){view='setup';setupView();return;}
 const g=game,solo=g.mode==='one';
 const actor=g.people.find(p=>p.id===g.highlight)||g.people[0];
 const words=g.dialogue||roster.find(c=>c.asset_name===actor?.asset)?.stage_dialogue?.[E.stateOf(actor)]||'';
 // Use a standalone, edge-to-edge game shell rather than the web-site header.
 const round=solo?`STAGE ${Math.min(g.round,9)} / 9`:g.mode==='draw'||g.mode==='holdem'?`HAND ${g.handNum}`:`ROUND ${g.round||1}`;
 const shortNotice=g.notice||'Ready';
 const actionWrap=document.createElement('div');actionWrap.innerHTML=phaseActions();
 const primary=actionWrap.querySelector('button.primary');
 let primaryDock='';if(primary){primaryDock=primary.outerHTML;primary.remove();}
 const actionMarkup=actionWrap.innerHTML;
 $('app').classList.toggle('immersive',immersive);$('app').innerHTML=`<main class="main game-only"><div class="game-screen unified-game ${solo?'solo-game':''}"><div class="game-top"><button class="small-btn" data-nav="menu" aria-label="Return to menu">‹ Menu</button><span class="game-name">${esc(E.MODES[g.mode])}</span><button class="small-btn" data-action="openDrawer" data-value="settings" aria-label="Game options">⋯</button></div><div class="game-main"><div class="scene-wrap" title="Double-tap to hide game bars"><canvas id="scene" width="${solo?(matchMedia('(orientation:landscape)').matches?1180:900):1180}" height="${solo?(matchMedia('(orientation:landscape)').matches?760:1200):590}" role="img" aria-label="Current character scene"></canvas><button class="scene-expand" data-action="sceneView" aria-label="View, zoom and save current image">⛶</button></div><section class="game-controls panel"><div class="turn-info"><div class="turn-meta"><span class="eyebrow">${round} · ${esc(g.phase.replaceAll('_',' '))}</span>${solo?'':`<button class="ai-switch" data-action="aiSpeedCycle">⚡ ${esc(aiCaption())}</button>`}</div><p class="notice">${esc(shortNotice)}</p></div>${!solo&&words?`<div class="speech compact-speech"><b>${esc(actor.name)}</b> ${esc(words)}</div>`:''}<div class="actions-scroll">${solo&&words?`<div class="speech solo-full-speech"><b>${esc(actor.name)}</b> ${esc(words)}</div>`:''}${actionMarkup}</div>${primaryDock?`<div class="primary-dock">${primaryDock}</div>`:""}</section></div><nav class="game-toolbar" aria-label="Game details"><button data-action="openDrawer" data-value="players">♧ Players</button><button data-action="openDrawer" data-value="dialogue">☷ Dialogue</button><button data-action="openDrawer" data-value="history">↺ History</button><button data-action="openDrawer" data-value="settings">⚙ Options</button></nav><div id="gameDrawer">${drawerHtml()}</div>${memoryRevealOverlay()}</div></main>`;
 drawScene().catch(console.warn);fillAssets();if(g.mode==='wheel')animateWheel();scheduleAuto();
}
function animateWheel(){const el=$('wheelDisc');if(!el)return;const angle=game.spinAngle||0;if(game.wheelIndex>=0&&lastSpin!==angle){el.style.transform='rotate(0deg)';requestAnimationFrame(()=>requestAnimationFrame(()=>{if(el.isConnected)el.style.transform=`rotate(${angle}deg)`;}));lastSpin=angle;}else el.style.transform=`rotate(${angle%360}deg)`;}
// Scene viewer: the image is exported from the *local* canvas. Nothing is uploaded.
function sceneSnapshot(){
 const cv=$('scene');if(!cv)throw Error('Scene not available yet.');
 return cv.toDataURL('image/png');
}
function openSceneViewer(){
 cancelAuto();try{
  sceneViewerData=sceneSnapshot();sceneZoom=1;
  const old=$('sceneViewer');if(old)old.remove();
  const el=document.createElement('div');el.id='sceneViewer';el.className='scene-view';
  el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Scene image viewer');
  el.innerHTML=`<div class="scene-view-toolbar"><button data-view-action="close">✕ Close</button><button data-view-action="minus" aria-label="Zoom out">−</button><button data-view-action="reset">100%</button><button data-view-action="plus" aria-label="Zoom in">+</button><button data-view-action="full">⛶ Full screen</button><button class="primary" data-view-action="save">⬇ Save PNG</button></div><div class="scene-view-scroll" id="sceneViewScroll"><div class="scene-view-zoom" id="sceneViewZoom"><img id="sceneViewImage" alt="Current Compendium scene" src="${sceneViewerData}"></div></div><div class="scene-view-hint">Pinch or use +/− to zoom · Drag to move the image</div>`;
  document.body.appendChild(el);
  // Pinch zoom without causing Chrome to scroll the underlying game.
  const scroll=$('sceneViewScroll');let baseDistance=0,baseZoom=1;
  const separation=ev=>Math.hypot(ev.touches[0].clientX-ev.touches[1].clientX,ev.touches[0].clientY-ev.touches[1].clientY);
  scroll.addEventListener('touchstart',ev=>{if(ev.touches.length===2){baseDistance=separation(ev);baseZoom=sceneZoom;}},{passive:true});
  scroll.addEventListener('touchmove',ev=>{if(ev.touches.length===2&&baseDistance){ev.preventDefault();setSceneZoom(baseZoom*separation(ev)/baseDistance);}},{passive:false});
  scroll.addEventListener('touchend',ev=>{if(ev.touches.length<2)baseDistance=0;},{passive:true});
  scroll.addEventListener('wheel',ev=>{if(ev.ctrlKey){ev.preventDefault();setSceneZoom(sceneZoom*(ev.deltaY>0?.85:1.15));}},{passive:false});
 }catch(err){console.warn(err);toast(`Cannot open scene: ${err.message}`)}
}
function setSceneZoom(value){
 sceneZoom=Math.max(.5,Math.min(5,Math.round(value*100)/100));
 const z=$('sceneViewZoom'),scroll=$('sceneViewScroll');if(!z||!scroll)return;
 const oldW=z.getBoundingClientRect().width,oldH=z.getBoundingClientRect().height;
 const x=(scroll.scrollLeft+scroll.clientWidth/2)/(oldW||1),y=(scroll.scrollTop+scroll.clientHeight/2)/(oldH||1);
 z.style.width=`${sceneZoom*100}%`;
 const newW=z.getBoundingClientRect().width,newH=z.getBoundingClientRect().height;
 scroll.scrollLeft=x*newW-scroll.clientWidth/2;scroll.scrollTop=y*newH-scroll.clientHeight/2;
 const reset=$('sceneViewer')?.querySelector('[data-view-action="reset"]');if(reset)reset.textContent=`${Math.round(sceneZoom*100)}%`;
}
async function closeSceneViewer(){const el=$('sceneViewer');if(!el)return;
 if(document.fullscreenElement===el){try{await document.exitFullscreen();}catch(_e){}}
 el.remove();sceneViewerData='';scheduleAuto();
}
function saveScene(){
 try{
  const data=sceneViewerData||sceneSnapshot();const a=document.createElement('a');
  const stamp=new Date().toISOString().slice(0,19).replaceAll(':','-');
  a.href=data;a.download=`Compendium_${game?.mode||'Scene'}_${stamp}.png`;
  document.body.appendChild(a);a.click();a.remove();
  toast('Scene image sent to your Downloads folder.');
 }catch(err){toast(`Image save failed: ${err.message}`)}
}
async function sceneViewAction(action){
 const el=$('sceneViewer');if(!el)return;
 switch(action){
  case'close':await closeSceneViewer();break;
  case'plus':setSceneZoom(sceneZoom*1.3);break;
  case'minus':setSceneZoom(sceneZoom/1.3);break;
  case'reset':setSceneZoom(1);break;
  case'save':saveScene();break;
  case'full':
   try{
    if(document.fullscreenElement===el)await document.exitFullscreen();
    else if(el.requestFullscreen)await el.requestFullscreen({navigationUI:'hide'});
    else toast('Full-screen mode unavailable in this browser.');
   }catch(_err){toast('Chrome could not enter full-screen mode; the scene viewer still fills the page.');}
   break;
 }
}
async function toggleImmersive(){
 if(view!=='game'||!game||$('sceneViewer'))return;
 immersive=!immersive;$('app').classList.toggle('immersive',immersive);
 if(immersive){
  // Fullscreen API is browser-dependent; CSS HUD hiding also works offline.
  try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen({navigationUI:'hide'});}catch(_e){}
  toast('Game bars hidden. Double-tap scene again to restore.');
 }else{
  if(document.fullscreenElement===document.documentElement)try{await document.exitFullscreen();}catch(_e){}
  toast('Game bars restored.');
 }
}
let lastSceneTap=0,lastSceneTapX=0,lastSceneTapY=0;
document.addEventListener('pointerup',ev=>{
 if(view!=='game'||!ev.target.closest('.scene-wrap')||ev.target.closest('button'))return;
 if(ev.pointerType==='mouse'&&ev.button!==0)return;
 const now=performance.now(),double=now-lastSceneTap<370&&Math.hypot(ev.clientX-lastSceneTapX,ev.clientY-lastSceneTapY)<75;
 lastSceneTap=now;lastSceneTapX=ev.clientX;lastSceneTapY=ev.clientY;
 if(double){lastSceneTap=0;toggleImmersive();}
});
document.addEventListener('keydown',ev=>{
 if(ev.key==='Escape'&&$('sceneViewer'))closeSceneViewer();
});
function render(){cancelAuto();if(view==='menu')menu();else if(view==='setup')setupView();else if(view==='settings')settingsView();else if(view==='game')gameView();}
function saveGame(){if(game){saves[game.mode]=game;saveAll();}}
function uiAction(fn){try{
 const previousGame=game,previousNotice=game?.notice;
 fn();
 if(game){
  if(game!==previousGame)game.history=[];
  if(game.notice&&(game!==previousGame||game.notice!==previousNotice)){
   if(!Array.isArray(game.history))game.history=[];
   if(game.history.at(-1)!==game.notice)game.history.push(game.notice);
   if(game.history.length>40)game.history=game.history.slice(-40);
  }
 }
 if(game&&game.mode!=='one'){let p=game.people.find(p=>p.id===game.highlight);if(p&&(!['diceApply','memoryApply','wheelApply','pokerApply','rpsApply','mayhemApply'].includes(window.__sgcAction)||!game.dialogue)){let event=game.phase==='game_over'?'winner':game.mode==='rps'?(game.rpsMatch?.tie?'tie':game.pending?.chooser===p.id?'win':'lose'):game.mode==='mayhem'?(game.phase==='mayhem_preview'?'pre_layer':'post_layer'):game.mode==='wheel'?(game.segment||'spin'):game.mode==='dice'?'low_single':game.mode==='memory'?'reveal':game.mode==='holdem'?'showdown_lose':'showdown_lose';if(game.mode==='memory'&&['memoryApply','memoryNext'].includes(window.__sgcAction||''))event='after';const line=dialogueText(event,p.id);if(line)game.dialogue=line;}}
 saveGame();render();}catch(err){console.error(err);toast(err.message||String(err));}}
const selectedFile=(ev)=>{const i=+ev;discard.has(i)?discard.delete(i):discard.add(i);render();};
function gameAction(action,value,automated=false){uiAction(()=>{const g=game;if(!g)throw Error('No active game.');if(automated&&autoAction(g)!==action)throw Error('Automatic action is no longer available.');window.__sgcAction=action;if(action==='spin')lastWheelSpinTime=Date.now();switch(action){case'diceRoll':E.diceRoll(g);break;case'diceLoser':E.diceLoser(g,value);break;case'pick':E.penaltyPick(g,value);break;case'diceApply':E.penaltyApply(g);break;case'flip':E.memoryFlip(g,+value);break;case'memoryShowChoices':E.memoryRevealContinue(g);break;case'aiChoose':E.penaltyPick(g,E.allowed(g.people.find(p=>p.id===g.pending.loser)).slice().reverse()[0]);break;case'memoryApply':E.memoryApply(g);break;case'memoryNext':E.memoryNext(g);break;case'spin':E.wheelSpin(g);break;case'wheelNext':E.wheelNext(g);break;case'vote':E.wheelVote(g,value);break;case'target':E.wheelTarget(g,value);break;case'layer':E.wheelLayer(g,value);break;case'recover':E.wheelRecover(g,value);break;case'wheelApply':E.wheelApply(g);break;case'holdemNext':E.holdemNext(g);break;case'exchange':E.drawExchange(g,[...discard]);discard.clear();break;case'showdownPenalty':E.showdownPenalty(g);break;case'pokerApply':E.pokerApply(g);break;case'nextHand':E.nextHand(g);break;case'ai':E.stepAi(g);break;case'oneTalk':E.oneInteract(g,value,oneBanter(value));break;case'oneRemove':{const p=g.people[0],item=value;if(!E.allowed(p).includes(item))throw Error('That clothing choice is no longer legal.');const clone={...p,items:[...p.items]};if(item)E.remove(clone,item);const c=roster.find(x=>x.asset_name===p.asset);const line=oneRemovalLine(g,item,E.stateOf(clone));E.oneAdvance(g,item,line);break;}case'rpsBegin':E.rpsBegin(g);break;case'rpsTarget':E.rpsTarget(g,value);break;case'rpsMove':E.rpsMove(g,value);break;case'rpsAi':E.rpsAi(g);break;case'rpsReplay':E.rpsReplay(g);break;case'rpsAiPenalty':E.rpsAiPenalty(g);break;case'rpsChoose':E.rpsChoose(g,value);break;case'rpsApply':E.rpsApply(g);break;case'rpsContinue':E.rpsContinue(g);break;case'mayhemBegin':E.mayhemBegin(g);break;case'mayhemTarget':E.mayhemTarget(g,value);break;case'mayhemPenalty':E.mayhemPenalty(g,value);break;case'mayhemAi':E.mayhemAi(g);break;case'mayhemApply':E.mayhemApply(g);break;case'mayhemContinue':E.mayhemContinue(g);break; default:throw Error('Unknown game action')}
 // Supplemental bawdy reaction on high-stakes removal, without replacing
 // character-specific authored dialogue or reusing one identical line everywhere.
 if(['rpsApply','mayhemApply'].includes(action)){
   const subject=g.people.find(p=>p.id===g.highlight),profile=subject&&roster.find(c=>c.asset_name===subject.asset);
   const stage=subject&&E.stateOf(subject);
   if(profile?.stage_dialogue?.[stage])g.dialogue=profile.stage_dialogue[stage];
 }
 if(['diceApply','memoryApply','wheelApply','pokerApply'].includes(action)){const p=g.people.find(x=>x.id===g.highlight),profile=p&&roster.find(c=>c.asset_name===p.asset);if(profile?.stage_dialogue?.[E.stateOf(p)])g.dialogue=profile.stage_dialogue[E.stateOf(p)];}
 });}
function doStart(){uiAction(()=>{if(!folder)toast('Select your Assets folder to display character images.');let settings={selected:[...selected],human:human||selected[0],playerName,gender,confidence,background,spectator};if(mode==='memory'){ensureMemoryLineup();settings.selected=[memoryAvatar,...memoryOpponents];settings.human=memoryAvatar;settings.memoryGender=memoryGender;}if(mode==='one'){if(!soloSelected)throw Error('Select one character before entering the private booth.');settings.selected=[soloSelected];settings.visitorGender=soloGender;}game=E.start(mode,roster,settings);uiDrawer='';view='game';saveGame();discard.clear();lastSpin=-1;});}
async function exportSaves(){const blob=new Blob([JSON.stringify({format:'compendium-browser-saves-v1',games:saves,options:{selected,human,background}},null,2)],{type:'application/json'});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=`compendium-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(u),2500);}
async function importSaves(file){try{const data=JSON.parse(await file.text());if(data.format!=='compendium-browser-saves-v1'||typeof data.games!=='object')throw Error('Not a Compendium Browser backup.');if(!confirm('Replace existing saved games with the imported backup?'))return;saves=data.games;game=null;view='menu';saveAll();render();toast('Saved games restored.');}catch(err){toast(`Import failed: ${err.message}`);}}
document.addEventListener('click',async event=>{const v=event.target.closest('[data-view-action]');if(v){await sceneViewAction(v.dataset.viewAction);return;}const b=event.target.closest('button,[data-nav],.file-btn');if(!b)return;let nav=b.dataset.nav,act=b.dataset.action,go=b.dataset.go;if(nav){uiDrawer='';cancelAuto();view=nav;if(nav!=='game'){immersive=false;$('app').classList.remove('immersive');if(document.fullscreenElement===document.documentElement)document.exitFullscreen().catch(()=>{});}render();return;}
 if(b.dataset.open){uiDrawer='';mode=b.dataset.open;game=saves[mode]||null;view='setup';search='';rosterTab=0;if(mode==='memory')ensureMemoryLineup();render();return;}
 if(b.dataset.tab!==undefined){rosterTab=+b.dataset.tab;search='';render();return;}
 if(b.dataset.pick){const name=b.dataset.pick;if(mode==='memory'){if(name===memoryAvatar)return;memoryOpponents=memoryOpponents.includes(name)?memoryOpponents.filter(n=>n!==name):memoryOpponents.length<4?[...memoryOpponents,name]:memoryOpponents;saveAll();const x=document.querySelector('.roster-viewport');const old=x?.scrollTop||0;setupView();document.querySelector('.roster-viewport')?.scrollTo(0,old);return;}if(mode==='one'){soloSelected=soloSelected===name?null:name;saveAll();const x=document.querySelector('.roster-viewport');const old=x?.scrollTop||0;setupView();document.querySelector('.roster-viewport')?.scrollTo(0,old);return;}selected=selected.includes(name)?selected.filter(x=>x!==name):selected.length<(spectator?5:4)?[...selected,name]:selected;if(!selected.includes(human))human=selected[0];saveAll();const x=document.querySelector('.roster-viewport');const old=x?.scrollTop||0;setupView();document.querySelector('.roster-viewport')?.scrollTo(0,old);return;}
 if(b.dataset.discard!==undefined){selectedFile(b.dataset.discard);return;}
 if(go){gameAction(go,b.dataset.value);return;}
 if(act==='randomMemoryAvatar'){memoryAvatar=randomAvatar(memoryAvatar);memoryOpponents=memoryOpponents.filter(n=>n!==memoryAvatar);if(memoryOpponents.length!==4)randomMemoryOpponents();saveAll();setupView();return;}if(act==='randomMemoryOpponents'){randomMemoryOpponents();saveAll();setupView();return;}if(act==='openDrawer'){uiDrawer=uiDrawer===b.dataset.value?'':b.dataset.value;updateDrawer();return;}if(act==='closeDrawer'){uiDrawer='';updateDrawer();return;}if(act==='aiSpeedCycle')return cycleAiSpeed();if(act==='sceneView')return openSceneViewer();if(act==='folder')return selectFolder();if(act==='reconnect')return reconnect();if(act==='start')return doStart();if(act==='resume'){game=saves[mode];view='game';render();return;}if(act==='new'){if(!confirm('Start a new game? Your current game is saved and can be resumed from setup until you replace it.'))return;view='setup';render();return;}
 if(act==='export')exportSaves();});
document.addEventListener('toggle',ev=>{if(ev.target.matches?.('details.recent-log'))historyExpanded=ev.target.open;},true);
document.addEventListener('input',ev=>{if(ev.target.id==='search'){search=ev.target.value;rosterTab=0;const dest=$('rosterHere');if(dest){dest.innerHTML=rosterGrid();fillAssets();}}if(ev.target.id==='playerName')playerName=ev.target.value;});
document.addEventListener('change',ev=>{const el=ev.target;switch(el.id){case'memoryGender':if(['male','female'].includes(el.value)){memoryGender=el.value;memoryAvatar=randomAvatar();memoryOpponents=memoryOpponents.filter(n=>n!==memoryAvatar);if(memoryOpponents.length!==4)randomMemoryOpponents();saveAll();setupView();return;}break;case'human':human=el.value;break;case'spectator':spectator=el.value==='true';if(selected.length>(spectator?5:4))selected=selected.slice(0,4);render();break;case'gender':gender=el.value;break;case'soloGender':if(['male','female','neutral'].includes(el.value))soloGender=el.value;break;case'confidence':confidence=+el.value;break;case'background':background=el.value;break;case'aiSpeed':setAiSpeed(el.value);return;case'import':if(el.files?.[0])importSaves(el.files[0]);break;}saveAll();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAuto();else scheduleAuto();});
window.addEventListener('pagehide',cancelAuto);
window.addEventListener('pageshow',()=>{if(view==='game')scheduleAuto();});
// Accept either GitHub layout: data/characters.json OR characters.json in repository root.
// GitHub's browser uploader often flattens the folder when files are dragged in.
async function loadDataFile(name){
 const errors=[];
 for (const path of [`./${name}.json`,`./data/${name}.json`]){
  try {
   const response=await fetch(path,{cache:'no-store'});
   if (!response.ok){errors.push(`${path}: HTTP ${response.status}`);continue;}
   const body=await response.json();
   return body;
  } catch(err){errors.push(`${path}: ${err.message}`);}
 }
 throw new Error(`Cannot load ${name}.json. Looked in data/ and repository root. ${errors.join(' | ')}`);
}
(async()=>{try{const [characters,dice,wheel,holdem,draw,memory,rps,mayhem]=await Promise.all(['characters','dice_dialogue','wheel_dialogue','holdem_dialogue','poker_dialogue','memory_dialogue','showdown_dialogue','mayhem_dialogue'].map(loadDataFile));
 loadPreferences();roster=characters;for(const c of roster)c.gender=['Kristoff','Bananaman','Jason','Hank','Hulk','Donkey','Homer','Thing','Donald','Captain','Batman','Jack'].includes(c.asset_name)?'male':'female';packs={dice,wheel,holdem,draw,memory,rps,mayhem};loadSaved();render();
 if('serviceWorker' in navigator)navigator.serviceWorker.register('./service-worker.js',{scope:'./'}).catch(console.warn);
 let h=await dbHandle('load').catch(()=>null);if(h){folder=h;let perm=await h.queryPermission({mode:'read'});if(perm==='granted')await connect(h);else toast('Previously selected folder found. Tap Assets → Reconnect to enable artwork.');}
 }catch(err){console.error(err);$('app').innerHTML=`<section class="fatal">Could not start Compendium: ${esc(err.message)}. Check the uploaded GitHub files. Open the website again after fixing the files.</section>`;}})();
