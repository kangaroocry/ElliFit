from __future__ import annotations

import json
import hashlib
import os
import re
import threading
import tempfile
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
import plotly
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Literal

from . import __version__
from .core import Cancelled, FitRequest, Model, Observations, Row, comparison, parse_data, simulate, solve
from .core import Medium, Objective, Parameter, Validated, finite_number, parameter_label, put
from .measurement_plan import family_values
from .statistics import RepeatAnalysis, parameter_uncertainty

ROOT = Path(__file__).resolve().parents[1]
STATIC = Path(__file__).parent / 'static'
MODEL_DIR = Path(os.environ.get('ELLIFIT_MODELS', ROOT / 'models')).expanduser().resolve()
MATERIAL_DIR = Path(os.environ.get('ELLIFIT_MATERIALS', ROOT / 'materials')).expanduser().resolve()
RECIPE_DIR = Path(os.environ.get('ELLIFIT_RECIPES', ROOT / 'recipes')).expanduser().resolve()
POOL = ThreadPoolExecutor(max_workers=1)
JOBS = {}
LOCK = threading.Lock()
app = FastAPI(title='ElliFit', version=__version__)


@app.middleware('http')
async def same_origin(request: Request, next_handler):
    origin = request.headers.get('origin')
    if request.method not in ('GET', 'HEAD', 'OPTIONS') and origin and origin.rstrip('/') != str(request.base_url).rstrip('/'):
        return JSONResponse({'detail': 'Nur Aufrufe aus der lokalen Oberfläche sind erlaubt.'}, status_code=403)
    response = await next_handler(request)
    response.headers['X-Content-Type-Options'] = 'nosniff'
    # A browser may otherwise reuse an earlier JavaScript/CSS bundle after an
    # in-place update, even when it has already loaded the new HTML page.
    response.headers['Cache-Control'] = 'no-store'
    response.headers['X-ElliFit-Version'] = __version__
    return response


@app.exception_handler(ValueError)
async def bad_value(request, exc):
    return JSONResponse({'detail': str(exc)}, status_code=400)


@app.exception_handler(OSError)
async def bad_file(request, exc):
    return JSONResponse({'detail': f'Dateizugriff fehlgeschlagen: {exc}'}, status_code=400)


@app.get('/')
def home():
    html = (STATIC / 'index.html').read_text(encoding='utf-8')
    assets = ('app.js', 'documents.js', 'workspace.js', 'interactions.js', 'objective.js', 'measurements.js', 'workbench.js', 'style.css', 'workbench.css')
    bundle = hashlib.sha256(b''.join((STATIC / name).read_bytes() for name in assets)).hexdigest()[:16]
    for asset in ('/static/' + name for name in assets):
        html = html.replace('"' + asset + '"', '"' + asset + '?v=' + __version__ + '&amp;build=' + bundle + '"')
    html = html.replace('"/plotly.js"', '"/plotly.js?v=' + plotly.__version__ + '"')
    return HTMLResponse(html)


@app.get('/plotly.js')
def plotly_js():
    return FileResponse(Path(plotly.__file__).parent / 'package_data' / 'plotly.min.js', media_type='application/javascript')


@app.get('/api/info')
def info():
    return dict(version=__version__, model_dir=str(MODEL_DIR), material_dir=str(MATERIAL_DIR), default_model=Model().model_dump())


@app.post('/api/validate-model')
def validate_model(model: Model):
    return model


def validate_library_filename(name):
    """Use the same portable JSON names on Windows and Unix."""
    reserved = {'CON', 'PRN', 'AUX', 'NUL', *(f'COM{i}' for i in range(1, 10)), *(f'LPT{i}' for i in range(1, 10))}
    if (not name or len(name) > 180 or not name.endswith('.json')
            or name != name.strip() or re.search(r'[<>:"/\\|?*\x00-\x1f]', name)
            or name.startswith('.') or name.split('.')[0].rstrip(' .').upper() in reserved):
        raise ValueError('Ungültiger Dateiname: Bitte einen normalen Windows-Dateinamen mit .json ohne Pfadangabe verwenden.')


def model_path(name):
    validate_library_filename(name)
    p = MODEL_DIR / name
    if p.is_symlink() or p.resolve().parent != MODEL_DIR:
        raise ValueError('Ungültiger Modellpfad.')
    return p


