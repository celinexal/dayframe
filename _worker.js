// Dayframe build: Bible licences connected 2026-08-19
const SUPABASE_URL='https://xvquxwvapgzxyuntylci.supabase.co';
const SUPABASE_ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2cXV4d3ZhcGd6eHl1bnR5bGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMjQ4MzQsImV4cCI6MjA4OTYwMDgzNH0.ovxzwMPaoyqdM4tJnjh28ovzj9mpsl87ToDiA2mXADw';
const STATE_COOKIE='dayframe_tl_v1_state';


const BIBLE_API_USFM=Object.freeze({'Genesis':'GEN','Exodus':'EXO','Leviticus':'LEV','Numbers':'NUM','Deuteronomy':'DEU','Joshua':'JOS','Judges':'JDG','Ruth':'RUT','1 Samuel':'1SA','2 Samuel':'2SA','1 Kings':'1KI','2 Kings':'2KI','1 Chronicles':'1CH','2 Chronicles':'2CH','Ezra':'EZR','Nehemiah':'NEH','Esther':'EST','Job':'JOB','Psalms':'PSA','Proverbs':'PRO','Ecclesiastes':'ECC','Song of Solomon':'SNG','Isaiah':'ISA','Jeremiah':'JER','Lamentations':'LAM','Ezekiel':'EZK','Daniel':'DAN','Hosea':'HOS','Joel':'JOL','Amos':'AMO','Obadiah':'OBA','Jonah':'JON','Micah':'MIC','Nahum':'NAM','Habakkuk':'HAB','Zephaniah':'ZEP','Haggai':'HAG','Zechariah':'ZEC','Malachi':'MAL','Matthew':'MAT','Mark':'MRK','Luke':'LUK','John':'JHN','Acts':'ACT','Romans':'ROM','1 Corinthians':'1CO','2 Corinthians':'2CO','Galatians':'GAL','Ephesians':'EPH','Philippians':'PHP','Colossians':'COL','1 Thessalonians':'1TH','2 Thessalonians':'2TH','1 Timothy':'1TI','2 Timothy':'2TI','Titus':'TIT','Philemon':'PHM','Hebrews':'HEB','James':'JAS','1 Peter':'1PE','2 Peter':'2PE','1 John':'1JN','2 John':'2JN','3 John':'3JN','Jude':'JUD','Revelation':'REV'});
async function getLicensedBibleChapter(url,env){
 const key=String(env.API_BIBLE_KEY||'').trim(),translation=String(url.searchParams.get('translation')||'').trim().toUpperCase(),book=canonicalBibleBook(url.searchParams.get('book')),chapter=Number(url.searchParams.get('chapter'));
 if(!['NIV','MSG','NLT'].includes(translation))return json({error:'Choose NIV, The Message or NLT.'},400);
 if(!book)return json({error:'Choose a valid Bible book.'},400);
 if(!Number.isInteger(chapter)||chapter<1||chapter>BIBLE_KJV_BOOKS[book])return json({error:'Choose a valid chapter for '+book+'.'},400);
 const translationName=translation==='MSG'?'The Message':translation==='NLT'?'NLT':'NIV';
 if(!key)return json({error:'The licensed '+translationName+' reader needs one owner-only API.Bible connection before it can appear inside Dayframe.',code:'BIBLE_LICENSE_NOT_CONFIGURED'},503);
 const base='https://rest.api.bible/v1',headers={accept:'application/json','api-key':key};
 let versions;
 try{versions=await fetch(base+'/bibles?language=eng&abbreviation='+encodeURIComponent(translation),{headers})}catch(e){return json({error:'The licensed Bible service is temporarily unavailable.'},502)}
 if(versions.status===401)return json({error:'Dayframe’s licensed Bible key needs to be checked.',code:'BIBLE_LICENSE_NOT_CONFIGURED'},503);
 if(!versions.ok)return json({error:'The licensed Bible service could not check this translation.'},502);
 const versionLength=Number(versions.headers.get('content-length')||0);if(versionLength>250000)return json({error:'The licensed Bible response was unexpectedly large.'},502);
 let versionData;try{versionData=await versions.json()}catch(e){return json({error:'The licensed Bible service returned an invalid response.'},502)}
 const candidates=Array.isArray(versionData.data)?versionData.data:[],version=candidates.find(x=>String(x.abbreviation||x.abbreviationLocal||'').toUpperCase()===translation)||candidates[0];
 if(!version?.id)return json({error:translationName+' is not included in Dayframe’s API.Bible licence yet.',code:'BIBLE_TRANSLATION_NOT_LICENSED'},503);
 const chapterId=BIBLE_API_USFM[book]+'.'+chapter,chapterUrl=base+'/bibles/'+encodeURIComponent(version.id)+'/chapters/'+encodeURIComponent(chapterId)+'?content-type=text&include-notes=false&include-titles=true&include-chapter-numbers=false&include-verse-numbers=true';
 let response;try{response=await fetch(chapterUrl,{headers})}catch(e){return json({error:'The licensed Bible service is temporarily unavailable.'},502)}
 if(response.status===403)return json({error:translationName+' is not included in Dayframe’s API.Bible licence yet.',code:'BIBLE_TRANSLATION_NOT_LICENSED'},503);
 if(!response.ok)return json({error:'The licensed Bible reader could not open that chapter.'},502);
 const length=Number(response.headers.get('content-length')||0);if(length>500000)return json({error:'The licensed Bible response was unexpectedly large.'},502);
 let payload;try{payload=await response.json()}catch(e){return json({error:'The licensed Bible service returned an invalid response.'},502)}
 const content=String(payload?.data?.content||'').slice(0,350000);if(!content)return json({error:'No Scripture text was returned for that chapter.'},502);
 return json({reference:String(payload.data.reference||book+' '+chapter),translation,content,copyright:String(payload.data.copyright||version.copyright||''),fumsToken:String(payload?.meta?.fumsToken||payload?.meta?.fums||'')},200,{'cache-control':'no-store'});
}

