from pathlib import Path
import re

p=Path('_worker.js')
s=p.read_text()

# Remove the old CI/VI person-selection machinery entirely.
pat=re.compile(r"    function activateLegacyProfileForDayframe\(\)\{.*?\n\n    function applySingleSignOn\(\)\{", re.S)
replacement=r'''    function removeLegacyTheoryAccountUI(){
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

    function applySingleSignOn(){'''

# Use a function replacement so JavaScript escapes such as \s are not parsed by Python re.sub.
s2,n=pat.subn(lambda _m: replacement,s,count=1)
if n!=1:
    raise SystemExit(f'legacy theory profile block not found: {n}')

s2=s2.replace("    let legacyProfileActivated=false;\n","")
s2=s2.replace("      const profileName=df.name||df.user?.user_metadata?.name||df.user?.email||'Dayframe user';\n","")
s2=s2.replace("        localStorage.setItem('theory_user_name',profileName);\n","")
s2=s2.replace('removeLegacyProfileSwitcher()','removeLegacyTheoryAccountUI()')
s2=s2.replace('setInterval(removeLegacyProfileSwitcher,2000);','setInterval(removeLegacyTheoryAccountUI,900);')

p.write_text(s2)
print('Removed legacy theory person selection; Dayframe user ID is the account identity')
