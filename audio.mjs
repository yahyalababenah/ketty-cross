// src/audio.mjs
export class Sound {
  constructor(){ this.ctx=null; this.vol=0.25; }
  _ensure(){ if(!this.ctx){ this.ctx=new (window.AudioContext||window.webkitAudioContext)(); } }
  beep(f=440,d=0.06,t='square',v=this.vol){
    this._ensure(); const c=this.ctx; const t0=c.currentTime;
    const o=c.createOscillator(); const g=c.createGain();
    o.type=t; o.frequency.setValueAtTime(f,t0);
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.exponentialRampToValueAtTime(v,t0+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+d);
    o.connect(g).connect(c.destination); o.start(t0); o.stop(t0+d+0.01);
  }
  move(){ this.beep(740,0.035,'square',0.18); }
  coin(){ this.beep(880,0.05,'triangle',0.22); this.beep(1320,0.05,'triangle',0.18); if(navigator.vibrate) try{navigator.vibrate([8,16]);}catch{} }
  crash(){ this.beep(140,0.12,'sawtooth',0.28); if(navigator.vibrate) try{navigator.vibrate([16,64,16]);}catch{} }
  splash(){ this.beep(220,0.09,'sine',0.2); if(navigator.vibrate) try{navigator.vibrate([8,16]);}catch{} }
  win(){ this.beep(660,0.07,'triangle',0.24); setTimeout(()=>this.beep(880,0.09,'triangle',0.24),90); setTimeout(()=>this.beep(1100,0.11,'triangle',0.24),200); if(navigator.vibrate) try{navigator.vibrate([20,40,20]);}catch{} }
}