class Recipe(Validated):
    name: str = Field(min_length=1, max_length=160)
    model: Model
    parameters: list[Parameter] = Field(min_length=1, max_length=2)
    settings: dict

    def validated_document(self):
        if set(self.settings) - (FitRequest.model_fields.keys() - {'measurements', 'model', 'parameters'}):
            raise ValueError('Ungültige Einstellungen in der Auswertevorlage.')
        probe = dict(id='validation', angle=70., delta=90., psi=45.)
        request = FitRequest(model=self.model, measurements=[probe], parameters=self.parameters, **self.settings)
        return dict(name=self.name, model=self.model.model_dump(), parameters=[p.model_dump() for p in self.parameters],
                    settings=request.model_dump(exclude={'model','measurements','parameters'}))


def recipe_path(filename):
    validate_library_filename(filename)
    path = RECIPE_DIR / filename
    if path.is_symlink() or path.resolve().parent != RECIPE_DIR:
        raise ValueError('Ungültiger Vorlagenpfad.')
    return path


@app.get('/api/recipes')
def list_recipes():
    items = []
    for path in sorted(RECIPE_DIR.glob('*.json')):
        try:
            document = Recipe.model_validate_json(recipe_path(path.name).read_text(encoding='utf-8'))
            items.append(dict(file=path.name, name=document.name))
        except (OSError, ValueError):
            continue
    return items


@app.get('/api/recipes/{filename}')
def read_recipe(filename: str):
    path = recipe_path(filename)
    if not path.is_file():
        raise HTTPException(404, 'Vorlage nicht gefunden.')
    return Recipe.model_validate_json(path.read_text(encoding='utf-8')).validated_document()


@app.put('/api/recipes/{filename}')
def save_recipe(filename: str, body: Recipe, overwrite: bool = False):
    path = recipe_path(filename)
    data = json.dumps(body.validated_document(), ensure_ascii=False, indent=2)
    RECIPE_DIR.mkdir(parents=True, exist_ok=True)
    with LOCK:
        if path.exists() and not overwrite:
            raise HTTPException(409, 'Diese Auswertevorlage existiert bereits.')
        with tempfile.NamedTemporaryFile(dir=RECIPE_DIR, delete=False) as tmp:
            temp_path = Path(tmp.name)
        try:
            temp_path.write_text(data, encoding='utf-8')
            temp_path.replace(path)
        finally:
            temp_path.unlink(missing_ok=True)
    return dict(filename=filename)


@app.get('/api/models')
def models():
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    entries, invalid = [], []
    for p in sorted(MODEL_DIR.glob('*.json')):
        try:
            m = Model.model_validate_json(p.read_text(encoding='utf-8'))
            entries.append(dict(file=p.name, name=m.name))
        except (ValueError, OSError):
            invalid.append(p.name)
    return dict(models=entries, invalid=invalid, model_dir=str(MODEL_DIR))


@app.get('/api/models/{filename}')
def load_model(filename: str):
    p = model_path(filename)
    if not p.exists():
        raise HTTPException(404, 'Modell nicht gefunden.')
    return Model.model_validate_json(p.read_text(encoding='utf-8'))


class SaveModel(BaseModel):
    model: Model
    filename: str | None = None
    overwrite: bool = False


@app.post('/api/models')
def save_model(body: SaveModel):
    name = body.filename or (re.sub(r'[^\w-]+', '_', body.model.name).strip('_')[:120] or 'Modell') + '.json'
    p = model_path(name)
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    if p.exists() and not body.overwrite:
        raise HTTPException(409, dict(filename=name, message='Diese Datei existiert bereits.'))
    temp = p.with_suffix('.json.tmp')
    temp.write_text(body.model.model_dump_json(indent=2), encoding='utf-8')
    temp.replace(p)
    return dict(filename=name)


class Folder(BaseModel):
    path: str


@app.post('/api/model-folder')
def change_folder(body: Folder):
    global MODEL_DIR
    path = Path(body.path).expanduser().resolve()
    path.mkdir(parents=True, exist_ok=True)
    if not path.is_dir():
        raise ValueError('Kein Modellordner.')
    MODEL_DIR = path
    return dict(model_dir=str(path))


