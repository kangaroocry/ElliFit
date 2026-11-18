'use strict';

let workArea = 'prepare';
let pinnedFit = null;
let recipeBaseline = null;
const layerDisclosure = new Map();
let opticalTicket = 0, linesTicket = 0, profileTicket = 0;
let profileKey = null;
let opticalKey = '', linesKey = '', lineData = null;

function changeArea(area, scroll = true) {
    if (area === 'evaluate' && !state.result) return;
    workArea = area;
    const prepare = area === 'prepare';
    $('inputDetails').hidden = !prepare;
    $('evaluation').hidden = prepare;
    for (const [id, current] of [['prepareTab', prepare], ['evaluateTab', !prepare]]) {
        if (current) $(id).setAttribute('aria-current', 'page');
        else $(id).removeAttribute('aria-current');
    }
    $('evaluateTab').disabled = !state.result;
    if (scroll) window.scrollTo({top: 0, behavior: 'instant'});
    if (!prepare) requestAnimationFrame(resizeWorkPlots);
}

function resizeWorkPlots() {
    for (const id of ['errorPlot', 'comparisonPlot', 'profilePlot', 'conditionalPlot']) {
        const graph = $(id);
        if (graph._fullLayout && graph.offsetWidth) Plotly.Plots.resize(graph);
    }
}

function refreshPreparation(selected, angleCount) {
    const free = state.parameters.filter(p => p.path).map(p => parameterSymbol(p, state.model));
    $('prepSelection').textContent = [
        selected ? int(selected) + ' Messpaare' : 'Keine Messungen ausgewählt',
        selected ? int(angleCount) + ' Einfallswinkel' : '',
        free.length ? free.join(' und ') + ' frei' : 'Kein freier Parameter',
    ].filter(Boolean).join(' · ');
    $('runFit').disabled = state.busy || !selected || !free.length;
    $('dataFields').classList.toggle('empty-data', !state.rows.length);
    $('kineticNote').hidden = !state.rows.some(r => r.time_s != null);
    $('evaluateTab').disabled = !state.result;
    $('modelQuickName').textContent = state.model.name + ' · ' + numericText(state.model.wavelength_nm, 'wavelength') + ' nm';
    if (recipeBaseline && recipeBaseline.key !== recipeFingerprint()) {
        $('recipeList').value = '';
        recipeBaseline = null;
    }
}

function wrapLayers() {
    for (const row of $('layerEditor').querySelectorAll('.layer-editor-row')) {
        const path = row.querySelector('[data-field="name"]').dataset.path.replace(/\.name$/, '');
        const medium = getPath(state.model, path);
        const key = state.modelDocument + ':' + (medium.layer_id || path);
        const box = document.createElement('details');
        box.className = 'layer-box';
        box.dataset.path = path;
        box.open = layerDisclosure.get(key) ?? false;
        const summary = document.createElement('summary');
        summary.innerHTML = '<span class="layer-summary-name"></span><span class="layer-summary-values"></span>';
        row.before(box);
        box.append(summary,row);
        box.addEventListener('toggle', () => { if (box.isConnected) layerDisclosure.set(key,box.open); });
    }
    updateLayerSummaries();
}

function updateLayerSummaries() {
    for (const box of $('layerEditor').querySelectorAll('.layer-box')) {
        const path = box.dataset.path, m = getPath(state.model, path);
        const label = mediumLabel(path);
        box.querySelector('.layer-summary-name').textContent = label;
        const quantities = [['n', m.n], ['k', m.k], ['thickness_nm', m.thickness_nm]];
        box.querySelector('.layer-summary-values').innerHTML = quantities.filter(([,v]) => v != null).map(([field,value]) => {
            const slot = state.parameters.findIndex(p => p.path === path + '.' + field);
            const text = (field === 'thickness_nm' ? 'd' : field) + ' ' + quantityValue(value,path+'.'+field) + (field === 'thickness_nm' ? ' nm' : '');
            if (slot < 0) return text;
            const p=state.parameters[slot];
            return '<b>' + text + ' · ' + (slot === 0 ? 'X' : 'Y') + '</b> <span class="summary-range">(' + quantityValue(p.lower,p) + '–' + quantityValue(p.upper,p) + ')</span>';
        }).join('　');
    }
}

function recipeFingerprint() {
    return documentFingerprint({model:state.model,parameters:state.parameters,settings:state.settings});
}

