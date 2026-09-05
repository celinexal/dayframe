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
        ("#pg-driving .df-car-question{width:max-content!important;max-width:100%!important;margin-top:auto!important;border:1px solid rgba(117,100,242,.13)!important;border-radius:999px!important;background:rgba(255,255,255,.72)!important;color:#4f5b70!important;font-size:11px!important;font-weight:900!important;padding:8px 11px!important}", "#pg-driving .df-car-question{display:inline-flex!important;align-items:center!important;gap:7px!important;width:max-content!important;max-width:100%!important;margin-top:auto!important;border:1px solid rgba(236,72,153,.24)!important;border-radius:999px!important;background:linear-gradient(135deg,rgba(255,242,248,.98),rgba(241,252,250,.92))!important;color:#bd3d76!important;box-shadow:0 10px 24px rgba(236,72,153,.13)!important;font-size:12px!important;font-weight:900!important;padding:9px 13px!important;cursor:pointer!important}#pg-driving .df-car-question::after{content:\"->\";font-size:12px!important;color:#7564f2!important}"),
        ("#pg-driving .df-car-actions{display:flex!important;gap:8px!important;flex-wrap:wrap!important}", "#pg-driving .df-car-actions{display:none!important;gap:8px!important;flex-wrap:wrap!important}"),
        ("if (carQuestion) carQuestion.textContent = 'Still learning?';\n    const theoryButton = page?.querySelector('.df-car-actions button');\n    if (theoryButton) theoryButton.textContent = 'Pass your theory';", "if (carQuestion) {\n      if (carQuestion.textContent.trim() !== 'Still learning?') carQuestion.textContent = 'Still learning?';\n      carQuestion.setAttribute('role', 'button');\n      carQuestion.setAttribute('tabindex', '0');\n      carQuestion.setAttribute('title', 'Open Pass your theory');\n      carQuestion.onclick = (event) => { event.preventDefault(); event.stopPropagation(); if (typeof window.go === 'function') window.go('driving-theory'); };\n      carQuestion.onkeydown = (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); carQuestion.click(); } };\n    }\n    const carActions = page?.querySelector('.df-car-actions');\n    if (carActions) carActions.remove();"),
    ],
    required=False,
)
replace_regex("assets/dayframe-essentials-more.js", r"const VERSION = 'more-v\d+';", "const VERSION = 'more-v13';", required=False)

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
        ("const carQuestion = essentialsPage?.querySelector('.df-car-question');\n    if (carQuestion && carQuestion.textContent.trim() !== 'Still learning?') carQuestion.textContent = 'Still learning?';\n    const carButtons = [...(essentialsPage?.querySelectorAll('.df-car-actions button') || [])];\n    if (carButtons[0] && carButtons[0].textContent.trim() !== 'Pass your theory') carButtons[0].textContent = 'Pass your theory';\n    if (carButtons[1] && carButtons[1].textContent.trim() !== 'Practice questions') carButtons[1].textContent = 'Practice questions';", "const carQuestion = essentialsPage?.querySelector('.df-car-question');\n    if (carQuestion) {\n      if (carQuestion.textContent.trim() !== 'Still learning?') carQuestion.textContent = 'Still learning?';\n      carQuestion.setAttribute('role', 'button');\n      carQuestion.setAttribute('tabindex', '0');\n      carQuestion.setAttribute('title', 'Open Pass your theory');\n      carQuestion.onclick = (event) => { event.preventDefault(); event.stopPropagation(); if (typeof window.go === 'function') window.go('driving-theory'); };\n      carQuestion.onkeydown = (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); carQuestion.click(); } };\n    }\n    const carActions = essentialsPage?.querySelector('.df-car-actions');\n    if (carActions) carActions.remove();"),
        ("document.addEventListener('click', (event) => {\n    const topNavTarget = event.target.closest?.('.df-nav-btn[data-main-page]');", "document.addEventListener('click', (event) => {\n    const stillLearningTarget = event.target.closest?.('#pg-driving .df-car-question');\n    if (stillLearningTarget) {\n      claim(event);\n      if (typeof window.go === 'function') window.go('driving-theory');\n      return;\n    }\n\n    const topNavTarget = event.target.closest?.('.df-nav-btn[data-main-page]');"),
        ("  function openFlo(event) {\n    if (isCustomisingEssentials() && event?.target?.closest?.('#pg-driving .driving-home-grid > .driving-home-card')) {\n      claim(event);\n      return;\n    }\n    claim(event);\n    if (typeof window.dayframeOpenPeriodTracker === 'function') {\n      window.dayframeOpenPeriodTracker(event);\n    }\n  }", "  function openFlo(event) {\n    if (isCustomisingEssentials() && event?.target?.closest?.('#pg-driving .driving-home-grid > .driving-home-card')) {\n      claim(event);\n      return;\n    }\n    claim(event);\n\n    const revealPanel = () => {\n      const panel = document.getElementById('df-period-panel');\n      if (!panel) return false;\n      document.querySelectorAll('.driving-side-nav button').forEach((button) => {\n        button.classList.toggle('on', button.dataset.drivingPage === 'driving-cycle');\n      });\n      panel.hidden = false;\n      panel.removeAttribute('hidden');\n      panel.style.display = '';\n      setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);\n      return true;\n    };\n\n    if (typeof window.dayframeOpenPeriodTracker === 'function') {\n      window.dayframeOpenPeriodTracker(event);\n      return;\n    }\n\n    apply();\n    if (typeof window.dayframeOpenPeriodTracker === 'function') {\n      window.dayframeOpenPeriodTracker();\n      return;\n    }\n    if (revealPanel()) return;\n\n    [100, 350, 900].forEach((delay) => setTimeout(() => {\n      if (typeof window.dayframeOpenPeriodTracker === 'function') window.dayframeOpenPeriodTracker();\n      else revealPanel();\n    }, delay));\n  }"),
        ("  function openFlo(event) {\n    claim(event);\n    if (typeof window.dayframeOpenPeriodTracker === 'function') {\n      window.dayframeOpenPeriodTracker(event);\n    }\n  }", "  function openFlo(event) {\n    claim(event);\n\n    const revealPanel = () => {\n      const panel = document.getElementById('df-period-panel');\n      if (!panel) return false;\n      document.querySelectorAll('.driving-side-nav button').forEach((button) => {\n        button.classList.toggle('on', button.dataset.drivingPage === 'driving-cycle');\n      });\n      panel.hidden = false;\n      panel.removeAttribute('hidden');\n      panel.style.display = '';\n      setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);\n      return true;\n    };\n\n    if (document.querySelector('.pg.on')?.id !== 'pg-driving') forcePage('driving');\n    if (typeof window.dayframeOpenPeriodTracker === 'function') {\n      window.dayframeOpenPeriodTracker(event);\n      return;\n    }\n\n    apply();\n    if (typeof window.dayframeOpenPeriodTracker === 'function') {\n      window.dayframeOpenPeriodTracker();\n      return;\n    }\n    if (revealPanel()) return;\n\n    [100, 350, 900].forEach((delay) => setTimeout(() => {\n      if (typeof window.dayframeOpenPeriodTracker === 'function') window.dayframeOpenPeriodTracker();\n      else revealPanel();\n    }, delay));\n  }"),
    ],
    required=False,
)
replace_all(
    "assets/dayframe-essentials-clickfix.js",
    [
        (
            "  function claim(event) {\n    event?.preventDefault?.();\n    event?.stopPropagation?.();\n    event?.stopImmediatePropagation?.();\n  }\n\n  function openTool(key, event) {\n    if (!TOOL_PAGES[key]) return;\n    claim(event);",
            "  function claim(event) {\n    event?.preventDefault?.();\n    event?.stopPropagation?.();\n    event?.stopImmediatePropagation?.();\n  }\n\n  function closeEssentialsCustomising() {\n    if (typeof window.dayframeCloseEssentialsCustomise === 'function') {\n      window.dayframeCloseEssentialsCustomise();\n      return;\n    }\n    const page = document.getElementById('pg-driving');\n    page?.classList?.remove('df-essentials-customising');\n    page?.setAttribute?.('data-essentials-customising', 'false');\n    const panel = document.getElementById('df-essentials-widget-panel');\n    if (panel) panel.hidden = true;\n  }\n\n  function openTool(key, event) {\n    if (!TOOL_PAGES[key]) return;\n    closeEssentialsCustomising();\n    claim(event);",
        ),
        (
            "  function openPage(name, event) {\n    claim(event);\n    forcePage(name);\n  }",
            "  function openPage(name, event) {\n    closeEssentialsCustomising();\n    claim(event);\n    forcePage(name);\n  }",
        ),
        (
            "  function openFlo(event) {\n    if (isCustomisingEssentials() && event?.target?.closest?.('#pg-driving .driving-home-grid > .driving-home-card')) {\n      claim(event);\n      return;\n    }\n    claim(event);\n\n    const revealPanel = () => {",
            "  function openFlo(event) {\n    closeEssentialsCustomising();\n    claim(event);\n\n    const revealPanel = () => {",
        ),
        (
            "  function openFlo(event) {\n    claim(event);\n\n    const revealPanel = () => {",
            "  function openFlo(event) {\n    closeEssentialsCustomising();\n    claim(event);\n\n    const revealPanel = () => {",
        ),
    ],
    required=False,
)
replace_regex("assets/dayframe-essentials-clickfix.js", r"const VERSION = 'clickfix-v\d+';", "const VERSION = 'clickfix-v22';", required=False)

