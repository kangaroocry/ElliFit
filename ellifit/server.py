from __future__ import annotations

import json
import hashlib
import os
import re
import threading
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
from .core import Medium, Objective
from .statistics import RepeatAnalysis, parameter_uncertainty

ROOT = Path(__file__).resolve().parents[1]
STATIC = Path(__file__).parent / 'static'
MODEL_DIR = Path(os.environ.get('ELLIFIT_MODELS', ROOT / 'models')).expanduser().resolve()
MATERIAL_DIR = Path(os.environ.get('ELLIFIT_MATERIALS', ROOT / 'materials')).expanduser().resolve()
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
    bundle = hashlib.sha256((STATIC / 'app.js').read_bytes() + (STATIC / 'style.css').read_bytes()).hexdigest()[:16]
    for asset in ('/static/app.js', '/static/style.css'):
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


def model_path(name):
    if Path(name).name != name or not name.endswith('.json') or len(name) > 180:
        raise ValueError('Ungültiger Modell-Dateiname.')
    p = MODEL_DIR / name
    if p.is_symlink() or p.resolve().parent != MODEL_DIR:
        raise ValueError('Ungültiger Modellpfad.')
    return p


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
    if Path(name).name != name or not name.endswith('.json') or len(name)>180:
        raise ValueError('Ungültiger Material-Dateiname.')
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
async def upload(file: UploadFile = File(...)):
    content = await file.read(32 * 1024 * 1024 + 1)
    if len(content) > 32 * 1024 * 1024:
        raise HTTPException(413, 'Datei größer als 32 MB.')
    return parse_data(content, Path(file.filename or 'Messdaten').name)


@app.get('/api/reference')
def reference():
    m = Model(name='Synthetische Referenz · Luft / Film / Si')
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
    if not 0<=alias<len(solution['aliases']):raise HTTPException(404,'Periodische Wiederholung nicht vorhanden.')
    values=solution['aliases'][alias]['values']
    result=comparison(job['request'],values)
    if alias==solution['representative_alias']:
        result['uncertainty']=solution['uncertainty']
    else:
        if 'objective' not in job:job['objective']=Objective(job['request'])
        result['uncertainty']=parameter_uncertainty(job['objective'],values)
    result['selected_alias']=alias
    return result


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


app.mount('/static', StaticFiles(directory=STATIC), name='static')
