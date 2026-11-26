'use strict';
(function (IW) {
  const B = IW.battle;
  function route() {
    const h = (location.hash || '#menu').slice(1), ch = IW.chapters[h];
    if (ch) { const c = IW.save.ch[h] || {}, n = ch.stages.filter(s => s.kind === 'practice').length; B.open(ch, (c.prac || 0) >= n ? ch.stages.findIndex(s => s.kind !== 'practice') : (c.prac || 0)); }
    else { B.close(); IW.$('app').innerHTML = '<div class="menu"><h1>Immune Wars</h1><a href="#skin">skin</a> <a href="#airway">airway</a></div>'; }
  }
  addEventListener('hashchange', route); route();
})(window.IW);
