const dateKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today=()=>dateKey(), integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
const gear=[['w0','くたびれたアタッシュケース','w','C',3,0,0],['w1','強化アタッシュケース','w','R',14,0,0],['w2','貫通ホッチキス','w','R',9,0,0],['w3','魔導キーボード','w','E',16,0,0],['w4','終業の聖剣エンドタイム','w','L',24,0,0],['a0','新人のスーツ','a','C',0,3,0],['a1','鉄壁の作業着','a','R',0,12,0],['a2','終電防衛スーツ','a','E',0,14,15],['a3','労基の加護','a','L',0,18,0],['x0','社員証','x','C',0,0,10],['x1','カフェインの指輪','x','R',5,0,0],['x2','安全第一のお守り','x','R',0,0,25],['x3','有休の護符','x','E',0,0,30],['x4','帰宅の指輪','x','L',0,0,40],['x5','監査の眼鏡','x','E',0,8,0]].map(([id,name,slot,r,atk,def,hp])=>({id,name,slot,r,atk,def,hp}));
const G=Object.fromEntries(gear.map(g=>[g.id,g])), jobs=[['平社員戦士',1,1,1,1],['無給の亡霊',.9,1.1,.8,5],['定時の賢者',.95,.85,1.1,7]], enemies=[['修正依頼スライム',55,10,3],['電話対応ゴブリン',105,17,8],['丸投げデーモン',170,25,12],['会議ゴーレム',300,35,20],['締切ドラゴン',420,36,22]], costs=[4,6,8,10,12,15,18,22,27,35], rar={C:'コモン',R:'レア',E:'エピック',L:'レジェンド'}, slots={w:'武器',a:'防具',x:'装飾'};
function legacyFresh(){return {version:1,xp:40,records:{},revisions:[],ledger:{},inventory:[{uid:'1',id:'w0',up:0},{uid:'2',id:'a0',up:0},{uid:'3',id:'x0',up:0}],equip:{w:'1',a:'2',x:'3'},next:4,job:0,mastery:[0,0,0],tactic:'balanced',materials:0,chests:0,pity:0,daily:{},wins:[],quests:[],lastLog:'',settings:{warn:480,scheduled:480},lastSeen:Date.now()}}
function level(xp){let l=1;while(xp>=55*l+11*l*(l-1)/2)l++;return l}
function equipStats(s){let l=level(s.xp),j=jobs[s.job],hp=Math.floor((100+10*(l-1))*j[1]),atk=Math.floor((20+2*(l-1))*j[2]),def=Math.floor((10+l-1)*j[3]);let ids=[];for(const uid of Object.values(s.equip)){const i=s.inventory.find(v=>v.uid===uid),g=G[i.id];ids.push(g.id);atk+=g.atk+(g.slot==='w'?i.up*2:g.slot==='x'&&g.atk?i.up:0);def+=g.def+(g.slot==='a'?i.up:g.slot==='x'&&g.def?i.up:0);hp+=g.hp+(g.slot==='a'?i.up*2:g.slot==='x'&&g.hp?i.up*3:0)}return {hp,atk,def,ids}}
function add(s,id){s.inventory.push({uid:String(s.next++),id,up:0})}
function battle(s,e,random=Math.random){
 const p=equipStats(s),[name,max,attack,defense]=enemies[e],has=id=>p.ids.includes(id),master=s.mastery[s.job]>=14;
 const mult=s.tactic==='attack'?1.2:s.tactic==='safe'?.85:1,inc=s.tactic==='attack'?1.18:s.tactic==='safe'?.8:1;
 let hp=p.hp,ehp=max,log=[],events=[],guardUntil=0,weakUntil=0,armorUntil=0,enemyBuffUntil=0,playerWeakUntil=0,boostUntil=0;
 let skill1At=1,skill2At=1,heals=0,charmUsed=false,boostUsed=false,deathSaved=false,swordUsed=false;
 const finish=(win,t,reason)=>({win,turns:t,hp:Math.max(0,hp),log:log.join('\n')+'\n'+reason,events});
 for(let t=1;t<=(e>=3?20:15);t++){
  if(s.job===0&&master&&!boostUsed&&hp<=p.hp*.5){boostUntil=t+2;boostUsed=true;events.push({t,type:'boost'})}
  const atk=p.atk*(playerWeakUntil>=t?.85:1)*(boostUntil>=t?1.15:1);
  const effectiveDefense=(defense+(enemyBuffUntil>=t?10:0))*(armorUntil>=t?.7:1)*(has('w2')?.6:1);
  const base=Math.max(1,Math.floor(atk-effectiveDefense*.5));
  const enemyPowers=e===1&&t%3===0?[.6,.6]:[e===3&&t%3===0?1.25:e===4&&t%4===0?1.5:1];
  const expectedHit=(guard=guardUntil>=t,weak=weakUntil>=t)=>enemyPowers.reduce((total,power)=>total+Math.max(1,Math.floor(Math.max(1,Math.floor(attack*(weak?.8:1)*(e===4&&ehp<=max*.3?1.15:1)-p.def*.5))*power*inc*(guard?.75:1))),0);
  let action='attack',reason='通常攻撃',hits=[1];
  const ready1=t>=skill1At,ready2=t>=skill2At;
  const normalDamage=Math.max(1,Math.floor((has('w4')&&!swordUsed?Math.max(1,Math.floor(atk)):base)*mult));
  const doubleDamage=2*Math.max(1,Math.floor(base*.65*mult));
  // Kill -> survive -> telegraph -> exploit -> support -> ordinary attack.
  if(ehp<=normalDamage){reason='撃破優先'}
  else if(s.job===0&&ready1&&ehp<=doubleDamage){action='double';reason='撃破優先・連撃'}
  else if(expectedHit()>=hp&&s.job===2&&master&&heals<2&&hp<=p.hp*.5){action='heal';reason='致命傷回避'}
  else if(expectedHit()>=hp&&s.job===2&&ready1&&guardUntil<t){action='guard';reason='致命傷回避'}
  else if(expectedHit()>=hp&&s.job===1&&ready1){action='weaken';reason='致命傷回避'}
  else if(e===4&&(t%4===3||t%4===0)&&s.job===2&&ready1&&guardUntil<t){action='guard';reason='予兆対策'}
  else if(e===4&&(t%4===3||t%4===0)&&s.job===1&&ready1&&weakUntil<t){action='weaken';reason='予兆対策'}
  else if(s.job===1&&master&&ready2&&armorUntil<t&&(e>=3||s.tactic==='skill')){action='armor';reason='弱点対策'}
  else if(s.job===0&&ready1){action='double';reason=e===0?'連撃弱点':'基本スキル'}
  else if(s.job===1&&ready1){action='weaken';reason='攻撃抑制'}
  else if(s.job===1&&master&&ready2&&armorUntil<t){action='armor';reason='補助'}
  else if(s.job===2&&master&&hp<=p.hp*.5&&heals<2){action='heal';reason='補助'}
  else if(s.job===2&&ready1&&guardUntil<t&&(e!==4||s.tactic==='skill')){action='guard';reason='補助'}
  if(action==='double'){hits=[.65,.65];skill1At=t+3}
  if(action==='weaken'){hits=[.75];weakUntil=t+2;skill1At=t+5}
  if(action==='armor'){hits=[.75];armorUntil=t+2;skill2At=t+4}
  if(action==='guard'){hits=[];guardUntil=t+2;skill1At=t+5}
  if(action==='heal'){hits=[];hp=Math.min(p.hp,hp+Math.floor(p.hp*.25));heals++}
  let damage=0;for(const power of hits){let ed=(defense+(enemyBuffUntil>=t?10:0))*(armorUntil>=t?.7:1)*(has('w2')?.6:1);if(has('w4')&&!swordUsed){ed=0;swordUsed=true;events.push({t,type:'ignore-defense'})}let b=Math.max(1,Math.floor(atk-ed*.5));const critical=random()<(has('x1')?.03:0);damage+=Math.max(1,Math.floor(b*power*mult*(critical?1.5:1)));if(critical)events.push({t,type:'critical'})}
  // One optional followup per action, never recursively triggered.
  if(hits.length&&has('w3')&&random()<.2){damage+=Math.max(1,Math.floor(Math.max(1,Math.floor(atk-effectiveDefense*.5))*.5*mult));events.push({t,type:'followup'})}
  ehp-=damage;events.push({t,type:'hero',action,reason,damage,hp,enemyHP:Math.max(0,ehp)});
  const actionNames={attack:'攻撃',double:'とりあえず対応',weaken:'見えない工数',armor:'存在しない勤務記録',guard:'帰宅の結界',heal:'有休申請'};
  log.push(`${t}T ${actionNames[action]}（${reason}）：${damage}ダメージ`);
  if(ehp<=0)return finish(true,t,'勝利！');
  let hurt=0;for(const power of enemyPowers){let b=Math.max(1,Math.floor(attack*(weakUntil>=t?.8:1)*(e===4&&ehp<=max*.3?1.15:1)-p.def*.5));let hit=Math.max(1,Math.floor(b*power*inc*(guardUntil>=t?.75:1)));hp-=hit;hurt+=hit;if(hp<=0&&has('a3')&&!deathSaved){hp=1;deathSaved=true;events.push({t,type:'death-save'})}if(hp<=0)break}
  events.push({t,type:'enemy',damage:hurt,hp:Math.max(0,hp),guard:guardUntil>=t,weak:weakUntil>=t});log.push(`  ${name}：${hurt}ダメージ（残HP ${Math.max(0,hp)}）`);
  if(hp<=0)return finish(false,t,'敗北…');
  if(has('x3')&&hp<=p.hp*.5&&!charmUsed){hp=Math.min(p.hp,hp+Math.floor(p.hp*.15));charmUsed=true;events.push({t,type:'charm-heal'})}
  if(has('x4')){hp=Math.min(p.hp,hp+Math.floor(p.hp*.03));events.push({t,type:'regeneration'})}
  if(e===3&&t%3===0)enemyBuffUntil=t+1;
  if(e===2&&t%3===0)playerWeakUntil=t+(has('x5')?0:1);
  if(e===4&&t%4===3)log.push('  予兆：次のターン、締切の炎！');
 }
 return finish(false,e>=3?20:15,'撤退：ターン上限');
}
function openChest(s,rng=Math.random){if(s.chests<1)throw Error('宝箱がありません');let n=rng(),r=s.pity>=5?(n<.7?'R':n<.94?'E':'L'):(n<.5?'C':n<.85?'R':n<.97?'E':'L');s.pity=r==='C'?s.pity+1:0;const pool=gear.filter(g=>g.r===r),g=pool[Math.min(pool.length-1,Math.floor(rng()*pool.length))];s.chests--;add(s,g.id);return `${rar[r]}：${g.name} を獲得！`}
function legacyValidate(s){if(!s||s.version!==1||!integer(s.xp,0,1e8)||!integer(s.materials,0,1e8)||!integer(s.chests,0,1e6)||!integer(s.pity,0,5)||!integer(s.job,0,2)||jobs[s.job][4]>level(s.xp)||!Array.isArray(s.inventory)||!s.inventory.length||!s.equip||!s.records||!s.ledger||!s.daily||!Array.isArray(s.revisions)||!Array.isArray(s.wins)||!Array.isArray(s.quests)||!Array.isArray(s.mastery)||s.mastery.length!==3||!s.mastery.every(n=>integer(n,0,1e8))||!s.settings||!integer(s.settings.warn,0,4320)||!integer(s.settings.scheduled,0,1440)||!['balanced','attack','safe','skill'].includes(s.tactic)||!integer(s.next,4,1e9))throw Error('対応していないバックアップです');let ids=new Set();for(const i of s.inventory){if(!i||!Object.hasOwn(G,i.id)||!integer(i.up,0,10)||typeof i.uid!=='string'||ids.has(i.uid)||!integer(Number(i.uid),1,s.next-1))throw Error('装備データ不正');ids.add(i.uid)}for(const k of Object.keys(slots)){if(!s.inventory.some(i=>i.uid===s.equip[k]&&G[i.id].slot===k))throw Error('装備参照不正')}for(const [k,r] of Object.entries(s.records)){if(k!==r.date||!integer(r.minutes,0,4320)||!['work','scheduled','legal','paid','rest','other','comp','substitute'].includes(r.kind))throw Error('勤務データ不正')}for(const v of Object.values(s.ledger))if(v!==100)throw Error('報酬履歴不正');for(const d of Object.values(s.daily))if(!integer(d.stage,0,3))throw Error('探索履歴不正');return s}
const kinds={work:'通常勤務',scheduled:'所定休日出勤',legal:'法定休日出勤',paid:'有休',rest:'公休',other:'その他休暇',comp:'代休',substitute:'振替休日'};const fmt=n=>`${Math.floor(n/60)}時間${n%60}分`;const dateInput=(d,h)=>d+'T'+h;

