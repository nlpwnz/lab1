(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TauBasicsMath=api;})(typeof globalThis==='object'?globalThis:this,()=>{
  const ranges={pressure:{min:0,max:10,unit:'бар',name:'Давление'},temperature:{min:-50,max:150,unit:'°C',name:'Температура'},level:{min:0,max:2,unit:'м',name:'Уровень'}};
  function scale(percent,range){return range.min+percent/100*(range.max-range.min);}
  function compare(start,end,range){return {start:scale(start,range),end:scale(end,range),delta:scale(end,range)-scale(start,range),points:end-start,relative:start===0?null:(end-start)/start*100,current:4+end/100*16};}
  function value(kind,t){if(kind==='rise')return 20+2*t;if(kind==='cool')return 80-3*t;if(kind==='hold')return t<=5?20+2*t:t<=10?30:30-(t-10);throw Error('Неизвестный тренд');}
  function slope(kind,a,b){if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a)throw Error('Вторая точка должна быть правее первой.');return {a:value(kind,a),b:value(kind,b),dt:b-a,dy:value(kind,b)-value(kind,a),speed:(value(kind,b)-value(kind,a))/(b-a)};}
  return {ranges,scale,compare,value,slope};
});
