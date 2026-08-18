from pathlib import Path
import re

p=Path('_worker.js')
s=p.read_text()

# Replace the old profile-card activation/removal block with a Dayframe-account-only bridge.
pat=re.compile(r"    function activateLegacyProfileForDayframe\(\)\{.*?\n    \}\n\n    function removeLegacyProfileSwitcher\(\)\{", re.S)
replacement=r'''    function legacyChooserCards(){
      try{
        const all=[...document.querySelectorAll('button,[role="button"],[onclick],a,div,section')];
        return all.filter(el=>{
          const txt=(el.innerText||el.textContent||'').trim().toLowerCase().replace(/\s+/g,' ');
          if(!/^(ci|vi)\b/.test(txt) || !txt.includes('streak')) return false;
          const r=el.getBoundingClientRect();
          return r.width>=70 && r.width<=520 && r.height>=20 && r.height<=140;
        });
      }catch(e){return []}
    }

    function removeLegacyChooserCards(){
      try{
        // Remove every old CI / VI profile card. There is no person picker in Dayframe.
        legacyChooserCards().forEach(card=>card.remove());

        // Remove any small wrapper whose only purpose was holding those profile cards.
        document.querySelectorAll('div,section').forEach(el=>{
          const txt=(el.innerText||el.textContent||'').trim().toLowerCase().replace(/\s+/g,' ');
          const ci=(txt.match(/\bci\b/g)||[]).length;
          const vi=(txt.match(/\bvi\b/g)||[]).length;
          const streaks=(txt.match(/streak/g)||[]).length;
          if(txt.length<500 && ci>=1 && vi>=1 && streaks>=2){
            el.remove();
          }
        });

        // Remove all copy asking the user to choose/select a person.
        document.querySelectorAll('div,p,span,h1,h2,h3,h4,label').forEach(el=>{
          const txt=(el.innerText||el.textContent||'').trim().toLowerCase().replace(/\s+/g,' ');
          if(txt.length<220 && (
            txt.includes('select your name') ||
            txt.includes('choose your name') ||
            txt.includes('select a name') ||
            txt.includes('choose a profile')
          )) el.remove();
        });
      }catch(e){}
    }

    function removeLegacyProfileSwitcher(){'''

s2,n=pat.subn(replacement,s,count=1)
if n!=1:
    raise SystemExit('legacy theory profile block not found')

# Delete the old hidden-profile activation call entirely.
s2=s2.replace("      activateLegacyProfileForDayframe();\n      scrubRoot(document);",
              "      removeLegacyChooserCards();\n      scrubRoot(document);",1)

# Make sure every SSO / mutation pass removes the legacy chooser.
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
              "setInterval(()=>{removeLegacyProfileSwitcher();removeLegacyChooserCards()},900);",1)

# Remove any remaining references that map the logged-in person's NAME to CI/VI.
s2=s2.replace("    let legacyProfileActivated=false;\n","")
s2=s2.replace("      const names=['celine','valentina'];\n","")

p.write_text(s2)
print('Legacy theory profile picker removed; Dayframe user ID remains the account identity')
