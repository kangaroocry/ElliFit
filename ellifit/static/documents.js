'use strict';

// The save point belongs to the current file, not to the undo history.
const documentInputs={model:new Set(),material:new Set()};
const documentWrites=new Set();
let fileDialogContext=null,unsavedDialogContext=null;
const fileLabels={model:'Schichtmodell',material:'Material'};

function documentFingerprint(value){
 return JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
}
function inputDocument(input){
 if(!(input instanceof Element))return null;
 if(input.matches('#modelName,#modelNotes,#wavelength,#convention,#layerEditor input[data-path]'))return 'model';
 if(input.matches('#materialName,#materialNotes,#materialN,#materialK,#materialWavelength,#materialUncertaintyN,#materialUncertaintyK'))return 'material';
 return null;
}
function pendingDocument(kind){
 for(const input of documentInputs[kind])if(!input.isConnected)documentInputs[kind].delete(input);
 return documentInputs[kind].size>0;
}
function documentEdited(kind){
 return !!state[kind]&&(pendingDocument(kind)||state[kind+'Baseline']!=null&&documentFingerprint(state[kind])!==state[kind+'Baseline']);
}
function documentFile(kind){return state[kind+'File'];}
function renderFileState(kind='model'){
 const box=$(kind+'FileState');if(!box||!state[kind])return;
 const file=documentFile(kind),edited=documentEdited(kind),writing=documentWrites.has(kind),status=writing?'Wird gespeichert …':edited?'Geändert · nicht gespeichert':file?'Gespeichert':'Noch nicht gespeichert';
 const filename=file||state[kind+'Origin']||('Neues '+(kind==='model'?'Schichtmodell':'Material'));
 box.dataset.state=writing?'saving':edited?'modified':file?'saved':'new';
 box.innerHTML=`<span class="file-caption" title="${esc(filename)}">${esc(filename)}</span><span class="file-badge">${writing?'':edited?'● ':file?'✓ ':''}${status}</span>`;
 const folder=$(kind==='model'?'modelFolder':'materialFolder')?.value;
 box.title=file&&folder?folder+' / '+file:filename;
 const save=$(kind==='model'?'saveModel':'saveMaterial');if(save)save.disabled=state.busy||writing||!!file&&!edited;
 const saveAs=$(kind==='model'?'saveModelAs':'saveMaterialAs');if(saveAs)saveAs.disabled=state.busy||writing;
 const folderButton=$(kind==='model'?'changeFolder':'changeMaterialFolder');if(folderButton)folderButton.disabled=state.busy||writing;
 if(kind==='model')document.title=(edited?'● ':'')+'ElliFit '+UI_VERSION+(file?' · '+file:'');
}
function beginModelDocument(model,file=null,origin=''){
 state.model=clone(model);state.modelFile=file;state.modelOrigin=origin;state.modelBaseline=documentFingerprint(state.model);
 documentInputs.model.clear();state.history=[];state.future=[];renderModel();stale();
}
function materialDocumentLoaded(){
 state.materialBaseline=documentFingerprint(state.material);documentInputs.material.clear();renderFileState('material');
}
function flushDocument(kind){
 for(const input of [...documentInputs[kind]])if(input.isConnected)input.dispatchEvent(new Event('change',{bubbles:true}));
 if(pendingDocument(kind)){toast('Bitte die ungültige Eingabe vor dem Speichern korrigieren.','warning');return false;}
 return true;
}
function suggestedFilename(kind){
 const current=documentFile(kind);if(current)return current;
 const imported=state[kind+'Origin'];if(imported&&imported.toLowerCase().endsWith('.json')&&!imported.includes(':'))return imported.replace(/\.json$/i,'.json');
 const stem=(state[kind]?.name||fileLabels[kind]).replace(/[^\p{L}\p{N}_-]+/gu,'_').replace(/^_+|_+$/g,'').slice(0,120)||fileLabels[kind];
 return stem+'.json';
}
function normalizedFilename(value){
 let name=value.trim();if(!name)return null;
 if(!/\.json$/i.test(name))name+='.json';else name=name.replace(/\.json$/i,'.json');
 if(name.length>180||name.startsWith('.')||/[<>:"/\\|?*\x00-\x1f]/.test(name)||/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(name))return null;
 return name;
}
async function writeDocument(kind,filename,overwrite=false){
 if(documentWrites.has(kind))return false;
 documentWrites.add(kind);renderFileState(kind);
 try{
 const payload=clone(state[kind]),url=kind==='model'?'/api/models':'/api/materials';
 let result;
 try{result=await api(url,{method:'POST',body:{[kind]:payload,filename,overwrite}});}
 catch(e){
  if(e.status!==409)throw e;
  const target=e.detail.filename;
  if(!confirm(`Die Datei „${target}“ existiert bereits.\n\nMit diesem ${fileLabels[kind]} überschreiben?`))return false;
  result=await api(url,{method:'POST',body:{[kind]:payload,filename:target,overwrite:true}});
 }
 state[kind+'File']=result.filename;state[kind+'Origin']='';state[kind+'Baseline']=documentFingerprint(payload);
 let refreshError=null;
 try{await (kind==='model'?refreshModels():refreshMaterials());}
 catch(e){refreshError=e;}
 renderFileState(kind);toast(refreshError?'Datei gespeichert; die Bibliotheksliste konnte nicht aktualisiert werden: '+refreshError.message:fileLabels[kind]+' gespeichert: '+result.filename,refreshError?'warning':'success');
 if(kind==='material')$('materialMessage').textContent='Gespeichert: '+result.filename;
 return true;
 }finally{documentWrites.delete(kind);renderFileState(kind);}
}
async function saveDocument(kind='model',saveAs=false){
 if(state.busy||documentWrites.has(kind)||!state[kind]||!flushDocument(kind))return false;
 if(saveAs||!documentFile(kind))return saveFilenameQuestion(kind);
 if(!documentEdited(kind))return true;
 const filename=documentFile(kind);
 if(!confirm(`„${filename}“ mit den aktuellen Änderungen überschreiben?`))return false;
 try{return await writeDocument(kind,filename,true);}
 catch(e){toast('Speichern fehlgeschlagen: '+e.message,'critical');renderFileState(kind);return false;}
}
function saveFilenameQuestion(kind){
 if(fileDialogContext)return Promise.resolve(false);
 const dialog=$('saveFileDialog');$('saveFileTitle').textContent=fileLabels[kind]+' speichern unter …';
 $('saveFileFolder').textContent=$(kind==='model'?'modelFolder':'materialFolder').value;
 $('saveFileName').value=suggestedFilename(kind);$('saveFileError').hidden=true;$('saveFileSubmit').disabled=false;
 return new Promise(resolve=>{
  fileDialogContext={kind,resolve,busy:false};dialog.showModal();
  const input=$('saveFileName');input.focus();const end=input.value.lastIndexOf('.json');input.setSelectionRange(0,end<0?input.value.length:end);
 });
}
function finishFilenameQuestion(saved){
 const context=fileDialogContext;if(!context||context.busy)return;
 fileDialogContext=null;$('saveFileDialog').close();context.resolve(saved);
}
async function submitFilenameQuestion(event){
 event.preventDefault();const context=fileDialogContext;if(!context||context.busy)return;
 const filename=normalizedFilename($('saveFileName').value),error=$('saveFileError');
 if(!filename){error.textContent='Bitte einen gültigen Dateinamen ohne Pfad oder Sonderzeichen wie /, \\, : oder ? eingeben.';error.hidden=false;return;}
 context.busy=true;$('saveFileSubmit').disabled=true;$('cancelSaveFile').disabled=true;error.hidden=true;
 let saved=false;
 try{saved=await writeDocument(context.kind,filename);if(!saved){error.textContent='Nicht überschrieben. Einen anderen Dateinamen wählen oder abbrechen.';error.hidden=false;}}
 catch(e){error.textContent='Speichern fehlgeschlagen: '+e.message;error.hidden=false;}
 finally{context.busy=false;$('saveFileSubmit').disabled=false;$('cancelSaveFile').disabled=false;}
 if(saved)finishFilenameQuestion(true);
}
async function confirmDocumentChange(kind,action='ein anderes Dokument geöffnet wird'){
 if(documentWrites.has(kind)){toast('Die Datei wird gerade gespeichert. Bitte kurz warten.','info');return false;}
 if(!documentEdited(kind))return true;
 const dialog=$('unsavedDialog');if(dialog.open||unsavedDialogContext)return false;
 const name=documentFile(kind)||state[kind]?.name||fileLabels[kind];
 $('unsavedTitle').textContent='Ungespeicherte Änderungen';
 $('unsavedText').textContent=`Änderungen an „${name}“ speichern, bevor ${action}?`;
 const choice=await new Promise(resolve=>{unsavedDialogContext={resolve};dialog.showModal();$('keepDocument').focus();});
 if(choice==='discard')return true;
 if(choice==='save')return await saveDocument(kind);
 return false;
}
function finishUnsavedQuestion(choice){
 const context=unsavedDialogContext;if(!context)return;
 unsavedDialogContext=null;$('unsavedDialog').close(choice);context.resolve(choice);
}
async function chooseLibraryModel(file){
 $('modelList').value=state.modelFile||'';if(!file)return;
 try{const model=await api('/api/models/'+encodeURIComponent(file));if(!await confirmDocumentChange('model','das andere Schichtmodell geöffnet wird'))return;beginModelDocument(model,file);toast('Schichtmodell geladen.','success');}
 catch(e){toast(e.message,'critical');}
}
async function chooseLibraryMaterial(file){
 $('materialList').value=state.materialFile||'';if(!file)return;
 try{const material=await api('/api/materials/'+encodeURIComponent(file));if(!await confirmDocumentChange('material','das andere Material geöffnet wird'))return;setMaterial(material,file);}
 catch(e){toast(e.message,'critical');}
}
function bindDocuments(){
 state.modelBaseline=documentFingerprint(state.model);
 document.addEventListener('input',e=>{const kind=inputDocument(e.target);if(kind){documentInputs[kind].add(e.target);renderFileState(kind);}});
 document.addEventListener('change',e=>{
  const input=e.target,kind=inputDocument(input);if(!kind)return;
  const optional=['materialWavelength','materialUncertaintyN','materialUncertaintyK'].includes(input.id);
  if(!input.dataset.num||Number.isFinite(parseNumber(input.value,optional))||optional&&parseNumber(input.value,true)===null)documentInputs[kind].delete(input);
  renderFileState(kind);
 });
 $('saveModel').onclick=()=>saveDocument('model');$('saveModelAs').onclick=()=>saveDocument('model',true);
 $('saveMaterial').onclick=()=>saveDocument('material');$('saveMaterialAs').onclick=()=>saveDocument('material',true);
 $('modelList').onchange=()=>chooseLibraryModel($('modelList').value);
 $('materialList').onchange=()=>chooseLibraryMaterial($('materialList').value);
 $('saveFileForm').onsubmit=submitFilenameQuestion;$('cancelSaveFile').onclick=()=>finishFilenameQuestion(false);
 $('saveFileDialog').addEventListener('cancel',e=>{e.preventDefault();finishFilenameQuestion(false);});
 $('unsavedDialog').querySelector('form').onsubmit=e=>{e.preventDefault();finishUnsavedQuestion(e.submitter?.value||'cancel');};
 $('unsavedDialog').addEventListener('cancel',e=>{e.preventDefault();finishUnsavedQuestion('cancel');});
 window.addEventListener('beforeunload',e=>{if(documentEdited('model')||documentEdited('material')||documentWrites.size){e.preventDefault();e.returnValue='';}});
 document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){
   e.preventDefault();if($('saveFileDialog').open||$('unsavedDialog').open)return;
   saveDocument($('materialDialog').open?'material':'model',e.shiftKey);
  }
 });
 renderFileState('model');
}
