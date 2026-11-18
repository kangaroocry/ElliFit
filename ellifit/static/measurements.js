'use strict';

function newLayerId() {
 return crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint32Array(4)), x => x.toString(16).padStart(8,'0')).join('');
}

function applyFittedParameters() {
 if (!state.comparison || !flushFitInputs()) return;
 const fitted = state.result.model;
 const targets = [];
 if (state.modelDocument !== state.fittedDocument) {
  return toast('Diese Lösung gehört zu einem anderen Modelldokument. Das frühere Fitmodell kann separat geöffnet werden.', 'warning');
 }
 for (const param of state.result.parameters) {
  let target = param.path;
  if (target.startsWith('layers.')) {
   const parts = target.split('.');
   const id = fitted.layers[Number(parts[1])].layer_id;
   const index = state.model.layers.findIndex(l => id && l.layer_id === id);
   if (index < 0) return toast('Die gefittete Schicht wurde entfernt. Das frühere Fitmodell kann separat geöffnet werden.', 'warning');
   target = 'layers.' + index + '.' + parts[2];
  }
  targets.push({target, label:param.label, before:getPath(fitted,param.path), current:getPath(state.model,target),
   value:getPath(state.comparison.fitted_model,param.path)});
 }
 const conflicts = targets.filter(t => t.current !== t.before && t.current !== t.value);
 if (conflicts.length && !confirm('Folgende Fitparameter wurden nach diesem Fit bearbeitet. Diese Werte ersetzen?\n' +
    conflicts.map(t => t.label + ' · ' + quantityValue(t.current,t.target) + ' → ' + quantityValue(t.value,t.target)).join('\n'))) return;
 mutate(() => {for (const t of targets) setPath(state.model,t.target,t.value);});
 renderModel();
 toast('Fitparameter ins aktuelle Modell übernommen.', 'success');
}

function renderThicknessInputs() {
 const box = $('fixedThicknessInputs');
 box.innerHTML = state.model.layers.map((layer,i) => {
  const path = 'layers.' + i + '.thickness_nm';
  const fitted = state.parameters.some(p => p.path === path);
  const text = layer.uncertainty_thickness_nm == null ? '' : numericText(layer.uncertainty_thickness_nm,'d');
  return '<label>u(d) ' + esc(mediumLabel(path)) + ' (nm)' +
   '<input data-u-thickness="' + i + '" data-num="d" inputmode="decimal" aria-label="Standardunsicherheit der Dicke ' + esc(mediumLabel(path)) +
   '" value="' + text + '" placeholder="keine Angabe" ' + (fitted ? 'disabled' : '') + '>' +
   (fitted ? '<small>Dicke wird gefittet</small>' : '') + '</label>';
 }).join('');
}

function calibrationDetails(u, params) {
 const warnings = (u.calibration_warnings||[]).map(x => '<p class="warning-inline">' + esc(x) + '</p>').join('');
 if (!u.calibration_sources?.length) return warnings;
 return warnings + '<details><summary>Beiträge der festen Eingaben</summary><table><thead><tr><th>Quelle</th>' +
  params.map(p => '<th>' + parameterHeading(p) + '</th>').join('') + '</tr></thead><tbody>' +
  u.calibration_sources.map(s => '<tr><td>' + esc(s.name) + '</td>' +
   params.map((p,i) => '<td>' + fmt(s.contribution?.[i],3) + (p.path.endsWith('thickness_nm')?' nm':'') + '</td>').join('') +
   '</tr>').join('') + '</tbody></table></details>';
}