const BIBLE_KJV_BOOKS=Object.freeze({'Genesis':50,'Exodus':40,'Leviticus':27,'Numbers':36,'Deuteronomy':34,'Joshua':24,'Judges':21,'Ruth':4,'1 Samuel':31,'2 Samuel':24,'1 Kings':22,'2 Kings':25,'1 Chronicles':29,'2 Chronicles':36,'Ezra':10,'Nehemiah':13,'Esther':10,'Job':42,'Psalms':150,'Proverbs':31,'Ecclesiastes':12,'Song of Solomon':8,'Isaiah':66,'Jeremiah':52,'Lamentations':5,'Ezekiel':48,'Daniel':12,'Hosea':14,'Joel':3,'Amos':9,'Obadiah':1,'Jonah':4,'Micah':7,'Nahum':3,'Habakkuk':3,'Zephaniah':3,'Haggai':2,'Zechariah':14,'Malachi':4,'Matthew':28,'Mark':16,'Luke':24,'John':21,'Acts':28,'Romans':16,'1 Corinthians':16,'2 Corinthians':13,'Galatians':6,'Ephesians':6,'Philippians':4,'Colossians':4,'1 Thessalonians':5,'2 Thessalonians':3,'1 Timothy':6,'2 Timothy':4,'Titus':3,'Philemon':1,'Hebrews':13,'James':5,'1 Peter':5,'2 Peter':3,'1 John':5,'2 John':1,'3 John':1,'Jude':1,'Revelation':22});
function canonicalBibleBook(value){const clean=String(value||'').trim().replace(/\s+/g,' ').toLowerCase();return Object.keys(BIBLE_KJV_BOOKS).find(x=>x.toLowerCase()===clean)||''}
async function getKJVChapter(url){
 const book=canonicalBibleBook(url.searchParams.get('book')),chapter=Number(url.searchParams.get('chapter'));
 if(!book)return json({error:'Choose a valid Bible book.'},400);
 if(!Number.isInteger(chapter)||chapter<1||chapter>BIBLE_KJV_BOOKS[book])return json({error:'Choose a valid chapter for '+book+'.'},400);
 const upstreamUrl='https://bible-api.com/'+encodeURIComponent(book+' '+chapter)+'?translation=kjv';
 let response;
 try{response=await fetch(upstreamUrl,{headers:{accept:'application/json'},cf:{cacheEverything:true,cacheTtl:86400}})}catch(e){return json({error:'The Bible reader is temporarily unavailable.'},502)}
 if(!response.ok)return json({error:'The Bible reader could not open that chapter.'},502);
 const length=Number(response.headers.get('content-length')||0);
 if(length>300000)return json({error:'The Bible response was unexpectedly large.'},502);
 let data;try{data=await response.json()}catch(e){return json({error:'The Bible reader returned an invalid response.'},502)}
 const verses=Array.isArray(data.verses)?data.verses.slice(0,200).map(v=>({verse:Number(v.verse)||0,text:String(v.text||'').slice(0,1200)})).filter(v=>v.verse&&v.text):[];
 if(!verses.length)return json({error:'No verses were returned for that chapter.'},502);
 return json({reference:String(data.reference||book+' '+chapter),translation:'King James Version',verses,attribution:'King James Version · public domain'},200,{'cache-control':'public, max-age=3600, s-maxage=86400'});
}


export default {
  async fetch(request, env) {
    const url=new URL(request.url);
    try{
      if(url.pathname==='/api/money/status')return json({configured:isConfigured(env),environment:bankMode(env),credentials_match_environment:credentialsMatchEnvironment(env),api_version:'v1',build:'bank-auth-link-v3-20260819'});
      if(url.pathname==='/api/money/connect'&&request.method==='POST')return startConnect(request,env);
      if(url.pathname==='/api/money/callback'&&request.method==='GET')return handleCallback(request,env);
      if(url.pathname==='/api/money/data'&&request.method==='GET')return getMoneyData(request,env);
      if(url.pathname.startsWith('/api/money/connections/')&&request.method==='DELETE')return disconnectBank(request,env,url.pathname.split('/').pop());
      if(url.pathname==='/api/investing/t212/status'&&request.method==='GET')return getT212Status(request,env);
      if(url.pathname==='/api/investing/t212/connect'&&request.method==='POST')return connectT212(request,env);
      if(url.pathname==='/api/investing/t212/data'&&request.method==='GET')return getT212Data(request,env);
      if(url.pathname==='/api/investing/t212/pies'&&request.method==='GET')return getT212Pies(request,env);
      if(url.pathname==='/api/investing/t212/connection'&&request.method==='DELETE')return disconnectT212(request,env);
      if(url.pathname==='/api/ai/groq'&&request.method==='POST')return proxySharedGroq(request);
      if(url.pathname==='/api/bible/kjv')return request.method==='GET'?getKJVChapter(url):json({error:'Method not allowed'},405,{allow:'GET'});
      if(url.pathname==='/api/bible/licensed')return request.method==='GET'?getLicensedBibleChapter(url,env):json({error:'Method not allowed'},405,{allow:'GET'});
      if(url.pathname==='/api/driving/theory-data'&&(request.method==='GET'||request.method==='POST'))return theoryData(request);
      if(url.pathname==='/api/driving/theory'&&request.method==='GET')return proxyTheoryTracker(request,env);
      if(url.pathname.startsWith('/api/'))return json({error:'Not found'},404);
      return env.ASSETS.fetch(request);
    }catch(err){console.error('Dayframe API error',err);return json({error:'Something went wrong on the secure Dayframe service.'},500)}
  }
};
function isConfigured(env){return !!(String(env.TRUELAYER_CLIENT_ID||'').trim()&&String(env.TRUELAYER_CLIENT_SECRET||'').trim()&&String(env.TRUELAYER_RETURN_URI||'').trim())}
function bankMode(env){const mode=String(env.TRUELAYER_ENV||'sandbox').trim().toLowerCase();return mode==='live'||mode==='production'?'live':'sandbox'}
function isSandbox(env){return bankMode(env)==='sandbox'}
function credentialsMatchEnvironment(env){const id=String(env.TRUELAYER_CLIENT_ID||'').trim().toLowerCase();return !!id&&(isSandbox(env)?id.startsWith('sandbox-'):!id.startsWith('sandbox-'))}
function authBase(env){return isSandbox(env)?'https://auth.truelayer-sandbox.com':'https://auth.truelayer.com'}
function apiBase(env){return isSandbox(env)?'https://api.truelayer-sandbox.com':'https://api.truelayer.com'}
function json(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}})}
function cookieValue(request,name){const raw=request.headers.get('cookie')||'';const hit=raw.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='));return hit?decodeURIComponent(hit.slice(name.length+1)):''}
function clearCookie(name){return `${name}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`}
function b64u(bytes){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function unb64u(s){s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const raw=atob(s);return Uint8Array.from(raw,c=>c.charCodeAt(0))}
async function aesKey(env){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(env.TRUELAYER_CLIENT_SECRET));return crypto.subtle.importKey('raw',digest,{name:'AES-GCM'},false,['encrypt','decrypt'])}
async function encryptBlob(env,obj){const iv=crypto.getRandomValues(new Uint8Array(12));const cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await aesKey(env),new TextEncoder().encode(JSON.stringify(obj))));const out=new Uint8Array(iv.length+cipher.length);out.set(iv);out.set(cipher,iv.length);return b64u(out)}
async function decryptBlob(env,s){try{const all=unb64u(s),iv=all.slice(0,12),cipher=all.slice(12);const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv},await aesKey(env),cipher);return JSON.parse(new TextDecoder().decode(plain))}catch(e){return null}}
function bearer(request){const h=request.headers.get('authorization')||'';return h.toLowerCase().startsWith('bearer ')?h.slice(7).trim():''}
async function verifyUser(request){const token=bearer(request);if(!token)return null;const r=await fetch(SUPABASE_URL+'/auth/v1/user',{headers:{apikey:SUPABASE_ANON,authorization:'Bearer '+token}});if(!r.ok)return null;const user=await r.json().catch(()=>null);return user?.id?{user,token}:null}
async function sbRest(path,jwt,opts={}){const headers={apikey:SUPABASE_ANON,authorization:'Bearer '+jwt,'content-type':'application/json',...(opts.headers||{})};return fetch(SUPABASE_URL+'/rest/v1/'+path,{...opts,headers})}
function validateProfile(name,email){name=String(name||'').trim();email=String(email||'').trim();if(name.length<2||name.length>100)return 'Enter your name.';if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return 'Enter a valid email address.';return ''}