// Civil minute arithmetic: records are Japanese local wall-clock times, independent of device timezone.
const MIN=60000, DAY=1440;
function check(ok,msg){if(!ok)throw Error(msg)}
function validDate(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&s>='2000-01-01'&&s<='2199-12-31'&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s}
function stamp(s){check(typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)&&validDate(s.slice(0,10)),'日時の形式が不正です');check(+s.slice(11,13)<24&&+s.slice(14,16)<60,'時刻が不正です');return Date.parse(s+'Z')/MIN}
function dayNum(s){check(validDate(s),'存在する日付を入力してください');return Date.parse(s+'T00:00:00Z')/MIN}
function dateFrom(n){return new Date(n*MIN).toISOString().slice(0,10)}
function shift(d,n){return dateFrom(dayNum(d)+n*DAY)}
function jpDate(now=Date.now()){return new Date(now+9*3600000).toISOString().slice(0,10)}
function fresh(now=Date.now()){let s=legacyFresh();return {...s,version:2,revision:0,createdDate:jpDate(now),lastSeen:now,discovered:['w0','a0','x0'],seen:[],chestHistory:[],battles:[],epicChoice:false,earnedTitles:['新人戦士'],settings:{...s.settings,weekStart:1,closing:31,agreementStart:jpDate(now).slice(0,4)+'-04-01',reducedMotion:true,volume:0,skipAnimations:true,legalHoliday:-1,workSystem:'unspecified'}}}
function parseRecord(v){
 check(validDate(v.date)&&Object.hasOwn(kinds,v.kind)&&['simple','detail'].includes(v.mode),'日付・区分を確認してください');
 const scheduled=v.scheduled===undefined?480:Number(v.scheduled),leave=Number(v.leave||0);
 check(integer(scheduled,0,1440)&&integer(leave,0,1440),'予定勤務・休暇は0〜1440整数分で入力してください');
 let intervals=[],segments=[],minutes=0,night=null;
 if(v.mode==='simple'){check(v.minutes!==''&&integer(Number(v.minutes),0,1440),'簡易入力は0〜1440の整数分です。24時間超は詳細入力を使ってください');minutes=Number(v.minutes)}
 else {
  segments=v.segments||[{start:v.start,end:v.end,breaks:v.breaks||[]}];check(Array.isArray(segments)&&segments.length>0&&segments.length<=10,'勤務区間は1〜10件です');
  let prev=-Infinity;
  segments=segments.map(seg=>{const a=stamp(seg.start),b=stamp(seg.end);check(a>=prev&&b>a&&b-a<=4320,'勤務区間の重複・順序・長さを確認してください');prev=b;check(Array.isArray(seg.breaks)&&seg.breaks.length<=30,'休憩区間が不正です');let last=a;
   const breaks=seg.breaks.map(pair=>{check(Array.isArray(pair)&&pair.length===2,'休憩は開始,終了で入力してください');return [stamp(pair[0]),stamp(pair[1])]}).sort((a,b)=>a[0]-b[0]);
   for(const [x,y] of breaks){check(x>=last&&y>x&&y<=b,'休憩の重複・勤務範囲外を確認してください');if(x>last)intervals.push([last,x]);last=y}if(last<b)intervals.push([last,b]);return {start:seg.start,end:seg.end,breaks:seg.breaks};
  });check(segments[0].start.slice(0,10)===v.date&&stamp(segments.at(-1).end)-stamp(segments[0].start)<=4320,'対象日は最初の始業日です。全区間は72時間以内です');
  minutes=intervals.reduce((n,[a,b])=>n+b-a,0);night=0;
  for(const [a,b]of intervals)for(let t=a;t<b;t++){let m=((t%DAY)+DAY)%DAY;if(m>=1320||m<300)night++}
 }
 const reported=v.reported===''||v.reported===null||v.reported===undefined?null:Number(v.reported);check(reported===null||integer(reported,0,4320),'申告時間は整数分です');check(typeof(v.memo??'')==='string'&&(v.memo||'').length<=1000,'メモは1000文字以内です');
 return {date:v.date,kind:v.kind,mode:v.mode,minutes,night,intervals,segments,reported,memo:v.memo||'',scheduled,leave,confirmed:v.confirmed!==false};
}
function saveRecord(s,r,now=Date.now()){
 r=parseRecord(r);check(r.date<=jpDate(now),'未来日の実績は登録できません');
 if(r.mode==='detail')check(stamp(r.segments.at(-1).end)<=Math.floor((now+9*3600000)/MIN),'未来の終業時刻は実績にできません');
 for(const other of Object.values(s.records))if(other.date!==r.date&&r.mode==='detail'&&other.mode==='detail')for(const [a,b]of r.intervals)for(const [x,y]of other.intervals)check(b<=x||a>=y,'別の日の勤務記録と時間が重複しています');
 if(s.records[r.date])s.revisions.push({date:r.date,previous:s.records[r.date],at:now});s.records[r.date]=r;if(r.kind==='paid'&&!s.earnedTitles.includes('伝説の有休使い'))s.earnedTitles.push('伝説の有休使い');
 if(r.confirmed&&!Object.hasOwn(s.ledger,r.date)){s.ledger[r.date]=100;s.xp+=100;return 100}return 0;
}
function removeRecord(s,d,now=Date.now()){check(Object.hasOwn(s.records,d),'記録がありません');s.revisions.push({date:d,previous:s.records[d],at:now,deleted:true});delete s.records[d]}
function calendarRows(s){const rows={};const row=d=>rows[d]??(rows[d]={date:d,minutes:0,night:0,unknown:0});
 for(const r of Object.values(s.records)){if(r.mode==='simple'){let t=row(r.date);t.minutes+=r.minutes;t.unknown++;continue}for(const [a,b]of r.intervals){for(let t=a;t<b;t++){let x=row(dateFrom(t)),m=t%DAY;x.minutes++;if(m>=1320||m<300)x.night++}}}return rows}
