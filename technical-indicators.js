(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.OpportunityTechnical=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const DAY_MS=86400000;
  function normalizeDailyPoints(rawPoints){
    const byDay=new Map();
    for(const point of (Array.isArray(rawPoints)?rawPoints:[])){
      const rawTime=Number(point&&point.t),close=Number(point&&point.c);
      if(!Number.isFinite(rawTime)||!Number.isFinite(close)||close<=0)continue;
      const milliseconds=rawTime<1e12?rawTime*1000:rawTime;
      const date=new Date(milliseconds);
      if(Number.isNaN(date.getTime()))continue;
      const day=date.toISOString().slice(0,10);
      const timestamp=Date.parse(day+'T00:00:00Z');
      const previous=byDay.get(day);
      // Pour les données intrajournalières (ex. CoinGecko), retenir le dernier point UTC du jour.
      if(!previous||milliseconds>=previous.sourceTime)byDay.set(day,{t:timestamp,c:close,sourceTime:milliseconds});
    }
    return [...byDay.values()].sort((a,b)=>a.t-b.t).map(({t,c})=>({t,c}));
  }
  function smaPoints(points,assetType,period){
    const length=Number.isInteger(period)&&period>0?period:200;
    const maxGapDays=assetType==='crypto'?1:10;
    const output=Array(Array.isArray(points)?points.length:0).fill(null);
    let sum=0,segmentStart=0;
    for(let i=0;i<output.length;i++){
      const point=points[i],time=Number(point&&point.t),close=Number(point&&point.c);
      if(!Number.isFinite(time)||!Number.isFinite(close)||close<=0){
        sum=0;segmentStart=i+1;continue;
      }
      if(i>0){
        const previous=points[i-1],previousTime=Number(previous&&previous.t);
        const gap=(time-previousTime)/DAY_MS;
        if(!Number.isFinite(gap)||gap<=0||gap>maxGapDays){
          sum=0;segmentStart=i;
        }
      }
      sum+=close;
      if(i-length>=segmentStart)sum-=Number(points[i-length].c);
      if(i-segmentStart+1>=length)output[i]=sum/length;
    }
    return output;
  }
  return Object.freeze({normalizeDailyPoints,smaPoints});
});