const measurementKinds = {repeat:'Wiederholung',location:'Anderer Ort',azimuth:'Anderer Azimut'};
function contextKey(r) {
 return JSON.stringify([r.site||'', r.azimuth_deg??null,r.time_s??null,r.time_s==null?'':r.time_source||r.source||'']);
}
function contextLabel(r) {
 const parts = [];
 if(r.time_s!=null)parts.push('t = '+fmt(r.time_s,6)+' s');
 if (r.site) parts.push('Ort '+r.site);
 if (r.azimuth_deg != null) parts.push('Azimut '+numericText(r.azimuth_deg,'angle')+'°');
 return parts.length ? parts.join(' · ') : measurementKinds[r.measurement_kind||'repeat'];
}
function contextAngleGroups(indices) {
 const groups = [];
 for (const g of angleGroups(indices)) {
  const byContext = new Map();
  for (const i of g.indices) {
   const row = state.rows[i], key = contextKey(row);
   if (!byContext.has(key)) byContext.set(key,{angle:g.angle,context:row,key:g.key+key,name:g.name+' · '+contextLabel(row),indices:[]});
   byContext.get(key).indices.push(i);
  }
  for (const group of byContext.values()) groups.push(group);
 }
 return groups;
}

function updateContextTarget() {
 const index = state.editContextId == null ? -1 : state.rows.findIndex(r => r.id === state.editContextId);
 if (index < 0) state.editContextId=null;
 $('contextTarget').textContent = index < 0 ? int(state.selected.size)+' markierte Messungen' : 'Messung #'+int(index+1);
 $('applyContext').textContent = index < 0 ? 'Auswahl zuordnen' : 'Messung zuordnen';
 $('applyContext').disabled = index < 0 && !state.selected.size;
 $('cancelContext').hidden = index < 0;
}
function editContext(index) {
 const row = state.rows[index];
 state.editContextId=row.id;
 $('contextKind').value=row.measurement_kind||'repeat';
 $('contextSite').value=row.site||'';
 $('contextAzimuth').value=row.azimuth_deg==null?'':numericText(row.azimuth_deg,'angle');
 $('contextEditor').open=true;updateContextTarget();$('contextKind').focus();
}
function assignContext() {
 const kind=$('contextKind').value, site=$('contextSite').value.trim();
 let azimuth=parseNumber($('contextAzimuth').value,true);
 if (kind==='location' && !site) return toast('Bitte den Messort angeben.','warning');
 if ((kind==='azimuth' && azimuth==null) || (azimuth!=null && !(azimuth>=0 && azimuth<=360))) return toast('Bitte einen Azimut zwischen 0° und 360° angeben.','warning');
 if (azimuth===360) azimuth=0;
 const rows=state.editContextId==null ? selectedRows() : state.rows.filter(r=>r.id===state.editContextId);
 for (const r of rows) Object.assign(r,{measurement_kind:kind, site, azimuth_deg:azimuth});
 state.editContextId=null;state.measurementStats=null;
 dataTable();scheduleStatistics();stale();toast(int(rows.length)+' Messungen zugeordnet.','success');
}

let residualSource=null,residualPage=0,groupFitJob=null,groupBusy=null;
let groupResults=new Map();
function renderResiduals() {
 const c=state.comparison;
 if (!c) return;
 const details=$('residualDetails'), rows=c.residuals;
 details.hidden=!rows.length;
 if (residualSource!==c) {
  residualSource=c;residualPage=0;
  details.open=rows.length<=12 && rows.some(r=>r.site||r.azimuth_deg!=null);
 }
 const size=25, start=residualPage*size;
 $('residualTable').innerHTML='<table><thead><tr><th>Messung / Ort / Azimut</th><th>φ (°)</th><th class="red">Δ exp. (°)</th><th class="blue">Ψ exp. (°)</th><th class="red">Residuum Δ (°)</th><th class="blue">Residuum Ψ (°)</th></tr></thead><tbody>'+
  rows.slice(start,start+size).map(r=>'<tr><td>'+esc(contextLabel(r))+'<small>'+esc(r.comment||r.source)+(r.line?' · '+int(r.line):'')+'</small></td><td>'+numericText(r.model_angle,'angle')+'</td><td class="red">'+numericText(r.delta,'angle')+'</td><td class="blue">'+numericText(r.psi,'angle')+'</td><td class="red">'+fixedNumber(r.delta_residual,3)+'</td><td class="blue">'+fixedNumber(r.psi_residual,3)+'</td></tr>').join('')+'</tbody></table>';
 $('residualCount').textContent='Modell minus Messung · '+int(start+1)+'–'+int(Math.min(start+size,rows.length))+' von '+int(rows.length);
 $('residualPrev').disabled=residualPage===0;$('residualNext').disabled=start+size>=rows.length;
 if(groupFitJob!==state.resultJob){groupFitJob=state.resultJob;groupResults=new Map();}
 renderGroupResults();
}

