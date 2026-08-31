import re
import os
from pathlib import Path


ROOT = Path("dist")


def replace_all(path, replacements, required=True):
    file_path = ROOT / path
    text = file_path.read_text(encoding="utf-8")
    missing = []
    for old, new in replacements:
        if old not in text:
            missing.append(old[:90])
        text = text.replace(old, new)
    file_path.write_text(text, encoding="utf-8")
    if missing and required:
        raise SystemExit(f"{path}: missing expected text: {missing}")
    if missing:
        print(f"{path}: skipped {len(missing)} optional replacements")


def append_once(path, marker, block):
    file_path = ROOT / path
    text = file_path.read_text(encoding="utf-8")
    if marker not in text:
        text = text.rstrip() + "\n\n" + block.strip() + "\n"
        file_path.write_text(text, encoding="utf-8")


def replace_regex(path, pattern, repl, required=True):
    file_path = ROOT / path
    text = file_path.read_text(encoding="utf-8")
    text, count = re.subn(pattern, repl, text)
    file_path.write_text(text, encoding="utf-8")
    if count == 0 and required:
        raise SystemExit(f"{path}: missing expected pattern: {pattern}")
    if count == 0:
        print(f"{path}: skipped optional regex: {pattern}")


def assert_absent(path, pattern):
    file_path = ROOT / path
    text = file_path.read_text(encoding="utf-8")
    if re.search(pattern, text):
        raise SystemExit(f"{path}: unwanted old copy still present: {pattern}")


replace_all(
    "assets/dayframe-essentials-more.js",
    [
        ("label: 'Home & Rent'", "label: 'Home'"),
        ("label: 'Work & Study'", "label: 'Work'"),
        ("desc: 'Track rent dates, tenancy notes and moving tasks.'", "desc: 'Rent dates, tenancy notes and moving tasks.'"),
        ("desc: 'Keep shifts, applications, certificates and deadlines visible.'", "desc: 'Shifts, applications, certificates and deadlines.'"),
        ("desc: 'Shifts, applications, courses and deadlines.'", "desc: 'Shifts, applications, certificates and deadlines.'"),
        ("empty: 'No home or rent reminders saved'", "empty: 'No home reminders saved'"),
        ("list: 'Home and rent reminders'", "list: 'Home reminders'"),
        ("list: 'Home and rent'", "list: 'Home reminders'"),
        ("itemLabel: 'Home or rent item'", "itemLabel: 'Home item'"),
        ("itemLabel: 'What needs tracking?'", "itemLabel: 'Home item'"),
        ("empty: 'No work or study dates saved'", "empty: 'No work dates saved'"),
        ("list: 'Work and study dates'", "list: 'Work dates'"),
        ("itemLabel: 'Work or study item'", "itemLabel: 'Work item'"),
        ("formTitle: 'Add a work or study date'", "formTitle: 'Add a work date'"),
        ("tags: ['Shifts', 'Courses', 'Applications', 'Certificates']", "tags: ['Shifts', 'Applications', 'Certificates', 'Deadlines']"),
        ("types: ['Shift', 'Course', 'Application', 'Interview', 'Certificate', 'Deadline', 'Other']", "types: ['Shift', 'Application', 'Interview', 'Certificate', 'Deadline', 'Other']"),
        ("const homeSummary = () => `${labelList(visibleLabels(), 3)}.`;", "const homeSummary = () => { const labels = visibleLabels(); return labels.length ? 'Everyday details, reminders and renewals.' : 'Choose what Essentials shows.'; };"),
        ("const homeSummary = () => (visibleLabels().length ? 'Your chosen everyday essentials, kept together.' : 'Choose what Essentials shows.');", "const homeSummary = () => (visibleLabels().length ? 'Everyday details, reminders and renewals.' : 'Choose what Essentials shows.');"),
        ("const mobileSummary = () => labelList(visibleLabels(), 2);", "const mobileSummary = () => (visibleLabels().length ? 'Everyday essentials' : 'Choose Essentials');"),
        ("const mobileSummary = () => (visibleLabels().length ? 'Your essentials' : 'Choose Essentials');", "const mobileSummary = () => (visibleLabels().length ? 'Everyday essentials' : 'Choose Essentials');"),
    ],
    required=False,
)
replace_regex("assets/dayframe-essentials-more.js", r"const VERSION = 'more-v\d+';", "const VERSION = 'more-v10';", required=False)