function measurementSelectionKey(rows) {
    // Import IDs are temporary. Retain the measured values, provenance and multiplicity.
    return JSON.stringify(rows.map(r=>JSON.stringify([r.source,r.line,r.comment||'',r.angle,r.delta,r.psi,
        r.measurement_kind||'repeat',r.site||'',r.azimuth_deg??null,r.time_s??null])).sort());
}
async function refreshRecipes() {
    const own = await api('/api/recipes');
    const list = $('recipeList'), previous = list.value;
    list.replaceChildren(new Option('Vorlage wählen …',''));
    function add(title, values) {
        if (!values.length) return;
        const group = document.createElement('optgroup'); group.label = title;
        for (const [name,id] of values) group.append(new Option(name,id));
        list.append(group);
    }
    add('Eigene Auswertevorlagen', own.map(r => [r.name,'recipe:'+r.file]));
    add('Schichtmodelle mit Standard-Suche', Array.from($('modelList').options).filter(o => o.value).map(o => [o.text,'model:'+o.value]));
    if (Array.from(list.options).some(o => o.value === previous)) list.value = previous;
}

async function loadRecipe() {
    const value = $('recipeList').value;
    if (!value) {recipeBaseline = null; return;}
    const previous = recipeBaseline?.value || '';
    try {
        const custom = value.startsWith('recipe:'), file = value.slice(value.indexOf(':')+1);
        const data = await api((custom?'/api/recipes/':'/api/models/')+encodeURIComponent(file));
        const model = custom?data.model:data;
        if (!await confirmDocumentChange('model','die Auswertevorlage geladen wird')) {
            $('recipeList').value = previous; return;
        }
        const path = model.layers.length ? 'layers.0.thickness_nm' : 'substrate.n';
        const params = custom?data.parameters:[{path,...defaultBounds(path)}];
        recipeBaseline = null;
        state.parameters = [clone(params[0]), params[1]?clone(params[1]):{path:'',...defaultBounds('')}];
        state.settings = custom?migratedSettings(data.settings):clone(DEFAULT_SETTINGS);
        beginModelDocument(model,custom?null:file,custom?'Auswertevorlage '+data.name:'');
        renderSettings(); renderModel(); scheduleStatistics(); stale();
        recipeBaseline = {value,key:recipeFingerprint()}; $('recipeList').value=value;
        toast('Auswertevorlage geladen.','success');
    } catch (e) { $('recipeList').value=previous; toast(e.message,'critical'); }
}