let stopGroups=false;
function visibleMeasurementGroups(all=false) {
 const start=residualPage*25, groups=new Map(), mode=$('batchGrouping').value;
 const rows=state.comparison.residuals;
 for(const r of (all?rows:rows.slice(start,start+25)))groups.set(mode+':'+(mode==='source'?r.source:contextKey(r)),r);
 return groups;
}
function exportGroupResults() {
 const params=state.result.parameters;
 const columns=params.flatMap(p=>[p.label,'Periode '+p.symbol+' (nm)']);
 const rows=[['Gruppe','Quelle','Zeit_s','Messort','Azimut_Grad','Familie',...columns,'Anzahl_gleichwertig','Winkel_RMS_Grad','Kriterium','Bestimmbarkeit','Suchgrenze','Fehler']];
 for(const [key,g] of groupResults){
  if(!key.startsWith($('batchGrouping').value+':'))continue;
  if(g.error){
   rows.push([g.group_by,g.source,g.time_s,g.site,g.azimuth_deg,'',...Array(columns.length).fill(''),'','','','','',g.error]);
   continue;
  }
  for(const f of g.families){
   const values=params.flatMap((p,i)=>[f.first_values[i],f.periods.find(t=>t.path===p.path)?.period_nm]);
   const diagnosis=[g.saturated?'Keine unabhängigen Freiheitsgrade':'',f.weak?'Schwach bestimmbar':'',f.coupled?'Stark gekoppelt':''].filter(Boolean).join(' · ');
   rows.push([g.group_by,g.source,g.time_s,g.site,g.azimuth_deg,f.rank,...values,f.alias_count,f.rmse_deg,g.criterion,diagnosis,f.at_boundary?'ja':'','']);
  }
 }
 download('ElliFit_Gruppenfits.csv',csv(rows),'text/csv;charset=utf-8');
}
function renderGroupResults() {
 const rows=state.comparison.residuals, panel=$('groupFitPanel');
 panel.hidden=!rows.some(r=>contextKey(r)!==contextKey(rows[0])||r.source!==rows[0].source);
 if(panel.hidden)return;
 const groups=visibleMeasurementGroups(), available=visibleMeasurementGroups(true), running=groupBusy===state.resultJob;
 const recorded=[...available.keys()].map(k=>groupResults.get(k)).filter(Boolean);
 const failed=recorded.filter(g=>g.error).length, done=recorded.length-failed;
 $('batchStop').hidden=!running;$('batchGrouping').disabled=running;$('batchExport').disabled=!recorded.length;
 $('batchAll').disabled=running||available.size<2||done===available.size;
 const params=state.result.parameters, current=[...groups.keys()].map(k=>groupResults.get(k)).filter(Boolean);
 $('groupFitButton').disabled=running||available.size<2||current.filter(g=>!g.error).length===groups.size;
 $('groupFitStatus').textContent=(running?'Einzelfits laufen · ':'')+int(done)+' von '+int(available.size)+' Gruppen berechnet'+(failed?' · '+int(failed)+' fehlgeschlagen, erneuter Start versucht diese Gruppen nochmals':'');
 $('groupFitModeNote').textContent=$('batchGrouping').value==='source'?'Jede Quelldatei wird mit Modell, Suchgrenzen und Fitkriterium des angezeigten Fits ausgewertet.':'Je Messkontext werden Winkel- oder Stokes-Residuen aus den ungewichteten Einzelmessungen separat gefittet.';
 if(!current.length){$('groupFitTable').replaceChildren();return;}
 const rowsHtml=[];
 for(const g of current){
  const name=g.group_by==='source'?g.source:contextLabel(g);
  if(g.error){
   rowsHtml.push('<tr><td>'+esc(name)+'</td><td colspan="'+(params.length+3)+'">Fit fehlgeschlagen · '+esc(g.error)+'</td></tr>');
   continue;
  }
  for(const [index,f] of g.families.entries()){
   const cells=params.map((p,i)=>{
    const v=quantityValue(f.first_values[i],p), t=f.periods.find(item=>item.path===p.path);
    const m=f.periods.length>1?['m₁','m₂'][i]:'m';
    const value=t&&f.alias_count>1?'('+v+' + '+m+' · '+fmt(t.period_nm,6)+') nm':v+(p.path.endsWith('thickness_nm')?' nm':'');
    return '<td>'+value+'</td>';
   });
   const notes=[f.alias_count>1?int(f.alias_count)+' gleichwertige Werte im Suchbereich':'',g.saturated?'Keine unabhängigen Freiheitsgrade':'',f.weak?'Schwach bestimmbar':'',f.coupled?'Stark gekoppelt':'',f.at_boundary?'Suchgrenze':''].filter(Boolean);
   rowsHtml.push('<tr>'+(index===0?'<td rowspan="'+g.families.length+'">'+esc(name)+'<small>'+int(g.count)+' Messungen · '+int(g.angle_count)+' Winkel</small><small>'+esc(g.criterion)+'</small></td>':'')+
    '<td>'+int(f.rank)+'</td>'+cells.join('')+'<td>'+rmsText(f.rmse_deg)+'</td><td>'+notes.join(' · ')+'</td></tr>');
  }
 }
 $('groupFitTable').innerHTML='<table><thead><tr><th>Messgruppe</th><th>Familie</th>'+params.map(p=>'<th>'+parameterHeading(p)+'</th>').join('')+'<th>Winkel-RMS (°)</th><th>Hinweise</th></tr></thead><tbody>'+rowsHtml.join('')+'</tbody></table>';

}
async function fitVisibleGroups(all=false) {
 const job=state.resultJob;
 if(groupBusy===job)return;
 const groups=visibleMeasurementGroups(all),mode=$('batchGrouping').value;
 stopGroups=false;groupBusy=job;renderGroupResults();
 try{
  for(const [key,r] of groups){
   if(stopGroups||state.resultJob!==job||state.busy)break;
   if(groupResults.has(key)&&!groupResults.get(key).error)continue;
   let result;
   try{
    result=await api('/api/jobs/'+job+'/group-fit',{method:'POST',body:{row_id:r.id,group_by:mode}});
   }catch(e){
    result={source:r.source,group_by:mode,error:e.message,...(mode==='context'?{site:r.site,azimuth_deg:r.azimuth_deg,time_s:r.time_s}:{})};
   }
   if(state.resultJob!==job)break;
   groupResults.set(key,result);
   $('groupFitStatus').textContent=int([...groups.keys()].filter(k=>groupResults.has(k)).length)+' von '+int(groups.size)+' Gruppen bearbeitet …';
  }
 }catch(e){toast(e.message,'warning');}finally{if(groupBusy===job)groupBusy=null;if(state.resultJob===job)renderGroupResults();}
}

