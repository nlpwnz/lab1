const { _electron: electron }=require('playwright-core');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'kontur-electron-'));
  let app;
  try{
    const launch=()=>electron.launch({args:['--no-sandbox','--disable-gpu','--user-data-dir='+profile,root],env:{...process.env},timeout:45000});
    app=await launch();let page=await app.firstWindow();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.getByRole('heading',{name:'Учиться. Пробовать. Понимать.'}).waitFor();
    await fs.mkdir(path.join(root,'test-results'),{recursive:true});
    await page.screenshot({path:path.join(root,'test-results/electron-home.png')});
    console.log('Runtime product:',await app.evaluate(({app})=>app.getName()));
    assert.equal(await page.evaluate(()=>typeof require),'undefined');
    const course=page.frameLocator('#course-frame');
    await page.locator('.primary[data-lesson]').click();await course.getByRole('heading',{name:'Зачем инженеру ТАУ',exact:true}).waitFor();
    await page.locator('#toggle-notes').click();await page.locator('#lesson-note').fill('Проверка настоящего Electron: уровень = 0,8 м.');
    await page.waitForFunction(()=>document.querySelector('#save-state').textContent.includes('Сохранено'));
    await page.locator('#bookmark').click();await page.waitForFunction(()=>document.querySelector('#save-state').textContent.includes('Сохранено'));
    await page.evaluate(()=>document.querySelector('#course-frame').contentWindow.complete());
    await page.waitForFunction(()=>document.querySelector('#side-count').textContent.startsWith('1 из'));
    const file=path.join(await app.evaluate(({app})=>app.getPath('userData')),'progress.json');
    const saved=JSON.parse(await fs.readFile(file,'utf8'));assert.equal(saved.notes[0],'Проверка настоящего Electron: уровень = 0,8 м.');assert.deepEqual(saved.bookmarks,[0]);
    // Stub only native dialogs; exercise the real IPC, validators, and filesystem.
    const backup=path.join(profile,'backup.json');
    await app.evaluate(({dialog},backup)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:backup});},backup);
    await page.locator('.sidebar-bottom [data-view="settings"]').click();await page.locator('#export-backup').click();
    await page.getByText('Резервная копия сохранена.',{exact:true}).waitFor();
    assert.equal(JSON.parse(await fs.readFile(backup,'utf8')).notes[0],saved.notes[0]);
    const imported={...saved,lastLesson:6,notes:{6:'Восстановленная заметка'}};await fs.writeFile(backup,JSON.stringify(imported));
    await app.evaluate(({dialog},backup)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[backup]});dialog.showMessageBox=async()=>({response:1});},backup);
    await page.locator('#import-backup').click();await page.getByText('Прогресс и заметки восстановлены.',{exact:true}).waitFor();
    assert.equal(JSON.parse(await fs.readFile(file,'utf8')).lastLesson,6);
    assert.equal(JSON.parse(await fs.readFile(path.join(path.dirname(file),'progress.before-import.json'),'utf8')).notes[0],saved.notes[0]);
    assert.deepEqual(errors,[]);await app.close();app=null;
    app=await launch();page=await app.firstWindow();await page.getByRole('heading',{name:'Учиться. Пробовать. Понимать.'}).waitFor();
    await page.locator('nav [data-view="notes"]').click();await page.getByText('Восстановленная заметка',{exact:true}).waitFor();
    await page.locator('nav [data-view="experiments"]').click();await page.locator('[data-experiment="derivative"]').click();
    await page.frameLocator('#course-frame').locator('#visual-frame svg').waitFor();
    await page.locator('nav [data-view="experiments"]').click();await page.locator('[data-experiment="units"]').click();await page.frameLocator('#course-frame').locator('.basics[data-kind="units"] math').waitFor();
    console.log('PASS: real Electron startup, isolated renderer, real IPC saves, backup export/import, recovery before import, restart, embedded animation.');
  }finally{if(app)await app.close();await fs.rm(profile,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
