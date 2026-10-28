import * as E from './engine.js';
const $=id=>document.getElementById(id), esc=x=>String(x??'').replace(/[&<>"']/g,y=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[y]));
const display=n=>roster.find(c=>c.asset_name===n)?.full_name||n;
const KEY='sgc-browser-v1-save',DIRDB='sgc_browser_feasibility',HANDKEY='assets-directory';
let roster=[],packs={},view='menu',mode='dice',game=null,selected=['Ahsoka','Jack'],human='Ahsoka',rosterTab=0,search='',spectator=false,playerName='Player',gender='male',confidence=3,background='Nightclub',discard=new Set(),folder=null,assets=new Map(),objects=new Map(),loadedImgs=new Map(),sceneSprites=new Map(),folderInfo='',lastSpin=-1,immersive=false,sceneViewerData='',sceneZoom=1;
const menuModes=[['dice','🎲','Dice','Highest chooses. Lowest loses.'],['memory','🃏','Strip Memory','Reveal a character, choose a penalty.'],['wheel','🎡','Wheel of Misfortune','Sixteen segments, votes and recovery.'],['holdem','♠','Strip Hold’em','Flop, turn, river and showdown.'],['draw','♥','Five-Card Draw','Two exchange rounds per hand.']];
const backgroundFiles={'Nightclub':'Background_Nightclub.png','Strip Club':'Background_Strip_Club.png','Sleek Office':'Background_Sleek_Office.png','Market Square':'Background_Market_Square.png','London Eye':'Background_London_Eye.png','The White House':'Background_The_Whitehouse.png','Skyscraper Roof':'Background_Skyscraper_Roof.png','Park':'Background_Park.png','Field':'Background_Field.png','Tropical Beach':'Background_Tropical_Beach.png','Mars':'Background_Mars.png','Dungeon':'Background_Dungeon.png','Sex Shop':'Background_Sex_Shop.png','Theatre':'Background_Theatre.png','Haunted Church':'Background_Haunted_Church.png','Haunted Graveyard':'Background_Haunted_Graveyard.png','Enchanted Forest':'Background_Enchanted_Forest.png'};
const saveAll=()=>{try{localStorage.setItem(KEY,JSON.stringify({games:saves,selected,human,playerName,gender,confidence,background,spectator,mode}))}catch(e){console.warn('Could not save game',e);toast('Browser storage is full; export your saves.')}};
let saves={};
let historyExpanded=false;
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
 if(g.mode==='dice')return g.phase==='choose_penalty'?'Your choice · select a clothing penalty':g.phase==='choose_loser'?'Your choice · select a tied-low player':'Ready · roll when you choose';
 if(g.mode==='memory')return g.phase==='choose_card'?'Your turn · reveal a Memory Card':g.phase==='choose_penalty'?'Your choice · choose a penalty':'Ready for the next step';
 if(g.mode==='wheel')return g.phase==='ready'?'Your turn · spin the wheel':g.phase==='vote'?'Your vote · select a layer':g.phase==='choose_target'?'Your turn · choose an opponent':'Your decision · choose the result';
 if(g.mode==='draw')return g.phase==='draw'?'Your hand · tap cards to exchange':'Deal again when ready';
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
 const wait=Math.max(delay,afterSpin,action==='holdemNext'?Math.max(delay,850):0);
 autoTimer=setTimeout(()=>{
  autoTimer=null;
  if(token!==autoToken||document.hidden||view!=='game'||game!==fingerprint||aiSpeed==='off'||document.getElementById('sceneViewer'))return;
  if(autoAction(game)!==action)return;
  gameAction(action,'',true);
 },wait);
}

function loadSaved(){try{const o=JSON.parse(localStorage.getItem(KEY)||'{}');saves=o.games||{};selected=o.selected||selected;human=o.human||human;playerName=o.playerName||playerName;gender=o.gender||gender;confidence=o.confidence||confidence;background=o.background||background;spectator=!!o.spectator;mode=o.mode||mode;}catch(e){console.warn(e);}}
function toast(message){const t=$('toast');if(!t)return;t.textContent=message;t.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.hidden=true,4500);}
function openDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DIRDB,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('settings'))req.result.createObjectStore('settings')};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function dbHandle(action,h){const db=await openDb();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('settings',action==='save'?'readwrite':'readonly');const r=action==='save'?tx.objectStore('settings').put(h,HANDKEY):tx.objectStore('settings').get(HANDKEY);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}finally{db.close()}}
function cleanAssets(){for(const url of objects.values())URL.revokeObjectURL(url);objects.clear();loadedImgs.clear();sceneSprites.clear();}
async function connect(handle){let m=new Map();for await(const entry of handle.values())if(entry.kind==='file'&&/\.(png|webp|jpe?g)$/i.test(entry.name))m.set(entry.name.toLowerCase(),entry);
 folder=handle;assets=m;cleanAssets();folderInfo=`${handle.name}: ${m.size} image files`;render();toast(`Assets connected — ${m.size} images available.`);}
