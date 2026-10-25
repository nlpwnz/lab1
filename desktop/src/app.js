(() => {
  const $=s=>document.querySelector(s), content=$('#content'),frame=$('#course-frame');
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const catalog=window.CATALOG;
  const groups=['Начало и математика','Модели и поведение систем','Регуляторы и настройка','Практика инженера АСУ ТП'];
  const labels={home:'Главная',course:'Курс ТАУ',experiments:'Опыты и анимации',notes:'Мои заметки',bookmarks:'Закладки',settings:'Данные и материалы',reader:'Курс ТАУ'};
  const experiments=[
    {id:'units',kind:'basic',title:'Шкалы, единицы и проценты',tag:'НАЧИНАЕМ С НУЛЯ · НОВОЕ',text:'Свяжите физическую величину, проценты диапазона и сигнал 4–20 мА. Различайте проценты и процентные пункты.',line:'M10 70H290M50 30V80M150 15V80M250 30V80',chapter:1},
    {id:'graph',kind:'basic',title:'Читаем график: изменение и скорость',tag:'МАТЕМАТИКА С НУЛЯ · НОВОЕ',text:'Выберите две точки на тренде и найдите изменение температуры, время и среднюю скорость. Сравните нагрев, выдержку и охлаждение.',line:'M10 70L110 20H200L290 60',chapter:2},
    {id:'process',kind:'visual',title:'Путь сигнала по контуру',tag:'ОБРАТНАЯ СВЯЗЬ',text:'Проследите путь от задания и измерения до команды исполнительному механизму.',line:'M10 60H65V25H120V60H175V25H230V60H290',chapter:0},
    {id:'derivative',kind:'visual',title:'Производная без загадок',tag:'МАТЕМАТИКА С НУЛЯ',text:'Приближайте две точки на кривой и наблюдайте, как средняя скорость становится мгновенной.',line:'M10 78Q150 85 290 10',chapter:3},
    {id:'integral',kind:'visual',title:'Интеграл: собрать целое',tag:'НАКОПЛЕНИЕ',text:'Меняйте число прямоугольников под графиком и сравнивайте приближение с точным значением.',line:'M10 75H45V60H80V46H115V36H150V28H185V21H220V17H255V14H290',chapter:4},
    {id:'poles',kind:'visual',title:'Почему колебания затухают',tag:'УСТОЙЧИВОСТЬ',text:'Перемещайте полюсы и связывайте их положение с затуханием и ростом колебаний.',line:'M10 45Q30 0 50 45T90 45T130 45T170 45T210 45T250 45T290 45',chapter:12},
    {id:'tank',kind:'lab',title:'Бак: приток и отток',tag:'ЛАБОРАТОРИЯ 01',text:'Изменяйте расходы и наблюдайте накопление. Предскажите уровень до запуска опыта.',line:'M60 12V78H240V12M60 50H240',chapter:7},
    {id:'first',kind:'lab',title:'Инерция и запаздывание',tag:'ЛАБОРАТОРИЯ 02',text:'Сравните усиление, постоянную времени и задержку по отклику объекта на ступень.',line:'M10 80H65C95 80 100 18 170 18H290',chapter:8},
    {id:'pid',kind:'lab',title:'Настроить П, ПИ и ПИД',tag:'ЛАБОРАТОРИЯ 03',text:'Сравните режимы на одном объекте, исследуйте насыщение и отдельные вклады P, I, D.',line:'M10 80C50 80 55 -2 90 12S115 49 145 33S180 15 210 22S260 26 290 24',chapter:15},
    {id:'freq',kind:'lab',title:'Частота: амплитуда и фаза',tag:'ЛАБОРАТОРИЯ 04',text:'Меняйте частоту воздействия и исследуйте ослабление сигнала и фазовое запаздывание.',line:'M10 45Q32 -8 55 45T100 45T145 45T190 45T235 45T280 45',chapter:17}
  ];
  let state,view='home',active={kind:'lesson',id:0},ready=false,pendingOpen=null,pendingSave=Promise.resolve(),saveFailed=false,toastTimer;
  const send=message=>frame.contentWindow.postMessage({channel:'kontur-shell',...message},'*');
  const toast=message=>{clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,6000);};
  function persist(){
    const snapshot=JSON.parse(JSON.stringify(state));$('#save-state').textContent='Сохранение…';
    const attempt=pendingSave.catch(()=>{}).then(()=>window.desktop.save(snapshot));
    pendingSave=attempt;
    attempt.then(()=>{if(pendingSave===attempt){saveFailed=false;$('#save-state').textContent='✓ Сохранено на компьютере';$('#save-state').classList.remove('error');}}).catch(e=>{saveFailed=true;$('#save-state').textContent='Не удалось сохранить';$('#save-state').classList.add('error');toast('Ошибка сохранения: '+e.message);});
    updateProgress();return attempt;
  }
  function updateProgress(){
    $('#side-progress').style.width=(state.completed.length/26*100)+'%';
    $('#side-count').textContent=state.completed.length+' из 26 глав прочитано';
  }
  function heading(title,sub,badge=''){return `<div class="page-heading"><div><div class="tiny-label">ВАШ ПУТЬ В АСУ ТП</div><h1>${title}</h1><p class="subline">${sub}</p></div>${badge?`<span class="pill">${badge}</span>`:''}</div>`;}
  function tankArt(){return `<svg viewBox="0 0 400 270" role="img" aria-label="Схема учебного контура: регулятор управляет подачей в бак, датчик измеряет уровень"><defs><pattern id="grid" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#bfd0c4"/></pattern></defs><rect width="400" height="270" fill="url(#grid)"/><path d="M174 63V214H325V63" fill="#f6faf6" stroke="#668f7e" stroke-width="3"/><path d="M177 143Q213 134 250 143T322 143V211H177Z" fill="#b0cfc7"/><path d="M177 143Q213 134 250 143T322 143" fill="none" stroke="#508e80" stroke-width="2"/><path d="M85 86H203V110M325 184H373" fill="none" stroke="#6f9483" stroke-width="7" stroke-linejoin="round"/><path d="M359 177L372 184L359 191" fill="none" stroke="#4f7564" stroke-width="2"/><rect x="27" y="112" width="107" height="57" rx="10" fill="#fff" stroke="#bed1c2"/><text x="80" y="137" text-anchor="middle" fill="#477261" font-size="10">РЕГУЛЯТОР</text><text x="80" y="155" text-anchor="middle" fill="#1d5342" font-size="14">r − y = e</text><path d="M80 112V86M134 141H154V239H273V191" fill="none" stroke="#729484" stroke-dasharray="4 4" stroke-width="1.5"/><circle cx="273" cy="183" r="10" fill="#f8f1df" stroke="#b69b65"/><text x="250" y="121" text-anchor="middle" fill="#4b7866" font-size="12">Уровень y</text><text x="209" y="40" fill="#709282" font-size="10">ОБЪЕКТ УПРАВЛЕНИЯ</text><rect x="256" y="232" width="118" height="29" rx="7" fill="#f7faf6" stroke="#cbdace"/><text x="315" y="251" text-anchor="middle" fill="#567965" font-size="10">Измерение → действие</text></svg>`;}
  function home(){
    const c=catalog[state.lastLesson];
    return heading('Учиться. Пробовать. Понимать.','Инженерные знания начинаются с понятного опыта.','3–5 ЧАСОВ В НЕДЕЛЮ')+`
    <section class="hero"><div class="hero-copy"><div class="tiny-label">01 / ТЕОРИЯ АВТОМАТИЧЕСКОГО УПРАВЛЕНИЯ</div><h2>Разберитесь,<br>как работает управление</h2><p>От уровня воды в баке — к моделям, обратной связи и настройке промышленного контура.</p><button class="primary" data-lesson="${state.lastLesson}">${state.completed.length||state.lastLesson?'Продолжить обучение':'Начать с первой главы'} <span>→</span></button></div><div class="hero-figure">${tankArt()}</div></section>
    <div class="stats"><div class="stat"><span class="stat-icon">▤</span><div><strong>${state.completed.length}<span class="subline"> / 26</span></strong><span class="label">глав отмечено прочитанными</span></div></div><div class="stat"><span class="stat-icon">✓</span><div><strong>${state.passed.length}</strong><span class="label">вопросов отвечено верно</span></div></div><div class="stat"><span class="stat-icon">◉</span><div><strong>${experiments.length}</strong><span class="label">интерактивных модулей</span></div></div></div>
    <div class="home-bottom"><section class="panel"><div class="section-head"><h2>Как проходит обучение</h2><span class="pill">В СВОЁМ ТЕМПЕ</span></div><div class="step-row"><span class="step-number">1</span><div><strong>Понять идею</strong><small>Объяснение, схема и разобранный пример</small></div><span>Теория</span></div><div class="step-row"><span class="step-number">2</span><div><strong>Проверить на опыте</strong><small>Прогноз → изменение параметров → вывод</small></div><span>Практика</span></div><div class="step-row"><span class="step-number">3</span><div><strong>Решить самостоятельно</strong><small>Задачи, проверка и собственная заметка</small></div><span>Закрепление</span></div></section><section class="panel"><div class="next-label">ВАША ТЕКУЩАЯ ГЛАВА · ${String(c.id+1).padStart(2,'0')}</div><div class="next-title">${esc(c.title)}</div><p class="next-desc">${esc(c.goal)}</p><div class="next-footer"><button class="text-button" data-lesson="${c.id}">Открыть главу →</button><button class="text-button" data-view="course">Весь курс</button></div></section></div><p class="about-line">ТАУ — первый раздел школы. В дальнейшем здесь можно разместить КИПиА, электротехнику и программирование ПЛК. Сейчас доступен курс ТАУ.</p>`;
  }
  function row(c){return `<button class="lesson-row" data-lesson="${c.id}"><span class="lesson-index">${String(c.id+1).padStart(2,'0')}</span><span><strong>${esc(c.title)}</strong><small>${esc(c.goal)}</small></span><span class="lesson-status ${state.completed.includes(c.id)?'done':''}">${state.completed.includes(c.id)?'✓ Прочитано':'Открыть →'}${state.bookmarks.includes(c.id)?' · ☆':''}</span></button>`;}
  function course(){return heading('ТАУ с нуля','26 глав · математика, модели, регуляторы и промышленная практика','РАЗДЕЛ 01')+`<div class="search-row"><input type="search" id="search" aria-label="Поиск главы" placeholder="Найти тему: производная, ПИД, устойчивость…"><button class="filter-button" id="unfinished" aria-pressed="false">Непрочитанные</button></div><div id="lesson-list"></div>`;}
  function filterLessons(){
    const query=$('#search').value.toLocaleLowerCase('ru').trim(), only=$('#unfinished').getAttribute('aria-pressed')==='true';
    const matches=catalog.filter(c=>(c.title+' '+c.goal).toLocaleLowerCase('ru').includes(query)&&(!only||!state.completed.includes(c.id)));
    $('#lesson-list').innerHTML=matches.length?groups.map((name,i)=>{const rows=matches.filter(c=>c.group===i);return rows.length?`<div class="module-heading"><span>0${i+1}</span><h2>${name}</h2></div>${rows.map(row).join('')}`:'';}).join(''):'<div class="empty">Таких глав не найдено. Попробуйте другое слово или отключите фильтр.</div>';
  }
  function experimentPage(){return heading('Понять через действие','Меняйте параметры и наблюдайте связь между формулой и процессом.',experiments.length+' МОДУЛЕЙ ДОСТУПНО')+`<div class="experiment-grid">${experiments.map(e=>`<article class="experiment-card"><div class="experiment-art"><svg viewBox="0 0 310 90" aria-hidden="true"><path d="M10 5V80H300" fill="none" stroke="#c1d7cb"/><path d="${e.line}" fill="none" stroke="#518e77" stroke-width="3" stroke-linecap="round"/></svg></div><div class="experiment-copy"><div class="tiny-label">${e.tag}</div><h3>${e.title}</h3><p>${e.text}</p><div class="experiment-footer"><button class="secondary" data-experiment="${e.id}">Открыть опыт →</button><small>К главе ${e.chapter+1}</small></div></div></article>`).join('')}</div><div class="info-strip">Сейчас доступны 6 живых объяснений и 4 лаборатории. Отдельная анимация для каждой из 26 тем — следующий этап развития курса. Изучение главы и правильный ответ на один вопрос не означают полного освоения темы.</div>`;}
  function notes(){const ids=Object.keys(state.notes).filter(id=>state.notes[id].trim());return heading('Мои заметки','Ваши объяснения, вопросы и выводы из опытов.')+(ids.length?ids.map(id=>`<article class="note-card"><h3>${Number(id)+1}. ${esc(catalog[id].title)}</h3><p>${esc(state.notes[id])}</p><button class="text-button" data-note="${id}">Открыть и редактировать →</button></article>`).join(''):'<div class="empty">Пока нет заметок. Откройте главу и нажмите «Заметка», чтобы записать свой первый вывод.</div>');}
  function bookmarks(){return heading('Закладки','Темы, к которым вы хотите вернуться.')+(state.bookmarks.length?state.bookmarks.map(id=>row(catalog[id])).join(''):'<div class="empty">Откройте главу и нажмите «Закладка». Она появится здесь.</div>');}
  function settings(){return heading('Данные и материалы','Всё необходимое для занятий хранится на вашем компьютере.')+`<div class="settings-grid"><section class="panel"><h2>Ваш прогресс</h2><p>Отметки, заметки и последняя открытая глава сохраняются автоматически. Создайте резервную копию для переноса на другой компьютер.</p><div class="button-row"><button class="primary" id="export-backup">Сохранить копию</button><button class="secondary" id="import-backup">Восстановить</button></div><p>Восстановление заменяет текущие данные после подтверждения. Перед заменой приложение сохраняет предыдущий прогресс.</p></section><section class="panel"><h2>Материалы для чтения</h2><ul class="materials"><li><button data-resource="textbook.pdf">Учебник ТАУ · PDF ↗</button></li><li><button data-resource="slides.pdf">Презентации · 78 слайдов ↗</button></li><li><button data-resource="visual-guide.pdf">Иллюстрированный практикум · PDF ↗</button></li></ul><p>Откроются в вашей программе для чтения PDF. Интернет не нужен.</p></section></div><section class="panel"><h2>Что означает прогресс</h2><p class="subline">«Прочитано» — ваша отметка в конце главы. «Вопрос отвечен верно» — правильный ответ на контрольный вопрос главы, в том числе после подсказки или повторной попытки. Это разные отметки; они не заменяют самостоятельное решение задач и отсроченную проверку.</p></section><p class="about-line">Контур · версия 0.2.0 · Windows 10/11, x64.<br>Учебные модели предназначены для обучения. Реальные настройки зависят от оборудования и технологических ограничений.</p>`;}
  function navigate(next){
    if(!state)return;
    view=next;$('#crumb').textContent=labels[next]||labels.home;
    document.querySelectorAll('[data-view]').forEach(el=>el.classList.toggle('active',el.dataset.view===(next==='reader'?'course':next)));
    $('#reader').hidden=next!=='reader';content.hidden=next==='reader';
    if(next==='reader')return;
    if(ready)send({type:'stop'});pendingOpen=null;
    const pages={home,course,experiments:experimentPage,notes,bookmarks,settings};content.innerHTML=(pages[next]||home)();
    if(next==='course')filterLessons();window.scrollTo(0,0);
  }
  function toolbar(){
    const lesson=active.kind==='lesson';const c=catalog[state.lastLesson];
    $('#reader-title').textContent=lesson?`${c.id+1}. ${c.title}`:(experiments.find(e=>e.id===active.id)?.title||'Опыт');
    $('#bookmark').hidden=!lesson;$('#slides').hidden=!lesson;$('#toggle-notes').hidden=!lesson;
    $('#bookmark').textContent=state.bookmarks.includes(state.lastLesson)?'★ В закладках':'☆ Закладка';
    $('#lesson-note').value=state.notes[state.lastLesson]||'';
    if(!lesson)$('#reader-notes').hidden=true;
  }
  function openLesson(id,withNote=false){
    if(!Number.isInteger(id)||id<0||id>=26)return;
    active={kind:'lesson',id};state.lastLesson=id;persist();navigate('reader');toolbar();$('#reader-notes').hidden=!withNote;
    pendingOpen={type:'open',...active,completed:state.completed};if(ready){send(pendingOpen);pendingOpen=null;}
  }
  function openExperiment(id){const e=experiments.find(e=>e.id===id);if(!e)return;active={kind:e.kind,id:e.id};navigate('reader');toolbar();pendingOpen={type:'open',...active,completed:state.completed};if(ready){send(pendingOpen);pendingOpen=null;}}
  document.addEventListener('click',async e=>{
    const b=e.target.closest('button,a');if(!b||!state)return;
    try{
      if(b.classList.contains('brand')){e.preventDefault();navigate('home');}
      if(b.dataset.view)navigate(b.dataset.view);
      if(b.dataset.lesson!==undefined)openLesson(Number(b.dataset.lesson));
      if(b.dataset.note!==undefined)openLesson(Number(b.dataset.note),true);
      if(b.dataset.experiment)openExperiment(b.dataset.experiment);
      if(b.dataset.resource)await window.desktop.openResource(b.dataset.resource);
      if(b.id==='back-course')navigate('course');
      if(b.id==='slides')send({type:'slides'});
      if(b.id==='toggle-notes')$('#reader-notes').hidden=!$('#reader-notes').hidden;
      if(b.id==='bookmark'){const id=state.lastLesson;state.bookmarks=state.bookmarks.includes(id)?state.bookmarks.filter(n=>n!==id):[...state.bookmarks,id];persist();toolbar();}
      if(b.id==='unfinished'){const yes=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',String(yes));b.classList.toggle('active',yes);filterLessons();}
      if(b.id==='export-backup'){await pendingSave;if(saveFailed)throw Error('Сначала необходимо сохранить последние изменения.');const r=await window.desktop.exportBackup();if(!r.canceled)toast('Резервная копия сохранена.');}
      if(b.id==='import-backup'){await pendingSave;const r=await window.desktop.importBackup();if(!r.canceled){state=r.state;updateProgress();navigate('settings');toast('Прогресс и заметки восстановлены.');}}
    }catch(error){toast(error.message);}
  });
  document.addEventListener('input',e=>{
    if(e.target.id==='search')filterLessons();
    if(e.target.id==='lesson-note'){state.notes[state.lastLesson]=e.target.value;persist();}
  });
  addEventListener('message',async e=>{
    if(e.source!==frame.contentWindow||e.data?.channel!=='kontur-course')return;
    const m=e.data;
    if(m.type==='ready'){ready=true;if(pendingOpen){send(pendingOpen);pendingOpen=null;}return;}
    if(!state)return;
    const validId=Number.isInteger(m.id)&&m.id>=0&&m.id<26;
    if(m.type==='lesson'&&validId){state.lastLesson=m.id;active={kind:'lesson',id:m.id};toolbar();persist();}
    if(['completed','passed'].includes(m.type)&&validId){const key=m.type==='completed'?'completed':'passed';if(!state[key].includes(m.id))state[key].push(m.id);persist();}
    if(m.type==='catalog')navigate('course');
    if(m.type==='activity'){const x=experiments.find(x=>x.id===m.id);if(x){active={kind:x.kind,id:x.id};toolbar();}}
    try{
      if(m.type==='resource')await window.desktop.openResource(m.name);
      if(m.type==='external')await window.desktop.openExternal(m.url);
    }catch(error){toast(error.message);}
  });
  async function start(){
    if(!window.desktop){$('#warning').hidden=false;$('#warning').textContent='Откройте приложение «Kontur Learning» через установленный ярлык. Этот файл — часть desktop-приложения.';$('#save-state').textContent='Приложение не запущено';return;}
    try{const result=await window.desktop.load();state=result.state;updateProgress();if(result.warning){$('#warning').textContent=result.warning;$('#warning').hidden=false;}$('#save-state').textContent='✓ Сохранение на компьютере';navigate('home');}catch(e){$('#warning').hidden=false;$('#warning').textContent=e.message;$('#save-state').textContent='Ошибка загрузки данных';}
  }
  start();
})();
