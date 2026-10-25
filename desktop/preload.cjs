const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('desktop',{
  load:()=>ipcRenderer.invoke('state:load'),
  save:state=>ipcRenderer.invoke('state:save',state),
  exportBackup:()=>ipcRenderer.invoke('backup:export'),
  importBackup:()=>ipcRenderer.invoke('backup:import'),
  openResource:name=>ipcRenderer.invoke('resource:open',name),
  openExternal:url=>ipcRenderer.invoke('external:open',url)
});
