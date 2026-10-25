/* Only this adapter couples the existing offline course to the desktop shell. */
(() => {
  const send=(type,extra={})=>parent.postMessage({channel:'kontur-course',type,...extra},'*');
  const originalHideLabs=hideLabs;
  hideLabs=function(){TauBasics.stop();originalHideLabs();};
  window.showBasics=function(id){if(!['units','graph'].includes(id))return;hideLabs();slideMode=false;document.body.classList.remove('slides-mode');TauBasics.render(id,document.querySelector('#article'));window.scrollTo(0,0);send('activity',{id});};
  const originalLesson=lesson, originalCheck=check, originalComplete=complete;
  lesson=function(i){originalLesson(i);if(!slideMode&&[1,2].includes(current)){const id=current===1?'units':'graph';const link=document.createElement('button');link.textContent=current===1?'Открыть опыт: шкалы и проценты →':'Открыть опыт: график и скорость →';link.className='basics-link';link.addEventListener('click',()=>showBasics(id));document.querySelector('#article').prepend(link);}send('lesson',{id:current});};
  check=function(i){originalCheck(i);if(i===chapters[current].correct)send('passed',{id:current});};
  complete=function(){originalComplete();send('completed',{id:current});};
  const originalMoveSlide=moveSlide;
  moveSlide=function(d){originalMoveSlide(d);send('lesson',{id:current});};
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
      if(m.kind==='basic')showBasics(m.id);
      if(m.kind==='lesson')lesson(m.id);
      if(m.kind==='visual'&&['derivative','integral','poles','process'].includes(m.id))showVisual(m.id);
      if(m.kind==='lab'&&['tank','first','pid','freq'].includes(m.id))showLabs(m.id);
    }
    if(m.type==='slides')toggleSlides();
    if(m.type==='stop'){hideLabs();}
  });
  send('ready');
})();