class Material(Medium):
    schema_version: Literal[1] = 1
    name: str = Field(min_length=1,max_length=160)
    wavelength_nm: float | None = Field(default=None,gt=0,le=1e6)
    notes: str = Field(default='',max_length=10000)


class SaveMaterial(BaseModel):
    material: Material
    filename: str | None = None
    overwrite: bool = False


def material_path(name):
    validate_library_filename(name)
    p=MATERIAL_DIR/name
    if p.is_symlink() or p.resolve().parent!=MATERIAL_DIR:
        raise ValueError('Ungültiger Materialpfad.')
    return p


@app.get('/api/materials')
def materials():
    MATERIAL_DIR.mkdir(parents=True,exist_ok=True)
    entries,invalid=[],[]
    for p in sorted(MATERIAL_DIR.glob('*.json')):
        try:
            material=Material.model_validate_json(p.read_text(encoding='utf-8'))
            entries.append(dict(file=p.name,**material.model_dump()))
        except (OSError,ValueError): invalid.append(p.name)
    return dict(materials=entries,invalid=invalid,material_dir=str(MATERIAL_DIR))


@app.get('/api/materials/{filename}')
def load_material(filename:str):
    p=material_path(filename)
    if not p.exists():raise HTTPException(404,'Material nicht gefunden.')
    return Material.model_validate_json(p.read_text(encoding='utf-8'))


@app.post('/api/validate-material')
def validate_material(material:Material):return material


@app.post('/api/materials')
def save_material(body:SaveMaterial):
    filename=body.filename or (re.sub(r'[^\w-]+','_',body.material.name).strip('_')[:120] or 'Material')+'.json'
    p=material_path(filename);MATERIAL_DIR.mkdir(parents=True,exist_ok=True)
    if p.exists() and not body.overwrite:raise HTTPException(409,dict(filename=filename,message='Diese Materialdatei existiert bereits.'))
    temp=p.with_suffix('.json.tmp');temp.write_text(body.material.model_dump_json(indent=2),encoding='utf-8');temp.replace(p)
    return dict(filename=filename)


@app.post('/api/material-folder')
def change_material_folder(body:Folder):
    global MATERIAL_DIR
    path=Path(body.path).expanduser().resolve();path.mkdir(parents=True,exist_ok=True)
    if not path.is_dir():raise ValueError('Kein Materialordner.')
    MATERIAL_DIR=path
    return dict(material_dir=str(path))


class ObservationRequest(BaseModel):
    measurements: list[Row]
    angle_tolerance: float = .001
    duplicate_policy: str = 'repeat'


@app.post('/api/observations')
def observation_statistics(body:ObservationRequest):
    if not body.measurements:return dict(groups=[],complete=False,weighted=False,warnings=[])
    if not 0<body.angle_tolerance<=.1 or len(body.measurements)>200000:raise ValueError('Ungültige Messdaten oder Winkeltoleranz.')
    return RepeatAnalysis([r.model_dump() for r in body.measurements],body.duplicate_policy,body.angle_tolerance).public()


@app.post('/api/import')
async def upload(file: UploadFile = File(...), first_column: Literal['angle','time'] | None = None,
                 incidence: float | None = None, time_unit: Literal['s','ms','µs','min','h'] | None = None,
                 inspect_columns: bool = False):
    content = await file.read(32 * 1024 * 1024 + 1)
    if len(content) > 32 * 1024 * 1024:
        raise HTTPException(413, 'Datei größer als 32 MB.')
    return parse_data(content, Path(file.filename or 'Messdaten').name, first_column, incidence, time_unit, inspect_columns)


@app.get('/api/reference')
def reference():
    m = Model(name='Synthetische Referenz · Si + SiO2')
    m.layers[0].thickness_nm = 118
    angles = np.arange(60., 77, 2)
    d, p = simulate(m.model_dump(), angles)
    rows = [dict(id=uuid.uuid4().hex, angle=float(a), delta=float(di), psi=float(pi), source='Referenz: d=118 nm, n=1,46', comment='Synthetisch, ohne Rauschen', line=i + 1) for i, (a, di, pi) in enumerate(zip(angles, d[0], p[0]))]
    m.layers[0].thickness_nm = 80
    return dict(model=m.model_dump(), rows=rows)