append_once(
    "assets/dayframe-essentials-clickfix.js",
    "data-dayframe-still-learning-link",
    r"""
(function () {
  const STYLE_ID = 'data-dayframe-still-learning-link';

  function openLearning(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    }
    if (typeof window.go === 'function') window.go('driving-theory');
  }

  function stillLearningTarget(target) {
    return target && typeof target.closest === 'function'
      ? target.closest('#pg-driving .df-car-question')
      : null;
  }

  function applyStillLearningLink() {
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = '#pg-driving .df-car-question{display:inline-flex!important;align-items:center!important;gap:7px!important;width:max-content!important;max-width:100%!important;margin-top:auto!important;border:1px solid rgba(236,72,153,.24)!important;border-radius:999px!important;background:linear-gradient(135deg,rgba(255,242,248,.98),rgba(241,252,250,.92))!important;color:#bd3d76!important;box-shadow:0 10px 24px rgba(236,72,153,.13)!important;font-size:12px!important;font-weight:900!important;padding:9px 13px!important;cursor:pointer!important}#pg-driving .df-car-question::after{content:"->";font-size:12px!important;color:#7564f2!important}#pg-driving .df-car-actions{display:none!important}';
      document.head.appendChild(style);
    }

    const seenCarCards = new Set();
    document.querySelectorAll('#pg-driving .df-car-question').forEach((question) => {
      const carCard = question.closest('.driving-home-card.car') || question.parentElement || question;
      if (seenCarCards.has(carCard)) {
        question.remove();
        return;
      }
      seenCarCards.add(carCard);
      if (question.textContent.trim() !== 'Still learning?') question.textContent = 'Still learning?';
      question.setAttribute('role', 'button');
      question.setAttribute('tabindex', '0');
      question.setAttribute('title', 'Open Pass your theory');
      question.onclick = openLearning;
      question.onkeydown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          question.click();
        }
      };
    });

    document.querySelectorAll('#pg-driving .df-car-actions').forEach((actions) => actions.remove());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyStillLearningLink, { once: true });
  } else {
    applyStillLearningLink();
  }

  if (typeof MutationObserver === 'function' && document.body) {
    new MutationObserver(applyStillLearningLink).observe(document.body, { childList: true, subtree: true });
  }

  if (!window.__dayframeStillLearningCaptureBound) {
    window.__dayframeStillLearningCaptureBound = true;
    document.addEventListener('click', (event) => {
      if (stillLearningTarget(event.target)) openLearning(event);
    }, true);
    document.addEventListener('keydown', (event) => {
      if ((event.key === 'Enter' || event.key === ' ') && stillLearningTarget(event.target)) openLearning(event);
    }, true);
  }

  [100, 400, 1000, 2200].forEach((delay) => setTimeout(applyStillLearningLink, delay));
})();
""",
)

