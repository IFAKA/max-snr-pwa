const R={
Monday:['High-Incline Machine Press|3|6-10|machine','Neutral-Grip Pulldown|3|6-10|shared','Braced Cable Row|2|8-12|shared','Cable Lateral Raise|3|10-20|shared','Overhead Tricep Extension|2|8-15|shared','Cable Curl|2|8-15|shared'],
Tuesday:['Leg Press|3|6-10|machine','Leg Curl|3|8-12|machine','Leg Extension|2|10-15|machine','Standing Calf Raise|3|8-15|machine','Cable Lateral Raise|3|10-20|shared','Neck Iso Front|2|10-20|shared','Neck Iso Back|2|10-20|shared'],
Thursday:['Pec Deck|2|10-15|machine','Reverse Pec Deck|3|10-20|machine','Preacher Curl|2|8-15|machine','Incline Dumbbell Press|3|6-10|shared','Lat Pulldown|3|8-12|shared','Braced Cable Row|2|8-12|shared','Overhead Tricep Extension|2|8-15|shared'],
Friday:['Reverse Pec Deck|2|10-20|machine','Cable Lateral Raise|3|10-20|shared','Cable Fly|2|10-15|shared','Straight-Arm Pulldown|2|10-15|shared','Cable Tricep Pushdown|2|8-15|shared','Hammer Curl|2|8-15|shared','Dumbbell Shrug|3|8-15|shared','Dumbbell Wrist Extension|2|12-20|shared']};
for(const d in R)R[d]=R[d].map(x=>{const[n,s,r,zone]=x.split('|');return{name:n,sets:+s,reps:r,zone}});
const N={Monday:'UPPER A',Tuesday:'LOWER + AESTHETIC',Thursday:'UPPER B',Friday:'AESTHETIC'};
const Z={machine:'MACHINES',shared:'CABLES / FREE WEIGHTS'};
const REST_MS=90000;
let S=JSON.parse(localStorage.getItem('maxsnr')||'null')||{history:[]};
const app=document.querySelector('#app');
const save=()=>localStorage.setItem('maxsnr',JSON.stringify(S));
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const dayNow=()=>new Intl.DateTimeFormat('en',{weekday:'long'}).format(new Date());
const templateDay=()=>R[dayNow()]?dayNow():'Monday';
const go=p=>location.assign(p);

