/* Driving exam cross-device cloud sync (Firebase compat SDK).
 * Offline-first: existing localStorage remains usable while cloud is unavailable.
 * Privacy: per-user documents only; see firestore.rules.
 */
(function(){
"use strict";
const config=window.DRIVING_FIREBASE_CONFIG;
const status=document.getElementById("syncStatus"),login=document.getElementById("googleLogin"),logout=document.getElementById("googleLogout");
const K="driving-mistake-stats-v2",H="driving-score-history",W="driving-wrong-ids",A="driving-attempted-ids-v1";
const L="driving-cloud-legacy-baseline-v1",S="driving-cloud-session-queue-v1",I="driving-cloud-import-id-v1";
const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const put=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const uid=()=>firebase.auth().currentUser?.uid;
const configOK=!!(config&&config.apiKey&&config.authDomain&&config.projectId&&config.appId&&window.firebase?.auth&&window.firebase?.firestore);
let db,auth,syncing=false;
function info(s){if(status)status.textContent=s}
function randomId(){return crypto?.randomUUID?.() || Date.now().toString(36)+"-"+Math.random().toString(36).slice(2)}
function ensureBaseline(){
 if(read(L,null))return read(L,null);
 const snapshot={id:randomId(),records:read(K,{}),history:read(H,[]),attemptedIds:read(A,[]),oldWrongIds:read(W,[]),importedAt:new Date().toISOString()};
 put(L,snapshot);put(I,snapshot.id);return snapshot;
}
function addLocalSession(session){
 const queue=read(S,[]);if(!queue.some(v=>v.id===session.id)){queue.push(session);put(S,queue)}
}
function derive(imports,sessions){
 const rec={},seenIds=new Set(),wrongIds=new Set(),history=[];
 const mark=(n,r)=>{
  if(!Number.isInteger(+n)||+n<1||+n>1090)return;
  let old=rec[n]||{seen:0,wrong:0,correct:0};
  old.seen+=(+r.seen||0);old.wrong+=(+r.wrong||0);old.correct+=(+r.correct||0);
  if(r.lastWrongAt&&(!old.lastWrongAt||String(r.lastWrongAt)>String(old.lastWrongAt))){old.lastWrongAt=r.lastWrongAt;old.lastWrongAnswer=r.lastWrongAnswer}
  if(r.category)old.category=r.category;rec[n]=old;
  if(old.seen>0)seenIds.add(+n);if(old.wrong>0)wrongIds.add(+n)
 };
 for(const v of imports){
  for(const [n,r] of Object.entries(v.records||{}))mark(n,r);
  for(const n of v.attemptedIds||[])if(Number(n)>=1&&Number(n)<=1090)seenIds.add(+n);
  for(const n of v.oldWrongIds||[])if(Number(n)>=1&&Number(n)<=1090)wrongIds.add(+n);
  for(let i=0;i<(v.history||[]).length;i++){const h=v.history[i];history.push({...h,_cloudId:v.id+":old:"+i})}
 }
 for(const s of sessions){
  history.push({date:s.date,score:s.score,max:s.max,wrong:s.wrong,answered:s.answered,kind:s.kind,_cloudId:s.id});
  for(const entry of s.answers||[]){
   if(!Number.isInteger(entry.n)||entry.n<1||entry.n>1090)continue;
   const r={seen:1,correct:entry.selected===entry.correct?1:0,wrong:entry.selected!==entry.correct?1:0};
   if(r.wrong){r.lastWrongAnswer=entry.selected||null;r.lastWrongAt=s.date}
   mark(entry.n,r);
   if(entry.selected)seenIds.add(entry.n)
  }
 }
 history.sort((a,b)=>String(a.date||"").localeCompare(String(b.date||"")));
 return {rec,history,seenIds:[...seenIds],wrongIds:[...wrongIds]};
}
async function syncNow(){
 if(!uid()||syncing)return;
 syncing=true;info("雲端同步中（保留本機紀錄）…");
 try{
  const user=uid(),root=db.collection("drivingUsers").doc(user),baseline=ensureBaseline();
  await root.set({schemaVersion:1,ownerUid:user,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
  await root.collection("legacyImports").doc(baseline.id).set(baseline);
  const queue=read(S,[]);
  for(const session of queue){await root.collection("examSessions").doc(session.id).set(session)}
  const [oldSnap,sessionSnap]=await Promise.all([root.collection("legacyImports").get(),root.collection("examSessions").get()]);
  const imports=oldSnap.docs.map(x=>x.data()),sessions=sessionSnap.docs.map(x=>x.data());
  const merged=derive(imports,sessions);
  // All cloud docs successfully read: now replace local cache with a derived merged view.
  put(K,merged.rec);put(H,merged.history);put(A,merged.seenIds);put(W,merged.wrongIds);put(S,[]);
  if(typeof window.summary==="function")window.summary();
  info("已同步 Google 帳號｜"+merged.history.length+" 次測驗｜"+merged.seenIds.length+" 題");
 }catch(e){info("雲端同步未完成，本機紀錄仍保留："+(e.code||e.message||e))}
 finally{syncing=false}
}
window.DrivingCloud={
 recordSession(session){addLocalSession(session);if(uid())syncNow()},
 sync:syncNow,
 connected(){return !!uid()}
};
if(!configOK){
 info("雲端同步待啟用：需先完成 Firebase 專案設定。現有本機紀錄照常保存。");
 if(login)login.disabled=true;return;
}
try{
 firebase.initializeApp(config);auth=firebase.auth();db=firebase.firestore();
 auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(()=>{});
 login.onclick=async()=>{
  try{info("正在以 Google 登入…");await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())}
  catch(e){info("登入未完成："+(e.code||e.message))}
 };
 logout.onclick=()=>auth.signOut();
 auth.onAuthStateChanged(user=>{
  login.hidden=!!user;logout.hidden=!user;
  if(user){info("已登入："+(user.email||"Google 帳號")+"，準備同步…");syncNow()}
  else info("尚未登入 Google；紀錄仍保存在這台裝置。");
 });
 window.addEventListener("online",()=>{if(uid())syncNow()});
}catch(e){info("同步設定錯誤："+(e.code||e.message))}
})();
