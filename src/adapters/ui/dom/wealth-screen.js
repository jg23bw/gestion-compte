/**
 * DOM adapter for wealth overview, portfolio allocation and net-worth views.
 * It consumes the composition bindings retained by the legacy bootstrap.
 */
function pieMarkup(items){
 const positive=items.map(x=>({...x,value:Math.max(0,Number(x.value)||0)}));
 const total=positive.reduce((sum,x)=>sum+x.value,0)||1;
 let angle=0;
 const colors=['#f4c653','#35d6b0','#f36bb5','#63a5ff','#a58bff'];
 const slices=positive.map((x,i)=>{const start=angle;angle+=x.value/total*360;return {label:x.label,value:x.value,index:i,start:start,end:angle,color:colors[i%colors.length],pct:Math.round(x.value/total*100)};});
 const stops=slices.map(x=>x.color+' '+x.start+'deg '+x.end+'deg').join(',');
 const data=encodeURIComponent(JSON.stringify(slices));
 const legend=slices.map(x=>'<div data-pie-index="'+x.index+'"><i style="background:'+x.color+'"></i><span>'+x.label+'</span><strong>'+euro(x.value)+'</strong><small>'+x.pct+'%</small></div>').join('');
 return '<div class="wealth-pie-wrap"><div class="wealth-pie" data-pie-items="'+data+'" style="background:conic-gradient('+stops+')"><div class="wealth-pie-hole"><span class="pie-hover-label">Patrimoine</span><strong class="pie-hover-value">'+euro(positive.reduce((sum,x)=>sum+x.value,0))+'</strong><small class="pie-hover-pct">Survoler une part</small></div></div></div><div class="pie-legend">'+legend+'</div>';
}
function activatePieHover(){
 document.querySelectorAll('.wealth-pie').forEach(pie=>{
  let items=[];try{items=JSON.parse(decodeURIComponent(pie.dataset.pieItems||'[]'));}catch(error){}
  const show=index=>{const item=items[index];if(!item)return;pie.querySelector('.pie-hover-label').textContent=item.label;pie.querySelector('.pie-hover-value').textContent=euro(item.value);pie.querySelector('.pie-hover-pct').textContent=item.pct+' % du total';pie.querySelectorAll('.pie-legend>div').forEach(row=>row.classList.toggle('is-hovered',Number(row.dataset.pieIndex)===index));};
  const clear=()=>{pie.querySelector('.pie-hover-label').textContent='Patrimoine';pie.querySelector('.pie-hover-value').textContent=euro(items.reduce((sum,x)=>sum+x.value,0));pie.querySelector('.pie-hover-pct').textContent='Survoler une part';pie.querySelectorAll('.pie-legend>div').forEach(row=>row.classList.remove('is-hovered'));};
  pie.addEventListener('mousemove',event=>{const rect=pie.getBoundingClientRect(),dx=event.clientX-(rect.left+rect.width/2),dy=event.clientY-(rect.top+rect.height/2);if(Math.hypot(dx,dy)<rect.width*.29)return;const deg=(Math.atan2(dy,dx)*180/Math.PI+90+360)%360;const item=items.find(x=>deg>=x.start&&deg<x.end);if(item)show(item.index);});
  pie.addEventListener('mouseleave',clear);
  const legend=pie.parentElement.nextElementSibling;
  if(legend)legend.querySelectorAll('[data-pie-index]').forEach(row=>{row.addEventListener('mouseenter',()=>show(Number(row.dataset.pieIndex)));row.addEventListener('mouseleave',clear);});
 });
}
function renderWealthViews(){
 const w=wealthSnapshot();
 const financial=Math.max(0,w.accounts+w.stocks+w.crypto);
 const fr=[['Médiane',18000],['Top 25 %',65000],['Top 10 %',200000],['Top 5 %',400000],['Top 1 %',1200000]];
 const world=[['Médiane',2300],['Top 25 %',12000],['Top 10 %',42000],['Top 5 %',120000],['Top 1 %',450000]];
 const renderBars=(id,items,value)=>{const el=$(id);if(el)el.innerHTML=items.map(([label,threshold])=>'<div class="comparison-bar-row"><span>'+label+'</span><strong>'+euro(threshold)+'</strong><div><i style="width:'+Math.min(100,Math.max(2,value/threshold*100))+'%"></i></div><small>'+(value>=threshold?'Seuil dépassé':'')+'</small></div>').join('')};
 $('compare-financial').textContent=financial>=1200000?'Au-dessus du repère top 1 %':financial>=400000?'Au-dessus du repère top 5 %':financial>=200000?'Au-dessus du repère top 10 %':'À comparer aux seuils';
 $('compare-world').textContent=financial>=450000?'Au-dessus du repère top 1 % mondial':financial>=120000?'Au-dessus du repère top 5 %':'À comparer aux seuils';
 renderBars('compare-financial-bars',fr,financial);renderBars('compare-world-bars',world,financial);
 // Aucun camembert d'allocation patrimoniale sur la vue d'ensemble.
 const currentYear=new Date().getFullYear();
 const currentAge=Math.max(18,Math.min(110,Math.round(Number($('fire-age')?.value)||41)));
 const endAge=Math.max(currentAge+1,Math.min(120,Math.round(Number($('fire-end-age')?.value)||95)));
 const desiredIncome=Math.max(0,Number($('fire-rent')?.value||0));
 const passiveIncome=Math.max(0,Number($('fire-passive-income')?.value||0));
 const pensionIncome=Math.max(0,Math.min(15000,Number($('fire-pension')?.value??2000)));
 const pensionStartAge=64;
 const financialNeed=Math.max(0,desiredIncome-passiveIncome-(currentAge>=pensionStartAge?pensionIncome:0));
 const withdrawal=Math.max(0.005,Math.min(0.10,(Number($('fire-withdrawal')?.value)||3.25)/100));
 const saving=Math.max(0,Number($('fire-saving')?.value||0));
 const rate=Number($('fire-return')?.value||0)/100;
 const inflation=Math.max(0,Number($('fire-inflation')?.value||0)/100);
 const regime=$('fire-tax-regime')?.value||'pea';
 const gainShare=Math.max(0,Math.min(1,(Number($('fire-gain-share')?.value||0))/100));
 const customTax=Math.max(0,Math.min(1,(Number($('fire-custom-tax')?.value||0))/100));
 const taxRate=regime==='pea'?0.186:regime==='cto'?0.314:customTax;
 const effectiveTax=regime==='custom'?customTax:taxRate*gainShare;
 const netFactor=Math.max(0.01,1-effectiveTax);
 const target=financialNeed>0?financialNeed*12/(withdrawal*netFactor):0;
 const current=Math.max(0,w.net),gap=Math.max(0,target-current);
 const initialPensionIncome=currentAge>=pensionStartAge?pensionIncome:0;
 const initialGrossMonthly=current*withdrawal/12;
 const currentIncomeCovered=current*withdrawal/12*netFactor+passiveIncome+initialPensionIncome>=desiredIncome;
 const monthlyRate=Math.pow(Math.max(0.000001,1+rate),1/12)-1;
 const realAnnualRate=(1+rate)/(1+inflation)-1;
 const monthlyRealRate=Math.pow(Math.max(0.000001,1+realAnnualRate),1/12)-1;
 const realTarget=target;
 let balance=current,fireAge=currentIncomeCovered?currentAge:null,fireCapital=currentIncomeCovered?current:null;
 let nominalPaidIn=current,series=[{age:currentAge,year:currentYear,month:0,value:balance,real:balance,phase:currentIncomeCovered?'Retraits':'Accumulation',gross:currentIncomeCovered?Math.min(current,initialGrossMonthly)*12:0,tax:currentIncomeCovered?Math.min(current,initialGrossMonthly)*12*effectiveTax:0,net:currentIncomeCovered?Math.min(current,initialGrossMonthly)*12*netFactor:0,passiveIncome,pensionIncome:initialPensionIncome}];
 let exhaustedAge=null,retirementNetFirstYear=0,retirementGrossFirstYear=0;
 const monthlySteps=(endAge-currentAge)*12;
 let retirementStartMonth=fireAge===null?null:0;
 let annualGrossActual=0,annualTaxActual=0,annualNetActual=0;
 for(let step=1;step<=monthlySteps;step++){
   let phase='Accumulation',gross=0,tax=0,net=0;
   if(fireAge===null){
     balance=balance*(1+monthlyRate)+saving;
     nominalPaidIn+=saving;
     const inflationFactor=Math.pow(1+inflation,step/12);
     const targetIncomeAtStep=desiredIncome*inflationFactor;
     // Les loyers restent constants en euros nominaux : ils ne sont pas indexés sur l'inflation.
     const rentsAtStep=passiveIncome;
     // La pension saisie est exprimée en euros d'aujourd'hui et suit l'inflation dans cette projection.
     const pensionAtStep=currentAge+step/12>=pensionStartAge?pensionIncome:0;
     const availableNetAtStep=balance*withdrawal/12*netFactor+rentsAtStep+pensionAtStep;
     // FIRE n'est atteint que lorsque le revenu mensuel net total couvre l'objectif revalorisé.
     if(availableNetAtStep>=targetIncomeAtStep){fireAge=currentAge+step/12;fireCapital=balance;retirementStartMonth=step;}
   }else{
     phase='Retraits';
     balance=Math.max(0,balance*(1+monthlyRate));
     const inflationFactor=Math.pow(1+inflation,step/12);
     const targetIncomeAtStep=desiredIncome*inflationFactor;
     const pensionAtStep=currentAge+step/12>=pensionStartAge?pensionIncome:0;
     // Le capital ne finance que le complément après loyers constants et pension.
     const plannedGross=balance*withdrawal/12;
     gross=Math.min(balance,plannedGross);
     tax=gross*effectiveTax;net=gross-tax;balance=Math.max(0,balance-gross);
     annualGrossActual+=gross;annualTaxActual+=tax;annualNetActual+=net;
     if(plannedGross>0&&balance<=0&&exhaustedAge===null)exhaustedAge=currentAge+step/12;
   }
   if(step%12===0||step===monthlySteps){
     const outputAge=currentAge+step/12,year=currentYear+step/12;
     const real=balance/Math.pow(1+inflation,step/12);
     // Afficher les loyers saisis sans revalorisation automatique.
     const passiveAtDate=passiveIncome;
     const pensionAtDate=outputAge>=pensionStartAge?pensionIncome:0;
     // Annualiser le revenu mensuel courant évite de sous-estimer la première année de retraite partielle.
      const displayedGross=phase==='Retraits'?gross*12:annualGrossActual;
      const displayedTax=phase==='Retraits'?tax*12:annualTaxActual;
      const displayedNet=phase==='Retraits'?net*12:annualNetActual;
      series.push({age:outputAge,year,month:step,value:balance,real,phase,gross:displayedGross,tax:displayedTax,net:displayedNet,passiveIncome:passiveAtDate,pensionIncome:pensionAtDate});
     annualGrossActual=0;annualTaxActual=0;annualNetActual=0;
   }
 } $('fire-year').textContent=financialNeed===0?'Déjà couvert':fireAge!==null?'À '+Math.ceil(fireAge)+' ans':'Non atteint';
 $('fire-summary').textContent=financialNeed===0?'Les loyers'+(currentAge>=pensionStartAge?' et la pension de retraite':'')+' saisis couvrent déjà l’objectif mensuel.':fireAge!==null?'Capital cible estimé atteint vers '+(currentYear+Math.ceil(fireAge-currentAge))+' · besoin financier mensuel actuel : '+euro(financialNeed)+' après déduction des revenus déjà disponibles.':'Le capital cible ne serait pas atteint avant '+endAge+' ans avec ces hypothèses.';
 $('fire-current').textContent=euro(current);$('fire-target').textContent=euro(target);$('fire-gap').textContent=euro(gap);$('fire-progress').textContent=target>0?Math.min(100,current/target*100).toFixed(1)+' %':'100 %';
 // Projection complète jusqu'à l'âge de fin, avec échelle logarithmique adoucie pour compresser l'exponentielle après 64 ans.
 const chartEndAge=endAge;
 const chartSeries=series.filter(p=>p.age<=chartEndAge);
 const maxValue=Math.max(1,...chartSeries.map(p=>Math.max(p.value,p.real)));
 const nearTermMax=Math.max(1,...chartSeries.filter(p=>p.age<=64).map(p=>Math.max(p.value,p.real)));
 const yScale=Math.max(10000,nearTermMax/2);
 const chartWidth=1000,chartHeight=360,left=100,right=24,top=24,bottom=42,plotW=chartWidth-left-right,plotH=chartHeight-top-bottom;
 const yMax=maxValue;
 const yTicks=[0];
 for(let exponent=0.5;exponent<20;exponent+=0.5){const value=yScale*(Math.pow(10,exponent)-1);if(value>0&&value<yMax)yTicks.push(value);}
 yTicks.push(yMax);
 const uniqueYTicks=[...new Set(yTicks.map(v=>Math.round(v)))].sort((a,b)=>a-b);
 const xAtAge=age=>left+(Math.max(currentAge,Math.min(chartEndAge,age))-currentAge)/Math.max(1,chartEndAge-currentAge)*plotW;
 const xAt=i=>xAtAge(series[i]?.age??currentAge);
 const yAt=v=>top+plotH-(Math.log1p(Math.max(0,v)/yScale)/Math.log1p(yMax/yScale))*plotH;
 const fmtAxis=v=>v>=1000000?(v/1000000).toLocaleString('fr-FR',{maximumFractionDigits:1})+' M€':(v/1000).toLocaleString('fr-FR',{maximumFractionDigits:0})+' k€';
 const pointsFor=key=>chartSeries.map(p=>xAtAge(p.age).toFixed(1)+','+yAt(p[key]).toFixed(1)).join(' ');
 const nominalPoints=pointsFor('value');
 const realPoints=pointsFor('real');
 const yGrid=uniqueYTicks.map(v=>'<g><line x1="'+left+'" y1="'+yAt(v).toFixed(1)+'" x2="'+(chartWidth-right)+'" y2="'+yAt(v).toFixed(1)+'" class="fire-graph-grid"/><text x="'+(left-12)+'" y="'+(yAt(v)+5).toFixed(1)+'" text-anchor="end">'+fmtAxis(v)+'</text></g>').join('');
 const fireX=fireAge===null?chartWidth-right:xAtAge(fireAge);
 const retirementAgeMarker=currentAge<=64&&64<=chartEndAge?'<line x1="'+xAtAge(64).toFixed(1)+'" y1="'+top+'" x2="'+xAtAge(64).toFixed(1)+'" y2="'+(top+plotH)+'" class="fire-graph-focus-divider" aria-label="Âge légal de départ à la retraite : 64 ans"/>' :'';
 const phaseZones='<rect x="'+left+'" y="'+top+'" width="'+Math.max(0,Math.min(chartWidth-right,fireX)-left)+'" height="'+plotH+'" class="fire-zone-accumulation"/>'+(fireAge!==null&&fireX<chartWidth-right?'<rect x="'+Math.max(left,fireX)+'" y="'+top+'" width="'+Math.max(0,chartWidth-right-Math.max(left,fireX))+'" height="'+plotH+'" class="fire-zone-retirement"/>':'');
 const availableXAxisWidth=chartWidth-left-right;
 const labelStep=(chartEndAge-currentAge)>45?10:(chartEndAge-currentAge)>25?5:(chartEndAge-currentAge)>12?3:2;
 const candidateAges=[];for(let age=Math.ceil(currentAge/labelStep)*labelStep;age<chartEndAge;age+=labelStep)if(age>currentAge)candidateAges.push(age);
 const mandatoryAges=[currentAge,chartEndAge];
 const optionalAges=[...(fireAge!==null&&fireAge>currentAge&&fireAge<chartEndAge?[Math.round(fireAge)]:[]),...(64>currentAge&&64<chartEndAge?[64]:[])];
 const ageCandidates=[...new Set([...mandatoryAges,...candidateAges,...optionalAges])].sort((a,b)=>a-b);
 const minLabelGap=Math.max(54,Math.min(76,availableXAxisWidth/Math.max(2,Math.floor((chartEndAge-currentAge)/labelStep)+1)));
 const visibleAges=[];
 for(const age of ageCandidates){const x=xAtAge(age),labelWidth=String(age).length*7+22;if(!visibleAges.length){visibleAges.push(age);continue;}const prev=visibleAges[visibleAges.length-1],prevX=xAtAge(prev),prevWidth=String(prev).length*7+22;const prevEnd=prev===chartEndAge?prevX:prevX+prevWidth/2;const thisStart=age===currentAge?x:x-labelWidth/2;if(thisStart-prevEnd>=Math.max(6,minLabelGap-labelWidth/2))visibleAges.push(age);else if(optionalAges.includes(age)&&age===64&&x-prevX>minLabelGap*1.2)visibleAges.push(age);}
 if(visibleAges[visibleAges.length-1]!==chartEndAge){while(visibleAges.length>1&&xAtAge(chartEndAge)-(xAtAge(visibleAges[visibleAges.length-1])+(String(visibleAges[visibleAges.length-1]).length*7+22)/2)<8)visibleAges.pop();visibleAges.push(chartEndAge);}
 const xLabels=visibleAges.map(age=>'<text x="'+xAtAge(age).toFixed(1)+'" y="'+(chartHeight-10)+'" text-anchor="'+(age===chartEndAge?'end':age===currentAge?'start':'middle')+'">'+age+' ans</text>').join('');
 const hitPoints=chartSeries.map(p=>{const i=series.indexOf(p);return '<circle class="fire-graph-hit" data-index="'+i+'" cx="'+xAt(i).toFixed(1)+'" cy="'+yAt(p.value).toFixed(1)+'" r="11" tabindex="0" role="button" aria-label="'+p.age+' ans, patrimoine '+euro(p.value)+'" />';}).join('');
 $('fire-chart').innerHTML='<p class="fire-graph-caption">Projection complète jusqu’à '+chartEndAge+' ans. Échelle verticale compressée pour conserver la lisibilité entre '+currentAge+' et 64 ans, sans masquer la tendance à long terme.</p><div class="projection-legend"><span class="projection-legend-accumulation"><i></i> Accumulation</span><span class="projection-legend-retirement"><i></i> Retraite</span><span class="projection-legend-nominal"><i></i> Patrimoine nominal</span><span class="projection-legend-real"><i></i> Patrimoine en euros constants</span></div><div class="fire-graph-wrap"><svg class="fire-graph" viewBox="0 0 '+chartWidth+' '+chartHeight+'" role="group" aria-label="Graphique interactif du patrimoine par âge">'+phaseZones+yGrid+retirementAgeMarker+'<line x1="'+left+'" y1="'+top+'" x2="'+left+'" y2="'+(top+plotH)+'" class="fire-graph-axis"/><line x1="'+left+'" y1="'+(top+plotH)+'" x2="'+(chartWidth-right)+'" y2="'+(top+plotH)+'" class="fire-graph-axis"/><polyline points="'+nominalPoints+'" class="fire-graph-nominal"/><polyline points="'+realPoints+'" class="fire-graph-real"/>'+xLabels+hitPoints+'<line id="fire-crosshair" x1="'+left+'" y1="'+top+'" x2="'+left+'" y2="'+(top+plotH)+'" class="fire-graph-crosshair" visibility="hidden"/><circle id="fire-hover-dot" cx="'+left+'" cy="'+top+'" r="6" class="fire-graph-hover-dot" visibility="hidden"/></svg><div id="fire-graph-tooltip" class="fire-graph-tooltip" role="status" hidden></div></div><div class="fire-year-list">'+series.map(p=>{
   const retired=p.phase==='Retraits';
   const rentAtDate=p.passiveIncome??passiveIncome;
   const pensionAtDate=p.pensionIncome??0;
    const detail=retired?'<div class="fire-monthly-net"><div class="fire-net-summary"><span>Revenu net / mois</span><strong>'+euro(p.net/12+rentAtDate+pensionAtDate)+'</strong></div><div class="fire-monthly-breakdown"><span>Capital net</span><b>'+euro(p.net/12)+'</b><span>Loyers</span><b>'+euro(rentAtDate)+'</b><span>Pension</span><b>'+euro(pensionAtDate)+'</b></div><details class="fire-year-extra"><summary>Détail fiscal annuel</summary><p>Retrait brut : '+euro(p.gross)+'/an · impôts estimés : '+euro(p.tax)+'/an · revenu financier net : '+euro(p.net)+'/an</p></details></div>':'<p class="fire-year-detail fire-saving-detail">Épargne mensuelle : <strong>'+euro(saving)+'</strong></p>';
   return '<article class="fire-year-row '+(retired?'fire-year-retirement':'fire-year-accumulation')+'"><div class="fire-year-heading"><div><strong>'+p.age+' ans</strong><small>'+(retired?'Retraite':'Accumulation')+'</small></div><div class="fire-year-capital"><strong>'+euro(p.value)+'</strong><small>'+euro(p.real)+' en euros constants</small></div></div>'+detail+'</article>';
 }).join('')+'</div><p class="projection-outcome">'+(exhaustedAge!==null?'Capital épuisé vers '+exhaustedAge+' ans.':'Capital restant à '+endAge+' ans : '+euro(series[series.length-1].value)+' ('+euro(series[series.length-1].real)+' en euros constants).')+'</p>';
 const graphSvg=$('fire-chart').querySelector('.fire-graph');
 const graphWrap=$('fire-chart').querySelector('.fire-graph-wrap');
 const graphTip=$('fire-graph-tooltip');
 const crosshair=$('fire-crosshair');
 const hoverDot=$('fire-hover-dot');
 const showGraphPoint=(index)=>{
   const p=series[index];if(!p)return;
   const x=xAt(index),y=yAt(p.value);
   crosshair.setAttribute('x1',x);crosshair.setAttribute('x2',x);crosshair.setAttribute('visibility','visible');
   hoverDot.setAttribute('cx',x);hoverDot.setAttribute('cy',y);hoverDot.setAttribute('visibility','visible');
   graphTip.innerHTML='<strong>'+p.age+' ans · '+(p.phase==='Retraits'?'Retraite':'Accumulation')+'</strong><div>Patrimoine nominal : <b>'+euro(p.value)+'</b></div><div>Patrimoine réel : <b>'+euro(p.real)+'</b></div>'+(p.phase==='Retraits'?'<div class="tooltip-monthly"><div><span>Capital net / mois</span><b>'+euro(p.net/12)+'</b></div><div><span>Loyers / mois</span><b>'+euro(p.passiveIncome??passiveIncome)+'</b></div><div><span>Pension / mois</span><b>'+euro(p.pensionIncome??0)+'</b></div><div class="tooltip-total"><strong>Total net / mois</strong><b>'+euro(p.net/12+(p.passiveIncome??passiveIncome)+(p.pensionIncome??0))+'</b></div></div><small>Retrait brut/an : '+euro(p.gross)+' · Impôts/an : '+euro(p.tax)+'</small>':'<div>Épargne mensuelle : <b>'+euro(saving)+'</b></div>');
   graphTip.hidden=false;
   const wrapRect=graphWrap.getBoundingClientRect(),svgRect=graphSvg.getBoundingClientRect();
   const pointX=svgRect.left-wrapRect.left+(x/chartWidth)*svgRect.width;
   const pointY=svgRect.top-wrapRect.top+(y/chartHeight)*svgRect.height;
   const tipWidth=Math.min(245,Math.max(185,wrapRect.width-24));
   graphTip.style.width=tipWidth+'px';graphTip.style.left=Math.max(8,Math.min(wrapRect.width-tipWidth-8,pointX-tipWidth/2))+'px';
   graphTip.style.right='auto';
   graphTip.style.bottom='auto';graphTip.style.top='8px';
   const tipHeight=graphTip.offsetHeight;
   const desiredTop=pointY-tipHeight-12;
   graphTip.style.top=Math.max(8,Math.min(Math.max(8,pointY-24),desiredTop))+'px';
 };
 graphSvg.querySelectorAll('.fire-graph-hit').forEach(el=>{
   const show=()=>showGraphPoint(Number(el.dataset.index));
   el.addEventListener('mouseenter',show);el.addEventListener('focus',show);
   el.addEventListener('click',show);
   el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show();}});
 });
 graphSvg.addEventListener('mouseleave',()=>{if(!graphSvg.querySelector('.fire-graph-hit:focus')){graphTip.hidden=true;crosshair.setAttribute('visibility','hidden');hoverDot.setAttribute('visibility','hidden');}});
 // Scénarios déterministes : prudent, central, favorable et choc boursier au départ de la retraite.
 const scenarios=[{name:'Prudent',rate:Math.max(-0.02,rate-0.03)},{name:'Central',rate},{name:'Favorable',rate:rate+0.02},{name:'Choc initial −20 %',rate,crash:true}];
 const runFireScenario=(sc,horizonAge)=>{
   let b=current,ageFire=current>=target?currentAge:null,fireBal=current>=target?current:null,startMonth=ageFire===null?null:0,drained=null;
   const months=Math.max(0,Math.round((horizonAge-currentAge)*12)),mr=Math.pow(Math.max(0.000001,1+sc.rate),1/12)-1;
   for(let m=1;m<=months;m++){
     const inflationFactor=Math.pow(1+inflation,m/12),age=currentAge+m/12;
     const pensionAt=age>=pensionStartAge?pensionIncome:0;
     if(ageFire===null){b=b*(1+mr)+saving;const targetIncome=desiredIncome*inflationFactor;if(b*withdrawal/12*netFactor+passiveIncome+pensionAt>=targetIncome){ageFire=age;fireBal=b;startMonth=m;}}
     else{if(sc.crash&&m===(startMonth??0)+1)b*=0.8;b=Math.max(0,b*(1+mr));const planned=b*withdrawal/12;const actual=Math.min(b,planned);b=Math.max(0,b-actual);if(planned>0&&b<=0&&drained===null)drained=age;}
   }
   return {balance:b,ageFire,drained};
 };
 const scenarioResults=scenarios.map(sc=>({...sc,result:runFireScenario(sc,endAge)}));
 const scenarioRows=scenarioResults.map(({name,rate:scenarioRate,result})=>'<tr><td>'+name+' ('+(scenarioRate*100).toFixed(1)+' %)</td><td>'+(result.ageFire===null?'Non atteint':result.ageFire.toFixed(1)+' ans')+'</td><td>'+(result.drained===null?'Non épuisé avant '+endAge:result.drained.toFixed(1)+' ans')+'</td><td>'+euro(result.balance)+'</td><td>'+euro(result.balance/Math.pow(1+inflation,endAge-currentAge))+'</td></tr>').join('');
 const milestoneRows=[80,90,95].filter(age=>age>currentAge&&age<=endAge).map(milestone=>'<tr><td>'+milestone+' ans</td>'+scenarios.map(sc=>{const result=runFireScenario(sc,milestone);return '<td>'+euro(result.balance)+'</td><td>'+euro(result.balance/Math.pow(1+inflation,milestone-currentAge))+'</td>';}).join('')+'</tr>').join('');
 const scenarioEl=$('fire-scenarios');if(scenarioEl)scenarioEl.innerHTML='<table class="fire-scenario-table"><thead><tr><th>Scénario</th><th>Âge FIRE</th><th>Épuisement</th><th>Capital final nominal</th><th>Capital final réel</th></tr></thead><tbody>'+scenarioRows+'</tbody></table><h3 class="fire-milestones-title">Capital restant à 80, 90 et 95 ans</h3><table class="fire-scenario-table"><thead><tr><th>Âge</th>'+scenarios.map(sc=>'<th>'+sc.name+' nominal</th><th>'+sc.name+' réel</th>').join('')+'</tr></thead><tbody>'+milestoneRows+'</tbody></table><p class="fire-year-detail">Le scénario « Choc initial » applique une baisse ponctuelle de 20 % au premier mois de retraite. Les autres scénarios conservent un rendement annuel constant ; aucun scénario déterministe ne garantit le résultat réel.</p>';
 const fireRealReturnEl=$('fire-real-return'),fireNetNeedEl=$('fire-net-need');
 if(fireRealReturnEl)fireRealReturnEl.textContent=(realAnnualRate*100).toFixed(2)+' %';
 if(fireNetNeedEl)fireNetNeedEl.textContent=euro(financialNeed);

 const taxRegime=$('fire-tax-regime'),customLabel=$('fire-custom-tax-label');
 if(taxRegime&&customLabel)customLabel.hidden=taxRegime.value!=='custom';
 const btc=parseFrenchNumber($('lombard-btc-price')?.value)||0,fx=parseFrenchNumber($('lombard-fx')?.value)||1,principal=parseFrenchNumber($('lombard-principal')?.value)||0,repaid=parseFrenchNumber($('lombard-repaid')?.value)||0;
 const remaining=Math.max(0,principal-repaid),loanBtc=60000/(70100/fx),personalBtc=69800/(85100/fx),loanValue=loanBtc*btc/fx,personalValue=personalBtc*btc/fx;
 const loanGain=loanValue-60000,personalGain=personalValue-69800;
 $('lombard-remaining').textContent=euro(remaining);$('lombard-loan-btc').textContent=loanBtc.toFixed(6)+' BTC';$('lombard-loan-value').textContent=euro(loanValue);$('lombard-personal-value').textContent=euro(personalValue);
 $('lombard-loan-gain').textContent=(loanGain>=0?'+':'')+euro(loanGain);$('lombard-loan-detail').textContent='Coût d’achat : 60 000 € · valeur estimée : '+euro(loanValue)+'.';
 $('lombard-personal-gain').textContent=(personalGain>=0?'+':'')+euro(personalGain);$('lombard-personal-detail').textContent='Coût d’achat : 69 800 € · valeur estimée : '+euro(personalValue)+'.';
 const totalBtcValue=loanValue+personalValue;const netAfterSale=totalBtcValue-remaining;
 $('lombard-scenarios').innerHTML=[{label:'Aucun BTC vendu',v:0},{label:'Vente de 25 % des BTC',v:totalBtcValue*.25},{label:'Vente de 50 % des BTC',v:totalBtcValue*.5},{label:'Vente de 100 % des BTC',v:totalBtcValue}].map(x=>'<div><span>'+x.label+'</span><strong>'+euro(x.v)+'</strong><small>Après remboursement de la dette : '+(x.v>=remaining?euro(x.v-remaining):'reste '+euro(remaining-x.v)+' de dette')+'</small></div>').join('');
}


