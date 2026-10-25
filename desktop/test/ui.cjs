const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const root=path.resolve(__dirname,'..');
(async()=>{
  const server=http.createServer(async(req,res)=>{try{const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(root+path.sep))throw Error();const data=await fs.readFile(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json'})[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.statusCode=404;res.end();}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{
      const key='kontur-test';
      window.desktop={
        load:async()=>({state:JSON.parse(localStorage.getItem(key)||'{"schemaVersion":1,"lastLesson":0,"completed":[],"passed":[],"bookmarks":[],"notes":{}}')}),
        save:async state=>{localStorage.setItem(key,JSON.stringify(state));return true;},
        exportBackup:async()=>({canceled:false}),importBackup:async()=>({canceled:true}),openResource:async()=>true,openExternal:async()=>true
      };
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/src/index.html`);
    await page.getByRole('heading',{name:'Учиться. Пробовать. Понимать.'}).waitFor();
    await fs.mkdir(path.join(root,'test-results'),{recursive:true});
    await page.screenshot({path:path.join(root,'test-results/home.png'),fullPage:true});
    await page.locator('nav [data-view="course"]').click();assert.equal(await page.locator('.lesson-row').count(),26);
    await page.getByLabel('Поиск главы').fill('производная');assert.equal(await page.locator('.lesson-row').count(),1);
    await page.locator('.lesson-row').click();
    const frame=page.frameLocator('#course-frame');await frame.getByRole('heading',{name:'Производная: скорость прямо сейчас',exact:true}).waitFor();
    assert.ok(await frame.locator('.katex').count()>0,'Math should render');
    await page.locator('#slides').click();
    await page.evaluate(()=>document.querySelector('#course-frame').contentWindow.moveSlide(3));
    await page.waitForFunction(()=>document.querySelector('#reader-title').textContent.startsWith('5.'));
    await page.evaluate(()=>document.querySelector('#course-frame').contentWindow.moveSlide(-3));
    await page.waitForFunction(()=>document.querySelector('#reader-title').textContent.startsWith('4.'));
    await page.locator('#slides').click();
    await page.locator('#bookmark').click();await page.locator('#toggle-notes').click();
    await page.locator('#lesson-note').fill('Моя заметка: 12 °C за 6 с → 2 °C/с. <script>не выполнять</script>');
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kontur-test')).notes['3'].includes('2 °C/с'));
    await page.evaluate(()=>document.querySelector('#course-frame').contentWindow.complete());
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kontur-test')).completed.includes(3));
    await page.reload();await page.getByRole('heading',{name:'Учиться. Пробовать. Понимать.'}).waitFor();
    await page.locator('nav [data-view="bookmarks"]').click();assert.equal(await page.locator('.lesson-row').count(),1);
    await page.locator('.lesson-row').click();await page.locator('#toggle-notes').click();assert.match(await page.locator('#lesson-note').inputValue(),/2 °C\/с/);
    await page.locator('nav [data-view="notes"]').click();assert.equal(await page.locator('.note-card script').count(),0);assert.match(await page.locator('.note-card').innerText(),/<script>/);
    for(const id of ['units','graph','process','derivative','integral','poles','tank','first','pid','freq']){
      await page.locator('nav [data-view="experiments"]').click();await page.locator(`[data-experiment="${id}"]`).click();
      if(['units','graph'].includes(id))await frame.locator('.basics[data-kind="'+id+'"] svg').waitFor();else if(['process','derivative','integral','poles'].includes(id))await frame.locator('#visual-frame svg').waitFor();else await frame.locator('#chart').waitFor();
      assert.equal(await page.locator('#reader').isVisible(),true);
    }
    await page.locator('nav [data-view="experiments"]').click();await page.locator('[data-experiment="units"]').click();
    await frame.locator('#b-range').selectOption('temperature');
    const setRange=async(id,value)=>page.evaluate(({id,value})=>{const el=document.querySelector('#course-frame').contentDocument.getElementById(id);el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},{id,value});
    await setRange('b-start',0);await setRange('b-end',50);
    await frame.locator('[data-action="walk-next"]').click();await frame.locator('[data-action="walk-next"]').click();await frame.locator('[data-action="walk-next"]').click();
    assert.equal(await frame.locator('#b-walk-count').innerText(),'Шаг 4 из 4');assert.match(await frame.locator('.b-current-step').innerText(),/−50 \+ 100 = 50 °C|-50 \+ 100 = 50 °C/);assert.equal(await frame.locator('[data-action="walk-next"]').isDisabled(),true);
    assert.match(await frame.locator('#b-values').innerText(),/Не определено/);assert.match(await frame.locator('#b-metrics').innerText(),/50 °C/);assert.match(await frame.locator('#b-metrics').innerText(),/12 мА/);
    await frame.locator('#b-answer-0').fill('');await frame.locator('[data-action="check"]').first().click();assert.match(await frame.locator('.b-feedback').first().innerText(),/Введите число/);
    await frame.locator('#b-answer-0').fill('5,0');await frame.locator('[data-action="check"]').first().click();assert.match(await frame.locator('.b-feedback').first().innerText(),/^Верно/);
    await page.evaluate(()=>document.querySelector('#course-frame').contentWindow.scrollTo(0,0));
    await page.screenshot({path:path.join(root,'test-results/scales.png'),fullPage:true});
    await page.locator('nav [data-view="experiments"]').click();await page.locator('[data-experiment="graph"]').click();
    await frame.locator('#b-trend').selectOption('hold');await setRange('b-a',6);await setRange('b-b',9);assert.match(await frame.locator('#b-metrics').innerText(),/0 °C\/с/);
    await setRange('b-a',19);assert.equal(await frame.locator('#b-b').inputValue(),'20');await setRange('b-b',1);assert.equal(await frame.locator('#b-a').inputValue(),'0');
    await frame.locator('[data-action="reset"]').click();await frame.locator('#b-trend').selectOption('cool');
    await frame.locator('[data-action="walk-next"]').click();await frame.locator('[data-action="walk-next"]').click();assert.match(await frame.locator('.b-current-step').innerText(),/Температура в конце ниже/);assert.match(await frame.locator('#b-metrics').innerText(),/−3 °C\/с|-3 °C\/с/);
    await frame.locator('#b-answer-0').fill('3');await frame.locator('[data-action="check"]').first().click();assert.match(await frame.locator('.b-feedback').first().innerText(),/^Пока неверно/);
    await frame.locator('#b-answer-0').fill('−3');await frame.locator('[data-action="check"]').first().click();assert.match(await frame.locator('.b-feedback').first().innerText(),/^Верно/);
    await frame.locator('[data-action="play"]').click();await page.waitForFunction(()=>document.querySelector('#course-frame').contentDocument.querySelector('#b-values').textContent.includes('t = 0,') );
    await frame.locator('[data-action="play"]').click();assert.equal(await frame.locator('[data-action="play"]').innerText(),'Пуск');
    await page.evaluate(()=>document.querySelector('#course-frame').contentWindow.scrollTo(0,0));
    await page.screenshot({path:path.join(root,'test-results/graph.png'),fullPage:true});
    await frame.locator('[data-action="back"]').click();await frame.getByRole('heading',{name:'Графики и наклон',exact:true}).waitFor();await frame.locator('.basics-link').click();await frame.locator('.basics[data-kind="graph"]').waitFor();
    await page.locator('nav [data-view="experiments"]').click();await page.screenshot({path:path.join(root,'test-results/experiments.png'),fullPage:true});
    await page.setViewportSize({width:1000,height:700});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No horizontal overflow at minimum size');
    assert.deepEqual(errors,[]);console.log('PASS: 26 chapters, math, search, notes, bookmarks, restart persistence, escaping, all 10 activities; scales, signed slopes, invalid intervals, numeric answers and playback, minimum window width.');
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
