'use strict';
const UI_VERSION='1.2.8';
const $=id=>document.getElementById(id);
const clone=x=>JSON.parse(JSON.stringify(x));
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function parseNumber(value,optional=false){const s=String(value??'').trim().replace(/[\s\u00a0\u202f]/g,'').replace(/−/g,'-').replace(',','.');if(optional&&!s)return null;if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s))return NaN;return Number(s);}
function fmt(value,digits=null){if(digits==null)return numericText(value);if(value==null||!Number.isFinite(value))return '—';if(value===0)return '0';const a=Math.abs(value);if(a<1e-4||a>=1e7){const [m,e]=value.toExponential(digits-1).split('e');return Number(m).toString().replace('.',',')+'e'+Number(e);}return Number(value.toPrecision(digits)).toLocaleString('de-DE',{maximumSignificantDigits:digits}).replace(/\./g,' ').replace(/[\u00a0\u202f]/g,' ');}
const int=n=>Number(n).toLocaleString('de-DE',{maximumFractionDigits:0}).replace(/\./g,' ');
const rmsText=x=>x!=null&&x<1e-6?'< 0,000001':numericText(x,'angle');
function numericInput(id,value){const el=$(id);el.value=value==null?'':numericText(value,el.dataset.num||'n');el.title=value==null?'Keine Angabe':el.value;}
function prettyMessage(text){return String(text).replace(/(?<![\w.])[+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?(?![\w.])/gi,s=>fmt(Number(s),6));}
const DEFAULT_SETTINGS={duplicate_policy:'repeat',angle_tolerance:.001,metric:'angular',uncertainty_mode:'auto',bootstrap_samples:60,quality:'balanced',equivalence_deg:.01,calibration:{angle_deg:null,wavelength_nm:null}};
const state={model:null,modelFile:null,parameters:[{path:'layers.0.thickness_nm',lower:.1,upper:1000,scale:'log',positive_min:1e-8},{path:'',lower:1,upper:4,scale:'linear',positive_min:1e-8}],settings:clone(DEFAULT_SETTINGS),rows:[],selected:new Set(),page:0,pageSize:50,table:{entries:[],indices:[],pages:1},jumpRow:null,collapsed:new Set(),groups:[],measurementStats:null,view:{logX:true,logY:true,comparisonLog:null,groupBy:'auto'},history:[],future:[],trials:[],activeTrial:null,trialSequence:0,trialDraft:[],noticeJob:null,result:null,comparison:null,active:0,activeAlias:0,job:null,resultJob:null,busy:false,material:null,materialFile:null,materials:[],provenance:''};
let toastTimer,statisticsTimer,statisticsTicket=0,comparisonTicket=0,lastRow=null;
async function api(url,options={}){const request={...options};if(request.body&&!(request.body instanceof FormData)){request.headers={'Content-Type':'application/json'};request.body=JSON.stringify(request.body);}const response=await fetch(url,request),data=await response.json();if(!response.ok){const d=data.detail??data,e=new Error(typeof d==='string'?d:Array.isArray(d)?d.map(x=>x.loc?.slice(1).join('.')+': '+x.msg).join('\n'):d.message||'Anfrage fehlgeschlagen.');e.status=response.status;e.detail=d;throw e;}return data;}
function toast(message,kind=notificationKind(message)){$('toast').textContent=prettyMessage(message);$('toast').dataset.kind=kind;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,6500);}
function status(message,percent=0,error=false){$('status').hidden=false;$('statusText').textContent=prettyMessage(message);$('progress').value=percent;$('status').classList.toggle('error',error);$('status').dataset.kind=error?'critical':/abgeschlossen/.test(message)?'success':'info';}
function stale(){if(state.result)$('stale').hidden=false;selectionStats();}
function busy(value){state.busy=value;for(const id of ['modelFields','fitFields','dataFields'])$(id).disabled=value;for(const id of ['runFit','openSession'])$(id).disabled=value;$('applySolution').disabled=value||!state.result;if($('addTrial'))$('addTrial').disabled=value;$('cancelFit').hidden=!value;}
function snapshot(){return clone({model:state.model,modelFile:state.modelFile,parameters:state.parameters,settings:state.settings,axes:{logX:state.view.logX,logY:state.view.logY,comparisonLog:state.view.comparisonLog}});}
function mutate(fn){state.history.push(snapshot());if(state.history.length>80)state.history.shift();state.future=[];fn();historyButtons();stale();}
function historyButtons(){$('undo').disabled=state.busy||!state.history.length;$('redo').disabled=state.busy||!state.future.length;}
function restoreSnapshot(s){const before=[state.view.logX,state.view.logY,state.view.comparisonLog];state.model=s.model;state.modelFile=s.modelFile;state.parameters=s.parameters;state.settings=s.settings;if(s.axes)Object.assign(state.view,s.axes);$('plotLogX').checked=state.view.logX;$('plotLogY').checked=state.view.logY;renderModel();renderSettings();dataTable();scheduleStatistics();stale();historyButtons();if(state.result&&JSON.stringify(before)!==JSON.stringify([state.view.logX,state.view.logY,state.view.comparisonLog])){errorPlot();comparisonPlot();if(state.result.identifiability?.profile)profilePlot();}}
function undo(){if(!state.history.length)return;state.future.push(snapshot());restoreSnapshot(state.history.pop());}
function redo(){if(!state.future.length)return;state.history.push(snapshot());restoreSnapshot(state.future.pop());}
function getPath(model,path){return path.split('.').reduce((a,k)=>a[k],model);}
function setPath(model,path,value){const keys=path.split('.');let obj=model;for(const k of keys.slice(0,-1))obj=obj[k];obj[keys.at(-1)]=value;}
function defaultBounds(path){return path.endsWith('thickness_nm')?{lower:.1,upper:1000,scale:'log',positive_min:1e-8}:path.endsWith('.k')?{lower:0,upper:10,scale:'log',positive_min:1e-8}:{lower:1,upper:4,scale:'linear',positive_min:1e-8};}
function mediumLabel(path,model=state.model){const keys=path.split('.');if(keys[0]==='layers')return `[${model.layers.length-Number(keys[1])}] ${model.layers[Number(keys[1])].name}`;return (keys[0]==='substrate'?'[0] ':'')+model[keys[0]].name+(keys[0]==='substrate'?' (Substrat)':' (Einfallsmedium)');}
function labelFor(path){
 const field=path.split('.').at(-1);
 return ({n:'Brechungsindex',k:'Extinktionskoeffizient',thickness_nm:'Schichtdicke'}[field]||field)+' '+mediumLabel(path)+(field==='thickness_nm'?' (nm)':'');
}
function parameterOptions(){const out=[];state.model.layers.forEach((m,i)=>{for(const field of ['thickness_nm','n','k']){const path=`layers.${i}.${field}`;out.push([path,labelFor(path)]);}});for(const path of ['substrate.n','substrate.k','ambient.n'])out.push([path,labelFor(path)]);return out;}
function normalizeFitParameters(){
 const valid=new Set(parameterOptions().map(([path])=>path));
 state.parameters=state.parameters.map(p=>p.path&&!valid.has(p.path)?{...p,path:''}:p);
 if(state.parameters[0].path===state.parameters[1].path)state.parameters[1]={...state.parameters[1],path:''};
 if(!state.parameters[0].path&&state.parameters[1].path)state.parameters=[state.parameters[1],{...defaultBounds(''),path:''}];
}
function syncFitSelectors(){
 for(const select of $('layerEditor').querySelectorAll('[data-fit-path]')){
  const path=select.dataset.fitPath,slot=state.parameters.findIndex(p=>p.path===path),role=slot<0?'fix':String(slot);
  select.value=role;
  select.closest('.fit-field').dataset.fitRole=role;
  select.title=labelFor(path)+' · '+(slot<0?'fix: bleibt beim Fit unverändert':'Fitparameter '+(slot?'Y':'X'));
  select.setAttribute('aria-label',labelFor(path)+': fix, X oder Y');
  select.querySelector('option[value="1"]').disabled=!state.parameters[0].path||(slot===0&&!state.parameters[1].path);
 }
}
function setFitSelection(path,role){
 const previous=state.parameters.findIndex(p=>p.path===path);
 mutate(()=>{
  if(role==='fix'){
   if(previous>=0)state.parameters[previous]={...state.parameters[previous],path:''};
  }else{
   const slot=Number(role);
   if(!path)state.parameters[slot]={...state.parameters[slot],path:''};
   else if(previous>=0&&previous!==slot){
    [state.parameters[slot],state.parameters[previous]]=[state.parameters[previous],state.parameters[slot]];
   }else if(previous<0)state.parameters[slot]={path,...defaultBounds(path)};
  }
  normalizeFitParameters();
 });
 axesFromSearch();renderParameters();
}
function remapLayerParameters(mapIndex){
 for(const p of state.parameters){
  const match=/^layers\.(\d+)\.(.+)$/.exec(p.path);
  if(match){const index=mapIndex(Number(match[1]));p.path=index==null?'':`layers.${index}.${match[2]}`;}
 }
 normalizeFitParameters();
}
function renderParameters(){
 normalizeFitParameters();
 const options=parameterOptions();
 $('paramControls').innerHTML=state.parameters.map((p,i)=>`<div class="parameter ${i?'second':''}"><label>${i?'Y · Zweiter Parameter (optional)':'X · Erster Fitparameter'}</label><select data-param="${i}" data-prop="path" aria-label="Fitparameter ${i+1}"><option value="">${i?'Nicht variieren · 1D-Suche':'Fitparameter auswählen …'}</option>${options.map(([v,t])=>`<option value="${v}" ${p.path===v?'selected':''}>${esc(t)}</option>`).join('')}</select><div ${!p.path?'hidden':''}><div class="bounds"><label>Von<input data-num="${p.path.endsWith('thickness_nm')?'d':p.path.endsWith('.k')?'k':'n'}" data-param="${i}" data-prop="lower" inputmode="decimal" aria-label="Untergrenze ${i+1}" value="${quantityValue(p.lower,p)}" title="${quantityValue(p.lower,p)}"></label><label>Bis<input data-num="${p.path.endsWith('thickness_nm')?'d':p.path.endsWith('.k')?'k':'n'}" data-param="${i}" data-prop="upper" inputmode="decimal" aria-label="Obergrenze ${i+1}" value="${quantityValue(p.upper,p)}" title="${quantityValue(p.upper,p)}"></label><label>Suchraster<select data-param="${i}" data-prop="scale" aria-label="Suchraster ${i+1}"><option value="log" ${p.scale==='log'?'selected':''}>log</option><option value="linear" ${p.scale==='linear'?'selected':''}>linear</option></select></label></div><div class="positive-floor" ${!(p.path.endsWith('.k')&&p.scale==='log'&&p.lower===0)?'hidden':''}><label>Kleinster positiver Rasterwert · k = 0 separat<input data-num="k" data-param="${i}" data-prop="positive_min" inputmode="decimal" value="${numericText(p.positive_min||1e-8,'k')}"></label></div></div></div>`).join('');
 syncFitSelectors();decorateNumbers();
}
function renderDiagram(){
 const media=[['ambient',state.model.ambient,null],...state.model.layers.map((m,i)=>['film',m,i]),['substrate',state.model.substrate,null]];
 $('layerDiagram').innerHTML=media.map(([role,m,i])=>`<div class="diagram-row"><span class="diagram-index" ${i==null&&role!=='substrate'?'aria-hidden="true"':''}>${i==null?(role==='substrate'?'[0]':''):`[${state.model.layers.length-i}]`}</span><div class="band ${role}" aria-label="${esc(mediumLabel(i==null?role:`layers.${i}`))}"><div><b>${esc(i==null?m.name+(role==='substrate'?' (Substrat)':' (Einfallsmedium)'):m.name)}</b><small>${i==null?'d = ∞':'d = '+fixedNumber(m.thickness_nm,1)+' nm'}</small></div><div class="optics">n = ${quantityValue(m.n,'n')}<br>k = ${quantityValue(m.k,'k')}</div></div></div>`).join('');
}
function renderModel(){
 const m=state.model;$('modelName').value=m.name;numericInput('wavelength',m.wavelength_nm);$('convention').value=m.delta_convention;$('modelNotes').value=m.notes||'';
 function numericField(m,path,field,kind){
  const full=path+'.'+field;
  return `<div class="fit-field" data-fit-role="fix"><input data-path="${full}" data-num="${kind}" inputmode="decimal" value="${numericText(m[field],kind)}" title="${quantityValue(m[field],full)}" aria-label="${esc(labelFor(full))}"><select data-fit-path="${full}"><option value="fix">fix</option><option value="0">X</option><option value="1">Y</option></select></div>`;
 }
 function fixedField(value){return `<div class="fit-field" data-fit-role="fixed"><span class="na">${value}</span><span class="fit-fixed">fix</span></div>`;}
 function row(m,path,i,role){
  return `<div class="layer-editor-row"><span class="layer-number" ${i==null&&role!=='substrate'?'aria-hidden="true"':''}>${i==null?(role==='substrate'?'[0]':''):`[${state.model.layers.length-i}]`}</span><div class="layer-item ${role}"><div class="layer-row"><div class="medium-name"><input data-path="${path}.name" data-field="name" value="${esc(m.name)}" title="${esc(mediumLabel(path))}" aria-label="Name von ${esc(mediumLabel(path))}"></div>${numericField(m,path,'n','n')}${role==='ambient'?fixedField('0'):numericField(m,path,'k','k')}${i==null?fixedField('∞'):numericField(m,path,'thickness_nm','d')}<div class="layer-tools">${i==null?'':`<button data-layer="up" data-index="${i}" title="Schicht nach oben" ${i===0?'disabled':''}>↑</button><button data-layer="down" data-index="${i}" title="Schicht nach unten" ${i===state.model.layers.length-1?'disabled':''}>↓</button><button data-layer="delete" data-index="${i}" title="Schicht entfernen">×</button>`}</div></div></div></div>`;
 }
 $('layerEditor').innerHTML=row(m.ambient,'ambient',null,'ambient')+m.layers.map((l,i)=>row(l,`layers.${i}`,i,'film')).join('')+row(m.substrate,'substrate',null,'substrate');
 renderDiagram();renderParameters();$('modelList').value=state.modelFile||'';historyButtons();decorateNumbers();
}
function renderSettings(){const s=state.settings;for(const [id,key]of [['quality','quality'],['metric','metric'],['duplicates','duplicate_policy'],['uncertaintyMode','uncertainty_mode'],['bootstrap','bootstrap_samples']])$(id).value=s[key];numericInput('angleTolerance',s.angle_tolerance);numericInput('sigmaAngle',s.calibration?.angle_deg);numericInput('sigmaLambda',s.calibration?.wavelength_nm);}
async function refreshModels(){const data=await api('/api/models');$('modelFolder').value=data.model_dir;$('modelList').innerHTML='<option value="">Gespeichertes Modell auswählen …</option>'+data.models.map(m=>`<option value="${esc(m.file)}">${esc(m.name)}</option>`).join('');$('modelList').value=state.modelFile||'';if(data.invalid.length)toast(`${int(data.invalid.length)} ungültige Modelldateien übersprungen.`);}
function setModel(m,record=true){const fn=()=>{state.model=clone(m);state.modelFile=null;};record?mutate(fn):fn();renderModel();}
function selectedRows(){return state.rows.filter(r=>state.selected.has(r.id));}
function angleGroups(indices){const sorted=[...indices].sort((a,b)=>state.rows[a].angle-state.rows[b].angle),out=[];for(const i of sorted){const a=state.rows[i].angle;if(!out.length||a-out.at(-1).first>state.settings.angle_tolerance)out.push({first:a,indices:[i],key:'a:'+a.toPrecision(12)});else out.at(-1).indices.push(i);}for(const g of out){g.indices.sort((a,b)=>a-b);g.angle=g.indices.reduce((s,i)=>s+state.rows[i].angle,0)/g.indices.length;g.name='φ = '+numericText(g.angle,'angle')+'°';}return out;}
function selectionStats(){const idx=state.rows.flatMap((r,i)=>state.selected.has(r.id)?[i]:[]),gs=angleGroups(idx);$('statSelected').textContent=int(idx.length);$('statAngles').textContent=`${int(gs.length)} Winkel · ${gs.length>1?'Mehrwinkel':'Einwinkel'}fit`;$('rowCount').textContent=int(state.rows.length);$('selectAll').checked=state.rows.length>0&&state.selected.size===state.rows.length;$('selectAll').indeterminate=state.selected.size>0&&state.selected.size<state.rows.length;$('duplicateSummary').textContent=gs.some(g=>g.indices.length>1)?`${int(gs.filter(g=>g.indices.length>1).length)} Winkel mit Wiederholungen in der Auswahl`:'Keine wiederholten Winkel in der Auswahl';datasetContext();}
function filtered(){const term=$('filter').value.toLocaleLowerCase('de-DE'),angle=$('angleFilter').value,only=$('onlySelected').checked;return state.rows.flatMap((r,i)=>(!term||(r.source+' '+r.comment+' '+(i+1)).toLocaleLowerCase('de-DE').includes(term))&&(!angle||r.angle.toFixed(3)===angle)&&(!only||state.selected.has(r.id))?[i]:[]);}
function angleOptions(){const old=$('angleFilter').value,counts=new Map();for(const r of state.rows){const k=r.angle.toFixed(3);counts.set(k,(counts.get(k)||0)+1);}$('angleFilter').innerHTML='<option value="">Alle Winkel</option>'+[...counts].sort((a,b)=>Number(a[0])-Number(b[0])).map(([a,n])=>`<option value="${a}">${numericText(Number(a),'angle')}° (${int(n)})</option>`).join('');if(counts.has(old))$('angleFilter').value=old;}
function groupStatistics(g){return state.measurementStats?.groups?.find(s=>Math.abs(s.angle-g.angle)<=state.settings.angle_tolerance);}
function dataGroups(indices){let mode=state.view.groupBy;if(mode==='auto')mode=angleGroups(indices).some(g=>g.indices.length>1)?'angle':'none';if(mode==='none')return [];if(mode==='angle')return angleGroups(indices);const map=new Map();for(const i of indices){const name=state.rows[i].source;if(!map.has(name))map.set(name,{name,key:'s:'+name,indices:[]});map.get(name).indices.push(i);}return [...map.values()];}
function dataTable(){
 const indices=filtered(),groups=dataGroups(indices);state.groups=groups;
 let entries=[];
 if(groups.length){for(const g of groups){entries.push({type:'group',group:g});if(!state.collapsed.has(g.key))for(const i of g.indices)entries.push({type:'row',index:i,group:g});}}
 else entries=indices.map(index=>({type:'row',index}));
 const pages=Math.max(1,Math.ceil(entries.length/state.pageSize));
 state.page=Math.max(0,Math.min(state.page,pages-1));state.table={entries,indices,pages};
 const visible=entries.slice(state.page*state.pageSize,(state.page+1)*state.pageSize);
 if(visible[0]?.type==='row'&&visible[0].group)visible.unshift({type:'group',group:visible[0].group});
 function groupRow(g){
  const checked=g.indices.filter(i=>state.selected.has(state.rows[i].id)).length,s=g.angle==null?null:groupStatistics(g),note=s?`Auswahl: ${int(s.count)} Werte · sΔ = ${fmt(s.std_delta,3)}° · sΨ = ${fmt(s.std_psi,3)}° · ${s.usable?'u der Mittelwerte verfügbar':s.status}`:'Streuungsangaben beziehen sich auf die aktuelle Auswahl.';
  return `<tr class="group-row"><td><input type="checkbox" data-group-select="${esc(g.key)}" aria-label="Gruppe ${esc(g.name)} auswählen" ${checked===g.indices.length?'checked':''}></td><td colspan="5"><div class="group-title"><button data-group-toggle="${esc(g.key)}" title="Gruppe ein- oder ausklappen">${state.collapsed.has(g.key)?'▸':'▾'}</button><strong>${esc(g.name)}</strong><span>· ${int(g.indices.length)} Zeilen, ${int(checked)} gewählt</span></div><small>${esc(note)}</small></td></tr>`;
 }
 $('measurementRows').innerHTML=visible.length?visible.map(e=>{
  if(e.type==='group')return groupRow(e.group);
  const i=e.index,r=state.rows[i];
  return `<tr data-row="${i}" class="data-row ${state.selected.has(r.id)?'selected':''} ${state.jumpRow===i?'jump-target':''}"><td><input type="checkbox" aria-label="Messung ${i+1} auswählen" ${state.selected.has(r.id)?'checked':''}></td><td>${int(i+1)}</td><td title="${fixedNumber(r.angle,3)}">${numericText(r.angle,'angle')}</td><td class="red" title="${fixedNumber(r.delta,3)}">${numericText(r.delta,'angle')}</td><td class="blue" title="${fixedNumber(r.psi,3)}">${numericText(r.psi,'angle')}</td><td class="source" title="${esc(r.source+' · '+r.comment)}">${esc(r.source)}${r.comment?`<small>${esc(r.comment)}</small>`:''}</td></tr>`;
 }).join(''):'<tr><td colspan="6" style="text-align:center;padding:30px">Keine Messwerte in dieser Ansicht.</td></tr>';
 for(const box of $('measurementRows').querySelectorAll('[data-group-select]')){
  const g=groups.find(g=>g.key===box.dataset.groupSelect),n=g.indices.filter(i=>state.selected.has(state.rows[i].id)).length;
  box.indeterminate=n>0&&n<g.indices.length;
 }
 $('pageInfo').textContent=entries.length?`${int(state.page*state.pageSize+1)}–${int(Math.min((state.page+1)*state.pageSize,entries.length))} von ${int(entries.length)} Einträgen`:'0 Einträge';
 $('pageJump').value=int(state.page+1);$('pageCount').textContent='/ '+int(pages);
 $('firstPage').disabled=$('lastPage').disabled=!entries.length;
 $('prevPage').disabled=state.page===0;$('nextPage').disabled=state.page>=pages-1;
 $('pageJump').disabled=$('goPage').disabled=!entries.length;
 $('rowJump').disabled=$('goMeasurement').disabled=!state.rows.length;
 $('lastMeasurement').disabled=!indices.length;
 $('lastMeasurement').title=indices.length?'Letzte Messung in Dateireihenfolge: #'+int(indices.at(-1)+1):'Keine Messungen in dieser Ansicht';
 selectionStats();
}
function goDataPage(page,edge='start'){
 state.page=Math.max(0,Math.min(page,state.table.pages-1));state.jumpRow=null;dataTable();
 requestAnimationFrame(()=>{const viewport=document.querySelector('.measurement-scroll');viewport.scrollTop=edge==='end'?viewport.scrollHeight:0;});
}
function goListEdge(end){
 const group=end?state.groups.at(-1):state.groups[0];
 if(group&&state.collapsed.has(group.key)){state.collapsed.delete(group.key);dataTable();}
 goDataPage(end?state.table.pages-1:0,end?'end':'start');
}
function jumpToPage(){
 const value=parseNumber($('pageJump').value);
 if(!Number.isInteger(value)||value<1||value>state.table.pages){$('pageJump').value=int(state.page+1);return toast(`Bitte eine Seite von 1 bis ${int(state.table.pages)} eingeben.`);}
 goDataPage(value-1);
}
function jumpToMeasurement(value=parseNumber($('rowJump').value)){
 if(!Number.isInteger(value)||value<1||value>state.rows.length)return toast(`Bitte eine Messungsnummer von 1 bis ${int(state.rows.length)} eingeben.`);
 const index=value-1;
 if(!state.table.indices.includes(index))return toast(`Messung ${int(value)} ist durch die aktuellen Filter ausgeblendet. Bitte den Filter anpassen.`);
 const group=state.groups.find(g=>g.indices.includes(index));
 if(group&&state.collapsed.has(group.key)){state.collapsed.delete(group.key);dataTable();}
 const position=state.table.entries.findIndex(e=>e.type==='row'&&e.index===index);
 if(position<0)return;
 state.page=Math.floor(position/state.pageSize);state.jumpRow=index;$('rowJump').value=int(value);dataTable();
 requestAnimationFrame(()=>{$('measurementRows').querySelector(`tr[data-row="${index}"]`)?.scrollIntoView({block:'center',behavior:'auto'});});
}
function setRows(rows,label,append=false){state.rows=append?[...state.rows,...rows]:rows;state.selected=append?new Set([...state.selected,...rows.map(r=>r.id)]):new Set(rows.map(r=>r.id));state.provenance=label;state.page=0;state.jumpRow=null;$('rowJump').value='';lastRow=null;state.collapsed.clear();$('filter').value='';$('angleFilter').value='';$('onlySelected').checked=false;$('provenance').textContent=label;angleOptions();dataTable();scheduleStatistics();stale();}
function scheduleStatistics(){clearTimeout(statisticsTimer);const ticket=++statisticsTicket;statisticsTimer=setTimeout(async()=>{const measurements=selectedRows().map(({id,angle,delta,psi})=>({id,angle,delta,psi}));if(!measurements.length){state.measurementStats=null;measurementUncertainty();return;}try{const stats=await api('/api/observations',{method:'POST',body:{measurements,angle_tolerance:state.settings.angle_tolerance,duplicate_policy:state.settings.duplicate_policy}});if(ticket!==statisticsTicket)return;state.measurementStats=stats;measurementUncertainty();dataTable();}catch(e){toast(e.message,'critical');}},180);}
async function importFiles(files){if(state.busy)return;try{let rows=[],names=[],skipped=0;for(const file of files){const body=new FormData();body.append('file',file);const d=await api('/api/import',{method:'POST',body});rows.push(...d.rows);names.push(`${d.filename} · ${int(d.count)} Messungen`);skipped+=d.skipped.length;}if(rows.length)setRows(rows,names.join(' | '),$('appendImport').checked);toast(`${int(rows.length)} Messungen geladen.${skipped?` ${int(skipped)} ungültige Zeilen übersprungen.`:''} Nur dieselbe unveränderte Probe gemeinsam fitten.`);}catch(e){toast(e.message,'critical');}}
async function reference(initial=false){const r=await api('/api/reference');setModel(r.model,!initial);setRows(r.rows,'Synthetische Referenz: d = 118 nm, n = 1,46 · Keine Originalmessungen');}
function settings(){return clone(state.settings);}
function migratedSettings(s={}){const v=clone(DEFAULT_SETTINGS);for(const key of Object.keys(v))if(s[key]!=null)v[key]=clone(s[key]);v.calibration={...DEFAULT_SETTINGS.calibration,...s.calibration};return v;}
function duplicateQuestion(groups){$('duplicateGroups').innerHTML=groups.map(g=>`${numericText(g.angle,'angle')}° · ${int(g.indices.length)} Messungen`).join('<br>');return new Promise(resolve=>{const dialog=$('duplicateDialog');dialog.returnValue='cancel';dialog.addEventListener('close',()=>resolve(dialog.returnValue),{once:true});dialog.showModal();});}
async function run(){if(state.busy)return;try{axesFromSearch();const rows=selectedRows();if(!rows.length)throw new Error('Bitte mindestens eine Messung auswählen.');if(!state.parameters.some(p=>p.path))throw new Error('Bitte mindestens einen Fitparameter mit X oder Y auswählen.');const request={model:clone(state.model),measurements:clone(rows),parameters:state.parameters.filter(p=>p.path).map(clone),...settings()};const gs=angleGroups(state.rows.flatMap((r,i)=>state.selected.has(r.id)?[i]:[])).filter(g=>g.indices.length>1);if(gs.length&&request.duplicate_policy==='ask'){const policy=await duplicateQuestion(gs);if(!['repeat','average'].includes(policy))return;request.duplicate_policy=policy;}busy(true);historyButtons();status('Globale Suche wird vorbereitet …');const job=await api('/api/fit',{method:'POST',body:request});state.job=job.job_id;while(true){await new Promise(r=>setTimeout(r,600));const s=await api('/api/jobs/'+state.job);status(s.message,s.progress);if(s.status==='failed')throw new Error(s.message);if(s.status==='cancelled')break;if(s.status==='completed'){state.result=await api(`/api/jobs/${state.job}/result`);state.resultJob=state.job;comparisonTicket++;state.active=0;state.trials=[];state.activeTrial=null;state.trialSequence=0;state.activeAlias=state.result.solutions[0].representative_alias;state.comparison=state.result.comparison;state.comparison.uncertainty=state.result.solutions[0].uncertainty;state.measurementStats=state.result.measurement_uncertainty;$('stale').hidden=true;results();break;}}}catch(e){status(e.message,0,true);toast(e.message,'critical');}finally{busy(false);historyButtons();}}
async function selectSolution(index,alias=null){if(!state.result)return;alias??=state.result.solutions[index].representative_alias;if(!state.activeTrial&&index===state.active&&alias===state.activeAlias)return;const ticket=++comparisonTicket;try{const c=index===0&&alias===state.result.solutions[0].representative_alias?state.result.comparison:await api(`/api/jobs/${state.resultJob}/comparison/${index}?alias=${alias}`);if(ticket!==comparisonTicket)return;state.activeTrial=null;state.active=index;state.activeAlias=alias;state.comparison=c;solutionTable();renderTrialTable();errorPlot();comparisonPlot();parameterUncertainty();identifiability();solutionRegions();renderNotices();datasetContext();}catch(e){toast(e.message,'critical');}}
// Colors describe physical angular RMS in degrees. Interpolate within decades.
const RMS_MAX=Math.sqrt((180**2+90**2)/2);
const RMS_ANCHORS=[[.001,'#159d4b'],[.1,'#70c66f'],[1,'#f1cf57'],[10,'#e65b52'],[RMS_MAX,'#e96aab']];
const RMS_LOG_MIN=-3,RMS_LOG_MAX=Math.log10(RMS_MAX);
const rmsLog=rms=>rms==null||!Number.isFinite(rms)?null:Math.log10(Math.max(rms,1e-12));
const rgbFromHex=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
function rmsColor(rms,alpha=1){
 let rgb;
 if(rms==null||!Number.isFinite(rms))rgb=[140,155,145];
 else if(rms<.001)rgb=rgbFromHex(RMS_ANCHORS[0][1]);
 else if(rms>=RMS_MAX)rgb=rgbFromHex(RMS_ANCHORS.at(-1)[1]);
 else{
  let a=RMS_ANCHORS[0],b=RMS_ANCHORS.at(-1);
  for(let i=1;i<RMS_ANCHORS.length;i++)if(rms<=RMS_ANCHORS[i][0]){a=RMS_ANCHORS[i-1];b=RMS_ANCHORS[i];break;}
  const f=(Math.log10(rms)-Math.log10(a[0]))/(Math.log10(b[0])-Math.log10(a[0])),x=rgbFromHex(a[1]),y=rgbFromHex(b[1]);
  rgb=x.map((v,i)=>Math.round(v+(y[i]-v)*f));
 }
 return `rgba(${rgb.join(',')},${alpha})`;
}
function rmsPlotColors(){
 const u=rms=>(Math.log10(rms)-RMS_LOG_MIN)/(RMS_LOG_MAX-RMS_LOG_MIN);
 return RMS_ANCHORS.map(([r,c])=>[u(r),c]);
}
function rmsColorbar(){return {title:{text:'RMS (°)'},thickness:12,len:.86,tickvals:[-3,-2,-1,0,1,RMS_LOG_MAX],ticktext:['≤ 0,001','0,01','0,1','1','10',fmt(RMS_MAX)]};}
function renderRmsLegend(){
 const entries=[[.001,'≤ 0,001°'],[.01,'0,01°'],[.1,'0,1°'],[1,'1°'],[10,'10°'],[RMS_MAX,fmt(RMS_MAX)+'°']];
 $('rmsLegend').innerHTML=entries.map(([r,label])=>`<span><i style="background:${rmsColor(r)}"></i>${esc(label)}</span>`).join('');
}
function rmsBackground(axis){
 const [a,b]=axis.range,logarithmic=axis.type==='log',shapes=[];
 if(!Number.isFinite(a+b)||a===b)return shapes;
 const project=value=>{
  const coordinate=logarithmic?(value<=0?-Infinity:Math.log10(value)):value;
  return Math.max(0,Math.min(1,(coordinate-a)/(b-a)));
 };
 function rectangle(lo,hi,color){
  const first=project(lo),last=project(hi);
  if(Math.abs(last-first)<1e-10)return;
  shapes.push({type:'rect',xref:'paper',x0:0,x1:1,yref:'paper',y0:Math.min(first,last),y1:Math.max(first,last),fillcolor:color,line:{width:0},layer:'below'});
 }
 // All coordinates stay inside the viewport. Paper shapes cannot affect
 // Plotly's data autorange, even after zooming, panning or pressing Autoscale.
 rectangle(-Infinity,.001,rmsColor(0,.17));
 const steps=128,span=RMS_LOG_MAX+3;
 for(let i=0;i<steps;i++){
  const lo=10**(-3+span*i/steps),hi=i===steps-1?RMS_MAX:10**(-3+span*(i+1)/steps);
  rectangle(lo,hi,rmsColor(Math.sqrt(lo*hi),.17));
 }
 rectangle(RMS_MAX,Infinity,rmsColor(RMS_MAX,.17));
 return shapes;
}
function syncRmsBackground(el){
 if(!state.result||state.result.parameters.length!==1)return;
 const axis=el._fullLayout?.yaxis;
 if(!axis?.range)return;
 const signature=axis.type+'|'+axis.range.join('|');
 if(el._rmsBackgroundSignature===signature)return;
 el._rmsBackgroundSignature=signature;
 Plotly.relayout(el,{shapes:rmsBackground(axis)});
}
const plotOptions={responsive:true,displaylogo:false,scrollZoom:true,modeBarButtonsToRemove:['lasso2d','select2d'],toImageButtonOptions:{format:'svg',filename:'ElliFit',width:1200,height:800}};
function baseLayout(){return {font:{family:'Segoe UI, sans-serif',size:12,color:'#5d7d69'},separators:', ',margin:{l:70,r:24,t:15,b:75},paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'#fff',showlegend:false,hovermode:'closest',xaxis:{gridcolor:'#e7efe6',linecolor:'#cddfce',zeroline:false,ticks:'outside',automargin:true},yaxis:{gridcolor:'#e7efe6',linecolor:'#cddfce',zeroline:false,ticks:'outside',automargin:true}};}
function ticksLinear(lo,hi){if(!Number.isFinite(lo+hi))return [];if(lo===hi){lo-=Math.max(Math.abs(lo)*.1,1e-6);hi+=Math.max(Math.abs(hi)*.1,1e-6);}const rough=(hi-lo)/5,power=10**Math.floor(Math.log10(rough)),ratio=rough/power,step=([1,2,2.5,5,10].find(x=>x>=ratio)||10)*power,out=[];for(let x=Math.ceil(lo/step)*step;x<=hi+step*1e-8;x+=step)out.push(Math.abs(x)<step*1e-10?0:Number(x.toPrecision(12)));return out;}
function ticksLog(lo,hi){if(lo<=0||hi<=0)return [];const a=Math.floor(Math.log10(lo)),b=Math.ceil(Math.log10(hi)),out=[];if(b-a<2){for(const x of ticksLinear(lo,hi))if(x>0)out.push(x);}else{const stride=Math.max(1,Math.ceil((b-a)/9));for(let p=a;p<=b;p+=stride){const v=10**p;if(v>=lo*(1-1e-10)&&v<=hi*(1+1e-10))out.push(v);}}if(!out.length)out.push(lo,hi);return out;}
function axisSpec(values,label,log,zeroFloor=null){const finite=values.filter(x=>x!=null&&Number.isFinite(x)),lo=Math.min(...finite),hi=Math.max(...finite);let map=x=>x,note='',type=log?'log':'linear',ticks;
 if(log&&lo<=0){const pivot=zeroFloor||Math.max(1e-9,hi*1e-8);map=x=>x==null?null:Math.log10(1+Math.max(0,x)/pivot);type='linear';ticks=[0,...ticksLog(pivot,Math.max(pivot,hi))];note='Nahe null linear, positive Dekaden logarithmisch; null bleibt null.';}else ticks=log?ticksLog(lo,hi):ticksLinear(lo,hi);
 return {values:values.map(map),map,note,axis:{type,gridcolor:'#e7efe6',zeroline:false,ticks:'outside',automargin:true,title:{text:esc(label).replace(/ (?=\[\d+\])/,'<br>'),standoff:12},tickmode:'array',tickvals:ticks.map(map),ticktext:ticks.map(x=>fmt(x,4))}};}
