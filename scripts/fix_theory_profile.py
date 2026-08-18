from pathlib import Path

p=Path('_worker.js')
s=p.read_text()

# The previous bridge accidentally left a second copy of the old selector-removal
# code outside its function. That throws in the embedded tracker and stops SSO.
dup_start=s.find("\n      // Hide exact legacy user buttons/options.\n      document.querySelectorAll('button,a,[role=\"button\"],label,span,div,select')")
dup_end=s.find("\n    function applySingleSignOn(){",dup_start)
if dup_start < 0 or dup_end < 0:
    raise SystemExit('Legacy duplicate selector block was not found')
s=s[:dup_start]+'\n'+s[dup_end:]

# Track whether we have used one of the legacy cards purely to unlock the old UI.
old="""    let df=getDayframeSession();

    // Expose one authenticated identity to the embedded app."""
new="""    let df=getDayframeSession();
    let legacyProfileActivated=false;

    // Expose one authenticated identity to the embedded app."""
if old not in s:
    raise SystemExit('Dayframe session anchor not found')
s=s.replace(old,new,1)

# Add an automatic legacy-card activation. The card is never shown to the user;
# API calls remain namespaced to the logged-in Dayframe/Supabase user.
old="""    function removeLegacyProfileSwitcher(){
      const names=['celine','valentina'];"""
new="""    function activateLegacyProfileForDayframe(){
      if(legacyProfileActivated||!df?.user?.id)return;
      try{
        const candidates=[...document.querySelectorAll('button,[role=\"button\"],[onclick],div')].filter(el=>{
          const txt=(el.textContent||'').trim().toLowerCase().replace(/\\s+/g,' ');
          if(txt.length<3||txt.length>180)return false;
          return /\\b(ci|vi)\\b/.test(txt) && /\\d+%/.test(txt) && txt.includes('streak');
        }).sort((a,b)=>(a.textContent||'').length-(b.textContent||'').length);
        const card=candidates[0];
        if(card){
          legacyProfileActivated=true;
          card.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
        }
      }catch(e){}
    }

    function removeLegacyProfileSwitcher(){
      const names=['celine','valentina'];"""
if old not in s:
    raise SystemExit('Profile switcher function anchor not found')
s=s.replace(old,new,1)

# Remove the actual CI/VI chooser block and its instruction, not just the names.
old="""      scrubRoot(document);

      // The logged-in Dayframe account is the only active profile."""
new="""      // Use one old profile card only to unlock the old tracker interface.
      // Requests from it are tied to the logged-in Dayframe account by the SSO bridge.
      activateLegacyProfileForDayframe();
      scrubRoot(document);

      try{
        const chooser=[...document.querySelectorAll('div,section,main')].filter(el=>{
          const txt=(el.textContent||'').trim().toLowerCase().replace(/\\s+/g,' ');
          const streaks=(txt.match(/streak/g)||[]).length;
          return txt.length<700 && streaks>=2 && /\\bci\\b/.test(txt) && /\\bvi\\b/.test(txt);
        }).sort((a,b)=>(a.textContent||'').length-(b.textContent||'').length);
        if(chooser[0])chooser[0].style.setProperty('display','none','important');

        document.querySelectorAll('div,p,span,h1,h2,h3,h4').forEach(el=>{
          const txt=(el.textContent||'').trim().toLowerCase().replace(/\\s+/g,' ');
          if(txt.length<180 && (txt.includes('select your name above')||txt.includes('choose your name above'))){
            el.style.setProperty('display','none','important');
          }
        });
      }catch(e){}

      // The logged-in Dayframe account is the only active profile."""
if old not in s:
    raise SystemExit('scrubRoot anchor not found')
s=s.replace(old,new,1)

# Give older tracker builds more aliases for the active profile.
old="""          'activeUser','active_user','selectedUser','selected_user',
          'selectedProfile','selected_profile'"""
new="""          'activeUser','active_user','selectedUser','selected_user',
          'selectedProfile','selected_profile','selectedName','selected_name',
          'currentProfile','current_profile','student','learner'"""
if old not in s:
    raise SystemExit('Profile alias anchor not found')
s=s.replace(old,new,1)

p.write_text(s)
print('Theory tracker now uses the logged-in Dayframe account and hides the legacy chooser.')
