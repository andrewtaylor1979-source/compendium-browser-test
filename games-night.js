// Mobile/browser Games Night championship controllers.
// Adapted from src/logic/games_night.py, mini_games_night.py and games_night_rounds.py.
// All session objects are JSON serialisable for existing localStorage backup/resume.
import * as E from './engine.js';
// Full has Bogey; Mini deliberately does not. Neither mode includes Blackjack or Trivia.
export const FULL_TYPES=['poker','dice','hilo','showdown','penalty_wheel','bogey','memory'];
export const MINI_TYPES=FULL_TYPES.filter(type=>type!=='bogey');
// Compatibility alias for any older consumer of the round catalogue.
export const TYPES=FULL_TYPES;
export const roundTypes=mode=>mode==='gnmini'?MINI_TYPES:FULL_TYPES;
export const LABEL={poker:'Five-Card Draw',dice:'Dice',blackjack:'Blackjack',hilo:'Hi-Lo',trivia:'Trivia',showdown:'Rock–Paper–Scissors League',penalty_wheel:'Penalty Wheel',bogey:'Bogey Round',memory:'Strip Memory'};
export const COLOURS=['Crimson','Royal Blue','Emerald','Amber','Purple'];
const MALES=new Set(['Kristoff','Bananaman','Jason','Hank','Hulk','Donkey','Homer','Thing','Donald','Captain','Batman','Jack']);
const choose=a=>a[Math.floor(Math.random()*a.length)];
const mix=a=>{let b=[...a];for(let i=b.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;};
const d6=()=>1+Math.floor(Math.random()*6);
const uniq=a=>new Set(a).size===a.length;
const active=p=>!p.eliminated;
const scoreRank=(values, ids, lowBest=false)=>mix(ids).sort((a,b)=>((values[b]||0)-(values[a]||0))*(lowBest?-1:1));
const member=(roster,name)=>{const c=roster.find(x=>x.asset_name===name);if(!c)throw Error('Unknown roster character '+name);return E.makePlayer(c);};
export const profileIsMale=name=>MALES.has(name);
export function randomTeams(roster){const available=mix(roster.map(c=>c.asset_name));const picked=[];const teams=[];
 for(let i=0;i<5;i++){
  const options=available.filter(a=>!picked.includes(a));const women=mix(options.filter(x=>!profileIsMale(x))),men=mix(options.filter(profileIsMale));
  const names=women.slice(0,5);if(men.length&&Math.random()<.50)names[4]=men[0];
  if(names.length!==5)throw Error('Not enough eligible opponents for Games Night.');
  picked.push(...names);teams.push({name:i===0?'Your Team':['','The Mavericks','The Night Owls','The Challengers','The Renegades'][i],colour:COLOURS[i],background:['Nightclub','Theatre','Park','Dungeon','Tropical Beach'][i],members:mix(names)});
 }
 return teams;
}
export function validateTeams(teams,roster){if(teams.length!==5)throw Error('Full Games Night requires five teams.');const all=[];
 for(const t of teams){if(!t.name?.trim()||!t.background)throw Error('Each team needs a name and background.');if(t.members.length!==5||new Set(t.members).size!==5)throw Error('Each team must contain five different members.');if(t.members.filter(profileIsMale).length>1)throw Error(`${t.name} may have at most one male member.`);all.push(...t.members);}
 if(all.length!==25||!uniq(all))throw Error('Full Games Night needs 25 different characters.');if(all.some(n=>!roster.some(r=>r.asset_name===n)))throw Error('One selected character is not in the roster.');
 if(!uniq(teams.map(t=>t.background)))throw Error('Choose a different background for each team.');
}
export function createFull(roster,config){validateTeams(config,roster);
 const teams=config.map(t=>({...t,members:t.members.map(n=>member(roster,n)),score:0,wins:0,progressionLosses:0,rotation:[]}));
 const g={version:1,mode:'gnfull',settings:{background:teams[0].background},teams,people:[],human:'',phase:'round_ready',round:0,deck:[],current:null,pending:[],pendingIndex:0,lastResult:null,history:[],dialogueHistory:[],notice:'Five teams are ready. Reveal the first round.',dialogue:'',speaker:'',highlight:'',winner:'',roundInput:null};
 return g;
}
export function createMini(roster,names){if(names.length<2||names.length>5||!uniq(names))throw Error('Select 2–5 different players.');
 const teams=names.map((name,i)=>({name:roster.find(c=>c.asset_name===name)?.full_name||name,colour:COLOURS[i],background:'Nightclub',members:[member(roster,name)],score:0,wins:0,progressionLosses:0,rotation:[]}));
 return {version:1,mode:'gnmini',settings:{background:'Nightclub'},teams,people:[],human:names[0],phase:'round_ready',round:0,deck:[],current:null,pending:[],pendingIndex:0,lastResult:null,history:[],dialogueHistory:[],notice:'Mini Games Night is ready. Draw the first round.',dialogue:'',speaker:'',highlight:'',winner:'',roundInput:null};
}
export const isNight=g=>g&&['gnfull','gnmini'].includes(g.mode);
const allMembers=g=>g.teams.flatMap(t=>t.members);
const getMember=(g,id)=>allMembers(g).find(p=>p.asset===id);
const getTeam=(g,id)=>g.teams.find(t=>t.members.some(p=>p.asset===id));
function note(g,text,actor){g.notice=text;g.highlight=actor||'';g.history.push(text);g.history=g.history.slice(-250);}
function dline(g,text,name){g.speaker=name;g.dialogue=text;g.dialogueHistory.push({speaker:name,text});g.dialogueHistory=g.dialogueHistory.slice(-120);}
function nextRepresentative(t){let candidates=t.members.filter(active).map(p=>p.asset);t.rotation=t.rotation.filter(n=>candidates.includes(n));if(!t.rotation.length)t.rotation=mix(candidates);return t.rotation.shift();}
export function restore(g){
 if(!isNight(g))return g;
 const legal=roundTypes(g.mode);
 if(g.mode==='gnmini')for(const t of g.teams){if(t.members?.[0]&&(/^(Your Character|Player \d+)$/).test(t.name||''))t.name=t.members[0].name;}
 // Migrate persisted nine-game decks without affecting existing scores or members.
 g.deck=(Array.isArray(g.deck)?g.deck:[]).filter(type=>legal.includes(type));
 // Unplayed legacy Blackjack / Trivia / Mini Bogey rounds can be safely skipped.
 // Already-scored or partially-applied rounds are left intact to preserve progress.
 if(g.current&&!legal.includes(g.current.type)&&['round_reveal','round_choice'].includes(g.phase)){
  if(g.mode==='gnfull'&&Array.isArray(g.current.reps)){
   for(const id of g.current.reps){const team=g.teams.find(t=>t.members.some(p=>p.asset===id));
    if(team){team.rotation=Array.isArray(team.rotation)?team.rotation:[];team.rotation.unshift(id);}}
  }
  g.current=null;g.pending=[];g.pendingIndex=0;g.round=Math.max(0,(g.round||0)-1);
  g.phase='round_ready';g.notice='Previous unavailable challenge skipped. Draw a new round.';
 }
if(g.current?.reps){g.people=g.current.reps.map(id=>getMember(g,id)).filter(Boolean);g.human=g.mode==='gnfull'?g.current.reps[0]:g.teams[0].members[0].asset;}else{g.people=g.mode==='gnmini'?g.teams.map(t=>t.members[0]):g.teams.map(t=>t.members.find(active)||t.members[0]);g.human=g.mode==='gnfull'?(g.people[0]?.asset||''):g.teams[0].members[0].asset;}g.settings={background:g.mode==='gnfull'?g.teams[0].background:'Nightclub'};return g;}
function drawType(g){
 const legal=roundTypes(g.mode);
 // Also clean old saved round decks created under the original nine-game rules.
 g.deck=(Array.isArray(g.deck)?g.deck:[]).filter(type=>legal.includes(type));
 if(!g.deck.length)g.deck=mix(legal);
 return g.deck.pop();
}
export function advance(g){if(g.phase!=='round_ready'&&g.phase!=='round_finished')throw Error('Finish the current round first.');if(g.phase==='game_over')return;
 const reps=g.mode==='gnfull'?g.teams.map(t=>nextRepresentative(t)):g.teams.filter(t=>t.members.some(active)).map(t=>t.members.find(active).asset);
 if(reps.length<2)throw Error('The championship is complete.');
 const type=drawType(g);g.round++;g.current={reps,type,play:null};g.roundInput=null;g.phase='round_reveal';g.pending=[];g.pendingIndex=0;restore(g);note(g,`Round ${g.round} — reveal the next challenge for ${reps.length} representatives.`);
}
const trivia=[
 ['Which sport uses the term “birdie”?','Golf',['Golf','Tennis','Rugby','Cricket']],
 ['How many faces does a standard die have?','6',['4','6','8','12']],
 ['Which card suit is red?','Hearts',['Spades','Clubs','Hearts','Neither']],
 ['How many cards make a standard poker hand?','5',['3','4','5','7']],
 ['Which is the capital of France?','Paris',['Rome','Paris','Berlin','Vienna']],
 ['How many players are on one side of a football team on the pitch?','11',['9','10','11','12']],
 ['Which planet is nearest the Sun?','Mercury',['Venus','Earth','Mercury','Mars']],
 ['How many points is a bullseye on a standard dartboard?','50',['25','40','50','60']],
 ['Which animal is a marsupial?','Kangaroo',['Tiger','Kangaroo','Giraffe','Eagle']],
 ['Which month usually has 28 days?','All months',['February','April','All months','December']],
 ['Which number is the highest standard poker card rank?','Ace',['Queen','King','Ace','Jack']],
 ['What is the chemical symbol for gold?','Au',['Ag','Au','Fe','Go']],
 ['Which game has a flop, turn and river?','Hold’em',['Blackjack','Hold’em','Dice','Hi-Lo']],
 ['Which country hosted the 2012 Summer Olympics?','United Kingdom',['France','United Kingdom','Brazil','China']],
 ['What is the opposite of clockwise?','Anticlockwise',['Counterpart','Anticlockwise','Reverse gear','Sunwise']],
];
const ranked=(arr,values,small=false)=>scoreRank(values,arr,small);
function pokerPlay(reps){const cards=E.pokerDeck(),hands={};for(const id of reps)hands[id]=[];for(let i=0;i<5;i++)for(const id of reps)hands[id].push(cards.pop());return {hands,deck:cards,discards:[],exchanges:{},round:1};}
function rankCompare(a,b){return E.compare?E.compare(a,b):(()=>{for(let i=0;i<Math.max(a.length,b.length);i++){const v=(a[i]||0)-(b[i]||0);if(v)return v;}return 0;})();}
function resolvePoker(g,choiceIndices=[]){const rd=g.current.play;let ids=g.current.reps;let order=[...ids];for(const id of order){let hand=rd.hands[id];let indices=id===g.human?choiceIndices:E.aiDiscards(hand);indices=[...new Set(indices.filter(n=>Number.isInteger(n)&&n>=0&&n<5))].sort((a,b)=>b-a);let discarded=[];for(const ix of indices)discarded.push(hand.splice(ix,1)[0]);if(rd.deck.length<indices.length){rd.deck=mix([...rd.deck,...rd.discards]);rd.discards=[];}while(hand.length<5)hand.push(rd.deck.pop());rd.discards.push(...discarded);rd.exchanges[id]=indices.length;}
 if(rd.round===1){rd.deck=mix([...rd.deck,...rd.discards]);rd.discards=[];rd.round=2;return null;}
 const ranking=mix(ids).sort((a,b)=>rankCompare(E.rank5(rd.hands[b]).key,E.rank5(rd.hands[a]).key));return {ranking,summary:`Five-card hands ranked: ${ranking.map(id=>`${getMember(g,id).name} (${E.rank5(rd.hands[id]).label})`).join(' • ')}`};}
function resolveDice(g){const rolls=Object.fromEntries(g.current.reps.map(id=>[id,[d6(),d6()]]));const totals=Object.fromEntries(Object.entries(rolls).map(([id,r])=>[id,r[0]+r[1]]));g.current.play={rolls,totals};return {ranking:ranked(g.current.reps,totals),summary:g.current.reps.map(id=>`${getMember(g,id).name} ${rolls[id].join('+')}=${totals[id]}`).join(' • ')};}
function resolveBlackjack(g,choice){const ids=g.current.reps,deck=E.pokerDeck();const pull=()=>deck.pop();const val=hand=>{let v=hand.reduce((t,c)=>t+(c.r===14?11:Math.min(10,c.r)),0),aces=hand.filter(c=>c.r===14).length;while(v>21&&aces-- >0)v-=10;return v;};const hands=Object.fromEntries(ids.map(id=>[id,[pull(),pull()]]));let dealer=[pull(),pull()];while(val(dealer)<17)dealer.push(pull());for(const id of ids){let h=hands[id];const limit=id===g.human&&choice==='hit'?19:17;while(val(h)<limit&&val(h)<=21)h.push(pull());}const dv=val(dealer);const points={};for(const id of ids){const n=val(hands[id]);points[id]=n>21?-100-n:dv>21?100+n:n>dv?100+n:n===dv?50+n:n;}g.current.play={dealer,hands,points};return {ranking:ranked(ids,points),summary:`Dealer ${dv}; `+ids.map(id=>`${getMember(g,id).name}: ${val(hands[id])}${val(hands[id])>21?' (bust)':''}`).join(' · ')};}
function resolveHilo(g,move){const ids=g.current.reps;const scores={};const outcomes=[];for(const id of ids){let old=id===g.human?g.current.play.start:(2+Math.floor(Math.random()*13));const drawn=2+Math.floor(Math.random()*13);const guess=id===g.human?move:(old<=7?'higher':old>=9?'lower':choose(['higher','lower']));const correct=old===drawn||((guess==='higher')===(drawn>old));scores[id]=correct?1:0;outcomes.push(`${getMember(g,id).name} ${old} → ${drawn} ${correct?'✓':'✗'}`);}g.current.play={...g.current.play,scores};return {ranking:ranked(ids,scores),summary:outcomes.join(' · ')};}
function resolveTrivia(g,answer){const ids=g.current.reps,rd=g.current.play,q=rd.question;rd.answers.push({question:q[0],answer:q[1],correct:answer===q[1]});rd.qIndex++;if(rd.qIndex<rd.questions.length){rd.question=rd.questions[rd.qIndex];return null;}const scores={};for(const id of ids)scores[id]=id===g.human?rd.answers.filter(x=>x.correct).length:Array.from({length:5},()=>Math.random()<.60).filter(Boolean).length;return {ranking:ranked(ids,scores),summary:`Trivia: ${rd.answers.filter(x=>x.correct).length}/5 correct for ${getMember(g,g.human).name}. `+ids.map(id=>`${getMember(g,id).name}: ${scores[id]}/5`).join(' · ')};}
function winnerRps(a,b){if(a===b)return 0;return ({rock:'scissors',paper:'rock',scissors:'paper'})[a]===b?1:-1;}
function resolveShowdown(g,move){const ids=g.current.reps,scores=Object.fromEntries(ids.map(id=>[id,0]));const matches=[];for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){const a=ids[i],b=ids[j],ma=a===g.human?move:choose(['rock','paper','scissors']),mb=b===g.human?move:choose(['rock','paper','scissors']);let win=winnerRps(ma,mb);if(win===0)win=choose([-1,1]);scores[win===1?a:b]++;matches.push(`${getMember(g,a).name} ${ma} / ${getMember(g,b).name} ${mb}`);}return {ranking:ranked(ids,scores),summary:`Showdown league wins: `+ids.map(id=>`${getMember(g,id).name} ${scores[id]}`).join(' · ')};}
function resolveWheel(g){const ids=g.current.reps,penalties=Object.fromEntries(ids.map(id=>[id,0])),spins=[];for(let i=0;i<2;i++)for(const spinner of ids){const hit=choose(ids);penalties[hit]++;spins.push(`${getMember(g,spinner).name} → ${getMember(g,hit).name}`);}return {ranking:ranked(ids,penalties,true),summary:`Ten spins, fewest hits wins. `+ids.map(id=>`${getMember(g,id).name} ${penalties[id]} hit(s)`).join(' · '),spins};}
function resolveMemory(g,slots){const ids=g.current.reps,board=g.current.play?.board||mix(ids.flatMap(id=>[id,id,id,id]));let removed=new Set(),strike=Object.fromEntries(ids.map(id=>[id,0])),out=[];let firstA=Math.max(0,Math.min(board.length-1,slots?.[0]??0)),firstB=Math.max(0,Math.min(board.length-1,slots?.[1]??1));for(let i=0;i<600&&out.length<ids.length-1;i++){const avail=board.map((x,j)=>j).filter(j=>!removed.has(j));if(avail.length<2)break;let a,b;if(i===0){a=firstA;b=a===firstB?choose(avail.filter(n=>n!==a)):firstB;}else{const matches=avail.find(x=>avail.some(y=>y!==x&&board[y]===board[x]));if(matches!==undefined&&Math.random()<.70){a=matches;b=avail.find(y=>y!==a&&board[y]===board[a]);}else{a=choose(avail);b=choose(avail.filter(n=>n!==a));}}
 if(board[a]===board[b]){removed.add(a);removed.add(b);strike[board[a]]++;if(strike[board[a]]===2){out.push(board[a]);}}
 }const survivor=ids.filter(id=>!out.includes(id));const ranking=[...survivor,...[...out].reverse()];return {ranking,firstCards:[board[firstA],board[firstB]],summary:`You revealed ${getMember(g,board[firstA]).name} and ${getMember(g,board[firstB]).name}${board[firstA]===board[firstB]?' — a matching pair.':' — no match.'} The remaining matching-pairs round was simulated. ${out.length?out.map(id=>getMember(g,id).name+' eliminated').join(' · '):'No one was eliminated by a second pair.'}`};}