async function proxySharedGroq(request){
  const auth=await verifyUser(request);
  if(!auth)return json({error:'Sign in to use Dayframe AI.'},401);
  const contentType=String(request.headers.get('content-type')||'').toLowerCase();
  if(!contentType.includes('application/json'))return json({error:'Invalid AI request.'},415);
  const suppliedLength=Number(request.headers.get('content-length')||0);
  if(suppliedLength>60000)return json({error:'AI request is too large.'},413);
  let upstream;
  try{
    upstream=await fetch(SUPABASE_URL+'/functions/v1/dayframe-groq',{
      method:'POST',
      headers:{
        apikey:SUPABASE_ANON,
        authorization:'Bearer '+auth.token,
        'content-type':'application/json',
        accept:'application/json'
      },
      body:request.body
    });
  }catch(e){
    return json({error:'Dayframe AI could not be reached.'},502);
  }
  const headers=new Headers({
    'content-type':upstream.headers.get('content-type')||'application/json; charset=utf-8',
    'cache-control':'no-store'
  });
  for(const name of ['retry-after','x-ratelimit-limit-requests','x-ratelimit-limit-tokens','x-ratelimit-remaining-requests','x-ratelimit-remaining-tokens','x-ratelimit-reset-requests','x-ratelimit-reset-tokens']){
    const value=upstream.headers.get(name);if(value)headers.set(name,value);
  }
  return new Response(upstream.body,{status:upstream.status,headers});
}

async function theoryData(request){
  const auth=await verifyUser(request);
  if(!auth)return json({error:'Sign in to use your theory tracker.'},401);
  const rowPath='dayframe_theory_data?user_id=eq.'+encodeURIComponent(auth.user.id);
  if(request.method==='GET'){
    const result=await sbRest(rowPath+'&select=tracker_data&limit=1',auth.token,{method:'GET'});
    if(!result.ok)return json({error:'Your theory progress could not be loaded.'},502);
    const rows=await result.json().catch(()=>[]);
    return json(rows?.[0]?.tracker_data||{});
  }

  const suppliedLength=Number(request.headers.get('content-length')||0);
  if(suppliedLength>550000)return json({error:'Theory progress is too large.'},413);
  const trackerData=await request.json().catch(()=>null);
  if(!trackerData||typeof trackerData!=='object'||Array.isArray(trackerData))return json({error:'Invalid theory progress.'},400);
  const serialized=JSON.stringify(trackerData);
  if(serialized.length>500000)return json({error:'Theory progress is too large.'},413);
  const result=await sbRest('dayframe_theory_data?on_conflict=user_id&select=user_id',auth.token,{
    method:'POST',
    headers:{Prefer:'resolution=merge-duplicates,return=representation'},
    body:JSON.stringify({user_id:auth.user.id,tracker_data:trackerData,updated_at:new Date().toISOString()})
  });
  const rows=await result.json().catch(()=>[]);
  if(!result.ok||!Array.isArray(rows)||!rows[0]?.user_id)return json({error:'Your theory progress could not be saved.'},502);
  return json({ok:true});
}