function aggregate(s,from,to){check(validDate(from)&&validDate(to)&&from<=to,'集計期間を確認してください');let rows=Object.values(s.records).filter(r=>r.date>=from&&r.date<=to),cal=Object.values(calendarRows(s)).filter(r=>r.date>=from&&r.date<=to),reported=rows.filter(r=>r.reported!==null);
 return {rows,cal,minutes:cal.reduce((n,r)=>n+r.minutes,0),night:cal.reduce((n,r)=>n+r.night,0),unknown:cal.reduce((n,r)=>n+r.unknown,0),scheduledExtra:rows.reduce((n,r)=>n+Math.max(0,r.minutes-r.scheduled),0),holiday:rows.filter(r=>r.kind==='legal').reduce((n,r)=>n+r.minutes,0),delta:reported.reduce((n,r)=>n+r.minutes-r.reported,0),reportedCount:reported.length};}
function period(type,date,settings){const d=dayNum(date),y=+date.slice(0,4),m=+date.slice(5,7);if(type==='day')return [date,date];if(type==='week'){const w=new Date(d*MIN).getUTCDay(),from=shift(date,-((w-settings.weekStart+7)%7));return [from,shift(from,6)]}if(type==='year')return [y+'-01-01',y+'-12-31'];if(type==='agreement'){const from=settings.agreementStart;return [from,shift((+from.slice(0,4)+1)+from.slice(4),-1)]}if(type==='closing'){
 const close=(yy,mm)=>{let last=new Date(Date.UTC(yy,mm,0));return dateFrom(Date.UTC(yy,mm-1,Math.min(settings.closing,last.getUTCDate()))/MIN)};
 let end=close(y,m);if(date>end)end=close(m===12?y+1:y,m===12?1:m+1);let ey=+end.slice(0,4),em=+end.slice(5,7);return [shift(close(em===1?ey-1:ey,em===1?12:em-1),1),end]}
 return [date.slice(0,7)+'-01',dateFrom(Date.UTC(y,m,0)/MIN)];}
