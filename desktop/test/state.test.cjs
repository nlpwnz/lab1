const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {StateStore,EMPTY,validateState}=require('../state.cjs');
test('progress and Unicode notes survive restart and ordered rapid writes',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'kontur-state-'));
  try{
    const file=path.join(dir,'profile/progress.json'),store=new StateStore(file);
    assert.deepEqual((await store.load()).state,EMPTY());
    const states=Array.from({length:15},(_,n)=>({...EMPTY(),lastLesson:n,completed:[0,1],passed:[1],bookmarks:[3],notes:{3:'Производная — скорость. '+n}}));
    await Promise.all(states.map(s=>store.save(s)));
    assert.deepEqual((await new StateStore(file).load()).state,states.at(-1));
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('bad backups are rejected without overwriting existing data',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'kontur-invalid-'));
  try{
    const store=new StateStore(path.join(dir,'progress.json'));const s={...EMPTY(),lastLesson:8};await store.save(s);
    for(const bad of [{...s,lastLesson:26},{...s,notes:{'__proto__':'bad',99:'bad'}},{...s,completed:[-1]},{...s,notes:{0:'x'.repeat(20001)}},{...s,schemaVersion:2}])assert.throws(()=>store.save(bad));
    assert.deepEqual((await store.load()).state,s);
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('unreadable progress is preserved in a recovery copy',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'kontur-recovery-'));
  try{
    const file=path.join(dir,'progress.json');await fs.writeFile(file,'broken data');
    const store=new StateStore(file);const result=await store.load();assert.match(result.warning,/повреждён/);
    assert.equal(await fs.readFile(store.recovery,'utf8'),'broken data');
    assert.equal(await fs.readFile(file,'utf8'),'broken data');
    await store.save(EMPTY());assert.equal(await fs.readFile(store.recovery,'utf8'),'broken data');
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('backup validation strips unknown fields and deduplicates chapters',()=>{
  const s=validateState({...EMPTY(),completed:[1,1],unknown:'ignored'});
  assert.deepEqual(s.completed,[1]);assert.equal(s.unknown,undefined);
});
