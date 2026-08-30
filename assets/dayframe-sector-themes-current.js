(() => {
  'use strict';

  const FLAG = 'data-dayframe-sector-themes-current';
  if (document.documentElement.hasAttribute(FLAG)) return;
  document.documentElement.setAttribute(FLAG, 'true');

  const AS_OF = '30 Aug 2026';

  const SOURCES = {
    iea: {
      org: 'IEA',
      title: 'Key Questions on Energy and AI',
      url: 'https://www.iea.org/reports/key-questions-on-energy-and-ai/executive-summary?_bhlid=10646f272364cf3af59c0fa8f3886b1cfe01e627',
      note: 'Data centre electricity demand roughly doubles from 2025 to 2030, with AI-focused centres growing faster.',
    },
    nvidiaRubin: {
      org: 'NVIDIA',
      title: 'Rubin platform and Spectrum-X Ethernet Photonics',
      url: 'https://nvidianews.nvidia.com/news/rubin-platform-ai-supercomputer',
      note: 'Rubin is in full production, partner systems are expected in H2 2026, and Spectrum-X photonics targets efficiency and uptime.',
    },
    broadcomOfc: {
      org: 'Broadcom',
      title: 'OFC 2026 AI infrastructure portfolio',
      url: 'https://investors.broadcom.com/news-releases/news-release-details/broadcom-showcases-industry-leading-solutions-scaling-ai',
      note: 'Broadcom highlighted 102.4T Ethernet switching with CPO, 400G/lane optical DSPs and advanced XPU packaging.',
    },
    broadcomQ2: {
      org: 'Broadcom',
      title: 'Q2 FY2026 results',
      url: 'https://investors.broadcom.com/news-releases/news-release-details/broadcom-inc-announces-second-quarter-fiscal-year-2026-financial',
      note: 'AI semiconductor revenue was a major growth driver, led by custom accelerators and networking.',
    },
    micronQ3: {
      org: 'Micron',
      title: 'Q3 FY2026 results',
      url: 'https://investors.micron.com/news/press-release/2026/Micron-Technology-Inc--Reports-Record-Results-for-the-Third-Quarter-of-Fiscal-2026/default.aspx',
      note: 'Micron reported record results and discussed HBM4 shipments and HBM4E development.',
    },
    tsmcQ2: {
      org: 'TSMC',
      title: 'Q2 2026 quarterly results',
      url: 'https://investor.tsmc.com/english/quarterly-results/2026/q2',
      note: 'TSMC guidance and high-performance computing demand keep advanced nodes and packaging central to the AI buildout.',
    },
    tsmcRevenue: {
      org: 'TSMC',
      title: '2026 monthly revenue',
      url: 'https://investor.tsmc.com/english/monthly-revenue/2026',
      note: 'Monthly revenue keeps giving a live read on AI and advanced-node demand.',
    },
    coherentOfc: {
      org: 'Coherent',
      title: 'CPO technologies at OFC 2026',
      url: 'https://www.coherent.com/news/press-releases/coherent-co-packaged-optics-cpo-technologies-ofc-2026',
      note: 'Coherent showed several CPO approaches, including InP lasers, silicon photonics and VCSEL architectures.',
    },
    lumentumOfc: {
      org: 'Lumentum',
      title: 'OFC 2026 optical infrastructure takeaways',
      url: 'https://www.lumentum.com/en/blog/enabling-next-phase-ai-optical-infrastructure',
      note: 'OFC pointed to bandwidth, power, thermal efficiency, reliability, manufacturability and supply-chain resilience.',
    },
    lumentumReliability: {
      org: 'Lumentum',
      title: 'CPO reliability and external lasers',
      url: 'https://www.lumentum.com/en/blog/reliability-becomes-new-currency-how-cpo-rewriting-laser-performance',
      note: 'CPO is not just bandwidth; power efficiency, uptime and laser reliability become part of the investment question.',
    },
    gevQ2: {
      org: 'GE Vernova',
      title: 'Q2 2026 results',
      url: 'https://www.sec.gov/Archives/edgar/data/1996810/000199681026000147/gevpressrelease2q26.htm',
      note: 'Orders, backlog and data-centre demand show power equipment is an active bottleneck.',
    },
    vertivQ2: {
      org: 'Vertiv',
      title: 'Q2 2026 results',
      url: 'https://www.sec.gov/Archives/edgar/data/1674101/000162828026050323/q22026exhibit991vrt07292026.htm',
      note: 'Power and thermal management demand remains tied to high-density AI data centres.',
    },
    usgsGallium: {
      org: 'USGS',
      title: 'Gallium and germanium supply disruption study',
      url: 'https://www.usgs.gov/news/national-news-release/usgs-critical-minerals-study-bans-gallium-and-germanium-exports-could',
      note: 'Gallium and germanium supply risk matters because they feed high-tech and semiconductor supply chains.',
    },
    rklbQ2: {
      org: 'Rocket Lab',
      title: 'Q2 2026 results',
      url: 'https://www.sec.gov/Archives/edgar/data/1819994/000181999426000061/rklb-08102026ex991.htm',
      note: 'Rocket Lab reported record revenue, record backlog, acquisitions and Neutron progress.',
    },
    astsQ2: {
      org: 'AST SpaceMobile',
      title: 'Q2 2026 Form 10-Q',
      url: 'https://www.sec.gov/Archives/edgar/data/1780312/000119312526342550/asts-20260630.htm',
      note: 'ASTS disclosed recent BlueBird launches, BB7 de-orbit risk, and Block 2 capacity details.',
    },
  };

  const THEMES = [
    {
      name: 'AI power, grid and cooling',
      tag: 'Active bottleneck',
      tone: 'power',
      oneLine: 'The AI buildout is now limited by electricity, grid gear, backup power and thermal systems as much as by chips.',
      changed: 'The IEA points to data-centre electricity demand roughly doubling by 2030, while GE Vernova and Vertiv reported strong data-centre-linked orders in 2026.',
      checks: ['Data-centre power contracts', 'interconnection delays', 'cooling backlog', 'gas turbine and grid equipment lead times'],
      examples: ['GEV', 'VRT', 'ETN', 'PWR', 'CEG', 'VST', 'OKLO'],
      risk: 'Orders can be real while revenue arrives slowly. Permitting, grid queues, high valuations and capex pauses can all break the story.',
      sources: ['iea', 'gevQ2', 'vertivQ2'],
    },
    {
      name: 'AI networking and optical I/O',
      tag: '2026 buildout',
      tone: 'optics',
      oneLine: 'As AI clusters get bigger, moving data between chips becomes a constraint. CPO, external lasers, silicon photonics and optical switching are the moving parts.',
      changed: 'NVIDIA, Broadcom, Coherent and Lumentum all showed 2026 progress around CPO, 1.6T/200G optics, 400G/lane roadmaps, reliability and manufacturability.',
      checks: ['CPO design wins', 'external laser supply', '400G/lane progress', 'optical circuit switching', 'thermal and uptime claims'],
      examples: ['NVDA', 'AVGO', 'MRVL', 'COHR', 'LITE', 'AAOI', 'AXTI', 'SIVE'],
      risk: 'CPO may ramp slower than hype, designs may choose different architectures, and smaller suppliers can be exposed to customer concentration or funding needs.',
      sources: ['nvidiaRubin', 'broadcomOfc', 'coherentOfc', 'lumentumOfc', 'lumentumReliability'],
    },
    {
      name: 'HBM, memory and AI storage',
      tag: 'Tight supply',
      tone: 'memory',
      oneLine: 'AI servers need very high memory bandwidth and huge storage. HBM, NAND and enterprise SSD demand are still a core part of the supply chain.',
      changed: 'Micron reported record results and discussed HBM4 shipments plus HBM4E development, keeping memory on the bottleneck list rather than just a chip-cycle story.',
      checks: ['HBM capacity', 'HBM4/HBM4E timelines', 'contract pricing', 'NAND recovery', 'inventory building or demand slowdown'],
      examples: ['MU', 'SNDK', 'WDC', 'Samsung', 'SK Hynix'],
      risk: 'Memory is cyclical. The same tight-supply setup that helps margins can reverse quickly if AI orders slow or capacity comes online together.',
      sources: ['micronQ3'],
    },
    {
      name: 'Custom AI silicon and advanced packaging',
      tag: 'Hyperscaler push',
      tone: 'custom',
      oneLine: 'Cloud companies want more custom accelerators to reduce cost and dependency. That keeps TSMC, packaging, EDA and networking suppliers in focus.',
      changed: 'Broadcom reported AI semiconductor growth from custom accelerators and networking, while TSMC revenue/guidance keeps showing high-performance computing demand.',
      checks: ['custom accelerator wins', 'CoWoS and advanced packaging capacity', 'TSMC monthly revenue', 'EDA demand', 'networking attach rate'],
      examples: ['AVGO', 'MRVL', 'TSM', 'ASML', 'AMAT', 'LRCX', 'CDNS', 'SNPS'],
      risk: 'Custom chips take time, can miss performance targets, and still depend on NVIDIA-style software ecosystems and TSMC packaging capacity.',
      sources: ['broadcomQ2', 'broadcomOfc', 'tsmcQ2', 'tsmcRevenue'],
    },
    {
      name: 'Critical materials and supply-chain control',
      tag: 'Supply risk',
      tone: 'materials',
      oneLine: 'The AI, defence and photonics chains still depend on small material markets where supply can be concentrated and politically sensitive.',
      changed: 'USGS analysis shows how gallium and germanium restrictions can ripple into semiconductors and high-tech manufacturing. For photonics, InP-related supply still deserves attention.',
      checks: ['export controls', 'non-China supply projects', 'substrate availability', 'recycling and inventories', 'defence demand'],
      examples: ['AXTI', 'USAR', 'MP', 'UUUU', 'CCJ'],
      risk: 'Materials names can be extremely volatile. A good theme can still lose money if the company is small, unprofitable or diluted.',
      sources: ['usgsGallium', 'coherentOfc', 'lumentumOfc'],
    },
    {
      name: 'Space connectivity and launch',
      tag: 'Execution watch',
      tone: 'space',
      oneLine: 'The space theme is shifting from hype to execution: backlog, launch cadence, satellite deployment and real services matter more than story alone.',
      changed: 'Rocket Lab reported record revenue/backlog and Neutron progress. ASTS disclosed new BlueBird launches, but also showed launch/orbit risk with BB7.',
      checks: ['launch cadence', 'Neutron timing', 'satellite deployment', 'cash burn', 'commercial subscriber/service milestones'],
      examples: ['RKLB', 'ASTS', 'IRDM', 'PL'],
      risk: 'Space timelines slip, launch failures happen, and many companies need outside capital before their network or vehicle is proven at scale.',
      sources: ['rklbQ2', 'astsQ2'],
    },
  ];

  const WATCH_POINTS = [
    {
      title: 'Power is the clearest bottleneck to keep checking',
      detail: 'Track utility interconnection news, data-centre power agreements, Vertiv orders, GE Vernova backlog and any sign that hyperscaler capex is being delayed by electricity access.',
      sources: ['iea', 'gevQ2', 'vertivQ2'],
    },
    {
      title: 'Optics is moving from story to implementation',
      detail: 'The useful question is no longer simply "will CPO happen?" It is which architecture wins, who supplies lasers/modulators/substrates, and whether reliability data supports deployment.',
      sources: ['nvidiaRubin', 'broadcomOfc', 'coherentOfc', 'lumentumReliability'],
    },
    {
      title: 'Memory is still strong, but watch the cycle',
      detail: 'HBM demand can stay tight while ordinary memory remains cyclical. Keep checking pricing, capacity additions and whether customers are signing long-term supply agreements.',
      sources: ['micronQ3'],
    },
    {
      title: 'Custom silicon keeps widening the AI supply chain',
      detail: 'Broadcom, Marvell, TSMC and EDA suppliers matter because hyperscalers want custom chips, but execution and software support decide how much share shifts from general GPUs.',
      sources: ['broadcomQ2', 'tsmcQ2'],
    },
    {
      title: 'Space is now milestone-led',
      detail: 'For space names, the trigger is less social-media excitement and more hard evidence: launch cadence, backlog quality, satellite deployment, service revenue and cash runway.',
      sources: ['rklbQ2', 'astsQ2'],
    },
  ];

  const SUPPLY_CHAIN = [
    { step: 'Demand', detail: 'AI labs and cloud providers keep asking for more training and inference capacity.', sources: ['nvidiaRubin'] },
    { step: 'Compute', detail: 'GPUs and custom accelerators create demand for foundry, packaging, networking and power.', sources: ['broadcomQ2', 'tsmcQ2'] },
    { step: 'Memory', detail: 'HBM and high-capacity storage decide how efficiently accelerators can be used.', sources: ['micronQ3'] },
    { step: 'Networking', detail: 'CPO, external lasers and optical switching become more important as clusters scale.', sources: ['broadcomOfc', 'coherentOfc', 'lumentumOfc'] },
    { step: 'Power and cooling', detail: 'Electricity, thermal systems and grid equipment become the physical limiter.', sources: ['iea', 'gevQ2', 'vertivQ2'] },
    { step: 'Materials', detail: 'Small mineral and substrate markets can create supply shocks far upstream.', sources: ['usgsGallium'] },
  ];

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));

  function style() {
    if (document.getElementById('df-sector-themes-current-style')) return;
    const tag = document.createElement('style');
    tag.id = 'df-sector-themes-current-style';
    tag.textContent = `
      .df-theme-shell{padding:4px 0 30px;color:var(--tx,#171f33)}
      .df-theme-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:end;margin-bottom:16px;padding:20px;border:1px solid #e6eaf3;border-radius:18px;background:linear-gradient(135deg,#fff 0%,#fbf7ff 46%,#f5fffb 100%);box-shadow:0 18px 45px rgba(29,36,58,.08)}
      .df-theme-kicker{display:inline-flex;align-items:center;gap:6px;margin-bottom:8px;font-size:11px;font-weight:850;text-transform:uppercase;color:#7d6af2}
      .df-theme-kicker i{width:7px;height:7px;border-radius:50%;background:#40c6b8}
      .df-theme-hero h1{font-size:clamp(27px,3vw,42px);line-height:1.05;margin:0 0 9px;font-weight:900;color:#171f33}
      .df-theme-hero p{max-width:780px;margin:0;color:var(--t2,#687389);font-size:14px;line-height:1.7}
      .df-theme-date{min-width:190px;border:1px solid #e7ddff;border-radius:16px;background:rgba(255,255,255,.78);padding:14px;box-shadow:0 10px 24px rgba(106,91,232,.08)}
      .df-theme-date span{display:block;font-size:10px;font-weight:850;text-transform:uppercase;color:#8790a5;margin-bottom:5px}
      .df-theme-date strong{font-size:16px;color:#171f33}
      .df-theme-date small{display:block;margin-top:6px;font-size:11px;line-height:1.45;color:#687389}
      .df-theme-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .df-theme-card{position:relative;overflow:hidden;border:1px solid #e6eaf3;border-radius:16px;background:rgba(255,255,255,.88);box-shadow:0 14px 34px rgba(29,36,58,.06);padding:16px}
      .df-theme-card:before{content:"";position:absolute;inset:0 0 auto 0;height:4px;background:linear-gradient(90deg,var(--df-theme-a,#7c6cf2),var(--df-theme-b,#40c6b8));}
      .df-theme-card.power{--df-theme-a:#7c6cf2;--df-theme-b:#44c7b0}
      .df-theme-card.optics{--df-theme-a:#4f8cff;--df-theme-b:#f06aa8}
      .df-theme-card.memory{--df-theme-a:#7c6cf2;--df-theme-b:#ffcc4d}
      .df-theme-card.custom{--df-theme-a:#3fc6b8;--df-theme-b:#6f8cff}
      .df-theme-card.materials{--df-theme-a:#ff9b5f;--df-theme-b:#f06aa8}
      .df-theme-card.space{--df-theme-a:#6f8cff;--df-theme-b:#40c6b8}
      .df-theme-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-top:3px;margin-bottom:9px}
      .df-theme-card h2{font-size:18px;line-height:1.22;margin:0;font-weight:900;color:#171f33}
      .df-theme-tag{display:inline-flex;white-space:nowrap;border:1px solid color-mix(in srgb,var(--df-theme-b,#40c6b8) 38%,#fff);background:color-mix(in srgb,var(--df-theme-b,#40c6b8) 12%,#fff);color:#243044;border-radius:999px;padding:5px 9px;font-size:10.5px;font-weight:850}
      .df-theme-line{font-size:13px;color:#596579;line-height:1.68;margin:0 0 11px}
      .df-theme-box{border:1px solid #edf0f6;border-radius:12px;background:#fbfcff;padding:10px 11px;margin:10px 0}
      .df-theme-label{font-size:10px;font-weight:900;text-transform:uppercase;color:#8790a5;margin-bottom:5px}
      .df-theme-box p{margin:0;font-size:12.5px;line-height:1.62;color:#596579}
      .df-theme-checks{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
      .df-theme-checks span{border:1px solid #e6eaf3;background:#fff;border-radius:999px;padding:5px 8px;font-size:10.5px;font-weight:750;color:#667085}
      .df-theme-tickers{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}
      .df-theme-ticker{display:inline-flex;align-items:center;gap:5px;border:1px solid #dfe4ee;background:#fff;color:#354158;border-radius:999px;padding:6px 9px;font-size:11px;font-weight:850;cursor:pointer}
      .df-theme-ticker.owned{border-color:#7ad6bd;background:#effbf7;color:#166b59}
      .df-theme-ticker.watch{border-color:#b9c3ff;background:#f4f2ff;color:#6353d9}
      .df-theme-ticker b{font-size:9px;font-weight:900;text-transform:uppercase;color:inherit}
      .df-theme-risk{margin-top:10px;padding:10px 11px;border-radius:12px;background:#fff7f9;border:1px solid #ffd6e4;color:#785263;font-size:12.3px;line-height:1.62}
      .df-theme-sources{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
      .df-theme-source{display:inline-flex;align-items:center;border:1px solid #e3e6ff;background:#f8f7ff;color:#6658d8;border-radius:999px;padding:5px 8px;font-size:10.5px;font-weight:800;text-decoration:none}
      .df-theme-source:hover{text-decoration:underline}
      .df-theme-disclaimer{margin-top:14px;border:1px solid #e9edf5;border-radius:16px;background:rgba(255,255,255,.8);padding:13px 15px;color:#687389;font-size:12px;line-height:1.65}
      .df-theme-watch-panel{margin-top:14px;border:1px solid #e6eaf3;border-radius:16px;background:#fff;box-shadow:0 14px 34px rgba(29,36,58,.05);padding:16px}
      .df-theme-watch-panel h2{font-size:19px;margin:0 0 10px;color:#171f33}
      .df-theme-watch-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .df-theme-watch-item{border:1px solid #edf0f6;border-radius:13px;background:#fbfcff;padding:12px}
      .df-theme-watch-item strong{display:block;color:#171f33;font-size:13.5px;margin-bottom:5px}
      .df-theme-watch-item p{margin:0;color:#596579;font-size:12.5px;line-height:1.6}
      .df-theme-chain{display:grid;gap:8px}
      .df-theme-chain-row{display:grid;grid-template-columns:120px minmax(0,1fr);gap:10px;align-items:flex-start;border-bottom:1px solid #edf0f6;padding:10px 0}
      .df-theme-chain-row:last-child{border-bottom:0}
      .df-theme-chain-step{font-size:12px;font-weight:900;color:#171f33}
      .df-theme-chain-detail{font-size:12.5px;color:#596579;line-height:1.58}
      .df-theme-radar{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
      .df-theme-radar-card{border:1px solid #e6eaf3;border-radius:13px;background:#fff;padding:12px}
      .df-theme-radar-card strong{display:block;font-size:13px;color:#171f33;margin-bottom:5px}
      .df-theme-radar-card p{font-size:11.5px;line-height:1.55;color:#596579;margin:0 0 8px}
      @media (max-width:900px){
        .df-theme-grid,.df-theme-watch-list,.df-theme-radar{grid-template-columns:1fr}
        .df-theme-hero{grid-template-columns:1fr;padding:17px}
        .df-theme-date{min-width:0}
      }
      @media (max-width:560px){
        .df-theme-card{padding:14px}
        .df-theme-card-top{display:block}
        .df-theme-tag{margin-top:8px}
        .df-theme-chain-row{grid-template-columns:1fr;gap:4px}
        .df-theme-hero h1{font-size:30px}
      }
    `;
    document.head.appendChild(tag);
  }

  function normaliseTicker(value) {
    return String(value || '')
      .toUpperCase()
      .replace(/\s+\(.+\)$/g, '')
      .replace(/[^A-Z0-9.]/g, '');
  }

  function holdings() {
    return Array.isArray(globalThis.H) ? globalThis.H : [];
  }

  function watchlist() {
    return Array.isArray(globalThis.WL) ? globalThis.WL : [];
  }

  function isOwned(label) {
    const key = normaliseTicker(label);
    return holdings().some((item) => {
      const ticker = normaliseTicker(item?.ticker);
      const name = String(item?.name || '').toUpperCase();
      return ticker === key || ticker.split('.')[0] === key.split('.')[0] || (key.length > 3 && name.includes(key));
    });
  }

  function isWatch(label) {
    const key = normaliseTicker(label);
    return watchlist().some((item) => {
      const ticker = normaliseTicker(item);
      return ticker === key || ticker.split('.')[0] === key.split('.')[0];
    });
  }

  function tickerMarkup(label) {
    const owned = isOwned(label);
    const watch = !owned && isWatch(label);
    const cls = owned ? ' owned' : watch ? ' watch' : '';
    const suffix = owned ? '<b>Owned</b>' : watch ? '<b>Watch</b>' : '';
    const actionTicker = normaliseTicker(label).replace(/\.(KS|L|ST|PA|DE)$/i, '');
    return `<span class="df-theme-ticker${cls}" data-open-chart="${esc(actionTicker)}">${esc(label)}${suffix}</span>`;
  }

  function sourceMarkup(ids) {
    return ids
      .map((id) => SOURCES[id])
      .filter(Boolean)
      .map((source) => `<a class="df-theme-source" href="${esc(source.url)}" target="_blank" rel="noopener">${esc(source.org)}</a>`)
      .join('');
  }

  function themeCard(theme) {
    return `
      <article class="df-theme-card ${esc(theme.tone)}">
        <div class="df-theme-card-top">
          <h2>${esc(theme.name)}</h2>
          <span class="df-theme-tag">${esc(theme.tag)}</span>
        </div>
        <p class="df-theme-line">${esc(theme.oneLine)}</p>
        <div class="df-theme-box">
          <div class="df-theme-label">What changed</div>
          <p>${esc(theme.changed)}</p>
        </div>
        <div class="df-theme-label">Next checks</div>
        <div class="df-theme-checks">${theme.checks.map((item) => `<span>${esc(item)}</span>`).join('')}</div>
        <div class="df-theme-label" style="margin-top:12px">Research examples</div>
        <div class="df-theme-tickers">${theme.examples.map(tickerMarkup).join('')}</div>
        <div class="df-theme-risk"><strong>Risk to keep honest:</strong> ${esc(theme.risk)}</div>
        <div class="df-theme-sources">${sourceMarkup(theme.sources)}</div>
      </article>
    `;
  }

  function renderThemesHub() {
    const page = document.getElementById('pg-themes-hub');
    if (!page) return;
    page.innerHTML = `
      <div class="df-theme-shell">
        <section class="df-theme-hero">
          <div>
            <div class="df-theme-kicker"><i></i>Investing research</div>
            <h1>Sector themes, updated for what is moving now.</h1>
            <p>Use this as a current briefing: what the bottleneck is, what changed, what to check next, and which names are examples to research. It is educational context, not a buy or sell instruction.</p>
          </div>
          <aside class="df-theme-date">
            <span>Last refreshed</span>
            <strong>${AS_OF}</strong>
            <small>Source-backed theme notes. Tap source pills to verify the original material.</small>
          </aside>
        </section>
        <div class="df-theme-grid">${THEMES.map(themeCard).join('')}</div>
        <section class="df-theme-watch-panel">
          <h2>What to keep checking</h2>
          <div class="df-theme-watch-list">
            ${WATCH_POINTS.map((item) => `
              <div class="df-theme-watch-item">
                <strong>${esc(item.title)}</strong>
                <p>${esc(item.detail)}</p>
                <div class="df-theme-sources">${sourceMarkup(item.sources)}</div>
              </div>
            `).join('')}
          </div>
        </section>
        <div class="df-theme-disclaimer">Dayframe shows theme research to help users ask better questions. Prices, valuations, personal goals and risk tolerance still matter. Verify current filings, earnings and primary sources before acting.</div>
      </div>
    `;
  }

  function renderThemeRadar() {
    const el = document.getElementById('theme-radar');
    if (!el) return;
    el.innerHTML = `
      <div class="df-theme-date" style="margin-bottom:10px;max-width:none">
        <span>Theme radar</span>
        <strong>Updated ${AS_OF}</strong>
        <small>Examples are for research. Owned and watchlist badges use your current local portfolio state.</small>
      </div>
      <div class="df-theme-radar">
        ${THEMES.slice(0, 6).map((theme) => `
          <div class="df-theme-radar-card">
            <strong>${esc(theme.name)}</strong>
            <p>${esc(theme.oneLine)}</p>
            <div class="df-theme-tickers">${theme.examples.slice(0, 5).map(tickerMarkup).join('')}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderConfCalendar() {
    const el = document.getElementById('conf-calendar');
    if (!el) return;
    el.innerHTML = WATCH_POINTS.map((item) => `
      <div class="conf-item" style="display:block;padding:14px 16px;border-bottom:1px solid var(--bd,#e6eaf3)">
        <div class="conf-name">${esc(item.title)}</div>
        <div class="conf-desc" style="margin-top:5px">${esc(item.detail)}</div>
        <div class="df-theme-sources">${sourceMarkup(item.sources)}</div>
      </div>
    `).join('');
  }

  function renderSupplyMap() {
    const el = document.getElementById('supply-map');
    if (!el) return;
    el.innerHTML = `<div class="df-theme-chain">${SUPPLY_CHAIN.map((item) => `
      <div class="df-theme-chain-row">
        <div class="df-theme-chain-step">${esc(item.step)}</div>
        <div>
          <div class="df-theme-chain-detail">${esc(item.detail)}</div>
          <div class="df-theme-sources">${sourceMarkup(item.sources)}</div>
        </div>
      </div>
    `).join('')}</div>`;
  }

  function renderEarlySources() {
    const el = document.getElementById('early-sources');
    if (!el) return;
    const ids = ['iea', 'nvidiaRubin', 'broadcomOfc', 'broadcomQ2', 'micronQ3', 'tsmcQ2', 'coherentOfc', 'lumentumOfc', 'gevQ2', 'vertivQ2', 'usgsGallium', 'rklbQ2', 'astsQ2'];
    el.innerHTML = ids.map((id) => {
      const source = SOURCES[id];
      return `
        <div style="padding:11px 0;border-bottom:1px solid var(--bd,#e6eaf3)">
          <a href="${esc(source.url)}" target="_blank" rel="noopener" style="font-size:13px;font-weight:800;color:var(--bl,#6c5ce7);text-decoration:none">${esc(source.org)} - ${esc(source.title)}</a>
          <div style="font-size:12px;color:var(--t2,#596579);line-height:1.6;margin-top:4px">${esc(source.note)}</div>
        </div>
      `;
    }).join('');
  }

  function runIntelScan() {
    const out = document.getElementById('intel-scan-out');
    const btn = document.getElementById('intel-scan-btn');
    const spin = document.getElementById('intel-spin');
    if (btn) btn.disabled = false;
    if (spin) spin.style.display = 'none';
    if (!out) return;
    out.innerHTML = `
      <div class="df-theme-watch-panel" style="margin-top:0">
        <h2>Current theme briefing</h2>
        <div class="df-theme-watch-list">
          ${WATCH_POINTS.map((item) => `
            <div class="df-theme-watch-item">
              <strong>${esc(item.title)}</strong>
              <p>${esc(item.detail)}</p>
              <div class="df-theme-sources">${sourceMarkup(item.sources)}</div>
            </div>
          `).join('')}
        </div>
        <div class="df-theme-disclaimer">Refreshed ${AS_OF}. This is a source-backed briefing, not a personal recommendation.</div>
      </div>
    `;
  }

  function openTicker(label) {
    const ticker = normaliseTicker(label);
    if (!ticker) return;
    try {
      if (holdings().some((item) => normaliseTicker(item?.ticker).split('.')[0] === ticker.split('.')[0]) && typeof globalThis.openChart === 'function') {
        globalThis.openChart(ticker);
        return;
      }
      if (typeof globalThis.openChartResearch === 'function') {
        globalThis.openChartResearch(ticker);
      }
    } catch {}
  }

  function patchGo() {
    if (globalThis.__dayframeCurrentThemesGoPatched || typeof globalThis.go !== 'function') return;
    const oldPages = new Set(['dive-datacentre', 'dive-photonics', 'dive-memory', 'dive-spacedata', 'dive-defence', 'dive-energy', 'dive-health', 'dive-materials']);
    const originalGo = globalThis.go;
    globalThis.go = function patchedGo(pageName, ...rest) {
      if (oldPages.has(String(pageName))) {
        renderThemesHub();
        return originalGo.call(this, 'themes-hub', ...rest);
      }
      const result = originalGo.call(this, pageName, ...rest);
      if (String(pageName) === 'themes-hub') setTimeout(renderThemesHub, 0);
      return result;
    };
    globalThis.__dayframeCurrentThemesGoPatched = true;
  }

  function install() {
    style();
    patchGo();
    globalThis.rThemeRadar = renderThemeRadar;
    globalThis.rConfCalendar = renderConfCalendar;
    globalThis.rSupplyMap = renderSupplyMap;
    globalThis.rEarlySources = renderEarlySources;
    globalThis.runIntelScan = runIntelScan;
    renderThemesHub();
    renderThemeRadar();
    renderConfCalendar();
    renderSupplyMap();
    renderEarlySources();
    document.addEventListener('click', (event) => {
      const target = event.target.closest('.df-theme-ticker[data-open-chart]');
      if (!target) return;
      event.preventDefault();
      openTicker(target.getAttribute('data-open-chart'));
    });
  }

  install();
  setTimeout(() => {
    renderThemesHub();
    renderThemeRadar();
  }, 800);
  setTimeout(() => {
    renderThemesHub();
    renderThemeRadar();
  }, 2500);
})();