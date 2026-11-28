import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const rules=JSON.parse(readFileSync(new URL('../firebase/database.rules.json',import.meta.url),'utf8')).rules;
const functions=readFileSync(new URL('../functions/index.js',import.meta.url),'utf8');
test('app branding shows only the app name without V1',()=>{assert.ok(html.includes('বাংলাদেশের প্রথম তথ্যবহুল নৌপথের অ্যাপ'));assert.ok(html.includes('<title>Bangladesh Launch Tracker</title>'));assert.ok(!html.includes('<span class="pill">V1</span>'));assert.ok(!html.includes('Bangladesh Launch Tracker V1'));});
test('fixed sole owner identity in client and rules',()=>{assert.ok(html.includes('JocEPSTwOYXA4FvhYnf0xox7Lce2'));assert.ok(html.includes('adhikarydebarpon@gmail.com'));assert.ok(JSON.stringify(rules).includes('JocEPSTwOYXA4FvhYnf0xox7Lce2'));assert.ok(JSON.stringify(rules).includes('adhikarydebarpon@gmail.com'));});
test('Realtime Database rules use Firebase Rules equality and no legacy triple-equals',()=>assert.ok(!JSON.stringify(rules).includes('===')));
test('no demo admin credential',()=>assert.ok(!html.includes('DEMO-ADMIN-2026')&&!html.includes('demoAdminLogin')));
test('daily launch selection is server-owned and read-only to clients',()=>{assert.equal(rules.dailyLaunchSelections.$date.$routeKey['.write'],false);});
test('atomic GPS lock and expiry',()=>{assert.ok(html.includes('runTransaction(lockRef'));assert.ok(JSON.stringify(rules).includes('gpsLocks'));assert.ok(JSON.stringify(rules).includes('expiresAt'))});
test('Nearby uses bounded geohash query, not whole GPS root listener',()=>{assert.ok(html.includes('geohashQueryBounds'));assert.ok(html.includes('orderByChild("geohash")'));assert.ok(JSON.stringify(rules).includes('".indexOn":["geohash"]'));assert.ok(!html.slice(html.indexOf('async function syncFromFirebase'),html.indexOf('async function pushToFirebase')).includes('onValue(gpsRef'))});
test('seed launch IDs are stable across devices',()=>assert.ok(html.includes('function stableLaunchId(name)')));
test('daily trip selections are stored under date, route and departure time',()=>{assert.ok(html.includes('dailyLaunchSelections/${date}/${tripSelectionKey(route,departure)}'));assert.ok(html.includes('function tripSelectionKey(route,departure)'));});
test('fare and proposal moderation callable endpoints exist',()=>{for(const name of ['submitProposal','submitFare','submitSchedule','moderateProposal','moderateFare','approveScheduleAndAward'])assert.ok(functions.includes(`exports.${name}`));});
test('ship heading and nautical mile conversion exist',()=>{assert.ok(html.includes('1852'));assert.ok(html.includes('s.heading'));assert.ok(html.includes('🚢'))});

test('requested launch list corrections and legacy cleanup',()=>{
 assert.ok(html.includes('["সোনার তরী ৩","ঢাকা ↔ চাঁদপুর"]'));
 assert.ok(html.includes('["জুনায়েদ-৫","ঢাকা → নড়িয়া"]'));
 assert.ok(!html.includes('["জুনায়েদ","সুরেশ্বর'));
 assert.ok(!html.includes('["নাঈম মীম-৭"'));
 assert.ok(!html.includes('["প্রিন্স সাদিম-৭"'));
 assert.ok(html.includes('function normalizeLaunchRecords(records)'));
 assert.ok(html.includes('REMOVED_LAUNCH_KEYS'));
});

test('Dhaka remaining distance is shown as a straight-line estimate, not a route claim',()=>{assert.ok(html.includes('const DHAKA_REFERENCE={lat:23.7104,lng:90.4074}'));assert.ok(html.includes('function distanceToDhakaKm(lat,lng)'));assert.ok(html.includes('ঢাকা পর্যন্ত (সরলরেখায়)'));assert.ok(html.includes('ঢাকা ${distanceToDhakaKm'));});

test('bidirectional seed routes preserve the same launch name with route-specific IDs',()=>{
 assert.ok(html.includes('function expandRouteDirections(route)'));
 assert.ok(html.includes('function stableLaunchRouteId(name,route)'));
 assert.ok(html.includes('launches:expandSeedLaunches(seedLaunches)'));
 assert.ok(html.includes('function mergeLaunchRecords(local,remote)'));
});
test('passenger launch, route and ghat proposals require Bengali formatting',()=>{
 assert.ok(html.includes('এম. ভি. (লঞ্চের নাম) এভাবে লঞ্চের নাম লিখুন।'));
 assert.ok(html.includes('function hasEnglishLetters(value)'));
 assert.ok(html.includes('quickLaunchNameWarning'));
 assert.ok(html.includes('routeFromWarning'));
 assert.ok(html.includes('ghatNameWarning'));
});
test('Admin explanatory warning text removed without changing Admin identity',()=>{
 assert.ok(!html.includes('Admin হিসেবে প্রবেশের জন্য নির্দিষ্ট Google/Email অ্যাকাউন্টে verified email আবশ্যক'));
 assert.ok(html.includes('const ADMIN_UID = "JocEPSTwOYXA4FvhYnf0xox7Lce2"'));
});


test('schedule selection offers all approved launches for the chosen directional route',()=>{
 assert.ok(html.includes('id=\"timeLaunchChoices\"'));
 assert.ok(html.includes('class=\"schedule-launch-choice\"'));
 assert.ok(html.includes('একটি লঞ্চে টিক দিন'));
 assert.ok(html.includes('function renderScheduleLaunchChoicesForRoute()'));
 assert.ok(html.includes('other.checked=false'));
 assert.ok(!html.includes('class=\"daily-launch-choice\"'));
});

test('multi-stop bidirectional routes create exact forward and reverse directions',()=>{assert.ok(html.includes('parts.length>=2'));assert.ok(html.includes('[...parts].reverse().join(\" → \"'));});
test('trip selection is separated by date, directional route and departure time',()=>{
 assert.ok(html.includes('dailyLaunchSelections/${date}/${tripSelectionKey(route,departure)}'));
 assert.ok(html.includes('await saveDailyLaunchSelection(launchRecord,item.date,item.departure)'));
 assert.ok(html.includes('শিডিউল Admin অনুমোদনের পর ট্রিপ নির্বাচন সক্রিয় হবে।'));
 assert.ok(functions.includes('dailyLaunchSelections/${post.date}/${tripKey}'));
 assert.ok(functions.includes('p.departure===record.departure'));
 assert.ok(functions.includes('এই তারিখ, রুট ও ছাড়ার সময়ের জন্য অন্য একটি লঞ্চ'));
});
test('extra lemon banner subtitle removed',()=>assert.ok(!html.includes('এই রুটে এই লঞ্চের জায়গায় আজকে এই লঞ্চ যাবে — যাত্রীদের জমা দেওয়া নোটিশ।')));