function start(day=templateDay()){
 S.active={id:Date.now(),date:new Date().toISOString(),day,name:N[day],queue:R[day].map((e,i)=>({...e,i,done:[],deferred:false})),pos:0,phase:'warmup'};save();go('/workout/');
}
function current(){return S.active?.queue[S.active.pos]}
function next(){
 const a=S.active,q=a.queue;
 const findNext=deferred=>{for(let offset=1;offset<=q.length;offset++){const i=(a.pos+offset)%q.length,e=q[i];if(e.done.length<e.sets&&!!e.deferred===deferred)return i}return -1};
 let p=findNext(false);if(p<0)p=findNext(true);if(p<0)return finishLifts();a.pos=p;save();renderWorkout();
}
function complete(){const e=current(),w=+document.querySelector('#weight').value||0,r=+document.querySelector('#reps').value||0,rir=document.querySelector('[aria-pressed=true]')?.dataset.rir??'';e.done.push({weight:w,reps:r,rir});e.deferred=false;save();S.active.queue.some(x=>x.done.length<x.sets)?startRest():next()}
function defer(){
 const e=current();
 if(!e)return;
 e.deferred=true;
 delete S.active.restEnd;
 S.active.phase='lifting';
 next();
}
function beginLifts(){S.active.phase='lifting';save();renderWorkout()}
function startRest(){S.active.phase='rest';S.active.restEnd=Date.now()+REST_MS;save();renderWorkout()}
function continueAfterRest(){const e=current();delete S.active.restEnd;S.active.phase='lifting';if(e&&e.done.length<e.sets){save();renderWorkout();return}next()}
function beginPlank(){S.active.phase='plank';S.active.timerEnd=Date.now()+60000;save();renderWorkout()}
function finishLifts(){S.active.phase='stretch';S.active.timerEnd=null;save();renderWorkout()}
function saveWorkout(){const a={...S.active};delete a.timerEnd;S.history.unshift(a);delete S.active;save();go('/')}
function cancelWorkout(){if(!confirm('Cancel workout?\n\nThis workout will be discarded. Previous history will not be affected.'))return;delete S.active;save();go('/')}
function startTimer(ms,onEnd,key='timerEnd',elementId='timer'){const el=document.querySelector(`#${elementId}`);if(!el)return;const tick=()=>{const left=Math.max(0,(S.active?.[key]||0)-Date.now());const sec=Math.ceil(left/1000);el.textContent=`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;if(left<=0){clearInterval(id);onEnd?.()}};tick();const id=setInterval(tick,250);}
function last(name){for(const w of S.history){const e=w.queue?.find(x=>x.name===name);if(e?.done?.length)return e.done[e.done.length-1]}return null}
function renderWorkout(){
 if(!S.active)return go('/');
 const a=S.active;
 if(a.phase==='warmup'){
  app.innerHTML=`<div class="workout-stage"><div class="stage-info"><div class="eyebrow">${esc(a.name)}</div><h1>Warm up</h1><p class="muted">Do your normal warm-up. When ready, continue to the plank.</p></div><div class="thumb-zone"><button class="primary" id="ready">WARM-UP DONE</button><button class="cancel" id="cancel">Cancel workout</button></div></div>`;
  document.querySelector('#ready').onclick=beginPlank;document.querySelector('#cancel').onclick=cancelWorkout;return;
 }
 if(a.phase==='plank'){
  if(!a.timerEnd)a.timerEnd=Date.now()+60000,save();
  app.innerHTML=`<div class="workout-stage"><div class="stage-info"><div class="eyebrow">WARM-UP</div><h1>1 minute plank</h1><div class="big-timer" id="timer">1:00</div></div><div class="thumb-zone"><button class="primary" id="continue">START LIFTING</button><button class="cancel" id="cancel">Cancel workout</button></div></div>`;
  document.querySelector('#continue').onclick=beginLifts;document.querySelector('#cancel').onclick=cancelWorkout;startTimer(60000);return;
 }
 if(a.phase==='stretch'){
  const running=!!a.timerEnd&&a.timerEnd>Date.now();
  app.innerHTML=`<div class="workout-stage"><div class="stage-info"><div class="eyebrow">LIFTING COMPLETE</div><h1>Stretch</h1><p class="muted">30-second stretch timer. Repeat it for each stretch you need.</p><div class="big-timer" id="timer">${running?'0:30':'0:30'}</div></div><div class="thumb-zone"><button class="primary" id="stretch">${running?'RESTART 30S':'START 30S'}</button><button id="done">FINISH WORKOUT</button><button class="cancel" id="cancel">Cancel workout</button></div></div>`;
  document.querySelector('#stretch').onclick=()=>{a.timerEnd=Date.now()+30000;save();renderWorkout()};document.querySelector('#done').onclick=saveWorkout;document.querySelector('#cancel').onclick=cancelWorkout;if(running)startTimer(30000);return;
 }
 const resting=a.phase==='rest',restRunning=resting&&!!a.restEnd&&a.restEnd>Date.now();
 const e=current();if(!e)return finishLifts();
 const done=a.queue.reduce((n,x)=>n+x.done.length,0),total=a.queue.reduce((n,x)=>n+x.sets,0),l=e.done.at(-1)||last(e.name);
 const displayedSet=Math.min(e.done.length+1,e.sets),restAction=e.done.length<e.sets?'START NEXT SET':'START NEXT EXERCISE',canDefer=!resting&&e.done.length===0;
 app.innerHTML=`<div class="workout-stage"><div class="stage-info"><div class="row workout-top"><span>${esc(a.name)}</span><span>${done}/${total}</span></div><section class="set-title"><div class="eyebrow">SET ${displayedSet} OF ${e.sets}</div><h1>${esc(e.name)}</h1><div class="meta">${e.reps} reps · target 1–2 RIR</div></section><div class="previous"><span>Previous</span>${l?`${l.weight} kg × ${l.reps} · RIR ${l.rir}`:'No history'}</div></div><div class="thumb-zone"><div class="controls"><label>WEIGHT (KG)<input id="weight" inputmode="decimal" type="number" step=".5" value="${l?.weight||''}" ${resting?'disabled':''}></label><label>REPS<input id="reps" inputmode="numeric" type="number" value="${l?.reps||''}" ${resting?'disabled':''}></label></div><div class="rir-label">RIR</div><div class="rir">${[0,1,2,'3+'].map(x=>`<button type="button" data-rir="${x}" aria-pressed="${x==1}" ${resting?'disabled':''}>${x}</button>`).join('')}</div><button class="primary" id="complete" ${restRunning?'disabled':''}>${resting?(restRunning?'REST <span id="rest-countdown">1:30</span>':restAction):'COMPLETE SET'}</button>${resting?'<button class="secondary-link" id="skip-rest">Skip rest</button>':canDefer?'<button class="secondary-link" id="occupied">Machine occupied? Skip for now</button>':''}<button class="cancel" id="cancel" ${resting?'disabled':''}>Cancel workout</button></div></div>`;
 document.querySelectorAll('.rir button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.rir button').forEach(x=>x.setAttribute('aria-pressed','false'));b.setAttribute('aria-pressed','true')});
 document.querySelector('#complete').onclick=resting?continueAfterRest:complete;document.querySelector('#skip-rest')?.addEventListener('click',continueAfterRest);document.querySelector('#occupied')?.addEventListener('click',defer);document.querySelector('#cancel').onclick=cancelWorkout;
 if(restRunning)startTimer(REST_MS,()=>renderWorkout(),'restEnd','rest-countdown');
}
function renderToday(){const d=templateDay(),sets=R[d].reduce((n,e)=>n+e.sets,0);app.innerHTML=`<p class="muted">${new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'})}</p><h1>${N[d]}</h1><p>${sets} working sets</p>${S.active?'<a class="button primary" href="/workout/">RESUME WORKOUT</a>':'<button class="primary" id="start">START WORKOUT</button>'}`;document.querySelector('#start')?.addEventListener('click',()=>start(d))}
function renderRoutine(){
 const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
 app.innerHTML='<h1>Routine</h1><p class="muted">Finish the machines, then move to the cable / free-weight area.</p>'+days.map(d=>{
  if(!R[d])return `<section class="routine-day rest"><div class="row"><h2>${d}</h2><span>REST</span></div></section>`;
  const total=R[d].reduce((n,e)=>n+e.sets,0);
  const exercises=Object.entries(Z).map(([zone,label])=>{const list=R[d].filter(e=>e.zone===zone);if(!list.length)return '';return `<div class="routine-zone"><h3>${label}</h3><div class="routine-list">${list.map(e=>`<div class="routine-exercise"><span>${esc(e.name)}</span><span>${e.sets} × ${e.reps}</span></div>`).join('')}</div></div>`}).join('');
  return `<section class="routine-day"><div class="row"><div><h2>${d}</h2><p><b>${N[d]}</b> · ${total} sets</p></div><button type="button" data-day="${d}">Start</button></div>${exercises}</section>`;
 }).join('');
 document.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>start(b.dataset.day));
}
function renderHistory(){
 app.innerHTML=`<h1>History</h1><section class="history-data" aria-labelledby="data-heading"><h2 id="data-heading">Data</h2><div class="data-actions"><button id="export" type="button">Export backup</button><label class="import-button">Import backup<input id="import" type="file" accept="application/json"></label></div></section><section class="history-list" aria-label="Workout history">${!S.history.length?'<p>No workouts yet.</p>':S.history.map(w=>`<details class="exercise"><summary>${new Date(w.date).toLocaleDateString()} · ${esc(w.name)}</summary>${w.queue.map(e=>`<p>${esc(e.name)}: ${e.done.map(s=>`${s.weight}kg×${s.reps}`).join(', ')||'skipped'}</p>`).join('')}</details>`).join('')}</section>`;
 document.querySelector('#export').onclick=()=>{const a=document.createElement('a');const u=URL.createObjectURL(new Blob([JSON.stringify(S,null,2)],{type:'application/json'}));a.href=u;a.download='workout-data.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),0)};
 document.querySelector('#import').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{const next=JSON.parse(await f.text());if(!next||!Array.isArray(next.history))throw new Error();S=next;save();location.reload()}catch{alert('Invalid backup file')}};
}

const route=document.body.dataset.route;
({today:renderToday,routine:renderRoutine,history:renderHistory,workout:renderWorkout}[route]||renderToday)();
if('serviceWorker'in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('/sw.js');