def run_job(job, request):
    job['status'] = 'running'
    try:
        def progress(percent, message):
            job.update(progress=percent, message=message)
        result = solve(request, progress=progress, cancel=job['cancel'])
        job.update(status='completed', result=result, progress=100, message='Fit abgeschlossen')
    except Cancelled:
        job.update(status='cancelled', message='Suche abgebrochen')
    except Exception as exc:
        job.update(status='failed', message=str(exc) or type(exc).__name__)


@app.post('/api/fit')
def fit(body: FitRequest):
    obs = Observations([r.model_dump() for r in body.measurements], 'repeat', body.angle_tolerance)
    if obs.duplicates and body.duplicate_policy == 'ask':
        raise HTTPException(409, dict(type='duplicates', groups=obs.duplicates))
    with LOCK:
        if any(j['status'] in ('queued', 'running') for j in JOBS.values()):
            raise HTTPException(409, 'Es läuft bereits eine Suche.')
        while len(JOBS) >= 6:
            del JOBS[next(iter(JOBS))]
        key = uuid.uuid4().hex
        job = dict(status='queued', progress=0, message='Vorbereitung', cancel=threading.Event(), request=body.model_copy(deep=True))
        JOBS[key] = job
    POOL.submit(run_job, job, body.model_copy(deep=True))
    return dict(job_id=key)


def job_by_id(key):
    if key not in JOBS:
        raise HTTPException(404, 'Ergebnis nicht mehr im Sitzungsspeicher. Bitte neu fitten.')
    return JOBS[key]


@app.get('/api/jobs/{key}')
def status(key: str):
    job = job_by_id(key)
    return {k: job[k] for k in ('status', 'progress', 'message')}


@app.post('/api/jobs/{key}/cancel')
def cancel(key: str):
    job_by_id(key)['cancel'].set()
    return dict(status='cancelling')


@app.get('/api/jobs/{key}/result')
def result(key: str):
    job = job_by_id(key)
    if job['status'] != 'completed':
        raise HTTPException(409, 'Kein abgeschlossenes Ergebnis.')
    return job['result']


@app.get('/api/jobs/{key}/comparison/{index}')
def other_solution(key: str, index: int, alias: int | None = None):
    job = job_by_id(key)
    if job['status'] != 'completed' or not 0 <= index < len(job['result']['solutions']):
        raise HTTPException(404, 'Lösung nicht vorhanden.')
    solution=job['result']['solutions'][index]
    if alias is None:alias=solution['representative_alias']
    if not 0<=alias<solution['alias_count']:raise HTTPException(404,'Periodische Wiederholung nicht vorhanden.')
    values=family_values(job['request'].parameters,solution,alias)
    result=comparison(job['request'],values)
    if alias==solution['representative_alias']:
        result['uncertainty']=solution['uncertainty']
    else:
        if 'objective' not in job:job['objective']=Objective(job['request'])
        result['uncertainty']=parameter_uncertainty(job['objective'],values)
    if alias >= len(solution['aliases']):
        obj = job['objective']
        delta, psi = obj.prediction(obj.encode(values))
        result['selected_member'] = dict(index=alias, values=values, q=float(obj.analysis.sse(delta,psi)[0]),
                                         rmse_deg=finite_number(obj.analysis.raw_rms(delta,psi)[0]))
    result['selected_alias']=alias
    return result


class GroupFitInput(BaseModel):
    row_id: str = Field(min_length=1, max_length=200)
    group_by: Literal['context','source'] = 'context'


