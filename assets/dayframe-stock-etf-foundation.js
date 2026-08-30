(function () {
  const FLAG = 'data-dayframe-stock-etf-foundation';
  const STYLE_ID = 'df-stock-etf-foundation-style';
  const TOPIC_ID = 'stocks-vs-etfs';

  if (document.documentElement.hasAttribute(FLAG)) return;
  document.documentElement.setAttribute(FLAG, '1');

  function hasEducationTopics() {
    try {
      return typeof EDU_TOPICS !== 'undefined' && Array.isArray(EDU_TOPICS);
    } catch {
      return false;
    }
  }

  function topicDetail() {
    return `
      <div class="df-stock-etf-lesson">
        <div class="df-stock-etf-choice-grid">
          <section class="df-stock-etf-choice stocks">
            <span class="df-stock-etf-mark">S</span>
            <h4>Individual stocks</h4>
            <p>You are choosing specific companies. The upside can be higher, but one weak business or bad result can hurt your money more.</p>
            <dl>
              <div><dt>Best for</dt><dd>Companies you understand well</dd></div>
              <div><dt>Effort</dt><dd>Higher - you need to keep checking the story</dd></div>
              <div><dt>Main risk</dt><dd>The company itself disappoints</dd></div>
            </dl>
          </section>
          <section class="df-stock-etf-choice etfs">
            <span class="df-stock-etf-mark">E</span>
            <h4>ETFs</h4>
            <p>You buy one fund that holds many investments. It is usually calmer than picking single stocks, but it still moves with the market.</p>
            <dl>
              <div><dt>Best for</dt><dd>A simple long-term base</dd></div>
              <div><dt>Effort</dt><dd>Lower - check the fund, fees and spread</dd></div>
              <div><dt>Main risk</dt><dd>The whole market or sector falls</dd></div>
            </dl>
          </section>
          <section class="df-stock-etf-choice mix">
            <span class="df-stock-etf-mark">B</span>
            <h4>A mix of both</h4>
            <p>A common approach is using ETFs as the steady base, then adding a few stocks where you have done proper research.</p>
            <dl>
              <div><dt>Best for</dt><dd>Balance between simple and personal</dd></div>
              <div><dt>Effort</dt><dd>Medium - fewer stocks to follow properly</dd></div>
              <div><dt>Main risk</dt><dd>Letting one idea become too large</dd></div>
            </dl>
          </section>
        </div>

        <div class="df-stock-etf-map" aria-label="Stocks and ETFs comparison">
          <div class="df-stock-etf-map-row head"><span></span><strong>Stocks</strong><strong>ETFs</strong></div>
          <div class="df-stock-etf-map-row"><span>What you own</span><p>One company at a time.</p><p>A basket of companies, bonds or other assets.</p></div>
          <div class="df-stock-etf-map-row"><span>What to check</span><p>Revenue, profit, debt, cash, valuation, dilution and why demand should grow.</p><p>What the fund tracks, top holdings, ongoing charge, currency, platform costs and risk level.</p></div>
          <div class="df-stock-etf-map-row"><span>When to review</span><p>After earnings, major news, a broken thesis, or if the position becomes too large.</p><p>When goals change, the fund changes strategy, fees become poor, or the allocation no longer fits.</p></div>
          <div class="df-stock-etf-map-row"><span>Better habit</span><p>Write the reason you own it and what would make you trim or leave.</p><p>Choose the role it plays, then leave it alone unless something meaningful changes.</p></div>
        </div>

        <div class="df-stock-etf-bottom">
          <section>
            <h4>Before you buy</h4>
            <ul>
              <li>Can you explain what you are buying in one sentence?</li>
              <li>Do you know the biggest risk?</li>
              <li>Have you checked costs, spread and currency fees?</li>
              <li>Does the size fit your budget and goals?</li>
            </ul>
          </section>
          <section>
            <h4>A simple starting structure</h4>
            <p>ETF for the base. Individual stocks only when you can explain the business, the risk, and what evidence would change your mind.</p>
            <p class="df-stock-etf-note">Educational only - Dayframe should help users ask better questions, not tell them what to buy or sell.</p>
          </section>
        </div>
      </div>
    `;
  }

  const STOCK_ETF_TOPIC = {
    id: TOPIC_ID,
    cat: 'basics',
    icon: 'ETF',
    title: 'Stocks vs ETFs',
    tag: 'beginner',
    body: 'Choose between a broad fund, individual companies, or a mix before deciding where your money goes.',
    detail: topicDetail()
  };

  function addTopic() {
    if (!hasEducationTopics()) return false;
    if (!EDU_TOPICS.some(topic => topic && topic.id === TOPIC_ID)) {
      EDU_TOPICS.unshift(STOCK_ETF_TOPIC);
    }
    return true;
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #pg-isa-guide,
      .invest-side-nav button[data-invest-page="isa-guide"],
      .invest-side-nav button[onclick*="isa-guide"],
      button.ni[onclick*="isa-guide"]{
        display:none!important;
      }

      #pg-dashboard .invest-learn-bridge.df-stock-etf-learn-panel{
        display:grid!important;
        grid-template-columns:minmax(220px,.8fr) minmax(0,1.2fr)!important;
        gap:16px!important;
        align-items:center!important;
        margin:0 0 18px!important;
        padding:16px!important;
        border:1px solid #e6ebf3!important;
        border-radius:18px!important;
        background:linear-gradient(135deg,#ffffff 0%,#fbfaff 45%,#f4fffc 100%)!important;
        color:#172033!important;
        box-shadow:0 16px 36px rgba(39,49,75,.07)!important;
      }
      #pg-dashboard .invest-learn-bridge.df-stock-etf-learn-panel:after{display:none!important}
      .education-page .edu-hero-new{
        background:linear-gradient(135deg,#ffffff 0%,#fff8fb 52%,#effdf9 100%)!important;
        border:1px solid #e8ebf3!important;
        color:#172033!important;
        box-shadow:0 18px 42px rgba(39,49,75,.08)!important;
      }
      .education-page .edu-hero-new:after{display:none!important}
      .education-page .edu-hero-kicker{color:#7b6ff0!important}
      .education-page .edu-hero-title{color:#172033!important}
      .education-page .edu-hero-sub{color:#647083!important}
      .education-page .edu-trust-row span{
        background:#fff!important;
        border:1px solid #e7ebf3!important;
        color:#6d7788!important;
      }
      .education-page .edu-progress-card{
        background:rgba(255,255,255,.76)!important;
        border:1px solid #e7ebf3!important;
        color:#172033!important;
        box-shadow:none!important;
      }
      .education-page .edu-progress-card span,
      .education-page .edu-progress-card p{color:#788397!important}
      .education-page .edu-progress-card strong{color:#172033!important}
      .education-page .edu-progress-track{background:#e9edf5!important}
      .education-page .edu-progress-card button{
        background:#fff!important;
        border:1px solid #e2e7f1!important;
        color:#6e63e9!important;
      }
      .df-stock-etf-learn-copy span,
      .df-stock-etf-feature-copy span{
        display:block;
        margin:0 0 5px;
        font-size:10px;
        font-weight:850;
        letter-spacing:0;
        color:#7b6ff0;
      }
      .df-stock-etf-learn-copy h2,
      .df-stock-etf-feature-copy h3{
        margin:0;
        font-family:var(--fd);
        font-size:20px;
        line-height:1.18;
        letter-spacing:0;
        color:#182235;
      }
      .df-stock-etf-learn-copy p,
      .df-stock-etf-feature-copy p{
        margin:6px 0 0;
        max-width:560px;
        font-size:12px;
        line-height:1.55;
        color:#6d7788;
      }
      .df-stock-etf-learn-actions{
        display:grid;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:8px;
      }
      .df-stock-etf-learn-actions button{
        min-width:0;
        min-height:66px;
        padding:10px;
        border:1px solid #e7eaf2;
        border-radius:14px;
        background:#fff;
        color:#273246;
        text-align:left;
        cursor:pointer;
        box-shadow:0 8px 20px rgba(39,49,75,.045);
      }
      .df-stock-etf-learn-actions button:first-child{
        border-color:#ddd6fe;
        background:linear-gradient(135deg,#f5f3ff,#fdf2f8);
      }
      .df-stock-etf-learn-actions b,
      .df-stock-etf-learn-actions small{
        display:block;
        letter-spacing:0;
      }
      .df-stock-etf-learn-actions b{
        font-size:11px;
        line-height:1.2;
        color:#1d2638;
      }
      .df-stock-etf-learn-actions small{
        margin-top:4px;
        font-size:9.5px;
        line-height:1.25;
        color:#7a8495;
      }
      .df-stock-etf-feature{
        display:grid;
        grid-template-columns:minmax(0,1fr) auto;
        gap:18px;
        align-items:center;
        margin:18px 0;
        padding:18px;
        border:1px solid #e8ebf3;
        border-radius:20px;
        background:linear-gradient(135deg,#fff,#fff8fb 50%,#f1fffb);
        box-shadow:0 16px 34px rgba(39,49,75,.06);
      }
      .df-stock-etf-mini-grid{
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:8px;
        min-width:min(520px,48vw);
      }
      .df-stock-etf-mini-grid button{
        min-height:74px;
        padding:12px;
        border:1px solid #e7ebf3;
        border-radius:14px;
        background:#fff;
        text-align:left;
        cursor:pointer;
      }
      .df-stock-etf-mini-grid strong,
      .df-stock-etf-mini-grid small{
        display:block;
        letter-spacing:0;
      }
      .df-stock-etf-mini-grid strong{
        font-size:12px;
        color:#1c2638;
      }
      .df-stock-etf-mini-grid small{
        margin-top:4px;
        font-size:10px;
        line-height:1.35;
        color:#718096;
      }
      .df-stock-etf-mini-grid button:nth-child(1){box-shadow:inset 0 3px 0 #f472b6}
      .df-stock-etf-mini-grid button:nth-child(2){box-shadow:inset 0 3px 0 #34d399}
      .df-stock-etf-mini-grid button:nth-child(3){box-shadow:inset 0 3px 0 #7c6df2}

      .df-stock-etf-lesson{
        display:grid;
        gap:16px;
      }
      .df-stock-etf-choice-grid{
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:12px;
      }
      .df-stock-etf-choice{
        min-width:0;
        padding:16px;
        border:1px solid #e8ebf3;
        border-radius:18px;
        background:#fff;
        box-shadow:0 10px 22px rgba(39,49,75,.04);
      }
      .df-stock-etf-choice.stocks{box-shadow:inset 0 3px 0 #f472b6,0 10px 22px rgba(39,49,75,.04)}
      .df-stock-etf-choice.etfs{box-shadow:inset 0 3px 0 #34d399,0 10px 22px rgba(39,49,75,.04)}
      .df-stock-etf-choice.mix{box-shadow:inset 0 3px 0 #7c6df2,0 10px 22px rgba(39,49,75,.04)}
      .df-stock-etf-mark{
        width:34px;
        height:34px;
        display:grid;
        place-items:center;
        margin-bottom:12px;
        border-radius:12px;
        background:#f5f6fb;
        color:#6e63e9;
        font-size:12px;
        font-weight:900;
        letter-spacing:0;
      }
      .df-stock-etf-choice h4,
      .df-stock-etf-bottom h4{
        margin:0;
        font-family:var(--fd);
        font-size:16px;
        line-height:1.2;
        color:#182235;
        letter-spacing:0;
      }
      .df-stock-etf-choice p,
      .df-stock-etf-bottom p,
      .df-stock-etf-choice dd,
      .df-stock-etf-map-row p{
        color:#667386;
        font-size:12px;
        line-height:1.55;
        letter-spacing:0;
      }
      .df-stock-etf-choice p{margin:8px 0 14px}
      .df-stock-etf-choice dl{
        display:grid;
        gap:8px;
        margin:0;
      }
      .df-stock-etf-choice dl div{
        display:grid;
        grid-template-columns:70px minmax(0,1fr);
        gap:10px;
      }
      .df-stock-etf-choice dt{
        color:#8b95a6;
        font-size:10px;
        font-weight:850;
        letter-spacing:0;
      }
      .df-stock-etf-choice dd{margin:0}
      .df-stock-etf-map{
        border:1px solid #e8ebf3;
        border-radius:18px;
        overflow:hidden;
        background:#fff;
      }
      .df-stock-etf-map-row{
        display:grid;
        grid-template-columns:150px minmax(0,1fr) minmax(0,1fr);
        gap:12px;
        padding:12px 14px;
        border-top:1px solid #eef1f6;
      }
      .df-stock-etf-map-row:first-child{border-top:0}
      .df-stock-etf-map-row.head{
        background:#fafbff;
      }
      .df-stock-etf-map-row span{
        color:#828da0;
        font-size:10px;
        font-weight:850;
        letter-spacing:0;
      }
      .df-stock-etf-map-row strong{
        color:#1c2638;
        font-size:12px;
        letter-spacing:0;
      }
      .df-stock-etf-map-row p{margin:0}
      .df-stock-etf-bottom{
        display:grid;
        grid-template-columns:minmax(0,1fr) minmax(0,1fr);
        gap:12px;
      }
      .df-stock-etf-bottom section{
        padding:16px;
        border:1px solid #e8ebf3;
        border-radius:18px;
        background:#fff;
      }
      .df-stock-etf-bottom ul{
        display:grid;
        gap:8px;
        margin:12px 0 0;
        padding:0;
        list-style:none;
      }
      .df-stock-etf-bottom li{
        position:relative;
        padding-left:18px;
        color:#667386;
        font-size:12px;
        line-height:1.45;
      }
      .df-stock-etf-bottom li:before{
        content:'';
        position:absolute;
        left:0;
        top:.55em;
        width:7px;
        height:7px;
        border-radius:50%;
        background:#34d399;
      }
      .df-stock-etf-note{
        margin-top:12px!important;
        padding:10px 12px;
        border-radius:12px;
        background:#fbf7ff;
        border:1px solid #eee6ff;
      }
      .education-page .edu-card[onclick*="stocks-vs-etfs"]{
        background:linear-gradient(145deg,#fff,#fff7fb)!important;
        box-shadow:inset 0 3px 0 #f472b6,0 10px 24px rgba(39,49,75,.06)!important;
      }

      @media(max-width:900px){
        #pg-dashboard .invest-learn-bridge.df-stock-etf-learn-panel,
        .df-stock-etf-feature{
          grid-template-columns:1fr!important;
        }
        .df-stock-etf-learn-actions,
        .df-stock-etf-mini-grid,
        .df-stock-etf-choice-grid,
        .df-stock-etf-bottom{
          grid-template-columns:1fr;
          min-width:0;
        }
        .df-stock-etf-map-row{
          grid-template-columns:1fr;
          gap:6px;
        }
        .df-stock-etf-map-row.head{display:none}
      }
      @media(max-width:560px){
        #pg-dashboard .invest-learn-bridge.df-stock-etf-learn-panel{
          padding:14px!important;
          border-radius:16px!important;
        }
        .df-stock-etf-learn-actions{
          grid-template-columns:repeat(2,minmax(0,1fr));
        }
        .df-stock-etf-learn-actions button{
          min-height:58px;
        }
        .df-stock-etf-feature{
          padding:14px;
          border-radius:16px;
        }
        .df-stock-etf-learn-copy h2,
        .df-stock-etf-feature-copy h3{
          font-size:18px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function enhanceLearningBridge() {
    const bridge = document.querySelector('#pg-dashboard .invest-learn-bridge');
    if (!bridge || bridge.dataset.stockEtfPanel === '1') return;
    bridge.dataset.stockEtfPanel = '1';
    bridge.classList.remove('df-invest-learning-quiet');
    bridge.classList.add('df-stock-etf-learn-panel');
    bridge.innerHTML = `
      <div class="df-stock-etf-learn-copy">
        <span>Learn to invest</span>
        <h2>Start with what you are buying</h2>
        <p>Stocks and ETFs behave differently. This is the quick foundation lesson before you compare companies, themes or risks.</p>
      </div>
      <div class="df-stock-etf-learn-actions">
        <button type="button" onclick="dayframeOpenStocksEtfs()"><b>Stocks vs ETFs</b><small>The first choice</small></button>
        <button type="button" onclick="goEdu('what-is-risk')"><b>Risk and return</b><small>What can go wrong</small></button>
        <button type="button" onclick="goEdu('diversification')"><b>Diversification</b><small>Spread the risk</small></button>
        <button type="button" onclick="goEdu('research-checklist')"><b>Research checklist</b><small>Before acting</small></button>
      </div>
    `;
  }

  function ensureEducationFeature() {
    const page = document.getElementById('pg-education');
    if (!page || document.getElementById('df-stock-etf-feature')) return;
    const libraryHead = page.querySelector('.edu-library-head');
    if (!libraryHead || !libraryHead.parentElement) return;
    const feature = document.createElement('section');
    feature.id = 'df-stock-etf-feature';
    feature.className = 'df-stock-etf-feature';
    feature.innerHTML = `
      <div class="df-stock-etf-feature-copy">
        <span>Good first lesson</span>
        <h3>Stocks, ETFs, or both?</h3>
        <p>Use this before picking investments. It explains the difference between buying one company, buying a broad fund, and mixing the two.</p>
      </div>
      <div class="df-stock-etf-mini-grid">
        <button type="button" onclick="dayframeOpenStocksEtfs()"><strong>Stocks</strong><small>More personal, more research.</small></button>
        <button type="button" onclick="dayframeOpenStocksEtfs()"><strong>ETFs</strong><small>Broader, simpler exposure.</small></button>
        <button type="button" onclick="dayframeOpenStocksEtfs()"><strong>Both</strong><small>A steady base plus researched ideas.</small></button>
      </div>
    `;
    libraryHead.parentElement.insertBefore(feature, libraryHead);
  }

  function tidySelectedLessonTitle() {
    const heading = document.querySelector('#edu-detail-' + TOPIC_ID + ' .edu-selected-head h3');
    if (heading) heading.textContent = 'Stocks vs ETFs';
  }

  function patchOldRoute() {
    if (typeof go !== 'function' || go.__dayframeStockEtfFoundation) return;
    const originalGo = go;
    const wrapped = function dayframeStockEtfFoundationGo(name, btn) {
      if (name === 'isa-guide') {
        dayframeOpenStocksEtfs();
        return undefined;
      }
      const result = originalGo.apply(this, arguments);
      if (name === 'dashboard' || name === 'education') setTimeout(apply, 0);
      return result;
    };
    wrapped.__dayframeStockEtfFoundation = true;
    globalThis.go = wrapped;
  }

  function patchEducationRender() {
    if (typeof rEducation === 'function' && !rEducation.__dayframeStockEtfFoundation) {
      const originalEducation = rEducation;
      const wrappedEducation = function dayframeStockEtfFoundationEducation() {
        addTopic();
        const result = originalEducation.apply(this, arguments);
        setTimeout(apply, 0);
        return result;
      };
      wrappedEducation.__dayframeStockEtfFoundation = true;
      globalThis.rEducation = wrappedEducation;
    }
    if (typeof eduRender === 'function' && !eduRender.__dayframeStockEtfFoundation) {
      const originalEduRender = eduRender;
      const wrappedEduRender = function dayframeStockEtfFoundationEduRender() {
        addTopic();
        const result = originalEduRender.apply(this, arguments);
        setTimeout(() => {
          ensureEducationFeature();
          tidySelectedLessonTitle();
        }, 0);
        return result;
      };
      wrappedEduRender.__dayframeStockEtfFoundation = true;
      globalThis.eduRender = wrappedEduRender;
    }
  }

  globalThis.dayframeOpenStocksEtfs = function dayframeOpenStocksEtfs() {
    addTopic();
    ensureStyle();
    if (typeof go === 'function') go('education', document.querySelector('.ni[onclick*="education"]'));
    if (typeof goEdu === 'function') {
      goEdu(TOPIC_ID);
    } else if (typeof eduOpenTopic === 'function') {
      eduOpenTopic(TOPIC_ID);
    }
    setTimeout(() => {
      tidySelectedLessonTitle();
      const detail = document.getElementById('edu-detail-' + TOPIC_ID) || document.getElementById('df-stock-etf-feature');
      if (detail) detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  function apply() {
    ensureStyle();
    addTopic();
    patchOldRoute();
    patchEducationRender();
    enhanceLearningBridge();
    ensureEducationFeature();
    tidySelectedLessonTitle();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
  setTimeout(apply, 250);
  setTimeout(apply, 1000);
  setTimeout(apply, 1800);
})();
