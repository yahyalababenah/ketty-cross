// ui.mjs
export const LANG = {
  ar: {
    startTitle:'ابدأ اللعب', startDesc:'أسلوب لعب وإحساس قريب من Crossy Road بفيزياء شبكية، جرافيكس نظيف، وصعوبة تتدرّج، مع نهاية للمستوى.',
    lgd1:'🚗 طرق بسيارات', lgd2:'🚆 سكك وقطارات مع إنذار', lgd3:'🌊 أنهار وجذوع حقيقية القوام', lgd4:'🪙 عملات دوّارة',
    start:'ابدأ', how:'الطريقة', ok:'تمام', again:'العب مجددًا',
    pause:'إيقاف مؤقت', resume:'استئناف', share:'شارك',
    endWin:'انتهى المستوى!', endLose:'انتهت اللعبة',
    howTitle:'كيف تلعب',
    howText:'• نقرة/مسافة = للأمام · سحب/أسهم = تحريك. تجنّب السيارات والقطارات. على الأنهار قف على الجذوع. اجمع العملات وواصل حتى خط النهاية.',
    score:'Score', coins:'Coins', best:'Best',
    footer:'موقع جاهز للنشر. انسخ الرابط لعرضه كـ QR على الروبوت.'
  },
  en: {
    startTitle:'Start Playing', startDesc:'Crossy Road–style grid movement, clean graphics, gradual difficulty, and a proper finish line.',
    lgd1:'🚗 Car lanes', lgd2:'🚆 Rails & trains with warning', lgd3:'🌊 Rivers with rideable logs', lgd4:'🪙 Rotating coins',
    start:'Start', how:'How to Play', ok:'OK', again:'Play Again',
    pause:'Pause', resume:'Resume', share:'Share',
    endWin:'Level Complete!', endLose:'Game Over',
    howTitle:'How to Play',
    howText:'• Tap/Space = forward · Swipe/Arrows = move. Avoid cars & trains. Ride logs across rivers. Collect coins and reach the finish.',
    score:'Score', coins:'Coins', best:'Best',
    footer:'Production-ready. Share the link or display a QR on the robot.'
  }
};

export function setLang(l, dom, State){
  const T = LANG[l] || LANG.ar;
  document.documentElement.dir = l==='ar'?'rtl':'ltr';
  document.documentElement.lang = l;

  dom.startTitle.textContent = T.startTitle;
  dom.startDesc.textContent  = T.startDesc;
  dom.lgd1.textContent = T.lgd1;
  dom.lgd2.textContent = T.lgd2;
  dom.lgd3.textContent = T.lgd3;
  dom.lgd4.textContent = T.lgd4;

  dom.startBtn.textContent = T.start;
  dom.howBtn.textContent   = T.how;
  dom.closeHow.textContent = T.ok;
  dom.againBtn.textContent = T.again;
  dom.shareBtn.textContent = T.share;
  dom.howTitle.textContent = T.howTitle;
  dom.howText.textContent  = T.howText;
  dom.endTitle.textContent = State.win? T.endWin : T.endLose;
  dom.footerNote.textContent = T.footer;

  if (dom.pauseBtn) dom.pauseBtn.textContent = State.paused? T.resume : T.pause;
  updatePills(T, State, {scorePill:dom.scorePill, bestPill:dom.bestPill});
}

export function updatePills(T, State, refs){
  refs.scorePill.textContent = `${T.score} ${State.player.score} · ${T.coins} ${State.player.coins}`;
  refs.bestPill.textContent  = `${T.best} ${State.best}`;
}