async function selectFolder(){try{const h=await window.showDirectoryPicker({id:'compendium-assets',mode:'read'});await dbHandle('save',h);await connect(h);}catch(err){if(err.name!=='AbortError')toast(`Folder error: ${err.message}`)}}
async function reconnect(){try{let h=folder||await dbHandle('load');if(!h){toast('No saved folder. Select Assets folder.');return;}let perm=await h.queryPermission({mode:'read'});if(perm!=='granted')perm=await h.requestPermission({mode:'read'});if(perm!=='granted')throw Error('Folder permission was not granted');await connect(h);}catch(err){toast(`Cannot reconnect: ${err.message}`)}}
const has=n=>assets.has(n.toLowerCase());
async function urlFor(filename){let key=filename.toLowerCase();if(objects.has(key))return objects.get(key);const h=assets.get(key);if(!h)return null;const f=await h.getFile(),url=URL.createObjectURL(f);objects.set(key,url);return url;}
async function imgFor(filename){const key=filename.toLowerCase();if(loadedImgs.has(key))return loadedImgs.get(key);const url=await urlFor(filename);if(!url)return null;let image=new Image();image.src=url;try{await image.decode();loadedImgs.set(key,image);return image;}catch(_e){return null;}}
function filename(asset,state='TJBP'){return `${asset}_${state}.png`}
function header(){return `<header class="top"><div class="brand" data-nav="menu"><span class="emblem">✦</span><div><div class="eyebrow">STRIP GAMES COMPENDIUM</div><div class="brand-title">THE PRIVATE CLUB <small>Browser Edition</small></div></div></div><div class="top-actions"><span class="pill">v1.1</span><button class="small-btn" data-action="folder">${folder?'📁 '+assets.size:'📁 Assets'}</button></div></header>`;}
function frame(content){$('app').innerHTML=`${header()}<main class="main">${content}</main>`;}
function menu(){const tiles=menuModes.map(([id,ico,title,descr])=>`<button class="menu-tile" data-open="${id}"><span class="menu-icon">${ico}</span><span class="menu-title">${esc(title)}</span><span class="menu-description">${esc(descr)}</span><span class="menu-resume">${saves[id]?'RESUME OR NEW GAME':'CHOOSE PLAYERS'}</span></button>`).join('');
 frame(`<section class="menu"><div class="menu-heading"><span class="eyebrow">OFFLINE • FIVE GAMES • 65 CHARACTERS</span><h1>Choose your game</h1><p>Entirely on your phone. All artwork stays in your own separate Assets folder.</p></div><div class="menu-tiles">${tiles}</div><div class="menu-bottom"><span>${folder?'✓ '+esc(folderInfo):'⚠ Connect your separate Assets folder to display portraits'}</span><button class="small-btn" data-nav="settings">Assets &amp; saves</button></div></section>`);}