replace_all(
    "assets/dayframe-essentials-clickfix.js",
    [
        ("home: 'Home & Rent'", "home: 'Home'"),
        ("'work-study': 'Work & Study'", "'work-study': 'Work'"),
        ("label: 'Home & Rent'", "label: 'Home'"),
        ("label: 'Work & Study'", "label: 'Work'"),
        ("desc: 'Shifts, applications, courses and deadlines.'", "desc: 'Shifts, applications, certificates and deadlines.'"),
        ("empty: 'No home or rent reminders saved'", "empty: 'No home reminders saved'"),
        ("list: 'Home and rent'", "list: 'Home reminders'"),
        ("formTitle: 'Add a home reminder'", "formTitle: 'Add a home reminder'"),
        ("itemLabel: 'What needs tracking?'", "itemLabel: 'Home item'"),
        ("empty: 'No work or study dates saved'", "empty: 'No work dates saved'"),
        ("list: 'Work and study dates'", "list: 'Work dates'"),
        ("formTitle: 'Add a work or study date'", "formTitle: 'Add a work date'"),
        ("tags: ['Shifts', 'Courses', 'Applications', 'Certificates']", "tags: ['Shifts', 'Applications', 'Certificates', 'Deadlines']"),
        ("types: ['Shift', 'Course', 'Application', 'Interview', 'Certificate', 'Deadline', 'Other']", "types: ['Shift', 'Application', 'Interview', 'Certificate', 'Deadline', 'Other']"),
        ("return `${listLabels(visibleWidgetLabels(), 3)}.`;", "return visibleWidgetLabels().length ? 'Everyday details, reminders and renewals.' : 'Choose what Essentials shows.';"),
        ("return listLabels(visibleWidgetLabels(), 2);", "return visibleWidgetLabels().length ? 'Everyday essentials' : 'Choose Essentials';"),
        ("return visibleWidgetLabels().length ? 'Your chosen everyday essentials, kept together.' : 'Choose what Essentials shows.';", "return visibleWidgetLabels().length ? 'Everyday details, reminders and renewals.' : 'Choose what Essentials shows.';"),
        ("return visibleWidgetLabels().length ? 'Your essentials' : 'Choose Essentials';", "return visibleWidgetLabels().length ? 'Everyday essentials' : 'Choose Essentials';"),
    ],
    required=False,
)
replace_regex("assets/dayframe-essentials-clickfix.js", r"const VERSION = 'clickfix-v\d+';", "const VERSION = 'clickfix-v14';", required=False)

replace_all(
    "assets/dayframe-essentials-customise.js",
    [
        ("label: 'Home & Rent'", "label: 'Home'"),
        ("label: 'Work & Study'", "label: 'Work'"),
        ("desc: 'Shifts, applications, courses and deadlines.'", "desc: 'Shifts, applications, certificates and deadlines.'"),
    ],
    required=False,
)
replace_regex("assets/dayframe-essentials-customise.js", r"const VERSION = 'customise-v\d+';", "const VERSION = 'customise-v2';", required=False)

replace_all(
    "assets/dayframe-sector-themes-current.js",
    [
        ("<span class=\"df-theme-tag\">${esc(theme.tag)}</span>", "<span class=\"df-theme-tag\" data-theme-term=\"${esc(theme.tag)}\" title=\"Learn what ${esc(theme.tag)} means\">${esc(theme.tag)}</span>"),
        ("Research examples", "Company examples"),
        ("Use this as a current briefing: what the bottleneck is, what changed, what to check next, and which names are examples to research. It is educational context, not a buy or sell instruction.", "Use this as a current briefing: status pills open a short lesson, company pills open research, and source pills open the original material. It is educational context, not a buy or sell instruction."),
        ("Source-backed theme notes. Tap source pills to verify the original material.", "Updated theme notes. Tap source pills to verify the original material."),
        ("Examples are for research. Owned and watchlist badges use your current local portfolio state.", "Company pills are examples to research, not recommendations. Owned and watchlist labels use your current local portfolio state."),
    ],
    required=False,
)

