const {test}=require('node:test');
const assert=require('node:assert/strict');
const {ranges,scale,compare,value,slope}=require('../content/tau/basics-math.js');
test('sensor scaling respects both range boundaries and a nonzero lower limit',()=>{
  assert.equal(scale(0,ranges.pressure),0);assert.equal(scale(100,ranges.pressure),10);
  assert.equal(scale(0,ranges.temperature),-50);assert.equal(scale(100,ranges.temperature),150);assert.equal(scale(60,ranges.temperature),70);
  assert.equal(scale(50,ranges.level),1);
  assert.equal(compare(0,0,ranges.pressure).current,4);assert.equal(compare(0,100,ranges.pressure).current,20);
});
test('percentage points, relative growth and physical changes are different',()=>{
  const v=compare(40,60,ranges.pressure);assert.equal(v.points,20);assert.equal(v.relative,50);assert.equal(v.delta,2);assert.equal(v.current,13.6);
  assert.equal(compare(0,50,ranges.pressure).relative,null);
  assert.equal(compare(60,40,ranges.pressure).points,-20);
  assert.equal(compare(40,60,ranges.temperature).delta,40);
});
test('graph examples cover warming, cooling, plateau and intervals across corners',()=>{
  assert.equal(slope('rise',2,8).speed,2);assert.equal(slope('cool',2,8).speed,-3);
  assert.equal(slope('hold',6,9).speed,0);assert.equal(slope('hold',10,20).speed,-1);
  const crossing=slope('hold',2,12);assert.equal(crossing.dy,4);assert.equal(crossing.speed,0.4);
  assert.equal(value('hold',5),30);assert.equal(value('hold',10),30);
  assert.throws(()=>slope('rise',5,5));assert.throws(()=>slope('rise',8,2));
});
