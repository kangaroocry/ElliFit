'use strict';
const FIT_COLORS=[[0,'#1d5d67'],[.3,'#619ba3'],[.65,'#b7d1d5'],[1,'#eef3f4']];
function fitMetric(){return state.result?.fit_objective||{label:'Winkel-RMS',unit:'degree',normalization:2*(state.result?.counts.selected||1),differs_from_angular_rms:false};}
function fitValue(q){return q==null||!Number.isFinite(q)?null:Math.sqrt(Math.max(0,q)/fitMetric().normalization);}
function metricUnit(){return fitMetric().unit==='degree'?'°':'dimensionslos';}
function fitAxisLabel(){return fitMetric().label+(fitMetric().unit==='degree'?' (°)':' (dimensionslos)');}
function useFitObjective(){return !!state.result&&fitMetric().differs_from_angular_rms&&$('errorQuantity').value!=='rms';}
function metricHover(q,rms){return `${esc(fitMetric().label)} ${fmt(fitValue(q),5)}${fitMetric().unit==='degree'?'°':' (dimensionslos)'}<br>Ungewichteter Winkel-RMS ${angleValue(rms)}°`;}
let rmsAvailabilityResult=null, rmsAvailable=true;
function renderObjectiveContext(){
 const r=state.result,meta=fitMetric(),distinct=!!r&&meta.differs_from_angular_rms,quantity=$('errorQuantity');
 if(r!==rmsAvailabilityResult){
  rmsAvailabilityResult=r;
  rmsAvailable=!r||r.surface.rms.some(item=>Array.isArray(item)?item.some(Number.isFinite):Number.isFinite(item));
 }
 quantity.options[1].disabled=!rmsAvailable;
 quantity.options[1].textContent=rmsAvailable?'Ungewichteter Winkel-RMS (°)':'Winkel-RMS unbestimmt';
 if(!rmsAvailable){quantity.value='fit';state.view.errorQuantity='fit';}
 const fit=quantity.value!=='rms';
 $('errorQuantity').closest('.objective-controls').hidden=!distinct;$('objectiveNotice').hidden=!distinct;
 if(distinct){
  $('errorQuantity').options[0].textContent=meta.label+' (tatsächlich minimiert)';
  $('objectiveNotice').dataset.kind=fit?'info':'warning';
  $('objectiveNotice').textContent=fit?`${meta.note} Kurve/Fläche und Minima zeigen dieselbe Fit-Abweichung. Punkt- und Listenfarben bleiben beim ungewichteten Winkel-RMS.`:`Kontrollansicht: Hier wird der ungewichtete Winkel-RMS gezeigt. Minimiert wurde ${meta.label}; die markierten Fits müssen deshalb nicht in den Minima dieser RMS-Kurve liegen. ${meta.note}${meta.kind==='weighted'?' Für einen Fit nach Winkel-RMS: Suchoptionen → Messunsicherheiten → Ungewichtet fitten.':''}`;
 }
 $('statFitObjective').hidden=!distinct;
 if(distinct)$('statFitObjective').textContent=meta.label+': '+fmt(fitValue(r.solutions[0].q),4)+(meta.unit==='degree'?'°':' (dimensionslos)');
 $('rmsLegend').setAttribute('aria-label','Punkt- und Listenfarben: ungewichteter Winkel-RMS');
 $('rmsLegend').dataset.caption=distinct?(fit?'Punkt-/Listenfarben: ungewichteter Winkel-RMS (°)':'Flächen-/Punkt-/Listenfarben: Winkel-RMS (°)'):'';
}
function metricMarkers(){return allMarkers();}
function keepParameterView(layout,scene=false){
 const el=$('errorPlot');if(!el._elliViewKey?.startsWith(state.resultJob+'|')||!el._fullLayout)return;
 const source=el._elliPlotOptions?.scene?el._fullLayout.scene:el._fullLayout,target=scene?layout.scene:layout;
 for(const key of scene||state.result.parameters.length===2?['xaxis','yaxis']:['xaxis'])if(source[key]?.range&&target[key]&&source[key].type===target[key].type&&el._elliPlotOptions?.axes[key]?.logarithmic===(key==='xaxis'?state.view.logX:state.view.logY)){target[key].range=[...source[key].range];target[key].autorange=false;}
 if(scene&&el._elliPlotOptions?.scene&&source.camera)target.camera=clone(source.camera);
}
function objectiveLimits(){
 const r=state.result,values=r.surface.q.flat(Infinity).map(fitValue).concat(r.solutions.map(s=>fitValue(s.q))).filter(v=>v!=null&&v<1e45);
 const min=values.reduce((a,v)=>Math.min(a,v),Infinity),max=values.reduce((a,v)=>Math.max(a,v),0);let lo=Math.log10(Math.max(1e-12,min)),hi=Math.log10(Math.max(1e-11,max));if(hi-lo<.1)hi=lo+1;
 return {lo,hi};
}
function objectiveColorbar(limits){const values=ticksLinear(limits.lo,limits.hi);return {title:{text:'Fit-Abw.'},thickness:12,len:.85,tickvals:values,ticktext:values.map(v=>fmt(10**v,3))};}
const fitHeight=q=>{const v=fitValue(q);return v==null?null:Math.max(v,1e-12);};
const fitLog=q=>{const value=fitValue(q);return value==null?null:Math.log10(Math.max(value,1e-12));};
function objectiveClickHandler(el){
 if(el._elliClick)return;
 el.on('plotly_click',e=>{if(selectNearbyMinimum(el,e))return;const point=e.points[0];if(point.data?.meta?.kind==='trial')selectTrial(point.customdata[0]);else if(point.curveNumber===1&&Array.isArray(point.customdata))selectSolution(point.customdata[0],point.customdata[1]);});el._elliClick=true;
}
function metricTrialTrace(ax,ay,surface=false,profile=false){
 if(!state.trials.length)return [];
 const col=profile?state.result.identifiability.profile.fixed_index:0;
 return [{type:surface?'scatter3d':'scatter',x:state.trials.map(t=>ax.map(t.values[col])),y:state.trials.map(t=>profile?Math.max(fitValue(t.q),1e-12):ay?ay.map(t.values[1]):state.view.logY?Math.max(fitValue(t.q),1e-12):fitValue(t.q)),...(surface?{z:state.trials.map(t=>Math.max(fitValue(t.q),1e-12))}:{}),mode:surface?'markers+text':'markers',text:state.trials.map(t=>'T'+t.id),marker:{symbol:'diamond',size:surface?5:9,color:'#295b9b',line:{color:'#fff',width:1.5}},customdata:state.trials.map(t=>[t.id,parameterHover(t.values)+'<br>'+metricHover(t.q,t.rmse_deg)]),meta:{kind:'trial'},hovertemplate:'%{customdata[1]}<extra>Probelösung</extra>'}];
}
async function objectiveErrorPlot(ensureSelected=false){
 const r=state.result,s=displaySurface(),two=r.parameters.length===2,surface=two&&$('surfaceView').value==='surface',l=baseLayout(),markers=metricMarkers(),ax=surfaceAxis(0),limits=objectiveLimits();
 $('surfaceView').hidden=!two;if($('errorPlot').querySelector('.placeholder'))$('errorPlot').replaceChildren();
 const hover=markers.map(m=>[m.family,m.alias,`Familie ${m.rank} · ${parameterHover(m.values)}<br>${metricHover(m.q,m.rms)}`]),colors=markers.map(m=>rmsColor(m.rms)),display=q=>{const v=fitValue(q);return v==null?null:state.view.logY?Math.max(v,1e-12):v;};
 let traces,ay;
 if(!two){
  const y=s.q.map(display),ym=markers.map(m=>display(m.q));ay=axisSpec(y,fitAxisLabel(),state.view.logY);l.xaxis=ax.axis;l.yaxis=ay.axis;
  const finite=[...y,...ym,...state.trials.map(t=>display(t.q))].filter(v=>v!=null&&Number.isFinite(v)),lo=Math.min(...finite),hi=Math.max(...finite);
  if(state.view.logY){const a=Math.log10(Math.max(lo,1e-12)),b=Math.log10(Math.max(hi,1e-11)),span=Math.max(1,b-a);l.yaxis.range=[a-.1*span,b+.1*span];}else l.yaxis.range=[0,Math.max(hi*1.1,.001)];
  l.shapes=[];
  traces=[{x:ax.values,y,mode:'lines',line:{color:'#245e69',width:2},customdata:s.q.map((q,i)=>parameterHover([s.axes[0][i]])+'<br>'+metricHover(q,s.rms[i])),hovertemplate:'%{customdata}<extra>Minimierte Fit-Abweichung</extra>'},
   {x:markers.map(m=>ax.map(m.values[0])),y:ym,mode:'markers',marker:{color:colors,size:markers.map(m=>!state.activeTrial&&m.family===state.active&&m.alias===state.activeAlias?12:9),line:{color:'#fff',width:2}},customdata:hover,hovertemplate:'%{customdata[2]}<extra>Fitminimum</extra>'}];
 }else{
  ay=surfaceAxis(1);
  const field={colorscale:FIT_COLORS,zmin:limits.lo,zmax:limits.hi,autocontour:false,contours:{start:limits.lo,end:limits.hi,size:(limits.hi-limits.lo)/60,coloring:'heatmap',showlines:true},line:{width:.3,color:'#ffffff65'}};
  if(surface){
   l.margin={l:0,r:0,t:0,b:0};l.scene={xaxis:ax.axis,yaxis:ay.axis,zaxis:{type:'log',title:{text:fitAxisLabel()}},camera:{eye:{x:1.7,y:1.5,z:1.2}}};
   const triangles=s.mesh.fit_triangles||s.mesh.triangles;
   traces=[{type:'mesh3d',x:s.mesh.values.map(v=>ax.map(v[0])),y:s.mesh.values.map(v=>ay.map(v[1])),z:s.mesh.q.map(fitHeight),i:triangles.map(t=>t[0]),j:triangles.map(t=>t[1]),k:triangles.map(t=>t[2]),intensity:s.mesh.q.map(fitLog),colorscale:FIT_COLORS,cmin:limits.lo,cmax:limits.hi,colorbar:objectiveColorbar(limits),lighting:{ambient:1,diffuse:0,specular:0},customdata:s.mesh.values.map((v,i)=>parameterHover(v)+'<br>'+metricHover(s.mesh.q[i],s.mesh.rms[i])),hovertemplate:'%{customdata}<extra>Fit-Abweichung</extra>'},
    {type:'scatter3d',x:markers.map(m=>ax.map(m.values[0])),y:markers.map(m=>ay.map(m.values[1])),z:markers.map(m=>Math.max(fitValue(m.q),1e-12)),mode:'markers+text',text:markers.map(m=>String(m.rank)),marker:{color:colors,size:5,line:{color:'#fff',width:1}},customdata:hover,hovertemplate:'%{customdata[2]}<extra>Fitminimum</extra>'}];
  }else{
   l.margin.r=90;l.xaxis=ax.axis;l.yaxis=ay.axis;
   traces=[{type:'contour',x:ax.values,y:ay.values,z:s.q.map(row=>row.map(fitLog)),...field,colorbar:objectiveColorbar(limits),customdata:s.q.map((row,j)=>row.map((q,i)=>parameterHover([s.axes[0][i],s.axes[1][j]])+'<br>'+metricHover(q,s.rms[j][i]))),hovertemplate:'%{customdata}<extra>Fit-Abweichung</extra>'},
    {type:'scatter',x:markers.map(m=>ax.map(m.values[0])),y:markers.map(m=>ay.map(m.values[1])),mode:'markers',marker:{color:colors,size:markers.map(m=>!state.activeTrial&&m.family===state.active&&m.alias===state.activeAlias?13:9),line:{color:'#fff',width:2}},customdata:hover,hovertemplate:'%{customdata[2]}<extra>Fitminimum</extra>',zorder:8}];
   const detail=state.refinedSurface;if(detail&&detail.job===state.resultJob)traces.push({type:'contour',x:detail.axes[0].map(ax.map),y:detail.axes[1].map(ay.map),z:detail.q.map(row=>row.map(fitLog)),...field,showscale:false,zorder:1,customdata:detail.q.map((row,j)=>row.map((q,i)=>parameterHover([detail.axes[0][i],detail.axes[1][j]])+'<br>'+metricHover(q,detail.rms[j][i]))),hovertemplate:'%{customdata}<extra>Nachgerechnete Fit-Abweichung</extra>'});
  }
  if(r.identifiability?.profile&&$('showValley').checked){const points=selectedProfileBranch()?.points||[];traces.push({type:surface?'scatter3d':'scatter',x:points.map(p=>ax.map(p.values[0])),y:points.map(p=>ay.map(p.values[1])),...(surface?{z:points.map(p=>Math.max(fitValue(p.q),1e-12))}:{}),mode:'markers',marker:{size:surface?2.5:4,color:points.map(p=>rmsColor(p.rmse_deg)),line:{color:'#46666c',width:.6}},customdata:points.map(p=>parameterHover(p.values)+'<br>'+metricHover(p.q,p.rmse_deg)),hovertemplate:'%{customdata}<extra>Talpunkt</extra>',...(!surface?{zorder:5}:{})});}
  // Optional confidence curves carry raw-RMS heights; do not mix them into a
  // fit-objective z axis. Their 2D parameter boundaries remain meaningful.
  if(!surface){traces.push(...regionTraces(ax,ay,false));plotMeasurementLines(traces,ax,ay);}
 }
 traces.push(...metricTrialTrace(ax,two?ay:null,surface));keepParameterView(l,surface);
 const chosen=activeTrial()||selectedMember(),value=fitValue(chosen.q),selected=ensureSelected===true?{xaxis:ax.map(chosen.values[0]),yaxis:two?ay.map(chosen.values[1]):state.view.logY?Math.max(value,1e-12):value,...(surface?{zaxis:Math.max(value,1e-12)}:{})}:{};
 const axes=surface?{xaxis:ax,yaxis:ay,zaxis:axisSpec([10**limits.lo,10**limits.hi],fitAxisLabel(),true)}:{xaxis:ax,yaxis:ay};
 const labels=surface?null:[...markers.map(m=>({x:ax.map(m.values[0]),y:two?ay.map(m.values[1]):display(m.q),label:String(m.rank),rank:m.rank,target:{family:m.family,alias:m.alias},active:!state.activeTrial&&m.family===state.active&&m.alias===state.activeAlias})),...state.trials.map(t=>({x:ax.map(t.values[0]),y:two?ay.map(t.values[1]):display(t.q),label:'T'+t.id,rank:10000+t.id,target:{trial:t.id},active:state.activeTrial===t.id}))];
 $('errorCaption').textContent=`Dargestellt und minimiert: ${fitMetric().label}, sqrt(Q / ${int(fitMetric().normalization)}), ${metricUnit()}. Kleinere Werte sind besser. ${two?'Neutrale Flächenfarben zeigen diese Fit-Abweichung; sie haben keine feste Winkel-RMS-Güteskala. ':''}Punkt- und Tabellenfarben zeigen weiterhin den ungewichteten Winkel-RMS. Keine Modellbestätigung allein durch einen kleinen Fehlerwert.${surface&&$('showRegions').checked?' Optionale Konfidenzgrenzen werden in dieser Ansicht nur in der 2D-Kontur dargestellt.':''}`;
 await renderWorkspacePlot('errorPlot',traces,l,{mode:surface?'fit-surface':two?'fit-contour':'fit-curve',scene:surface,axes,selected,labels});objectiveClickHandler($('errorPlot'));
}
function objectiveProfilePlot(){
 const r=state.result,profile=r.identifiability.profile,points=selectedProfileBranch()?.points||[],col=profile.fixed_index,ax=axisSpec(points.map(p=>p.values[col]),r.parameters[col].label,col?state.view.logY:state.view.logX,r.surface.zero_floors[col]),l=baseLayout(),numerical=q=>Math.max(fitValue(q),1e-12);
 l.xaxis=ax.axis;l.yaxis={...l.yaxis,type:'log',title:{text:fitAxisLabel()}};
 const minima=points.filter(p=>p.minimum_family!=null),hover=p=>parameterHover(p.values)+'<br>'+metricHover(p.q,p.rmse_deg);
 const traces=[{x:ax.values,y:points.map(p=>numerical(p.q)),mode:'lines+markers',line:{color:'#245e69',width:1.5},marker:{size:3,color:'#759ca4'},customdata:points.map(hover),hovertemplate:'%{customdata}<extra>Minimiertes Talprofil</extra>'},
  {x:minima.map(p=>ax.map(p.values[col])),y:minima.map(p=>numerical(p.q)),mode:'markers',text:minima.map(p=>String(p.minimum_family)),marker:{size:10,color:minima.map(p=>rmsColor(p.rmse_deg)),line:{color:'#284d57',width:1}},customdata:minima.map(p=>[p.minimum_family-1,p.minimum_alias,hover(p)]),hovertemplate:'%{customdata[2]}<extra>Bestätigtes Fitminimum</extra>'},...metricTrialTrace(ax,null,false,true)];
 $('profileCaption').textContent=`Talprofil der tatsächlich minimierten Größe: ${fitMetric().label}. Gewichtung, Kurve und nummerierte Minima stimmen überein. Der Winkel-RMS in Hovers und Punktfarben ist eine getrennte absolute Winkelabweichung. ${profile.note}`;
 return renderWorkspacePlot('profilePlot',traces,l,{mode:'fit-profile',axes:{xaxis:ax,yaxis:axisSpec([1e-12,100],fitAxisLabel(),true)},labels:minima.map(p=>({x:ax.map(p.values[col]),y:numerical(p.q),label:String(p.minimum_family),rank:p.minimum_family,target:{family:p.minimum_family-1,alias:p.minimum_alias},active:!state.activeTrial&&p.minimum_family-1===state.active&&p.minimum_alias===state.activeAlias}))}).then(()=>{const el=$('profilePlot');if(!el._elliProfileClick){el.on('plotly_click',e=>{if(selectNearbyMinimum(el,e))return;const p=e.points[0];if(p.data?.meta?.kind==='trial')selectTrial(p.customdata[0]);else if(p.curveNumber===1)selectSolution(p.customdata[0],p.customdata[1]);});el._elliProfileClick=true;}});
}
function bindObjective(){
 $('errorQuantity').onchange=()=>{state.view.errorQuantity=$('errorQuantity').value;renderObjectiveContext();errorPlot();if(state.result?.identifiability?.profile)profilePlot();};
}