function t212Environment(value){return String(value||'live').trim().toLowerCase()==='demo'?'demo':'live'}
function t212ApiBase(environment){return t212Environment(environment)==='demo'?'https://demo.trading212.com/api/v0':'https://live.trading212.com/api/v0'}
function validT212Part(value){const text=String(value||'').trim();return text.length>=8&&text.length<=600&&!/[\u0000-\u001f\u007f]/.test(text)}
async function t212CredentialKey(env){
  const root=String(env.DAYFRAME_CREDENTIAL_KEY||env.TRUELAYER_CLIENT_SECRET||'').trim();
  if(!root)return null;
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('dayframe:t212:credentials:v1:'+root));
  return crypto.subtle.importKey('raw',digest,{name:'AES-GCM'},false,['encrypt','decrypt']);
}
const T212_CREDENTIAL_PREFIX='t212v1.';
async function encryptT212Credentials(env,value){
  const key=await t212CredentialKey(env);if(!key)return '';
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const plain=new TextEncoder().encode(JSON.stringify(value));
  const cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,plain));
  const out=new Uint8Array(iv.length+cipher.length);out.set(iv);out.set(cipher,iv.length);
  return T212_CREDENTIAL_PREFIX+b64u(out);
}
async function decryptT212Credentials(env,value){
  try{
    const text=String(value||'');if(!text.startsWith(T212_CREDENTIAL_PREFIX))return null;
    const key=await t212CredentialKey(env);if(!key)return null;
    const all=unb64u(text.slice(T212_CREDENTIAL_PREFIX.length)),iv=all.slice(0,12),cipher=all.slice(12);
    const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,cipher);
    const parsed=JSON.parse(new TextDecoder().decode(plain));
    return validT212Part(parsed?.api_key)&&validT212Part(parsed?.api_secret)?{api_key:String(parsed.api_key),api_secret:String(parsed.api_secret),environment:t212Environment(parsed.environment)}:null;
  }catch(e){return null}
}
function t212BasicAuth(credentials){return 'Basic '+btoa(credentials.api_key+':'+credentials.api_secret)}
async function t212Request(credentials,path){
  const response=await fetch(t212ApiBase(credentials.environment)+path,{method:'GET',headers:{accept:'application/json',authorization:t212BasicAuth(credentials)}});
  const data=await response.json().catch(()=>null);
  return {response,data};
}
function t212Failure(result){
  const status=result?.response?.status||0;
  if(status===401)return json({code:'T212_AUTH_REJECTED',error:'Trading 212 did not accept that API Key and API Secret pair.'},422);
  if(status===403)return json({code:'T212_PERMISSIONS',error:'Enable the Account data and Portfolio read permissions for this Trading 212 key.'},422);
  if(status===429)return json({code:'T212_RATE_LIMIT',error:'Trading 212 is rate-limiting this account. Wait a moment and try again.'},429);
  return json({code:'T212_UNAVAILABLE',error:'Trading 212 could not be reached just now.'},502);
}
async function loadT212Credentials(auth,env){
  const rr=await sbRest('user_settings?select=t212_key&id=eq.'+encodeURIComponent(auth.user.id),auth.token,{method:'GET'});
  if(!rr.ok)return {error:'Dayframe could not load the saved Trading 212 connection.'};
  const rows=await rr.json().catch(()=>[]),stored=rows?.[0]?.t212_key||'';
  if(!stored)return {connected:false,migration_required:false};
  const credentials=await decryptT212Credentials(env,stored);
  if(!credentials)return {connected:false,migration_required:true};
  return {connected:true,credentials};
}
async function saveT212Credentials(auth,env,credentials){
  const encrypted=await encryptT212Credentials(env,credentials);
  if(!encrypted)return {ok:false,error:'Secure credential storage is not configured.'};
  const rr=await sbRest('user_settings?on_conflict=id&select=id',auth.token,{
    method:'POST',
    headers:{Prefer:'resolution=merge-duplicates,return=representation'},
    body:JSON.stringify({id:auth.user.id,t212_key:encrypted,updated_at:new Date().toISOString()})
  });
  const rows=await rr.json().catch(()=>[]);
  return rr.ok&&Array.isArray(rows)&&!!rows[0]?.id?{ok:true}:{ok:false,error:'Dayframe could not save the Trading 212 connection.'};
}
function canonicalT212Ticker(value,name='',isin=''){
  const raw=String(value||'').trim();
  const base=raw
    .replace(/\.(?:DE|US|GB|L|ST)$/i,'')
    .replace(/_(?:US|CA|GB|SGD|HKD|EUR|AUD|SG|DE)?_?EQ$/i,'')
    .replace(/_(?:US|CA|GB|SGD|HKD|EUR|AUD|SG|DE)$/i,'');
  if(String(isin||'').trim().toUpperCase()==='SE0003917798'||/sivers\s+semiconductors/i.test(String(name||''))||/^2DG[A-Z]*$/i.test(base))return 'SIVE';
  return base.toUpperCase();
}
function normaliseT212Position(position){
  const instrument=position?.instrument||{},wallet=position?.walletImpact||{};
  const quantity=Number(position?.quantity)||0;
  const averagePrice=Number(position?.averagePricePaid??position?.averagePrice)||0;
  const currentPrice=Number(position?.currentPrice)||0;
  const totalCost=Number(wallet?.totalCost);
  const currentValue=Number(wallet?.currentValue);
  const fallbackCost=averagePrice*quantity;
  const fallbackValue=currentPrice*quantity;
  const safeCost=Number.isFinite(totalCost)?totalCost:fallbackCost;
  const safeValue=Number.isFinite(currentValue)?currentValue:fallbackValue;
  const providerPpl=Number(wallet?.unrealizedProfitLoss??position?.ppl);
  const rawTicker=String(instrument?.ticker||position?.ticker||'');
  const providerName=String(instrument?.name||instrument?.shortName||instrument?.ticker||position?.ticker||'Holding');
  const isin=String(instrument?.isin||position?.isin||'');
  const ticker=canonicalT212Ticker(rawTicker,providerName,isin);
  return {
    ticker,
    name:ticker==='SIVE'?'Sivers Semiconductors AB':providerName,
    isin,
    quantity,
    averagePrice,
    currentPrice,
    totalCost:safeCost,
    currentValue:safeValue,
    ppl:Number.isFinite(providerPpl)?providerPpl:safeValue-safeCost,
    currency:String(wallet?.currency||'')
  };
}
function normaliseT212Summary(summary){
  const cash=summary?.cash||{},investments=summary?.investments||{};
  return {
    currency:String(summary?.currency||'GBP'),
    total:Number(summary?.totalValue??summary?.total)||0,
    free:Number(cash?.availableToTrade??cash?.free)||0,
    inPies:Number(cash?.inPies)||0,
    reservedForOrders:Number(cash?.reservedForOrders)||0,
    investmentValue:Number(investments?.currentValue)||0,
    totalCost:Number(investments?.totalCost)||0,
    ppl:Number(investments?.unrealizedProfitLoss)||0
  };
}
async function fetchT212Snapshot(credentials){
  const [summaryResult,positionsResult]=await Promise.all([
    t212Request(credentials,'/equity/account/summary'),
    t212Request(credentials,'/equity/positions')
  ]);
  if(!summaryResult.response.ok)return {failure:t212Failure(summaryResult)};
  if(!positionsResult.response.ok)return {failure:t212Failure(positionsResult)};
  if(!Array.isArray(positionsResult.data)||!summaryResult.data||typeof summaryResult.data!=='object')return {failure:json({code:'T212_RESPONSE_CHANGED',error:'Trading 212 returned an unexpected response.'},502)};
  return {data:{summary:normaliseT212Summary(summaryResult.data),positions:positionsResult.data.map(normaliseT212Position),environment:credentials.environment,refreshed_at:new Date().toISOString()}};
}
async function getT212Status(request,env){
  const auth=await verifyUser(request);if(!auth)return json({error:'Log in to view this connection.'},401);
  const stored=await loadT212Credentials(auth,env);
  if(stored.error)return json({error:stored.error},502);
  return json({connected:stored.connected,environment:stored.credentials?.environment||null,migration_required:stored.migration_required||false});
}
async function connectT212(request,env){
  const auth=await verifyUser(request);if(!auth)return json({error:'Log in to connect Trading 212.'},401);
  const body=await request.json().catch(()=>({}));
  const api_key=String(body.api_key||'').trim(),api_secret=String(body.api_secret||'').trim(),environment=t212Environment(body.environment);
  if(!validT212Part(api_key))return json({error:'Enter the complete Trading 212 API Key.'},400);
  if(!validT212Part(api_secret))return json({error:'Enter the complete Trading 212 API Secret Key.'},400);
  const credentials={api_key,api_secret,environment};
  const snapshot=await fetchT212Snapshot(credentials);
  if(snapshot.failure)return snapshot.failure;
  const saved=await saveT212Credentials(auth,env,credentials);
  if(!saved.ok)return json({error:saved.error},502);
  const verified=await loadT212Credentials(auth,env);
  if(verified.error||!verified.connected)return json({error:'The connection was verified but could not be restored from your account.',code:'T212_SAVE_VERIFY_FAILED'},502);
  return json({connected:true,...snapshot.data});
}
async function getT212Data(request,env){
  const auth=await verifyUser(request);if(!auth)return json({error:'Log in to refresh Trading 212.'},401);
  const stored=await loadT212Credentials(auth,env);
  if(stored.error)return json({error:stored.error},502);
  if(!stored.connected)return json({code:'T212_NOT_CONNECTED',error:'Connect Trading 212 with both credentials first.'},404);
  const snapshot=await fetchT212Snapshot(stored.credentials);
  return snapshot.failure||json(snapshot.data);
}
async function getT212Pies(request,env){
  const auth=await verifyUser(request);if(!auth)return json({error:'Log in to load Trading 212 pies.'},401);
  const stored=await loadT212Credentials(auth,env);
  if(stored.error)return json({error:stored.error},502);
  if(!stored.connected)return json({code:'T212_NOT_CONNECTED',error:'Connect Trading 212 first.'},404);
  const result=await t212Request(stored.credentials,'/equity/pies');
  if(!result.response.ok)return t212Failure(result);
  return json(Array.isArray(result.data)?result.data:[]);
}
async function disconnectT212(request,env){
  const auth=await verifyUser(request);if(!auth)return json({error:'Log in to disconnect Trading 212.'},401);
  const rr=await sbRest('user_settings?id=eq.'+encodeURIComponent(auth.user.id),auth.token,{
    method:'PATCH',
    headers:{Prefer:'return=minimal'},
    body:JSON.stringify({t212_key:null,updated_at:new Date().toISOString()})
  });
  if(!rr.ok)return json({error:'Dayframe could not remove the Trading 212 connection.'},502);
  return json({ok:true});
}