function settingsView(){frame(`<div class="settings panel"><h1>Assets &amp; saved games</h1><p>Artwork is loaded only from one selected folder on this device. The website never uploads it.</p><div class="button-row"><button data-action="folder" class="primary">Select Assets folder</button><button data-action="reconnect">Reconnect saved folder</button></div><p class="muted">${folder?esc(folderInfo):'No folder currently connected'}</p><div class="button-row"><button data-action="export">Export saved games</button><label class="file-btn">Import saved games<input id="import" type="file" accept="application/json,.json" hidden></label></div><p class="muted">Saves belong to this browser's local storage. Export a backup before clearing Chrome data or moving phones.</p><div class="settings-subhead">Mobile play preferences</div><label>Automatic opponent turns<select id="aiSpeed">${SPEEDS.map(s=>`<option value="${s}" ${aiSpeed===s?'selected':''}>${s==='off'?'Manual':s[0].toUpperCase()+s.slice(1)}</option>`).join('')}</select></label><p class="muted">Automatic turns stop at decisions you must make. Tap the AI button during a game to switch speed or pause. Your unfinished games are saved as before.</p><div class="settings-subhead">Home screen installation</div><p class="muted">In Chrome, open the ⋮ menu and choose Install app or Add to Home screen. Launching from its icon normally removes Chrome's address bar. The game also has its existing double-tap full-screen mode.</p><button data-nav="menu">← Back to games</button></div>`);}
const bgSelect=()=>Object.keys(backgroundFiles).map(n=>`<option ${background===n?'selected':''}>${esc(n)}</option>`).join('');
function rosterGrid(){const sorted=[...roster].sort((a,b)=>(a.full_name||a.asset_name).localeCompare((b.full_name||b.asset_name),'en',{sensitivity:'base'}));const visible=search?sorted.filter(x=>`${x.full_name} ${x.asset_name} ${x.occupation}`.toLowerCase().includes(search.toLowerCase())):sorted.slice(rosterTab*25,rosterTab*25+25);const max=spectator?5:4;return `<div class="tabs">${[0,1,2].map(i=>`<button class="tab ${rosterTab===i&&!search?'active':''}" data-tab="${i}">${i*25+1}–${Math.min((i+1)*25,roster.length)}</button>`).join('')}</div><div class="roster-viewport"><div class="portrait-grid">${visible.map(c=>`<button class="portrait ${selected.includes(c.asset_name)?'picked':''}" data-pick="${esc(c.asset_name)}" ${!selected.includes(c.asset_name)&&selected.length>=max?'disabled':''}><span class="pic"><span class="initial">${esc(c.asset_name.slice(0,2))}</span>${has(filename(c.asset_name))?`<img data-asset="${esc(filename(c.asset_name))}" loading="lazy" alt="">`:''}</span><span class="portrait-name">${esc(c.full_name||c.asset_name)}</span>${selected.includes(c.asset_name)?'<span class="tick">✓</span>':''}</button>`).join('')}</div></div>`;}
function setupView(){const isMemory=mode==='memory';const max=spectator?5:4;
 frame(`<div class="setup"><div class="setup-top"><button class="small-btn" data-nav="menu">← Menu</button><div><span class="eyebrow">${esc(E.MODES[mode])} • New game</span><h1>Choose your opponents</h1></div>${saves[mode]?`<button class="small-btn" data-action="resume">Resume saved game</button>`:''}</div><section class="setup-options panel"><div class="two-cols">${isMemory?`<label>You're playing as<select id="human">${selected.map(n=>`<option value="${esc(n)}" ${n===human?'selected':''}>${esc(display(n))}</option>`).join('')}</select></label>`:`<label>Mode<select id="spectator"><option value="false" ${!spectator?'selected':''}>Play</option><option value="true" ${spectator?'selected':''}>Spectator</option></select></label>`}<label>Scene<select id="background">${bgSelect()}</select></label></div>${!isMemory&&!spectator?`<div class="three-cols"><label>Your name<input id="playerName" maxlength="35" value="${esc(playerName)}"></label><label>Avatar gender<select id="gender"><option value="male" ${gender==='male'?'selected':''}>Male</option><option value="female" ${gender==='female'?'selected':''}>Female</option><option value="neutral" ${gender==='neutral'?'selected':''}>Neutral</option></select></label><label>Confidence<select id="confidence">${[1,2,3,4,5].map(i=>`<option value="${i}" ${i===confidence?'selected':''}>${i} / 5</option>`).join('')}</select></label></div>`:''}</section><section class="roster-panel panel"><div class="roster-heading"><div class="section-title">SELECT CHARACTERS <span>${selected.length} / ${max}</span></div><input id="search" placeholder="Search roster…" value="${esc(search)}" aria-label="Search characters"></div><div id="rosterHere">${rosterGrid()}</div></section><div class="setup-bottom"><span>${selected.map(display).join(' • ')||'Select characters'}</span><button class="primary" data-action="start" ${selected.length<2?'disabled':''}>Start ${esc(E.MODES[mode])}</button></div></div>`);fillAssets();}
function actorName(id){return game?.people.find(p=>p.id===id)?.name||id||'';}
function dialogueText(event,actor=game?.highlight,vars={}){let p=game?.people.find(x=>x.id===actor);if(!p||p.id==='__user__')return '';
 let bank=packs[game.mode],list=null;
 if(game.mode==='memory'){const family=bank?.styleFamilies?.[bank.characterStyles?.[p.asset]||'wry']||'wry';list=bank?.families?.[family]?.[event]||bank?.families?.[family]?.turn;}
 else if(game.mode==='draw'){let profile=bank?.characters?.find(x=>x.asset_name===p.asset);list=profile?.dialogue?.[event];}
 else{list=bank?.characters?.[p.asset]?.events?.[event]||bank?.global_pools?.[event];}
 let line=Array.isArray(list)?list[Math.floor(Math.random()*list.length)]:list;if(typeof line!=='string')return '';
 const pairs={name:p.name,loser:actorName(game?.pending?.loser),target:actorName(game?.pending?.loser),winner:actorName(game?.pending?.chooser),garment:game?.pending?.item||'',total:game?.rolls?.find(r=>r.id===p.id)?.total||'',...vars};return line.replace(/\{([a-z_]+)\}/gi,(full,k)=>pairs[k]===undefined?'':String(pairs[k]));}
function actionBtn(label,action,value='',style=''){return `<button class="${style}" data-go="${action}" data-value="${esc(value)}">${esc(label)}</button>`;}
function choosePenaltyButtons(){const p=game.people.find(x=>x.id===game.pending?.loser);return p?E.allowed(p).map(k=>actionBtn(k==='Naked'?'Next pose':(roster.find(c=>c.asset_name===p.asset)?.clothing?.[k]||k),'pick',k)).join(''):'';}
const playMemory=()=>{const g=game;let html='';if(g.phase==='choose_card'){html=`<p class="guide">${esc(E.memoryCurrent(g).name)} chooses a face-down Memory Card.</p><div class="memory-deck">${g.deck.map((_,i)=>`<button class="memory-card" data-go="flip" data-value="${i}" ${E.memoryCurrent(g).id!==g.human?'disabled':''}>${has('card_back.png')?'<img data-asset="card_back.png" alt="Face-down card">':'🂠'}<small>Card ${i+1}</small></button>`).join('')}</div>`;if(E.memoryCurrent(g).id!==g.human)html+=actionBtn(`Play ${E.memoryCurrent(g).name}'s AI turn`,'ai','','primary');}
 else if(g.phase==='choose_penalty'){const p=g.people.find(x=>x.id===g.pending.loser);const cardFile='MemoryCard_'+p.asset+'.png';html=`<div class="reveal">Revealed: <strong>${esc(p.name)}</strong></div><div class="memory-revealed">${has(cardFile)?`<img data-asset="${esc(cardFile)}" alt="${esc(p.name)} Memory Card">`:`<span>🃏 ${esc(p.name)}</span>`}</div>${g.pending.chooser===g.human?choosePenaltyButtons():actionBtn('Let AI choose a penalty','aiChoose','','primary')}`;}
 else if(g.phase==='apply')html=actionBtn('Apply selected penalty','memoryApply','','primary');else if(g.phase==='memory_continue')html=actionBtn('Next turn','memoryNext','','primary');return html;};
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
function cardArt(c){if(!c)return `<span class="card back">${has('card_back.png')?'<img data-asset="card_back.png" alt="Face-down card">':'🂠'}</span>`;const rankName= c.r===14?'ace':c.r===13?'king':c.r===12?'queen':c.r===11?'jack':String(c.r),suit=['spades','hearts','diamonds','clubs'][c.s];const file=`${rankName}_of_${suit}${c.r>=11&&c.r<=13?'2':''}.png`;
 return `<span class="card ${c.s===1||c.s===2?'red':''}"><span class="card-label">${esc(E.cardLabel(c))}</span>${has(file)?`<img data-asset="${file}" alt="" loading="lazy">`:''}</span>`;}
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
function phaseActions(){if(game.phase==='game_over')return `<div class="winner">🏆 ${esc(game.winner)} wins!</div>`;switch(game.mode){case 'dice':return diceActions();case 'memory':return playMemory();case 'wheel':return wheelActions();case 'holdem':return holdemActions();case 'draw':return drawActions();}}
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
async function drawScene(){
 const cv=$('scene');if(!cv||!game)return;
 const ctx=cv.getContext('2d');const W=cv.width,H=cv.height;
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
function gameView(){if(!game){view='setup';setupView();return;}const g=game;const words=g.dialogue||roster.find(c=>c.asset_name===g.people.find(p=>p.id===g.highlight)?.asset)?.stage_dialogue?.[E.stateOf(g.people.find(p=>p.id===g.highlight)||g.people[0])]||'';
 frame(`<div class="game-screen"><div class="game-top"><button class="small-btn" data-nav="menu">← Menu</button><span class="game-name">${esc(E.MODES[g.mode])} <small>· ${esc(g.phase.replaceAll('_',' '))}</small></span><button class="small-btn" data-action="new">New game</button></div><div class="game-main"><div class="scene-wrap" title="Double-tap scene to toggle toolbars"><canvas id="scene" width="1180" height="590" role="img" aria-label="Current game scene with all players"></canvas><button class="scene-expand" data-action="sceneView" aria-label="View, zoom and save scene image">⛶ View / Save</button></div><section class="game-controls panel"><div class="turn-info"><div class="turn-meta"><span class="eyebrow">ROUND ${g.round||g.handNum||1} · ${esc(g.phase.replaceAll('_',' ').toUpperCase())}</span><button class="ai-switch" data-action="aiSpeedCycle" aria-label="Change automatic AI speed">⚡ ${esc(aiCaption())}</button></div><p class="notice">${esc(g.notice)}</p><div class="turn-hint" role="status">${esc(flowHint(g))}</div></div>${words?`<div class="speech"><b>${esc(actorName(g.highlight))}</b> ${esc(words)}</div>`:''}<div class="actions-scroll">${phaseActions()}${historyPanel(g)}</div></section></div>${participants()}</div>`);drawScene().catch(console.warn);fillAssets();if(g.mode==='wheel')animateWheel();scheduleAuto();}
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
 if(game){let p=game.people.find(p=>p.id===game.highlight);if(p&&(!['diceApply','memoryApply','wheelApply','pokerApply'].includes(window.__sgcAction)||!game.dialogue)){let event=game.phase==='game_over'?'winner':game.mode==='wheel'?(game.segment||'spin'):game.mode==='dice'?'low_single':game.mode==='memory'?'reveal':game.mode==='holdem'?'showdown_lose':'showdown_lose';if(game.mode==='memory'&&['memoryApply','memoryNext'].includes(window.__sgcAction||''))event='after';const line=dialogueText(event,p.id);if(line)game.dialogue=line;}}
 saveGame();render();}catch(err){console.error(err);toast(err.message||String(err));}}
const selectedFile=(ev)=>{const i=+ev;discard.has(i)?discard.delete(i):discard.add(i);render();};
function gameAction(action,value,automated=false){uiAction(()=>{const g=game;if(!g)throw Error('No active game.');if(automated&&autoAction(g)!==action)throw Error('Automatic action is no longer available.');window.__sgcAction=action;if(action==='spin')lastWheelSpinTime=Date.now();switch(action){case'diceRoll':E.diceRoll(g);break;case'diceLoser':E.diceLoser(g,value);break;case'pick':E.penaltyPick(g,value);break;case'diceApply':E.penaltyApply(g);break;case'flip':E.memoryFlip(g,+value);break;case'aiChoose':E.penaltyPick(g,E.allowed(g.people.find(p=>p.id===g.pending.loser)).slice().reverse()[0]);break;case'memoryApply':E.memoryApply(g);break;case'memoryNext':E.memoryNext(g);break;case'spin':E.wheelSpin(g);break;case'wheelNext':E.wheelNext(g);break;case'vote':E.wheelVote(g,value);break;case'target':E.wheelTarget(g,value);break;case'layer':E.wheelLayer(g,value);break;case'recover':E.wheelRecover(g,value);break;case'wheelApply':E.wheelApply(g);break;case'holdemNext':E.holdemNext(g);break;case'exchange':E.drawExchange(g,[...discard]);discard.clear();break;case'showdownPenalty':E.showdownPenalty(g);break;case'pokerApply':E.pokerApply(g);break;case'nextHand':E.nextHand(g);break;case'ai':E.stepAi(g);break;default:throw Error('Unknown game action')}
 if(['diceApply','memoryApply','wheelApply','pokerApply'].includes(action)){const p=g.people.find(x=>x.id===g.highlight),profile=p&&roster.find(c=>c.asset_name===p.asset);if(profile?.stage_dialogue?.[E.stateOf(p)])g.dialogue=profile.stage_dialogue[E.stateOf(p)];}
 });}
function doStart(){uiAction(()=>{if(!folder)toast('Select your Assets folder to display character images.');let settings={selected:[...selected],human:human||selected[0],playerName,gender,confidence,background,spectator};game=E.start(mode,roster,settings);view='game';saveGame();discard.clear();lastSpin=-1;});}
async function exportSaves(){const blob=new Blob([JSON.stringify({format:'compendium-browser-saves-v1',games:saves,options:{selected,human,background}},null,2)],{type:'application/json'});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=`compendium-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(u),2500);}
async function importSaves(file){try{const data=JSON.parse(await file.text());if(data.format!=='compendium-browser-saves-v1'||typeof data.games!=='object')throw Error('Not a Compendium Browser backup.');if(!confirm('Replace existing saved games with the imported backup?'))return;saves=data.games;game=null;view='menu';saveAll();render();toast('Saved games restored.');}catch(err){toast(`Import failed: ${err.message}`);}}
document.addEventListener('click',async event=>{const v=event.target.closest('[data-view-action]');if(v){await sceneViewAction(v.dataset.viewAction);return;}const b=event.target.closest('button,[data-nav],.file-btn');if(!b)return;let nav=b.dataset.nav,act=b.dataset.action,go=b.dataset.go;if(nav){cancelAuto();view=nav;if(nav!=='game'){immersive=false;$('app').classList.remove('immersive');if(document.fullscreenElement===document.documentElement)document.exitFullscreen().catch(()=>{});}render();return;}
 if(b.dataset.open){mode=b.dataset.open;game=saves[mode]||null;view='setup';search='';rosterTab=0;render();return;}
 if(b.dataset.tab!==undefined){rosterTab=+b.dataset.tab;search='';render();return;}
 if(b.dataset.pick){const name=b.dataset.pick;selected=selected.includes(name)?selected.filter(x=>x!==name):selected.length<(spectator?5:4)?[...selected,name]:selected;if(!selected.includes(human))human=selected[0];saveAll();const x=document.querySelector('.roster-viewport');const old=x?.scrollTop||0;setupView();document.querySelector('.roster-viewport')?.scrollTo(0,old);return;}
 if(b.dataset.discard!==undefined){selectedFile(b.dataset.discard);return;}
 if(go){gameAction(go,b.dataset.value);return;}
 if(act==='aiSpeedCycle')return cycleAiSpeed();if(act==='sceneView')return openSceneViewer();if(act==='folder')return selectFolder();if(act==='reconnect')return reconnect();if(act==='start')return doStart();if(act==='resume'){game=saves[mode];view='game';render();return;}if(act==='new'){if(!confirm('Start a new game? Your current game is saved and can be resumed from setup until you replace it.'))return;view='setup';render();return;}
 if(act==='export')exportSaves();});
document.addEventListener('toggle',ev=>{if(ev.target.matches?.('details.recent-log'))historyExpanded=ev.target.open;},true);
document.addEventListener('input',ev=>{if(ev.target.id==='search'){search=ev.target.value;rosterTab=0;const dest=$('rosterHere');if(dest){dest.innerHTML=rosterGrid();fillAssets();}}if(ev.target.id==='playerName')playerName=ev.target.value;});
document.addEventListener('change',ev=>{const el=ev.target;switch(el.id){case'human':human=el.value;break;case'spectator':spectator=el.value==='true';if(selected.length>(spectator?5:4))selected=selected.slice(0,4);render();break;case'gender':gender=el.value;break;case'confidence':confidence=+el.value;break;case'background':background=el.value;break;case'aiSpeed':setAiSpeed(el.value);return;case'import':if(el.files?.[0])importSaves(el.files[0]);break;}saveAll();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAuto();else scheduleAuto();});
window.addEventListener('pagehide',cancelAuto);
window.addEventListener('pageshow',()=>{if(view==='game')scheduleAuto();});
// Accept either GitHub layout: data/characters.json OR characters.json in repository root.
// GitHub's browser uploader often flattens the folder when files are dragged in.
async function loadDataFile(name){
 const errors=[];
 for (const path of [`./data/${name}.json`,`./${name}.json`]){
  try {
   const response=await fetch(path,{cache:'no-store'});
   if (!response.ok){errors.push(`${path}: HTTP ${response.status}`);continue;}
   const body=await response.json();
   return body;
  } catch(err){errors.push(`${path}: ${err.message}`);}
 }
 throw new Error(`Cannot load ${name}.json. Looked in data/ and repository root. ${errors.join(' | ')}`);
}
(async()=>{try{const [characters,dice,wheel,holdem,draw,memory]=await Promise.all(['characters','dice_dialogue','wheel_dialogue','holdem_dialogue','poker_dialogue','memory_dialogue'].map(loadDataFile));
 loadPreferences();roster=characters;for(const c of roster)c.gender=['Kristoff','Bananaman','Jason','Hank','Hulk','Donkey','Homer','Thing','Donald','Captain','Batman','Jack'].includes(c.asset_name)?'male':'female';packs={dice,wheel,holdem,draw,memory};loadSaved();render();
 if('serviceWorker' in navigator)navigator.serviceWorker.register('./service-worker.js',{scope:'./'}).catch(console.warn);
 let h=await dbHandle('load').catch(()=>null);if(h){folder=h;let perm=await h.queryPermission({mode:'read'});if(perm==='granted')await connect(h);else toast('Previously selected folder found. Tap Assets → Reconnect to enable artwork.');}
 }catch(err){console.error(err);$('app').innerHTML=`<section class="fatal">Could not start Compendium: ${esc(err.message)}. Check the uploaded GitHub files. Open the website again after fixing the files.</section>`;}})();