function rng(seed){let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}}
function seedOf(key){let n=2166136261;for(const c of key)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0}
function syncClock(s,now){check(Number.isSafeInteger(now),'時計が不正です');check(now>=s.lastSeen-60000,'端末の時計が逆行しています。日時を確認してください');s.lastSeen=Math.max(now,s.lastSeen)}
function availableSlots(s,now=Date.now()){const d=jpDate(now);return [shift(d,-2),shift(d,-1),d].filter(x=>x>=s.createdDate&&(s.daily[x]?.stage||0)<3)}
function runBattle(s,e,seed){const result=battle(s,e,rng(seed));s.seen=[...new Set([...s.seen,e])];s.battles.push({enemy:e,seed,job:s.job,xp:s.xp,result});s.battles=s.battles.slice(-30);return result}
function explore(s,{idle=false,claim=false,now=Date.now()}={}){
 syncClock(s,now);let active=Object.entries(s.daily).find(([,r])=>r.started!==undefined&&r.stage<3);let d=active?.[0]||availableSlots(s,now)[0];check(d,'未消化の探索枠はありません');let row=s.daily[d]??(s.daily[d]={stage:0});
 if(idle){check(!active,'放置探索は進行中です');row.started=now;row.startStage=row.stage;row.snapshot={xp:s.xp,job:s.job,mastery:[...s.mastery],inventory:structuredClone(s.inventory),equip:{...s.equip},tactic:s.tactic};return '放置探索を開始しました。8時間で全区間完了します'}
 let target=3;if(row.started!==undefined){check(claim,'放置探索と同じ枠です。「放置報酬を受取」を使ってください');target=Math.min(3,row.startStage+Math.floor(Math.max(0,now-row.started)/(8*3600000/(3-row.startStage))));check(target>row.stage,'まだ次の区間が完了していません')}
 const logs=[];while(row.stage<target){const fighter=row.snapshot||s,e=Math.min(row.stage,level(fighter.xp)>=7?2:level(fighter.xp)>=4?1:0),seed=seedOf(d+':'+row.stage),r=runBattle({...s,...fighter,battles:s.battles},e,seed);s.battles=s.battles.slice(-30);s.seen=[...new Set([...s.seen,e])];logs.push(enemies[e][0]+'\n'+r.log);if(!r.win){delete row.started;delete row.snapshot;break}s.xp+=[20,30,40][row.stage];s.materials+=[3,4,5][row.stage];row.stage++;if(row.stage===3){s.chests+=1+(rng(seedOf(d+':chest'))()<.3?1:0);s.mastery[fighter.job]+=2;delete row.started;delete row.snapshot}}
 s.lastLog=logs.join('\n\n');return row.stage===3?'探索完了！90EXP・素材12個・宝箱を獲得':'区間を確定しました。敗北時は強化と作戦を見直してください';
}
function quest(s,id='golem') {check(!s.quests.includes(id),'受取済みです');if(id==='golem'){add(s,'w2');add(s,'a1');s.materials+=20}else{check(id==='dragon'&&s.wins.includes(3),'会議ゴーレムの討伐が必要です');s.materials+=20}s.quests.push(id);discover(s);return '対策クエスト報酬を受け取りました'}
function boss(s,e,now=Date.now()){check([3,4].includes(e),'不明なボス');check(s.quests.includes(e===3?'golem':'dragon'),'先に対策クエストを達成してください');let r=runBattle(s,e,seedOf(e+':'+s.battles.length+':'+s.xp));s.lastLog=r.log;if(r.win&&!s.wins.includes(e)){s.wins.push(e);if(e===3){s.materials+=24;s.epicChoice=true}}return r.win?(e===4?'第1章クリア！ 帰宅の英雄となった。':'会議から生還！エピック装備を選択できます'):'改善提案書：貫通武器・防具の強化、安全第一を試してください。EXPや装備の損失はありません'}
function chooseEpic(s,id){check(s.epicChoice&&G[id]?.r==='E','選択報酬を確認してください');add(s,id);s.epicChoice=false;discover(s)}
function discover(s){s.discovered=[...new Set([...s.discovered,...s.inventory.map(i=>i.id)])]}
function chest(s,all=false){let results=[];check(s.chests>0,'宝箱がありません');let n=all?Math.min(s.chests,100):1;for(let i=0;i<n;i++){let text=openChest(s);s.chestHistory.push({item:s.inventory.at(-1).id,at:Date.now()});results.push(text)}s.chestHistory=s.chestHistory.slice(-100);discover(s);return results.join('\n')}
function upgrade(s,uid){let i=s.inventory.find(i=>i.uid===uid);check(i&&i.up<10&&s.materials>=costs[i.up],'素材不足または最大強化です');s.materials-=costs[i.up];i.up++;if(i.up===10&&!s.earnedTitles.includes('強化中毒者'))s.earnedTitles.push('強化中毒者')}
function dismantle(s,uid){const i=s.inventory.find(i=>i.uid===uid);check(i&&!Object.values(s.equip).includes(uid)&&!i.favorite&&!['E','L'].includes(G[i.id].r),'装備中・お気に入り・高レアは分解できません');s.materials+=({C:2,R:4}[G[i.id].r])+Math.floor(costs.slice(0,i.up).reduce((a,b)=>a+b,0)*.7);s.inventory=s.inventory.filter(i=>i.uid!==uid)}
function titles(s){return [...new Set([...(s.earnedTitles||['新人戦士']),...(Object.keys(s.ledger).length>=10?['社会の歯車']:[]),...(Object.keys(s.ledger).length>=30?['記録の達人']:[]),...(Object.values(s.records).some(r=>r.kind==='paid')?['伝説の有休使い']:[]),...(s.wins.includes(3)?['会議からの生還者']:[]),...(s.wins.includes(4)?['締切を超えし者','帰宅の英雄']:[]),...(s.inventory.some(i=>i.up===10)?['強化中毒者']:[]),...(s.discovered.some(id=>G[id].r==='L')?['黄金の引き強']:[]),...(s.mastery.every(x=>x>=14)?['人事部泣かせ']:[])])]}
function migrate(input){let s=structuredClone(input);if(s.version===1){legacyValidate(s);s={...fresh(),...s,version:2,revision:0,createdDate:Object.keys(s.daily).sort()[0]||jpDate(),discovered:[...new Set(s.inventory.map(i=>i.id))],seen:[],chestHistory:[],battles:[],epicChoice:false,earnedTitles:['新人戦士'],settings:{...fresh().settings,...s.settings}};s.revisions=s.revisions.map(r=>({...r,previous:parseRecord(r.previous)}));s.records=Object.fromEntries(Object.entries(s.records).map(([d,r])=>[d,parseRecord(r)]));}if(s.version===2){if(s.earnedTitles===undefined)s.earnedTitles=['新人戦士'];s.settings={skipAnimations:true,legalHoliday:-1,workSystem:'unspecified',...s.settings};}return validate(s)}
function validate(s){check(s&&s.version===2,'対応していないバックアップです');legacyValidate({...s,version:1});check(validDate(s.createdDate)&&integer(s.revision,0,1e9)&&Number.isSafeInteger(s.lastSeen),'保存情報が不正です');
 for(const k of ['records','ledger','daily'])check(s[k]&&typeof s[k]==='object'&&!Array.isArray(s[k]),'保存形式が不正です');
 for(const [d,r]of Object.entries(s.records)){check(validDate(d)&&d===r.date,'勤務日が不正です');const v=parseRecord(r);check(v.minutes===r.minutes&&v.night===r.night&&JSON.stringify(v.intervals)===JSON.stringify(r.intervals),'勤務計算の整合性が不正です')}
 const all=Object.values(s.records).flatMap(r=>r.intervals.map(i=>[...i,r.date])).sort((a,b)=>a[0]-b[0]);for(let i=1;i<all.length;i++)check(all[i][0]>=all[i-1][1],'勤務記録間で時間が重複しています');
 for(const d of Object.keys(s.ledger))check(validDate(d),'報酬日が不正です');
 check(Array.isArray(s.earnedTitles)&&s.earnedTitles.every(t=>typeof t==='string'&&t.length<=40),'称号履歴が不正です');check(Array.isArray(s.discovered)&&s.discovered.every(id=>Object.hasOwn(G,id))&&Array.isArray(s.seen)&&s.seen.every(e=>integer(e,0,4)),'図鑑参照が不正です');check(s.wins.every(e=>[3,4].includes(e))&&s.quests.every(q=>['golem','dragon'].includes(q)),'攻略情報が不正です');
 for(const [d,r]of Object.entries(s.daily)){check(validDate(d)&&integer(r.farm||0,0,6),'探索日・周回素材が不正です');if(r.started!==undefined){check(Number.isSafeInteger(r.started)&&integer(r.startStage,0,2)&&r.stage>=r.startStage&&r.snapshot,'放置探索が不正です');const f=r.snapshot;check(integer(f.xp,0,1e8)&&integer(f.job,0,2)&&Array.isArray(f.mastery)&&f.mastery.length===3&&f.mastery.every(x=>integer(x,0,1e8)),'放置探索の職業が不正です');legacyValidate({...s,...f,version:1})}}
 check(Object.values(s.daily).filter(r=>r.started!==undefined&&r.stage<3).length<=1,'放置探索が重複しています');
 check(integer(s.settings.legalHoliday,-1,6)&&['unspecified','fixed','variable','flex'].includes(s.settings.workSystem)&&typeof s.settings.skipAnimations==='boolean'&&typeof s.settings.reducedMotion==='boolean'&&integer(s.settings.volume,0,100),'表示・勤務制度設定が不正です');check(integer(s.settings.weekStart,0,6)&&integer(s.settings.closing,1,31)&&validDate(s.settings.agreementStart)&&!s.settings.agreementStart.endsWith('02-29'),'集計設定が不正です');check(Array.isArray(s.battles)&&Array.isArray(s.chestHistory)&&typeof s.epicChoice==='boolean','ゲーム履歴が不正です');
 for(const h of s.chestHistory)check(h&&Object.hasOwn(G,h.item)&&Number.isSafeInteger(h.at),'宝箱履歴が不正です');
 for(const b of s.battles)check(b&&integer(b.enemy,0,4)&&integer(b.seed,0,4294967295)&&integer(b.job,0,2)&&b.result&&typeof b.result.log==='string'&&typeof b.result.win==='boolean','戦闘履歴が不正です');
 for(const r of s.revisions){check(r&&validDate(r.date)&&Number.isSafeInteger(r.at)&&r.previous,'訂正履歴が不正です');parseRecord(r.previous)}
 check(typeof s.lastLog==='string'&&s.lastLog.length<=100000,'ログが不正です');
 return s}