async function proxyTheoryTracker(request,env){
  const source=new URL('/driving/theory.html',request.url).toString();
  let upstream=null,used=source;
  try{
    const r=await env.ASSETS.fetch(new Request(source,{
      method:'GET',
      headers:{
        'accept':'text/html,application/xhtml+xml',
        'user-agent':request.headers.get('user-agent')||'Mozilla/5.0'
      }
    }));
    if(r.ok)upstream=r;
  }catch(e){}
  if(!upstream){
    return new Response(`<!doctype html><html><head><meta charset="utf-8"><style>
      body{font-family:Inter,Arial,sans-serif;background:#f7f8fc;color:#344054;padding:40px}
      .box{max-width:620px;margin:80px auto;background:white;border:1px solid #e7eaf1;border-radius:18px;padding:28px;box-shadow:0 10px 30px rgba(20,30,50,.06)}
      a{display:inline-block;margin-top:14px;padding:10px 14px;border-radius:10px;background:#ef7464;color:white;text-decoration:none;font-weight:700}
    </style></head><body><div class="box"><h2>Learning to Drive</h2><p>The theory tracker could not load inside Dayframe just now.</p><a href="/driving/theory.html" target="_blank">Open Theory Tracker</a></div></body></html>`,
      {status:502,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}}
    );
  }

  let body=await upstream.text();

  // Strip obvious legacy profile labels from initial HTML markup before render.
  body=body
    .replace(/>\s*Celine\s*</gi,'><')
    .replace(/>\s*Valentina\s*</gi,'><')
    .replace(/<option([^>]*)>\s*Celine\s*<\/option>/gi,'')
    .replace(/<option([^>]*)>\s*Valentina\s*<\/option>/gi,'');

  // Never render Dayframe inside Dayframe. If the upstream is the wrong app,
  // show a clear error instead of a recursive nested dashboard.
  if(/<title>\s*Dayframe\s*<\/title>/i.test(body) || /class=["'][^"']*dayframe-public/i.test(body)){
    return new Response(`<!doctype html><html><head><meta charset="utf-8"><style>
      body{font-family:Inter,Arial,sans-serif;background:#f7f8fc;color:#344054;padding:40px}
      .box{max-width:640px;margin:90px auto;background:white;border:1px solid #e7eaf1;border-radius:18px;padding:28px;box-shadow:0 10px 30px rgba(20,30,50,.06)}
      a{display:inline-block;margin-top:14px;padding:10px 14px;border-radius:10px;background:#ef7464;color:white;text-decoration:none;font-weight:700}
    </style></head><body><div class="box"><h2>Theory Tracker source is pointing to Dayframe</h2><p>The tracker deployment needs to be corrected before it can be shown here.</p><a href="/driving/theory.html" target="_blank">Open the tracker deployment</a></div></body></html>`,
      {status:502,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}}
    );
  }

  // Remove frame-blocking CSP meta tags from the proxied HTML.
  body=body.replace(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/gi,'');

  // Make all relative resources resolve back to the tracker project.
  if(!/<base\s/i.test(body)){
    const base=`<base href="${used}">`;
    if(/<head[^>]*>/i.test(body)) body=body.replace(/<head([^>]*)>/i,`<head$1>${base}`);
    else body=base+body;
  }

  // Dayframe SSO bridge. This proxied document runs on investly.pages.dev,
  // so it shares the Dayframe browser session. It also passes the same
  // Supabase bearer token to tracker API calls automatically.
  const bridge=`<script>
  (() => {
    function getDayframeSession(){
      try{return JSON.parse(localStorage.getItem('dayframe_session')||'{}')}catch(e){return {}}
    }
    let df=getDayframeSession();

    // Expose one authenticated identity to the embedded app.
    window.__DAYFRAME_EMBED__=true;
    window.__DAYFRAME_SESSION__=df;
    window.__DAYFRAME_USER__=df.user||null;

    // Useful aliases for an older standalone tracker that expected its own
    // browser identity. These contain no password.
    if(df?.user?.id){
      try{
        sessionStorage.setItem('dayframe_theory_user_id',df.user.id);
        sessionStorage.setItem('dayframe_theory_email',df.user.email||df.email||'');
        localStorage.setItem('theory_user_id',df.user.id);
        localStorage.setItem('theory_user_email',df.user.email||df.email||'');
      }catch(e){}
    }

    // Add the existing Dayframe identity to tracker API requests and replace
    // any old Celine/Valentina profile parameter with this user's Supabase ID.
    const nativeFetch=window.fetch.bind(window);
    window.fetch=async function(input,init={}){
      try{
        let reqUrl=typeof input==='string'?input:(input?.url||'');
        const isTrackerApi=/theory-tracker-api|workers\.dev|\/api\//i.test(reqUrl);
        if(isTrackerApi && df?.access_token && df?.user?.id){
          const profileId='dayframe:'+df.user.id;
          const headers=new Headers(init.headers||(typeof input!=='string'&&input?.headers)||{});
          if(!headers.has('Authorization'))headers.set('Authorization','Bearer '+df.access_token);
          headers.set('X-Dayframe-User-Id',df.user.id);
          if(df?.user?.email)headers.set('X-Dayframe-Email',df.user.email);

          // Namespace common query-string profile fields.
          try{
            const u=new URL(reqUrl,location.href);
            ['user','userId','user_id','profile','profileId','profile_id','learner','learnerId','learner_id'].forEach(k=>{
              if(u.searchParams.has(k))u.searchParams.set(k,profileId);
            });
            reqUrl=u.toString();
            if(typeof input==='string')input=reqUrl;
            else if(input instanceof Request)input=new Request(reqUrl,input);
          }catch(_){}

          // Namespace common JSON body profile fields.
          if(typeof init.body==='string' && /application\/json/i.test(headers.get('content-type')||'')){
            try{
              const body=JSON.parse(init.body);
              const keys=['user','userId','user_id','profile','profileId','profile_id','learner','learnerId','learner_id'];
              keys.forEach(k=>{if(Object.prototype.hasOwnProperty.call(body,k))body[k]=profileId});
              init={...init,body:JSON.stringify(body),headers};
            }catch(_){init={...init,headers}}
          }else{
            init={...init,headers};
          }
        }
      }catch(e){}
      return nativeFetch(input,init);
    };

    // Force any web-component shadow roots open so the legacy profile
    // selector can be removed even if the tracker renders it there.
    try{
      const nativeAttachShadow=Element.prototype.attachShadow;
      Element.prototype.attachShadow=function(init){
        return nativeAttachShadow.call(this,{...init,mode:'open'});
      };
    }catch(e){}

    function removeLegacyTheoryAccountUI(){
      function scrubRoot(root){
        if(!root)return;
        try{
          const candidates=[...root.querySelectorAll?.('button,[role="button"],[onclick],a,div,section')||[]];
          const profileCards=candidates.filter(el=>{
            const txt=(el.innerText||el.textContent||'').trim().toLowerCase().replace(/\s+/g,' ');
            if(!/^(ci|vi)\b/.test(txt)||!txt.includes('streak'))return false;
            const r=el.getBoundingClientRect();
            return r.width>=60&&r.width<=560&&r.height>=20&&r.height<=150;
          });
          profileCards.forEach(el=>el.remove());

          [...root.querySelectorAll?.('div,section,main')||[]].forEach(el=>{
            const txt=(el.innerText||el.textContent||'').trim().toLowerCase().replace(/\s+/g,' ');
            const streaks=(txt.match(/streak/g)||[]).length;
            if(txt.length<600&&streaks>=2&&/\bci\b/.test(txt)&&/\bvi\b/.test(txt))el.remove();
          });

          [...root.querySelectorAll?.('div,p,span,h1,h2,h3,h4,label')||[]].forEach(el=>{
            const txt=(el.innerText||el.textContent||'').trim().toLowerCase().replace(/\s+/g,' ');
            if(txt.length<240&&(
              txt.includes('select your name')||txt.includes('choose your name')||
              txt.includes('select a name')||txt.includes('choose a profile')
            ))el.remove();
          });

          [...root.querySelectorAll?.('*')||[]].forEach(el=>{if(el.shadowRoot)scrubRoot(el.shadowRoot)});
        }catch(e){}
      }
      scrubRoot(document);
      document.documentElement.setAttribute('data-dayframe-user-id',df?.user?.id||'');
    }

    function applySingleSignOn(){
      df=getDayframeSession();
      window.__DAYFRAME_SESSION__=df;
      window.__DAYFRAME_USER__=df.user||null;
      if(!df?.access_token||!df?.user?.id)return;

      // Give the old tracker one stable profile identifier derived from
      // the logged-in Dayframe/Supabase account.
      const profileId='dayframe:'+df.user.id;
      try{
        [
          'theory_user_id','theory_profile_id','currentUser','current_user',
          'activeUser','active_user','selectedUser','selected_user',
          'selectedProfile','selected_profile','selectedName','selected_name',
          'currentProfile','current_profile','student','learner'
        ].forEach(k=>localStorage.setItem(k,profileId));
      }catch(e){}

      // Remove only standalone authentication overlays. The actual tracker
      // content remains untouched.
      const selectors=[
        '#login-screen','#loginScreen','.login-screen','.loginScreen',
        '#auth-screen','#authScreen','.auth-screen','.authScreen',
        '.signin-screen','.sign-in-screen','.login-overlay','.auth-overlay',
        '[data-page="login"]','[data-view="login"]'
      ];
      selectors.forEach(sel=>document.querySelectorAll(sel).forEach(el=>{
        el.style.setProperty('display','none','important');
      }));
      removeLegacyTheoryAccountUI();

      document.documentElement.setAttribute('data-dayframe-authenticated','true');
      window.dispatchEvent(new CustomEvent('dayframe-authenticated',{detail:{
        user:df.user,access_token:df.access_token
      }}));
    }

    window.addEventListener('message',e=>{
      if(e.origin!==location.origin||e.data?.type!=='DAYFRAME_AUTH')return;
      const cur=getDayframeSession();
      if(e.data.access_token&&e.data.user_id){
        cur.access_token=e.data.access_token;
        cur.user={...(cur.user||{}),id:e.data.user_id,email:e.data.email||cur.user?.email};
        cur.email=e.data.email||cur.email;
        cur.name=e.data.name||cur.name;
        try{localStorage.setItem('dayframe_session',JSON.stringify(cur))}catch(_){}
      }
      applySingleSignOn();
    });

    const observer=new MutationObserver(()=>{
      applySingleSignOn();
      removeLegacyTheoryAccountUI();
    });
    window.addEventListener('DOMContentLoaded',()=>{
      applySingleSignOn();
      removeLegacyTheoryAccountUI();
      observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
      try{parent.postMessage({type:'DAYFRAME_THEORY_READY'},location.origin)}catch(e){}
    });
    setTimeout(applySingleSignOn,50);
    setTimeout(()=>{applySingleSignOn();removeLegacyTheoryAccountUI()},500);
    setTimeout(()=>{applySingleSignOn();removeLegacyTheoryAccountUI()},1500);
    setInterval(removeLegacyTheoryAccountUI,900);
  })();
  <\/script>`;

  if(/<head[^>]*>/i.test(body)){
    body=body.replace(/<head([^>]*)>/i,`<head$1>${bridge}`);
  }else{
    body=bridge+body;
  }

  const headers=new Headers();
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control','no-store, max-age=0');
  headers.set('x-content-type-options','nosniff');
  return new Response(body,{status:200,headers});
}