function renderAngleSuggestion() {
 const box=$('angleSuggestion'), d=state.result?.next_angle;
 box.hidden=!d;
 if (!d) return;
 const angle=fmt(d.angle_deg,4)+'°', params=state.result.parameters;
 const msg=d.informative?'Zusätzlicher Messwinkel · '+angle:'Ein zusätzlicher Winkel trennt im geprüften Bereich nicht alle Kandidaten';
 box.innerHTML='<strong>'+msg+'</strong><details><summary>Modellvorhersagen und Auswahl des Winkels</summary><p>Verglichen wurden '+int(d.candidates_used)+' von '+int(d.candidates_total)+(d.rms_cutoff_deg==null?' nach dem Fitkriterium gleichwertige Kandidaten':' Kandidaten mit Winkel-RMS ≤ '+rmsText(d.rms_cutoff_deg)+'°')+' bei 45° bis 80° in Schritten von 0,5°. Bei '+angle+' ist der kleinste Abstand ihrer normierten Stokes-Vektoren am größten ('+fmt(d.smallest_stokes_distance,3)+'). Die experimentelle Auflösung und die erreichbaren Gerätewinkel sind zusätzlich zu berücksichtigen.</p><div class="scroll"><table><thead><tr><th>Familie / Lösung</th>'+
  params.map(p=>'<th>'+parameterHeading(p)+'</th>').join('')+'<th class="red">Δ (°)</th><th class="blue">Ψ (°)</th></tr></thead><tbody>'+
  d.predictions.map(p=>'<tr><td>'+int(p.family)+' / '+int(p.alias)+'</td>'+p.values.map((v,i)=>'<td>'+quantityValue(v,params[i])+'</td>').join('')+'<td class="red">'+fixedNumber(p.delta,3)+'</td><td class="blue">'+fixedNumber(p.psi,3)+'</td></tr>').join('')+'</tbody></table></div></details>';
}

