const SUPABASE_URL='https://xvquxwvapgzxyuntylci.supabase.co';
const SUPABASE_ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2cXV4d3ZhcGd6eHl1bnR5bGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMjQ4MzQsImV4cCI6MjA4OTYwMDgzNH0.ovxzwMPaoyqdM4tJnjh28ovzj9mpsl87ToDiA2mXADw';
const STATE_COOKIE='dayframe_tl_v1_state';

export default {
  async fetch(request, env) {
    const url=new URL(request.url);
    try{
      if(url.pathname==='/api/money/status')return json({configured:isConfigured(env),environment:env.TRUELAYER_ENV||'sandbox',api_version:'v1',build:'multiuser-supabase-20260818'});
      if(url.pathname==='/api/money/connect'&&request.method==='POST')return startConnect(request,env);
      if(url.pathname==='/api/money/callback'&&request.method==='GET')return handleCallback(request,env);
      if(url.pathname==='/api/money/data'&&request.method==='GET')return getMoneyData(request,env);
      if(url.pathname.startsWith('/api/money/connections/')&&request.method==='DELETE')return disconnectBank(request,env,url.pathname.split('/').pop());
      if(url.pathname==='/api/driving/theory'&&request.method==='GET')return proxyTheoryTracker(request);
      if(url.pathname.startsWith('/api/'))return json({error:'Not found'},404);
      return env.ASSETS.fetch(request);
    }catch(err){console.error('Dayframe banking error',err);return json({error:'Something went wrong on the secure banking service.'},500)}
  }
};
function isConfigured(env){return !!(env.TRUELAYER_CLIENT_ID&&env.TRUELAYER_CLIENT_SECRET&&env.TRUELAYER_RETURN_URI)}
function isSandbox(env){return (env.TRUELAYER_ENV||'sandbox').toLowerCase()!=='production'}
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


