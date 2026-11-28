BANGLADESH LAUNCH TRACKER
============================

মূল ফাইল: index.html
সংস্করণ: 1.0.2
স্লোগান: বাংলাদেশের প্রথম তথ্যবহুল নৌপথের অ্যাপ

এই প্যাকেজটি ব্যবহারকারীর দেওয়া index-2.html-কে ভিত্তি করে তৈরি। Firebase Web Config পূর্বে ব্যবহারকারীর দেওয়া প্রকৃত project config থেকে নেওয়া হয়েছে; নতুন/কাল্পনিক Config তৈরি করা হয়নি। Admin authorization নির্দিষ্ট UID + exact email + verified email দিয়ে সীমাবদ্ধ।

গুরুত্বপূর্ণ নিরাপত্তা ও আচরণ
----------------------------
- Realtime Database Rules default-deny; public launch/route/ghat/fare data read-only।
- Admin moderation ও point award Cloud Functions callable দিয়ে হয়; সাধারণ client সরাসরি public তালিকা বা points লিখতে পারে না।
- GPS lock প্রতি launch ID-তে RTDB transaction দিয়ে নেওয়া হয়; সক্রিয় lock থাকলে দ্বিতীয় ব্যবহারকারী lock পাবে না।
- GPS session-এ geohash থাকে; Nearby Launches geofire-common geohashQueryBounds দিয়ে radius-ভিত্তিক সীমিত query করে, এরপর Haversine দিয়ে সঠিক দূরত্ব যাচাই করে।
- Nearby query ৫/১০/২০/৫০ কিমি; শুধুমাত্র authenticated user query করতে পারে।
- GPS session ১২০ সেকেন্ডের বেশি stale/expired হলে UI-তে live হিসেবে দেখানো হয় না। RTDB নিজে expired record মুছে দেয় না।
- প্রতিটি route/date-এর জন্য একটি daily launch selection Firebase-এ transaction দিয়ে sync হয়; সর্বশেষ নির্বাচনের আগের মানের history সীমিতভাবে রাখা হয়।
- Seed launch IDs deterministic, যাতে আলাদা ফোনে একই seed launch-এর ID একই হয়।
- Map marker ship icon; heading পাওয়া গেলে তীর ঘোরে, heading না থাকলে তীর লুকানো থাকে। নিজের session ও অন্য session আলাদা রঙে।
- speed Knot; distance NM (১ NM = ১,৮৫২ মিটার)।
- Firebase Rules পরিবর্তনের আগে বর্তমান live Rules ও data backup নিন। এই প্যাকেজ Rules deploy করেনি।

Firebase Deploy
---------------
Firebase project: bangladesh-launch-tracker
Realtime Database URL: https://bangladesh-launch-tracker-default-rtdb.asia-southeast1.firebasedatabase.app

১. Firebase Console > Authentication-এ Google এবং Email/Password provider enable করুন।
২. Realtime Database-এর বর্তমান data ও Rules backup নিন।
৩. Firebase CLI install/login করুন।
৪. project directory-তে চালান:
   firebase use bangladesh-launch-tracker
   cd functions && npm install && cd ..
   firebase deploy --only database,functions
৫. Functions deploy-এর পরে owner account দিয়ে sign-in করুন। Owner UID, email এবং email verification ঠিক থাকতে হবে।
৬. Admin custom claim refresh প্রয়োজন হলে নির্ধারিত owner account থেকে setOwnerClaim callable চালান। Database Rules-এও exact UID + email + verified email পরীক্ষা করা হয়।
৭. Netlify-তে project root deploy করুন; অথবা Firebase Hosting ব্যবহার করলে `firebase deploy --only hosting` চালান।

Billing নোট: Firebase Cloud Functions deploy করতে সাধারণত Blaze billing plan প্রয়োজন। Project যদি Spark plan-এ থাকে, Functions deploy আটকে যাবে; billing enable না করে live backend সম্পূর্ণ চালু করা যাবে না।

প্রকাশের আগে আবশ্যিক live test
------------------------------
- Rules Emulator test এবং live Rules publish-এর আগে schema review
- Owner login, non-owner admin denial
- দুইটি আলাদা ফোনে একই launch-এর GPS Lock: প্রথমটি lock পাবে, দ্বিতীয়টি “ইতিমধ্যে একজন লঞ্চের লোকেশন শেয়ার করছে।” পাবে
- Stop Sharing/১২০ সেকেন্ড expiry-এর পর দ্বিতীয় ফোন lock পায় কি না
- একাধিক launch GPS শেয়ার করলে Nearby query-তে একাধিক launch পাওয়া
- ৫/১০/২০/৫০ কিমি range, stale session বাদ পড়া, map marker/heading/speed/NM
- proposal/fare/schedule submit, owner approval/rejection, duplicate rejection এবং leaderboard point একবারই যোগ হওয়া