function bindMeasurements() {
 $('contextEditor').addEventListener('toggle',()=>{if(!$('contextEditor').open){state.editContextId=null;updateContextTarget();}});
 $('applyContext').onclick=assignContext;
 $('groupFitButton').onclick=()=>fitVisibleGroups();$('batchAll').onclick=()=>fitVisibleGroups(true);
 $('batchGrouping').onchange=renderGroupResults;$('batchStop').onclick=()=>{stopGroups=true;};$('batchExport').onclick=exportGroupResults;
 $('cancelContext').onclick=()=>{state.editContextId=null;updateContextTarget();};
 $('residualPrev').onclick=()=>{if(residualPage>0)residualPage--;renderResiduals();};
 $('residualNext').onclick=()=>{residualPage++;renderResiduals();};
 $('refineAll').onchange=()=>mutate(()=>{state.settings.refine_all=$('refineAll').checked;});
 $('moreFamilies').onclick=()=>{state.shownFamilies+=120;solutionTable();};
 $('openFittedModel').onclick=async()=>{
  if (!state.comparison || !await confirmDocumentChange('model','das Fitmodell als neues Dokument geöffnet wird')) return;
  const model=state.comparison.fitted_model;
  state.parameters=state.result.parameters.map(({path,lower,upper,scale,positive_min})=>({path,lower,upper,scale,positive_min}));
  if (state.parameters.length===1) state.parameters.push({path:'',...defaultBounds('')});
  beginModelDocument(model,null,'Fitmodell · '+model.name);toast('Fitmodell als neues Modelldokument geöffnet.','success');
 };
 $('fixedThicknessInputs').addEventListener('change',e=>{
  const input=e.target;if(!input.matches('[data-u-thickness]'))return;
  const val=parseNumber(input.value,true);
  if(val!=null && !(Number.isFinite(val)&&val>=0&&val<=1e8)){
   input.setCustomValidity('Bitte eine Unsicherheit zwischen 0 und 100 000 000 nm angeben.');
   return toast(input.validationMessage,'warning');
  }
  input.setCustomValidity('');
  mutate(()=>{state.model.layers[Number(input.dataset.uThickness)].uncertainty_thickness_nm=val;});
 });
}