async function startConnect(request,env){
  if(!isConfigured(env))return json({code:'OPEN_BANKING_NOT_CONFIGURED',error:'Bank connection setup is not complete yet.'},503);
  const auth=await verifyUser(request);if(!auth)return json({error:'Log in to connect a bank.'},401);
  if(!credentialsMatchEnvironment(env))return json({code:'OPEN_BANKING_ENVIRONMENT_MISMATCH',error:'The bank connection is using credentials for a different TrueLayer environment.'},503);

  const state=crypto.randomUUID();
  const authUrl=new URL(authBase(env)+'/');
  authUrl.searchParams.set('response_type','code');
  authUrl.searchParams.set('client_id',String(env.TRUELAYER_CLIENT_ID).trim());
  authUrl.searchParams.set('redirect_uri',String(env.TRUELAYER_RETURN_URI).trim());
  authUrl.searchParams.set('scope','info accounts balance transactions offline_access');
  authUrl.searchParams.set('state',state);
  if(isSandbox(env))authUrl.searchParams.set('providers','uk-cs-mock');

  const statePayload=await encryptBlob(env,{state,user_id:auth.user.id,sb_token:auth.token,created_at:Date.now()});
  return json({auth_url:authUrl.toString()},200,{'set-cookie':`${STATE_COOKIE}=${encodeURIComponent(statePayload)}; Path=/; Max-Age=900; HttpOnly; Secure; SameSite=Lax`});
}