বাস্তবায়ন অবস্থা
----------------
কোডে যুক্ত:
- Clean app branding, exact slogan, existing Leaflet/OpenStreetMap layout
- stable unique launch IDs; combined `তরঙ্গ-৭ / জমজম-৫` seed entry split; `প্রিন্স অব রাসেল ৫` spelling
- daily single-launch-per-route selection Firebase transaction sync
- launch name click/Speed Map action
- ship markers, heading-based arrow, own/other marker colors
- GPS watchPosition, Knot speed calculation, NM distance calculation
- RTDB atomic per-launch GPS lock and ১২০ সেকেন্ড expiry metadata
- geohash limited Nearby queries + exact Haversine filter + live query listeners
- proposal, fare, schedule Cloud Function endpoints; owner-only moderation/approval
- schedule approval point award endpoint with duplicate award record
- public fare and leaderboard read listeners
- Firebase Rules for protected GPS sessions, locks, proposals, fares, schedule posts, daily selection, leaderboard

এই পরিবেশে যাচাই করা যায়নি:
- Firebase CLI deploy ও Cloud Functions execution
- Firebase Rules Emulator compilation/runtime behavior
- Live Firebase read/write with the actual project
- two physical phones and real GPS movement/lock contention
- Netlify/Firebase Hosting production deployment
- billing-plan readiness for Cloud Functions

অতএব, static checks পাস করলেও deploy ও দুই-ফোন পরীক্ষা শেষ না হওয়া পর্যন্ত এটিকে production-verified বা ৯৯% live-complete বলা যাবে না।

পরীক্ষা
------
Run:
   npm test

এই static tests HTML IDs, JavaScript syntax, JSON syntax, branding/admin/GPS/geohash hooks ও package structure পরীক্ষা করে। এটি live Firebase বা device GPS পরীক্ষা নয়।

ডেটা নীতি
---------
লঞ্চ ও রুট তালিকায় কেবল launch name এবং route label রাখা হয়েছে। সময়, ভাড়া, ফোন, তারিখ, শুভেচ্ছা বা প্রচারমূলক লেখা launch/route name হিসেবে seed করা হয়নি। অস্পষ্ট route-সহ কিছু seed launch Pending রাখা হয়েছে; Admin যাচাই না করা পর্যন্ত সেগুলো approved list/map-এ দেখানোর কথা নয়।


ঢাকা পর্যন্ত দূরত্ব (নতুন): লাইভ GPS পজিশন থেকে ঢাকা শহরের একটি রেফারেন্স পয়েন্ট (23.7104, 90.4074) পর্যন্ত সরলরেখার আনুমানিক দূরত্ব কিলোমিটারে দেখানো হয়। এটি নৌপথ ধরে অবশিষ্ট দূরত্ব নয়। প্রকৃত নৌপথের দূরত্ব দেখাতে প্রতিটি রুটের যাচাইকৃত নদীপথের Waypoint/জিওডেটা প্রয়োজন।


নতুন পরিবর্তন (2026-11-26)
-------------------------
- প্রতিটি seed launch route-কে উভয় দিকের আলাদা route record হিসেবে দেখানো হয়; একই launch name দুই দিকের route-এ পুনরাবৃত্ত হতে পারে।
- Launch record-এর unique ID এখন launch name + route থেকে তৈরি হয়, যাতে একই launch-এর দুই route একে অপরকে overwrite না করে।
- Passenger launch proposal-এর নাম বাংলা অক্ষরে এবং নির্দিষ্ট `এম. ভি. ` prefix-এ দিতে হবে। ইংরেজি বা `এমভি` / `এম ভি` ফরম্যাট গ্রহণ করা হয় না।
- Route ও ghat proposal-এ ইংরেজি অক্ষর নিষিদ্ধ; আলাদা লাল inline warning দেখানো হয়।
- Admin warning paragraph এবং lemon notice-এর অতিরিক্ত ব্যাখ্যামূলক লাইন সরানো হয়েছে; Admin security checks অপরিবর্তিত।
