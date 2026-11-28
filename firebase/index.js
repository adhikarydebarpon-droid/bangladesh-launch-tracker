const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {setGlobalOptions} = require('firebase-functions/v2');
const {initializeApp} = require('firebase-admin/app');
const {getAuth} = require('firebase-admin/auth');
const {onUserCreated} = require('firebase-functions/v2/identity');
const {getDatabase, ServerValue} = require('firebase-admin/database');
setGlobalOptions({region: 'asia-southeast1'});
initializeApp({databaseURL: 'https://bangladesh-launch-tracker-default-rtdb.asia-southeast1.firebasedatabase.app'});
const ADMIN_UID = 'JocEPSTwOYXA4FvhYnf0xox7Lce2';
const ADMIN_EMAIL = 'adhikarydebarpon@gmail.com';
function requireUser(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'লগইন প্রয়োজন।');
  return request.auth;
}
function requireAdmin(request) {
  const t = request.auth && request.auth.token;
  if (!request.auth || request.auth.uid !== ADMIN_UID || !t || t.email !== ADMIN_EMAIL || t.email_verified !== true) {
    throw new HttpsError('permission-denied', 'শুধু নির্ধারিত Admin এই কাজ করতে পারবেন।');
  }
}
function clean(v, max=180) {
  if (typeof v !== 'string') throw new HttpsError('invalid-argument', 'তথ্যের ধরন সঠিক নয়।');
  const s = v.trim().replace(/\s+/g, ' ');
  if (!s || s.length > max) throw new HttpsError('invalid-argument', 'তথ্য ফাঁকা বা অতিরিক্ত বড়।');
  return s;
}
exports.setOwnerClaim = onCall(async request => {
  requireAdmin(request);
  await getAuth().setCustomUserClaims(ADMIN_UID, {bltAdmin: true});
  return {ok: true, refreshTokenRequired: true};
});
exports.registerLeaderboardUser = onUserCreated(async event => {
  const user=event.data;
  if(!user || !user.uid) return;
  await getDatabase().ref(`leaderboard/${user.uid}`).transaction(current => current || {uid:user.uid,displayName:user.displayName || user.email || 'ব্যবহারকারী',points:0,approvedPosts:0,createdAt:Date.now()});
});
exports.syncLeaderboardUsers = onCall(async request => {
  requireAdmin(request);
  const db=getDatabase(), auth=getAuth();
  let pageToken, count=0;
  do {
    const page=await auth.listUsers(1000,pageToken);
    for(const user of page.users){
      await db.ref(`leaderboard/${user.uid}`).transaction(current=>({...current,uid:user.uid,displayName:user.displayName || user.email || current?.displayName || 'ব্যবহারকারী',points:Number(current?.points||0),approvedPosts:Number(current?.approvedPosts||0)}));
      count++;
    }
    pageToken=page.pageToken;
  } while(pageToken);
  return {ok:true,count};
});
exports.submitProposal = onCall(async request => {
  const auth = requireUser(request), d = request.data || {};
  const type = d.type;
  if (!['launch','route','ghat'].includes(type)) throw new HttpsError('invalid-argument','প্রস্তাবের ধরন সঠিক নয়।');
  const record = {type, name: clean(d.name,100), route: typeof d.route==='string'?d.route.trim().slice(0,180):'', from: typeof d.from==='string'?d.from.trim().slice(0,80):'', to: typeof d.to==='string'?d.to.trim().slice(0,80):'', area: typeof d.area==='string'?d.area.trim().slice(0,100):'', details: typeof d.details==='string'?d.details.trim().slice(0,500):'', authorUid:auth.uid, author:auth.token.name || auth.token.email || 'ব্যবহারকারী', status:'pending', createdAt:Date.now()};
  const hasEnglish = value => /[A-Za-z]/.test(String(value||''));
  const hasBangla = value => /[\u0980-\u09FF]/.test(String(value||''));
  if(type==='launch'){
    if(hasEnglish(record.name)) throw new HttpsError('invalid-argument','লঞ্চের নাম বাংলায় লিখুন। ইংরেজি অক্ষরে লঞ্চের নাম অনুমোদিত হবে না।');
    if(!/^এম\. ভি\. [\u0980-\u09FF]/.test(record.name)) throw new HttpsError('invalid-argument','এম. ভি. (লঞ্চের নাম) এভাবে লঞ্চের নাম লিখুন।');
  } else if(type==='route'){
    if(hasEnglish(record.from)||hasEnglish(record.to)||!hasBangla(record.from)||!hasBangla(record.to)) throw new HttpsError('invalid-argument','রুটের নাম বাংলায় লিখুন। ইংরেজি অক্ষর ব্যবহার করবেন না।');
  } else if(type==='ghat'){
    if(hasEnglish(record.name)||!hasBangla(record.name)) throw new HttpsError('invalid-argument','ঘাটের নাম বাংলায় লিখুন। ইংরেজি অক্ষর ব্যবহার করবেন না।');
  }
  const db=getDatabase();
  const target=type==='launch'?'launches':type==='route'?'routes':'ghats';
  const list=(await db.ref(target).get()).val()||{};
  const key=record.name.toLocaleLowerCase('bn');
  if(Object.values(list).some(x=>{
    if(type==='launch')return String(x.name||'').trim().toLocaleLowerCase('bn')===key&&String(x.route||'').trim().toLocaleLowerCase('bn')===record.route.toLocaleLowerCase('bn');
    return String(x.name||x.label||`${x.from||''} → ${x.to||''}`).trim().toLocaleLowerCase('bn')===key;
  })) throw new HttpsError('already-exists','একই নাম বা রুট আগে থেকেই আছে।');
  const pending=(await db.ref('proposals').get()).val()||{};
  if(Object.values(pending).some(items=>Object.values(items||{}).some(x=>{
    if(x.type!==type||x.status!=='pending')return false;
    if(type==='launch')return String(x.name||'').trim().toLocaleLowerCase('bn')===key&&String(x.route||'').trim().toLocaleLowerCase('bn')===record.route.toLocaleLowerCase('bn');
    return String(x.name||'').trim().toLocaleLowerCase('bn')===key;
  }))) throw new HttpsError('already-exists','একই প্রস্তাব ইতিমধ্যে Pending আছে।');
  const id=typeof d.id==='string'&&/^[A-Za-z0-9_-]{5,100}$/.test(d.id)?d.id:db.ref(`proposals/${auth.uid}`).push().key;
  const ref=db.ref(`proposals/${auth.uid}/${id}`);
  await ref.set(record);
  return {ok:true,id:ref.key,status:'pending'};
});
exports.submitFare = onCall(async request => {
  const auth=requireUser(request), d=request.data||{};
  const record={launchId:clean(d.launchId,100),launchName:clean(d.launchName,100),route:clean(d.route,180),fareType:clean(d.fareType,50),amount:Number(d.amount),authorUid:auth.uid,status:'pending',createdAt:Date.now()};
  if(!Number.isFinite(record.amount)||record.amount<=0||record.amount>1000000) throw new HttpsError('invalid-argument','ভাড়ার পরিমাণ সঠিক নয়।');
  const id=typeof d.id==='string'&&/^[A-Za-z0-9_-]{5,100}$/.test(d.id)?d.id:getDatabase().ref(`fareProposals/${auth.uid}`).push().key; const ref=getDatabase().ref(`fareProposals/${auth.uid}/${id}`); await ref.set(record); return {ok:true,id};
});
exports.submitSchedule = onCall(async request => {
  const auth=requireUser(request), d=request.data||{};
  const record={launchId:clean(d.launchId,100),launchName:clean(d.launchName,100),route:clean(d.route,180),date:clean(d.date,10),departure:clean(d.departure,5),authorUid:auth.uid,status:'pending',createdAt:Date.now()};
  if(!/^\d{4}-\d{2}-\d{2}$/.test(record.date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(record.departure)) throw new HttpsError('invalid-argument','যাত্রার তারিখ ও ছাড়ার সময় সঠিকভাবে দিন।');
  const all=(await getDatabase().ref('schedulePosts').get()).val()||{};
  const duplicate=Object.values(all).some(posts=>Object.values(posts||{}).some(p=>p.launchId===record.launchId&&p.date===record.date&&p.departure===record.departure&&p.route.trim().toLocaleLowerCase('bn')===record.route.toLocaleLowerCase('bn')&&p.status!=='rejected'));
  if(duplicate) throw new HttpsError('already-exists','এই লঞ্চের একই তারিখ, রুট ও ছাড়ার সময়ের শিডিউল আগে জমা হয়েছে।');
  const id=typeof d.id==='string'&&/^[A-Za-z0-9_-]{5,100}$/.test(d.id)?d.id:getDatabase().ref(`schedulePosts/${auth.uid}`).push().key; const ref=getDatabase().ref(`schedulePosts/${auth.uid}/${id}`); await ref.set(record); return {ok:true,id,status:'pending'};
});
exports.moderateProposal = onCall(async request => {
  requireAdmin(request);
  const {uid, proposalId, decision} = request.data || {};
  if (typeof uid !== 'string' || typeof proposalId !== 'string' || !['approved','rejected'].includes(decision)) throw new HttpsError('invalid-argument','প্রস্তাবের তথ্য সঠিক নয়।');
  const db=getDatabase(), ref=db.ref(`proposals/${uid}/${proposalId}`), snap=await ref.get();
  if(!snap.exists()||snap.val().status!=='pending') throw new HttpsError('failed-precondition','Pending প্রস্তাব পাওয়া যায়নি।');
  const p=snap.val(), updates={};
  updates[`proposals/${uid}/${proposalId}/status`]=decision;
  updates[`proposals/${uid}/${proposalId}/reviewedAt`]=Date.now();
  if(decision==='approved'){
    const target=p.type==='launch'?'launches':p.type==='route'?'routes':p.type==='ghat'?'ghats':null;
    if(!target) throw new HttpsError('invalid-argument','প্রস্তাবের ধরন সমর্থিত নয়।');
    const name=String(p.name||'').trim(), key=name.toLocaleLowerCase('bn');
    const all=(await db.ref(target).get()).val()||{};
    if(p.type==='launch'){
      if(/[A-Za-z]/.test(name)||!/^এম\. ভি\. [\u0980-\u09FF]/.test(name)) throw new HttpsError('failed-precondition','এম. ভি. (লঞ্চের নাম) এভাবে লঞ্চের নাম লিখুন।');
      if(Object.values(all).some(x=>String(x.name||'').trim().toLocaleLowerCase('bn')===key&&String(x.route||'').trim().toLocaleLowerCase('bn')===String(p.route||'').trim().toLocaleLowerCase('bn'))) throw new HttpsError('already-exists','এই লঞ্চের একই রুট আগে থেকেই আছে।');
    }else if(Object.values(all).some(x=>String(x.name||x.label||`${x.from||''} → ${x.to||''}`).trim().toLocaleLowerCase('bn')===key)) throw new HttpsError('already-exists','Duplicate তথ্য; প্রকাশ করা হয়নি।');
    const id=db.ref(target).push().key;
    const publicRecord=p.type==='route'?{id,from:p.from,to:p.to,name,status:'approved',source:'passenger',createdAt:Date.now()}:{...p,id,status:'approved',source:'passenger',createdAt:Date.now()};
    updates[`${target}/${id}`]=publicRecord;
  }
  await db.ref().update(updates); return {ok:true,decision};
});
exports.moderateFare = onCall(async request => {
  requireAdmin(request);
  const {uid,fareId,decision}=request.data||{};
  if(typeof uid!=='string'||typeof fareId!=='string'||!['approved','rejected'].includes(decision)) throw new HttpsError('invalid-argument','ভাড়ার প্রস্তাবের তথ্য সঠিক নয়।');
  const db=getDatabase(), ref=db.ref(`fareProposals/${uid}/${fareId}`), snap=await ref.get();
  if(!snap.exists()||snap.val().status!=='pending') throw new HttpsError('failed-precondition','Pending ভাড়া পাওয়া যায়নি।');
  const p=snap.val(), updates={[`fareProposals/${uid}/${fareId}/status`]:decision,[`fareProposals/${uid}/${fareId}/reviewedAt`]:Date.now()};
  if(decision==='approved'){const id=db.ref('fares').push().key;updates[`fares/${id}`]={...p,id,status:'approved',createdAt:Date.now()};}
  await db.ref().update(updates);return {ok:true};
});
exports.approveScheduleAndAward = onCall(async request => {
  requireAdmin(request);
  const {uid,postId}=request.data||{};
  if(typeof uid!=='string'||typeof postId!=='string') throw new HttpsError('invalid-argument','পোস্টের তথ্য সঠিক নয়।');
  const db=getDatabase(), postRef=db.ref(`schedulePosts/${uid}/${postId}`), postSnap=await postRef.get();
  if(!postSnap.exists()||postSnap.val().status!=='pending') throw new HttpsError('failed-precondition','পোস্টটি Pending নেই বা আগে অনুমোদিত হয়েছে।');
  const post=postSnap.val();
  if(!post.launchId||!post.route||!/^\d{4}-\d{2}-\d{2}$/.test(String(post.date||''))||!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(post.departure||''))) throw new HttpsError('failed-precondition','শিডিউলের লঞ্চ, রুট, তারিখ বা ছাড়ার সময় অসম্পূর্ণ।');
  // One vessel per exact trip: date + directional route + departure time.
  const routeKey=encodeURIComponent(String(post.route).trim().replace(/\s+/g,' ').toLocaleLowerCase('bn'));
  const tripKey=`${routeKey}__${encodeURIComponent(post.departure)}`;
  const selectionRef=db.ref(`dailyLaunchSelections/${post.date}/${tripKey}`);
  const selectionTx=await selectionRef.transaction(current=>{
    if(current&&current.launchId&&current.launchId!==post.launchId)return;
    return {launchId:post.launchId,launchName:post.launchName||'',route:post.route,departure:post.departure,date:post.date,uid,postId,updatedAt:Date.now()};
  });
  if(!selectionTx.committed) throw new HttpsError('already-exists','এই তারিখ, রুট ও ছাড়ার সময়ের জন্য অন্য একটি লঞ্চ ইতিমধ্যে অনুমোদিত হয়েছে।');
  const tx=await postRef.transaction(p=>p&&p.status==='pending'?{...p,status:'approved',reviewedAt:Date.now()}:undefined);
  if(!tx.committed) throw new HttpsError('failed-precondition','পোস্টটি Pending নেই বা আগে অনুমোদিত হয়েছে।');
  const awardRef=db.ref(`points/${postId}`), award=await awardRef.transaction(v=>v||{uid,points:5,postId,createdAt:Date.now()});
  if(award.committed){const userRef=db.ref(`leaderboard/${uid}`);const authUser=await getAuth().getUser(uid);await userRef.transaction(u=>({...u,uid,displayName:(u||{}).displayName||authUser.displayName||authUser.email||'ব্যবহারকারী',points:Number((u||{}).points||0)+5,approvedPosts:Number((u||{}).approvedPosts||0)+1}));}
  return {ok:true,selectedLaunchId:post.launchId,tripKey};
});