async function handleCallback(request,env){
  const url=new URL(request.url),code=url.searchParams.get('code'),state=url.searchParams.get('state'),error=url.searchParams.get('error');
  if(error||!code)return Response.redirect(new URL('/?bank=error',url.origin).toString(),302);
  const pending=await decryptBlob(env,cookieValue(request,STATE_COOKIE));
  if(!pending||!state||pending.state!==state||Date.now()-Number(pending.created_at||0)>900000)return Response.redirect(new URL('/?bank=error',url.origin).toString(),302);
  const form=new URLSearchParams({grant_type:'authorization_code',client_id:env.TRUELAYER_CLIENT_ID,client_secret:env.TRUELAYER_CLIENT_SECRET,redirect_uri:env.TRUELAYER_RETURN_URI,code});
  const r=await fetch(authBase(env)+'/connect/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','accept':'application/json'},body:form});
  const txt=await r.text();let d={};try{d=txt?JSON.parse(txt):{}}catch(e){}
  if(!r.ok||!d.access_token){console.error('TrueLayer token exchange',r.status,txt);return Response.redirect(new URL('/?bank=error',url.origin).toString(),302)}
  const tokens={access_token:d.access_token,refresh_token:d.refresh_token||'',expires_at:Date.now()+(Number(d.expires_in)||3600)*1000,scope:d.scope||''};
  const encrypted_tokens=await encryptBlob(env,tokens);
  const ins=await sbRest('dayframe_bank_connections_v1',pending.sb_token,{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({user_id:pending.user_id,encrypted_tokens,status:'active'})});
  if(!ins.ok){console.error('Supabase bank insert',ins.status,await ins.text());return Response.redirect(new URL('/?bank=error',url.origin).toString(),302)}
  const headers=new Headers();headers.append('location',new URL('/?bank=connected',url.origin).toString());headers.append('set-cookie',clearCookie(STATE_COOKIE));return new Response(null,{status:302,headers});
}

