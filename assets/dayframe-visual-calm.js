(() => {
  'use strict';

  const FLAG = 'data-dayframe-visual-calm';
  const STYLE_ID = 'df-visual-calm-style';
  if (document.documentElement.hasAttribute(FLAG)) return;
  document.documentElement.setAttribute(FLAG, 'true');

  function byId(id) {
    return document.getElementById(id);
  }

  function tuneLearningCopy() {
    const bridge = document.querySelector('#pg-dashboard .invest-learn-bridge');
    if (!bridge) return;
    bridge.classList.add('df-invest-learning-calm');
    const kicker = bridge.querySelector('.invest-learn-kicker');
    const heading = bridge.querySelector('.invest-learn-intro h2');
    const copy = bridge.querySelector('.invest-learn-intro p');
    const action = bridge.querySelector('.invest-learn-intro > button');
    if (kicker) kicker.textContent = 'Learning';
    if (heading) heading.textContent = 'Learn the numbers as you go';
    if (copy) copy.textContent = 'Short explainers for risk, diversification and research terms while you review your portfolio.';
    if (action) action.textContent = 'Open library';
  }

  function ensureStyle() {
    if (byId(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #pg-dashboard .invest-learn-bridge,
      #pg-dashboard .invest-learn-bridge.df-invest-learning-quiet,
      #pg-dashboard .invest-learn-bridge.df-invest-learning-calm{
        display:flex!important;
        justify-content:space-between!important;
        gap:12px!important;
        align-items:center!important;
        margin:0 0 16px!important;
        padding:11px 12px!important;
        border:1px solid #e7ebf3!important;
        border-radius:12px!important;
        background:#fff!important;
        color:#1f2937!important;
        box-shadow:none!important;
        overflow:visible!important;
      }
      #pg-dashboard .invest-learn-bridge:after{display:none!important}
      #pg-dashboard .invest-learn-intro{
        min-width:210px!important;
        display:grid!important;
        grid-template-columns:1fr auto!important;
        gap:4px 10px!important;
        align-items:center!important;
      }
      #pg-dashboard .invest-learn-kicker{
        grid-column:1/-1!important;
        padding:0!important;
        border:0!important;
        background:transparent!important;
        border-radius:0!important;
        font-size:9px!important;
        font-weight:850!important;
        letter-spacing:.08em!important;
        color:#7c8799!important;
      }
      #pg-dashboard .invest-learn-intro h2{
        margin:0!important;
        font-size:14px!important;
        line-height:1.2!important;
        letter-spacing:0!important;
        color:#1f2937!important;
      }
      #pg-dashboard .invest-learn-intro p{
        grid-column:1/-1!important;
        max-width:440px!important;
        margin:0!important;
        font-size:9.5px!important;
        line-height:1.45!important;
        color:#6b7688!important;
      }
      #pg-dashboard .invest-learn-intro>button{
        grid-row:2!important;
        grid-column:2!important;
        margin:0!important;
        padding:6px 9px!important;
        border:1px solid #e0e5f1!important;
        border-radius:999px!important;
        background:#fff!important;
        color:#685cf0!important;
        font-size:9.5px!important;
        box-shadow:none!important;
      }
      #pg-dashboard .invest-learn-links{
        display:flex!important;
        justify-content:flex-end!important;
        flex-wrap:wrap!important;
        gap:7px!important;
      }
      #pg-dashboard .invest-learn-links>button{
        min-width:0!important;
        width:auto!important;
        min-height:34px!important;
        display:grid!important;
        grid-template-columns:1fr!important;
        gap:0!important;
        padding:7px 9px!important;
        border:1px solid #e7ebf3!important;
        border-radius:999px!important;
        background:#fff!important;
        color:#2f394c!important;
        box-shadow:none!important;
      }
      #pg-dashboard .invest-learn-links>button:hover{
        transform:translateY(-1px)!important;
        background:#fafbff!important;
      }
      #pg-dashboard .invest-learn-icon,
      #pg-dashboard .invest-learn-links small,
      #pg-dashboard .invest-learn-links i{display:none!important}
      #pg-dashboard .invest-learn-links strong{
        color:#263246!important;
        font-size:9.5px!important;
        line-height:1.2!important;
        white-space:normal!important;
      }
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
        #pg-dashboard .invest-learn-bridge.df-invest-learning-calm{
          flex-direction:column!important;
          align-items:stretch!important;
        }
        #pg-dashboard .invest-learn-links{justify-content:flex-start!important}
      }
      @media(max-width:760px){
        #pg-dashboard .invest-learn-bridge,
        #pg-dashboard .invest-learn-bridge.df-invest-learning-quiet,
        #pg-dashboard .invest-learn-bridge.df-invest-learning-calm{
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
          min-height:42px!important;
          padding:9px!important;
        }
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
    tuneLearningCopy();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
  setTimeout(apply, 250);
  setTimeout(apply, 1000);
})();