function allMarkers(){const markers=[];state.result.solutions.forEach((s,i)=>s.aliases.forEach((a,j)=>markers.push({family:i,alias:j,values:a.values,rms:a.rmse_deg,rank:s.rank})));return markers;}
function errorPlot(){
 if(!state.result)return;
 const r=state.result,s=r.surface,two=r.parameters.length===2,l=baseLayout(),markers=allMarkers();
 $('surfaceView').hidden=!two;
 if($('errorPlot').querySelector('.placeholder'))$('errorPlot').replaceChildren();
 const ax=surfaceAxis(0),color=markers.map(m=>rmsColor(m.rms)),custom=markers.map(m=>[m.family,m.alias,`Familie ${int(m.rank)} · ${parameterHover(m.values)}<br>Winkel-RMS ${angleValue(m.rms)}°`]);
 let traces,note=ax.note;
 if(!two){
  const display=v=>v==null?null:state.view.logY?Math.max(v,1e-9):v,y=s.rms.map(display),ym=markers.map(m=>display(m.rms)),ay=axisSpec(y,'Winkel-RMS (°)',state.view.logY),finite=[...y,...ym,...state.trials.map(t=>display(t.rmse_deg))].filter(v=>v!=null&&Number.isFinite(v)),lo=Math.min(...finite),hi=Math.max(...finite);
  l.xaxis=ax.axis;l.yaxis=ay.axis;
  l.yaxis.autorangeoptions={clipmax:RMS_MAX};
  if(state.view.logY){const a=Math.log10(Math.max(lo,1e-9)),b=Math.log10(Math.max(hi,1e-8)),span=Math.max(b-a,1);l.yaxis.range=[a-.08*span,Math.min(RMS_LOG_MAX,b+.1*span)];}
  else l.yaxis.range=[0,Math.min(RMS_MAX,Math.max(hi*1.12,.01))];
  if(!state.view.logY)l.yaxis.rangemode='nonnegative';
  l.shapes=rmsBackground(l.yaxis);
  traces=[
   {x:ax.values,y,mode:'lines',line:{color:'#294b55',width:2},customdata:s.rms.map((v,i)=>`${esc(parameterSymbol(r.parameters[0]))} = ${quantityValue(s.axes[0][i],r.parameters[0])}<br>Winkel-RMS ${angleValue(v)}°`),hovertemplate:'%{customdata}<extra>Suchraster</extra>'},
   {x:markers.map(m=>ax.map(m.values[0])),y:ym,mode:'markers+text',text:markers.map(m=>String(m.rank)),textposition:'top center',textfont:{size:12,color:'#24434b'},marker:{color,size:markers.map(m=>!state.activeTrial&&m.family===state.active&&m.alias===state.activeAlias?12:9),line:{color:'#fff',width:2}},customdata:custom,hovertemplate:'%{customdata[2]}<extra></extra>'}
  ];
  $('errorCaption').textContent=`${int(r.counts.grid)} globale Stützstellen und lokale Verfeinerungen. Kleinere Winkel-RMS sind besser. Hintergrund und nummerierte Minima verwenden dieselbe feste RMS-Farbskala wie die Liste. ${note}${state.view.logY?' Numerische Nullwerte werden nur zur Log-Darstellung begrenzt.':''}`;
 }else{
  const ay=surfaceAxis(1),surface=$('surfaceView').value==='surface',logRms=s.rms.map(row=>row.map(rmsLog)),hover=s.rms.map((row,j)=>row.map((v,i)=>parameterHover([s.axes[0][i],s.axes[1][j]])+'<br>Winkel-RMS '+angleValue(v)+'°'));
  note=[ax.note,ay.note].filter(Boolean).join(' ');
  if(surface){
   l.margin={l:0,r:0,t:0,b:0};
   l.scene={xaxis:ax.axis,yaxis:ay.axis,zaxis:{type:'log',title:{text:'Winkel-RMS (°)'},tickvals:[1e-9,1e-6,.001,.01,.1,1,10,RMS_MAX],ticktext:['1e-9','1e-6','0,001','0,01','0,1','1','10',fmt(RMS_MAX)]},camera:{eye:{x:1.7,y:1.5,z:1.2}}};
   traces=[
    {type:'mesh3d',x:s.mesh.values.map(v=>ax.map(v[0])),y:s.mesh.values.map(v=>ay.map(v[1])),z:s.mesh.rms.map(v=>v==null?null:Math.max(v,1e-9)),i:s.mesh.triangles.map(t=>t[0]),j:s.mesh.triangles.map(t=>t[1]),k:s.mesh.triangles.map(t=>t[2]),intensity:s.mesh.rms.map(rmsLog),intensitymode:'vertex',colorscale:rmsPlotColors(),cmin:RMS_LOG_MIN,cmax:RMS_LOG_MAX,colorbar:rmsColorbar(),lighting:{ambient:1,diffuse:0,specular:0,roughness:1,fresnel:0},customdata:s.mesh.values.map((v,i)=>parameterHover(v)+'<br>Winkel-RMS '+angleValue(s.mesh.rms[i])+'°'),hovertemplate:'%{customdata}<extra>Berechneter Flächenstützpunkt</extra>'},
    {type:'scatter3d',x:markers.map(m=>ax.map(m.values[0])),y:markers.map(m=>ay.map(m.values[1])),z:markers.map(m=>Math.max(m.rms,1e-9)),mode:'markers+text',text:markers.map(m=>String(m.rank)),textposition:'top center',marker:{size:5,color,line:{color:'#fff',width:1}},customdata:custom,hovertemplate:'%{customdata[2]}<extra></extra>'}
   ];
  }else{
   l.margin.r=90;l.xaxis=ax.axis;l.yaxis=ay.axis;
   traces=[
    {type:'contour',x:ax.values,y:ay.values,z:logRms,colorscale:rmsPlotColors(),zmin:RMS_LOG_MIN,zmax:RMS_LOG_MAX,autocontour:false,contours:{start:RMS_LOG_MIN,end:RMS_LOG_MAX,size:(RMS_LOG_MAX-RMS_LOG_MIN)/60,coloring:'heatmap',showlines:true},line:{width:.3,color:'#ffffff65'},colorbar:rmsColorbar(),customdata:hover,hovertemplate:'%{customdata}<extra>Raster</extra>'},
    {type:'scatter',x:markers.map(m=>ax.map(m.values[0])),y:markers.map(m=>ay.map(m.values[1])),mode:'markers+text',text:markers.map(m=>String(m.rank)),textposition:'top center',textfont:{size:12,color:'#25424d'},marker:{size:markers.map(m=>!state.activeTrial&&m.family===state.active&&m.alias===state.activeAlias?13:9),color,line:{color:'#fff',width:2}},customdata:custom,hovertemplate:'%{customdata[2]}<extra></extra>'}
   ];
  }
  const profile=r.identifiability?.profile;
  if(profile&&$('showValley').checked){
   const points=profile.overlay;
   traces.push({type:surface?'scatter3d':'scatter',x:points.map(p=>ax.map(p.values[0])),y:points.map(p=>ay.map(p.values[1])),...(surface?{z:points.map(p=>Math.max(p.rmse_deg,1e-9))}:{}),mode:'markers',marker:{size:surface?2.5:4,color:points.map(p=>rmsColor(p.rmse_deg)),line:{color:'#325d66',width:surface?.4:.7}},customdata:points.map(p=>`${parameterHover(p.values)}<br>RMS Einzelwerte ${angleValue(p.rmse_deg)}°<br>RMS Winkelmittelwerte ${angleValue(p.mean_rmse_deg)}°`),hovertemplate:'%{customdata}<extra>Talpunkt · kein Minimum</extra>'});
   if(!surface)traces[1].zorder=5;
  }
  traces.push(...regionTraces(ax,ay,surface));
  if(!surface)traces[1].zorder=8;
  $('errorCaption').textContent=`${int(r.counts.grid)} Rasterpunkte. Feste, über die Dekaden abgestufte Winkel-RMS-Farbskala; kleinere Werte sind besser.${surface?' Höhe: Winkel-RMS, logarithmisch; beste Fits liegen in den Tälern. Talpunkte und Minima sind Stützpunkte der adaptiv nachgerechneten Fläche. Numerische Nullwerte werden nur zur Darstellung begrenzt.':''} Türkise Umrandungen zeigen die gewählte Messverträglichkeit und verwenden eine andere Bedeutung als die RMS-Farben. Nummerierte Punkte sind bestätigte Minima.${profile&&$('showValley').checked?' Kleine umrandete Punkte zeigen das numerische Fehlertal; sie sind keine weiteren Minima.':''} ${note}`;
 }
 traces.push(...trialTraces(ax,two?surfaceAxis(1):null,two&&$('surfaceView').value==='surface'));
 Plotly.react('errorPlot',traces,l,plotOptions).then(()=>{const el=$('errorPlot');if(!el._elliClick){el.on('plotly_click',e=>{const point=e.points[0];if(point.data?.meta?.kind==='trial'){selectTrial(point.customdata[0]);return;}if(point.curveNumber===1&&Array.isArray(point.customdata))selectSolution(point.customdata[0],point.customdata[1]);});el.on('plotly_relayout',()=>syncRmsBackground(el));el._elliClick=true;}if(two)el._rmsBackgroundSignature=null;else{el._rmsBackgroundSignature=null;syncRmsBackground(el);}});
}
function splitDelta(x,y){const xx=[],yy=[];for(let i=0;i<x.length;i++){if(i&&y[i]!=null&&y[i-1]!=null&&Math.abs(y[i]-y[i-1])>180){xx.push(null);yy.push(null);}xx.push(x[i]);yy.push(y[i]);}return [xx,yy];}
function comparisonPlot(){const c=state.comparison;if(!c)return;if($('comparisonPlot').querySelector('.placeholder'))$('comparisonPlot').replaceChildren();const log=state.view.comparisonLog??(c.mode==='parameter'&&c.scale==='log');$('comparisonLogX').checked=log;const ax=axisSpec(c.x,c.xlabel,log,c.zero_floor),l=baseLayout();l.margin.r=65;l.xaxis=ax.axis;l.yaxis={...l.yaxis,range:[0,360],tickmode:'array',tickvals:[0,60,120,180,240,300,360],ticktext:['0','60','120','180','240','300','360'],title:{text:'Δ (°)',font:{color:'#cb3948'},standoff:8},tickfont:{color:'#cb3948'}};l.yaxis2={overlaying:'y',side:'right',range:[0,90],tickmode:'array',tickvals:[0,15,30,45,60,75,90],ticktext:['0','15','30','45','60','75','90'],title:{text:'Ψ (°)',font:{color:'#2568c5'},standoff:8},tickfont:{color:'#2568c5'},showgrid:false,zeroline:false};const [xd,yd]=splitDelta(ax.values,c.delta),stride=Math.max(1,Math.ceil(c.points.length/3500)),points=c.points.filter((_,i)=>i%stride===0);const traces=[{x:xd,y:yd,mode:'lines',line:{color:'#cb3948',width:2},hoverinfo:'skip'},{x:ax.values,y:c.psi,mode:'lines',line:{color:'#2568c5',width:2},yaxis:'y2',hoverinfo:'skip'}];for(const [field,color,symbol,axis]of [['delta','#cb3948','circle','y'],['psi','#2568c5','diamond','y2']])traces.push({x:points.map(p=>ax.map(p.x)),y:points.map(p=>p[field]),mode:'markers',marker:{color,size:7,symbol,line:{color:'#fff',width:1}},yaxis:axis,customdata:points.map(p=>`${c.mode==='angle'?'φ = '+fixedNumber(p.x,3)+'°':esc(parameterSymbol(state.result.parameters.find(par=>par.path===c.parameter_path)))+' = '+quantityValue(p.x,c.parameter_path)} · ${field==='delta'?'Δ':'Ψ'} = ${fixedNumber(p[field],3)}°<br>${esc(p.comment||p.source)}${p.comment?'<br>'+esc(p.source):''}`),hovertemplate:'%{customdata}<extra>Messung</extra>'});Plotly.react('comparisonPlot',traces,l,plotOptions);$('comparisonTitle').textContent=c.mode==='angle'?'Winkelabhängiger Modellvergleich':'Parameterabhängiger Modellvergleich';$('comparisonCaption').textContent=(c.mode==='angle'?'Linien: Theorie; Punkte: ausgewählte Messwerte.':'Messpunkte am gefitteten Parameterwert.')+(c.fixed_parameter_label?` ${c.fixed_parameter_label} bleibt für diese Kurve auf dem Wert der gewählten Lösung fixiert.`:'')+(stride>1?' Nur die Punktdarstellung ist ausgedünnt; alle gewählten Werte wurden gefittet.':'')+' '+ax.note;}
function quantityLabel(p){return parameterSymbol(p)+(p.path.endsWith('thickness_nm')?' (nm)':'');}
function resultMedium(p){return p.medium_label||mediumLabel(p.path,state.result.model);}
function parameterHeading(p){return `<span class="quantity">${esc(quantityLabel(p))}</span><small>${esc(resultMedium(p))}</small>`;}
function solutionTable(){
 const r=state.result,params=r.parameters;
 $('resultTable').innerHTML=`<table><thead><tr><th>#</th>${params.map(p=>`<th class="solution-parameter" title="${esc(p.label)}">${parameterHeading(p)}</th>`).join('')}<th>RMS (°) ↓</th><th>Hinweis</th></tr></thead><tbody>${r.solutions.map((s,i)=>{
  const detail=s.periodic?`<tr class="family-detail"><td colspan="${params.length+3}"><span class="period-badge">↻ ${int(s.alias_count)} periodische Lösungen</span><span>${s.periods.map(p=>'T = '+numericText(p.period_nm,'d')+' nm').join(' · ')}</span><div class="alias-chips">${s.aliases.slice(0,6).map((a,j)=>`<button data-family="${i}" data-alias="${j}" class="${!state.activeTrial&&state.active===i&&state.activeAlias===j?'active':''}">${a.values.map((v,k)=>quantityValue(v,params[k])+(params[k].path.endsWith('thickness_nm')?' nm':'')).join(' / ')}</button>`).join('')}</div>${s.aliases.length>6?`<details><summary>Weitere Wiederholungen (${int(s.aliases.length-6)})</summary><div class="alias-chips">${s.aliases.slice(6).map((a,j)=>`<button data-family="${i}" data-alias="${j+6}">${a.values.map((v,k)=>quantityValue(v,params[k])).join(' / ')}</button>`).join('')}</div></details>`:''}${s.alias_count>s.aliases.length?`<p class="family-meta">Erste ${int(s.aliases.length)} von ${int(s.alias_count)} analytischen Wiederholungen im Suchbereich.</p>`:''}</td></tr>`:'';
  return `<tr class="family-row ${!state.activeTrial&&i===state.active?'active':''}" data-family="${i}" style="background:${rmsColor(s.rmse_deg,.17)}"><td>${int(s.rank)}</td>${s.values.map((v,k)=>`<td title="${quantityValue(v,params[k])}">${quantityValue(v,params[k])}</td>`).join('')}<td>${rmsText(s.rmse_deg)}</td><td>${s.periodic?'<span class="period-badge">↻ Familie</span>':''}${s.at_boundary?'<span class="boundary">Globales Randminimum</span>':''}${r.identifiability?.saturated?`<span class="interpolation-badge" title="Keine unabhängigen Freiheitsgrade zur Modellprüfung">${s.mean_fit?.numerical_match?'Winkelmittelwerte getroffen':'Keine Modellprüfung'}</span>`:s.reduced_chi2!=null?`<span title="Diagnostisch; Kovarianzen aus Wiederholungen geschätzt">χ²red ${fmt(s.reduced_chi2,3)}</span>`:''}</td></tr>${detail}`;
 }).join('')}</tbody></table>`;
 const selected=r.solutions[state.active];$('activeLabel').textContent=activeTrial()?`Probelösung T${state.activeTrial} · nicht optimiert`:`Familie ${int(selected.rank)}${selected.alias_count>1?' · Wiederholung '+int(state.activeAlias+1):''}`;
}
function measurementUncertainty(){const stats=state.measurementStats;if(!stats?.groups?.length){$('measurementUncertainty').innerHTML='<p class="empty-small">Keine ausgewählten Messungen.</p>';$('uncertaintySummary').textContent='Messunsicherheiten werden aus geeigneten Wiederholungen bestimmt. Fehlende Angaben sind nicht null.';return;}const n=stats.groups.filter(g=>g.usable).length;$('uncertaintySummary').textContent=`Für ${int(n)} von ${int(stats.groups.length)} Winkeln liegen geeignete Kovarianzschätzungen vor. ${!stats.complete?'Ohne vollständige geeignete Kovarianzen erfolgt ein ungewichteter Fit.':state.settings.uncertainty_mode!=='auto'?'Automatische Gewichtung ist ausgeschaltet.':state.settings.metric!=='angular'?'Der Stokes-Fit verwendet keine automatische Winkelgewichtung.':'Automatische Gewichtung möglich.'} Die Annahme unabhängiger Wiederholungen derselben stabilen Probe muss erfüllt sein.`;$('measurementUncertainty').innerHTML=`<table><thead><tr><th>φ (°)</th><th>m</th><th>sΔ (°)</th><th>sΨ (°)</th><th>ūΔ (°)</th><th>ūΨ (°)</th><th>ρ</th></tr></thead><tbody>${stats.groups.map(g=>`<tr title="${esc(g.status)}"><td>${numericText(g.angle,'angle')}</td><td>${int(g.count)}</td><td>${fmt(g.std_delta,3)}</td><td>${fmt(g.std_psi,3)}</td><td>${fmt(g.uncertainty_mean_delta,3)}</td><td>${fmt(g.uncertainty_mean_psi,3)}</td><td>${fmt(g.correlation,3)}</td></tr>`).join('')}</tbody></table><p class="uncertainty-note">s: Streuung der Einzelwerte · ū: Unsicherheit des Mittelwerts · ρ: Δ/Ψ-Korrelation. „—“ bedeutet nicht bestimmbar, keine pauschale Ersatzunsicherheit.</p>`;}
function parameterUncertainty(){if(!state.result||!state.comparison)return;if(activeTrial()){$('parameterUncertaintyTitle').textContent='Probelösung T'+state.activeTrial;$('parameterUncertainty').innerHTML='<p class="info-inline">Nicht optimiert: Für diese Probelösung werden keine Fitunsicherheiten angegeben.</p>';return;}const u=state.comparison.uncertainty||state.result.solutions[state.active].uncertainty,params=state.result.parameters;$('parameterUncertaintyTitle').textContent=`Parameter · Familie ${int(state.active+1)}${state.result.solutions[state.active].periodic?', Wiederholung '+int(state.activeAlias+1):''}`;$('parameterUncertainty').innerHTML=`<table><thead><tr><th>Parameter</th><th>u statistisch</th><th>u Kalibrierung</th><th>u kombiniert</th></tr></thead><tbody>${params.map((p,i)=>`<tr title="${esc(p.label)}"><td class="parameter-cell">${parameterHeading(p)}</td><td>${fmt(u.statistical?.[i],3)}</td><td>${fmt(u.calibration?.[i],3)}</td><td>${fmt(u.combined?.[i],3)}</td></tr>`).join('')}</tbody></table><p class="uncertainty-note">${esc(u.note)}${u.correlation!=null?' Parameterkorrelation: '+correlationText(u.correlation)+'.':''} Fehlende Kalibrierangaben sind kein Nachweis eines verschwindenden systematischen Fehlers.</p>${u.bootstrap95?`<p class="uncertainty-note">Lokaler bedingter 95-%-Bootstrap (${int(u.bootstrap_samples)} Wiederholungen): ${params.map((p,i)=>`${esc(quantityLabel(p)+' · '+resultMedium(p))}: ${fmt(u.bootstrap95[i][0])} bis ${fmt(u.bootstrap95[i][1])}`).join(' · ')}. Getrennt je Lösungsfamilie; keine globale Eindeutigkeitsaussage.</p>`:''}${u.bootstrap_note?'<p class="uncertainty-note">'+esc(prettyMessage(u.bootstrap_note))+'</p>':''}${u.calibration_sources?.length?'<p class="uncertainty-note">Berücksichtigte Kalibrierquellen: '+u.calibration_sources.map(s=>esc(s.name)).join(', ')+'.</p>':''}`;}
function correlationText(value){
 if(value==null)return '—';
 if(Math.abs(value)>0.9999&&Math.abs(value)<1){const a=Math.abs(value);if(a>0.9999999995)return value<0?'< −0,999999999':'> 0,999999999';return (value<0?'−':'')+a.toFixed(9).replace('.',',');}
 return fmt(value,6);
}
const quantityFormatters=new Map();
function fixedNumber(value,places=3){if(value==null||!Number.isFinite(value))return '—';if(!quantityFormatters.has(places))quantityFormatters.set(places,new Intl.NumberFormat('de-DE',{minimumFractionDigits:places,maximumFractionDigits:places}));return quantityFormatters.get(places).format(value).replace(/\./g,' ').replace(/[\u00a0\u202f]/g,' ');}
function quantityValue(value,p){const field=(typeof p==='string'?p:p.path).split('.').at(-1);return numericText(value,field==='thickness_nm'?'d':field);}
function angleValue(value){return numericText(value,'angle');}
function parameterSymbol(p,model=state.result?.model||state.model){if(p.symbol)return p.symbol;const parts=p.path.split('.'),q=parts.at(-1)==='thickness_nm'?'d':parts.at(-1),index=parts[0]==='layers'?model.layers.length-Number(parts[1]):parts[0]==='substrate'?0:'Einfall';return `${q}[${index}]`;}
function parameterHover(values,params=state.result.parameters){return values.map((v,i)=>`${esc(parameterSymbol(params[i]))} = ${quantityValue(v,params[i])}${params[i].path.endsWith('thickness_nm')?' nm':''}`).join(' · ');}
function dataContext(rows){const map=new Map();for(const row of rows){const key=JSON.stringify([row.source,row.comment||'']);if(!map.has(key))map.set(key,{source:row.source,comment:row.comment||'',count:0});map.get(key).count++;}return {count:rows.length,label_count:map.size,labels:[...map.values()].slice(0,200),omitted_labels:Math.max(0,map.size-200)};}
function contextLabels(context){if(!context?.count)return '<span>Keine Messungen ausgewählt</span>';const label=x=>`<span class="dataset-chip">${esc(x.comment||x.source)}${x.comment?`<small>${esc(x.source)}</small>`:''}<b>× ${int(x.count)}</b></span>`,labels=context.labels||[];return `<div class="dataset-chips">${labels.slice(0,5).map(label).join('')}</div>${labels.length>5?`<details><summary>Alle ${int(context.label_count)} Bezeichnungen anzeigen</summary><div class="dataset-chips">${labels.slice(5).map(label).join('')}</div>${context.omitted_labels?`<p>${int(context.omitted_labels)} weitere Bezeichnungen; vollständige gewählte Zeilen im Residuenexport.</p>`:''}</details>`:''}`;}
function datasetContext(){const current=dataContext(selectedRows()),fitted=state.result?.measurement_context,context=fitted||current,same=fitted&&JSON.stringify(current)===JSON.stringify(fitted),labels=context.labels||[],first=labels[0],name=first?(first.comment||first.source):'Keine Messungen ausgewählt',title=fitted?'Daten des gezeigten Vergleichs':'Für den Fit ausgewählt';$('datasetContext').innerHTML=`<span>${title}</span><strong title="${esc(labels.slice(0,8).map(x=>x.comment||x.source).join(' · '))}">${esc(name)}${labels.length>1?' + '+int(context.label_count-1):''}</strong><small>${first?esc(first.source)+' · ':''}${int(context.count)} Messungen${fitted&&!same?' · Auswahl geändert':''}</small><details><summary>Bezeichnungen und Auswahl</summary>${contextLabels(context)}${fitted&&!same?`<div class="next-dataset"><b>Für den nächsten Fit · ${int(current.count)} Messungen</b>${contextLabels(current)}</div>`:''}</details>`;}
function axesFromSearch(){const pars=state.parameters.filter(p=>p.path);if(!pars.length)return;state.view.logX=pars[0].scale==='log';if(pars.length===2)state.view.logY=pars[1].scale==='log';state.view.comparisonLog=null;$('plotLogX').checked=state.view.logX;$('plotLogY').checked=state.view.logY;}
function regionLevel(){return state.result?.identifiability?.regions?.levels?.find(l=>Math.abs(l.confidence-Number($('regionConfidence').value))<1e-8);}
function solutionRegions(){
 const r=state.result,d=r?.identifiability,region=d?.regions,panel=$('solutionRegions');
 panel.hidden=!r||r.parameters.length!==2;if(panel.hidden)return;
 const available=region?.available,level=regionLevel(),confidence=Math.round(Number($('regionConfidence').value)*100),polygons=level?.polygons||[];
 $('regionControls').hidden=!available;$('regionExport').disabled=!available;
 const coupled=d.strongly_correlated||r.solutions.some(s=>s.uncertainty?.weak);
 $('regionTitle').textContent=available?(level?.broad?'Ausgedehnte Lösungsbereiche – einzelne Minima allein reichen nicht':polygons.length?'Messverträgliche Lösungsbereiche statt isolierter Punktangaben':'Kein messverträglicher Bereich im berechneten Netz'):(coupled?'Starke Parameterkopplung – statistischer Lösungsbereich unbekannt':'Statistischer Lösungsbereich nicht bestimmbar');
 panel.dataset.kind=available&&level?.broad||coupled?'warning':'info';
 $('regionExplanation').textContent=available?`${confidence}-%-Vergleich mit der Wiederholstreuung: Türkise Umrandungen zeigen die ermittelten messverträglichen Parameterpaare; Minima markieren Punktschätzungen. Gleich gute Familien sind anhand dieser Daten nicht gegeneinander auswählbar. Berücksichtigt wird nur Messstreuung bei festen übrigen Modell- und Kalibrierwerten.`:region?.unavailable_reason||'Geeignete Wiederholungen sind nötig, um aus einem kleinen RMS einen statistischen Bereich abzuleiten. Ein schmales Fehlertal allein liefert keine Unsicherheitsgrenze.';
 $('regionDetails').hidden=!available;$('regionAssumptions').textContent=available?`${region.groups>1?'Der gemeinsame Vergleich mehrerer Winkel ist durch Bonferroni-Korrektur konservativ. ':''}${region.assumptions} ${region.note}`:'';
 const trial=activeTrial(),family=r.solutions[state.active].rank,chosen=trial?[]:polygons.filter(p=>p.members.some(m=>m.family===family&&m.alias===state.activeAlias));
 const ranges=chosen.map(p=>`<div class="region-range">${r.parameters.map((par,i)=>`<span>${esc(parameterSymbol(par))}: ${quantityValue(p.bounds[i][0],par)} bis ${quantityValue(p.bounds[i][1],par)}${par.path.endsWith('thickness_nm')?' nm':''}</span>`).join('')}${p.members.some(m=>m.family!==family)?'<b>Bereich verbindet mehrere Familien.</b>':''}</div>`).join('');
 $('regionRanges').innerHTML=trial?`<p>Probelösung T${trial.id}: ${trial.compatibility_p==null?'Messverträglichkeit nicht bestimmbar':trial.compatibility_p>=1-Number($('regionConfidence').value)?'im gewählten Mittelwertvergleich vereinbar':'außerhalb der gewählten Messverträglichkeit'}. Nicht optimiert.</p>`:ranges;
 $('regionExplanation').hidden=true;
 $('regionAssumptions').textContent=available?`${int(polygons.length)} dargestellte Teilbereiche einschließlich periodischer Wiederholungen. Die Spannweiten sind keine frei kombinierbaren Werteintervalle. ${polygons.some(p=>p.clipped)?'Mindestens ein Bereich ist beschnitten. ':''}${region.assumptions} ${region.note}`:'';
 $('regionBrief').textContent=available?'Messstreuung; übrige Modellwerte fest. Minima sind Punktschätzungen.':region?.unavailable_reason||'Ohne geeignete Wiederholungen kein statistischer Bereich.';

}
function regionTraces(ax,ay,surface){
 if(!$('showRegions').checked)return [];
 const level=regionLevel();if(!level)return [];
 return level.polygons.map((polygon,index)=>{
  const x=[],y=[],z=[];for(const loop of polygon.loops){const values=[...loop.values,loop.values[0]],rms=[...loop.rmse_deg,loop.rmse_deg[0]];values.forEach((v,i)=>{x.push(ax.map(v[0]));y.push(ay.map(v[1]));z.push(Math.max(rms[i]??1e-9,1e-9));});x.push(null);y.push(null);z.push(null);}
  const label=`${Math.round(level.confidence*100)}-%-Messverträglichkeit · Teilbereich ${index+1}`;
  return surface?{type:'scatter3d',x,y,z,mode:'lines',line:{color:'#004f68',width:5},hoverinfo:'skip',name:label}:{type:'scatter',x,y,mode:'lines',fill:'toself',fillcolor:'rgba(0,101,128,.16)',line:{color:'#005f7b',width:2},hoverinfo:'skip',name:label,zorder:3};
 });
}