async function refreshTokens(env,t){if(!t?.refresh_token)return null;const form=new URLSearchParams({grant_type:'refresh_token',client_id:env.TRUELAYER_CLIENT_ID,client_secret:env.TRUELAYER_CLIENT_SECRET,refresh_token:t.refresh_token});const r=await fetch(authBase(env)+'/connect/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','accept':'application/json'},body:form});const d=await r.json().catch(()=>({}));if(!r.ok||!d.access_token)return null;return {access_token:d.access_token,refresh_token:d.refresh_token||t.refresh_token,expires_at:Date.now()+(Number(d.expires_in)||3600)*1000,scope:d.scope||t.scope||''}}
async function apiGet(env,token,path,request){const ip=request.headers.get('CF-Connecting-IP')||'';return fetch(apiBase(env)+path,{headers:{authorization:'Bearer '+token,'accept':'application/json',...(ip?{'X-PSU-IP':ip}:{})}})}
function category(t){const s=String((t.transaction_category||''))+' '+String(t.transaction_classification||[])+' '+String(t.merchant_name||'')+' '+String(t.description||'');const x=s.toLowerCase();if(/save the change|savings?|investment|wealth|broker|trading 212|vanguard|fidelity/.test(x))return 'Savings & Investments';if(/transfer|bank transfer|faster payment|standing order|^\s*(mr|mrs|ms|miss)\s+[a-z]/.test(x))return 'Transfers';if(/petrol|fuel|shell|esso|bp\b|uber|train|rail|transport|travel|bus|tram|parking/.test(x))return 'Transport';if(/tesco|sainsbury|morrisons(?! petrol)|aldi|lidl|asda|waitrose|grocery|supermarket/.test(x))return 'Groceries';if(/insurance|utility|bill|phone|mobile|broadband|internet|council tax|energy|water/.test(x))return 'Bills & Utilities';if(/netflix|spotify|cinema|entertain|disney|prime video/.test(x))return 'Entertainment';if(/restaurant|cafe|coffee|deliveroo|just eat|uber eats|takeaway|food/.test(x))return 'Eating Out';if(/boots|pharmacy|dentist|medical|health/.test(x))return 'Health';if(/beauty|salon|hair|nails|sephora|space nk/.test(x))return 'Beauty';if(/amazon|shopping|retail|tails\.com|argos|ikea|zara|asos/.test(x))return 'Shopping';return 'Other'}
function direction(t){const type=String(t.transaction_type||'').toUpperCase();if(type==='CREDIT'||Number(t.amount)>0)return 'income';return 'expense'}
async function collectAccount(env,token,a,request,connectionId){const id=a.account_id;let balance=0,available=null,tx=[];const [br,tr]=await Promise.all([apiGet(env,token,'/data/v1/accounts/'+encodeURIComponent(id)+'/balance',request),apiGet(env,token,'/data/v1/accounts/'+encodeURIComponent(id)+'/transactions',request)]);if(br.ok){const b=await br.json().catch(()=>({}));const x=b.results?.[0]||{};balance=Number(x.current)||0;available=x.available==null?null:Number(x.available)}if(tr.ok){const d=await tr.json().catch(()=>({}));tx=(d.results||[]).map(t=>({id:t.transaction_id||crypto.randomUUID(),connection_id:connectionId,account_id:id,account_name:a.display_name||'Bank account',timestamp:t.timestamp||'',description:t.description||'',merchant:t.merchant_name||'',amount:Math.abs(Number(t.amount)||0),direction:direction(t),category:category(t),currency:t.currency||a.currency||'GBP'}))}return {account:{connection_id:connectionId,id,type:String(a.account_type||'').includes('SAVINGS')?'savings':'bank',name:a.display_name||'Bank account',provider_id:a.provider?.provider_id||'',provider_name:a.provider?.display_name||'Connected bank',currency:a.currency||'GBP',balance,available,last4:a.account_number?.number?String(a.account_number.number).slice(-4):''},transactions:tx}}

async function getMoneyData(request,env){
  if(!isConfigured(env))return json({configured:false,accounts:[],transactions:[],connections:[]});
  const auth=await verifyUser(request);if(!auth)return json({error:'Log in again to view connected accounts.'},401);
  const rr=await sbRest('dayframe_bank_connections_v1?user_id=eq.'+encodeURIComponent(auth.user.id)+'&select=id,encrypted_tokens,status,created_at&order=created_at.asc',auth.token,{method:'GET'});
  if(!rr.ok)return json({error:'Could not load your bank connections.'},502);
  const rows=await rr.json().catch(()=>[]),accounts=[],transactions=[],connections=[];
  for(const row of rows){
    let t=await decryptBlob(env,row.encrypted_tokens);if(!t){connections.push({id:row.id,status:'error'});continue}
    let changed=false;
    if(!t.access_token||Date.now()>Number(t.expires_at||0)-120000){const n=await refreshTokens(env,t);if(!n){connections.push({id:row.id,status:'reauth_required'});continue}t=n;changed=true}
    let ar=await apiGet(env,t.access_token,'/data/v1/accounts',request);
    if(ar.status===401&&t.refresh_token){const n=await refreshTokens(env,t);if(n){t=n;changed=true;ar=await apiGet(env,t.access_token,'/data/v1/accounts',request)}}
    if(!ar.ok){connections.push({id:row.id,status:ar.status===401||ar.status===403?'reauth_required':'error'});continue}
    if(changed){const enc=await encryptBlob(env,t);await sbRest('dayframe_bank_connections_v1?id=eq.'+encodeURIComponent(row.id),auth.token,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({encrypted_tokens:enc,status:'active',updated_at:new Date().toISOString()})})}
    const ad=await ar.json().catch(()=>({}));for(const a of (ad.results||[])){const x=await collectAccount(env,t.access_token,a,request,row.id);accounts.push(x.account);transactions.push(...x.transactions)}
    connections.push({id:row.id,status:'active',created_at:row.created_at});
  }
  const accountMap=new Map();for(const a of accounts)accountMap.set(a.connection_id+'|'+a.id,a);
  const txMap=new Map();for(const t of transactions)txMap.set(t.connection_id+'|'+t.id,t);
  const finalAccounts=[...accountMap.values()],finalTx=[...txMap.values()].sort((a,b)=>String(b.timestamp).localeCompare(String(a.timestamp)));
  return json({configured:true,api_version:'v1',accounts:finalAccounts,transactions:finalTx,connections,refreshed_at:new Date().toISOString()});
}

async function disconnectBank(request,env,id){const auth=await verifyUser(request);if(!auth)return json({error:'Log in again.'},401);const r=await sbRest('dayframe_bank_connections_v1?id=eq.'+encodeURIComponent(id)+'&user_id=eq.'+encodeURIComponent(auth.user.id),auth.token,{method:'DELETE'});if(!r.ok)return json({error:'Could not remove bank connection.'},502);return json({ok:true})}
