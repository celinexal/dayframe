from pathlib import Path

p=Path('index.html')
s=p.read_text()

old_nav='''<div class="driving-sidepanel" id="driving-sidepanel" aria-label="Driving navigation">
  <div class="driving-side-head"><div class="driving-side-kicker">Driving</div><div class="driving-side-title">Your driving hub</div></div>
  <nav class="driving-side-nav">
    <button data-driving-page="driving" onclick="go('driving')"><span>◇</span>Learning to Drive</button>
    <button data-driving-page="driving-car" onclick="go('driving-car')"><span>▣</span>My Car</button>
    <button data-driving-page="driving-costs" onclick="go('driving-costs')"><span>£</span>Driving Costs</button>
  </nav>
</div>'''
new_nav='''<div class="driving-sidepanel" id="driving-sidepanel" aria-label="Driving navigation">
  <div class="driving-side-head"><div class="driving-side-kicker">Driving</div><div class="driving-side-title">Your driving hub</div></div>
  <nav class="driving-side-nav">
    <button data-driving-page="driving" onclick="go('driving')"><span>⌂</span>Overview</button>
    <button data-driving-page="driving-theory" onclick="go('driving-theory')"><span>◇</span>Pass your theory</button>
    <button data-driving-page="driving-car" onclick="go('driving-car')"><span>▣</span>My Car</button>
    <button data-driving-page="driving-costs" onclick="go('driving-costs')"><span>£</span>Driving Costs</button>
  </nav>
</div>'''
if old_nav not in s: raise SystemExit('Driving nav anchor not found')
s=s.replace(old_nav,new_nav,1)

old_page='''<!-- DRIVING -->
<div class="pg driving-tracker-page" id="pg-driving">
  <div class="driving-tracker-wrap">
    <div class="driving-tracker-head">
      <div>
        <div class="life-title-row">
          <div class="life-title-icon driving-accent"><svg viewBox="0 0 24 24"><path d="M6 18h12M8 14l4-8 4 8M9 11h6"/><path d="M5 21h14"/></svg></div>
          <div><div class="life-title">Learning to Drive</div><div class="life-sub">Your theory progress is linked automatically to your Dayframe account.</div></div>
        </div>
      </div>
      <div class="driving-tracker-actions"></div>
    </div>
    <div class="driving-frame-shell">
      <iframe class="driving-frame" src="/api/driving/theory?source=aa9ae107" title="Dayframe Theory Tracker" loading="eager"></iframe>
    </div>
  </div>
</div>
'''
new_page='''<!-- DRIVING -->
<div class="pg life-page" id="pg-driving"><div class="life-wrap">
  <div class="life-header driving-home-header">
    <div class="life-title-row">
      <div class="life-title-icon driving-accent"><svg viewBox="0 0 24 24"><path d="M5 13l1.8-5.1A2 2 0 018.7 6.5h6.6a2 2 0 011.9 1.4L19 13"/><rect x="3" y="12" width="18" height="6.5" rx="2"/><path d="M6 18.5V21M18 18.5V21"/></svg></div>
      <div><div class="life-title">Driving</div><div class="life-sub">Choose what you want to work on.</div></div>
    </div>
  </div>
  <div class="driving-home-grid">
    <button class="driving-home-card theory" onclick="go('driving-theory')">
      <div class="driving-home-icon">◇</div>
      <div class="driving-home-copy"><div class="driving-home-kicker">Start here</div><div class="driving-home-title">Let’s pass your theory</div><div class="driving-home-desc">Open your theory tracker and keep working through your progress.</div></div>
      <div class="driving-home-arrow">→</div>
    </button>
    <button class="driving-home-card" onclick="go('driving-car')">
      <div class="driving-home-icon">▣</div>
      <div class="driving-home-copy"><div class="driving-home-kicker">Vehicle</div><div class="driving-home-title">My Car</div><div class="driving-home-desc">Keep MOT, tax, insurance, servicing and vehicle notes together.</div></div>
      <div class="driving-home-arrow">→</div>
    </button>
    <button class="driving-home-card" onclick="go('driving-costs')">
      <div class="driving-home-icon">£</div>
      <div class="driving-home-copy"><div class="driving-home-kicker">Money</div><div class="driving-home-title">Driving Costs</div><div class="driving-home-desc">Track fuel, parking, repairs, servicing and other driving costs.</div></div>
      <div class="driving-home-arrow">→</div>
    </button>
  </div>
</div></div>

<div class="pg driving-tracker-page" id="pg-driving-theory">
  <div class="driving-tracker-wrap">
    <div class="driving-tracker-head">
      <div>
        <button class="life-back" onclick="go('driving')">← Driving</button>
        <div class="life-title-row">
          <div class="life-title-icon driving-accent"><svg viewBox="0 0 24 24"><path d="M6 18h12M8 14l4-8 4 8M9 11h6"/><path d="M5 21h14"/></svg></div>
          <div><div class="life-title">Let’s pass your theory</div><div class="life-sub">Your progress is linked to the Dayframe account you are already signed in to.</div></div>
        </div>
      </div>
      <div class="driving-tracker-actions"></div>
    </div>
    <div class="driving-frame-shell">
      <iframe class="driving-frame" src="/api/driving/theory?source=aa9ae107" title="Dayframe Theory Tracker" loading="lazy"></iframe>
    </div>
  </div>
</div>
'''
if old_page not in s: raise SystemExit('Driving page anchor not found')
s=s.replace(old_page,new_page,1)
s=s.replace('onclick="go(\'driving\')">← Learning to Drive</button>','onclick="go(\'driving\')">← Driving</button>')

