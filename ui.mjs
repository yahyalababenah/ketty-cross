// src/ui.mjs

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

/**
 * يحدّث نصوص الواجهة حسب اللغة + حالة اللعبة
 * @param {string} l 'ar' | 'en'
 * @param {object} dom مرجع عناصر DOM التي مررتها من main.mjs
 * @param {object} State الحالة العامة (نستعمل win/paused)
 */
export function setLang(l, dom, State){
  const L = LANG[l] || LANG.ar;   // ✅ ثبّت المتغير كـ L ونستخدمه لاحقًا
  document.documentElement.dir  = l==='ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = l;

  dom.startTitle.textContent = L.startTitle;
  dom.startDesc.textContent  = L.startDesc;
  dom.lgd1.textContent = L.lgd1;
  dom.lgd2.textContent = L.lgd2;
  dom.lgd3.textContent = L.lgd3;
  dom.lgd4.textContent = L.lgd4;

  dom.startBtn.textContent   = L.start;
  dom.howBtn.textContent     = L.how;
  dom.closeHow.textContent   = L.ok;
  dom.againBtn.textContent   = L.again;
  dom.shareBtn.textContent   = L.share;

  dom.howTitle.textContent   = L.howTitle;
  dom.howText.textContent    = L.howText;

  dom.endTitle.textContent   = State?.win ? L.endWin : L.endLose;
  dom.footerNote.textContent = L.footer;

  if (dom.pauseBtn) dom.pauseBtn.textContent = State?.paused ? L.resume : L.pause;

  // حدّث الحصيلة
  updatePills(L, State, {scorePill: dom.scorePill, bestPill: dom.bestPill});
}

/**
 * يحدّث عدّادات Score/Best/Coins
 */
export function updatePills(L, State, {scorePill, bestPill}){
  if (scorePill) scorePill.textContent = `${L.score} ${State.player.score} · ${L.coins} ${State.player.coins}`;
  if (bestPill)  bestPill.textContent  = `${L.best} ${State.best}`;
}
