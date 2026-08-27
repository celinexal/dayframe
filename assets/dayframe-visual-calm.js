(() => {
  'use strict';

  const FLAG = 'data-dayframe-visual-calm';
  const STYLE_ID = 'df-visual-calm-style';
  if (document.documentElement.hasAttribute(FLAG)) return;
  document.documentElement.setAttribute(FLAG, 'true');

  function byId(id) {
    return document.getElementById(id);
  }

  function removeMarketContext() {
    document.querySelectorAll('#pg-dashboard .dash-market-context, .dash-market-context').forEach((card) => card.remove());
    document.querySelectorAll('#pg-dashboard .dash-card-title').forEach((title) => {
      if ((title.textContent || '').trim().toLowerCase() === 'market context') {
        title.closest('.dash-card')?.remove();
      }
    });
  }

  function tuneLearningCopy() {
    const bridge = document.querySelector('#pg-dashboard .invest-learn-bridge');
    if (!bridge) return;
    bridge.classList.add('df-invest-learning-polished');
    const kicker = bridge.querySelector('.invest-learn-kicker');
    const heading = bridge.querySelector('.invest-learn-intro h2');
    const copy = bridge.querySelector('.invest-learn-intro p');
    const action = bridge.querySelector('.invest-learn-intro > button');
    if (kicker) kicker.textContent = 'Learning library';
    if (heading) heading.textContent = 'Investing basics';
    if (copy) copy.textContent = 'Short cards for risk, diversification and research checks.';
    if (action) action.textContent = 'Open library';
  }

  function ensureStyle() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #pg-dashboard .invest-learn-bridge,
      #pg-dashboard .invest-learn-bridge.df-invest-learning-quiet,
      #pg-dashboard .invest-learn-bridge.df-invest-learning-calm,
      #pg-dashboard .invest-learn-bridge.df-invest-learning-polished{
        display:grid!important;
        grid-template-columns:minmax(210px,.8fr) minmax(360px,1.2fr)!important;
        gap:16px!important;
        align-items:center!important;
        margin:0 0 16px!important;
        padding:14px 16px 14px 18px!important;
        border:1px solid #e7ebf3!important;
        border-radius:14px!important;
        background:linear-gradient(135deg,#ffffff 0%,#fff8fc 45%,#f8fbff 100%)!important;
        color:#1f2937!important;
        box-shadow:0 8px 24px rgba(31,41,55,.05)!important;
        overflow:hidden!important;
        position:relative!important;
      }
      #pg-dashboard .invest-learn-bridge:before{
        content:""!important;
        position:absolute!important;
        left:0!important;
        top:0!important;
        bottom:0!important;
        width:4px!important;
        background:linear-gradient(180deg,#7d86f5,#ff7ebe)!important;
      }
      #pg-dashboard .invest-learn-bridge:after{display:none!important}
      #pg-dashboard .invest-learn-intro{
        min-width:0!important;
        position:relative!important;
        z-index:1!important;
        display:block!important;
      }
      #pg-dashboard .invest-learn-kicker{
        display:block!important;
        padding:0!important;
        border:0!important;
        background:transparent!important;
        border-radius:0!important;
        font-size:9px!important;
        font-weight:850!important;
        letter-spacing:.08em!important;
        text-transform:uppercase!important;
        color:#a65a82!important;
      }
      #pg-dashboard .invest-learn-intro h2{
        margin:4px 0 3px!important;
        font-size:17px!important;
        line-height:1.2!important;
        letter-spacing:0!important;
        color:#1f2937!important;
      }
      #pg-dashboard .invest-learn-intro p{
        display:block!important;
        max-width:360px!important;
        margin:0!important;
        font-size:10.5px!important;
        line-height:1.5!important;
        color:#6b7688!important;
      }
      #pg-dashboard .invest-learn-intro>button{
        margin-top:9px!important;
        padding:7px 10px!important;
        border:1px solid #e0e5f1!important;
        border-radius:10px!important;
        background:#fff!important;
        color:#6357e9!important;
        font-size:9.5px!important;
        font-weight:850!important;
        box-shadow:none!important;
      }
      #pg-dashboard .invest-learn-links{
        position:relative!important;
        z-index:1!important;
        display:grid!important;
        grid-template-columns:repeat(3,minmax(0,1fr))!important;
        justify-content:flex-end!important;
        gap:8px!important;
      }
      #pg-dashboard .invest-learn-links>button{
        min-width:0!important;
        width:100%!important;
        min-height:48px!important;
        display:grid!important;
        grid-template-columns:auto minmax(0,1fr)!important;
        gap:8px!important;
        align-items:center!important;
        padding:9px 10px!important;
        border:1px solid #e7ebf3!important;
        border-radius:12px!important;
        background:rgba(255,255,255,.78)!important;
        color:#2f394c!important;
        box-shadow:none!important;
        text-align:left!important;
      }
      #pg-dashboard .invest-learn-links>button:hover{
        transform:translateY(-1px)!important;
        background:#fff!important;
        border-color:#e0d8ef!important;
      }
      #pg-dashboard .invest-learn-icon{
        display:grid!important;
        width:26px!important;
        height:26px!important;
        border-radius:9px!important;
        place-items:center!important;
        background:#fff0f7!important;
        color:#9b5ced!important;
        font-size:11px!important;
      }
      #pg-dashboard .invest-learn-links small,
      #pg-dashboard .invest-learn-links i{display:none!important}
      #pg-dashboard .invest-learn-links strong{
        color:#263246!important;
        font-size:10px!important;
        line-height:1.2!important;
        white-space:normal!important;
      }
      #pg-dashboard .dash-market-context{display:none!important}
      #money-budget-overview.df-budget-overview .df-budget-overview-list{gap:0!important}
      #money-budget-overview.df-budget-overview .df-budget-overview-track{display:none!important}
      #money-budget-overview.df-budget-overview .df-budget-overview-row{
        grid-template-columns:10px minmax(0,1fr) auto auto!important;
        gap:8px 10px!important;
        padding:10px 0!important;
        border:0!important;
        border-bottom:1px solid #eef1f6!important;
        border-radius:0!important;
        background:transparent!important;
        box-shadow:none!important;
      }
      #money-budget-overview.df-budget-overview .df-budget-overview-row:last-child{border-bottom:0!important}
      #money-budget-overview.df-budget-overview .df-budget-overview-row:hover,
      #money-budget-overview.df-budget-overview .df-budget-overview-row:focus-visible{background:#fafbff!important}
      @media(max-width:920px){
        #pg-dashboard .invest-learn-bridge,
        #pg-dashboard .invest-learn-bridge.df-invest-learning-quiet,
        #pg-dashboard .invest-learn-bridge.df-invest-learning-calm,
        #pg-dashboard .invest-learn-bridge.df-invest-learning-polished{
          grid-template-columns:1fr!important;
          align-items:stretch!important;
        }
      }
      @media(max-width:760px){
        #pg-dashboard .invest-learn-bridge,
        #pg-dashboard .invest-learn-bridge.df-invest-learning-quiet,
        #pg-dashboard .invest-learn-bridge.df-invest-learning-calm,
        #pg-dashboard .invest-learn-bridge.df-invest-learning-polished{
          padding:14px!important;
          border-radius:14px!important;
        }
        #pg-dashboard .invest-learn-links{
          display:grid!important;
          grid-template-columns:repeat(3,minmax(0,1fr))!important;
          gap:7px!important;
          overflow:visible!important;
          padding-bottom:0!important;
        }
        #pg-dashboard .invest-learn-links>button{
          min-height:44px!important;
          grid-template-columns:1fr!important;
          padding:9px!important;
        }
        #pg-dashboard .invest-learn-icon{display:none!important}
        #money-budget-overview.df-budget-overview .df-budget-overview-row{grid-template-columns:10px minmax(0,1fr) auto!important}
        #money-budget-overview.df-budget-overview .df-budget-overview-state{
          grid-column:2/-1!important;
          justify-self:start!important;
          min-width:0!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function apply() {
    ensureStyle();
    removeMarketContext();
    tuneLearningCopy();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
  setTimeout(apply, 250);
  setTimeout(apply, 1000);
  setTimeout(apply, 2500);

  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      apply();
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();