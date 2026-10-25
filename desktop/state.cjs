const fs = require('node:fs/promises');
const path = require('node:path');
const EMPTY = () => ({schemaVersion:1, lastLesson:0, completed:[], passed:[], bookmarks:[], notes:{}});
function validateState(raw) {
  if (!raw || raw.schemaVersion !== 1 || typeof raw !== 'object' || Array.isArray(raw)) throw Error('Неподдерживаемый формат резервной копии.');
  const lesson = n => Number.isInteger(n) && n >= 0 && n < 26;
  if (!lesson(raw.lastLesson)) throw Error('Некорректный номер главы.');
  const result = EMPTY(); result.lastLesson = raw.lastLesson;
  for (const key of ['completed','passed','bookmarks']) {
    if (!Array.isArray(raw[key]) || raw[key].length > 26 || !raw[key].every(lesson)) throw Error('Некорректный список глав.');
    result[key] = [...new Set(raw[key])];
  }
  if (!raw.notes || typeof raw.notes !== 'object' || Array.isArray(raw.notes) || Object.keys(raw.notes).length > 26) throw Error('Некорректные заметки.');
  for (const [key,value] of Object.entries(raw.notes)) {
    if (!/^\d+$/.test(key) || !lesson(Number(key)) || String(Number(key)) !== key || typeof value !== 'string' || value.length > 20000) throw Error('Некорректная заметка: максимум 20 000 символов на главу.');
    result.notes[key] = value;
  }
  return result;
}
class StateStore {
  constructor(file) { this.file = file; this.queue = Promise.resolve(); this.recovery = null; }
  async load() {
    try { return {state:validateState(JSON.parse(await fs.readFile(this.file,'utf8'))),warning:null}; }
    catch (e) {
      if(e.code === 'ENOENT') return {state:EMPTY(),warning:null};
      // Do not overwrite an unreadable file unless a recovery copy was made.
      this.recovery = this.file + '.recovery-' + Date.now();
      try { await fs.copyFile(this.file,this.recovery); }
      catch { throw Error('Не удалось прочитать данные и создать их защитную копию. Исходный файл сохранён.'); }
      return {state:EMPTY(),warning:'Файл прогресса повреждён. Его копия сохранена: '+this.recovery+'. Можно восстановить резервную копию.'};
    }
  }
  save(raw) {
    const state = validateState(raw);
    const task = this.queue.catch(()=>{}).then(async()=>{
      await fs.mkdir(path.dirname(this.file),{recursive:true});
      const temp=this.file+'.tmp';
      await fs.writeFile(temp,JSON.stringify(state,null,2),'utf8');
      await fs.rename(temp,this.file);
      return state;
    });
    this.queue=task; return task;
  }
}
module.exports={EMPTY,validateState,StateStore};
