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
      <div class="df-stock-etf-lesson" data-df-focus="all">
        <div class="df-stock-etf-backbar">
          <button type="button" class="df-stock-etf-back" onclick="dayframeStockEtfClose()">&larr; Back</button>
          <div class="df-stock-etf-seg" role="tablist" aria-label="Focus this lesson">
            <button type="button" data-focus="all" onclick="dayframeStockEtfSetFocus('all')">All three</button>
            <button type="button" data-focus="stocks" onclick="dayframeStockEtfSetFocus('stocks')">Stocks</button>
            <button type="button" data-focus="etfs" onclick="dayframeStockEtfSetFocus('etfs')">ETFs</button>
            <button type="button" data-focus="both" onclick="dayframeStockEtfSetFocus('both')">Both</button>
          </div>
        </div>
        <section class="df-stock-etf-spotlight">
          <div class="df-stock-etf-spot-copy">
            <span>Start here</span>
            <h4>Stocks, ETFs, or both?</h4>
            <p>Pick the investing style that matches how much time, research and risk you actually want to take on.</p>
          </div>
          <div class="df-stock-etf-route" aria-label="Three ways to build an investment plan">
            <button type="button" onclick="dayframeStockEtfSetFocus('stocks')"><b>Stock</b><small>one company</small></button>
            <i></i>
            <button type="button" onclick="dayframeStockEtfSetFocus('etfs')"><b>ETF</b><small>many holdings</small></button>
            <i></i>
            <button type="button" onclick="dayframeStockEtfSetFocus('both')"><b>Both</b><small>base plus ideas</small></button>
          </div>
        </section>
        <div class="df-stock-etf-choice-grid">
          <section class="df-stock-etf-choice stocks">
            <span class="df-stock-etf-mark">S</span>
            <h4>Individual stocks</h4>
            <div class="df-stock-etf-card-line"><b>More control</b><small>More research</small></div>
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
            <div class="df-stock-etf-card-line"><b>Broader spread</b><small>Lower upkeep</small></div>
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
            <div class="df-stock-etf-card-line"><b>Core + ideas</b><small>Balanced effort</small></div>
            <p>A common approach is using ETFs as the steady base, then adding a few stocks where you have done proper research.</p>
            <dl>
              <div><dt>Best for</dt><dd>Balance between simple and personal</dd></div>
              <div><dt>Effort</dt><dd>Medium - fewer stocks to follow properly</dd></div>
              <div><dt>Main risk</dt><dd>Letting one idea become too large</dd></div>
            </dl>
          </section>
        </div>

        <div class="df-stock-etf-duel" aria-label="Stocks and ETFs comparison">
          <section class="stocks">
            <span>Stocks</span>
            <h4>One company story</h4>
            <p>You own one business at a time, so the result depends more on that company doing well.</p>
            <ul>
              <li><b>Check</b> revenue, profit, debt, cash, valuation and dilution.</li>
              <li><b>Review</b> after earnings, major news, a broken thesis, or if the position gets too large.</li>
              <li><b>Habit</b> write why you own it and what would make you trim or leave.</li>
            </ul>
          </section>
          <section class="etfs">
            <span>ETFs</span>
            <h4>A basket in one buy</h4>
            <p>You own many holdings through one fund, so the result is usually more spread out.</p>
            <ul>
              <li><b>Check</b> what the fund tracks, top holdings, charges, currency and risk level.</li>
              <li><b>Review</b> when goals change, fees become poor, or the fund no longer fits.</li>
              <li><b>Habit</b> choose the role it plays, then leave it alone unless something meaningful changes.</li>
            </ul>
          </section>
          <div class="df-stock-etf-habit">
            <b>Better habit</b>
            <p>Before money goes in, know whether this is a steady base, a researched company, or a small extra idea.</p>
          </div>
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

      #edu-detail-stocks-vs-etfs.edu-selected-lesson{
        overflow:hidden;
        border-color:#d9d2ff!important;
        background:linear-gradient(180deg,#fff7fb 0%,#ffffff 42%,#f2fffb 100%)!important;
        box-shadow:0 24px 56px rgba(39,49,75,.09)!important;
      }
      #edu-detail-stocks-vs-etfs .edu-selected-head{
        align-items:center!important;
        padding:22px 28px!important;
        border-bottom:1px solid #ece8ff!important;
        background:
          linear-gradient(135deg,rgba(124,109,242,.13),rgba(244,114,182,.14) 48%,rgba(52,211,153,.13))!important;
      }
      #edu-detail-stocks-vs-etfs .edu-selected-head span{
        color:#7568ef!important;
      }
      #edu-detail-stocks-vs-etfs .edu-selected-head h3{
        font-size:clamp(26px,2.4vw,38px)!important;
        letter-spacing:0!important;
        color:#172033!important;
      }
      #edu-detail-stocks-vs-etfs .edu-selected-body{
        padding:20px 28px 0!important;
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
        gap:18px;
      }
      .df-stock-etf-spotlight{
        display:grid;
        grid-template-columns:minmax(0,.9fr) minmax(320px,1fr);
        gap:18px;
        align-items:center;
        padding:20px;
        border:1px solid #e9e2ff;
        border-radius:22px;
        background:
          linear-gradient(135deg,#fff0f8 0%,#f4efff 46%,#ddfff5 100%);
        box-shadow:0 18px 42px rgba(124,109,242,.14);
      }
      .df-stock-etf-spot-copy span{
        display:block;
        margin:0 0 7px;
        color:#e04f9d;
        font-size:10px;
        font-weight:900;
        letter-spacing:0;
      }
      .df-stock-etf-spot-copy h4{
        margin:0;
        color:#172033;
        font-family:var(--fd);
        font-size:clamp(24px,2.5vw,34px);
        line-height:1.05;
        letter-spacing:0;
      }
      .df-stock-etf-spot-copy p{
        margin:9px 0 0;
        color:#607087;
        font-size:13px;
        line-height:1.55;
        max-width:520px;
      }
      .df-stock-etf-route{
        display:grid;
        grid-template-columns:1fr 34px 1fr 34px 1fr;
        gap:0;
        align-items:center;
      }
      .df-stock-etf-route button{
        min-height:102px;
        width:100%;
        font-family:var(--ff);
        cursor:pointer;
        display:grid;
        align-content:center;
        justify-items:center;
        gap:6px;
        border-radius:18px;
        border:1px solid rgba(255,255,255,.78);
        background:#fff;
        box-shadow:0 16px 30px rgba(39,49,75,.09);
        transition:transform .12s ease,box-shadow .12s ease;
      }
      .df-stock-etf-route button:hover{transform:translateY(-2px);box-shadow:0 20px 38px rgba(39,49,75,.14)}
      .df-stock-etf-route button:nth-child(1){background:linear-gradient(145deg,#fff,#ffdff0);border-color:#ffc2df}
      .df-stock-etf-route button:nth-child(3){background:linear-gradient(145deg,#fff,#cefff0);border-color:#9ff2d8}
      .df-stock-etf-route button:nth-child(5){background:linear-gradient(145deg,#fff,#e6e0ff);border-color:#cdc2ff}

      .df-stock-etf-backbar{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        flex-wrap:wrap;
        position:sticky;
        top:0;
        z-index:5;
        margin:-4px 0 2px;
        padding:8px 4px;
        background:linear-gradient(#fff 70%,rgba(255,255,255,0));
      }
      .df-stock-etf-back{
        flex:0 0 auto;
        min-height:38px;
        padding:0 16px;
        border-radius:11px;
        border:1px solid #e2e7f1;
        background:#fff;
        color:#5b4be3;
        font:850 12px var(--ff);
        cursor:pointer;
        box-shadow:0 8px 18px rgba(39,49,75,.06);
      }
      .df-stock-etf-back:hover{background:#f7f5ff}
      .df-stock-etf-seg{
        display:flex;
        flex-wrap:wrap;
        gap:4px;
        padding:4px;
        border-radius:12px;
        background:#f3f2fa;
        border:1px solid #e7e4f4;
      }
      .df-stock-etf-seg button{
        min-height:30px;
        padding:0 12px;
        border:0;
        border-radius:9px;
        background:transparent;
        color:#6a7488;
        font:800 11px var(--ff);
        cursor:pointer;
      }
      .df-stock-etf-seg button.on{
        background:#fff;
        color:#4b3fd0;
        box-shadow:0 6px 14px rgba(39,49,75,.1);
      }

      /* Focused views — show only the chosen route */
      .df-stock-etf-lesson[data-df-focus="stocks"] .df-stock-etf-spotlight,
      .df-stock-etf-lesson[data-df-focus="etfs"] .df-stock-etf-spotlight,
      .df-stock-etf-lesson[data-df-focus="both"] .df-stock-etf-spotlight,
      .df-stock-etf-lesson[data-df-focus="stocks"] .df-stock-etf-choice:not(.stocks),
      .df-stock-etf-lesson[data-df-focus="etfs"] .df-stock-etf-choice:not(.etfs),
      .df-stock-etf-lesson[data-df-focus="both"] .df-stock-etf-choice:not(.mix),
      .df-stock-etf-lesson[data-df-focus="stocks"] .df-stock-etf-duel section.etfs,
      .df-stock-etf-lesson[data-df-focus="etfs"] .df-stock-etf-duel section.stocks,
      .df-stock-etf-lesson[data-df-focus="stocks"] .df-stock-etf-bottom,
      .df-stock-etf-lesson[data-df-focus="etfs"] .df-stock-etf-bottom{
        display:none!important;
      }
      .df-stock-etf-lesson[data-df-focus="stocks"] .df-stock-etf-choice-grid,
      .df-stock-etf-lesson[data-df-focus="etfs"] .df-stock-etf-choice-grid,
      .df-stock-etf-lesson[data-df-focus="both"] .df-stock-etf-choice-grid,
      .df-stock-etf-lesson[data-df-focus="stocks"] .df-stock-etf-duel,
      .df-stock-etf-lesson[data-df-focus="etfs"] .df-stock-etf-duel{
        grid-template-columns:1fr!important;
      }
      .df-stock-etf-lesson[data-df-focus="stocks"] .df-stock-etf-habit,
      .df-stock-etf-lesson[data-df-focus="etfs"] .df-stock-etf-habit{
        display:none!important;
      }
      .df-stock-etf-route b{
        color:#172033;
        font-size:16px;
        letter-spacing:0;
      }
      .df-stock-etf-route small{
        color:#778397;
        font-size:10.5px;
        font-weight:750;
        letter-spacing:0;
      }
      .df-stock-etf-route i{
        height:3px;
        border-radius:999px;
        background:linear-gradient(90deg,#f472b6,#7c6df2,#34d399);
      }
      .df-stock-etf-choice-grid{
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:12px;
      }
      .df-stock-etf-choice{
        position:relative;
        overflow:hidden;
        min-width:0;
        padding:18px;
        border:1px solid #e8ebf3;
        border-radius:18px;
        background:#fff;
        box-shadow:0 10px 22px rgba(39,49,75,.04);
      }
      .df-stock-etf-choice:before{
        content:'';
        position:absolute;
        inset:0 0 auto;
        height:5px;
      }
      .df-stock-etf-choice.stocks{
        background:linear-gradient(160deg,#fff 0%,#fff7fb 100%);
        border-color:#ffd2e8;
        box-shadow:0 16px 34px rgba(244,114,182,.12);
      }
      .df-stock-etf-choice.etfs{
        background:linear-gradient(160deg,#fff 0%,#ecfffa 100%);
        border-color:#c7f8e2;
        box-shadow:0 16px 34px rgba(52,211,153,.11);
      }
      .df-stock-etf-choice.mix{
        background:linear-gradient(160deg,#fff 0%,#f5f3ff 100%);
        border-color:#ddd6fe;
        box-shadow:0 16px 34px rgba(124,109,242,.12);
      }
      .df-stock-etf-choice.stocks:before{background:#f472b6}
      .df-stock-etf-choice.etfs:before{background:#34d399}
      .df-stock-etf-choice.mix:before{background:#7c6df2}
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
      .df-stock-etf-choice.stocks .df-stock-etf-mark{background:#fff0f7;color:#db4d9d}
      .df-stock-etf-choice.etfs .df-stock-etf-mark{background:#eafff8;color:#199a72}
      .df-stock-etf-choice.mix .df-stock-etf-mark{background:#f1efff;color:#6e63e9}
      .df-stock-etf-choice h4,
      .df-stock-etf-bottom h4{
        margin:0;
        font-family:var(--fd);
        font-size:16px;
        line-height:1.2;
        color:#182235;
        letter-spacing:0;
      }
      .df-stock-etf-card-line{
        display:flex;
        align-items:center;
        gap:8px;
        flex-wrap:wrap;
        margin:9px 0 0;
      }
      .df-stock-etf-card-line b,
      .df-stock-etf-card-line small{
        display:inline-flex;
        align-items:center;
        min-height:26px;
        padding:0 10px;
        border-radius:999px;
        font-size:10.5px;
        font-weight:850;
        letter-spacing:0;
      }
      .df-stock-etf-card-line b{background:#172033;color:#fff}
      .df-stock-etf-card-line small{background:#fff;color:#707b8e;border:1px solid #e6ebf3}
      .df-stock-etf-choice.stocks .df-stock-etf-card-line b{background:#ffe1f0;color:#b91c70}
      .df-stock-etf-choice.etfs .df-stock-etf-card-line b{background:#d8fff1;color:#047857}
      .df-stock-etf-choice.mix .df-stock-etf-card-line b{background:#e7e1ff;color:#5b4be3}
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
        border:1px solid #e7e2ff;
        border-radius:20px;
        overflow:hidden;
        background:linear-gradient(135deg,#fff,#fbfaff);
        box-shadow:0 14px 30px rgba(39,49,75,.055);
      }
      .df-stock-etf-map-row{
        display:grid;
        grid-template-columns:150px minmax(0,1fr) minmax(0,1fr);
        gap:12px;
        padding:14px 16px;
        border-top:1px solid #eceff6;
      }
      .df-stock-etf-map-row:first-child{border-top:0}
      .df-stock-etf-map-row.head{
        background:linear-gradient(90deg,#fff5fb,#f2fffb);
      }
      .df-stock-etf-map-row:nth-child(3){background:rgba(255,247,251,.7)}
      .df-stock-etf-map-row:nth-child(4){background:rgba(240,253,250,.72)}
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
      .df-stock-etf-duel{
        display:grid;
        grid-template-columns:minmax(0,1fr) minmax(0,1fr);
        gap:12px;
      }
      .df-stock-etf-duel section{
        position:relative;
        overflow:hidden;
        padding:20px;
        border:1px solid #e8ebf3;
        border-radius:20px;
        box-shadow:0 16px 34px rgba(39,49,75,.055);
      }
      .df-stock-etf-duel section:before{
        content:'';
        position:absolute;
        inset:0 0 auto;
        height:6px;
      }
      .df-stock-etf-duel section.stocks{
        background:linear-gradient(145deg,#ffffff 0%,#fff3fa 100%);
        border-color:#ffd1e7;
      }
      .df-stock-etf-duel section.etfs{
        background:linear-gradient(145deg,#ffffff 0%,#eafff8 100%);
        border-color:#bdf4df;
      }
      .df-stock-etf-duel section.stocks:before{background:#f472b6}
      .df-stock-etf-duel section.etfs:before{background:#34d399}
      .df-stock-etf-duel span{
        display:inline-flex;
        min-height:28px;
        align-items:center;
        padding:0 11px;
        border-radius:999px;
        font-size:10px;
        font-weight:900;
        letter-spacing:0;
        background:#fff;
        color:#7568ef;
        box-shadow:0 8px 18px rgba(39,49,75,.07);
      }
      .df-stock-etf-duel h4{
        margin:12px 0 7px;
        font-family:var(--fd);
        color:#172033;
        font-size:19px;
        line-height:1.15;
        letter-spacing:0;
      }
      .df-stock-etf-duel p{
        margin:0;
        color:#617087;
        font-size:12px;
        line-height:1.55;
      }
      .df-stock-etf-duel ul{
        display:grid;
        gap:8px;
        margin:14px 0 0;
        padding:0;
        list-style:none;
      }
      .df-stock-etf-duel li{
        padding:10px 11px;
        border-radius:14px;
        background:rgba(255,255,255,.78);
        color:#647185;
        font-size:11.5px;
        line-height:1.45;
        border:1px solid rgba(226,232,240,.88);
      }
      .df-stock-etf-duel li b{
        color:#172033;
        margin-right:4px;
      }
      .df-stock-etf-habit{
        grid-column:1/-1;
        display:flex;
        align-items:center;
        gap:12px;
        padding:14px 16px;
        border-radius:18px;
        border:1px solid #e7e0ff;
        background:linear-gradient(90deg,#f6f1ff 0%,#fff7fb 48%,#effefa 100%);
      }
      .df-stock-etf-habit b{
        flex:0 0 auto;
        color:#6e63e9;
        font-size:12px;
        font-weight:900;
        letter-spacing:0;
      }
      .df-stock-etf-habit p{
        margin:0;
        color:#5e6b7f;
        font-size:12px;
        line-height:1.45;
      }
      .df-stock-etf-bottom{
        display:grid;
        grid-template-columns:minmax(0,1fr) minmax(0,1fr);
        gap:12px;
      }
      .df-stock-etf-bottom section{
        padding:18px;
        border:1px solid #e8ebf3;
        border-radius:20px;
        background:#fff;
        box-shadow:0 14px 28px rgba(39,49,75,.045);
      }
      .df-stock-etf-bottom section:first-child{background:linear-gradient(145deg,#fff,#f0fffa);border-color:#c7f8e2}
      .df-stock-etf-bottom section:last-child{background:linear-gradient(145deg,#fff,#fff7fb);border-color:#ffd2e8}
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
        background:#fff;
        border:1px solid #eee6ff;
      }
      #edu-detail-stocks-vs-etfs .edu-quiz{
        margin:20px 28px 28px!important;
        border:1px solid #e7e2ff!important;
        border-radius:20px!important;
        background:linear-gradient(135deg,#ffffff,#fbf7ff 55%,#f0fffa)!important;
        box-shadow:0 14px 34px rgba(39,49,75,.055)!important;
      }
      #edu-detail-stocks-vs-etfs .edu-quiz-option{
        background:#fff!important;
        border-color:#e8ebf3!important;
        box-shadow:0 8px 18px rgba(39,49,75,.035)!important;
      }
      #edu-detail-stocks-vs-etfs .edu-quiz-option span{
        background:#f1efff!important;
        color:#7668ef!important;
      }
      .education-page .edu-card[onclick*="stocks-vs-etfs"]{
        background:linear-gradient(145deg,#fff,#fff7fb)!important;
        box-shadow:inset 0 3px 0 #f472b6,0 10px 24px rgba(39,49,75,.06)!important;
      }

      @media(max-width:900px){
        #pg-dashboard .invest-learn-bridge.df-stock-etf-learn-panel,
        .df-stock-etf-spotlight,
        .df-stock-etf-feature{
          grid-template-columns:1fr!important;
        }
        .df-stock-etf-learn-actions,
        .df-stock-etf-mini-grid,
        .df-stock-etf-choice-grid,
        .df-stock-etf-duel,
        .df-stock-etf-bottom{
          grid-template-columns:1fr;
          min-width:0;
        }
        .df-stock-etf-habit{
          display:block;
        }
        .df-stock-etf-habit p{
          margin-top:6px;
        }
        .df-stock-etf-route{
          grid-template-columns:1fr;
          gap:8px;
        }
        .df-stock-etf-route i{
          width:3px;
          height:18px;
          justify-self:center;
          background:linear-gradient(180deg,#f472b6,#7c6df2,#34d399);
        }
        .df-stock-etf-map-row.head{display:none}
      }
      @media(max-width:560px){
        #edu-detail-stocks-vs-etfs .edu-selected-head{
          padding:18px 20px!important;
        }
        #edu-detail-stocks-vs-etfs .edu-selected-body{
          padding:14px 14px 0!important;
        }
        #pg-dashboard .invest-learn-bridge.df-stock-etf-learn-panel{
          padding:14px!important;
          border-radius:16px!important;
        }
        .df-stock-etf-spotlight{
          padding:15px;
          border-radius:18px;
        }
        .df-stock-etf-route button{
          min-height:74px;
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
        #edu-detail-stocks-vs-etfs .edu-quiz{
          margin:16px 14px 18px!important;
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
        <button type="button" onclick="dayframeOpenStocksEtfs('stocks')"><strong>Stocks</strong><small>More personal, more research.</small></button>
        <button type="button" onclick="dayframeOpenStocksEtfs('etfs')"><strong>ETFs</strong><small>Broader, simpler exposure.</small></button>
        <button type="button" onclick="dayframeOpenStocksEtfs('both')"><strong>Both</strong><small>A steady base plus researched ideas.</small></button>
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
          applyStockEtfFocus(false);
        }, 0);
        return result;
      };
      wrappedEduRender.__dayframeStockEtfFoundation = true;
      globalThis.eduRender = wrappedEduRender;
    }
  }

  const FOCUS_VALUES = ['all', 'stocks', 'etfs', 'both'];
  let currentFocus = 'all';

  function applyStockEtfFocus(scroll) {
    const lesson = document.querySelector('#edu-detail-' + TOPIC_ID + ' .df-stock-etf-lesson');
    if (!lesson) return false;
    lesson.setAttribute('data-df-focus', currentFocus);
    lesson.querySelectorAll('.df-stock-etf-seg button').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-focus') === currentFocus);
    });
    if (scroll) {
      const bar = lesson.querySelector('.df-stock-etf-backbar') || lesson;
      bar.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    return true;
  }

  globalThis.dayframeStockEtfSetFocus = function dayframeStockEtfSetFocus(focus) {
    currentFocus = FOCUS_VALUES.indexOf(focus) === -1 ? 'all' : focus;
    if (!applyStockEtfFocus(true)) setTimeout(function () { applyStockEtfFocus(true); }, 80);
  };

  globalThis.dayframeStockEtfClose = function dayframeStockEtfClose() {
    currentFocus = 'all';
    try {
      window._eduReturnTicker = null;
      window._eduReturnDive = null;
      if (typeof eduActiveTopic !== 'undefined') eduActiveTopic = null;
      if (typeof eduRender === 'function') eduRender(document.getElementById('edu-content'));
    } catch (e) {}
    setTimeout(function () {
      const feature = document.getElementById('df-stock-etf-feature')
        || document.querySelector('#pg-education .edu-library-head')
        || document.getElementById('pg-education');
      if (feature) feature.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
  };

  globalThis.dayframeOpenStocksEtfs = function dayframeOpenStocksEtfs(focus) {
    currentFocus = FOCUS_VALUES.indexOf(focus) === -1 ? 'all' : focus;
    addTopic();
    ensureStyle();
    if (typeof go === 'function') go('education', document.querySelector('.ni[onclick*="education"]'));
    if (typeof goEdu === 'function') {
      goEdu(TOPIC_ID);
    } else if (typeof eduOpenTopic === 'function') {
      eduOpenTopic(TOPIC_ID);
    }
    let tries = 0;
    (function settle() {
      tidySelectedLessonTitle();
      const done = applyStockEtfFocus(false);
      if (done) {
        const anchor = document.querySelector('#edu-detail-' + TOPIC_ID + ' .df-stock-etf-backbar')
          || document.getElementById('edu-detail-' + TOPIC_ID)
          || document.getElementById('df-stock-etf-feature');
        if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (tries++ < 12) setTimeout(settle, 80);
    })();
  };

  function apply() {
    ensureStyle();
    addTopic();
    patchOldRoute();
    patchEducationRender();
    enhanceLearningBridge();
    ensureEducationFeature();
    tidySelectedLessonTitle();
    applyStockEtfFocus(false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
  setTimeout(apply, 250);
  setTimeout(apply, 1000);
  setTimeout(apply, 1800);
})();
