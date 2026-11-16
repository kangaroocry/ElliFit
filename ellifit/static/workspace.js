'use strict';

const pendingSearchInputs=new Set();
function pendingFitEdits(){
 for(const input of pendingSearchInputs)if(!input.isConnected)pendingSearchInputs.delete(input);
 return pendingDocument('model')||pendingSearchInputs.size>0;
}
function flushFitInputs(){
 if(!flushDocument('model'))return false;
 for(const input of [...pendingSearchInputs])if(input.isConnected)input.dispatchEvent(new Event('change',{bubbles:true}));
 if(pendingFitEdits()){toast('Bitte die ungültige Sucheingabe vor dem Fit korrigieren.','warning');return false;}
 return true;
}

// Axis ranges use Plotly coordinates (log10 values for a native log axis).
function axisCoordinate(value,axis){return axis.type==='log'?Math.log10(Math.max(value,1e-300)):value;}
function panRangeToPoint(range,value){
 if(!range||!Number.isFinite(value))return range;
 const reversed=range[0]>range[1],lo=Math.min(...range),hi=Math.max(...range),span=hi-lo;
 const tolerance=Math.max(1,Math.abs(lo),Math.abs(hi))*1e-10;
 if(!(span>0)||value>=lo-tolerance&&value<=hi+tolerance)return [...range];
 const out=value<lo?[value-.1*span,value+.9*span]:[value-.9*span,value+.1*span];
 return reversed?out.reverse():out;
}
function plotKey(id,options){
 return [state.resultJob,id,options.mode||'cartesian',...Object.entries(options.axes||{}).map(([key,s])=>key+':'+s.axis.type+':'+(s.pivot||'')+':'+(s.logarithmic?'log':'linear'))].join('|');
}
function preservePlotView(el,layout,key,options){
 if(el._elliViewKey!==key||!el._fullLayout)return;
 const source=options.scene?el._fullLayout.scene:el._fullLayout,target=options.scene?layout.scene:layout;
 for(const name of Object.keys(options.axes||{})){
  const range=source?.[name]?.range;if(!range||!target[name])continue;
  const selected=options.selected?.[name],coordinate=selected==null?null:axisCoordinate(selected,target[name]);
  target[name].range=coordinate==null?[...range]:panRangeToPoint(range,coordinate);target[name].autorange=false;
 }
 if(options.scene&&source.camera)target.camera=clone(source.camera);
}
function niceVisibleTicks(lo,hi,count=5){
 if(!Number.isFinite(lo+hi)||!(hi>lo))return [];
 const rough=(hi-lo)/Math.max(2,count),power=10**Math.floor(Math.log10(rough));
 const step=([1,2,2.5,5,10].find(x=>x>=rough/power)||10)*power,out=[];
 for(let i=Math.ceil(lo/step);i*step<=hi+step*1e-8&&out.length<30;i++)out.push(Math.abs(i*step)<step*1e-8?0:Number((i*step).toPrecision(14)));
 return out;
}
function visibleLogTicks(lo,hi,count=5){
 if(!(lo>0&&hi>lo))return [];
 const span=Math.log10(hi/lo);if(span<1.3)return niceVisibleTicks(lo,hi,count).filter(v=>v>0);
 const out=[],start=Math.floor(Math.log10(lo)),end=Math.ceil(Math.log10(hi)),stride=Math.max(1,Math.ceil((end-start)/count));
 for(let p=start;p<=end;p+=stride)for(const factor of span<2.2?[1,2,5]:[1]){const v=factor*10**p;if(v>=lo*(1-1e-10)&&v<=hi*(1+1e-10))out.push(v);}
 return out.length?out:[lo,hi];
}
function tickLabels(values){
 const gaps=values.slice(1).map((v,i)=>Math.abs(v-values[i])).filter(v=>v>0),step=gaps.length?Math.min(...gaps):1;
 const power=Math.floor(Math.log10(step)),coefficient=step/10**power,places=Math.min(12,Math.max(0,-power)+(Math.abs(coefficient-Math.round(coefficient))>.001?1:0));
 return values.map(v=>{
  if(v!==0&&(Math.abs(v)<=1e-5||Math.abs(v)>=1e7)){const significant=Math.min(10,Math.max(2,Math.ceil(Math.log10(Math.abs(v)/step))+2));return Number(v.toPrecision(significant)).toExponential().replace('.',',').replace('e+','e');}
  const ownPlaces=v===0?0:Math.max(0,1-Math.floor(Math.log10(Math.abs(v))));
  return v.toLocaleString('de-DE',{minimumFractionDigits:0,maximumFractionDigits:Math.min(12,Math.max(places,ownPlaces))}).replace(/\./g,' ').replace(/[\u00a0\u202f]/g,' ');
 });
}
function axisTickPatch(el,options){
 const patch={},full=options.scene?el._fullLayout.scene:el._fullLayout,layout=options.scene?el.layout.scene:el.layout,prefix=options.scene?'scene.':'';
 for(const [key,spec]of Object.entries(options.axes||{})){
  const axis=full?.[key];if(!axis?.range)continue;
  const low=Math.min(...axis.range),high=Math.max(...axis.range),count=Math.max(3,Math.min(7,Math.floor((axis._length||400)/76)));
  const lower=spec.pivot?Math.max(0,spec.unmap(low)):spec.unmap(axis.type==='log'?10**low:low),upper=spec.unmap(axis.type==='log'?10**high:high);
  let physical;
  if(spec.pivot&&upper>spec.pivot*20&&upper/Math.max(lower,spec.pivot)>12)physical=[...(lower<=0?[0]:[]),...visibleLogTicks(Math.max(lower,spec.pivot),upper,count)];
  else physical=axis.type==='log'?visibleLogTicks(lower,upper,count):niceVisibleTicks(lower,upper,count);
  physical=physical.filter(v=>Number.isFinite(v)&&v>=lower-1e-12*Math.max(1,Math.abs(lower))&&v<=upper+1e-12*Math.max(1,Math.abs(upper)));
  const values=physical.map(spec.map),text=tickLabels(physical),old=layout?.[key];
  if(JSON.stringify([old?.tickvals,old?.ticktext])!==JSON.stringify([values,text])){
   patch[prefix+key+'.tickmode']='array';patch[prefix+key+'.tickvals']=values;patch[prefix+key+'.ticktext']=text;
  }
 }
 return patch;
}
function minimumAnnotations(el,labels){
 const xa=el._fullLayout.xaxis,ya=el._fullLayout.yaxis;if(!xa||!ya)return [];
 const width=xa._length,height=ya._length,placed=[],markers=labels.map(p=>({...p,px:xa.d2p(p.x),py:ya.d2p(p.y)})).filter(p=>Number.isFinite(p.px+p.py)&&p.px>=0&&p.px<=width&&p.py>=0&&p.py<=height);
 const curves=[];for(const trace of el.data||[])if(trace.mode?.includes('lines')&&trace.x&&trace.y){const stride=Math.max(1,Math.floor(trace.x.length/1000));for(let i=0;i<trace.x.length;i+=stride)if(trace.x[i]!=null&&trace.y[i]!=null)curves.push([xa.d2p(trace.x[i]),ya.d2p(trace.y[i])]);}
 markers.sort((a,b)=>Number(b.active)-Number(a.active)||a.rank-b.rank||a.px-b.px);
 el._elliLabelTargets=markers.slice(0,100).map(p=>p.target);
 const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
 return markers.slice(0,100).map(p=>{
  const w=String(p.label).length*8+10,h=21,candidates=[[0,26],[28,26],[-28,26],[42,5],[-42,5],[26,-25],[-26,-25],[0,-27]];
  const options=candidates.map(([dx,dy],i)=>{const box={x:p.px+dx-w/2,y:p.py+dy-h/2,w,h};let score=i*.15;
   if(box.x<2||box.x+w>width-2||box.y<2||box.y+h>height-2)score+=1e6;
   score+=placed.filter(b=>overlaps(box,b)).length*1000;
   score+=markers.filter(m=>m!==p&&m.px>=box.x-6&&m.px<=box.x+w+6&&m.py>=box.y-6&&m.py<=box.y+h+6).length*200;
   score+=curves.filter(([x,y])=>x>=box.x-2&&x<=box.x+w+2&&y>=box.y-2&&y<=box.y+h+2).length*8;
   return {dx,dy,box,score};});
  options.sort((a,b)=>a.score-b.score);const best=options[0];placed.push(best.box);
  return {x:axisCoordinate(p.x,xa),y:axisCoordinate(p.y,ya),xref:'x',yref:'y',text:String(p.label),showarrow:true,ax:best.dx,ay:best.dy,axref:'pixel',ayref:'pixel',arrowhead:0,arrowwidth:1,arrowcolor:'#82959b',bgcolor:'rgba(255,255,255,0.93)',bordercolor:p.active?'#416f79':'rgba(125,147,153,0.35)',borderwidth:1,borderpad:2,font:{size:13,color:'#24434b'},captureevents:true};
 });
}
function selectPlotTarget(target){
 if(!target)return false;
 if(target.trial!=null)selectTrial(target.trial);else selectSolution(target.family,target.alias??null);
 return true;
}
function selectNearbyMinimum(el,event){
 if(el._elliPlotOptions?.scene)return false;
 const x=el._fullLayout.xaxis,y=el._fullLayout.yaxis,rect=el.getBoundingClientRect(),point=event.points?.[0];
 if(!point)return false;
 const px=event.event?.clientX!=null?event.event.clientX-rect.left-x._offset:x.d2p(point.x),py=event.event?.clientY!=null?event.event.clientY-rect.top-y._offset:y.d2p(point.y);
 let closest=null,distance=13;
 for(const [index,trace]of el.data.entries())if(index===1||trace.meta?.kind==='trial'){
  for(let i=0;i<(trace.x?.length||0);i++){
   const dx=x.d2p(trace.x[i])-px,dy=y.d2p(trace.y[i])-py,d=Math.hypot(dx,dy),data=trace.customdata?.[i];
   if(d<distance&&Array.isArray(data)){distance=d;closest=trace.meta?.kind==='trial'?{trial:data[0]}:{family:data[0],alias:typeof data[1]==='number'?data[1]:null};}
  }
 }
 return selectPlotTarget(closest);
}
function decorateWorkspacePlot(el){
 const options=el._elliPlotOptions;if(!options||!el._fullLayout)return;if(el._elliDecorating)return el._elliDecorationTask;
 const patch=axisTickPatch(el,options);
 if(!options.scene&&options.labels){const labels=minimumAnnotations(el,options.labels);if(JSON.stringify(el.layout.annotations||[])!==JSON.stringify(labels))patch.annotations=labels;}
 if(!Object.keys(patch).length)return;
 el._elliDecorating=true;
 return el._elliDecorationTask=Promise.resolve(Plotly.relayout(el,patch)).finally(()=>{el._elliDecorating=false;});
}
function queuePlotDecoration(el){cancelAnimationFrame(el._elliDecorationFrame);el._elliDecorationFrame=requestAnimationFrame(()=>{el._elliDecorationFrame=null;decorateWorkspacePlot(el);});}
function nextPaint(){return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));}
function renderWorkspacePlot(id,traces,layout,options){
 const el=$(id),key=plotKey(id,options),serial=(el._elliSerial||0)+1;el._elliSerial=serial;
 preservePlotView(el,layout,key,options);layout.uirevision=key;
 el._elliViewKey=key;el._elliPlotOptions=options;
 return Plotly.react(el,traces,layout,plotOptions).then(async()=>{
  if(el._elliSerial!==serial)return;
  if(!el._elliViewEvents){el.on('plotly_clickannotation',event=>selectPlotTarget(el._elliLabelTargets?.[event.index]));el.on('plotly_relayout',change=>{
   if(el._elliDecorating||Object.keys(change).every(k=>/^(annotations|shapes)|tick(mode|vals|text)$/.test(k)))return;
   queuePlotDecoration(el);if(id==='errorPlot'&&!el._elliPlotOptions?.scene)syncRmsBackground(el);
  });el._elliViewEvents=true;}
  await nextPaint();
  if(el._elliSerial===serial){cancelAnimationFrame(el._elliDecorationFrame);el._elliDecorationFrame=null;await decorateWorkspacePlot(el);}
 });
}
function currentFitRequest(){return {model:clone(state.model),measurements:clone(selectedRows()),parameters:state.parameters.filter(p=>p.path).map(clone),...settings()};}
function currentFitKey(){return documentFingerprint(currentFitRequest());}
function renderResultContext(recheck=false){
 const r=state.result,box=$('resultScope');if(!box)return;
 if(!r){box.dataset.state='empty';$('resultScopeTitle').textContent='Noch kein Fit berechnet';$('resultScopeDetail').textContent='Eingaben und Messdaten oben vorbereiten, dann die globale Suche starten.';$('resultScopeBadge').textContent='Bereit';return;}
 if(recheck)state.resultStale=pendingFitEdits()||state.fittedInputKey!==currentFitKey();
 const stamp=state.fitCompletedAt?new Date(state.fitCompletedAt).toLocaleString('de-DE',{timeZone:'Europe/Berlin',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}):'letzter Berechnung';
 const old=state.resultStale;box.dataset.state=old?'stale':state.busy?'running':'current';
 $('resultScopeTitle').textContent='Ergebnisse des Fits vom '+stamp;
 $('resultScopeDetail').textContent=`${r.model.name} · ${int(r.measurement_context.count)} Messungen · ${int(r.measurement_uncertainty.groups.length)} Winkel. Lösungsliste, Diagramme und Diagnosen gehören zu diesem Eingabestand.`;
 $('resultScopeBadge').textContent=old?'Früherer Eingabestand':state.busy?'Neue Berechnung läuft':'Eingaben stimmen überein';
 $('stale').hidden=!old;$('stale').textContent='Aktuelle Eingaben wurden geändert. Für diesen neuen Stand bitte erneut fitten; die bisherigen Ergebnisse bleiben zum Vergleich sichtbar.';
 $('noticesScope').textContent='Hinweise zu diesem '+(old?'früheren ':'')+'Fit vom '+stamp;
 $('analysisScope').textContent='Diagnosen zu diesem '+(old?'früheren ':'')+'Fit';
 const fitted=r.measurement_context.count,angles=r.measurement_uncertainty.groups.length;
 $('statSelectedLabel').textContent='Messungen dieses Fits';$('statSelected').textContent=int(fitted);$('statAngles').textContent=`${int(angles)} Winkel · ${angles>1?'Mehrwinkel':'Einwinkel'}fit`;
}
function restoreTableView(){
 const value=Number(state.view.pageSize);state.pageSize=Number.isSafeInteger(value)&&value>0?value:100;state.view.pageSize=state.pageSize;
 state.view.groupBy=['none','auto','angle','source'].includes(state.view.groupBy)?state.view.groupBy:'none';state.view.reverse=state.view.reverse===true;
 $('pageSize').value=int(state.pageSize);$('groupBy').value=state.view.groupBy;$('inputDetails').open=state.view.inputsOpen!==false;
 $('reverseRows').setAttribute('aria-pressed',String(state.view.reverse));$('reverseRows').textContent=state.view.reverse?'↓ Dateiende zuerst':'↑ Dateianfang zuerst';
 $('reverseRows').title='Nur die Anzeige umkehren; Originaldaten und Fit-Auswahl bleiben erhalten.';
}
function bindWorkspace(){
 restoreTableView();renderResultContext();$('inputDetails').addEventListener('toggle',()=>{state.view.inputsOpen=$('inputDetails').open;});
 document.addEventListener('input',e=>{const input=e.target;if(input.matches('#fitFields input,#fitFields select'))pendingSearchInputs.add(input);if(inputDocument(input)==='model'||input.matches('#fitFields input,#fitFields select')){renderResultContext(true);if(state.result)renderNotices();}});
 document.addEventListener('change',e=>{const input=e.target;if(!input.matches('#fitFields input,#fitFields select')&&inputDocument(input)!=='model')return;const optional=input.id.startsWith('sigma');if(!input.dataset.num||Number.isFinite(parseNumber(input.value,optional))||optional&&parseNumber(input.value,true)===null)pendingSearchInputs.delete(input);renderResultContext(true);if(state.result)renderNotices();});
 $('pageSize').onchange=()=>{const n=parseNumber($('pageSize').value);if(!Number.isSafeInteger(n)||n<1){$('pageSize').value=int(state.pageSize);return toast('Bitte eine positive ganze Anzahl an Einträgen je Seite eingeben.','warning');}const first=state.page*state.pageSize;state.pageSize=n;state.view.pageSize=n;state.page=Math.floor(first/n);dataTable();};
 $('reverseRows').onclick=()=>{state.view.reverse=!state.view.reverse;state.page=0;state.jumpRow=null;lastRow=null;restoreTableView();dataTable();};
}