replace_all(
    "assets/dayframe-essentials-customise.js",
    [
        ("label: 'Home & Rent'", "label: 'Home'"),
        ("label: 'Work & Study'", "label: 'Work'"),
        ("desc: 'Shifts, applications, courses and deadlines.'", "desc: 'Shifts, applications, certificates and deadlines.'"),
        ("      suppressCardNavigation(card, editing);", "      suppressCardNavigation(card, false);"),
        ("      if (isCustomising() && event.target.closest?.('#pg-driving .driving-home-grid > .driving-home-card')) {\n        claim(event);\n      }", "      if (isCustomising() && event.target.closest?.('#pg-driving .driving-home-grid > .driving-home-card')) {\n        setCustomising(false);\n      }"),
        ("      if (isCustomising() && DRIVING_SUBPAGES.has(name)) return undefined;\n      return originalGo.apply(this, arguments);", "      if (isCustomising() && DRIVING_SUBPAGES.has(name)) setCustomising(false);\n      return originalGo.apply(this, arguments);"),
    ],
    required=False,
)
replace_regex("assets/dayframe-essentials-customise.js", r"const VERSION = 'customise-v\d+';", "const VERSION = 'customise-v3';", required=False)

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
        ("const DAYFRAME_ESSENTIALS_CLICKFIX_SRC = '/assets/dayframe-essentials-clickfix.js?v=20260831-clickfix-v13';", "const DAYFRAME_ESSENTIALS_CLICKFIX_SRC = '/assets/dayframe-essentials-clickfix.js?v=20260905-medication-reminders-v2';"),
        ("const DAYFRAME_ESSENTIALS_CUSTOMISE_SRC = '/assets/dayframe-essentials-customise.js?v=20260831-customise-v1';", "const DAYFRAME_ESSENTIALS_CUSTOMISE_SRC = '/assets/dayframe-essentials-customise.js?v=20260901-customise-v3';"),
        (".replace(/\\/assets\\/dayframe-essentials\\.js\\?v=[^\"']+/g, DAYFRAME_ESSENTIALS_SRC)\n    .replace(/\\/assets\\/dayframe-essentials-clickfix\\.js\\?v=[^\"']+/g, DAYFRAME_ESSENTIALS_CLICKFIX_SRC)", ".replace(/\\/assets\\/dayframe-essentials\\.js\\?v=[^\"']+/g, DAYFRAME_ESSENTIALS_SRC)\n    .replace(/\\/assets\\/dayframe-essentials-more\\.js\\?v=[^\"']+/g, DAYFRAME_ESSENTIALS_MORE_SRC)\n    .replace(/\\/assets\\/dayframe-essentials-clickfix\\.js\\?v=[^\"']+/g, DAYFRAME_ESSENTIALS_CLICKFIX_SRC)"),
        (".replace(/\\/assets\\/dayframe-myflo-calendar-actions\\.js\\?v=[^\"']+/g, DAYFRAME_MYFLO_CALENDAR_ACTIONS_SRC);", ".replace(/\\/assets\\/dayframe-myflo-calendar-actions\\.js\\?v=[^\"']+/g, DAYFRAME_MYFLO_CALENDAR_ACTIONS_SRC)\n    .replace(/\\/assets\\/dayframe-sector-themes-current\\.js\\?v=[^\"']+/g, DAYFRAME_SECTOR_THEMES_CURRENT_SRC);"),
    ],
    required=False,
)
sw_path = ROOT / "sw.js"
if sw_path.exists():
    sw_text = sw_path.read_text(encoding="utf-8")
    if "const DAYFRAME_ESSENTIALS_MORE_SRC" not in sw_text:
        sw_text = sw_text.replace(
            "const DAYFRAME_ESSENTIALS_PILL_LEFT_SRC = '/assets/dayframe-essentials-pill-left.js?v=20260831-pill-left-v1';",
            "const DAYFRAME_ESSENTIALS_MORE_SRC = '/assets/dayframe-essentials-more.js?v=20260905-document-attachments-v1';\nconst DAYFRAME_ESSENTIALS_PILL_LEFT_SRC = '/assets/dayframe-essentials-pill-left.js?v=20260831-pill-left-v1';",
            1,
        )
        sw_path.write_text(sw_text, encoding="utf-8")
