/**
 * Battle Arena CSS Stylesheet
 *
 * Contains all animations, layout, and component styles for the battle arena UI.
 * Uses keyframe animations for smooth transitions and interactive feedback.
 */
export const BATTLE_ARENA_STYLES = `
  @keyframes arenaReveal {
    0%   { opacity: 0; transform: translateY(12px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes spinSlow {
    to { transform: rotate(360deg); }
  }
  @keyframes timerShrink {
    from { width: 100%; }
    to   { width: 0%; }
  }
  @keyframes popIn {
    0%   { opacity: 0; transform: scale(0.88); }
    60%  { transform: scale(1.04); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes correctFlash {
    0%,100% { box-shadow: 0 0 0px rgba(0,255,120,0); }
    40%     { box-shadow: 0 0 28px rgba(0,255,120,0.55), 0 0 60px rgba(0,255,120,0.2); }
  }
  @keyframes wrongFlash {
    0%,100% { box-shadow: 0 0 0px rgba(255,60,20,0); }
    40%     { box-shadow: 0 0 28px rgba(255,60,20,0.55), 0 0 60px rgba(255,60,20,0.2); }
  }
  @keyframes winGlow {
    0%,100% { text-shadow: 0 0 20px rgba(255,200,0,0.5), 0 0 50px rgba(255,200,0,0.2); }
    50%     { text-shadow: 0 0 40px rgba(255,200,0,0.9), 0 0 90px rgba(255,200,0,0.4); }
  }
  @keyframes lossShake {
    0%,100% { transform: translateX(0); }
    20%     { transform: translateX(-5px); }
    40%     { transform: translateX(5px); }
    60%     { transform: translateX(-3px); }
    80%     { transform: translateX(3px); }
  }
  @keyframes scanDown {
    0%   { top: -2px; opacity: 0; }
    5%   { opacity: 1; }
    95%  { opacity: 0.4; }
    100% { top: 100%; opacity: 0; }
  }
  @keyframes starPop {
    0%   { transform: scale(0) rotate(-30deg); opacity: 0; }
    60%  { transform: scale(1.3) rotate(5deg); }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }
  @keyframes categoryHover {
    0%,100% { border-color: rgba(255,60,20,0.3); background: rgba(255,60,20,0.05); }
    50%     { border-color: rgba(255,60,20,0.7); background: rgba(255,60,20,0.12); }
  }
  @keyframes roundBanner {
    0%   { opacity: 0; transform: scaleX(0.6) translateY(-8px); }
    60%  { transform: scaleX(1.02) translateY(0); }
    100% { opacity: 1; transform: scaleX(1) translateY(0); }
  }

  /* ── Container & Layout ── */
  .arena-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }

  .arena-wrap::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(0,212,255,0.022) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,212,255,0.022) 1px, transparent 1px);
    background-size: 56px 56px;
    pointer-events: none;
  }

  .scan-line {
    position: absolute; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,60,20,0.22) 30%, rgba(255,60,20,0.22) 70%, transparent);
    animation: scanDown 11s linear 1s infinite;
    pointer-events: none;
    z-index: 0;
  }

  /* ── Corner Decorations ── */
  .corner-tl, .corner-tr, .corner-bl, .corner-br {
    position: absolute; width: 22px; height: 22px;
    pointer-events: none; z-index: 1;
  }
  .corner-tl { top: 8px; left: 8px; border-top: 2px solid rgba(255,60,20,0.3); border-left: 2px solid rgba(255,60,20,0.3); }
  .corner-tr { top: 8px; right: 8px; border-top: 2px solid rgba(255,60,20,0.3); border-right: 2px solid rgba(255,60,20,0.3); }
  .corner-bl { bottom: 8px; left: 8px; border-bottom: 2px solid rgba(255,60,20,0.3); border-left: 2px solid rgba(255,60,20,0.3); }
  .corner-br { bottom: 8px; right: 8px; border-bottom: 2px solid rgba(255,60,20,0.3); border-right: 2px solid rgba(255,60,20,0.3); }

  /* ── Score Header ── */
  .score-header {
    position: relative; z-index: 2;
    display: flex; align-items: stretch;
    border-bottom: 1px solid rgba(255,60,20,0.14);
    background: rgba(5,8,15,0.85);
    backdrop-filter: blur(12px);
  }
  .score-player {
    flex: 1; padding: 12px 20px;
    display: flex; flex-direction: column; gap: 4px;
  }
  .score-player.right { align-items: flex-end; }
  .score-divider {
    width: 1px;
    background: linear-gradient(to bottom, transparent, rgba(255,60,20,0.4), transparent);
  }
  .score-center {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; padding: 8px 20px; gap: 2px;
  }
  .username {
    font-family: 'DM Sans', sans-serif;
    font-size: 0.78rem; font-weight: 600;
    letter-spacing: 0.08em; text-transform: uppercase;
    color: rgba(160,215,240,0.7);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    max-width: 140px;
  }
  .win-stars {
    display: flex; gap: 5px;
  }
  .win-star {
    font-size: 1rem; line-height: 1;
    transition: all 0.3s ease;
  }
  .win-star.earned {
    color: rgba(255,200,0,0.9);
    filter: drop-shadow(0 0 6px rgba(255,200,0,0.5));
    animation: starPop 0.4s cubic-bezier(0.22,1,0.36,1) both;
  }
  .win-star.empty { color: rgba(255,255,255,0.1); }

  /* ── Main Body ── */
  .arena-body {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    /* Mehrzeilige Texte (mobil umgebrochen) zentriert statt linksbündig */
    text-align: center;
    padding: 24px 16px; position: relative; z-index: 1;
  }

  /* ── Category Buttons ── */
  .category-btn {
    background: rgba(255,60,20,0.05);
    border: 1px solid rgba(255,60,20,0.28);
    border-radius: 0.875rem;
    padding: 18px 28px;
    text-align: center; width: 100%;
    transition: all 0.18s ease;
    cursor: pointer;
    position: relative; overflow: hidden;
  }
  .category-btn::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, transparent, rgba(255,60,20,0.7), transparent);
    opacity: 0; transition: opacity 0.18s ease;
  }
  .category-btn:hover {
    background: rgba(255,60,20,0.14);
    border-color: rgba(255,90,40,0.7);
    transform: translateY(-3px);
    box-shadow: 0 12px 32px rgba(255,60,20,0.15);
  }
  .category-btn:hover::before { opacity: 1; }

  /* ── Answer Buttons ── */
  .answer-btn {
    background: rgba(0,212,255,0.04);
    border: 1px solid rgba(0,212,255,0.18);
    border-radius: 0.875rem;
    padding: 14px 20px;
    text-align: left; width: 100%;
    transition: all 0.15s ease;
    cursor: pointer;
    display: flex; align-items: center; gap: 14px;
    position: relative; overflow: hidden;
  }
  .answer-btn:hover:not(:disabled) {
    background: rgba(0,212,255,0.1);
    border-color: rgba(0,212,255,0.55);
    transform: translateX(4px);
  }
  .answer-btn:disabled { cursor: default; }
  .answer-btn.selected {
    background: rgba(0,212,255,0.1);
    border-color: rgba(0,212,255,0.6);
  }
  .answer-btn.correct {
    background: rgba(0,255,120,0.1);
    border-color: rgba(0,255,120,0.65);
    animation: correctFlash 0.6s ease;
  }
  .answer-btn.wrong {
    background: rgba(255,60,20,0.1);
    border-color: rgba(255,60,20,0.6);
    animation: wrongFlash 0.6s ease;
  }
  .answer-key {
    width: 28px; height: 28px; border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em;
    flex-shrink: 0;
    background: rgba(0,212,255,0.08);
    border: 1px solid rgba(0,212,255,0.2);
    color: rgba(0,212,255,0.7);
    transition: all 0.15s ease;
  }
  .answer-btn.correct .answer-key {
    background: rgba(0,255,120,0.15);
    border-color: rgba(0,255,120,0.5);
    color: rgba(0,255,120,0.9);
  }
  .answer-btn.wrong .answer-key {
    background: rgba(255,60,20,0.15);
    border-color: rgba(255,60,20,0.5);
    color: rgba(255,90,50,0.9);
  }
  .answer-btn:hover:not(:disabled) .answer-key {
    background: rgba(0,212,255,0.18);
    border-color: rgba(0,212,255,0.55);
    color: rgba(0,212,255,0.95);
  }

  /* ── Surrender ── */
  .surrender-btn {
    margin-top: 20px;
    background: rgba(255,60,20,0.05);
    border: 1px solid rgba(255,60,20,0.28);
    border-radius: 0.875rem;
    padding: 8px 18px;
    color: rgba(255,100,60,0.75);
    font-size: 0.75rem;
    letter-spacing: 0.12em;
    transition: all 0.18s ease;
    cursor: pointer;
  }
  .surrender-btn:hover {
    background: rgba(255,60,20,0.14);
    border-color: rgba(255,90,40,0.7);
    color: rgba(255,130,80,0.95);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(255,60,20,0.15);
  }
  .dialog-btn-danger {
    background: rgba(255,60,20,0.15);
    border: 1px solid rgba(255,60,20,0.5);
    border-radius: 0.875rem;
    padding: 10px 20px;
    color: rgba(255,110,70,0.95);
    font-size: 0.8rem;
    letter-spacing: 0.1em;
    transition: all 0.18s ease;
    cursor: pointer;
  }
  .dialog-btn-danger:hover {
    background: rgba(255,60,20,0.28);
    border-color: rgba(255,90,40,0.85);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(255,60,20,0.2);
  }
  .dialog-btn-neutral {
    background: rgba(0,212,255,0.04);
    border: 1px solid rgba(140,200,230,0.35);
    border-radius: 0.875rem;
    padding: 10px 20px;
    color: rgba(180,220,240,0.85);
    font-size: 0.8rem;
    letter-spacing: 0.1em;
    transition: all 0.18s ease;
    cursor: pointer;
  }
  .dialog-btn-neutral:hover {
    background: rgba(0,212,255,0.1);
    border-color: rgba(0,212,255,0.55);
    color: rgba(220,240,250,0.95);
    transform: translateY(-2px);
  }

  /* ── Timer Bar ── */
  .timer-bar-track {
    height: 3px; border-radius: 2px;
    background: rgba(255,255,255,0.07);
    overflow: hidden; position: relative;
  }
  .timer-bar-fill {
    height: 100%; border-radius: 2px;
    transition: width 1s linear, background 1s linear;
  }

  /* ── Result Panels ── */
  .round-panel {
    animation: roundBanner 0.5s cubic-bezier(0.22,1,0.36,1) both;
  }
  .outcome-win {
    animation: winGlow 2s ease-in-out infinite;
  }
  .outcome-loss {
    animation: lossShake 0.5s ease both;
  }

  /* ── Card Styling ── */
  .arena-card {
    background: rgba(8,15,28,0.8);
    border: 1px solid rgba(255,60,20,0.18);
    border-radius: 1.25rem;
    backdrop-filter: blur(16px);
    position: relative;
    overflow: hidden;
  }
  .arena-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, transparent, rgba(255,60,20,0.6), transparent);
  }

  /* ── Utility Classes ── */
  .reveal { animation: arenaReveal 0.45s cubic-bezier(0.22,1,0.36,1) both; }
  .pop-in { animation: popIn 0.4s cubic-bezier(0.22,1,0.36,1) both; }
`;