function resolveBogey(g){return {ranking:mix(g.current.reps),summary:'Bogey round: zero points; every active representative receives one progression.'};}
export function reveal(g){if(g.phase!=='round_reveal')throw Error('Not ready to reveal.');g.phase='round_choice';const type=g.current.type;const ids=g.current.reps;g.current.play={};if(type==='poker')g.current.play=pokerPlay(ids);if(type==='hilo')g.current.play.start=2+Math.floor(Math.random()*13);if(type==='trivia'){g.current.play.questions=mix(trivia).slice(0,5);g.current.play.qIndex=0;g.current.play.answers=[];g.current.play.question=g.current.play.questions[0];}if(type==='memory')g.current.play.slots=[];g.current.play.board=mix(ids.flatMap(id=>[id,id,id,id]));note(g,`${LABEL[type]} — ${ids.map(id=>getMember(g,id).name).join(', ')}. Make your round choice.`);}
export function memoryPick(g,slot){if(g.phase!=='round_choice'||g.current.type!=='memory')throw Error('Not a Memory choice.');if(!Number.isInteger(slot)||slot<0||slot>=(g.current.play.board?.length||g.current.reps.length*4))throw Error('Invalid card.');g.current.play.slots??=[];if(g.current.play.slots.includes(slot)){g.current.play.slots=g.current.play.slots.filter(n=>n!==slot);return;}if(g.current.play.slots.length<2)g.current.play.slots.push(slot);}
export function resolve(g,input){if(g.phase!=='round_choice')throw Error('Reveal the round first.');const type=g.current.type,ids=g.current.reps;let result;
 switch(type){case'poker':result=resolvePoker(g,Array.isArray(input)?input:[]);break;case'dice':result=resolveDice(g);break;case'blackjack':result=resolveBlackjack(g,input);break;case'hilo':result=resolveHilo(g,input);break;case'trivia':result=resolveTrivia(g,input);break;case'showdown':result=resolveShowdown(g,input);break;case'penalty_wheel':result=resolveWheel(g);break;case'memory':result=resolveMemory(g,g.current.play.slots);break;case'bogey':result=resolveBogey(g);break;default:throw Error('Unknown Games Night round');}
 if(!result){note(g,type==='poker'?'Draw round 1 complete. Choose your second exchange.':`Trivia answer recorded — question ${g.current.play.qIndex+1} of 5.`);return;}
 if(result.ranking.length!==ids.length||!uniq(result.ranking))throw Error('Invalid round result.');
 const mini=g.mode==='gnmini',bogey=type==='bogey',points=bogey?Array(ids.length).fill(0):(mini?ids.map((_,i)=>Math.max(0,ids.length-1-i)):[4,3,2,1,0]);
 for(let i=0;i<ids.length;i++){const t=getTeam(g,result.ranking[i]);t.score+=points[i];if(i===0&&!bogey)t.wins++;}
 let penalties=[];
 if(bogey)penalties=[...result.ranking];
 else if(mini)penalties=[result.ranking.at(-1)];
 else {const per=g.round<=9?1:g.round<=18?2:3;for(const rep of result.ranking.slice(-2)){const t=getTeam(g,rep);penalties.push(rep);const extra=mix(t.members.filter(p=>active(p)&&p.asset!==rep)).sort((a,b)=>a.losses-b.losses).slice(0,per-1);for(const p of extra)penalties.push(p.asset);}}
 g.lastResult={type,ranking:result.ranking,points,summary:result.summary,penalties,spins:result.spins||[],firstCards:result.firstCards||[]};g.pending=penalties;g.pendingIndex=0;g.phase=mini?'round_result':penalties.length?'round_penalty':'round_finished';
 const winner=getMember(g,result.ranking[0]).name,loser=getMember(g,result.ranking.at(-1)).name;
 note(g,mini?`${winner} wins this challenge. ${loser} finishes last and faces the next clothing choice.`:`${LABEL[type]} result: ${result.summary}`);
 dline(g,`${winner} takes first place${bogey?' in a Bogey round':''}. ${bogey?'All five representatives face a consequence.':`${loser} finishes last.`}`,winner);
 if(!mini&&!penalties.length)finalize(g);
}
export function confirmMiniResult(g){if(g.mode!=='gnmini'||g.phase!=='round_result')throw Error('Not at a Mini Games Night result.');if(g.pending.length){g.phase='round_penalty';note(g,`${getMember(g,g.pending[0]).name} finished last. Choose the legal next clothing step.`);}else finalize(g);}
export function penaltyTarget(g){return g.phase==='round_penalty'?getMember(g,g.pending[g.pendingIndex]):null;}
export function playerPenalty(g){const target=penaltyTarget(g);if(!target)return false;return g.mode==='gnfull'?g.teams[0].members.some(p=>p.asset===target.asset):target.asset===g.human;}
export function applyPenalty(g,choice){if(g.phase!=='round_penalty')throw Error('No penalty pending.');const p=penaltyTarget(g),opts=E.allowed(p);if(!opts.includes(choice))throw Error('Select a legal item or pose.');const result=E.remove(p,choice);p.losses=(p.losses||0)+1;getTeam(g,p.asset).progressionLosses++;if(g.mode==='gnfull'&&(p.naked||0)>=4)p.eliminated=true;note(g,`${p.name}: ${choice==='Naked'?'next pose':choice} → ${result}${p.eliminated?' · eliminated':''}.`,p.asset);const ch=rosterRef?.find(c=>c.asset_name===p.asset);if(ch?.stage_dialogue?.[result])dline(g,ch.stage_dialogue[result],p.name);g.pendingIndex++;if(g.pendingIndex>=g.pending.length)finalize(g);restore(g);}
let rosterRef=null;export const bindRoster=r=>{rosterRef=r;};
export function autoPenalty(g){const p=penaltyTarget(g);if(!p)throw Error('No pending player.');const opts=E.allowed(p);applyPenalty(g,choose(opts.slice().reverse().slice(0,2)));}
function finalize(g){if(g.mode==='gnfull'){
  const lost=g.teams.find(t=>t.members.every(p=>p.eliminated));if(lost){const survivors=g.teams.filter(t=>t!==lost);const champ=survivors.sort((a,b)=>b.score-a.score||b.wins-a.wins)[0];g.winner=champ?.name||'Championship';g.phase='game_over';note(g,`${lost.name} is eliminated. ${g.winner} wins the championship on points.`);return;}}
 else {const living=allMembers(g).filter(active);if(living.length<=1){g.phase='game_over';g.winner=living[0]?.name||'Game complete';note(g,`${g.winner} wins Mini Games Night.`);return;}}
 g.phase='round_finished';note(g,`Round ${g.round} complete. View the standings or start the next round.`);
}
export const standings=g=>[...g.teams].sort((a,b)=>b.score-a.score||b.wins-a.wins);
export const teamFor=(g,id)=>getTeam(g,id);
export const getPlayer=(g,id)=>getMember(g,id);
