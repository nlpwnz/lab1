/* Only this adapter couples the existing offline course to the desktop shell. */
(() => {
  const send=(type,extra={})=>parent.postMessage({channel:'kontur-course',type,...extra},'*');
  const originalLesson=lesson, originalCheck=check, originalComplete=complete;
  lesson=function(i){originalLesson(i);send('lesson',{id:current});};
  check=function(i){originalCheck(i);if(i===chapters[current].correct)send('passed',{id:current});};
  complete=function(){originalComplete();send('completed',{id:current});};
  home=function(){send('catalog');};
  const originalVisual=showVisual, originalLabs=showLabs;
  showVisual=function(id){originalVisual(id);send('activity',{id});};
  showLabs=function(id='pid'){originalLabs(id);send('activity',{id});};
  document.addEventListener('click',e=>{
    const a=e.target.closest('a[href]');if(!a)return;
    const href=a.getAttribute('href');
    if(/^https?:/.test(href)){e.preventDefault();send('external',{url:href});}
    if(/\.pdf$/.test(href)||href==='slides.html'){e.preventDefault();send('resource',{name:href==='slides.html'?'slides.pdf':href});}
  });
  addEventListener('message',e=>{
    if(e.source!==parent||e.data?.channel!=='kontur-shell')return;
    const m=e.data;
    if(m.type==='open'){
      done=Array.isArray(m.completed)?m.completed:[];slideMode=false;
      if(m.kind==='lesson')lesson(m.id);
      if(m.kind==='visual'&&['derivative','integral','poles','process'].includes(m.id))showVisual(m.id);
      if(m.kind==='lab'&&['tank','first','pid','freq'].includes(m.id))showLabs(m.id);
    }
    if(m.type==='slides')toggleSlides();
    if(m.type==='stop'){hideLabs();}
  });
  send('ready');
})();