css_anchor='.driving-tracker-page{background:#f7f8fc;min-height:calc(100vh - 64px)}'
css='''.driving-home-header{margin-bottom:20px}.driving-home-grid{display:grid;grid-template-columns:1.25fr 1fr 1fr;gap:14px}.driving-home-card{appearance:none;width:100%;min-height:210px;border:1px solid #e7eaf1;background:#fff;border-radius:20px;padding:22px;text-align:left;display:flex;flex-direction:column;align-items:flex-start;position:relative;cursor:pointer;font-family:var(--ff);box-shadow:0 5px 18px rgba(33,43,65,.035);transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}.driving-home-card:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(33,43,65,.08);border-color:#ddd8ff}.driving-home-card.theory{background:linear-gradient(145deg,#fff5f2,#fff 68%);border-color:#f3dcd7}.driving-home-icon{width:42px;height:42px;border-radius:13px;background:#fff0ed;color:#df6556;display:grid;place-items:center;font-size:17px;font-weight:850;margin-bottom:24px}.driving-home-card:not(.theory) .driving-home-icon{background:#f4f2ff;color:#6b5ee7}.driving-home-copy{padding-right:28px}.driving-home-kicker{font-size:8px;font-weight:850;letter-spacing:.85px;text-transform:uppercase;color:#a0a8b6;margin-bottom:5px}.driving-home-title{font-family:var(--fd);font-size:19px;font-weight:850;letter-spacing:-.35px;color:#20293b}.driving-home-desc{font-size:10px;line-height:1.65;color:#8993a4;margin-top:7px;max-width:360px}.driving-home-arrow{position:absolute;right:20px;bottom:18px;width:30px;height:30px;border-radius:50%;background:#f7f8fb;color:#7c8697;display:grid;place-items:center;font-size:14px}.driving-home-card.theory .driving-home-arrow{background:#fff0ed;color:#df6556}.driving-tracker-page{background:#f7f8fc;min-height:calc(100vh - 64px)}'''
if css_anchor not in s: raise SystemExit('Driving CSS anchor not found')
s=s.replace(css_anchor,css,1)
s=s.replace('@media(max-width:980px){\n  body.driving-mode .driving-sidepanel{width:185px}','@media(max-width:980px){\n  .driving-home-grid{grid-template-columns:1fr 1fr}.driving-home-card.theory{grid-column:1/-1;min-height:180px}\n  body.driving-mode .driving-sidepanel{width:185px}',1)
s=s.replace('@media(max-width:640px){\n  body.driving-mode .driving-sidepanel','@media(max-width:640px){\n  .driving-home-grid{grid-template-columns:1fr}.driving-home-card.theory{grid-column:auto}.driving-home-card{min-height:170px}\n  body.driving-mode .driving-sidepanel',1)
s=s.replace("const drivingPages=new Set(['driving','driving-car','driving-costs']);","const drivingPages=new Set(['driving','driving-theory','driving-car','driving-costs']);",1)
s=s.replace("if(name==='driving')setTimeout(syncTheoryFrameSession,120);","if(name==='driving-theory')setTimeout(syncTheoryFrameSession,120);",1)

p.write_text(s)