@app.post('/api/jobs/{key}/group-fit')
def group_fit(key: str, body: GroupFitInput):
    job = job_by_id(key)
    if job['status'] != 'completed':
        raise HTTPException(409, 'Zuerst eine globale Suche abschließen.')
    request = job['request']
    cache = job.setdefault('group_index', {})
    if body.group_by not in cache:
        by_id, groups = {}, {}
        for row in request.measurements:
            signature = row.source if body.group_by=='source' else (
                row.site,row.azimuth_deg,row.time_s,row.source if row.time_s is not None else None)
            group = groups.setdefault(signature, [])
            group.append(row)
            by_id[row.id] = (row,group)
        cache[body.group_by] = by_id
    member, members = cache[body.group_by].get(body.row_id, (None,None))
    if member is None:
        raise HTTPException(404, 'Diese Messung gehört nicht zum angezeigten Fit.')
    if len(members) == len(request.measurements):
        raise ValueError('Für den Gruppenvergleich mindestens zwei Messgruppen kennzeichnen.')
    options = dict(measurements=members, bootstrap_samples=0)
    if body.group_by == 'context':
        options.update(uncertainty_mode='none', use_uncertainties=False, duplicate_policy='repeat')
    subset = request.model_copy(update=options)
    result = solve(subset)
    best = result['solutions'][0]
    cutoff = max(.1, best['rmse_deg'] + request.equivalence_deg) if best['rmse_deg'] is not None else None
    good = [s for s in result['solutions'] if s['equivalent'] or
            (cutoff is not None and s['rmse_deg'] is not None and s['rmse_deg'] <= cutoff+1e-9)]
    shared = {}
    for field in ('source', 'measurement_kind', 'site', 'azimuth_deg', 'time_s'):
        values = {getattr(row, field) for row in members}
        shared[field] = values.pop() if len(values) == 1 else None
    if shared['source'] is None:
        shared['source'] = ' · '.join(dict.fromkeys(row.source for row in members))
    return dict(**shared, group_by=body.group_by, metric=subset.metric, criterion=result['fit_objective']['label'],
        saturated=result['identifiability']['saturated'],
        time_source=shared['source'] if shared['time_s'] is not None else None,
        count=len(members), angle_count=result['counts']['angles'], best_rms=best['rmse_deg'],
        good_families=len(good), good_values=sum(s['alias_count'] for s in good), cutoff=cutoff,
        warnings=result['warnings'], families=[dict(rank=s['rank'], values=s['values'],
            first_values=s['aliases'][0]['values'], periods=s['periods'], alias_count=s['alias_count'],
            rmse_deg=s['rmse_deg'], at_boundary=s['at_boundary'], weak=s['uncertainty']['weak'],
            coupled=s['uncertainty'].get('strongly_correlated',False)) for s in good])


class ViewInput(BaseModel):
    bounds:list[list[float]]=Field(min_length=1,max_length=2)
    scales:list[Literal['linear','log']]=Field(min_length=1,max_length=2)
    size:int=Field(default=161,ge=41,le=241)


@app.post('/api/jobs/{key}/view')
def refine_view(key:str,body:ViewInput):
    job=job_by_id(key)
    if job['status']!='completed':raise HTTPException(409,'Zuerst den Fit abschließen.')
    from .refinement import evaluate_view
    result=job['result']
    anchors=[a['values'] for s in result['solutions'] for a in s['aliases']]
    profile=result.get('identifiability',{}).get('profile')
    if profile:anchors.extend(p['values'] for p in profile['overlay'])
    return evaluate_view(job['request'],body.bounds,body.scales,body.size,anchors)


@app.post('/api/validate-session')
def validate_session(body: dict):
    if body.get('type') != 'ellifit-session' or body.get('version') != 1:
        raise ValueError('Keine unterstützte ElliFit-Sitzung.')
    model = Model.model_validate(body['model'])
    rows = [Row.model_validate(r) for r in body['measurements']]
    if len(rows) > 200000 or len({r.id for r in rows}) != len(rows):
        raise ValueError('Ungültige Messwertliste.')
    from .core import Parameter
    pars = body.get('parameters', [])
    if len(pars) != 2:
        raise ValueError('Ungültige Parameterkonfiguration.')
    for p in pars:
        if p.get('path'):
            Parameter.model_validate(p)
    if rows and any(p.get('path') for p in pars):
        FitRequest(model=model, measurements=rows, parameters=[p for p in pars if p.get('path')], **body.get('settings', {}))
    return body | dict(model=model.model_dump(), measurements=[r.model_dump() for r in rows],
        parameters=[Parameter.model_validate(p).model_dump() if p.get('path') else p for p in pars])


class TrialInput(BaseModel):
    values:list[float]=Field(min_length=1,max_length=2)
    name:str=Field(default='',max_length=120)


