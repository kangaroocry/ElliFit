'use strict';
const expandedFamilies=new Set();
let viewportTimer,viewportBaseline=null,viewportRequest=null,viewportError=null;
function renderLocalBounds(){
 for(const box of $('layerEditor').querySelectorAll('[data-local-bounds]')){
  const i=state.parameters.findIndex(p=>p.path===box.dataset.localBounds),p=state.parameters[i];
  box.hidden=i<0;if(i<0){box.replaceChildren();continue;}
  const kind=p.path.endsWith('thickness_nm')?'d':p.path.endsWith('.k')?'k':'n';
  box.innerHTML=`<span class="local-range-title">${i?'Y':'X'} · Suchbereich</span>${[['lower','Von'],['upper','Bis']].map(([key,title])=>`<label>${title}<input data-param="${i}" data-prop="${key}" data-num="${kind}" inputmode="decimal" value="${quantityValue(p[key],p)}" aria-label="${title} · ${esc(labelFor(p.path))}"></label>`).join('')}<label>Raster<select data-param="${i}" data-prop="scale"><option value="log" ${p.scale==='log'?'selected':''}>log</option><option value="linear" ${p.scale==='linear'?'selected':''}>linear</option></select></label>${p.path.endsWith('.k')&&p.lower===0&&p.scale==='log'?`<label>Erster positiver Wert<input data-param="${i}" data-prop="positive_min" data-num="k" value="${numericText(p.positive_min,'k')}"></label>`:''}`;
 }
}
function changeFitBound(t){
 const i=Number(t.dataset.param),key=t.dataset.prop,value=key==='scale'?t.value:parseNumber(t.value);
 if(typeof value==='number'&&!Number.isFinite(value)){toast('Bitte eine gültige Suchgrenze eingeben.','warning');return;}
 mutate(()=>state.parameters[i][key]=value);if(key==='scale')axesFromSearch();renderParameters();
}
function insertionGap(index){return `<div class="insert-gap"><button type="button" data-insert-layer="${index}" aria-label="Schicht an Grenzfläche ${index+1} einfügen" title="Neue Schicht genau hier einfügen">＋</button></div>`;}
function insertLayerAt(index){
 if(state.model.layers.length>=40)return toast('Maximal 40 endliche Schichten.','warning');
 mutate(()=>{state.model.layers.splice(index,0,{layer_id:newLayerId(),name:'Film',n:1.5,k:0,thickness_nm:0,uncertainty_n:null,uncertainty_k:null});remapLayerParameters(i=>i>=index?i+1:i);});renderModel();
}
function quickMaterialOptions(path){return '<option value="">Material übernehmen …</option>'+state.materials.filter(m=>path!=='ambient'||m.k===0).map(m=>`<option value="${esc(m.file)}">${esc(m.name)}</option>`).join('');}
function refreshQuickMaterialLists(){for(const select of $('layerEditor').querySelectorAll('[data-material-target]'))select.innerHTML=quickMaterialOptions(select.dataset.materialTarget);}
async function quickMaterial(select){
 if(!select.value)return;const path=select.dataset.materialTarget,target=getPath(state.model,path),file=select.value;select.disabled=true;
 try{
  const m=await api('/api/materials/'+encodeURIComponent(file));
  if(state.busy)throw new Error('Die Berechnung läuft bereits. Material danach erneut auswählen.');
  if(getPath(state.model,path)!==target)throw new Error('Die Zielschicht wurde inzwischen geändert. Bitte erneut auswählen.');
  if(m.wavelength_nm!=null&&Math.abs(m.wavelength_nm-state.model.wavelength_nm)>.01&&!confirm(`Material bei ${fmt(m.wavelength_nm)} nm, Modell bei ${fmt(state.model.wavelength_nm)} nm. Werte trotzdem auf ${mediumLabel(path)} übernehmen?`))return;
  if(path==='ambient'&&m.k!==0)throw new Error('Das Einfallsmedium benötigt k = 0.');
  mutate(()=>{for(const key of ['n','k','uncertainty_n','uncertainty_k'])target[key]=m[key]??null;target.name=m.name;});renderModel();toast('Material auf '+mediumLabel(path)+' übernommen; Dicke bleibt erhalten.','success');
 }catch(e){toast(e.message,'critical');}finally{if(select.isConnected){select.disabled=false;select.value='';}}
}
function selectedProfileBranch(){
 const profile=state.result?.identifiability?.profile;if(!profile)return null;
 return profile.branches?.find(b=>b.family===state.result.solutions[state.active].rank&&b.alias===state.activeAlias)||null;
}
function profileScope(){
 const d=state.result?.identifiability,p=d?.profile,chosen=selectedProfileBranch();
 if(!p)return d?.profile_reason||'Kein Talprofil vorhanden.';
 if(!chosen&&p.branches)return 'Für diese Wiederholung wurde kein Talast berechnet. '+(p.omitted_branches?'Die Anzahl der fortgesetzten Äste ist begrenzt.':'');
 const s=state.result.solutions[state.active];return `Talast zu Familie ${s.rank}, Lösung ${state.activeAlias+1} · ${parameterHover(selectedMember().values).replace(/<[^>]*>/g,'')}. ${p.boundary_rule||''} Die Gleichungen darunter gelten lokal an dieser Lösung. Von verschiedenen Lösungen fortgesetzte Verläufe können sich überlagern.`;
}
function renderBranchControl(){
 const p=state.result?.identifiability?.profile;
 $('profileBranch').innerHTML=(p?.branches||[]).map(b=>`<option value="${b.id}">Familie ${b.family} · Lösung ${b.alias+1}</option>`).join('');
 const branch=selectedProfileBranch();$('profileBranch').value=branch?.id||'';$('profileScope').textContent=profileScope();
}
function renderFitCautions(){
 const box=$('fitCautions'),r=state.result;if(!r){box.hidden=true;return;}
 const items=[],d=r.identifiability||{},periodic=r.solutions.filter(s=>s.periodic),good=r.solutions.filter(s=>s.rmse_deg!=null&&s.rmse_deg<=.1),relevant=[r.solutions[0],r.solutions[state.active],...good],coupled=relevant.some(s=>s.uncertainty?.strongly_correlated||s.uncertainty?.weak);
 const flag=(title,text,critical=false,info=false)=>items.push({title,text,critical,info});
 if(periodic.length)flag('Periodische Mehrdeutigkeit',`${int(periodic.reduce((n,s)=>n+s.alias_count,0))} periodische Parameterkombinationen in ${int(periodic.length)} Familien. Innerhalb einer Familie gleichwertig: die erste Wiederholung ist nicht bevorzugt. Weitere periodische Lösungen können außerhalb des Suchbereichs liegen. Zusätzliche Winkel oder unabhängige Dickeninformation nötig.`);
 const rms=r.solutions[0].rmse_deg,assessment=assessFitRms(rms);
 if(assessment)flag(assessment.label,
  `Der Winkel-RMS des besten Fits beträgt ${rmsText(rms)}°. Er überschreitet ${assessment.threshold}°. Modell, Messauswahl und Suchgrenzen prüfen.`,
  assessment.critical);
 if(good.length>1)flag('Mehrere sehr gute Fits',`${int(good.length)} verschiedene Familien haben Winkel-RMS ≤ 0,1°. Aus dem kleinsten angezeigten Wert folgt keine eindeutige physikalische Lösung.`);
 if(d.lack_of_fit_dof<=0&&r.parameters.length===2)flag(
  !activeTrial()&&r.solutions[state.active].mean_fit?.numerical_match?'Δ und Ψ getroffen · kein Freiheitsgrad zur Modellprüfung':'Kein verbleibender Freiheitsgrad zur Modellprüfung',
  'Ein Einfallswinkel liefert höchstens zwei unabhängige Winkelgrößen für zwei freie Parameter. Für eine unabhängige Modellprüfung einen weiteren Einfallswinkel messen.',true);
 if(coupled)flag('Parameter stark gekoppelt','Viele Wertepaare können sehr ähnlich passen. Einzelne Dicken oder Indizes nicht isoliert abschreiben; gewählten Talast und zusätzliche Messwinkel prüfen.',relevant.some(s=>s.uncertainty?.weak));
 const branch=selectedProfileBranch(),points=(branch?.points||[]).filter(p=>p.rmse_deg!=null&&p.rmse_deg<=.1);
 if(points.length>4&&r.parameters.length===2)flag('Tal mit vielen gut passenden Wertepaaren',r.parameters.map((p,i)=>`${parameterSymbol(p)}: ${quantityValue(Math.min(...points.map(q=>q.values[i])),p)} bis ${quantityValue(Math.max(...points.map(q=>q.values[i])),p)}${p.path.endsWith('thickness_nm')?' nm':''}`).join(' · ')+'. Spanne entlang des gewählten Talasts, keine Konfidenzgrenze.');
 for(const axis of r.solutions[0].boundary_axes||[]){
  if(axis.physical_zero){
   const zero=r.zero_tests?.find(t=>t.path===axis.path);
   const value=axis.path.endsWith('.k')?'k = 0':'d = 0 nm';
   flag('Die Messung ist mit '+value+' vereinbar', axis.label+'. '+(zero?.upper_limit!=null?'Näherungsweise einseitige 95-%-Obergrenze für k '+fmt(zero.upper_limit,4)+'.':'Der Fit erreicht die physikalische Nullgrenze.'),false,true);
  }else flag('Bestes Minimum an einer Suchgrenze',axis.label+' erreicht die '+(axis.side==='lower'?'Untergrenze':'Obergrenze')+'. Diesen Suchbereich prüfen und gegebenenfalls erweitern.',true);
 }
 const unc=activeTrial()?null:state.comparison?.uncertainty||r.solutions[state.active].uncertainty;
 for(const warning of unc?.calibration_warnings||[])flag('Kombinierte Unsicherheit offen',warning,true);
 const phase=state.comparison?.phase_warning_angles||[];
 if(phase.length){
  const summary=state.comparison.residual_summary||{};
  const breakdown=summary.delta_rms==null?'Der Winkel-RMS ist unbestimmt.':('Residuen-RMS Δ '+angleValue(summary.delta_rms)+'°, Ψ '+angleValue(summary.psi_rms)+'°. ');
  const dominant=summary.delta_rms>1&&summary.delta_rms>3*summary.psi_rms&&summary.stokes_chord_rms<.05;
  flag(dominant?'Δ dominiert die Winkelabweichung':'Δ nahe der Polarisationsnullstelle',
   'Bei '+phase.slice(0,5).map(a=>numericText(a,'angle')+'°').join(', ')+' liegt Ψ höchstens 1° von 0° oder 90° entfernt. '+breakdown+' Stokes-Sehnenabstand '+fmt(summary.stokes_chord_rms,4)+' (0–2).');
 }
 box.hidden=!items.length;if(!items.length)return;
 const infoOnly=items.every(x=>x.info);box.dataset.kind=infoOnly?'info':items.some(x=>x.critical)?'critical':'warning';
 box.innerHTML='<div class="caution-heading"><strong>'+(infoOnly?'Physikalische Grenze':'Vor der Übernahme prüfen')+'</strong><span>'+(state.resultStale?'Zum früheren Fit':'Zum angezeigten Fit')+'</span></div><div class="caution-grid">'+
   items.map(x=>'<article data-kind="'+(x.info?'info':x.critical?'critical':'warning')+'"><details'+(x.critical?' open':'')+'><summary>'+esc(x.title)+'</summary><p>'+esc(x.text)+'</p></details></article>').join('')+'</div>';

}
function periodicFamilyEquations(solution){
 const params=state.result.parameters,base=solution.aliases[0].values,variables=[],equations=[];
 for(const [column,param]of params.entries()){
  const periodIndex=solution.periods.findIndex(period=>period.path===param.path),period=solution.periods[periodIndex];
  const symbol=esc(parameterSymbol(param));
  if(period){
   const variable=solution.periods.length===1?'m':'m'+['₁','₂'][periodIndex];
   const last=Math.max(0,Math.floor((param.upper-base[column])/period.period_nm+1e-10));
   equations.push(`<span class="family-equation" title="${esc(param.label)} · Gerundete Anzeige; Rechnung mit voller Präzision">${symbol} ≈ (${quantityValue(base[column],param)} + ${variable} · ${fmt(period.period_nm,Math.min(14,Math.max(6,Math.ceil(Math.log10(last+1))+5)))}) nm</span>`);
   variables.push(`${variable} = ${last===0?'0':last===1?'0, 1':'0, 1, …, '+int(last)}`);
  }else{
   equations.push(`<span class="family-equation family-constant" title="${esc(param.label)} · Innerhalb dieser Periodenfamilie gleich">${symbol} = ${quantityValue(base[column],param)}${param.path.endsWith('thickness_nm')?' nm':''}</span>`);
  }
 }
 return `<span class="family-equations">${equations.join('')}<span class="family-indices">${variables.join(' · ')} (im Suchbereich)</span></span>`;
}
function selectedMember(){
 return state.comparison?.selected_member||state.result.solutions[state.active].aliases[state.activeAlias];
}
function visibleFamilyMembers(s,index){
 const extra=state.comparison?.selected_member;
 return !activeTrial()&&state.active===index&&extra ? [...s.aliases,extra] : s.aliases;
}
function familyMemberNumber(rank,index){
 return rank+'.'+(index+1);
}
function jumpToFamilyMember(index){
 const family=state.result.solutions[index];
 const value=$('resultTable').querySelector('[data-alias-number="'+index+'"]').value.trim();
 const qualified=/^(\d+)[.,](\d+)$/.exec(value);
 const number=qualified?(Number(qualified[1])===family.rank?Number(qualified[2]):NaN):parseNumber(value);
 if(!Number.isSafeInteger(number)||number<1||number>family.alias_count)return toast('Bitte eine gültige Lösungsnummer in dieser Familie eingeben.','warning');
 selectSolution(index,number-1);
}
function renderFamilies(){
 const r=state.result,params=r.parameters,m=fitMetric(),extra=m.differs_from_angular_rms;
 const metricHead=extra?`<th>${esc(m.label)} ↓<small>${metricUnit()}</small></th>`:'';
 const metricCells=(q,rms)=>(extra?`<td>${fmt(fitValue(q),5)}</td>`:'')+`<td>${rmsText(rms)}</td>`;
 const heading=`<tr><th>#</th>${params.map(p=>`<th>${parameterHeading(p)}</th>`).join('')}${metricHead}<th>Winkel-RMS (°)${extra?'':' ↓'}</th></tr>`;
 const shown=Math.min(r.solutions.length,Math.max(state.shownFamilies||120,state.active+1));
 $('familyPaging').hidden=false;$('moreFamilies').hidden=shown===r.solutions.length;
 $('familyCounter').textContent=`${int(r.counts.grid_minima)} ${r.counts.grid_minima===1?'Rasterminimum':'Rasterminima'} erkannt · ${int(r.counts.refined_grid_minima)} lokal verfeinert · ${int(shown)} von ${int(r.solutions.length)} ${r.solutions.length===1?'Familie':'Familien'} angezeigt`;
 $('resultTable').innerHTML=`<table class="families-table"><thead>${heading}</thead><tbody>${r.solutions.slice(0,shown).map((s,i)=>{
  const active=!state.activeTrial&&state.active===i,color=rmsColor(s.rmse_deg,.17);
  if(!s.periodic)return `<tr class="family-row ${active?'active':''}" data-family="${i}" title="${esc(m.label)}: ${fmt(fitValue(s.q),5)} (${metricUnit()})" style="background:${color}"><td>${s.rank}</td>${s.values.map((v,k)=>`<td>${quantityValue(v,params[k])}</td>`).join('')}${metricCells(s.q,s.rmse_deg)}</tr>${s.periods.length?`<tr><td colspan="${params.length+2+Number(extra)}"><small>Eine Wiederholung im Suchbereich · ${s.periods.map(p=>'T = '+fmt(p.period_nm,6)+' nm').join(' · ')}</small></td></tr>`:''}`;
  const rows=visibleFamilyMembers(s,i).map(a=>{
   const number=familyMemberNumber(s.rank,a.index);
   return `<tr data-family="${i}" data-alias="${a.index}" class="alias-row ${active&&state.activeAlias===a.index?'active':''}" tabindex="0" role="button" aria-label="Lösung ${number} auswählen"><td class="alias-number">${number}</td>${a.values.map((v,k)=>`<td>${quantityValue(v,params[k])}</td>`).join('')}${metricCells(a.q,a.rmse_deg)}</tr>`;
  }).join('');
  return `<tr class="family-group ${active?'active':''}" style="background:${color}"><td colspan="${params.length+2+Number(extra)}"><details class="periodic-family" data-family-open="${i}" ${expandedFamilies.has(i)?'open':''}><summary><span class="family-rank">${s.rank}</span><b>↻ ${int(s.alias_count)} gleichwertige Lösungen</b>${extra?`<span>${esc(m.label)} ${fmt(fitValue(s.q),5)}</span>`:''}<span>Winkel-RMS ${rmsText(s.rmse_deg)}°</span>${periodicFamilyEquations(s)}</summary><p class="family-period">${s.periods.map(p=>esc(p.label)+': T = '+fmt(p.period_nm,8)+' nm').join(' · ')}</p><table class="alias-table"><thead>${heading}</thead><tbody>${rows}</tbody></table>${s.alias_count>s.aliases.length?`<p>Erste ${int(s.aliases.length)} von ${int(s.alias_count)} Wiederholungen. Weitere Nummer direkt auswählen.</p><label class="alias-jump">Lösung Nr. <input data-alias-number="${i}" inputmode="decimal" placeholder="${s.rank}.1" aria-label="Lösungsnummer in Familie ${s.rank}"><button data-jump-family="${i}">Anzeigen</button></label>`:''}</details></td></tr>`;
 }).join('')}</tbody></table>`;
 for(const el of $('resultTable').querySelectorAll('details[data-family-open]'))el.addEventListener('toggle',()=>el.open?expandedFamilies.add(Number(el.dataset.familyOpen)):expandedFamilies.delete(Number(el.dataset.familyOpen)));
 const active=r.solutions[state.active];
 $('activeLabel').textContent=activeTrial()?`Probelösung T${state.activeTrial} · nicht optimiert`:
  active.periodic?`Lösung ${familyMemberNumber(active.rank,state.activeAlias)} · gleichwertige Wiederholung`:`Familie ${active.rank}`;
}
function sameParameterRange([lo,hi],[otherLo,otherHi]){
 const magnitude=Math.max(Math.abs(lo),Math.abs(hi),Math.abs(otherLo),Math.abs(otherHi));
 const tolerance=Math.max(64*Number.EPSILON*magnitude,1e-9*Math.max(hi-lo,otherHi-otherLo));
 return Math.abs(lo-otherLo)<=tolerance&&Math.abs(hi-otherHi)<=tolerance;
}
function readParameterViewport(){
 const el=$('errorPlot'),options=el._elliPlotOptions,layout=el._fullLayout,job=state.resultJob;
 if(!state.result||!layout||!options||options.scene||!el._elliViewKey?.startsWith(job+'|'))return null;
 const bounds=[],scales=[];
 for(const i of state.result.parameters.keys()){
  const key=i?'yaxis':'xaxis',axis=layout[key],spec=options.axes[key];
  if(!axis?.range||!spec)return null;
  const range=axis.range.map(v=>spec.unmap(axis.type==='log'?10**v:v)).sort((a,b)=>a-b);
  if(!range.every(Number.isFinite)||range[0]>=range[1])return null;
  bounds.push(range);
  scales.push(spec.logarithmic?'log':'linear');
 }
 return {job,bounds,scales};
}
function rememberViewportBaseline(view,change){
 if(!view)return;
 if(viewportBaseline?.job!==view.job){
  viewportBaseline=view;
  return;
 }
 for(const [i,scale] of view.scales.entries()){
  const axis=i?'yaxis':'xaxis';
  if(viewportBaseline.scales[i]!==scale||change[axis+'.autorange']===true){
   viewportBaseline.bounds[i]=view.bounds[i];
   viewportBaseline.scales[i]=scale;
  }
 }
}
function viewportSelections(visible=readParameterViewport()){
 if(!visible||viewportBaseline?.job!==visible.job)return {redraw:null,refit:null};
 const params=state.result.parameters,full=params.map(p=>[p.lower,p.upper]);
 // Use fitted limits on untouched axes so Plotly's margins never become search limits.
 const selected=visible.bounds.map((range,i)=>sameParameterRange(range,viewportBaseline.bounds[i])?full[i]:range);
 const redraw=selected.map(([lo,hi],i)=>[Math.max(lo,full[i][0]),Math.min(hi,full[i][1])]);
 const refit=selected.map(([lo,hi],i)=>{
  const p=params[i];
  return [Math.max(lo,p.path.endsWith('.n')?Math.min(p.lower,1e-8):0),
   Math.min(hi,p.path.endsWith('thickness_nm')?1e8:100)];
 });
 const changed=bounds=>bounds.every(([lo,hi])=>lo<hi)&&bounds.some((range,i)=>!sameParameterRange(range,full[i]));
 return {
  redraw:changed(redraw)?{...visible,bounds:redraw}:null,
  refit:changed(refit)?{...visible,bounds:refit}:null,
 };
}
function matchesViewport(view,selection){
 return !!view&&!!selection&&view.job===selection.job&&view.bounds.length===selection.bounds.length&&
  view.scales.every((scale,i)=>scale===selection.scales[i]&&sameParameterRange(view.bounds[i],selection.bounds[i]));
}
function cancelViewport(){
 clearTimeout(viewportTimer);
 viewportRequest?.controller.abort();
 viewportRequest=null;
 viewportError=null;
 state.refinedSurface=null;
}
function updateViewportControls({redraw,refit}=viewportSelections()){
 const ready=!!redraw&&!state.busy,working=ready&&matchesViewport(viewportRequest,redraw);
 const calculated=ready&&matchesViewport(state.refinedSurface,redraw);
 $('refineView').disabled=!ready||working||calculated;
 $('searchView').disabled=!refit||state.busy||state.resultStale||state.importingMeasurements;
 $('searchView').title=state.resultStale?'Zuerst einen Fit zu den aktuellen Eingaben berechnen.':'Sichtbaren Parameterbereich als Suchgrenzen verwenden.';
 let message=$('errorPlot')._elliPlotOptions?.scene?'Einen Parameter-Ausschnitt in der Konturansicht wählen.':
  'Für einen neuen Plot-Ausschnitt im Diagramm zoomen.';
 if(working)message='Plot-Ausschnitt wird neu berechnet …';
 else if(calculated)message=int(state.refinedSurface.evaluations)+' Modellpunkte im Ausschnitt neu berechnet.';
 else if(ready&&matchesViewport(viewportError,redraw))message=viewportError.message;
 else if(ready)message='Ausschnitt gewählt.';
 else if(refit&&!state.busy)message='Suchbereich für einen neuen Fit gewählt.';
 if($('viewportStatus').textContent!==message)$('viewportStatus').textContent=message;
}
function scheduleViewport(change={}){
 clearTimeout(viewportTimer);
 const visible=readParameterViewport();
 rememberViewportBaseline(visible,change);
 const selections=viewportSelections(visible),{redraw}=selections;
 if(viewportRequest&&!matchesViewport(viewportRequest,redraw)){
  viewportRequest.controller.abort();
  viewportRequest=null;
 }
 if(viewportError&&!matchesViewport(viewportError,redraw))viewportError=null;
 updateViewportControls(selections);
 if($('autoRefine').checked&&!$('refineView').disabled&&!viewportError){
  viewportTimer=setTimeout(()=>refineViewport(false),500);
 }
}
async function refineViewport(manual=true){
 const {redraw:selection}=viewportSelections();
 if(state.busy||!selection||matchesViewport(viewportRequest,selection)||matchesViewport(state.refinedSurface,selection))return;
 clearTimeout(viewportTimer);
 viewportRequest?.controller.abort();
 viewportError=null;
 const request={...selection,controller:new AbortController()};
 viewportRequest=request;
 updateViewportControls();
 let detail;
 try{
  const {job,bounds,scales}=selection;
  const data=await api(`/api/jobs/${job}/view`,{method:'POST',body:{bounds,scales,size:bounds.length===1?241:161},signal:request.controller.signal});
  if(viewportRequest!==request||!matchesViewport(request,viewportSelections().redraw))return;
  detail={...data,job};
  state.refinedSurface=detail;
  await errorPlot();
  if(viewportRequest===request)refreshLines();
 }catch(e){
  if(viewportRequest!==request||e.name==='AbortError')return;
  if(detail&&state.refinedSurface===detail)state.refinedSurface=null;
  viewportError={...selection,message:e.message};
  if(manual)toast(e.message,'warning');
 }finally{
  if(viewportRequest===request){
   viewportRequest=null;
   updateViewportControls();
  }
 }
}
async function searchViewport(){
 if(state.busy||state.resultStale||state.importingMeasurements||!flushFitInputs())return;
 const {refit:selection}=viewportSelections();
 if(!selection||state.resultStale)return;
 const active=state.parameters.filter(p=>p.path);
 mutate(()=>selection.bounds.forEach(([lo,hi],i)=>{
  const p=active[i],canUseLog=lo>0||(p.path.endsWith('.k')&&p.positive_min<hi);
  p.lower=lo;
  p.upper=hi;
  p.scale=canUseLog?selection.scales[i]:'linear';
 }));
 renderParameters();
 await run();
}
function displaySurface(){
 const base=state.result.surface,detail=state.refinedSurface;if(!detail||detail.job!==state.resultJob)return base;
 if(state.result.parameters.length===2)return {...base,mesh:$('surfaceView').value==='surface'?detail.mesh:base.mesh};
 const [lo,hi]=detail.bounds[0],pairs=base.axes[0].map((x,i)=>[x,base.rms[i],base.q[i]]).filter(([x])=>x<lo||x>hi);
 pairs.push(...detail.axes[0].map((x,i)=>[x,detail.rms[i],detail.q[i]]));pairs.sort((a,b)=>a[0]-b[0]);return {...base,axes:[pairs.map(p=>p[0])],rms:pairs.map(p=>p[1]),q:pairs.map(p=>p[2])};
}
function refinedContour(ax,ay){
 const s=state.refinedSurface;if(!s||s.job!==state.resultJob)return [];
 return [{type:'contour',x:s.axes[0].map(ax.map),y:s.axes[1].map(ay.map),z:s.rms.map(row=>row.map(rmsLog)),zmin:RMS_LOG_MIN,zmax:RMS_LOG_MAX,colorscale:rmsPlotColors(),autocontour:false,contours:{start:RMS_LOG_MIN,end:RMS_LOG_MAX,size:(RMS_LOG_MAX-RMS_LOG_MIN)/60,coloring:'heatmap',showlines:true},line:{width:.3,color:'#ffffff65'},showscale:false,zorder:1,customdata:s.rms.map((row,j)=>row.map((v,i)=>parameterHover([s.axes[0][i],s.axes[1][j]])+'<br>Winkel-RMS '+angleValue(v)+'°')),hovertemplate:'%{customdata}<extra>Nachgerechneter Ausschnitt</extra>'}];
}
function bindInteractions(){
 $('layerEditor').addEventListener('change',e=>{if(e.target.matches('[data-material-target]'))quickMaterial(e.target);});
 $('profileBranch').onchange=()=>{const b=state.result.identifiability.profile.branches.find(b=>b.id===$('profileBranch').value);if(b)selectSolution(b.family-1,b.alias);};
 $('refineView').onclick=()=>refineViewport(true);$('searchView').onclick=searchViewport;
 $('autoRefine').onchange=()=>{
  if($('autoRefine').checked)viewportError=null;
  scheduleViewport();
 };
 $('resultTable').addEventListener('keydown',e=>{const row=e.target.closest('[data-alias]');if(row&&['Enter',' '].includes(e.key)){e.preventDefault();selectSolution(Number(row.dataset.family),Number(row.dataset.alias));}});
}
