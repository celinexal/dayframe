from pathlib import Path

p = Path('driving/theory.html')
s = p.read_text()

# Remove the warm pastry/cream page background.
s = s.replace('--bg:#FBF8F4;', '--bg:#FFFFFF;', 1)

marker = '</style>'
overrides = r'''
/* Dayframe readability pass: larger tracker text + clean white canvas */
body{font-size:16px;background:#fff;}
.logo{font-size:1.55rem;}
.main{max-width:760px;}
.tabs{max-width:440px;}
.tab-btn{font-size:14px;padding:9px 10px;}
.welcome h2 .line-main{font-size:1.3rem;}
.welcome h2 .line-accent{font-size:2.45rem;}
.syncing{font-size:12px;}
.banner{font-size:14px;}
.wk-badge{font-size:12px;}
.week-title-text{font-size:15px;}
.week-prog{font-size:13px;}
.task-label{font-size:15px;line-height:1.55;}
.quick-link-btn{font-size:13px;padding:9px;}
.log-btn{font-size:15px;padding:14px;}
.nwc-title{font-size:15px;}
.nwc-count{font-size:13px;}
.topic-title{font-size:15px;}
.topic-summary{font-size:13px;}
.reading-back,.reading-crumb{font-size:14px;}
.reading-h1{font-size:1.9rem;}
.reading-summary{font-size:15px;}
.key-facts-title{font-size:12px;}
.key-fact-item{font-size:15px;}
.note-heading{font-size:16px;}
.note-body{font-size:15px;}
.action-btn{font-size:14px;}
.quiz-section-title{font-size:12px;}
.mock-title{font-size:17px;}
'''

if 'Dayframe readability pass: larger tracker text + clean white canvas' not in s:
    if marker not in s:
        raise SystemExit('style closing tag not found')
    s = s.replace(marker, overrides + '\n' + marker, 1)

p.write_text(s)
print('Theory Tracker style updated')