@app.post('/api/jobs/{key}/trial')
def trial_solution(key:str,body:TrialInput):
    job=job_by_id(key)
    if job['status']!='completed':raise HTTPException(409,'Zuerst eine globale Suche abschließen.')
    req=job['request']
    if len(body.values)!=len(req.parameters) or not np.isfinite(body.values).all():
        raise ValueError('Für jeden Fitparameter einen endlichen Wert eingeben.')
    model=req.model.model_dump()
    for parameter,value in zip(req.parameters,body.values):
        field=parameter.path.split('.')[-1]
        minimum=0.;maximum=1e8 if field=='thickness_nm' else 100.
        if value<minimum or value>maximum or (field=='n' and value==0):
            label=parameter_label(model,parameter.path)
            bounds='größer als 0 und höchstens 100' if field=='n' else 'zwischen 0 und 100 000 000 nm' if field=='thickness_nm' else 'zwischen 0 und 100'
            raise ValueError(f'{label}: einen Wert {bounds} eingeben.')
        put(model,parameter.path,value)
    Model.model_validate(model)
    obj=Objective(req)
    delta,psi=simulate(obj.model,obj.obs.angles,np.array([body.values]),obj.paths)
    if (req.metric=='angular' and not np.isfinite(delta).all()) or not np.isfinite(psi).all():
        raise ValueError('Diese Probelösung ergibt keine definierten ellipsometrischen Winkel.')
    q=float(obj.analysis.sse(delta,psi)[0]);rms=finite_number(obj.analysis.raw_rms(delta,psi)[0])
    from .landscape import MeanCompatibility
    from .diagnostics import mean_deviation
    compatibility=MeanCompatibility(obj)
    p=float(compatibility.from_prediction(delta,psi)[0]) if compatibility.available else None
    outside=any(not parameter.lower<=value<=parameter.upper for parameter,value in zip(req.parameters,body.values))
    notes=[]
    if outside:notes.append(dict(kind='warning',title='Probelösung außerhalb des Suchbereichs',text='Der Modellvergleich wurde berechnet. Für diese Parameterwerte wurde keine globale Suche durchgeführt.'))
    best=min(s['q'] for s in job['result']['solutions'])
    if q<best-1e-7*max(1.,best):notes.append(dict(kind='warning',title='Probelösung passt besser als die gefundenen Minima',text='Suchbereich und Suchdichte prüfen; die Probelösung wurde nicht lokal optimiert.'))
    return dict(name=body.name.strip(),values=body.values,q=q,rmse_deg=rms,mean_fit=mean_deviation(obj,body.values),
        compatibility_p=p,outside_search=outside,optimized=False,comparison=comparison(req,body.values),notices=notes)


class OpticalInput(BaseModel):
    values: list[float] = Field(min_length=1, max_length=2)
    layer: int | None = Field(default=None, ge=0)


@app.post('/api/jobs/{key}/optics')
def optical_detail(key: str, body: OpticalInput):
    from .optical_diagnostics import optical_sensitivity
    job = job_by_id(key)
    if job['status'] != 'completed':
        raise HTTPException(409, 'Zuerst den Fit abschließen.')
    req = job['request']
    if len(body.values) != len(req.parameters) or not np.isfinite(body.values).all():
        raise ValueError('Ungültiges Parameterpaar.')
    model = req.model.model_dump()
    for p,value in zip(req.parameters,body.values):
        put(model,p.path,value)
    Model.model_validate(model)
    return optical_sensitivity(model, job['result']['measurement_uncertainty']['groups'], body.layer)


class LineInput(BaseModel):
    group: int = Field(ge=0)
    bounds: list[tuple[float,float]] | None = Field(default=None, min_length=2,max_length=2)


@app.post('/api/jobs/{key}/measurement-lines')
def contour_lines(key: str, body: LineInput):
    from .optical_diagnostics import measurement_lines
    job = job_by_id(key)
    if job['status'] != 'completed':
        raise HTTPException(409, 'Zuerst den Fit abschließen.')
    return measurement_lines(Objective(job['request']), body.group, body.bounds)


class ProfileInput(BaseModel):
    column: int = Field(ge=0,le=1)
    values: list[float] = Field(min_length=2,max_length=2)


@app.post('/api/jobs/{key}/conditional-profile')
def comparison_profile(key: str, body: ProfileInput):
    from .optical_diagnostics import conditional_profile
    job = job_by_id(key)
    if job['status'] != 'completed':
        raise HTTPException(409, 'Zuerst den Fit abschließen.')
    anchors=[s['values'] for s in job['result']['solutions'][:48]]
    return conditional_profile(Objective(job['request']),body.column,body.values,anchors)


app.mount('/static', StaticFiles(directory=STATIC), name='static')
