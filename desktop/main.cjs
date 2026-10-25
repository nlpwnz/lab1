const {app,BrowserWindow,ipcMain,dialog,shell,session}=require('electron');
const fs=require('node:fs/promises');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {StateStore,validateState}=require('./state.cjs');
let win,store,loaded;
const appFile=path.join(__dirname,'src/index.html');
const appURL=pathToFileURL(appFile).href;
const courseRoot=pathToFileURL(path.join(__dirname,'content/tau')+path.sep).href;
const single=app.requestSingleInstanceLock();
if(!single) app.quit();
app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.focus();}});
const trusted = event => { if(event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame || event.senderFrame.url !== appURL) throw Error('Недоступно для этого окна.'); };
function handle(name,fn){ipcMain.handle(name,async(e,...args)=>{trusted(e);return fn(...args);});}
function external(url) {
  let parsed;try{parsed=new URL(url);}catch{throw Error('Некорректная ссылка.');}
  if(parsed.protocol!=='https:' || parsed.username || parsed.password) throw Error('Поддерживаются только ссылки HTTPS.');
  return shell.openExternal(parsed.href);
}
app.whenReady().then(async()=>{
  if(!single)return;
  store=new StateStore(path.join(app.getPath('userData'),'progress.json'));
  try { loaded=await store.load(); }
  catch(e){dialog.showErrorBox('Не удалось открыть прогресс',e.message);app.quit();return;}
  // All course assets are bundled. Embedded pages cannot make network requests.
  session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_details,cb)=>cb({cancel:true}));
  session.defaultSession.setPermissionRequestHandler((_wc,_permission,cb)=>cb(false));
  session.defaultSession.setPermissionCheckHandler(()=>false);
  handle('state:load',()=>loaded);
  handle('state:save',async state=>{loaded.state=await store.save(state);return true;});
  handle('backup:export',async()=>{
    await store.queue;
    const result=await dialog.showSaveDialog(win,{title:'Сохранить резервную копию',defaultPath:'kontur-progress.json',filters:[{name:'Резервная копия',extensions:['json']}]});
    if(result.canceled)return {canceled:true};
    await fs.writeFile(result.filePath,JSON.stringify(loaded.state,null,2));return {canceled:false};
  });
  handle('backup:import',async()=>{
    const pick=await dialog.showOpenDialog(win,{title:'Открыть резервную копию',properties:['openFile'],filters:[{name:'Резервная копия',extensions:['json']}]});
    if(pick.canceled)return {canceled:true};
    const file=pick.filePaths[0];if((await fs.stat(file)).size>2*1024*1024)throw Error('Файл слишком большой.');
    const state=validateState(JSON.parse(await fs.readFile(file,'utf8')));
    const confirm=await dialog.showMessageBox(win,{type:'question',buttons:['Отмена','Восстановить'],defaultId:0,cancelId:0,title:'Восстановление прогресса',message:'Заменить текущие отметки и заметки данными из копии?',detail:'Перед заменой текущие данные будут сохранены в progress.before-import.json в папке приложения.'});
    if(confirm.response!==1)return {canceled:true};
    await store.queue;
    await fs.writeFile(path.join(app.getPath('userData'),'progress.before-import.json'),JSON.stringify(loaded.state,null,2));
    loaded.state=await store.save(state);return {canceled:false,state};
  });
  handle('external:open',external);
  handle('resource:open',async name=>{
    const allowed=['textbook.pdf','slides.pdf','visual-guide.pdf'];
    if(!allowed.includes(name))throw Error('Неизвестный документ.');
    // External PDF viewers need a real file outside app.asar.
    const dir=path.join(app.getPath('userData'),'materials');await fs.mkdir(dir,{recursive:true});
    const target=path.join(dir,name);await fs.copyFile(path.join(__dirname,'content/tau',name),target);
    const error=await shell.openPath(target);if(error)throw Error(error);return true;
  });
  win=new BrowserWindow({width:1440,height:950,minWidth:1000,minHeight:700,title:'Контур — инженерная школа',backgroundColor:'#f4f6f8',autoHideMenuBar:true,show:false,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webviewTag:false}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(e,url)=>{if(url!==appURL)e.preventDefault();});
  win.webContents.on('will-frame-navigate',(e)=>{if(e.url!==appURL && !e.url.startsWith(courseRoot))e.preventDefault();});
  win.once('ready-to-show',()=>win.show());
  await win.loadFile(appFile);
});
app.on('window-all-closed',()=>app.quit());
app.on('before-quit',e=>{if(store && !app.flushed){e.preventDefault();store.queue.catch(()=>{}).finally(()=>{app.flushed=true;app.quit();});}});