append_once(
    "assets/dayframe-sector-themes-current.js",
    "data-dayframe-sector-term-clarity",
    r"""
;(() => {
  'use strict';
  const FLAG = 'data-dayframe-sector-term-clarity';
  if (document.documentElement.hasAttribute(FLAG)) return;
  document.documentElement.setAttribute(FLAG, 'v1');

  const topics = [
    ['theme-active-bottleneck', 'Active bottleneck', 'A part of the supply chain is currently slowing growth down, so delays, pricing and order backlogs matter.', '<p>A bottleneck is not automatically good or bad. It means demand can be strong, but one practical limit decides how fast the theme can grow.</p><div class="edu-tip"><strong>Example:</strong> AI data centres may want more capacity, but grid connections, cooling equipment and backup power can slow the buildout.</div>'],
    ['theme-tight-supply', 'Tight supply', 'There is not enough supply to meet demand right now, so pricing, waiting lists and new capacity matter.', '<p>Tight supply can help company margins for a while, but it can reverse if demand cools or too much new capacity arrives together.</p><div class="edu-tip"><strong>Example:</strong> Memory chips can look strong when HBM capacity is booked, then weaken if orders slow or supply catches up.</div>'],
    ['theme-buildout', '2026 buildout', 'A buildout is a heavy spending phase where companies are buying equipment, sites and capacity before the full revenue arrives.', '<p>Buildouts can create large orders for suppliers, but investors still need to watch whether customers keep spending and whether projects arrive on time.</p>'],
    ['theme-hyperscaler-push', 'Hyperscaler push', 'The biggest cloud companies are spending heavily, and their supplier choices can move whole sectors.', '<p>Hyperscalers are companies such as Microsoft, Amazon, Google and Meta. Their data-centre plans can lift suppliers, but one delayed order can also reset expectations quickly.</p>'],
    ['theme-supply-risk', 'Supply risk', 'A company or theme depends on materials, factories, locations or suppliers that may not be reliable enough.', '<p>Supply risk matters because demand alone is not enough. A business still has to source parts, scale production and deliver without margins breaking.</p>'],
    ['theme-execution-watch', 'Execution watch', 'The idea may be interesting, but the company still has to prove it can deliver consistently.', '<p>Execution watch means checking milestones: revenue, margins, customer wins, production delays, cash burn and whether promises become results.</p>'],
  ];
  const byTerm = new Map(topics.map((topic) => [topic[1], topic]));
  let queued = false;

  function ensureStyle() {
    if (document.getElementById('df-sector-term-clarity-style')) return;
    const style = document.createElement('style');
    style.id = 'df-sector-term-clarity-style';
    style.textContent = '#pg-themes-hub .df-theme-tag{display:inline-flex!important;align-items:center!important;gap:6px!important;cursor:pointer!important}#pg-themes-hub .df-theme-tag:hover{transform:translateY(-1px);box-shadow:0 7px 16px rgba(117,100,242,.16)!important}#pg-themes-hub .df-theme-tag:focus-visible{outline:3px solid rgba(117,100,242,.25)!important;outline-offset:2px!important}#pg-themes-hub .df-theme-tag-info{width:15px;height:15px;display:inline-grid;place-items:center;border-radius:999px;background:#fff;color:#6d60e8;font-size:10px;font-weight:950;line-height:1}#pg-themes-hub .df-theme-source-label{margin-top:12px!important}';
    document.head.appendChild(style);
  }

  function ensureTopics() {
    if (typeof EDU_TOPICS === 'undefined' || !Array.isArray(EDU_TOPICS)) return;
    topics.forEach(([id, title, body, detail]) => {
      if (!EDU_TOPICS.some((item) => item && item.id === id)) {
        EDU_TOPICS.push({ id, cat: 'analysis', icon: 'i', tag: 'theme', title, body, detail });
      }
    });
  }

  function termFor(tag) {
    const saved = tag?.dataset?.themeTerm;
    if (saved && byTerm.has(saved)) return saved;
    const text = Array.from(tag?.childNodes || [])
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.nodeValue)
      .join(' ')
      .trim();
    const fallback = (text || tag?.textContent || '').replace(/\bi\s*$/i, '').trim();
    return byTerm.has(fallback) ? fallback : '';
  }

  function apply() {
    queued = false;
    const page = document.getElementById('pg-themes-hub');
    if (!page || !page.querySelector('.df-theme-card')) return;
    ensureStyle();
    ensureTopics();
    page.querySelectorAll('.df-theme-label').forEach((label) => {
      if (label.textContent.trim().toLowerCase() === 'research examples') label.textContent = 'Company examples';
    });
    page.querySelectorAll('.df-theme-card > .df-theme-sources').forEach((sources) => {
      if (!sources.querySelector('a')) return;
      if (sources.previousElementSibling?.classList?.contains('df-theme-source-label')) return;
      const label = document.createElement('div');
      label.className = 'df-theme-label df-theme-source-label';
      label.textContent = 'Sources used';
      sources.insertAdjacentElement('beforebegin', label);
    });
    page.querySelectorAll('.df-theme-tag').forEach((tag) => {
      const term = termFor(tag);
      if (!term) return;
      const topic = byTerm.get(term);
      tag.dataset.themeTerm = term;
      tag.dataset.themeTopic = topic[0];
      tag.setAttribute('role', 'button');
      tag.setAttribute('tabindex', '0');
      tag.setAttribute('title', `Learn what ${term} means`);
      tag.setAttribute('aria-label', `Learn what ${term} means`);
      if (!tag.querySelector('.df-theme-tag-info')) {
        const info = document.createElement('span');
        info.className = 'df-theme-tag-info';
        info.setAttribute('aria-hidden', 'true');
        info.textContent = 'i';
        tag.appendChild(info);
      }
    });
  }

  function queue() {
    if (queued) return;
    queued = true;
    setTimeout(apply, 80);
  }

  function openTerm(term) {
    const topic = byTerm.get(term);
    if (!topic) return;
    ensureTopics();
    if (typeof window.goEdu === 'function') window.goEdu(topic[0]);
  }

  document.addEventListener('click', (event) => {
    const tag = event.target.closest?.('#pg-themes-hub .df-theme-tag');
    if (!tag) return queue();
    const term = termFor(tag);
    if (!term) return;
    event.preventDefault();
    event.stopPropagation();
    openTerm(term);
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const tag = event.target.closest?.('#pg-themes-hub .df-theme-tag');
    const term = termFor(tag);
    if (!term) return;
    event.preventDefault();
    openTerm(term);
  }, true);

  if (typeof MutationObserver === 'function' && document.body) {
    new MutationObserver(queue).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
  [150, 500, 1200, 2600].forEach((delay) => setTimeout(apply, delay));
})();
""",
)

