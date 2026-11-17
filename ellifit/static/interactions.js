'use strict';
const expandedFamilies=new Set();
let viewportTimer,viewportController,viewportTicket=0;
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
 mutate(()=>{state.model.layers.splice(index,0,{name:'Film',n:1.5,k:0,thickness_nm:0,uncertainty_n:null,uncertainty_k:null});remapLayerParameters(i=>i>=index?i+1:i);});renderModel();
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
 const s=state.result.solutions[state.active];return `Talast zu Familie ${s.rank}, Lösung ${state.activeAlias+1} · ${parameterHover(s.aliases[state.activeAlias].values).replace(/<[^>]*>/g,'')}. ${p.boundary_rule||''} Die Gleichungen darunter gelten lokal an dieser Lösung. Von verschiedenen Lösungen fortgesetzte Verläufe können sich überlagern.`;
}
function renderBranchControl(){
 const p=state.result?.identifiability?.profile;
 $('profileBranch').innerHTML=(p?.branches||[]).map(b=>`<option value="${b.id}">Familie ${b.family} · Lösung ${b.alias+1}</option>`).join('');
 const branch=selectedProfileBranch();$('profileBranch').value=branch?.id||'';$('profileScope').textContent=profileScope();
}
function renderFitCautions(){
 const box=$('fitCautions'),r=state.result;if(!r){box.hidden=true;return;}
 const items=[],d=r.identifiability||{},periodic=r.solutions.filter(s=>s.periods?.length),good=r.solutions.filter(s=>s.rmse_deg<=.1),coupled=r.solutions.some(s=>s.uncertainty?.strongly_correlated||s.uncertainty?.weak);
 const flag=(title,text,critical=false)=>items.push({title,text,critical});
 if(periodic.length)flag('Periodische Mehrdeutigkeit',`${int(periodic.reduce((n,s)=>n+s.alias_count,0))} periodische Parameterkombinationen in ${int(periodic.length)} Familien. Innerhalb einer Familie gleichwertig: die erste Wiederholung ist nicht bevorzugt. Weitere periodische Lösungen können außerhalb des Suchbereichs liegen. Zusätzliche Winkel oder unabhängige Dickeninformation nötig.`);
 if(r.solutions[0].rmse_deg>.1)flag('Passung prüfen',`Winkel-RMS am besten Fit: ${rmsText(r.solutions[0].rmse_deg)}°. Modell, Messauswahl und Suchgrenzen prüfen; der kleinste Wert allein belegt keine brauchbare Passung.`,r.solutions[0].rmse_deg>=10);
 if(good.length>1)flag('Mehrere sehr gute Fits',`${int(good.length)} verschiedene Familien haben Winkel-RMS ≤ 0,1°. Aus dem kleinsten angezeigten Wert folgt keine eindeutige physikalische Lösung.`);
 if(d.lack_of_fit_dof<=0&&r.parameters.length===2)flag('Keine unabhängige Modellprüfung',`${int(d.independent_mean_components)} unabhängige Winkelmittelwerte für ${int(d.free_parameters)} freie Parameter. Wiederholungen desselben Winkels ändern das nicht. Ein kleiner RMS bestätigt hier das Schichtmodell nicht.`,true);
 if(coupled)flag('Parameter stark gekoppelt','Viele Wertepaare können sehr ähnlich passen. Einzelne Dicken oder Indizes nicht isoliert abschreiben; gewählten Talast und zusätzliche Messwinkel prüfen.',r.solutions.some(s=>s.uncertainty?.weak));
 const branch=selectedProfileBranch(),points=(branch?.points||d.profile?.points||[]).filter(p=>p.rmse_deg<=.1);
 if(points.length>4&&r.parameters.length===2)flag('Tal mit vielen gut passenden Wertepaaren',r.parameters.map((p,i)=>`${parameterSymbol(p)}: ${quantityValue(Math.min(...points.map(q=>q.values[i])),p)} bis ${quantityValue(Math.max(...points.map(q=>q.values[i])),p)}${p.path.endsWith('thickness_nm')?' nm':''}`).join(' · ')+'. Spanne entlang des gewählten Talasts, keine Konfidenzgrenze.');
 if(r.solutions[0].at_boundary)flag('Bestes Minimum an der Suchgrenze','Suchbereich prüfen und erweitern. Die Begrenzung kann die scheinbar beste Lösung verursachen.',true);
 box.hidden=!items.length;if(!items.length)return;box.dataset.kind=items.some(x=>x.critical)?'critical':'warning';
 box.innerHTML=`<div class="caution-heading"><strong>Ergebnis nicht eindeutig – keinen Einzelwert ungeprüft übernehmen</strong><span>${state.resultStale?'Zum früheren Fit':'Zum angezeigten Fit'}</span></div><div class="caution-grid">${items.map(x=>`<article data-kind="${x.critical?'critical':'warning'}"><b>${esc(x.title)}</b><p>${esc(x.text)}</p></article>`).join('')}</div><p class="caption">0,1° ist hier eine Orientierung für kleine Winkelabweichungen und kein statistischer Nachweis. Die Hinweise gehören zum oben datierten Fit.</p>`;
}
function renderFamilies(){
 const r=state.result,params=r.parameters,heading=`<tr><th>#</th>${params.map(p=>`<th>${parameterHeading(p)}</th>`).join('')}<th>RMS (°)${fitMetric().differs_from_angular_rms?'':' ↓'}</th></tr>`;
 $('resultTable').innerHTML=`<table class="families-table"><thead>${heading}</thead><tbody>${r.solutions.map((s,i)=>{
  const active=!state.activeTrial&&state.active===i,color=rmsColor(s.rmse_deg,.17);
  if(!s.periodic)return `<tr class="family-row ${active?'active':''}" data-family="${i}" title="${esc(fitMetric().label)}: ${fmt(fitValue(s.q),5)} (${metricUnit()})" style="background:${color}"><td>${s.rank}</td>${s.values.map((v,k)=>`<td>${quantityValue(v,params[k])}</td>`).join('')}<td>${rmsText(s.rmse_deg)}</td></tr>`;
  const rows=s.aliases.map((a,j)=>`<tr data-family="${i}" data-alias="${j}" class="alias-row ${active&&state.activeAlias===j?'active':''}" tabindex="0" role="button" title="${esc(fitMetric().label)}: ${fmt(fitValue(a.q),5)} (${metricUnit()})" aria-label="Familie ${s.rank}, Lösung ${j+1} auswählen"><td>${j+1}</td>${a.values.map((v,k)=>`<td>${quantityValue(v,params[k])}</td>`).join('')}<td>${rmsText(a.rmse_deg)}</td></tr>`).join('');
  return `<tr class="family-group ${active?'active':''}" style="background:${color}"><td colspan="${params.length+2}"><details class="periodic-family" data-family-open="${i}" ${expandedFamilies.has(i)?'open':''}><summary><span class="family-rank">${s.rank}</span><b>↻ ${int(s.alias_count)} gleichwertige Lösungen</b><span>RMS ${rmsText(s.rmse_deg)}°</span></summary><p class="family-period">${s.periods.map(p=>`${esc(p.label)}: T = ${numericText(p.period_nm,'d')} nm`).join(' · ')}. Aufsteigende Werte, keine Bevorzugung der ersten Lösung.</p><table class="alias-table"><thead>${heading}</thead><tbody>${rows}</tbody></table>${s.alias_count>s.aliases.length?`<p>Erste ${int(s.aliases.length)} von ${int(s.alias_count)} berechneten Wiederholungen.</p>`:''}</details></td></tr>`;
 }).join('')}</tbody></table>`;
 for(const el of $('resultTable').querySelectorAll('details[data-family-open]'))el.addEventListener('toggle',()=>el.open?expandedFamilies.add(Number(el.dataset.familyOpen)):expandedFamilies.delete(Number(el.dataset.familyOpen)));
 const s=r.solutions[state.active];$('activeLabel').textContent=activeTrial()?`Probelösung T${state.activeTrial} · nicht optimiert`:`Dargestellt: Familie ${s.rank}${s.periodic?' · Lösung '+(state.activeAlias+1)+' (gleichwertige Wiederholung)':''}`;
}
function visibleParameterBounds(){
 const el=$('errorPlot'),options=el._elliPlotOptions;if(!state.result||!el._fullLayout||!options)return null;
 const layout=options.scene?el._fullLayout.scene:el._fullLayout;
 return state.result.parameters.map((p,i)=>{const spec=options.axes[i?'yaxis':'xaxis'],axis=layout[i?'yaxis':'xaxis'];return axis.range.map(v=>spec.unmap(axis.type==='log'?10**v:v)).sort((a,b)=>a-b);});
}
function viewSignature(){return JSON.stringify([state.resultJob,visibleParameterBounds(),state.view.logX,state.view.logY,$('surfaceView').value,$('errorQuantity').value]);}
function cancelViewport(){clearTimeout(viewportTimer);viewportController?.abort();viewportTicket++;state.refinedSurface=null;$('viewportStatus').textContent='Zoom verfeinert die Darstellung des gezeigten Fits; eine neue Suche erfolgt per Knopfdruck.';}
function updateViewportControls(){
 const ready=!!state.result&&!state.busy;$('refineView').disabled=!ready;$('searchView').disabled=!ready||state.resultStale;
 $('searchView').title=state.resultStale?'Zuerst einen Fit zu den aktuellen Eingaben berechnen.':'Suchgrenzen auf den sichtbaren Parameterbereich setzen und neu fitten.';
}
function scheduleViewport(){
 clearTimeout(viewportTimer);viewportController?.abort();viewportTicket++;
 if($('autoRefine').checked&&!state.busy&&state.result&&!$('errorPlot')._elliPlotOptions?.scene)viewportTimer=setTimeout(()=>refineViewport(false),500);
}
async function refineViewport(manual=true){
 if(!state.result||state.busy)return;
 const bounds=visibleParameterBounds();if(!bounds)return;
 const ticket=++viewportTicket,signature=viewSignature(),job=state.resultJob;viewportController?.abort();viewportController=new AbortController();
 $('viewportStatus').textContent='Sichtbaren Ausschnitt nachrechnen …';
 try{
  const scales=bounds.map((_,i)=>(i?state.view.logY:state.view.logX)?'log':'linear');
  const data=await api(`/api/jobs/${job}/view`,{method:'POST',body:{bounds,scales,size:state.result.parameters.length===1?241:161},signal:viewportController.signal});
  if(ticket!==viewportTicket||signature!==viewSignature()||job!==state.resultJob)return;
  state.refinedSurface={...data,job};await errorPlot();$('viewportStatus').textContent=`${int(data.evaluations)} Modellpunkte im Ausschnitt nachgerechnet. Lösungsliste unverändert; für neue Minima „Im Ausschnitt neu suchen“.`;
 }catch(e){if(e.name==='AbortError')return;$('viewportStatus').textContent=e.message;if(manual)toast(e.message,'warning');}
}
async function searchViewport(){
 if(state.busy||!state.result||state.resultStale)return;
 const bounds=visibleParameterBounds();if(!bounds||!flushFitInputs())return;
 const clipped=bounds.map((b,i)=>{const p=state.parameters[i],floor=p.path.endsWith('.n')||!p.path.endsWith('.k')&&(i?state.view.logY:state.view.logX)?1e-8:0,ceiling=p.path.endsWith('thickness_nm')?1e8:100;return [Math.max(floor,b[0]),Math.min(ceiling,b[1])];});
 if(clipped.some(([lo,hi])=>!(lo<hi)))return toast('Kein gültiger Parameterbereich sichtbar.','warning');
 mutate(()=>clipped.forEach(([lo,hi],i)=>{state.parameters[i].lower=lo;state.parameters[i].upper=hi;state.parameters[i].scale=(i?state.view.logY:state.view.logX)?'log':'linear';}));renderParameters();cancelViewport();await run();
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
 $('refineView').onclick=()=>refineViewport(true);$('searchView').onclick=searchViewport;$('autoRefine').onchange=()=>{$('autoRefine').checked?scheduleViewport():clearTimeout(viewportTimer);};
 $('resultTable').addEventListener('keydown',e=>{const row=e.target.closest('[data-alias]');if(row&&['Enter',' '].includes(e.key)){e.preventDefault();selectSolution(Number(row.dataset.family),Number(row.dataset.alias));}});
}
