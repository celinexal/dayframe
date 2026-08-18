from pathlib import Path
import re

# --- Convert the imported Theory Tracker from two named profiles to one Dayframe account ---
p = Path('driving/theory.html')
s = p.read_text()

# Remove the entire Celine / Valentina picker and CI / VI comparison area.
profile_ui = re.compile(r'\s*<div class="picker">.*?(?=<div class="syncing" id="sync-status">)', re.S)
s, n = profile_ui.subn('', s, count=1)
if n != 1:
    raise SystemExit('Theory profile UI block not found')

# Per-account cache is now keyed only by the logged-in Dayframe user ID.
s = s.replace('var cache={celine:null,valentina:null};', 'var cache={};')

# Always URL-encode the account key sent to the existing theory API.
s = s.replace('WORKER_URL+"?user="+user', 'WORKER_URL+"?user="+encodeURIComponent(user)')

# Replace all named-profile selection/comparison logic with Dayframe identity.
logic = re.compile(
    r'function updateVsBar\(\)\{.*?'
    r'function selectUser\(user\)\{.*?\n\}\n\n'
    r'function getMyUser\(\)\{.*?\n\}\n\n'
    r'function isMyView\(\)\{.*?\n\}',
    re.S,
)
replacement = r'''function updateVsBar(){}

function dayframeUserKey(){
  try{
    var s=JSON.parse(localStorage.getItem("dayframe_session")||"{}");
    var id=s&&s.user&&s.user.id;
    return id?"dayframe:"+id:"";
  }catch(e){return "";}
}

function getMyUser(){return currentUser;}
function isMyView(){return true;}

function initDayframeTheory(){
  currentUser=dayframeUserKey();
  if(!currentUser){
    document.getElementById("main-area").innerHTML='<div class="no-user"><h3>Sign in to Dayframe</h3><p>Your theory progress is linked to your Dayframe account.</p></div>';
    return;
  }
  cache[currentUser]=readLocalUser(currentUser)||{};
  setSyncStatus("syncing...");
  fetchUser(currentUser).then(function(){
    setSyncStatus("");
    renderCurrentTab();
  });
}

window.addEventListener("message",function(e){
  if(e.origin!==location.origin||!e.data||e.data.type!=="DAYFRAME_AUTH"||!e.data.user_id)return;
  var next="dayframe:"+e.data.user_id;
  if(currentUser===next&&cache[currentUser])return;
  currentUser=next;
  cache[currentUser]=readLocalUser(currentUser)||{};
  fetchUser(currentUser).then(function(){renderCurrentTab();});
});'''
s, n = logic.subn(lambda m: replacement, s, count=1)
if n != 1:
    raise SystemExit('Theory profile logic block not found')

# Remove remaining profile-specific visual decisions/copy.
s = s.replace('var isC=u==="celine",', 'var isC=false,')
s = s.replace('Select your name above', 'Sign in to Dayframe')
s = s.replace('Choose your name above', 'Sign in to Dayframe')
s = s.replace('tap your name to switch back.', '')

# Replace loading of both old profiles with loading of the signed-in Dayframe account.
startup = 'Promise.all([fetchUser("celine"),fetchUser("valentina")]).then(function(){updateVsBar();});'
if startup not in s:
    raise SystemExit('Old theory startup block not found')
s = s.replace(startup, 'initDayframeTheory();', 1)

# Remove any remaining visible legacy names from the source.
s = s.replace('Celine', '').replace('Valentina', '')

# Hard checks: no named-profile selection or old cards may survive.
for bad in [
    "selectUser('celine')", 'selectUser("celine")',
    "selectUser('valentina')", 'selectUser("valentina")',
    'btn-c', 'btn-v', 'mini-c', 'mini-v',
    'cache.celine', 'cache.valentina',
    'fetchUser("celine")', 'fetchUser("valentina")',
    'Select your name above',
]:
    if bad in s:
        raise SystemExit('Legacy theory profile reference remains: '+bad)

p.write_text(s)

# --- Make Dayframe load the local, migrated Theory Tracker ---
ip = Path('index.html')
ix = ip.read_text()
old = 'src="/api/driving/theory?source=aa9ae107"'
new = 'src="/driving/theory.html"'
if old in ix:
    ix = ix.replace(old, new, 1)
elif new not in ix:
    raise SystemExit('Driving theory iframe source not found')
ip.write_text(ix)

print('Theory Tracker now uses only the logged-in Dayframe account')