function identifiability(){
 const r=state.result,d=r?.identifiability,panel=$('identifiabilityPanel');
 panel.hidden=!d;if(!d)return;if(activeTrial()){$('identifiabilitySummary').innerHTML='<p>Der Modellvergleich zeigt die manuelle Probelösung T'+state.activeTrial+'. Das Talprofil und die gefundenen Familien gehören zur abgeschlossenen Suche.</p>';$('parameterRelations').innerHTML='';$('valleyDetails').hidden=!d.profile;if(d.profile)profilePlot();return;}
 const solution=r.solutions[state.active],u=state.comparison?.uncertainty||solution.uncertainty,params=r.parameters;
 const mean=solution.mean_fit,correlation=u.correlation??u.coupling_correlation,rank=u.sensitivity_rank;
 const parts=[`<p><strong>${int(d.unique_angles)} Messwinkel · ${int(d.independent_mean_components)} skalare Winkelmittelwerte · ${int(d.free_parameters)} freie Parameter.</strong> ${d.saturated?'Keine verbleibenden Freiheitsgrade zur unabhängigen Modellprüfung. Zwei Messgrößen und zwei Parameter ergeben bei vollem Rang isolierte Lösungen; daraus folgt keine durchgehend exakte Lösungskurve.':`${int(d.lack_of_fit_dof)} verbleibende Freiheitsgrade auf Ebene der Winkelmittelwerte.`}</p>`];
 if(mean)parts.push(`<p>Gewählte Familie: RMS der Winkelmittelwerte <strong>${rmsText(mean.rmse_deg)}°</strong>${mean.numerical_match?' · Mittelwerte numerisch getroffen (Toleranz 0,000001°)':''}. Die Streuung der Einzelmessungen bleibt bestehen; ihr RMS-Anteil bei exakt getroffenen Mittelwerten beträgt ${rmsText(d.repeated_rms_floor_deg)}°. Dieser Wert ist keine zusätzliche Unsicherheit.</p>`);
 if(params.length===2)parts.push(`<p>${u.weak?'Numerisch schwacher oder rangdefekter Zusammenhang: keine verlässliche lokale Trennung der Parameter.':u.strongly_correlated?'Sehr starke lokale Kopplung: eine Parameteränderung lässt sich weitgehend durch den anderen Parameter kompensieren.':'Die lokale Empfindlichkeit erlaubt eine Trennung der beiden Parameter.'} Rang ${int(rank??0)} von 2${correlation!=null?' · '+(u.correlation!=null?'Parameterkorrelation':'Kopplungsmaß')+' '+correlationText(correlation):''}. Lokaler Rang und Korrelation belegen keine globale Eindeutigkeit.</p>`);
 parts.push(`<p>${esc(d.note)}${r.minimum_checks?' Die ausgegebenen zweidimensionalen Minima wurden auf zulässige Stationarität und lokalen Abstieg geprüft.':''}</p>`);
 $('identifiabilitySummary').innerHTML=parts.join('');
 const relation=u.local_relation;
 const chosen=solution.aliases[state.activeAlias]?.values||solution.values,relations=[];
 if(relation&&u.strongly_correlated){
  const i=relation.dependent_index,j=relation.independent_index,si=parameterSymbol(params[i]),sj=parameterSymbol(params[j]);
  relations.push(`<div><strong>Lokale lineare Talrichtung</strong><p class="formula">${esc(si)} ≈ ${fmt(chosen[i],7)} ${relation.slope<0?'−':'+'} ${fmt(Math.abs(relation.slope),7)} · (${esc(sj)} − ${fmt(chosen[j],7)})</p><p>${esc(params[i].label)} als Funktion von ${esc(params[j].label)}; Zahlenwerte in den angegebenen Einheiten. Nur nahe der gewählten Lösung, mit den aktuellen Fitgewichten. Keine globale exakte Lösungskurve.</p></div>`);
 }
 const phase=d.phase_relation;
 if(phase){const i=phase.thickness_index,j=phase.index_index,c=chosen[i]*Math.sqrt(chosen[j]**2-phase.tangent_squared);relations.push(`<div><strong>Näherung über die optische Phase</strong><p class="formula">${esc(parameterSymbol(params[i]))} · √(${esc(parameterSymbol(params[j]))}² − ${fmt(phase.tangent_squared,7)}) ≈ ${fmt(c,7)} nm</p><p>Für ${esc(resultMedium(params[i]))}; periodische Kopien addieren ${fmt(phase.period_optical_nm,7)} nm zur rechten Seite. ${esc(phase.note)}</p></div>`);}
 $('parameterRelations').innerHTML=relations.join('');
 const profile=d.profile;$('valleyDetails').hidden=!profile;$('profileExport').disabled=!profile;
 if(!profile)return;
 profilePlot();
 $('profileCaption').textContent=`Für jeden vorgegebenen Wert von ${params[profile.fixed_index].label} wird ${params[profile.profiled_index].label} erneut minimiert. Gezeigt ist die Abweichung der beiden Winkelmittelwerte; der Einzelwert-RMS enthält zusätzlich deren Streuung. Nummerierte Punkte sind die gefundenen Familien. Die Talpunkte in der Fehlerlandschaft verwenden den Einzelwert-RMS und dieselbe Farbskala wie die Liste. Grüne Farbe allein bedeutet keine statistische Gleichwertigkeit. ${profile.note}`;
 $('profileCompatibility').textContent=profile.compatible95_threshold!=null?`Gemeinsamer 95-%-Mittelwertvergleich: ${profile.compatible95_method}; T² ≤ ${fmt(profile.compatible95_threshold,7)} bei ${int(profile.repetitions)} Wiederholungen. Zugehörige Profilpunkte sind kräftiger markiert und im CSV gekennzeichnet. ${profile.assumptions}`:'Ohne aktiv verwendete geeignete Wiederholkovarianz wird kein statistischer Verträglichkeitsbereich behauptet.';
}
function profilePlot(){
 const r=state.result,profile=r.identifiability.profile,col=profile.fixed_index,points=profile.points,params=r.parameters;
 const ax=axisSpec([...points.map(p=>p.values[col]),...state.trials.map(t=>t.values[col])],params[col].label,col===0?state.view.logX:state.view.logY,r.surface.zero_floors[col]),l=baseLayout();ax.values=points.map(p=>ax.map(p.values[col]));
 l.xaxis=ax.axis;l.yaxis={...l.yaxis,type:'log',title:{text:'RMS Winkelmittelwerte (°)'},tickformat:'.2~g'};
 const numerical=v=>v==null?null:Math.max(v,1e-9),minima=r.solutions.map((s,i)=>({x:s.values[col],y:s.mean_fit.rmse_deg,rank:s.rank,family:i}));
 const hover=points.map(p=>`${parameterHover(p.values,params)}<br>RMS Mittelwerte ${angleValue(p.mean_rmse_deg)}°<br>RMS Einzelwerte ${angleValue(p.rmse_deg)}°${p.statistic!=null?'<br>T² '+fixedNumber(p.statistic,3)+(p.compatible95?' · mit Mittelwerten auf 95-%-Niveau vereinbar':' · außerhalb des 95-%-Vergleichsbereichs'):''}`);
 const traces=[{x:ax.values,y:points.map(p=>numerical(p.mean_rmse_deg)),mode:'lines+markers',connectgaps:false,line:{color:'#547e75',width:1.5},marker:{size:points.map(p=>p.compatible95?5:3),color:points.map(p=>p.compatible95?'#176c70':'#b2c8c0')},customdata:hover,hovertemplate:'%{customdata}<extra>Numerisches Talprofil</extra>'},{x:minima.map(p=>ax.map(p.x)),y:minima.map(p=>numerical(p.y)),mode:'markers+text',text:minima.map(p=>String(p.rank)),textposition:'top center',marker:{color:r.solutions.map(s=>rmsColor(s.rmse_deg)),size:10,line:{color:'#284d57',width:1}},customdata:minima.map(p=>[p.family,parameterHover(r.solutions[p.family].values)]),hovertemplate:'Familie %{text}<br>%{customdata[1]}<extra>Minimum</extra>'}];
 traces.push(...trialTraces(ax,null,false,true));
 Plotly.react('profilePlot',traces,l,plotOptions).then(()=>{const el=$('profilePlot');if(!el._elliProfileClick){el.on('plotly_click',e=>{const p=e.points[0];if(p.data?.meta?.kind==='trial')selectTrial(p.customdata[0]);else if(p.curveNumber===1)selectSolution(p.customdata[0]);});el._elliProfileClick=true;}});
}
function zeroTests(){const tests=state.result?.zero_tests||[];$('zeroTests').innerHTML=tests.map(t=>`<div class="zero-card"><strong>Nullvergleich für ${esc(state.result.parameters.find(p=>p.path===t.path)?.label||t.path)}</strong><p>${esc(prettyMessage(t.message))}</p>${t.upper_limit!=null?`<p><strong>k ≲ ${fmt(t.upper_limit,3)}</strong> · Näherungsweise einseitige 95-%-Profilgrenze</p>`:''}${t.influence?`<small>Nach erneuter Anpassung des anderen Parameters: Änderung gegenüber k = 0 maximal Δ ${fmt(t.influence.delta_max_deg,3)}°, Ψ ${fmt(t.influence.psi_max_deg,3)}°.</small>`:''}${t.note?`<small>${esc(prettyMessage(t.note))}</small>`:''}</div>`).join('');}
function results(){
 const r=state.result,best=r.solutions[0];$('statRms').textContent=rmsText(best.rmse_deg)+'°';$('statFamilies').textContent=int(r.solutions.length);$('statAliases').textContent=`${int(r.counts.aliases)} Lösungen einschließlich Periodenwiederholungen`;$('statTime').textContent=fmt(r.elapsed_seconds,3)+' s';$('statCalls').textContent=int(r.counts.evaluations)+' Modellrechnungen';
 $('metricDescription').textContent=`Kleinere Winkel-RMS bedeuten bessere absolute Übereinstimmung. ${r.measurement_uncertainty.weighted?'Sortierung mit Wiederholkovarianzen gewichtet.':'Sortierung nach der ungewichteten Zielfunktion.'} Farbe allein belegt keine physikalische Plausibilität.`;
 $('exportResults').disabled=false;$('applySolution').disabled=false;$('status').hidden=true;
 solutionTable();renderTrialEditor(true);renderTrialTable();errorPlot();comparisonPlot();measurementUncertainty();parameterUncertainty();zeroTests();identifiability();solutionRegions();datasetContext();renderNotices();
}
function download(name,content,type='application/json'){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function csv(rows){return '\ufeff'+rows.map(row=>row.map(v=>'"'+String(typeof v==='number'?String(v).replace('.',','):v??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');}
function exportResult(kind){if(!state.result||!kind)return;const r=state.result;let rows;if(kind==='json')return download('ElliFit_Fitbericht.json',JSON.stringify({...r,displayed_family:state.activeTrial?null:state.active+1,displayed_alias:state.activeTrial?null:state.activeAlias+1,displayed_trial:state.activeTrial,manual_trials:state.trials.map(({comparison,...t})=>t),displayed_comparison:state.comparison},null,2));if(kind==='csv')rows=[['Familie',...r.parameters.map(p=>p.label),'RMS_Grad','Periodische_Loesungen','Perioden_nm','Wiederholungen','Randminimum','Chi2_reduziert_diagnostisch','RMS_Winkelmittelwerte_Grad','Modellpruefung_Freiheitsgrade'],...r.solutions.map(s=>[s.rank,...s.values,s.rmse_deg,s.alias_count,s.periods.map(p=>fmt(p.period_nm,12)).join(' / '),s.aliases.map(a=>a.values.map(v=>fmt(v,12)).join(' / ')).join(' | '),s.at_boundary,s.reduced_chi2??'',s.mean_fit?.rmse_deg??'',r.identifiability?.lack_of_fit_dof??''])];if(kind==='residuals')rows=[['Quelle','Originalzeile','Winkel_Grad','Delta_Grad','Psi_Grad','Modellwinkel_Grad','Delta_Fit','Psi_Fit','Delta_Residuum_zyklisch','Psi_Residuum'],...state.comparison.residuals.map(x=>[x.source,x.line,x.angle,x.delta,x.psi,x.model_angle,x.fit_delta,x.fit_psi,x.delta_residual,x.psi_residual])];if(kind==='trials')rows=[['Probelösung','Name',...r.parameters.map(p=>p.label),'RMS_Grad','Optimiert','Außerhalb_Suchbereich'],...state.trials.map(t=>['T'+t.id,t.name,...t.values,t.rmse_deg,false,t.outside_search])];if(kind==='regions'){const l=regionLevel();if(!l)return;rows=[['Vertrauensniveau','Teilbereich','Schleife',...r.parameters.map(p=>p.label),'RMS_Grad','Suchgrenze_beschnitten']];l.polygons.forEach((p,i)=>p.loops.forEach((loop,j)=>loop.values.forEach((v,k)=>rows.push([l.confidence,i+1,j+1,...v,loop.rmse_deg[k],p.clipped]))));}if(kind==='surface'){rows=[[...r.parameters.map(p=>p.label),'RMS_Grad']];if(r.surface.mesh)r.surface.mesh.values.forEach((v,i)=>rows.push([...v,r.surface.mesh.rms[i]]));else if(r.parameters.length===1)r.surface.axes[0].forEach((x,i)=>rows.push([x,r.surface.rms[i]]));else r.surface.axes[1].forEach((y,j)=>r.surface.axes[0].forEach((x,i)=>rows.push([x,y,r.surface.rms[j][i]])));}if(kind==='profile'){const p=r.identifiability?.profile;if(!p){toast('Für diesen Fit liegt kein Talprofil vor.');return;}rows=[[...r.parameters.map(p=>p.label),'RMS_Einzelwerte_Grad','RMS_Winkelmittelwerte_Grad','T2_Mittelwert','Mit_Mittelwert_95Prozent_vereinbar','T2_Grenze_95Prozent'],...p.points.map(x=>[...x.values,x.rmse_deg,x.mean_rmse_deg,x.statistic,x.compatible95,p.compatible95_threshold])];}download('ElliFit_'+kind+'.csv',csv(rows),'text/csv;charset=utf-8');}
async function refreshMaterials(){const r=await api('/api/materials');state.materials=r.materials;$('materialFolder').value=r.material_dir;$('materialList').innerHTML='<option value="">Material auswählen …</option>'+r.materials.map(m=>`<option value="${esc(m.file)}">${esc(m.name)}</option>`).join('');$('materialList').value=state.materialFile||'';}
function materialTargets(){
 const targets=['ambient',...state.model.layers.map((m,i)=>`layers.${i}`),'substrate'];
 $('materialTarget').innerHTML=targets.map(path=>`<option value="${path}">${esc(mediumLabel(path))}</option>`).join('');
 $('materialTarget').value=state.model.layers.length?'layers.0':'substrate';
}
function setMaterial(m,file=null){state.material=clone(m);state.materialFile=file;$('materialName').value=m.name;for(const [id,key]of [['materialN','n'],['materialK','k'],['materialWavelength','wavelength_nm'],['materialUncertaintyN','uncertainty_n'],['materialUncertaintyK','uncertainty_k']])numericInput(id,m[key]);$('materialNotes').value=m.notes||'';$('materialList').value=file||'';$('materialMessage').textContent='Werte gelten bei der gespeicherten Wellenlänge; keine automatische Dispersionsumrechnung.';}
async function materialsDialog(){materialTargets();await refreshMaterials();if(!state.material)setMaterial({schema_version:1,name:'Neues Material',n:1.5,k:0,wavelength_nm:state.model.wavelength_nm,notes:'',uncertainty_n:null,uncertainty_k:null});$('materialDialog').showModal();}

function numericText(value,kind='n'){
 if(value==null||!Number.isFinite(value))return '—';const places=['d','wavelength'].includes(kind)?1:kind==='int'?0:3,a=Math.abs(value);
 if(a>0&&a<10**(-places)){if(a<1e-6){const [m,e]=value.toExponential(2).split('e');return m.replace('.',',')+'e'+Number(e);}return fixedNumber(value,Math.min(12,Math.max(places,2-Math.floor(Math.log10(a)))));}
 return fixedNumber(value,places);
}
function decorateNumbers(root=document){
 for(const input of root.querySelectorAll('input[data-num]')){if(input.parentElement.classList.contains('number-field'))continue;const wrapper=document.createElement('span');wrapper.className='number-field';input.before(wrapper);wrapper.append(input);const buttons=document.createElement('span');buttons.className='number-buttons';for(const [step,text,label]of [[1,'▴','erhöhen'],[-1,'▾','verringern']]){const b=document.createElement('button');b.type='button';b.textContent=text;b.dataset.spin=step;b.setAttribute('aria-label',(input.getAttribute('aria-label')||input.id||'Wert')+' '+label);b.title=label;b.addEventListener('pointerdown',e=>e.preventDefault());buttons.append(b);}wrapper.append(buttons);}
}
function spinNumber(input,direction){
 const current=parseNumber(input.value,true)??0;if(!Number.isFinite(current))return toast('Bitte eine gültige Zahl eingeben.','warning');
 const kind=input.dataset.num;let value=Number((current+direction*numericStep(kind,current)).toPrecision(14));
 let min=kind==='n'?1e-12:0,max=kind==='n'||kind==='k'?100:kind==='d'?1e8:Infinity;
 if(input.id==='manualAngle'){min=.001;max=89.999;}if(input.id==='manualPsi')max=90;
 if(input.id==='angleTolerance'||input.dataset.prop==='positive_min')min=1e-12;
 if(['wavelength','materialWavelength'].includes(input.id))min=1e-12;
 if(input.id.startsWith('sigma')||input.id.includes('Uncertainty'))min=0;
 if(input.dataset.param!=null&&input.dataset.prop==='lower'&&state.parameters[Number(input.dataset.param)].scale==='log'&&kind!=='k')min=1e-12;
 value=Math.max(min,Math.min(max,value));input.value=numericText(value,kind);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));
}
function bindNumberButtons(){decorateNumbers();document.addEventListener('click',e=>{const b=e.target.closest('[data-spin]');if(b&&!b.disabled){e.preventDefault();spinNumber(b.closest('.number-field').querySelector('input'),Number(b.dataset.spin));}});}
let hoverWheelZone=null,localWheelZone=null,wheelHoverSince=0,lastPageWheel=-Infinity,wheelTimer=null,wheelX=-1,wheelY=-1;
function wheelZone(target){if(!(target instanceof Element))return null;const explicit=target.closest('.plot,.scroll,textarea,select,.dataset-context details,.stat-dataset details,.group-list');if(explicit)return explicit;for(let n=target;n&&n!==document.body&&n!==document.documentElement;n=n.parentElement)if(n.scrollHeight>n.clientHeight+1&&/(auto|scroll)/.test(getComputedStyle(n).overflowY))return n;return null;}
function resetWheelZone(zone=null){clearTimeout(wheelTimer);if(localWheelZone)localWheelZone.classList.remove('wheel-local');localWheelZone=null;hoverWheelZone=zone;wheelHoverSince=performance.now();armWheelDwell();}
function armWheelDwell(){clearTimeout(wheelTimer);if(!hoverWheelZone||localWheelZone===hoverWheelZone)return;const now=performance.now(),delay=Math.max(0,500-(now-wheelHoverSince),500-(now-lastPageWheel));wheelTimer=setTimeout(()=>{if(!hoverWheelZone?.isConnected)return;const actual=wheelZone(document.elementFromPoint(wheelX,wheelY));if(actual!==hoverWheelZone){resetWheelZone(actual);return;}if(performance.now()-lastPageWheel<495){armWheelDwell();return;}localWheelZone=hoverWheelZone;localWheelZone.classList.add('wheel-local');},delay+5);}
function bindDwellWheel(){
 document.addEventListener('pointermove',e=>{const now=performance.now(),moved=Math.hypot(e.clientX-wheelX,e.clientY-wheelY)>4;wheelX=e.clientX;wheelY=e.clientY;const zone=wheelZone(e.target);if(zone!==hoverWheelZone)resetWheelZone(zone);else if(moved&&!localWheelZone){wheelHoverSince=now;armWheelDwell();}},{passive:true});
 document.addEventListener('pointerleave',()=>resetWheelZone());window.addEventListener('blur',()=>resetWheelZone());
 window.addEventListener('scroll',()=>{lastPageWheel=performance.now();resetWheelZone(wheelZone(document.elementFromPoint(wheelX,wheelY)));},{passive:true});
 document.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey){e.stopImmediatePropagation();return;}if(e.shiftKey)return;wheelX=e.clientX;wheelY=e.clientY;const zone=wheelZone(e.target);if(!zone)return;if(zone!==hoverWheelZone)resetWheelZone(zone);const now=performance.now();if(e.altKey||localWheelZone===zone||now-wheelHoverSince>=500&&now-lastPageWheel>=500){localWheelZone=zone;zone.classList.add('wheel-local');return;}e.preventDefault();e.stopImmediatePropagation();lastPageWheel=now;wheelHoverSince=now;armWheelDwell();const factor=e.deltaMode===1?18:e.deltaMode===2?innerHeight*.85:1,dialog=zone.closest('dialog[open]');if(dialog)dialog.scrollBy({top:e.deltaY*factor,behavior:'auto'});else window.scrollBy({top:e.deltaY*factor,behavior:'auto'});},{capture:true,passive:false});
}
function notificationKind(text){const t=String(text).toLowerCase();return /fehlgeschlagen|fehler|nicht definiert|nicht vorhanden/.test(t)?'critical':/bitte|ungültig|übersprungen|muss |müssen|nicht erreichbar|keine mess/.test(t)?'warning':/gespeichert|geladen|übernommen|abgeschlossen|berechnet|gewechselt/.test(t)?'success':'info';}
function renderNotices(){
 if(!state.result){$('notices').hidden=true;return;}$('notices').hidden=false;
 const notices=state.result.notices||[{kind:'success',title:'Fit abgeschlossen',text:'Lösungen berechnet.'},...(state.result.warnings||[]).map(text=>({kind:'warning',title:'Auswertung',text}))];
 const trial=activeTrial();const items=[...notices,...(trial?.notices||[])],groups=[['critical','Prüfung erforderlich'],['warning','Einschränkungen'],['info','Informationen'],['success','Erledigt']];
 $('noticeCounts').innerHTML=groups.filter(([kind])=>items.some(n=>n.kind===kind)).map(([kind,label])=>`<span class="notice-count" data-kind="${kind}">${esc(label)}: ${int(items.filter(n=>n.kind===kind).length)}</span>`).join('');
 $('noticeCards').innerHTML=groups.filter(([kind])=>items.some(n=>n.kind===kind)).map(([kind,label])=>`<section class="notice-card" data-kind="${kind}"><h3>${esc(label)}</h3><ul>${items.filter(n=>n.kind===kind).map(n=>`<li><strong>${esc(n.title)}</strong><span>${esc(prettyMessage(n.text))}</span></li>`).join('')}</ul></section>`).join('');
 const critical=items.filter(n=>n.kind==='critical');$('criticalNotice').hidden=!critical.length;$('criticalNotice').textContent=critical.map(n=>n.text).join(' ');
 if(state.noticeJob!==state.resultJob){$('noticesDetails').open=critical.length>0;state.noticeJob=state.resultJob;}
}
function activeTrial(){return state.trials.find(t=>t.id===state.activeTrial)||null;}
function surfaceAxis(col){const r=state.result,grid=r.surface.axes[col],axis=axisSpec([...grid,...state.trials.map(t=>t.values[col])],r.parameters[col].label,col?state.view.logY:state.view.logX,r.surface.zero_floors[col]);axis.values=grid.map(axis.map);return axis;}
function renderTrialEditor(reset=false){
 const r=state.result;if(!r)return;if(!reset&&$('trialEditor').dataset.job===state.resultJob)return;
 state.trialDraft=[...r.solutions[0].values];$('trialEditor').dataset.job=state.resultJob;
 $('trialEditor').innerHTML=`<form id="trialForm"><div class="trial-heading"><h3>Eigene Probelösung</h3><button type="button" id="trialFromSelection" title="Werte des gezeigten Vergleichs übernehmen">Werte der Auswahl</button></div><div class="trial-fields">${r.parameters.map((p,i)=>`<label>${esc(parameterSymbol(p))}${p.path.endsWith('thickness_nm')?' (nm)':''}<input data-trial-param="${i}" data-num="${p.path.endsWith('thickness_nm')?'d':p.path.split('.').at(-1)}" inputmode="decimal" value="${quantityValue(state.trialDraft[i],p)}" aria-label="Probelösung ${esc(p.label)}"></label>`).join('')}<label>Name, optional<input id="trialName" maxlength="120" placeholder="z. B. Literaturwert"></label><button type="submit" id="addTrial">Ausprobieren</button></div><p>Direkte Modellrechnung, ohne Optimierung. Physikalisch gültige Werte außerhalb der Suchgrenzen sind möglich.</p></form>`;
 decorateNumbers($('trialEditor'));
}
function renderTrialTable(){
 const r=state.result;if(!r)return;$('trialTable').innerHTML=state.trials.length?`<h3>Probelösungen · nicht optimiert</h3><table><thead><tr><th>Name</th>${r.parameters.map(p=>`<th>${esc(quantityLabel(p))}</th>`).join('')}<th>RMS (°)</th><th></th></tr></thead><tbody>${state.trials.map(t=>`<tr class="trial-row ${state.activeTrial===t.id?'active':''}" data-trial="${t.id}" style="background:${rmsColor(t.rmse_deg,.13)}"><td><b>T${t.id}</b>${t.name?' · '+esc(t.name):''}${t.outside_search?'<small class="trial-outside">Außerhalb des Suchbereichs</small>':''}</td>${t.values.map((v,i)=>`<td>${quantityValue(v,r.parameters[i])}</td>`).join('')}<td>${rmsText(t.rmse_deg)}</td><td><button data-remove-trial="${t.id}" title="Probelösung entfernen" aria-label="Probelösung T${t.id} entfernen">×</button></td></tr>`).join('')}</tbody></table>`:'';
}
async function addTrial(){
 if(!state.result||state.busy)return;const values=state.trialDraft;if(values.length!==state.result.parameters.length||!values.every(Number.isFinite))return toast('Für jeden Parameter einen gültigen Zahlenwert eingeben.','warning');
 $('addTrial').disabled=true;try{const t=await api(`/api/jobs/${state.resultJob}/trial`,{method:'POST',body:{values,name:$('trialName').value}});t.id=++state.trialSequence;state.trials.push(t);selectTrial(t.id);toast(`Probelösung T${t.id} berechnet.`,'success');}catch(e){toast(e.message,'critical');}finally{if($('addTrial'))$('addTrial').disabled=false;}
}
function selectTrial(id){const t=state.trials.find(t=>t.id===id);if(!t)return;++comparisonTicket;state.activeTrial=id;state.comparison=t.comparison;solutionTable();renderTrialTable();errorPlot();comparisonPlot();parameterUncertainty();identifiability();solutionRegions();renderNotices();datasetContext();}
function trialTraces(ax,ay,surface=false,profile=false){
 if(!state.trials.length)return [];const r=state.result,col=profile?r.identifiability.profile.fixed_index:0;
 return [{type:surface?'scatter3d':'scatter',x:state.trials.map(t=>ax.map(t.values[col])),y:state.trials.map(t=>profile?Math.max(t.mean_fit.rmse_deg??1e-9,1e-9):ay?ay.map(t.values[1]):state.view.logY?Math.max(t.rmse_deg,1e-9):t.rmse_deg),...(surface?{z:state.trials.map(t=>Math.max(t.rmse_deg,1e-9))}:{}),mode:'markers+text',text:state.trials.map(t=>'T'+t.id),textposition:'top center',marker:{symbol:'diamond',size:state.trials.map(t=>surface?(state.activeTrial===t.id?7:5):(state.activeTrial===t.id?12:9)),color:'#295b9b',line:{color:'white',width:1.5}},customdata:state.trials.map(t=>[t.id,parameterHover(t.values)+'<br>Winkel-RMS '+angleValue(t.rmse_deg)+'°<br>Probelösung · nicht optimiert']),meta:{kind:'trial'},hovertemplate:'%{customdata[1]}<extra>%{text}</extra>',...(!surface?{zorder:10}:{})}];
}
function numericStep(kind,value){const base=['d','wavelength'].includes(kind)?.1:kind==='int'?1:.001,a=Math.abs(value);return a>0&&a<base?10**(Math.floor(Math.log10(a))-2):base;}
function bind(){
 renderRmsLegend();bindNumberButtons();bindDwellWheel();

 $('trialEditor').addEventListener('input',e=>{if(e.target.dataset.trialParam!=null)state.trialDraft[Number(e.target.dataset.trialParam)]=parseNumber(e.target.value);});
 $('trialEditor').addEventListener('change',e=>{if(e.target.dataset.trialParam!=null){const i=Number(e.target.dataset.trialParam),v=parseNumber(e.target.value);state.trialDraft[i]=v;if(Number.isFinite(v))e.target.value=quantityValue(v,state.result.parameters[i]);}});
 $('trialEditor').addEventListener('submit',e=>{e.preventDefault();addTrial();});
 $('trialEditor').addEventListener('click',e=>{if(e.target.closest('#trialFromSelection')){const values=activeTrial()?.values||state.result.solutions[state.active].aliases[state.activeAlias].values;state.trialDraft=[...values];for(const input of $('trialEditor').querySelectorAll('[data-trial-param]'))input.value=quantityValue(values[Number(input.dataset.trialParam)],state.result.parameters[Number(input.dataset.trialParam)]);}});
 $('trialTable').onclick=e=>{const remove=e.target.closest('[data-remove-trial]');if(remove){const id=Number(remove.dataset.removeTrial);state.trials=state.trials.filter(t=>t.id!==id);if(state.activeTrial===id)selectSolution(0,state.result.solutions[0].representative_alias);else{renderTrialTable();errorPlot();if(state.result.identifiability.profile)profilePlot();}return;}const row=e.target.closest('[data-trial]');if(row)selectTrial(Number(row.dataset.trial));};
 $('analysisDetails').addEventListener('toggle',()=>{if($('analysisDetails').open&&$('profilePlot').data)requestAnimationFrame(()=>Plotly.Plots.resize('profilePlot'));});
 $('showRegions').onchange=()=>errorPlot();$('regionConfidence').onchange=()=>{solutionRegions();errorPlot();};
 $('showValley').onchange=()=>errorPlot();
 document.addEventListener('keydown',e=>{const t=e.target;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!t.matches('input,textarea')){e.preventDefault();e.shiftKey?redo():undo();}});
 $('undo').onclick=undo;$('redo').onclick=redo;
 $('paramControls').addEventListener('change',e=>{const t=e.target;if(!t.dataset.prop)return;const i=Number(t.dataset.param),key=t.dataset.prop,value=['lower','upper','positive_min'].includes(key)?parseNumber(t.value):t.value;if(typeof value==='number'&&!Number.isFinite(value))return toast('Bitte eine gültige Zahl eingeben.');if(key==='path')setFitSelection(value,String(i));else{mutate(()=>state.parameters[i][key]=value);if(key==='scale'){axesFromSearch();errorPlot();if(state.result?.identifiability?.profile)profilePlot();}renderParameters();}});
 $('layerEditor').addEventListener('change',e=>{const t=e.target;if(t.dataset.fitPath){setFitSelection(t.dataset.fitPath,t.value);return;}if(!t.dataset.path)return;const value=t.dataset.field==='name'?t.value:parseNumber(t.value);if(typeof value==='number'&&!Number.isFinite(value))return toast('Bitte eine gültige Zahl eingeben.');mutate(()=>setPath(state.model,t.dataset.path,value));if(t.dataset.field==='name'){renderParameters();renderDiagram();}else{t.value=quantityValue(value,t.dataset.path);t.title=t.value;renderDiagram();}});
 $('layerEditor').addEventListener('click',e=>{const b=e.target.closest('[data-layer]');if(!b)return;const i=Number(b.dataset.index),action=b.dataset.layer;mutate(()=>{const ls=state.model.layers;if(action==='delete'){ls.splice(i,1);remapLayerParameters(index=>index===i?null:index>i?index-1:index);}else{const j=i+(action==='up'?-1:1);[ls[i],ls[j]]=[ls[j],ls[i]];remapLayerParameters(index=>index===i?j:index===j?i:index);}});renderModel();});
 for(const [id,key]of [['modelName','name'],['wavelength','wavelength_nm'],['convention','delta_convention'],['modelNotes','notes']])$(id).onchange=()=>{const value=id==='wavelength'?parseNumber($(id).value):$(id).value;if(typeof value==='number'&&!Number.isFinite(value))return toast('Bitte eine gültige Zahl eingeben.');mutate(()=>state.model[key]=value);if(id==='wavelength')numericInput(id,value);};
 $('addLayer').onclick=()=>{if(state.model.layers.length>=40)return toast('Maximal 40 endliche Schichten.');mutate(()=>state.model.layers.push({name:'Film',n:1.5,k:0,thickness_nm:0,uncertainty_n:null,uncertainty_k:null}));renderModel();};
 $('newModel').onclick=async()=>{try{setModel((await api('/api/info')).default_model);}catch(e){toast(e.message,'critical');}};
 $('modelList').onchange=async()=>{const file=$('modelList').value;if(!file)return;try{const m=await api('/api/models/'+encodeURIComponent(file));mutate(()=>{state.model=m;state.modelFile=file;});renderModel();toast('Schichtmodell geladen.');}catch(e){toast(e.message,'critical');}};
 $('saveModel').onclick=async()=>{try{let saved;const body={model:state.model,filename:state.modelFile};try{saved=await api('/api/models',{method:'POST',body});}catch(e){if(e.status===409&&confirm(`„${e.detail.filename}“ überschreiben?`))saved=await api('/api/models',{method:'POST',body:{...body,filename:e.detail.filename,overwrite:true}});else if(e.status===409)return;else throw e;}state.modelFile=saved.filename;await refreshModels();toast('Modell gespeichert: '+saved.filename);}catch(e){toast(e.message,'critical');}};
 $('exportModel').onclick=()=>download('ElliFit_Modell.json',JSON.stringify(state.model,null,2));$('openModel').onclick=()=>$('modelInput').click();$('modelInput').onchange=async e=>{try{const file=e.target.files[0];if(file)setModel(await api('/api/validate-model',{method:'POST',body:JSON.parse(await file.text())}));}catch(err){toast(err.message,'critical');}e.target.value='';};
 $('changeFolder').onclick=async()=>{try{await api('/api/model-folder',{method:'POST',body:{path:$('modelFolder').value}});try{localStorage.setItem('ellifit-model-folder',$('modelFolder').value);}catch(_){}state.modelFile=null;await refreshModels();toast('Modellordner gewechselt.');}catch(e){toast(e.message,'critical');}};
 for(const [id,key]of [['quality','quality'],['metric','metric'],['duplicates','duplicate_policy'],['uncertaintyMode','uncertainty_mode'],['bootstrap','bootstrap_samples'],['angleTolerance','angle_tolerance']])$(id).onchange=()=>{const value=id==='angleTolerance'?parseNumber($(id).value):id==='bootstrap'?Number($(id).value):$(id).value;if(typeof value==='number'&&!Number.isFinite(value))return toast('Bitte eine gültige Zahl eingeben.');mutate(()=>state.settings[key]=value);renderSettings();state.page=0;dataTable();scheduleStatistics();};
 for(const [id,key]of [['sigmaAngle','angle_deg'],['sigmaLambda','wavelength_nm']])$(id).onchange=()=>{const value=parseNumber($(id).value,true);if(value!==null&&(!Number.isFinite(value)||value<0))return toast('Kalibrierunsicherheit muss leer oder nicht negativ sein.');mutate(()=>state.settings.calibration[key]=value);numericInput(id,value);};
 $('runFit').onclick=run;$('cancelFit').onclick=async()=>{try{await api(`/api/jobs/${state.job}/cancel`,{method:'POST'});status('Abbruch angefordert …');}catch(e){toast(e.message,'critical');}};
 for(const [id,key]of [['plotLogX','logX'],['plotLogY','logY']])$(id).onchange=()=>{state.view[key]=$(id).checked;errorPlot();if(state.result?.identifiability?.profile)profilePlot();};$('comparisonLogX').onchange=()=>{state.view.comparisonLog=$('comparisonLogX').checked;comparisonPlot();};$('surfaceView').onchange=errorPlot;
 $('resultTable').onclick=e=>{const t=e.target.closest('[data-family]');if(t)selectSolution(Number(t.dataset.family),t.dataset.alias==null?null:Number(t.dataset.alias));};$('applySolution').onclick=()=>{const title=activeTrial()?'Probelösung T'+state.activeTrial:'Familie '+int(state.active+1)+', Wiederholung '+int(state.activeAlias+1);setModel(state.comparison.fitted_model);toast(title+' übernommen. Anschließend bei Bedarf speichern.','success');};
 $('importData').onclick=()=>$('dataInput').click();$('dataInput').onchange=async e=>{await importFiles(e.target.files);e.target.value='';};$('dropZone').onclick=e=>{if(!e.target.closest('label'))$('dataInput').click();};for(const type of ['dragenter','dragover'])$('dropZone').addEventListener(type,e=>{e.preventDefault();$('dropZone').classList.add('drag');});$('dropZone').ondragleave=()=>$('dropZone').classList.remove('drag');$('dropZone').ondrop=e=>{e.preventDefault();$('dropZone').classList.remove('drag');importFiles(e.dataTransfer.files);};$('exampleReference').onclick=()=>reference().catch(e=>toast(e.message,'critical'));
 $('addMeasurement').onclick=()=>{const angle=parseNumber($('manualAngle').value),delta=parseNumber($('manualDelta').value),psi=parseNumber($('manualPsi').value);if(!Number.isFinite(angle+delta+psi)||angle<=0||angle>=90||psi<0||psi>90)return toast('Erforderlich: 0 < φ < 90°, 0 ≤ Ψ ≤ 90°, Δ endlich.');setRows([{id:crypto.randomUUID(),angle,delta:(delta%360+360)%360,psi,source:'Manuell',line:0,comment:''}],'Manuell hinzugefügt',true);};
 for(const id of ['filter','angleFilter','onlySelected'])$(id).addEventListener(id==='filter'?'input':'change',()=>{state.page=0;lastRow=null;dataTable();});$('groupBy').onchange=()=>{state.view.groupBy=$('groupBy').value;state.page=0;dataTable();};
 $('selectAll').onchange=()=>{state.selected=$('selectAll').checked?new Set(state.rows.map(r=>r.id)):new Set();dataTable();scheduleStatistics();stale();};$('selectNone').onclick=()=>{state.selected.clear();dataTable();scheduleStatistics();stale();};$('selectFiltered').onclick=()=>{for(const i of filtered())state.selected.add(state.rows[i].id);dataTable();scheduleStatistics();stale();};
 $('measurementRows').onclick=e=>{const toggle=e.target.closest('[data-group-toggle]');if(toggle){const key=toggle.dataset.groupToggle;state.collapsed.has(key)?state.collapsed.delete(key):state.collapsed.add(key);dataTable();return;}const group=e.target.closest('[data-group-select]');if(group){const g=state.groups.find(g=>g.key===group.dataset.groupSelect);if(g)for(const i of g.indices)group.checked?state.selected.add(state.rows[i].id):state.selected.delete(state.rows[i].id);dataTable();scheduleStatistics();stale();return;}const row=e.target.closest('tr[data-row]');if(!row)return;const i=Number(row.dataset.row),on=e.target.type==='checkbox'?e.target.checked:!state.selected.has(state.rows[i].id),idx=filtered();let indices=[i];if(e.shiftKey&&lastRow!=null){const a=idx.indexOf(lastRow),b=idx.indexOf(i);if(a>=0&&b>=0)indices=idx.slice(Math.min(a,b),Math.max(a,b)+1);}for(const j of indices)on?state.selected.add(state.rows[j].id):state.selected.delete(state.rows[j].id);lastRow=i;dataTable();scheduleStatistics();stale();};
 $('firstPage').onclick=()=>goListEdge(false);$('lastPage').onclick=()=>goListEdge(true);$('prevPage').onclick=()=>goDataPage(state.page-1);$('nextPage').onclick=()=>goDataPage(state.page+1);$('goPage').onclick=jumpToPage;$('pageJump').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();jumpToPage();}};$('goMeasurement').onclick=()=>jumpToMeasurement();$('rowJump').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();jumpToMeasurement();}};$('lastMeasurement').onclick=()=>{const last=state.table.indices.at(-1);if(last!=null)jumpToMeasurement(last+1);};$('removeSelected').onclick=()=>{state.rows=state.rows.filter(r=>!state.selected.has(r.id));state.selected.clear();angleOptions();dataTable();scheduleStatistics();stale();};
 $('exportData').onclick=()=>download('ElliFit_Messdaten.csv',csv([['Winkel_Grad','Delta_Grad','Psi_Grad','Kommentar'],...state.rows.map(r=>[r.angle,r.delta,r.psi,r.source+' · '+r.comment])]),'text/csv;charset=utf-8');$('exportResults').onchange=e=>{exportResult(e.target.value);e.target.value='';};
 $('saveSession').onclick=()=>download('ElliFit_Sitzung.json',JSON.stringify({type:'ellifit-session',version:1,model:state.model,measurements:state.rows,selected:[...state.selected],parameters:state.parameters,settings:settings(),view:state.view},null,2));$('openSession').onclick=()=>$('sessionInput').click();$('sessionInput').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;const s=await api('/api/validate-session',{method:'POST',body:JSON.parse(await file.text())});mutate(()=>{state.model=s.model;state.modelFile=null;state.parameters=s.parameters.map(p=>({...defaultBounds(p.path),...p}));state.settings=migratedSettings(s.settings);});state.view={...state.view,...s.view};$('groupBy').value=state.view.groupBy;delete state.view.localScroll;resetWheelZone();$('plotLogX').checked=state.view.logX;$('plotLogY').checked=state.view.logY;renderModel();renderSettings();setRows(s.measurements,'Geöffnete Sitzung: '+file.name);const ids=new Set(state.rows.map(r=>r.id));state.selected=new Set((s.selected||[]).filter(id=>ids.has(id)));dataTable();scheduleStatistics();stale();toast('Sitzung geladen. Ergebnisse bitte neu berechnen.');}catch(err){toast(err.message,'critical');}e.target.value='';};
 $('materialsButton').onclick=()=>materialsDialog().catch(e=>toast(e.message,'critical'));$('closeMaterials').onclick=()=>$('materialDialog').close();$('newMaterial').onclick=()=>setMaterial({schema_version:1,name:'Neues Material',n:1.5,k:0,wavelength_nm:state.model.wavelength_nm,notes:'',uncertainty_n:null,uncertainty_k:null});
 $('materialList').onchange=async()=>{const f=$('materialList').value;if(!f)return;try{setMaterial(await api('/api/materials/'+encodeURIComponent(f)),f);}catch(e){toast(e.message,'critical');}};
 $('materialFromLayer').onclick=()=>{const m=getPath(state.model,$('materialTarget').value);setMaterial({schema_version:1,name:m.name,n:m.n,k:m.k,uncertainty_n:m.uncertainty_n??null,uncertainty_k:m.uncertainty_k??null,wavelength_nm:state.model.wavelength_nm,notes:''});};
 for(const [id,key]of [['materialName','name'],['materialNotes','notes'],['materialN','n'],['materialK','k'],['materialWavelength','wavelength_nm'],['materialUncertaintyN','uncertainty_n'],['materialUncertaintyK','uncertainty_k']])$(id).onchange=()=>{if(!state.material)return;const numeric=!['name','notes'].includes(key),optional=['wavelength_nm','uncertainty_n','uncertainty_k'].includes(key),v=numeric?parseNumber($(id).value,optional):$(id).value;if(numeric&&v!==null&&!Number.isFinite(v))return toast('Bitte eine gültige Zahl eingeben.');state.material[key]=v;if(numeric)numericInput(id,v);};
 $('saveMaterial').onclick=async()=>{try{let saved;const body={material:state.material,filename:state.materialFile};try{saved=await api('/api/materials',{method:'POST',body});}catch(e){if(e.status===409&&confirm(`„${e.detail.filename}“ überschreiben?`))saved=await api('/api/materials',{method:'POST',body:{...body,filename:e.detail.filename,overwrite:true}});else if(e.status===409)return;else throw e;}state.materialFile=saved.filename;await refreshMaterials();$('materialMessage').textContent='Material gespeichert: '+saved.filename;}catch(e){toast(e.message,'critical');}};
 $('applyMaterial').onclick=async()=>{try{const m=await api('/api/validate-material',{method:'POST',body:state.material});if(m.wavelength_nm!=null&&Math.abs(m.wavelength_nm-state.model.wavelength_nm)>.01&&!confirm(`Materialwerte gelten bei ${fmt(m.wavelength_nm)} nm, Modell bei ${fmt(state.model.wavelength_nm)} nm. Trotzdem übernehmen?`))return;const path=$('materialTarget').value;if(path==='ambient'&&m.k!==0)return toast('Das Einfallsmedium muss transparent sein (k = 0).');mutate(()=>{const target=getPath(state.model,path);for(const key of ['n','k','uncertainty_n','uncertainty_k'])target[key]=m[key]??null;if($('materialUseName').checked)target.name=m.name;});renderModel();$('materialDialog').close();toast('Material übernommen. Die Schichtdicke bleibt erhalten.');}catch(e){toast(e.message,'critical');}};
 $('exportMaterial').onclick=()=>download('ElliFit_Material.json',JSON.stringify(state.material,null,2));$('importMaterial').onclick=()=>$('materialInput').click();$('materialInput').onchange=async e=>{try{const f=e.target.files[0];if(f)setMaterial(await api('/api/validate-material',{method:'POST',body:JSON.parse(await f.text())}));}catch(err){toast(err.message,'critical');}e.target.value='';};$('changeMaterialFolder').onclick=async()=>{try{await api('/api/material-folder',{method:'POST',body:{path:$('materialFolder').value}});try{localStorage.setItem('ellifit-material-folder',$('materialFolder').value);}catch(_){}state.materialFile=null;await refreshMaterials();$('materialMessage').textContent='Materialordner gewechselt.';}catch(e){toast(e.message,'critical');}};
 $('help').onclick=()=>$('helpDialog').showModal();window.addEventListener('beforeunload',e=>{if(state.busy){e.preventDefault();e.returnValue='';}});
}
async function init(){try{const info=await api('/api/info');if(info.version!==UI_VERSION)throw new Error(`Oberfläche ${UI_VERSION} und Rechenkern ${info.version} passen nicht zusammen. ElliFit vollständig neu starten und die Seite mit Strg+F5 neu laden.`);state.model=info.default_model;bind();for(const [key,url]of [['ellifit-model-folder','/api/model-folder'],['ellifit-material-folder','/api/material-folder']]){let path;try{path=localStorage.getItem(key);}catch(_){}if(path){try{await api(url,{method:'POST',body:{path}});}catch(_){toast('Ein gespeicherter Bibliotheksordner ist nicht erreichbar; Standardordner wird verwendet.');}}}await refreshModels();renderModel();renderSettings();await reference(true);state.history=[];state.future=[];historyButtons();}catch(e){$('runFit').disabled=true;status('Start fehlgeschlagen: '+e.message,0,true);}}
init();
