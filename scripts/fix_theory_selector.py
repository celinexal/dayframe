from pathlib import Path
import re

p=Path('_worker.js')
s=p.read_text()

pat=re.compile(r"    function activateLegacyProfileForDayframe\(\)\{.*?\n    \}\n\n    function removeLegacyProfileSwitcher\(\)\{",re.S)
replacement=r'''    function legacyChooserCards(){
      try{
        const all=[...document.querySelectorAll('button,[role="button"],[onclick],a,div')];
        const hits=all.filter(el=>{
          const txt=(el.innerText||el.textContent||'').trim().toLowerCase().replace(/\s+/g,' ');
          if(!(txt.startsWith('ci')||txt.startsWith('vi'))||!txt.includes('streak'))return false;
          const r=el.getBoundingClientRect();
          return r.width>=70 && r.width<=500 && r.height>=20 && r.height<=110;
        });
        const best={};
        hits.forEach(el=>{
          const txt=(el.innerText||el.textContent||'').trim().toLowerCase();
          const key=txt.startsWith('vi')?'vi':'ci';
          const r=el.getBoundingClientRect(),area=r.width*r.height;
          const prev=best[key];
          if(!prev){best[key]=el;return}
          const pr=prev.getBoundingClientRect(),parea=pr.width*pr.height;
          if(area>parea)best[key]=el;
        });
        return Object.values(best);
      }catch(e){return []}
    }

    function activateLegacyProfileForDayframe(){
      if(legacyProfileActivated||!df?.user?.id)return;
      try{
        const logged=(df?.name||df?.user?.user_metadata?.name||df?.user?.email||'').toLowerCase();
        const wanted=logged.includes('valentina')?'vi':'ci';
        const cards=legacyChooserCards();
        const card=cards.find(el=>(el.innerText||el.textContent||'').trim().toLowerCase().startsWith(wanted))||cards[0];
        if(card){
          legacyProfileActivated=true;
          card.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
        }
      }catch(e){}
    }

    function removeLegacyChooserCards(){
      try{
        legacyChooserCards().forEach(card=>card.style.setProperty('display','none','important'));
        document.querySelectorAll('div,p,span,h1,h2,h3,h4').forEach(el=>{
          const txt=(el.innerText||el.textContent||'').trim().toLowerCase().replace(/\s+/g,' ');
          if(txt.length<200&&(txt.includes('select your name above')||txt.includes('choose your name above'))){
            el.style.setProperty('display','none','important');
          }
        });
      }catch(e){}
    }

    function removeLegacyProfileSwitcher(){'''

s2,n=pat.subn(replacement,s,count=1)
if n!=1:
    raise SystemExit('activateLegacyProfileForDayframe block not found')

needle="      activateLegacyProfileForDayframe();\n      scrubRoot(document);"
if needle not in s2:
    raise SystemExit('activation call anchor not found')
s2=s2.replace(needle,"      activateLegacyProfileForDayframe();\n      removeLegacyChooserCards();\n      scrubRoot(document);",1)

# Run the selector remover on all existing SSO/mutation passes too.
s2=s2.replace("      removeLegacyProfileSwitcher();\n\n      document.documentElement.setAttribute('data-dayframe-authenticated'",
              "      removeLegacyProfileSwitcher();\n      removeLegacyChooserCards();\n\n      document.documentElement.setAttribute('data-dayframe-authenticated'",1)
s2=s2.replace("      removeLegacyProfileSwitcher();\n    });\n    window.addEventListener('DOMContentLoaded'",
              "      removeLegacyProfileSwitcher();\n      removeLegacyChooserCards();\n    });\n    window.addEventListener('DOMContentLoaded'",1)
s2=s2.replace("      removeLegacyProfileSwitcher();\n      observer.observe(document.documentElement",
              "      removeLegacyProfileSwitcher();\n      removeLegacyChooserCards();\n      observer.observe(document.documentElement",1)
s2=s2.replace("setTimeout(()=>{applySingleSignOn();removeLegacyProfileSwitcher()},500);",
              "setTimeout(()=>{applySingleSignOn();removeLegacyProfileSwitcher();removeLegacyChooserCards()},500);",1)
s2=s2.replace("setTimeout(()=>{applySingleSignOn();removeLegacyProfileSwitcher()},1500);",
              "setTimeout(()=>{applySingleSignOn();removeLegacyProfileSwitcher();removeLegacyChooserCards()},1500);",1)
s2=s2.replace("setInterval(removeLegacyProfileSwitcher,2000);",
              "setInterval(()=>{removeLegacyProfileSwitcher();removeLegacyChooserCards()},1200);",1)

p.write_text(s2)
print('Theory selector patch applied')