async function storeRecipe() {
    if (!flushFitInputs()) return;
    const parameters = state.parameters.filter(p => p.path);
    if (!parameters.length) return toast('Zuerst einen freien Parameter wählen.','warning');
    const name = prompt('Name der Auswertevorlage', state.model.name);
    if (!name || !name.trim()) return;
    const filename = name.trim().replace(/[<>:"/\\|?*]/g,'_').replace(/\.json$/i,'')+'.json';
    const path = '/api/recipes/'+encodeURIComponent(filename);
    const body = {name:name.trim(),model:state.model,parameters,settings:settings()};
    try {
        try { await api(path,{method:'PUT',body}); }
        catch(e) {
            if(e.status!==409) throw e;
            if(!confirm('Vorhandene Auswertevorlage „'+name.trim()+'“ überschreiben?')) return;
            await api(path+'?overwrite=true',{method:'PUT',body});
        }
        await refreshRecipes(); const value='recipe:'+filename;
        $('recipeList').value=value; recipeBaseline={value,key:recipeFingerprint()};
        toast('Auswertevorlage gespeichert.','success');
    } catch(e) { toast(e.message,'critical'); }
}

function chooseColumns(file, meta) {
    const dialog=$('columnDialog'), mode=$('columnMode'), unit=$('timeUnit'), angle=$('kineticAngle');
    $('columnFile').textContent=file.name;
    $('columnPreview').textContent=meta.preview.join('\n');
    mode.value=meta.kind==='time'?'time':'';
    mode.disabled=meta.kind==='time';
    unit.value=meta.unit||''; angle.value=meta.angle==null?'':numericText(meta.angle,'angle');
    $('columnError').textContent=''; $('timeFields').hidden=mode.value!=='time';
    return new Promise(resolve=>{
        let parameters=null;
        mode.onchange=()=>{$('timeFields').hidden=mode.value!=='time';};
        $('cancelColumns').onclick=()=>dialog.close();
        $('columnForm').onsubmit=event=>{
            event.preventDefault();
            if(!mode.value)return;
            parameters={first_column:mode.value};
            if(mode.value==='time'){
                const v=parseNumber(angle.value);
                if(!unit.value||!Number.isFinite(v)||v<=0||v>=90){
                    parameters=null; $('columnError').textContent='Zeiteinheit und einen Einfallswinkel zwischen 0° und 90° angeben.'; return;
                }
                parameters.time_unit=unit.value; parameters.incidence=String(v);
            }
            dialog.close();
        };
        dialog.addEventListener('close',()=>resolve(parameters),{once:true});
        dialog.showModal();
    });
}
async function importMeasurementFile(file) {
    const body=new FormData(); body.append('file',file);
    const path='/api/import?inspect_columns=true';
    const data=await api(path,{method:'POST',body});
    if(!data.requires_columns) return data;
    const options=await chooseColumns(file,data);
    return options ? api(path+'&'+new URLSearchParams(options),{method:'POST',body}) : null;
}

function currentFinding() {
    const r=state.result, best=r.solutions[0];
    const good=r.solutions.filter(s=>s.rmse_deg!=null && s.rmse_deg<=.1);
    const values=best.values.map((v,i)=>quantityValue(v,r.parameters[i])+(r.parameters[i].path.endsWith('thickness_nm')?' nm':''));
    if(best.rmse_deg==null) return {title:'Δ unbestimmt · Winkel-RMS nicht auswertbar',tone:'warn',detail:'An einer Polarisationsnullstelle ist nur der Polarisationszustand auswertbar. Der Fit verwendet die '+r.fit_objective.label+'.'};
    if(best.rmse_deg!=null && best.rmse_deg>1) return {title:'Fit relativ schlecht · Winkel-RMS '+rmsText(best.rmse_deg)+'°',tone:'critical',detail:'Der beste Fit überschreitet 1°. Messauswahl, Modell und Suchbereich prüfen.'};
    if(best.uncertainty?.weak) return {title:r.parameters.length===2?'Mindestens ein Fitparameter ist schwach bestimmbar':'Der Fitparameter ist schwach bestimmbar',tone:'warn',detail:r.parameters.map(p=>p.label).join(' und ')+' · Empfindlichkeit und Suchbereich prüfen.'};
    if(r.parameters.length===2 && best.uncertainty?.strongly_correlated) return {title:'Die beiden Fitparameter sind stark gekoppelt',tone:'warn',detail:r.parameters.map(p=>p.label).join(' und ')+' · '+(r.identifiability.profile?'Talverlauf in der Fehlerlandschaft prüfen.':'Parameterprofil unter Diagnosen prüfen.')};
    if(good.length>1) return {title:int(good.length)+' Lösungsfamilien mit Winkel-RMS bis 0,1°',tone:'warn',detail:'Die Messung lässt mehrere Parameterkombinationen zu.'};
    if(best.periodic) return {title:int(best.alias_count)+(r.parameters.length===1&&r.parameters[0].path.endsWith('thickness_nm')?' gleichwertige Dicken':' gleichwertige Parameterkombinationen')+' im Suchbereich',tone:'warn',detail:familyEquationText(best)};
    if(best.at_boundary) return {title:'Bestes Ergebnis an der Suchgrenze',tone:'warn',detail:r.parameters.map((p,i)=>p.label+' = '+values[i]).join(' · ')};
    if(r.identifiability.saturated) return {title:'Zwei Parameter aus einem Einfallswinkel',tone:'warn',detail:'Kein unabhängiger Freiheitsgrad zur Prüfung des Modells.'};
    return {title:r.parameters.map((p,i)=>p.label.replace(/ \(nm\)$/,'')+' · '+values[i]).join(' · '),tone:'ok',detail:'Bester Fit im untersuchten Bereich · '+r.model.name};
}

function renderFinding() {
    if(!state.result) return;
    const f=currentFinding();
    $('findingTitle').textContent=f.title; $('findingDetail').textContent=f.detail; $('finding').dataset.tone=f.tone;
    $('findingLabel').textContent=state.resultStale?'Ergebnis des vorherigen Fits':'Befund der globalen Suche';
    renderFitComparison();
}
function resultSnapshot() {
    const r=state.result, s=activeTrial()||selectedMember(), family=r.solutions[state.active];
    const context=r.measurement_context, labels=context.labels.slice(0,3).map(x=>[x.source,x.comment].filter(Boolean).join(' · '));
    const angles=[...new Set(r.measurement_uncertainty.groups.map(g=>g.angle))].sort((a,b)=>a-b);
    const angleText=angles.length>12?angleValue(angles[0])+'–'+angleValue(angles[angles.length-1])+'° ('+int(angles.length)+' Winkel)':angles.map(a=>angleValue(a)+'°').join(', ');
    const familyEquation=family.periodic&&!activeTrial()?familyEquationText(family):'';
    return {stamp:state.fitCompletedAt, dataKey:state.fitDataKey, model:r.model.name, source:labels.join(' / ')+(context.label_count>3?' und '+int(context.label_count-3)+' weitere':''), angles:angleText,
        counts:int(r.counts.selected)+' Messpaare · '+int(r.counts.angles)+' Winkel', criterion:r.fit_objective.label,
        parameters:r.parameters.map((p,i)=>p.label+' = '+quantityValue(s.values[i],p)+(p.path.endsWith('thickness_nm')?' nm':'')),
        selection:activeTrial()?'Probelösung T'+state.activeTrial:'Familie '+int(family.rank)+(family.periodic?' · Vertreter '+int(state.activeAlias+1)+' von '+int(family.alias_count):''),
        rms:s.rmse_deg, fit:fmt(fitValue(s.q),5)+(fitMetric().unit==='degree'?'°':' (dimensionslos)'), family:familyEquation, families:r.counts.families, total:r.counts.aliases,
        finding:currentFinding().title, ranges:r.parameters.map(p=>p.symbol+' '+quantityValue(p.lower,p)+'–'+quantityValue(p.upper,p)+' ('+p.scale+')'),
        metric:r.settings.metric, duplicates:r.settings.duplicate_policy, weighting:r.settings.uncertainty_mode};
}
function familyEquationText(family) {
    const temp=document.createElement('template');
    temp.innerHTML=periodicFamilyEquations(family);
    return Array.from(temp.content.querySelectorAll('.family-equation,.family-indices'),e=>e.textContent).join(' · ');
}
function renderFitComparison() {
    invalidateProfile();
    $('compareFits').hidden=!pinnedFit;
    if(!pinnedFit||!state.result)return;
    const now=resultSnapshot();
    const fields=[['Modell',x=>x.model],['Messauswahl',x=>x.source+' · '+x.counts],['Freie Parameter und Grenzen',x=>x.ranges.join(' · ')],['Einfallswinkel',x=>x.angles],['Fitkriterium und Wert',x=>x.criterion+' · '+x.fit],['Wiederholungen',x=>x.duplicates==='average'?'Winkelmittelwerte':'Einzelwerte'],['Befund',x=>x.finding],['Gezeigte Auswahl',x=>x.selection],['Parameter',x=>x.parameters.join(' · ')],['Periodenfamilie',x=>x.family||'—'],['Winkel-RMS',x=>x.rms==null?'—':rmsText(x.rms)+'°']];
    $('fitComparison').innerHTML='<p>'+ (pinnedFit.dataKey===now.dataKey?'Identische Messauswahl.':'Unterschiedliche Messauswahl. Fitgüten sind nur bedingt vergleichbar.')+'</p><table><thead><tr><th></th><th>Gemerkt</th><th>Angezeigt</th></tr></thead><tbody>'+
        fields.map(([label,toText])=>'<tr><th>'+label+'</th><td>'+esc(toText(pinnedFit))+'</td><td>'+esc(toText(now))+'</td></tr>').join('')+'</tbody></table>';
}
function printReport() {
    const s=resultSnapshot(), r=state.result;
    const warnings=[...$('fitCautions').querySelectorAll('article')].map(e=>[e.querySelector('summary').textContent,e.querySelector('p').textContent].join(' · '));
    const rows=[['Modell',s.model],['Messdaten',s.source+' · '+s.counts],['Einfallswinkel',s.angles],['Optik',numericText(r.model.wavelength_nm,'wavelength')+' nm · Δ '+(r.model.delta_convention==='reversed'?'360° − arg(ρ)':'arg(ρ)')],['Suchbereich',s.ranges.join(' · ')],['Fitkriterium und Wert der Auswahl',s.criterion+' · '+s.fit],['Auswahl',s.selection],['Parameter der Auswahl',s.parameters.join(' · ')],['Winkel-RMS der Auswahl',s.rms==null?'Unbestimmt':rmsText(s.rms)+'°'],['Lösungen im Suchbereich',int(s.families)+' Familien · '+int(s.total)+' Parameterkombinationen'],['Periodengleichung',s.family||'—']];
    $('printReport').innerHTML='<h1>ElliFit · Laborbericht</h1><p>'+esc(new Date(s.stamp).toLocaleString('de-DE'))+' · Version '+esc(UI_VERSION)+(state.resultStale?' · früherer Eingabestand':'')+'</p><h2>'+esc(s.finding)+'</h2><table>'+rows.map(([k,v])=>'<tr><th>'+esc(k)+'</th><td>'+esc(v)+'</td></tr>').join('')+'</table>'+
        (warnings.length?'<h2>Prüfhinweise</h2><p>'+esc(warnings.join(' · '))+'</p>':'');
    window.print();
}

function plotMeasurementLines(traces, ax, ay) {
    if(!$('showLines').checked||!lineData||lineData.job!==state.resultJob||lineData.group!==Number($('lineGroup').value))return;
    for(const [key,symbol,color,dash] of [['delta','Δ','#b32d43','solid'],['psi','Ψ','#1f57ae','dash']]){
        const x=[],y=[];
        for(const [a,b] of lineData[key]){x.push(ax.map(a[0]),ax.map(b[0]),null);y.push(ay.map(a[1]),ay.map(b[1]),null);}
        traces.push({type:'scatter',mode:'lines',name:symbol+'-Messlinie',x,y,line:{color,dash,width:2.5},hoverinfo:'skip',showlegend:false,zorder:6});
    }
}
async function refreshLines(force=false) {
    const r=state.result, two=r?.parameters.length===2;
    $('lineControls').hidden=!two;
    const active=two&&$('showLines').checked&&$('surfaceView').value!=='surface';
    $('lineGroupLabel').hidden=!active;
    if(!active){linesTicket++;linesKey='';lineData=null;$('lineInfo').textContent=two&&$('showLines').checked?'Messlinien erscheinen in der Konturansicht.':'';return;}
    const group=Number($('lineGroup').value), job=state.resultJob;
    const bounds=state.refinedSurface?.job===job ? state.refinedSurface.bounds : null;
    const key=JSON.stringify([job,group,bounds]);
    if(linesKey===key&&!force)return;
    const ticket=++linesTicket; linesKey=key;lineData=null;
    $('lineInfo').textContent='Messlinien werden berechnet …';
    try{
        const data=await api('/api/jobs/'+job+'/measurement-lines',{method:'POST',body:{group,bounds}});
        if(ticket!==linesTicket||job!==state.resultJob)return;
        lineData={...data,job}; await errorPlot();
        $('lineInfo').textContent=(data.delta_deg==null?'Δ unbestimmt':('Rot durchgezogen · Δ '+angleValue(data.delta_deg)+'°'))+
          ' / '+(data.psi_deg==null?'Ψ unbestimmt':'Blau gestrichelt · Ψ '+angleValue(data.psi_deg)+'°')+'. Linien der Messgruppenmittelwerte.'+
          (!data.delta.length&&!data.psi.length?' Keine Schnittlinie im Ausschnitt.':'')+(data.limited?' Rasterauflösung begrenzt.':'');
    }catch(e){if(ticket===linesTicket){linesKey='';$('lineInfo').textContent=e.message;}}
}
function setupResultTools() {
    const r=state.result, groups=r.measurement_uncertainty.groups;
    $('conditionalPanel').hidden=r.parameters.length!==2;
    $('profileColumn').replaceChildren(...r.parameters.map((p,i)=>new Option(p.label,String(i))));
    profileKey=null; invalidateProfile();
    $('sensitivityLayer').replaceChildren(...r.model.layers.map((layer,i)=>new Option('['+(r.model.layers.length-i)+'] '+layer.name,String(i))));
    const d=r.parameters.find(p=>p.path.endsWith('.thickness_nm'));
    if(d)$('sensitivityLayer').value=d.path.split('.')[1];
    $('sensitivityLayer').disabled=!r.model.layers.length;
    $('lineGroup').replaceChildren(...(r.parameters.length===2?groups.map((g,i)=>new Option(angleValue(g.angle)+'° · '+contextLabel(g),String(i))):[]));
    $('showLines').checked=false; refreshLines(); opticalKey=''; opticalTicket++;
}
async function refreshOptics() {
    const r=state.result,c=state.comparison;
    if(!r||!c||!$('analysisDetails').open||!$('opticsPanel').open)return;
    const layer=r.model.layers.length?Number($('sensitivityLayer').value):null, job=state.resultJob;
    const member=activeTrial()||selectedMember(), key=JSON.stringify([job,member.values,layer]);
    if(key===opticalKey)return;
    const ticket=++opticalTicket;opticalKey=key;
    $('opticsContent').textContent='Optische Empfindlichkeit wird berechnet …';
    try {
        const o=await api('/api/jobs/'+job+'/optics',{method:'POST',body:{values:member.values,layer}});
        if(ticket!==opticalTicket||state.resultJob!==job)return;
        const residual=c.residual_summary;
        const fmtPower=x=>fmt(x,4);
        const cal=c.uncertainty?.calibration_sources?.find(source=>source.path==='angle');
        const col=r.parameters.findIndex(p=>p.path==='layers.'+layer+'.thickness_nm');
        const angleCal=col>=0?cal?.contribution?.[col]:null;
        const groups=r.measurement_uncertainty.groups;
        const scan=new Map(o.rows.map(x=>[x.angle_deg,x]));
        const table=groups.map(g=>{
            const row=scan.get(g.angle);
            return '<tr><td>'+angleValue(g.angle)+'° · '+esc(contextLabel(g))+'</td><td>'+fmtPower(row.rp)+'</td><td>'+(row.nearest?angleValue(row.nearest.angle_deg)+'° / '+fmtPower(row.nearest.rp):'—')+'</td><td>'+angleValue(row.delta_change)+'</td><td>'+angleValue(row.psi_change)+'</td><td>'+angleValue(g.std_delta)+' / '+angleValue(g.std_psi)+'</td></tr>';
        }).join('');
        $('opticsContent').innerHTML='<p>Modell der gezeigten Auswahl im Einfallsmedium '+esc(r.model.ambient.name)+' · '+fmt(r.model.wavelength_nm)+' nm. '+int(o.minimum_count)+' innere Rₚ-Minima im Winkelscan von '+fmt(o.range_deg[0])+'° bis '+fmt(o.range_deg[1])+'°.</p>'+
          '<table><thead><tr><th>Messwinkel / Gruppe</th><th>Rₚ am Messwinkel</th><th>Nächstes Minimum φ / Rₚ</th><th>Änderung Δ bei +1 nm (°)</th><th>Änderung Ψ bei +1 nm (°)</th><th>Messstreuung sΔ / sΨ (°)</th></tr></thead><tbody>'+table+'</tbody></table>'+
          '<p>Übrige Modellparameter fest. Die Signaländerung gilt lokal für diese Auswahl. '+(angleCal!=null?'Beitrag der Winkeljustage zu u(d) dieser Schicht: '+fmt(angleCal,4)+' nm.':'')+(o.resolution_limited?' Der Winkelscan erreicht seine Auflösungsgrenze.':'')+'</p>'+
          (residual?'<p>RMS der Residuen · Δ '+angleValue(residual.delta_rms)+'° · Ψ '+angleValue(residual.psi_rms)+'° · Stokes-Sehnenabstand '+fmt(residual.stokes_chord_rms,4)+' (Skala 0–2).</p>':'');
    }catch(e){if(ticket===opticalTicket){opticalKey='';$('opticsContent').textContent=e.message;}}
}

function profileSelectionKey() {
    return state.resultJob+'|'+(activeTrial()||selectedMember()).values.join(',')+'|'+$('profileColumn').value;
}
function invalidateProfile() {
    if(!state.result||state.result.parameters.length!==2||profileKey===profileSelectionKey())return;
    profileTicket++;profileKey=null;$('conditionalPlot').hidden=true;$('calculateProfile').disabled=false;
    $('conditionalInfo').textContent='Vergleicht die Zielfunktion bei festem und jeweils neu optimiertem zweiten Parameter.';
}
async function calculateProfile() {
    const r=state.result, col=Number($('profileColumn').value), member=activeTrial()||selectedMember(), job=state.resultJob;
    const key=profileSelectionKey(),ticket=++profileTicket;profileKey=key;
    $('calculateProfile').disabled=true;$('conditionalInfo').textContent='Profil wird nachgerechnet …';
    try {
        const data=await api('/api/jobs/'+job+'/conditional-profile',{method:'POST',body:{column:col,values:member.values}});
        if(ticket!==profileTicket||profileSelectionKey()!==key)return;
        const x=axisSpec(data.x,r.parameters[col].label,r.parameters[col].scale==='log',r.parameters[col].positive_min);
        const p=r.parameters[1-col], q=r.parameters[col], layout=baseLayout();
        layout.xaxis=x.axis;layout.yaxis={type:'log',title:{text:fitAxisLabel()}};
        const lines=[['fixed_q',p.symbol+' fest','#526779','dash'],['profiled_q',p.symbol+' frei','#076569','solid']].map(([field,name,color,dash])=>({
            x:x.values,y:data[field].map(v=>v==null?null:Math.max(1e-12,fitValue(v))),mode:'lines',name,line:{color,dash},
            customdata:data.x.map((v,i)=>q.symbol+' '+quantityValue(v,q)+' · '+p.symbol+' '+quantityValue(field==='fixed_q'?data.reference[1-col]:data.partner[i],p)+' · '+fitMetric().label+' '+fmt(fitValue(data[field][i]),5)),
            hovertemplate:'%{customdata}<extra></extra>'}));
        layout.showlegend=true;layout.legend={orientation:'h'};
        $('conditionalPlot').hidden=false;
        await Plotly.react($('conditionalPlot'),lines,layout,{...plotOptions,scrollZoom:false});
        $('conditionalInfo').textContent='Gestrichelt: '+p.symbol+' fest bei '+quantityValue(data.reference[1-col],p)+'. Durchgezogen: '+p.symbol+' für jeden Stützpunkt innerhalb der Suchgrenzen erneut optimiert. Abgebildet ist die jeweils kleinste gefundene Abweichung über alle Äste. Keine Konfidenzgrenze.'+(data.limited?' Rasterauflösung begrenzt.':'');
    }catch(e){if(ticket===profileTicket){profileKey=null;$('conditionalInfo').textContent=e.message;}}
    finally{if(ticket===profileTicket)$('calculateProfile').disabled=false;}
}
function bindWorkbench() {
    $('profileColumn').onchange=invalidateProfile;
    $('calculateProfile').onclick=calculateProfile;
    $('prepareTab').onclick=()=>changeArea('prepare');
    $('evaluateTab').onclick=()=>changeArea('evaluate');
    $('recipeList').onchange=loadRecipe;
    $('saveRecipe').onclick=storeRecipe;
    $('pinFit').onclick=()=>{
        if(pinnedFit&&!confirm('Den gemerkten Vergleichsfit ersetzen?'))return;
        pinnedFit=resultSnapshot();renderFitComparison();$('compareFits').open=true;
    };
    $('forgetFit').onclick=()=>{pinnedFit=null;renderFitComparison();};
    $('printFit').onclick=printReport;
    for(const button of document.querySelectorAll('.chart-switch button'))button.onclick=()=>{
        const bench=button.closest('.result-workbench');
        bench.dataset.chart=button.dataset.chart;
        for(const choice of bench.querySelectorAll('.chart-switch button'))choice.setAttribute('aria-pressed',String(choice===button));
        requestAnimationFrame(resizeWorkPlots);
    };
    for(const button of document.querySelectorAll('[data-expand]'))button.onclick=()=>{
        const bench=button.closest('.result-workbench'),id=button.dataset.expand;
        if(bench.dataset.expanded===id)delete bench.dataset.expanded;else bench.dataset.expanded=id;
        for(const other of bench.querySelectorAll('[data-expand]')){
            const selected=bench.dataset.expanded===other.dataset.expand;
            other.setAttribute('aria-pressed',String(selected));other.textContent=selected?'Verkleinern':'Vergrößern';
        }
        requestAnimationFrame(resizeWorkPlots);
    };
    $('splitComparison').onchange=()=>{if(state.result)comparisonPlot();};
    $('showLines').onchange=()=>{refreshLines();errorPlot();};
    $('lineGroup').onchange=()=>refreshLines();
    for(const id of ['analysisDetails','opticsPanel'])$(id).addEventListener('toggle',()=>{refreshOptics();if($(id).open)resizeWorkPlots();});
    $('sensitivityLayer').onchange=refreshOptics;
    $('layerEditor').addEventListener('change',()=>updateLayerSummaries());
}
