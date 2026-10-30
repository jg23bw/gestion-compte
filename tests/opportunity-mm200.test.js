'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {normalizeDailyPoints,smaPoints}=require('../technical-indicators.js');
const DAY=86400000;
const points=(count,start=Date.UTC(2025,0,1),value=10)=>Array.from({length:count},(_,i)=>({t:start+i*DAY,c:value+i}));
test('SMA 200 is null before 200 valid daily observations',()=>{
  const result=smaPoints(points(199), 'crypto',200);
  assert.equal(result.length,199);
  assert.ok(result.every(value=>value===null));
});
test('SMA 200 averages exactly the last 200 closes',()=>{
  const source=points(205);
  const result=smaPoints(source,'crypto',200);
  assert.equal(result[198],null);
  assert.equal(result[199],(10+209)/2);
  assert.equal(result[204],(15+214)/2);
});
test('crypto gap invalidates the affected 200-day window',()=>{
  const source=points(205);
  source[100].t+=DAY;
  const result=smaPoints(source,'crypto',200);
  assert.equal(result[199],null);
  assert.equal(result[204],null);
});
test('stock market weekends and ordinary holidays are allowed',()=>{
  const source=Array.from({length:200},(_,i)=>({t:Date.UTC(2025,0,1)+i*DAY+Math.floor(i/5)*2*DAY,c:100}));
  assert.equal(smaPoints(source,'stock',200)[199],100);
});
test('stock gap greater than ten days invalidates the window',()=>{
  const source=points(205);
  source[100].t+=11*DAY;
  assert.equal(smaPoints(source,'stock',200)[199],null);
});
test('invalid and non-positive closes break the window; no interpolation',()=>{
  const source=points(201);
  source[100].c=0;
  const result=smaPoints(source,'crypto',200);
  assert.equal(result[199],null);
  assert.equal(result[200],null);
});
test('normalization sorts dates, removes duplicate UTC days and keeps latest intraday point',()=>{
  const day=Date.UTC(2025,0,1);
  const result=normalizeDailyPoints([
    {t:day+12*3600000,c:12},
    {t:day+4*3600000,c:4},
    {t:day+DAY,c:13},
    {t:day- DAY,c:-1},
    {t:day+2*DAY,c:NaN}
  ]);
  assert.deepEqual(result,[{t:day,c:12},{t:day+DAY,c:13}]);
});
test('normalization accepts seconds and milliseconds timestamps',()=>{
  const day=Date.UTC(2025,0,1);
  assert.deepEqual(normalizeDailyPoints([{t:day/1000,c:10},{t:day+DAY,c:11}]),[
    {t:day,c:10},{t:day+DAY,c:11}
  ]);
});

test('SMA recovers only after a full valid window following a data gap',()=>{
  const source=points(405);
  source[100].t+=2*DAY;
  const result=smaPoints(source,'crypto',200);
  assert.equal(result[299],null);
  assert.equal(result[300],(source[101].c+source[300].c)/2);
  assert.ok(Number.isFinite(result[300]));
});
test('unsorted and duplicate daily observations normalize deterministically',()=>{
  const day=Date.UTC(2025,4,1);
  const result=normalizeDailyPoints([
    {t:day+2*DAY,c:30},
    {t:day+10*3600000,c:20},
    {t:day+DAY,c:25},
    {t:day+18*3600000,c:21}
  ]);
  assert.deepEqual(result,[
    {t:day,c:21},
    {t:day+DAY,c:25},
    {t:day+2*DAY,c:30}
  ]);
});

// Couverture exécutée par GitHub Actions avec Node.js 22.