async function proxyTheoryTracker(request){
  const sources=[
    'https://aa9ae107.theory-tracker.pages.dev/'
  ];
  let upstream=null, used='';
  for(const source of sources){
    try{
      const r=await fetch(source,{
        method:'GET',
        redirect:'follow',
        headers:{
          'accept':'text/html,application/xhtml+xml',
          'user-agent':request.headers.get('user-agent')||'Mozilla/5.0'
        }
      });
      if(r.ok){upstream=r;used=source;break}
    }catch(e){}
  }
  if(!upstream){
    return new Response(`<!doctype html><html><head><meta charset="utf-8"><style>
      body{font-family:Inter,Arial,sans-serif;background:#f7f8fc;color:#344054;padding:40px}
      .box{max-width:620px;margin:80px auto;background:white;border:1px solid #e7eaf1;border-radius:18px;padding:28px;box-shadow:0 10px 30px rgba(20,30,50,.06)}
      a{display:inline-block;margin-top:14px;padding:10px 14px;border-radius:10px;background:#ef7464;color:white;text-decoration:none;font-weight:700}
    </style></head><body><div class="box"><h2>Learning to Drive</h2><p>The theory tracker could not load inside Dayframe just now.</p><a href="https://aa9ae107.theory-tracker.pages.dev" target="_blank">Open Theory Tracker</a></div></body></html>`,
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
    </style></head><body><div class="box"><h2>Theory Tracker source is pointing to Dayframe</h2><p>The tracker deployment needs to be corrected before it can be shown here.</p><a href="https://aa9ae107.theory-tracker.pages.dev" target="_blank">Open the tracker deployment</a></div></body></html>`,
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
    let legacyProfileActivated=false;

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

    function activateLegacyProfileForDayframe(){
      if(legacyProfileActivated||!df?.user?.id)return;
      try{
        const candidates=[...document.querySelectorAll('button,[role="button"],[onclick],div')].filter(el=>{
          const txt=(el.textContent||'').trim().toLowerCase().replace(/\s+/g,' ');
          if(txt.length<3||txt.length>180)return false;
          return /\b(ci|vi)\b/.test(txt) && /\d+%/.test(txt) && txt.includes('streak');
        }).sort((a,b)=>(a.textContent||'').length-(b.textContent||'').length);
        const card=candidates[0];
        if(card){
          legacyProfileActivated=true;
          card.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
        }
      }catch(e){}
    }

    function removeLegacyProfileSwitcher(){
      const names=['celine','valentina'];
      const loggedName=(df?.name||df?.user?.user_metadata?.name||'').trim();

      function scrubRoot(root){
        if(!root)return;

        // Remove/replace text nodes directly, including nested UI controls.
        try{
          const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
          const nodes=[];
          let n;
          while((n=walker.nextNode()))nodes.push(n);
          nodes.forEach(node=>{
            const t=node.nodeValue||'';
            if(/\b(celine|valentina)\b/i.test(t)){
              // If this is a single-name label, remove it entirely.
              if(/^\s*(celine|valentina)\s*$/i.test(t)){
                node.nodeValue='';
              }else{
                node.nodeValue=t.replace(/\bceline\b/gi,'').replace(/\bvalentina\b/gi,'').replace(/\s{2,}/g,' ');
              }
            }
          });
        }catch(e){}

        // Remove old profile options/buttons and their small wrappers.
        try{
          root.querySelectorAll?.('option').forEach(o=>{
            const t=(o.textContent||'').trim().toLowerCase();
            if(names.includes(t))o.remove();
          });

          root.querySelectorAll?.('button,a,[role="button"],label,span,div,li').forEach(el=>{
            const txt=(el.textContent||'').trim().toLowerCase().replace(/\s+/g,' ');
            if(names.includes(txt)){
              el.style.setProperty('display','none','important');
              return;
            }
            if(txt.length>0 && txt.length<100 && txt.includes('celine') && txt.includes('valentina')){
              el.style.setProperty('display','none','important');
            }
          });

          root.querySelectorAll?.('select').forEach(sel=>{
            const opts=[...sel.options].map(o=>(o.textContent||'').trim().toLowerCase());
            if(opts.some(x=>names.includes(x))){
              sel.style.setProperty('display','none','important');
              const wrap=sel.closest('div,label,section');
              if(wrap && (wrap.textContent||'').trim().length<140){
                wrap.style.setProperty('display','none','important');
              }
            }
          });

          // Recurse into all open shadow roots.
          root.querySelectorAll?.('*').forEach(el=>{
            if(el.shadowRoot)scrubRoot(el.shadowRoot);
          });
        }catch(e){}
      }

      // Use one old profile card only to unlock the old tracker interface.
      // Requests from it are tied to the logged-in Dayframe account by the SSO bridge.
      activateLegacyProfileForDayframe();
      scrubRoot(document);

      try{
        const chooser=[...document.querySelectorAll('div,section,main')].filter(el=>{
          const txt=(el.textContent||'').trim().toLowerCase().replace(/\s+/g,' ');
          const streaks=(txt.match(/streak/g)||[]).length;
          return txt.length<700 && streaks>=2 && /\bci\b/.test(txt) && /\bvi\b/.test(txt);
        }).sort((a,b)=>(a.textContent||'').length-(b.textContent||'').length);
        if(chooser[0])chooser[0].style.setProperty('display','none','important');

        document.querySelectorAll('div,p,span,h1,h2,h3,h4').forEach(el=>{
          const txt=(el.textContent||'').trim().toLowerCase().replace(/\s+/g,' ');
          if(txt.length<180 && (txt.includes('select your name above')||txt.includes('choose your name above'))){
            el.style.setProperty('display','none','important');
          }
        });
      }catch(e){}

      // The logged-in Dayframe account is the only active profile.
      document.documentElement.setAttribute('data-dayframe-profile',df?.user?.id||'');
      if(loggedName)document.documentElement.setAttribute('data-dayframe-profile-name',loggedName);
    }


    function applySingleSignOn(){
      df=getDayframeSession();
      window.__DAYFRAME_SESSION__=df;
      window.__DAYFRAME_USER__=df.user||null;
      if(!df?.access_token||!df?.user?.id)return;

      // Give the old tracker one stable profile identifier derived from
      // the logged-in Dayframe/Supabase account.
      const profileId='dayframe:'+df.user.id;
      const profileName=df.name||df.user?.user_metadata?.name||df.user?.email||'Dayframe user';
      try{
        [
          'theory_user_id','theory_profile_id','currentUser','current_user',
          'activeUser','active_user','selectedUser','selected_user',
          'selectedProfile','selected_profile','selectedName','selected_name',
          'currentProfile','current_profile','student','learner'
        ].forEach(k=>localStorage.setItem(k,profileId));
        localStorage.setItem('theory_user_name',profileName);
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
      removeLegacyProfileSwitcher();

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
      removeLegacyProfileSwitcher();
    });
    window.addEventListener('DOMContentLoaded',()=>{
      applySingleSignOn();
      removeLegacyProfileSwitcher();
      observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
      try{parent.postMessage({type:'DAYFRAME_THEORY_READY'},location.origin)}catch(e){}
    });
    setTimeout(applySingleSignOn,50);
    setTimeout(()=>{applySingleSignOn();removeLegacyProfileSwitcher()},500);
    setTimeout(()=>{applySingleSignOn();removeLegacyProfileSwitcher()},1500);
    setInterval(removeLegacyProfileSwitcher,2000);
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
  if(!isConfigured(env))return json({error:'Open Banking is not configured in Cloudflare.'},503);
  const auth=await verifyUser(request);if(!auth)return json({error:'Log in to connect a bank.'},401);
  const body=await request.json().catch(()=>({}));const name=String(body.name||'').trim(),email=String(body.email||auth.user.email||'').trim();const v=validateProfile(name,email);if(v)return json({error:v},400);
  if(!isSandbox(env))return json({error:'This test build is intentionally limited to TrueLayer Sandbox.'},400);
  const state=crypto.randomUUID(),consentId='dayframe-'+crypto.randomUUID();
  const payload={response_type:'code',client_id:env.TRUELAYER_CLIENT_ID,redirect_uri:env.TRUELAYER_RETURN_URI,scope:'accounts balance transactions offline_access',state,consent_id:consentId,user:{name,email},data_use_description:'Dayframe uses your account data to show balances, transactions, budgets and bills so you can track spending and manage your money in one place.',provider_id:'mock'};
  const r=await fetch(authBase(env)+'/v1/authuri',{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify(payload)});
  const txt=await r.text();let d={};try{d=txt?JSON.parse(txt):{}}catch(e){d={raw:txt}}
  if(!r.ok){console.error('TrueLayer authuri',r.status,txt);return json({error:d.error_description||d.detail||d.error||('TrueLayer rejected the connection (HTTP '+r.status+').')},r.status>=400&&r.status<500?r.status:502)}
  const authUrl=d.result||d.auth_uri||d.uri||d.url;if(!authUrl)return json({error:'TrueLayer did not return the bank login URL.'},502);
  const statePayload=await encryptBlob(env,{state,user_id:auth.user.id,sb_token:auth.token,created_at:Date.now()});
  return json({auth_url:authUrl},200,{'set-cookie':`${STATE_COOKIE}=${encodeURIComponent(statePayload)}; Path=/; Max-Age=900; HttpOnly; Secure; SameSite=Lax`});
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
async function collectAccount(env,token,a,request,connectionId){const id=a.account_id;let balance=0,available=null,tx=[];const [br,tr]=await Promise.all([apiGet(env,token,'/data/v1/accounts/'+encodeURIComponent(id)+'/balance',request),apiGet(env,token,'/data/v1/accounts/'+encodeURIComponent(id)+'/transactions',request)]);if(br.ok){const b=await br.json().catch(()=>({}));const x=b.results?.[0]||{};balance=Number(x.current)||0;available=x.available==null?null:Number(x.available)}if(tr.ok){const d=await tr.json().catch(()=>({}));tx=(d.results||[]).map(t=>({id:t.transaction_id||crypto.randomUUID(),connection_id:connectionId,account_id:id,account_name:a.display_name||'Bank account',timestamp:t.timestamp||'',description:t.description||'',merchant:t.merchant_name||'',amount:Math.abs(Number(t.amount)||0),direction:direction(t),category:category(t),currency:t.currency||a.currency||'GBP'}))}return {account:{connection_id:connectionId,id,type:String(a.account_type||'').includes('SAVINGS')?'savings':'bank',name:a.display_name||'Bank account',provider_id:a.provider?.provider_id||'mock',provider_name:a.provider?.display_name||'Mock Bank',currency:a.currency||'GBP',balance,available,last4:a.account_number?.number?String(a.account_number.number).slice(-4):''},transactions:tx}}

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
