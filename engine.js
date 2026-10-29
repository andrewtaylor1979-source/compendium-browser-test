/* Strip Games Compendium: local browser-native game mechanics.
   Adapted from the Python Dice, Strip Memory, Wheel, Poker and Hold'em engines.
   No network, Python, server or assets are needed for the core state machine. */
export const NAKED=['Naked','Naked2','Naked3','Naked4','Naked5'];
export const OUTFITS=['TJBP','JBP','TBP','JP','TB','BP','B','P'];
export const WHEEL_SEGMENTS=['self_remove','target_remove','safe','self_remove','recover','target_remove','self_remove_two','safe','target_remove','self_remove','safe','recover','self_remove_two','target_remove','self_remove','safe'];
export const WHEEL_LABEL={self_remove:'REMOVE 1',target_remove:'CHOOSE 1',safe:'SAFE',recover:'RECOVER 1',self_remove_two:'REMOVE 2'};
export const MODES={dice:'Dice',memory:'Strip Memory',wheel:'Wheel of Misfortune',holdem:"Strip Hold’em",draw:'Five-Card Draw',one:'One-on-One',rps:'Rock–Paper–Scissors',mayhem:'Mayhem'};
const OPP=['T','J','B','P'];
const DEPS={B:'T',P:'J','T-Shirt':'Hoodie','Boxer Shorts':'Jeans',Knickers:'Jeans',Underwear:'Jeans'};
const USER_MAP={Hoodie:'T',Jeans:'J','T-Shirt':'B','Boxer Shorts':'P',Knickers:'P',Underwear:'P'};
const rand=n=>Math.floor(Math.random()*n);
const choice=a=>a[rand(a.length)];
const shuffle=a=>{for(let i=a.length-1;i>0;i--){let j=rand(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
const uniq=a=>[...new Set(a)];
const compare=(a,b)=>{for(let i=0;i<Math.max(a.length,b.length);i++){let x=a[i]||0,y=b[i]||0;if(x!==y)return x-y;}return 0};
export function stateOf(p){if(p.items.length){const s=p.kind==='user'?p.items.map(x=>USER_MAP[x]||x):p.items;return OPP.filter(k=>s.includes(k)).join('');}return NAKED[Math.max(0,Math.min(4,(p.naked||1)-1))]}
export function allowed(p){if(p.eliminated)return [];if(!p.items.length)return p.naked<5?['Naked']:[];return p.items.filter(k=>!DEPS[k]||!p.items.includes(DEPS[k]));}
export function recoveries(p){if(p.eliminated)return [];if(!p.items.length&&p.naked>1)return ['__POSE_BACK__'];const initial=p.kind==='user'?['Hoodie','Jeans','T-Shirt',p.gender==='female'?'Knickers':p.gender==='neutral'?'Underwear':'Boxer Shorts']:OPP;
return initial.filter(k=>!p.items.includes(k)&&(()=>{const trial=[...p.items,k];if(p.kind!=='user')return OUTFITS.includes(OPP.filter(x=>trial.includes(x)).join(''));return !Object.entries(DEPS).some(([under,outer])=>outer===k&&!trial.includes(under));})());}
export function remove(p,k){if(!allowed(p).includes(k))throw Error('That clothing or pose step is not available.');if(k==='Naked'){p.naked=Math.min(5,(p.naked||1)+1);if(p.naked===5)p.eliminated=true;}else{p.items.splice(p.items.indexOf(k),1);if(!p.items.length)p.naked=1;}return stateOf(p)}
export function recover(p,k){if(!recoveries(p).includes(k))throw Error('That recovery is not available.');if(k==='__POSE_BACK__')p.naked-=1;else{p.items.push(k);p.naked=0;}}
export function makePlayer(c,user=false,opts={}){return {id:user?'__user__':c.asset_name,name:user?(opts.playerName||'Player'):(c.full_name||c.asset_name),asset:user?(opts.avatar||c.asset_name):c.asset_name,kind:user?'user':'opponent',gender:user?(opts.gender||'male'):(c.gender||'female'),confidence:user?(+opts.confidence||3):(+c.confidence_level||3),items:user?['Hoodie','Jeans','T-Shirt',(opts.gender==='female'?'Knickers':opts.gender==='neutral'?'Underwear':'Boxer Shorts')]:[...OPP],naked:0,eliminated:false,hand:[]}}
const active=g=>g.people.filter(p=>!p.eliminated);
const byId=(g,id)=>g.people.find(p=>p.id===id);
const win=g=>{const a=active(g);if(a.length===1){g.phase='game_over';g.winner=a[0].name;return true;}return false};
export const start=(mode,profiles,settings={})=>{
 if(mode==='one')return startOne(profiles,settings);
 const names=uniq(settings.selected||[]);if(names.length<2||names.length>5)throw Error('Choose between 2 and 5 roster characters.');
 const by=new Map(profiles.map(c=>[c.asset_name,c]));if(names.some(n=>!by.has(n)))throw Error('Character not in the roster.');
 let people;
 if(mode==='memory')people=names.map(n=>makePlayer(by.get(n)));
 else if(settings.spectator)people=names.map(n=>makePlayer(by.get(n)));
 else {if(names.length>4)throw Error('A player plus at most four opponents can take part.');const candidates=profiles.filter(p=>!names.includes(p.asset_name));const gender=settings.gender||'male';const avatar= settings.avatar || (candidates.find(c=>(['male','female'].includes(gender))?c.gender===gender:false)?.asset_name) || 'Kristoff';people=[makePlayer(by.get(names[0]),true,{...settings,avatar}),...names.map(n=>makePlayer(by.get(n)))];}
 const g={version:1,mode,people,human:mode==='memory'?(settings.human||names[0]):settings.spectator?'':'__user__',settings,round:0,phase:'ready',notice:'New game ready.',dialogue:'',speaker:'',winner:'',highlight:'',pending:null,rolls:[],showdown:[],board:[],revealed:0,handNum:0,drawRound:1,disc:[],deck:[],actorIndex:0,turnOrder:shuffle(people.map(p=>p.id)),turnIndex:0,wheelIndex:-1,spinAngle:0,votes:{},voteOrder:[],voteIndex:0,removeLeft:0,stats:{}};
 if(mode==='memory'){g.phase='choose_card';g.turnOrder=shuffle(people.map(p=>p.id));g.deck=shuffle(people.map(p=>p.id));g.round=1;}
 if(mode==='wheel'){g.phase='ready';g.turnOrder=people.map(p=>p.id);}
 if(mode==='rps'){g.phase='rps_ready';g.turnOrder=people.map(p=>p.id);g.rpsTargets={};}
 if(mode==='mayhem'){g.phase='mayhem_turn';g.turnOrder=shuffle(people.map(p=>p.id));g.mayhemTargets={};}
 if(mode==='holdem'||mode==='draw')deal(g);
 return g;
};
const note=(g,msg,target='',line='',speaker='')=>{g.notice=msg;g.highlight=target;g.dialogue=line;g.speaker=speaker;};
function setPenalty(g,chooser,loser,extra={}){g.pending={chooser,loser,item:null,...extra};g.phase=(chooser===g.human&&allowed(byId(g,loser)).length>1)?'choose_penalty':'apply';if(g.phase==='apply')g.pending.item=choice(allowed(byId(g,loser)).slice().reverse().slice(0,2));}
export function diceRoll(g){if(!['ready','between_rounds'].includes(g.phase))throw Error('Finish the existing round first.');g.round++;g.rolls=active(g).map(p=>({id:p.id,name:p.name,die1:rand(6)+1,die2:rand(6)+1}));g.rolls.forEach(r=>r.total=r.die1+r.die2);const max=Math.max(...g.rolls.map(r=>r.total));const min=Math.min(...g.rolls.map(r=>r.total));const highs=g.rolls.filter(r=>r.total===max).map(r=>r.id);const lows=g.rolls.filter(r=>r.total===min).map(r=>r.id);g.chooser=choice(highs);g.low= lows.length>1?lows.filter(id=>id!==g.chooser):lows;if(!g.low.length)g.low=lows;g.pending=null;
 if(g.low.length>1&&g.chooser===g.human){g.phase='choose_loser';note(g,`${byId(g,g.chooser).name} rolled highest (${max}). Choose who takes the lowest-roll penalty.`);}
 else{const loser=choice(g.low);setPenalty(g,g.chooser,loser);note(g,`${byId(g,loser).name} rolled lowest (${min}). ${byId(g,g.chooser).name} chooses the penalty.`,loser);}
}
export function diceLoser(g,id){if(g.phase!=='choose_loser'||!g.low.includes(id))throw Error('Choose a tied-low player.');setPenalty(g,g.chooser,id);note(g,`${byId(g,id).name} has been selected for the penalty.`,id);}
export function penaltyPick(g,k){if(g.phase!=='choose_penalty')throw Error('A penalty choice is not pending.');const p=byId(g,g.pending.loser);if(!allowed(p).includes(k))throw Error('Invalid clothing choice.');g.pending.item=k;g.phase='apply';note(g,`${byId(g,g.pending.chooser).name} chose ${k==='Naked'?'the next pose':k} for ${p.name}.`,p.id);}
export function penaltyApply(g){if(g.phase!=='apply')throw Error('No penalty ready.');const p=byId(g,g.pending.loser),k=g.pending.item;const s=remove(p,k);note(g,`${p.name}: ${k==='Naked'?'next pose':k} → ${s}${p.eliminated?' — eliminated':''}.`,p.id);g.pending=null;if(!win(g))g.phase='between_rounds';}
export function memoryCurrent(g){return byId(g,g.turnOrder[g.turnIndex]);}
export function memoryFlip(g,slot){if(g.phase!=='choose_card')throw Error('Finish the existing turn first.');if(slot<0||slot>=g.deck.length)throw Error('Invalid card slot.');const actor=memoryCurrent(g),target=byId(g,g.deck[slot]);g.pending={chooser:actor.id,loser:target.id,slot,item:null};g.phase='card_revealed';note(g,`${actor.name} revealed ${target.name}${actor.id===target.id?' (their own card)':''}.`,target.id);}
export function memoryRevealContinue(g){if(g.phase!=='card_revealed'||!g.pending)throw Error('Reveal a card first.');g.phase='choose_penalty';const actor=byId(g,g.pending.chooser),target=byId(g,g.pending.loser);note(g,`${actor.name} now chooses a penalty for ${target.name}.`,target.id);}
export function memoryChoose(g,k){penaltyPick(g,k);g.phase='apply';}
export function memoryApply(g){penaltyApply(g);if(g.phase==='between_rounds')g.phase='memory_continue';}
export function memoryNext(g){if(g.phase!=='memory_continue')throw Error('Finish the previous turn.');g.round++;const living=active(g).map(p=>p.id);const prev=g.turnOrder[g.turnIndex];let next=g.turnOrder.indexOf(prev);for(let i=0;i<g.turnOrder.length;i++){next=(next+1)%g.turnOrder.length;if(living.includes(g.turnOrder[next]))break;}g.turnIndex=next;g.deck=shuffle([...living]);g.phase='choose_card';note(g,`Turn ${g.round}: ${memoryCurrent(g).name} chooses a face-down card.`);}
export function memoryAi(g){if(g.phase!=='choose_card')throw Error('Not ready for an AI turn.');if(memoryCurrent(g).id===g.human)throw Error('This is your turn.');memoryFlip(g,rand(g.deck.length));}
export function wheelSpinner(g){return byId(g,g.turnOrder[g.turnIndex]);}
export function wheelNext(g){if(g.phase!=='between_turns')throw Error('Resolve the wheel result first.');if(win(g))return;g.turnIndex=(g.turnIndex+1)%g.turnOrder.length;while(wheelSpinner(g).eliminated)g.turnIndex=(g.turnIndex+1)%g.turnOrder.length;g.phase='ready';note(g,`${wheelSpinner(g).name} is up next. Spin the wheel.`);}
export function wheelSpin(g){if(g.phase!=='ready')throw Error('Wheel is not ready.');const spinner=wheelSpinner(g);g.round++;g.wheelIndex=rand(16);const key=WHEEL_SEGMENTS[g.wheelIndex];g.segment=key;g.spinAngle=(g.spinAngle||0)+(5+rand(3))*360+(16-g.wheelIndex)*22.5;g.pending=null;g.removeLeft=key==='self_remove_two'?2:1;
 if(key==='safe'){g.phase='between_turns';note(g,`${spinner.name} is SAFE. No clothing changes.`,spinner.id);}
 else if(key==='recover'){if(recoveries(spinner).length){g.phase='recover_choice';note(g,`${spinner.name} may recover exactly one clothing or pose step.`,spinner.id);}else{g.phase='between_turns';note(g,`${spinner.name} is fully dressed — recovery counts as SAFE.`,spinner.id);}}
 else if(key==='target_remove'){g.phase='choose_target';note(g,`${spinner.name} must choose a different player to lose one layer.`,spinner.id);}
 else{g.pending={chooser:spinner.id,loser:spinner.id};wheelVoteInit(g);note(g,`${spinner.name} must remove ${g.removeLeft} layer${g.removeLeft===2?'s':''}. Other players vote on the penalty.`,spinner.id);}
}
function wheelVoteInit(g){g.votes={};g.voteOrder=active(g).filter(p=>p.id!==g.pending.loser).map(p=>p.id);g.voteIndex=0;g.phase='vote';}
export function wheelVoter(g){return g.voteOrder[g.voteIndex]||null;}
export function wheelVote(g,item){if(g.phase!=='vote')throw Error('No vote underway.');const p=byId(g,g.pending.loser);if(!allowed(p).includes(item))throw Error('Invalid vote.');const voter=wheelVoter(g);g.votes[voter]=item;g.voteIndex++;
 if(g.voteIndex>=g.voteOrder.length){const counts={};Object.values(g.votes).forEach(k=>counts[k]=(counts[k]||0)+1);const max=Math.max(...Object.values(counts));g.pending.item=choice(Object.keys(counts).filter(k=>counts[k]===max));g.phase='apply';note(g,`Votes counted: ${p.name} must remove ${g.pending.item}.`,p.id);}
 else note(g,`${byId(g,voter).name} voted for ${item}. ${byId(g,wheelVoter(g)).name} votes next.`,p.id);
}
export function wheelTarget(g,id){if(g.phase!=='choose_target'||id===wheelSpinner(g).id||!active(g).some(p=>p.id===id))throw Error('Choose another active player.');g.pending={chooser:wheelSpinner(g).id,loser:id};g.phase='choose_target_layer';note(g,`${byId(g,id).name} has been targeted. Choose which layer they lose.`,id);}
export function wheelLayer(g,k){if(g.phase!=='choose_target_layer')throw Error('Choose the target first.');if(!allowed(byId(g,g.pending.loser)).includes(k))throw Error('Invalid layer.');g.pending.item=k;g.phase='apply';note(g,`${wheelSpinner(g).name} chose ${k} for ${byId(g,g.pending.loser).name}.`,g.pending.loser);}
export function wheelRecover(g,k){if(g.phase!=='recover_choice')throw Error('No recovery pending.');const p=wheelSpinner(g);recover(p,k);g.phase='between_turns';note(g,`${p.name} recovered one step and is now ${stateOf(p)}.`,p.id);}
export function wheelApply(g){if(g.phase!=='apply')throw Error('No Wheel penalty pending.');const p=byId(g,g.pending.loser),k=g.pending.item;remove(p,k);note(g,`${p.name} lost ${k==='Naked'?'the next pose':k} → ${stateOf(p)}${p.eliminated?' — eliminated':''}.`,p.id);g.pending=null;if(win(g))return;
 if(g.segment==='self_remove_two'||g.segment==='self_remove'){g.removeLeft--;if(g.removeLeft>0&&!p.eliminated){g.pending={chooser:wheelSpinner(g).id,loser:p.id};wheelVoteInit(g);g.notice+=' Second removal: a new vote begins.';return;}}
 g.phase='between_turns';}
const SUITS=['♠','♥','♦','♣'];
const RANKS=['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
export const cardLabel=c=>c?(RANKS[(c.r-2)]+SUITS[c.s]):'??';
export const pokerDeck=()=>shuffle(Array.from({length:52},(_,i)=>({r:2+Math.floor(i/4),s:i%4})));
function straightHigh(rs){const u=uniq(rs).sort((a,b)=>b-a);if(u.includes(14))u.push(1);for(let i=0;i<=u.length-5;i++)if(u[i]-u[i+4]===4)return u[i];return 0}
export function rank5(cards){if(cards.length!==5)throw Error('Five cards required.');const rs=cards.map(c=>c.r).sort((a,b)=>b-a),freq={};rs.forEach(r=>freq[r]=(freq[r]||0)+1);const groups=Object.keys(freq).map(Number).sort((a,b)=>freq[b]-freq[a]||b-a);const flush=cards.every(c=>c.s===cards[0].s),straight=straightHigh(rs);let key,label;
 if(flush&&straight){key=[8,straight];label=straight===14&&rs.includes(10)?'Royal Flush':'Straight Flush';}
 else if(freq[groups[0]]===4){key=[7,groups[0],groups[1]];label='Four of a Kind';}
 else if(freq[groups[0]]===3&&freq[groups[1]]===2){key=[6,groups[0],groups[1]];label='Full House';}
 else if(flush){key=[5,...rs];label='Flush';}
 else if(straight){key=[4,straight];label='Straight';}
 else if(freq[groups[0]]===3){key=[3,groups[0],...groups.slice(1)];label='Three of a Kind';}
 else if(freq[groups[0]]===2&&freq[groups[1]]===2){let ps=groups.filter(r=>freq[r]===2).sort((a,b)=>b-a),k=groups.find(r=>freq[r]===1);key=[2,...ps,k];label='Two Pair';}
 else if(freq[groups[0]]===2){key=[1,groups[0],...groups.slice(1)];label='One Pair';}
 else{key=[0,...rs];label='High Card';}
 return {key,label};}
export function rank7(cards){if(cards.length<5)throw Error('At least five cards required.');let best=null;for(let a=0;a<cards.length-4;a++)for(let b=a+1;b<cards.length-3;b++)for(let c=b+1;c<cards.length-2;c++)for(let d=c+1;d<cards.length-1;d++)for(let e=d+1;e<cards.length;e++){const r=rank5([cards[a],cards[b],cards[c],cards[d],cards[e]]);if(!best||compare(r.key,best.key)>0)best=r;}return best;}
export function deal(g){if(!['holdem','draw'].includes(g.mode))throw Error('Not a poker game.');if(active(g).length<2){win(g);return;}
 g.handNum++;g.deck=pokerDeck();g.pending=null;g.showdown=[];g.disc=[];g.board=[];g.revealed=0;g.actorIndex=0;g.drawRound=1;g.turnOrder=active(g).map(p=>p.id);for(const p of active(g))p.hand=[];
 const cardsPer=g.mode==='holdem'?2:5;for(let i=0;i<cardsPer;i++)for(const p of active(g))p.hand.push(g.deck.pop());
 if(g.mode==='holdem'){g.board=Array.from({length:5},()=>g.deck.pop());g.phase='preflop';note(g,`Hold’em hand ${g.handNum} dealt. Reveal the flop.`);}else{g.phase='draw';note(g,`Five-Card Draw hand ${g.handNum}. Exchange round 1 of 2.`);}
}
export function holdemNext(g){const stages={preflop:['flop',3],flop:['turn',4],turn:['river',5],river:['showdown',5]};const s=stages[g.phase];if(!s)throw Error('Complete the previous Hold’em action.');g.phase=s[0];g.revealed=s[1];note(g, g.phase==='showdown'?'Reveal hands and compare their five-card combinations.':`${g.phase.toUpperCase()} revealed — ${g.revealed} community cards are visible.`);if(g.phase==='showdown')showdown(g);}
export function pokerActor(g){return byId(g,g.turnOrder[g.actorIndex]);}
export function aiDiscards(cards){const value=rank5(cards);if(value.key[0]>=4)return [];const counts={};cards.forEach(c=>counts[c.r]=(counts[c.r]||0)+1);const keep=cards.map((c,i)=>({c,i})).filter(({c})=>counts[c.r]>=2).map(x=>x.i);
 if(keep.length)return [0,1,2,3,4].filter(i=>!keep.includes(i));const suitCounts={};cards.forEach(c=>suitCounts[c.s]=(suitCounts[c.s]||0)+1);let suit=Object.keys(suitCounts).find(s=>suitCounts[s]===4);if(suit!==undefined)return cards.map((c,i)=>c.s!=suit?i:-1).filter(x=>x>=0);return [0,1,2].filter(i=>cards[i].r<12);}
// Every replaced card enters a discard pile. In a five-player game, the 27
// remaining cards are enough for the first draw (at most 25 replacements).
// Before the second draw, recycle only round-one discards into the deck.
// Discards made during the second draw stay out of play until the next hand.
// This also keeps a full 52-card deck valid throughout both draw rounds.
const cardKey=c=>`${c.r}:${c.s}`;
function repairLegacyDrawDeck(g,needed){
 if(g.deck.length>=needed)return;
 // v1.0-v1.1 omitted the discard pile entirely. An unfinished saved game
 // from those releases can therefore run out of cards during round two.
 // Recover only cards NOT currently in any live hand or the draw deck.
 const inPlay=new Set([...g.deck,...active(g).flatMap(p=>p.hand)].map(cardKey));
 const available=pokerDeck().filter(c=>!inPlay.has(cardKey(c)));
 const shortfall=needed-g.deck.length;
 if(available.length<shortfall)throw Error('Unable to recover enough distinct cards for this draw.');
 shuffle(available);
 g.deck.push(...available.slice(0,shortfall));
 g.drawDeckRecovered=true;
}
export function drawExchange(g,indices){
 if(g.phase!=='draw')throw Error('Not in an exchange round.');
 if(!Array.isArray(indices))throw Error('Invalid discard selection.');
 const p=pokerActor(g);
 if(!p)throw Error('No player is available for this exchange.');
 const ids=uniq(indices.map(Number)).sort((a,b)=>a-b);
 if(ids.some(i=>!Number.isInteger(i)||i<0||i>=p.hand.length))throw Error('Invalid discard selection.');
 repairLegacyDrawDeck(g,ids.length);
 if(!Array.isArray(g.disc))g.disc=[]; // older saved games
 ids.forEach(i=>{const removed=p.hand[i];p.hand[i]=g.deck.pop();g.disc.push(removed);});
 note(g,`${p.name} ${ids.length?'exchanged '+ids.length+' card'+(ids.length>1?'s':''):'stood pat'} — round ${g.drawRound}.`,p.id);
 g.actorIndex++;
 if(g.actorIndex===g.turnOrder.length){
  if(g.drawRound===1){
   g.drawRound=2;g.actorIndex=0;
   // No second-round card may be dealt until all first-round players finish.
   g.deck.push(...g.disc);g.disc=[];shuffle(g.deck);
   note(g,`Round 1 finished. Begin second and final exchange round.`);
  }else {g.phase='showdown';showdown(g);}
 }
}
export function showdown(g){if(g.phase!=='showdown')throw Error('Cards must be revealed first.');g.showdown=active(g).map(p=>({id:p.id,name:p.name,rank:g.mode==='holdem'?rank7([...p.hand,...g.board]):rank5(p.hand)}));const sorted=[...g.showdown].sort((a,b)=>compare(a.rank.key,b.rank.key));const low=sorted.filter(x=>compare(x.rank.key,sorted[0].rank.key)===0);const high=sorted.filter(x=>compare(x.rank.key,sorted.at(-1).rank.key)===0);const loser=choice(low);const candidates=high.filter(p=>p.id!==loser.id);const chooser=choice(candidates.length?candidates:sorted.filter(p=>p.id!==loser.id));g.pending={loser:loser.id,chooser:chooser.id,item:null};g.phase='showdown_penalty';note(g,`${loser.name} has the weakest hand (${loser.rank.label}). ${chooser.name} has the highest hand and chooses the penalty.`,loser.id);}
export function showdownPenalty(g){if(g.phase!=='showdown_penalty')throw Error('Resolve the showdown first.');const p=byId(g,g.pending.loser),opts=allowed(p);if(!opts.length)throw Error('No legal penalty.');g.phase=g.pending.chooser===g.human&&opts.length>1?'choose_penalty':'apply';if(g.phase==='apply')g.pending.item=choice(opts.slice().reverse().slice(0,2));note(g,`${byId(g,g.pending.chooser).name} chooses ${p.name}'s penalty.`,p.id);}
export function pokerApply(g){penaltyApply(g);if(g.phase==='between_rounds')g.phase='between_hands';}
export function nextHand(g){if(g.phase!=='between_hands')throw Error('Resolve the penalty first.');deal(g)}
export function stepAi(g){if(g.mode==='memory'&&g.phase==='choose_card'&&memoryCurrent(g).id!==g.human){memoryAi(g);return true;}
 if(g.mode==='wheel'){
  if(g.phase==='vote'&&wheelVoter(g)!==g.human){wheelVote(g,choice(allowed(byId(g,g.pending.loser))));return true;}
  if(g.phase==='choose_target'&&wheelSpinner(g).id!==g.human){wheelTarget(g,choice(active(g).filter(p=>p.id!==wheelSpinner(g).id)).id);return true;}
  if(g.phase==='choose_target_layer'&&wheelSpinner(g).id!==g.human){wheelLayer(g,choice(allowed(byId(g,g.pending.loser)).slice().reverse().slice(0,2)));return true;}
  if(g.phase==='recover_choice'&&wheelSpinner(g).id!==g.human){wheelRecover(g,choice(recoveries(wheelSpinner(g))));return true;}
 }
 if(g.mode==='draw'&&g.phase==='draw'&&pokerActor(g).id!==g.human){drawExchange(g,aiDiscards(pokerActor(g).hand));return true;}
 return false;}


// Private Booth: single-opponent experience. Shares the exact clothing and pose
// progression of the five competitive game engines; no separate image formats.
export function startOne(profiles, settings={}) {
 const id=settings.selected?.[0];
 const c=profiles.find(x=>x.asset_name===id);
 if(!c)throw Error('Choose one opponent from the roster.');
 const p=makePlayer(c);
 return {version:2,mode:'one',people:[p],human:'__user__',settings,
  phase:'interact',round:1,notice:`${p.name} joins you in the private booth.`,
  dialogue:'',speaker:p.name,highlight:p.id,winner:'',pending:null,
  history:[],one:{talks:0,lastLine:'',lastStyle:'',lastLines:[],lastItem:'',order:[]}};
}
export function oneInteract(g, style, line) {
 if(g.mode!=='one'||g.phase!=='interact')throw Error('No private-booth conversation is active.');
 if(!['tease','compliment','challenge'].includes(style))throw Error('Choose an interaction.');
 g.one??={talks:0,lastLines:[]};g.one.talks++;
 g.one.lastStyle=style;
 g.notice=style==='tease'?'A playful tease.':style==='compliment'?'A thoughtful compliment.':'A confident challenge.';
 g.dialogue=String(line||'').slice(0,800);g.speaker=g.people[0].name;
 g.highlight=g.people[0].id;
}
export function oneAdvance(g, item, line) {
 if(g.mode!=='one'||g.phase!=='interact')throw Error('The private-booth scene has ended.');
 const p=g.people[0];
 // The visitor chooses any legal garment. The same dependency rules apply
 // as in the multiplayer games: a top must precede a bra; jeans precede pants.
 // Only the next pose is offered after every garment is gone.
 const options=allowed(p);
 if(!options.includes(item))throw Error('Choose one of the available clothing options.');
 const state=remove(p,item);g.round++;
 g.one.lastItem=item;
 g.one.order??=[];g.one.order.push({item,stage:state});
 g.notice=p.eliminated?`${p.name} has reached the final pose. Session complete.`:
   `${p.name} moves to ${state}.`;
 g.dialogue=String(line||'').slice(0,1200);
 g.speaker=p.name;g.highlight=p.id;
 if(p.eliminated){g.phase='game_over';g.winner=p.name;}
 return {item,state,finished:p.eliminated};
}

// Strip Showdown / Rock-Paper-Scissors — challenge-driven adaptation of
// ShowdownEngine (user moves are never chosen by the automatic AI scheduler).
export const RPS_MOVES=['Rock','Paper','Scissors'];
const rpsBeats={Rock:'Scissors',Paper:'Rock',Scissors:'Paper'};
const rpsActor=g=>byId(g,g.turnOrder[g.turnIndex]);
export function rpsCurrent(g){return rpsActor(g);}
function rpsNextTurn(g){
 if(win(g))return;
 let index=g.turnIndex;
 for(let i=0;i<g.turnOrder.length;i++){
  index=(index+1)%g.turnOrder.length;
  if(!byId(g,g.turnOrder[index]).eliminated)break;
 }
 g.turnIndex=index;g.pending=null;g.rpsMatch=null;g.rpsTarget=null;g.phase='rps_ready';
 note(g,`${rpsActor(g).name} will choose an opponent to challenge.`);
}
export function rpsBegin(g){
 if(g.phase!=='rps_ready')throw Error('Resolve the current challenge first.');
 const actor=rpsActor(g);g.round++;
 if(actor.id===g.human){g.phase='rps_target';note(g,'Choose an opponent to challenge.',actor.id);}
 else{
  const choices=active(g).filter(p=>p.id!==actor.id);
  if(!choices.length){win(g);return;}
  // Fairness: prefer opponents who were challenged least often.
  g.rpsTargets??={};const least=Math.min(...choices.map(p=>g.rpsTargets[p.id]||0));
  const eligible=choices.filter(p=>(g.rpsTargets[p.id]||0)===least);
  const target=choice(eligible);g.rpsTargets[target.id]=(g.rpsTargets[target.id]||0)+1;
  g.rpsTarget=target.id;g.phase=target.id===g.human?'rps_move':'rps_ai_match';
  note(g,`${actor.name} challenges ${target.name} to Rock–Paper–Scissors.`,target.id);
 }
}
export function rpsTarget(g,id){
 if(g.phase!=='rps_target'||!active(g).some(p=>p.id===id&&p.id!==rpsActor(g).id))throw Error('Choose an active opponent.');
 g.rpsTarget=id;g.phase='rps_move';note(g,`You challenged ${byId(g,id).name}. Choose your hand.`,id);
}
function rpsResolve(g,cMove,tMove){
 const actor=rpsActor(g),target=byId(g,g.rpsTarget);
 if(!RPS_MOVES.includes(cMove)||!RPS_MOVES.includes(tMove))throw Error('Choose Rock, Paper or Scissors.');
 g.rpsMatch={challenger:actor.id,target:target.id,cMove,tMove,tie:cMove===tMove};
 if(cMove===tMove){g.phase='rps_tie';note(g,`${actor.name}: ${cMove}; ${target.name}: ${tMove}. It's a tie — play again!`,target.id);return;}
 const challengerWins=rpsBeats[cMove]===tMove;
 const winner=challengerWins?actor:target, loser=challengerWins?target:actor;
 g.rpsMatch.winner=winner.id;g.rpsMatch.loser=loser.id;
 g.pending={chooser:winner.id,loser:loser.id,item:null};
 g.phase=winner.id===g.human?'rps_penalty':'rps_ai_penalty';
 note(g,`${winner.name} wins with ${challengerWins?cMove:tMove} against ${challengerWins?tMove:cMove}. ${loser.name} owes a clothing penalty.`,loser.id);
}
export function rpsMove(g,move){
 if(g.phase!=='rps_move')throw Error('No player move expected.');
 if(!RPS_MOVES.includes(move))throw Error('Invalid move.');
 const actor=rpsActor(g),target=byId(g,g.rpsTarget);
 const opp=choice(RPS_MOVES);
 if(actor.id===g.human)rpsResolve(g,move,opp);
 else if(target.id===g.human)rpsResolve(g,opp,move);
 else throw Error('Not your match.');
}
export function rpsAi(g){
 if(g.phase!=='rps_ai_match')throw Error('AI match not ready.');
 rpsResolve(g,choice(RPS_MOVES),choice(RPS_MOVES));
}
export function rpsReplay(g){
 if(g.phase!=='rps_tie')throw Error('There is no tie to replay.');
 const actor=rpsActor(g);const target=byId(g,g.rpsTarget);
 g.phase=actor.id===g.human||target.id===g.human?'rps_move':'rps_ai_match';
 note(g,'Tie replay. Pick another hand.',target.id);
}
export function rpsAiPenalty(g){
 if(g.phase!=='rps_ai_penalty')throw Error('AI penalty not ready.');
 const p=byId(g,g.pending.loser);g.pending.item=choice(allowed(p));g.phase='rps_apply';
 note(g,`${byId(g,g.pending.chooser).name} chooses a penalty for ${p.name}.`,p.id);
}
export function rpsChoose(g,k){
 if(g.phase!=='rps_penalty')throw Error('No penalty choice pending.');
 const p=byId(g,g.pending.loser);if(!allowed(p).includes(k))throw Error('This clothing choice is not legal.');
 g.pending.item=k;g.phase='rps_apply';note(g,`You choose ${k} for ${p.name}.`,p.id);
}
export function rpsApply(g){
 if(g.phase!=='rps_apply'||!g.pending?.item)throw Error('No pending penalty.');
 const p=byId(g,g.pending.loser);const k=g.pending.item;
 remove(p,k);note(g,`${p.name} loses ${k==='Naked'?'one pose stage':k} → ${stateOf(p)}.`,p.id);
 if(!win(g))g.phase='rps_between';
}
export function rpsContinue(g){if(g.phase!=='rps_between')throw Error('Resolve the penalty first.');rpsNextTurn(g);}

// Mayhem — direct choice / preview / apply adaptation of MayhemEngine.
// Unlike RPS, no random mini-game determines the actor's power.
export function mayhemCurrent(g){return byId(g,g.turnOrder[g.turnIndex]);}
export function mayhemBegin(g){
 if(g.phase!=='mayhem_turn')throw Error('Finish the current Mayhem choice first.');
 const actor=mayhemCurrent(g);g.round++;
 g.phase=actor.id===g.human?'mayhem_target':'mayhem_ai_target';
 note(g,`${actor.name} chooses who loses a clothing layer.`,actor.id);
}
export function mayhemTarget(g,id){
 if(g.phase!=='mayhem_target'||!active(g).some(p=>p.id===id&&id!==mayhemCurrent(g).id))throw Error('Choose another active player.');
 g.pending={chooser:mayhemCurrent(g).id,loser:id,item:null};g.phase='mayhem_penalty';
 note(g,`Choose a legal penalty for ${byId(g,id).name}.`,id);
}
export function mayhemPenalty(g,k){
 if(g.phase!=='mayhem_penalty'||!g.pending)throw Error('Choose a target first.');
 const p=byId(g,g.pending.loser);if(!allowed(p).includes(k))throw Error('Invalid clothing removal.');
 g.pending.item=k;g.phase='mayhem_preview';
 note(g,`${mayhemCurrent(g).name} chooses ${k==='Naked'?'the next pose':k} for ${p.name}. Apply the penalty?`,p.id);
}
export function mayhemAi(g){
 const actor=mayhemCurrent(g);if(actor.id===g.human)throw Error('The current decision belongs to you.');
 if(g.phase==='mayhem_ai_target'){
  const targets=active(g).filter(p=>p.id!==actor.id),counts=g.mayhemTargets??={};
  const least=Math.min(...targets.map(p=>counts[p.id]||0));
  const target=choice(targets.filter(p=>(counts[p.id]||0)===least));
  counts[target.id]=(counts[target.id]||0)+1;
  g.pending={chooser:actor.id,loser:target.id,item:null};g.phase='mayhem_ai_penalty';
  note(g,`${actor.name} targets ${target.name}.`,target.id);
 }else if(g.phase==='mayhem_ai_penalty'){
  const target=byId(g,g.pending.loser);g.pending.item=choice(allowed(target));g.phase='mayhem_preview';
  note(g,`${actor.name} chooses ${g.pending.item} for ${target.name}. Apply the penalty?`,target.id);
 }else throw Error('AI action not available.');
}
export function mayhemApply(g){
 if(g.phase!=='mayhem_preview'||!g.pending?.item)throw Error('No penalty waiting to apply.');
 const p=byId(g,g.pending.loser),k=g.pending.item;
 remove(p,k);note(g,`${p.name} loses ${k==='Naked'?'one pose stage':k} → ${stateOf(p)}.`,p.id);
 if(win(g))return;
 g.phase='mayhem_between';
}
export function mayhemContinue(g){
 if(g.phase!=='mayhem_between')throw Error('Resolve the penalty first.');
 let i=g.turnIndex;for(let j=0;j<g.turnOrder.length;j++){i=(i+1)%g.turnOrder.length;if(!byId(g,g.turnOrder[i]).eliminated)break;}
 g.turnIndex=i;g.phase='mayhem_turn';g.pending=null;note(g,`${mayhemCurrent(g).name} takes the next Mayhem turn.`);
}