replace_all(
    "sw.js",
    [
        ("const DAYFRAME_SECTOR_THEMES_CURRENT_SRC = '/assets/dayframe-sector-themes-current.js?v=20260830-current-sector-themes';", "const DAYFRAME_SECTOR_THEMES_CURRENT_SRC = '/assets/dayframe-sector-themes-current.js?v=20260901-sector-clarity-v1';"),
        ("const DAYFRAME_ESSENTIALS_CLICKFIX_SRC = '/assets/dayframe-essentials-clickfix.js?v=20260831-clickfix-v13';", "const DAYFRAME_ESSENTIALS_CLICKFIX_SRC = '/assets/dayframe-essentials-clickfix.js?v=20260901-clickfix-v14';"),
        ("const DAYFRAME_ESSENTIALS_CUSTOMISE_SRC = '/assets/dayframe-essentials-customise.js?v=20260831-customise-v1';", "const DAYFRAME_ESSENTIALS_CUSTOMISE_SRC = '/assets/dayframe-essentials-customise.js?v=20260901-customise-v2';"),
        ("const DAYFRAME_ESSENTIALS_PILL_LEFT_SRC = '/assets/dayframe-essentials-pill-left.js?v=20260831-pill-left-v1';", "const DAYFRAME_ESSENTIALS_MORE_SRC = '/assets/dayframe-essentials-more.js?v=20260901-essentials-labels-v1';\nconst DAYFRAME_ESSENTIALS_PILL_LEFT_SRC = '/assets/dayframe-essentials-pill-left.js?v=20260831-pill-left-v1';"),
        (".replace(/\\/assets\\/dayframe-essentials\\.js\\?v=[^\"']+/g, DAYFRAME_ESSENTIALS_SRC)\n    .replace(/\\/assets\\/dayframe-essentials-clickfix\\.js\\?v=[^\"']+/g, DAYFRAME_ESSENTIALS_CLICKFIX_SRC)", ".replace(/\\/assets\\/dayframe-essentials\\.js\\?v=[^\"']+/g, DAYFRAME_ESSENTIALS_SRC)\n    .replace(/\\/assets\\/dayframe-essentials-more\\.js\\?v=[^\"']+/g, DAYFRAME_ESSENTIALS_MORE_SRC)\n    .replace(/\\/assets\\/dayframe-essentials-clickfix\\.js\\?v=[^\"']+/g, DAYFRAME_ESSENTIALS_CLICKFIX_SRC)"),
        (".replace(/\\/assets\\/dayframe-myflo-calendar-actions\\.js\\?v=[^\"']+/g, DAYFRAME_MYFLO_CALENDAR_ACTIONS_SRC);", ".replace(/\\/assets\\/dayframe-myflo-calendar-actions\\.js\\?v=[^\"']+/g, DAYFRAME_MYFLO_CALENDAR_ACTIONS_SRC)\n    .replace(/\\/assets\\/dayframe-sector-themes-current\\.js\\?v=[^\"']+/g, DAYFRAME_SECTOR_THEMES_CURRENT_SRC);"),
    ],
    required=False,
)
replace_regex("sw.js", r"const DAYFRAME_CACHE\s*=\s*'dayframe-shell-v\d+';", "const DAYFRAME_CACHE = 'dayframe-shell-v94';", required=False)
replace_regex("sw.js", r"const DAYFRAME_SECTOR_THEMES_CURRENT_SRC\s*=\s*'[^']+';", "const DAYFRAME_SECTOR_THEMES_CURRENT_SRC = '/assets/dayframe-sector-themes-current.js?v=20260901-sector-clarity-v1';", required=False)
replace_regex("sw.js", r"const DAYFRAME_ESSENTIALS_CLICKFIX_SRC\s*=\s*'[^']+';", "const DAYFRAME_ESSENTIALS_CLICKFIX_SRC = '/assets/dayframe-essentials-clickfix.js?v=20260901-clickfix-v14';", required=False)
replace_regex("sw.js", r"const DAYFRAME_ESSENTIALS_CUSTOMISE_SRC\s*=\s*'[^']+';", "const DAYFRAME_ESSENTIALS_CUSTOMISE_SRC = '/assets/dayframe-essentials-customise.js?v=20260901-customise-v2';", required=False)

for asset in (
    "assets/dayframe-essentials-more.js",
    "assets/dayframe-essentials-clickfix.js",
    "assets/dayframe-essentials-customise.js",
):
    assert_absent(asset, r"Home & Rent|Work & Study|home or rent|work or study|Home and rent|Work and study")

index_path = ROOT / "index.html"
if index_path.exists():
    build = os.environ.get("BUILD_ID", "local")
    index_text = index_path.read_text(encoding="utf-8")
    sector_src = f"/assets/dayframe-sector-themes-current.js?v={build}"
    if "dayframe-sector-themes-current.js" in index_text:
        index_text = re.sub(
            r"/assets/dayframe-sector-themes-current\.js(?:\?v=[^\"']+)?",
            sector_src,
            index_text,
        )
    else:
        sector_tag = f'<script data-dayframe-sector-themes-current-bootstrap src="{sector_src}" defer></script>'
        index_text = index_text.replace("</head>", sector_tag + "\n</head>", 1)
    index_path.write_text(index_text, encoding="utf-8")

print("Dayframe deploy patch applied.")