replace_regex("sw.js", r"const DAYFRAME_CACHE\s*=\s*'dayframe-shell-v\d+';", "const DAYFRAME_CACHE = 'dayframe-shell-v102';", required=False)
replace_regex("sw.js", r"const DAYFRAME_SECTOR_THEMES_CURRENT_SRC\s*=\s*'[^']+';", "const DAYFRAME_SECTOR_THEMES_CURRENT_SRC = '/assets/dayframe-sector-themes-current.js?v=20260901-sector-clarity-v1';", required=False)
replace_regex("sw.js", r"const DAYFRAME_ESSENTIALS_MORE_SRC\s*=\s*'[^']+';", "const DAYFRAME_ESSENTIALS_MORE_SRC = '/assets/dayframe-essentials-more.js?v=20260905-document-attachments-v1';", required=False)
replace_regex("sw.js", r"const DAYFRAME_ESSENTIALS_CLICKFIX_SRC\s*=\s*'[^']+';", "const DAYFRAME_ESSENTIALS_CLICKFIX_SRC = '/assets/dayframe-essentials-clickfix.js?v=20260905-medication-reminders-v2';", required=False)
replace_regex("sw.js", r"const DAYFRAME_ESSENTIALS_CUSTOMISE_SRC\s*=\s*'[^']+';", "const DAYFRAME_ESSENTIALS_CUSTOMISE_SRC = '/assets/dayframe-essentials-customise.js?v=20260901-customise-v3';", required=False)
append_once(
    "sw.js",
    "data-dayframe-skip-waiting-handler-v1",
    r"""
self.addEventListener('message', event => {
  const data = event.data || {};
  if (data && data.type === 'DAYFRAME_SKIP_WAITING') self.skipWaiting();
});
""",
)

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
    update_marker = "data-dayframe-update-manager"
    update_version = repr(build)
    index_text = re.sub(r"\n?<style id=\"df-update-manager-style\">[\s\S]*?</style>\s*<script data-dayframe-update-manager[\s\S]*?</script>", "", index_text)
    update_block = f"""
<style id="df-update-manager-style">
#df-app-update{{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:-8px 0 18px;padding:12px 14px;border:1px solid rgba(117,100,242,.16);border-radius:18px;background:linear-gradient(135deg,rgba(255,255,255,.98),rgba(255,243,250,.95));box-shadow:0 10px 26px rgba(31,37,68,.08);font-family:var(--ff,'Plus Jakarta Sans',system-ui,sans-serif);color:#151b2d}}
#df-app-update strong{{display:block;font-size:13px;font-weight:900;line-height:1.2}}
#df-app-update span{{display:block;margin-top:2px;color:#718096;font-size:12px;font-weight:700;line-height:1.35}}
#df-app-update button{{border:0;border-radius:999px;font:inherit;font-size:12px;font-weight:900;cursor:pointer;white-space:nowrap}}
#df-app-update .df-app-update-refresh{{padding:10px 14px;background:linear-gradient(135deg,#7564f2,#ec5aa6);color:#fff;box-shadow:0 10px 20px rgba(117,100,242,.22)}}
#df-app-update .df-app-update-later{{padding:9px 11px;background:#f7f4ff;color:#6d60e8}}
@media (max-width:560px){{#df-app-update{{margin:0 0 14px;align-items:flex-start;display:grid;grid-template-columns:1fr auto auto}}}}
</style>
<script {update_marker}={update_version}>
(() => {{
  'use strict';
  if (!('serviceWorker' in navigator)) return;
  const VERSION = {update_version};
  const FLAG = 'data-dayframe-update-manager';
  if (document.documentElement.getAttribute(FLAG) === VERSION) return;
  document.documentElement.setAttribute(FLAG, VERSION);
  let registration = null;
  let updateReady = false;
  let dismissed = false;
  let refreshing = false;

  function removePrompt() {{
    const node = document.getElementById('df-app-update');
    if (node) node.remove();
  }}

  function isHomeActive() {{
    return document.getElementById('pg-home')?.classList.contains('on') ||
      document.querySelector('.pg.on')?.id === 'pg-home';
  }}

  function updateMount() {{
    const home = document.getElementById('pg-home');
    if (!home) return null;
    return home.querySelector('.hub-shell') || home;
  }}

  function placePrompt(node) {{
    const mount = updateMount();
    if (!mount) return false;
    const topbar = mount.querySelector('.hub-topbar');
    if (topbar?.parentNode === mount) topbar.insertAdjacentElement('afterend', node);
    else mount.insertAdjacentElement('afterbegin', node);
    return true;
  }}

  function showUpdatePrompt(reg) {{
    updateReady = true;
    registration = reg || registration;
    if (dismissed || !isHomeActive()) {{
      removePrompt();
      return;
    }}
    if (document.getElementById('df-app-update')) return;
    const bar = document.createElement('div');
    bar.id = 'df-app-update';
    bar.setAttribute('role', 'status');
    bar.innerHTML = '<div><strong>Update ready</strong><span>Refresh Dayframe for the newest fixes.</span></div><button type="button" class="df-app-update-refresh">Update</button><button type="button" class="df-app-update-later">Later</button>';
    bar.querySelector('.df-app-update-refresh')?.addEventListener('click', () => {{
      try {{ sessionStorage.setItem('dayframe_update_reload', VERSION); }} catch {{}}
      const waiting = reg?.waiting || registration?.waiting;
      if (waiting) waiting.postMessage({{ type: 'DAYFRAME_SKIP_WAITING' }});
      setTimeout(() => window.location.reload(), 180);
    }});
    bar.querySelector('.df-app-update-later')?.addEventListener('click', removePrompt);
    bar.querySelector('.df-app-update-later')?.addEventListener('click', () => {{ dismissed = true; }});
    if (!placePrompt(bar)) {{
      bar.remove();
    }}
  }}

  function renderUpdatePrompt() {{
    if (!updateReady || dismissed || !isHomeActive()) {{
      removePrompt();
      return;
    }}
    const existing = document.getElementById('df-app-update');
    if (existing) placePrompt(existing);
    else showUpdatePrompt(registration);
  }}

  function watchRegistration(reg) {{
    registration = reg;
    if (reg.waiting && navigator.serviceWorker.controller) showUpdatePrompt(reg);
    reg.addEventListener('updatefound', () => {{
      const worker = reg.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {{
        if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdatePrompt(reg);
      }});
    }});
  }}

  navigator.serviceWorker.addEventListener('controllerchange', () => {{
    if (refreshing) return;
    refreshing = true;
    let requested = false;
    try {{
      requested = sessionStorage.getItem('dayframe_update_reload') === VERSION;
      if (requested) sessionStorage.removeItem('dayframe_update_reload');
    }} catch {{}}
    if (requested) {{
      window.location.reload();
      return;
    }}
    showUpdatePrompt(registration);
  }});

  window.dayframeCheckForUpdate = async function dayframeCheckForUpdate() {{
    try {{
      const reg = registration || await navigator.serviceWorker.ready;
      await reg.update();
      if (reg.waiting) showUpdatePrompt(reg);
    }} catch {{}}
  }};

  window.addEventListener('load', async () => {{
    try {{
      const reg = await navigator.serviceWorker.register('/sw.js', {{ updateViaCache: 'none' }});
      watchRegistration(reg);
      setTimeout(() => reg.update().catch(() => {{}}), 1200);
      setInterval(() => reg.update().catch(() => {{}}), 30 * 60 * 1000);
    }} catch {{}}
  }});
  document.addEventListener('click', () => setTimeout(renderUpdatePrompt, 80), true);
  if (typeof MutationObserver === 'function' && document.body) {{
    new MutationObserver(renderUpdatePrompt).observe(document.body, {{ attributes: true, attributeFilter: ['class'], subtree: true }});
  }}
}})();
</script>"""
    if "</body>" in index_text:
        index_text = index_text.replace("</body>", update_block + "\n</body>", 1)
    else:
        index_text = index_text.rstrip() + update_block + "\n"
    index_path.write_text(index_text, encoding="utf-8")

print("Dayframe deploy patch applied.")
