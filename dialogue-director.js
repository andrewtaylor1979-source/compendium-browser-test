/* Compendium dialogue director v1.3.3.
 * Connects each game action with the correct character-specific event bank.
 * Keeps the speaker distinct from the player highlighted in the scene.
 * Plain JavaScript: no server, no changes to saved-game rules.
 */
const pick = xs => xs[Math.floor(Math.random()*xs.length)];
const pool = (x) => Array.isArray(x) ? x.filter(s=>typeof s==='string'&&s.trim()) : typeof x==='string'&&x.trim() ? [x] : [];
const same = (a,b) => String(a).toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu,'')===String(b).toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const character = (g,id) => (g?.people||[]).find(p=>p.id===id);
const name = (g,id) => character(g,id)?.name||id||'';
const garment = (profile,item) => item==='Naked'?'the next pose':profile?.clothing?.[item]||({T:'top',J:'skirt or trousers',B:'bra',P:'underwear'}[item]||item||'the chosen garment');
export function captureDialogueContext(g,action,value,E){
 const p=g?.pending||{}, mode=g?.mode;
 let actor='';
 try{
  if(mode==='memory')actor=E.memoryCurrent(g)?.id;
  if(mode==='wheel')actor=E.wheelSpinner(g)?.id;
  if(mode==='draw')actor=g.phase==='draw'?E.pokerActor(g)?.id:'';
  if(mode==='rps')actor=E.rpsCurrent(g)?.id;
  if(mode==='mayhem')actor=E.mayhemCurrent(g)?.id;
 }catch(_){}
 return {action,value,mode,phase:g?.phase,actor,chooser:p.chooser,loser:p.loser,
  item:p.item,highlight:g?.highlight,round:g?.round,drawRound:g?.drawRound,
  notice:g?.notice,match:g?.rpsMatch?{...g.rpsMatch}:null,
  turnIndex:g?.turnIndex, discardCount:mode==='draw'&&g?.phase==='draw'?(action==='exchange'&&Array.isArray(value)?value.length:action==='ai'&&actor?E.aiDiscards(character(g,actor).hand).length:null):null};
}
function eventFor(g,prev){
 const a=prev.action, m=g.mode, p=g.pending||{};
 const loser=prev.loser||p.loser, chooser=prev.chooser||p.chooser;
 if(m==='dice'){
  if(a==='diceRoll'){
   const high=g.rolls?.filter(r=>r.total===Math.max(...g.rolls.map(x=>x.total)))||[];
   const low=g.rolls?.filter(r=>r.total===Math.min(...g.rolls.map(x=>x.total)))||[];
   const chooseHigh=Math.random()<.48;
   return chooseHigh?{event:high.length>1?'high_tie':'high_unique',speaker:pick(high)?.id,other:low[0]?.id}:
       {event:low.length>1?'low_tie':'low_single',speaker:pick(low)?.id,other:high[0]?.id};
  }
  if(a==='diceLoser')return {event:'choose_loser',speaker:g.chooser,other:loser};
  if(a==='pick')return {event:'choose_removal',speaker:chooser,other:loser,item:g.pending?.item};
  if(a==='diceApply')return {event:'penalty_reaction',speaker:loser,other:chooser,item:prev.item,penalty:true};
 }
 if(m==='memory'){
  if(a==='flip'||(a==='ai'&&prev.phase==='choose_card')){
   const current=g.pending||{};
   return {event:current.chooser===current.loser?'self':'reveal',speaker:current.chooser,other:current.loser};
  }
  if(a==='memoryShowChoices')return {event:'target',speaker:chooser,other:loser};
  if(a==='aiChoose'||a==='pick')return {event:'target',speaker:chooser,other:loser,item:g.pending?.item};
  if(a==='memoryApply')return {event:'after',speaker:loser,other:chooser,item:prev.item,penalty:true};
  if(a==='memoryNext')return {event:'turn',speaker:character(g,g.turnOrder?.[g.turnIndex])?.id};
 }
 if(m==='wheel'){
  const actor=prev.actor||'';
  if(a==='spin')return {event:g.segment==='safe'?'safe':g.segment?.includes('recover')?'recover':g.segment?.startsWith('self_remove')?'self_remove':g.segment?.includes('remove')?'target_remove':'spin',speaker:actor,other:loser};
  if(a==='recover'||(a==='ai'&&prev.phase==='recover_choice'))return {event:'recover',speaker:actor};
  if(a==='target'||a==='layer'||a==='vote'||(a==='ai'&&['vote','choose_target','choose_target_layer'].includes(prev.phase)))return {event:'target_remove',speaker:actor,other:loser,item:g.pending?.item};
  if(a==='wheelApply')return {event:'target_remove',speaker:chooser||actor,other:loser,item:prev.item,penalty:true};
  if(a==='wheelNext')return {event:'spin',speaker:character(g,g.turnOrder?.[g.turnIndex])?.id};
 }
 if(m==='draw'){
  if(a==='exchange'||(a==='ai'&&prev.phase==='draw')){
   const count=prev.discardCount??0;
   return {event:count===0?'stand_pat':count===1?'draw_one':count===2?'draw_two':'draw_many',speaker:prev.actor};
  }
  if(a==='nextHand')return {event:'deal',speaker:g.people?.find(x=>x.id===g.human)?.id||g.people?.[0]?.id};
 }
 if(m==='holdem'&&a==='holdemNext'){
  const ev=['flop','turn','river'].includes(g.phase)?g.phase:null;
  if(ev)return {event:ev,speaker:pick(g.people.filter(x=>!x.eliminated))?.id};
 }
 if(['draw','holdem'].includes(m)){
  if(['showdownPenalty','holdemNext','exchange','ai'].includes(a)&&g.phase==='showdown_penalty')return {event:'showdown_lose',speaker:loser||g.pending?.loser,other:chooser||g.pending?.chooser};
  if(a==='showdownPenalty'||a==='pick')return {event:'showdown_win',speaker:chooser||g.pending?.chooser,other:loser||g.pending?.loser};
  if(a==='pokerApply')return {event:'showdown_lose',speaker:loser,other:chooser,item:prev.item,penalty:true};
 }
 if(m==='rps'){
  if(a==='rpsBegin'||a==='rpsTarget')return {event:'challenge',speaker:prev.actor,other:g.rpsTarget};
  if(a==='rpsMove'||a==='rpsAi')return g.rpsMatch?.tie?{event:'tie',speaker:g.rpsMatch?.target,other:g.rpsMatch?.challenger}:Math.random()<.55?{event:'win',speaker:g.rpsMatch?.winner,other:g.rpsMatch?.loser}:{event:'lose',speaker:g.rpsMatch?.loser,other:g.rpsMatch?.winner};
  if(a==='rpsReplay')return {event:'challenge',speaker:prev.actor,other:g.rpsTarget};
  if(a==='rpsAiPenalty'||a==='rpsChoose')return {event:'win',speaker:chooser||g.pending?.chooser,other:loser||g.pending?.loser};
  if(a==='rpsApply')return {event:'lose',speaker:loser,other:chooser,item:prev.item,penalty:true};
  if(a==='rpsContinue')return {event:'challenge',speaker:character(g,g.turnOrder?.[g.turnIndex])?.id};
 }
 if(m==='mayhem'){
  if(a==='mayhemBegin'||a==='mayhemContinue')return {event:'intro',speaker:a==='mayhemContinue'?g.turnOrder?.[g.turnIndex]:prev.actor};
  if(a==='mayhemTarget')return {event:'choose_target',speaker:chooser||prev.actor,other:loser||g.pending?.loser};
  if(a==='mayhemAi'&&prev.phase==='mayhem_ai_target')return {event:'chosen_target',speaker:g.pending?.loser,other:g.pending?.chooser};
  if(a==='mayhemAi'&&prev.phase==='mayhem_ai_penalty')return {event:'choose_layer',speaker:chooser,other:loser,item:g.pending?.item};
  if(a==='mayhemPenalty')return {event:'pre_layer',speaker:loser,other:chooser,item:g.pending?.item};
  if(a==='mayhemApply')return {event:'post_layer',speaker:loser,other:chooser,item:prev.item,penalty:true};
 }
 return null;
}
function entries(g,beat,packs){
 const profile=character(g,beat.speaker),asset=profile?.asset,bank=packs[g.mode];
 if(!asset||!bank)return [];
 if(g.mode==='memory'){
  const style=bank.characterStyles?.[asset]||'wry';const family=bank.styleFamilies?.[style]||style;
  const familyLines=pool(bank.families?.[family]?.[beat.event]||bank.families?.[family]?.turn);
  const voice=bank.individualVoices?.[asset];
  const personalKey={turn:'first',self:'lost',reveal:'rival',target:'won',repeat:'revenge',after:'lost',eliminated:'lost',winner:'won'}[beat.event];
  const personal=voice?.[personalKey];
  // Include the desktop's unique voice without repeating its one line every turn.
  return personal?[personal,...familyLines,personal]:familyLines;
 }
 if(g.mode==='rps')return pool(bank.rps_dialogue?.characters?.[asset]?.[beat.event]||bank.rps_dialogue?.global?.[beat.event]);
 if(g.mode==='mayhem')return pool(bank.characters?.find(c=>c.asset_name===asset)?.dialogue?.[beat.event]||bank.player_voices?.[beat.event]);
 if(g.mode==='draw')return pool(bank.characters?.find(c=>c.asset_name===asset)?.dialogue?.[beat.event]);
 return pool(bank.characters?.[asset]?.events?.[beat.event]||bank.global_pools?.[beat.event]);
}
const cap = v => v.charAt(0).toUpperCase()+v.slice(1);
const isPlural = str => /(?:jeans|trousers|pants|shorts|knickers|panties|boxers|leggings|briefs)$/i.test(str||'');
function garmentForPlayer(p,item,roster){
 if(item==='Naked')return 'next pose';
 if(p?.kind==='user')return ({'T':'hoodie','J':'jeans','B':'T-shirt','P':p.gender==='female'?'knickers':p.gender==='neutral'?'underwear':'boxer shorts'})[item]||'clothing layer';
 const c=roster.find(x=>x.asset_name===p?.asset);
 return (c?.clothing?.[item]||({T:'top',J:'trousers',B:'bra',P:'underwear'}[item])||'clothing layer').replace(/^./,m=>m.toLowerCase());
}
function pronouns(p){
 const male=p?.gender==='male';const neutral=p?.gender==='neutral';
 return male?{subject:'he',object:'him',possessive:'his',knows:'knows'}:neutral?{subject:'they',object:'them',possessive:'their',knows:'know'}:{subject:'she',object:'her',possessive:'her',knows:'knows'};
}
function readableState(p,roster,E){
 if(!p)return 'the game continues';
 if(!p.items?.length)return p.eliminated?'the final stage':p.naked>1?'another pose':'now without clothing';
 const items=p.items.map(x=>garmentForPlayer(p,p.kind==='user'?({Hoodie:'T',Jeans:'J','T-Shirt':'B','Boxer Shorts':'P',Knickers:'P',Underwear:'P'}[x]||x):x,roster));
 return items.length?`still wearing ${items.join(' and ')}`:'out of clothing';
}
function renderTemplate(raw,g,beat,prev,roster,E){
 const speaker=character(g,beat.speaker),other=character(g,beat.other),loser=character(g,prev.loser||g.pending?.loser),chooser=character(g,prev.chooser||g.pending?.chooser);
 // Garment and body references describe the person being penalised, NOT
 // automatically the speaker or the target of the most recent UI highlight.
 const affected=loser|| (beat.penalty?speaker:other) || speaker;
 const item=beat.item||prev.item||g.pending?.item||'T';
 const piece=garmentForPlayer(affected,item,roster),plural=isPlural(piece),thePiece=`the ${piece}`;
 const move=g.rpsMatch||{},asChallenger=move.challenger===speaker?.id;
 const myMove=asChallenger?move.cMove:move.tMove,otherMove=asChallenger?move.tMove:move.cMove;
 const target=other||loser||chooser;
 const pro=pronouns(target),sp=pronouns(speaker),f=affected?.gender==='female';
 const top=f?'breasts':'chest';
 const vars={
  name:speaker?.name||'',target:target?.name||'',loser:loser?.name||target?.name||'',winner:chooser?.name||'',chooser:chooser?.name||'',
  garment:piece,the_garment:thePiece,my_garment:`my ${piece}`,
  garment_go:plural?'go':'goes',garment_come:plural?'come':'comes',there_go:plural?'there go':'there goes',
  garment_comes_come:plural?'come':'comes',garment_goes_go:plural?'go':'goes',garment_is_are:plural?'are':'is',garment_be:plural?'are':'is',
  garment_pronoun:plural?'they':'it',garment_demonstrative:plural?'those':'that',
  garment_demonstrative_cap:plural?'Those':'That',
  decision_subject:sp.subject==='they'?'they':cap(sp.subject),
  target_possessive:pro.possessive,target_object:pro.object,target_subject:pro.subject,target_subject_cap:cap(pro.subject),target_possessive_cap:cap(pro.possessive),target_knows_know:pro.knows,
  state:readableState(affected,roster,E),self_state:readableState(speaker,roster,E),target_state:readableState(target,roster,E),
  move:myMove||'rock',other_move:otherMove||'paper',
  total:g.rolls?.find(r=>r.id===speaker?.id)?.total||'the roll',other_low:name(g,g.low?.[0]),
  top,top_word:top,own_top:top,target_top:target?.gender==='female'?'breasts':'chest',
  bottom:'backside',bottom_word:'backside',own_bottom:'backside',target_bottom:'backside',
  genital:'body',genital_word:'body',own_genital:'body',target_genital:'body',
  body:'body',body_is_are:'is',body_that_those:'that',
  top_is_are:f?'are':'is',top_was_were:f?'were':'was',genital_is_are:'is',genital_deserves_deserve:'deserves',
  pose:'the next pose',self_pose:'the current pose',target_pose:'the next pose',
  swear:'Bloody hell',interjection:'Oh, bloody hell',consequence:'another clothing layer gone',
 };
 const result=String(raw).replace(/\{([a-z_]+)\}/gi,(whole,k)=>{
  if(Object.hasOwn(vars,k.toLowerCase())){
   const v=String(vars[k.toLowerCase()]);
   return /^[A-Z]/.test(k)?cap(v):v;
  }
  // Never quietly delete an unknown token: leave it visible for QA to catch.
  return whole;
 });
 // Small grammar repair for plural jeans/trousers in older dialogue banks.
 return result.replace(/\bThat (jeans|trousers|shorts|knickers|pants|panties|leggings)\b/gi,'Those $1')
              .replace(/\bThere goes (the|my|your) (jeans|trousers|shorts|knickers|pants|panties|leggings)\b/gi,'There go $1 $2')
              .replace(/\bthe the\b/gi,'the').replace(/\s+([,.!?])/g,'$1').trim();
}
function naturalStage(g,beat,roster,E){
 if(!beat.penalty)return '';
 const p=character(g,beat.speaker)||character(g,beat.other);
 const c=roster.find(x=>x.asset_name===p?.asset);
 return (c?.stage_dialogue?.[E.stateOf(p)]||'').trim();
}
export function directDialogue(g,prev,packs,roster,E){
 if(!g||g.mode==='one')return null;
 let beat=eventFor(g,prev);
 if(g.phase==='game_over'){
  const winId=g.people?.find(p=>p.name===g.winner)?.id;
  if(winId)beat={event:'winner',speaker:winId};
 }
 if(!beat||!beat.speaker)return null;
 const p=character(g,beat.speaker);
 if(!p||p.kind==='user'||p.id==='__user__'){
  // When the human's character would speak, prefer the affected AI.
  if(!beat.other||!character(g,beat.other)||character(g,beat.other).kind==='user')return null;
  beat={...beat,speaker:beat.other,other:beat.speaker,
   event:g.mode==='dice'?(prev.action==='diceRoll'?'low_single':'penalty_reaction'):g.mode==='memory'?'after':g.mode==='mayhem'?'chosen_target':g.mode==='rps'?'challenged':beat.event};
 }
 const subject=character(g,beat.speaker);
 const source=roster.find(c=>c.asset_name===subject.asset);
 const format=(str)=>renderTemplate(str,g,beat,prev,roster,E);
 let choices=entries(g,beat,packs);
 g.dialogueRecents??={};const recent=(g.dialogueRecents[subject.id]||[]).slice(-6);
 let fresh=choices.filter(s=>!recent.some(old=>same(old,format(s))));
 if(!fresh.length)fresh=choices;
 let line=fresh.length?format(pick(fresh)):'';
 // On genuine clothing changes, preserve the opponent's own authored response
 // but don't overwrite game-specific speech every single time.
 const stage=naturalStage(g,beat,roster,E);
 if(stage){if(!line||Math.random()<.40)line=stage;else if(line.length+stage.length<240&&Math.random()<.42)line=`${line} ${stage}`;}
 if(!line)return null;
 if(recent.some(old=>same(old,line))&&stage&&!same(stage,line))line=stage;
 g.dialogueRecents[subject.id]=[...recent,line].slice(-6);
 return {speaker:subject.name,id:subject.id,event:beat.event,text:line};
}