function csv(s){const cell=v=>'"'+String(v??'').replace(/^[\s]*[=+@-]/,"'$&").replace(/"/g,'""')+'"';return '\ufeff'+[['勤務開始日','区分','実労働分','深夜分（空欄は不明）','申告分','所定分','休暇分','確定','メモ'],...Object.values(s.records).sort((a,b)=>a.date.localeCompare(b.date)).map(r=>[r.date,kinds[r.kind],r.minutes,r.night,r.reported,r.scheduled,r.leave,r.confirmed?'確定':'下書き',r.memo])].map(r=>r.map(cell).join(',')).join('\r\n')}
export {gear,G,jobs,enemies,costs,rar,slots,kinds,fmt,fresh,level,equipStats,add,parseRecord,saveRecord,removeRecord,aggregate,calendarRows,period,shift,jpDate,validDate,battle,rng,explore,availableSlots,quest,boss,chest,openChest,upgrade,dismantle,chooseEpic,titles,migrate,validate,csv,discover};

function farm(s,now=Date.now()){syncClock(s,now);const d=jpDate(now),r=s.daily[d]??(s.daily[d]={stage:0});check(r.stage===3,'今日の通常探索を完了すると追加周回できます');check((r.farm||0)<6,'今日の追加素材は上限6個です');const result=runBattle(s,2,seedOf(d+':farm:'+r.farm));s.lastLog=result.log;if(result.win){r.farm=(r.farm||0)+2;s.materials+=2;return '追加素材2個を獲得（本日 '+r.farm+'/6個）'}return '追加周回に敗北しました。損失はありません'}
export {farm};

const effects={w0:'特殊効果なし',w1:'特殊効果なし',w2:'貫通40%',w3:'20%で威力50%の追加攻撃（1行動1回）',w4:'最初の攻撃1回は防御無視',a0:'特殊効果なし',a1:'特殊効果なし',a2:'HP+15を含む',a3:'致命傷を1戦1回HP1で耐える',x0:'特殊効果なし',x1:'会心率+3%',x2:'HP+25を含む',x3:'HP50%以下で最大HP15%回復・1回',x4:'毎ターン最大HP3%回復',x5:'弱体化の持続を1T短縮（最低1T）'};
function compareEquipment(s,uid){const item=s.inventory.find(i=>i.uid===uid);check(item,'装備がありません');const slot=G[item.id].slot,current=s.inventory.find(i=>i.uid===s.equip[slot]),before=equipStats(s),after=equipStats({...s,equip:{...s.equip,[slot]:uid}});return {current:current.id,before,after,delta:{hp:after.hp-before.hp,atk:after.atk-before.atk,def:after.def-before.def},effect:effects[item.id],previousEffect:effects[current.id]}}
export {compareEquipment,effects};
