"""Monochromatic isotropic optics, circular residuals and global fitting.

N = n + i*k, exp(-i*omega*t), passive k >= 0. All lengths are nm.
"""
from __future__ import annotations

import copy
import csv
import math
import re
import threading
import time
import uuid

import numpy as np
from scipy.ndimage import label, minimum_filter
from scipy.optimize import differential_evolution, least_squares, minimize_scalar
from pydantic import BaseModel, ConfigDict, Field, model_validator
from typing import Literal


class Validated(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)


class Medium(Validated):
    name: str = Field(default='Medium', max_length=160)
    n: float = Field(default=1.5, gt=0, le=100)
    k: float = Field(default=0, ge=0, le=100)
    uncertainty_n: float | None = Field(default=None, ge=0, le=100)
    uncertainty_k: float | None = Field(default=None, ge=0, le=100)


class Layer(Medium):
    thickness_nm: float = Field(default=80, ge=0, le=1e8)


class Model(Validated):
    schema_version: Literal[1] = 1
    name: str = Field(default='Luft / Film / Si · Beispiel', min_length=1, max_length=160)
    wavelength_nm: float = Field(default=632.8, gt=0, le=1e6)
    delta_convention: Literal['standard', 'reversed'] = 'reversed'
    ambient: Medium = Field(default_factory=lambda: Medium(name='Luft', n=1))
    layers: list[Layer] = Field(default_factory=lambda: [Layer(name='Film', n=1.46)], max_length=40)
    substrate: Medium = Field(default_factory=lambda: Medium(name='Si · Beispiel', n=3.882, k=0.019))
    notes: str = Field(default='Materialwerte sind Beispiele. Für die reale Probe prüfen.', max_length=10000)

    @model_validator(mode='after')
    def incident_medium(self):
        if self.ambient.k != 0:
            raise ValueError('Das Einfallsmedium muss transparent sein (k = 0).')
        return self


class Row(Validated):
    id: str = Field(max_length=200)
    angle: float = Field(gt=0, lt=90)
    delta: float
    psi: float = Field(ge=0, le=90)
    source: str = Field(default='Manuell', max_length=500)
    line: int = 0
    comment: str = Field(default='', max_length=2000)


class Parameter(Validated):
    path: str
    lower: float
    upper: float
    scale: Literal['log', 'linear'] = 'log'
    positive_min: float = Field(default=1e-8, gt=0, le=100)

    @model_validator(mode='before')
    @classmethod
    def default_scale(cls, value):
        if isinstance(value, dict) and 'scale' not in value:
            return value | {'scale': 'linear' if value.get('path', '').endswith('.n') else 'log'}
        return value

    @model_validator(mode='after')
    def bounds(self):
        if not re.fullmatch(r'layers\.\d+\.(n|k|thickness_nm)|substrate\.(n|k)|ambient\.n', self.path):
            raise ValueError('Ungültiger Parameterpfad.')
        cap = 1e8 if self.path.endswith('thickness_nm') else 100
        if not 0 <= self.lower < self.upper <= cap:
            raise ValueError('Ungültige Suchgrenzen.')
        if self.lower == 0 and (self.path.endswith('.n') or (self.scale == 'log' and not self.path.endswith('.k'))):
            raise ValueError('Logarithmische Grenzen und n müssen positiv sein.')
        if self.scale == 'log' and self.lower == 0 and self.positive_min >= self.upper:
            raise ValueError('Der kleinste positive k-Wert muss unter der Obergrenze liegen.')
        return self


class Calibration(Validated):
    angle_deg: float | None = Field(default=None, ge=0, le=10)
    wavelength_nm: float | None = Field(default=None, ge=0, le=10000)


class FitRequest(Validated):
    model: Model
    measurements: list[Row] = Field(min_length=1, max_length=200000)
    parameters: list[Parameter] = Field(min_length=1, max_length=2)
    duplicate_policy: Literal['ask', 'average', 'repeat'] = 'repeat'
    angle_tolerance: float = Field(default=0.001, gt=0, le=0.1)
    metric: Literal['angular', 'stokes'] = 'angular'
    use_uncertainties: bool = False
    sigma_delta: float = Field(default=0.05, gt=0, le=180)
    sigma_psi: float = Field(default=0.05, gt=0, le=90)
    equivalence_deg: float = Field(default=0.01, ge=0, le=10)
    quality: Literal['quick', 'balanced', 'thorough'] = 'balanced'
    uncertainty_mode: Literal['auto', 'none'] = 'auto'
    bootstrap_samples: Literal[0, 60, 120] = 60
    calibration: Calibration = Field(default_factory=Calibration)

    @model_validator(mode='after')
    def paths(self):
        if len({p.path for p in self.parameters}) != len(self.parameters):
            raise ValueError('Zwei verschiedene Parameter wählen.')
        for p in self.parameters:
            if p.path.startswith('layers.') and int(p.path.split('.')[1]) >= len(self.model.layers):
                raise ValueError('Die ausgewählte Schicht existiert nicht.')
        if self.metric == 'stokes' and self.use_uncertainties:
            raise ValueError('Winkel-σ können nicht als Stokes-Gewichte verwendet werden.')
        return self


def get(model, path):
    obj = model
    for key in path.split('.'):
        obj = obj[int(key)] if isinstance(obj, list) else obj[key]
    return obj


def put(model, path, value):
    keys = path.split('.')
    obj = model
    for key in keys[:-1]:
        obj = obj[int(key)] if isinstance(obj, list) else obj[key]
    obj[keys[-1]] = float(value)


def medium_label(model, path):
    parts = path.split('.')
    medium = model['layers'][int(parts[1])] if parts[0] == 'layers' else model[parts[0]]
    if parts[0] == 'layers':
        return f'[{int(parts[1])+1}] ' + medium['name']
    return medium['name'] + (' (Substrat)' if parts[0] == 'substrate' else ' (Einfallsmedium)')


def parameter_label(model, path):
    parts = path.split('.')
    quantity = {'thickness_nm': 'Schichtdicke', 'n': 'Brechungsindex', 'k': 'Extinktionskoeffizient'}[parts[-1]]
    return quantity + ' ' + medium_label(model, path) + (' (nm)' if parts[-1] == 'thickness_nm' else '')


def wrap(value):
    return (np.asarray(value) + 180) % 360 - 180


def stokes(delta, psi):
    d, p = np.deg2rad(delta), 2 * np.deg2rad(psi)
    return np.stack((np.cos(p), np.sin(p) * np.cos(d), np.sin(p) * np.sin(d)), axis=-1)


def longitudinal(index, tangent):
    q = np.sqrt(np.asarray(index, complex) ** 2 - tangent ** 2 + 0j)
    return np.where((q.imag < -1e-13) | ((abs(q.imag) < 1e-13) & (q.real < 0)), -q, q)


def reflection(model, angles, values=None, paths=()):
    angles = np.atleast_1d(angles)
    values = np.empty((1, 0)) if values is None else np.atleast_2d(values)
    media = [model['ambient'], *model['layers'], model['substrate']]
    batch = len(values)
    indices = np.tile(np.array([m['n'] + 1j * m['k'] for m in media])[:, None], (1, batch))
    thickness = np.tile(np.array([l['thickness_nm'] for l in model['layers']], dtype=float)[:, None], (1, batch))
    for col, path in enumerate(paths):
        parts = path.split('.')
        j = int(parts[1]) + 1 if parts[0] == 'layers' else 0 if parts[0] == 'ambient' else len(media) - 1
        if parts[-1] == 'thickness_nm':
            thickness[j - 1] = values[:, col]
        elif parts[-1] == 'n':
            indices[j] = values[:, col] + 1j * indices[j].imag
        else:
            indices[j] = indices[j].real + 1j * values[:, col]
    tangent = indices[0, :, None] * np.sin(np.deg2rad(angles))[None, :]
    q = longitudinal(indices[:, :, None], tangent[None, :, :])
    q = np.where(abs(q) < 1e-14, 1e-14 + 0j, q)
    eps = indices[:, :, None] ** 2
    with np.errstate(divide='ignore', invalid='ignore', over='ignore'):
        ss = (q[:-1] - q[1:]) / (q[:-1] + q[1:])
        pp = (eps[1:] * q[:-1] - eps[:-1] * q[1:]) / (eps[1:] * q[:-1] + eps[:-1] * q[1:])
        rs, rp = ss[-1].copy(), pp[-1].copy()
        for j in range(len(media) - 3, -1, -1):
            phase = np.exp(4j * np.pi * q[j + 1] * thickness[j, :, None] / model['wavelength_nm'])
            rs = (ss[j] + rs * phase) / (1 + ss[j] * rs * phase)
            rp = (pp[j] + rp * phase) / (1 + pp[j] * rp * phase)
    return rp, rs


def simulate(model, angles, values=None, paths=()):
    rp, rs = reflection(model, angles, values, paths)
    delta = np.rad2deg(np.angle(rp) - np.angle(rs))
    # Elli-compatible output sign; explicit choices in saved models are retained.
    if model.get('delta_convention', 'reversed') == 'reversed':
        delta = -delta
    psi = np.rad2deg(np.arctan2(abs(rp), abs(rs)))
    invalid = abs(rp) + abs(rs) < 1e-15
    return np.where(invalid, np.nan, delta % 360), np.where(invalid, np.nan, psi)


def parse_data(content: bytes, name: str):
    try:
        text = content.decode('utf-8-sig')
    except UnicodeDecodeError:
        text = content.decode('cp1252', errors='replace')
    number = r'[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:[eEdD][+-]?\d+)?'
    pattern = re.compile(rf'^\s*({number})[\s;]+({number})[\s;]+({number})(?:[\s;]+(.*))?\s*$')
    rows, skipped = [], []
    token = uuid.uuid4().hex[:10]
    for line, s in enumerate(text.splitlines(), 1):
        match = pattern.match(s)
        parts = list(match.groups()) if match else None
        if parts is None:
            for delimiter in (';', ','):
                try:
                    items = next(csv.reader([s], delimiter=delimiter))
                    if len(items) < 3:
                        continue
                    [float(v.replace(',', '.')) for v in items[:3]]
                    parts = items[:3] + ['; '.join(items[3:])]
                    break
                except (ValueError, csv.Error):
                    continue
        if parts is None:
            if rows and re.match(r'^\s*[+-]?\d', s):
                skipped.append(line)
            continue
        try:
            a, d, p = [float(v.replace(',', '.').replace('D', 'e').replace('d', 'e')) for v in parts[:3]]
            row = Row(id=f'{token}-{line}', angle=a, delta=d % 360, psi=p, source=name, line=line, comment=(parts[3] or '').strip().removeprefix('>>').strip()[:2000])
            rows.append(row.model_dump())
        except ValueError:
            skipped.append(line)
    if not rows:
        raise ValueError('Keine Daten erkannt. Erwartet: Winkel, Delta, Psi in Grad.')
    if len(rows) > 200000:
        raise ValueError('Maximal 200.000 Messungen pro Datei.')
    return dict(rows=rows, count=len(rows), skipped=skipped, filename=name)


class Observations:
    """Exact circular SSE statistics; repeat weighting retains within-group spread."""
    def __init__(self, rows, policy='repeat', tolerance=0.001):
        self.rows, self.groups, self.warnings = rows, [], []
        for idx in np.argsort([r['angle'] for r in rows], kind='stable'):
            idx = int(idx)
            if not self.groups or rows[idx]['angle'] - rows[self.groups[-1][0]]['angle'] > tolerance:
                self.groups.append([idx])
            else:
                self.groups[-1].append(idx)
        self.angles = np.array([np.mean([rows[i]['angle'] for i in g]) for g in self.groups])
        self.duplicates = [dict(angle=float(a), count=len(g)) for a, g in zip(self.angles, self.groups) if len(g) > 1]
        self.ds, self.ps = [], []
        self.centers, self.centered, self.deviations = [], [], []
        for a, group in zip(self.angles, self.groups):
            d = np.array([rows[i]['delta'] % 360 for i in group])
            p = np.array([rows[i]['psi'] for i in group])
            if policy == 'average' and len(group) > 1:
                z = np.mean(np.exp(1j * np.deg2rad(d)))
                if abs(z) < 1e-8:
                    raise ValueError(f'Kein eindeutiges Δ-Kreismittel bei {a:g}°. Auswahl eingrenzen.')
                if abs(z) < 0.95 or np.ptp(p) > 1:
                    self.warnings.append(f'Große Streuung bei {a:g}°: nur dieselbe unveränderte Probe mitteln.')
                d, p = np.array([np.rad2deg(np.angle(z)) % 360]), np.array([p.mean()])
            self.ds.append(d)
            self.ps.append(p)
            center = float(np.rad2deg(np.angle(np.mean(np.exp(1j * np.deg2rad(d))))))
            dev = wrap(d - center)
            order = np.argsort(dev)
            dev, dp = dev[order], (p - p.mean())[order]
            self.centers.append(center)
            self.deviations.append(dev)
            self.centered.append(tuple(np.r_[0., np.cumsum(a)] for a in (dev, dev**2, dev*dp, dp)))
        self.counts = np.array([len(d) for d in self.ds])
        self.count = int(self.counts.sum())
        self.pm = np.array([p.mean() for p in self.ps])
        self.pv = np.array([np.sum((p - p.mean()) ** 2) for p in self.ps])
        vectors = [stokes(d, p) for d, p in zip(self.ds, self.ps)]
        self.sm = np.array([v.mean(axis=0) for v in vectors])
        self.sv = np.array([np.sum((v - v.mean(axis=0)) ** 2) for v in vectors])

    def angular_statistics(self, delta):
        """Exact wrapped residual statistics about a numerically stable center."""
        delta = np.atleast_2d(delta)
        invalid = ~np.isfinite(delta)
        prediction = wrap(np.where(invalid, 0, delta) - np.asarray(self.centers))
        means, variance, cross = np.empty_like(prediction), np.empty_like(prediction), np.empty_like(prediction)
        for j, count in enumerate(self.counts):
            dev = self.deviations[j]
            left = np.searchsorted(dev, prediction[:, j] - 180, side='right')
            right = np.searchsorted(dev, prediction[:, j] + 180, side='right')
            s, s2, sp, pp = self.centered[j]
            total = s[-1] + 360 * (left - (count - right))
            total2 = s2[-1] + 720 * (s[left] - (s[-1] - s[right])) + 360**2 * (left + count - right)
            means[:, j] = np.sqrt(count) * (prediction[:, j] - total / count)
            variance[:, j] = np.maximum(total2 - total**2 / count, 0)
            cross[:, j] = sp[-1] + 360 * (pp[left] - (pp[-1] - pp[right]))
        means[invalid] = np.nan
        return means, variance, cross

    def residuals(self, delta, psi, metric='angular', sigmas=(1, 1)):
        delta, psi = np.atleast_2d(delta), np.atleast_2d(psi)
        if metric == 'stokes':
            r = ((stokes(delta, psi) - self.sm) * np.sqrt(self.counts)[None, :, None]).reshape(len(delta), -1)
            return np.c_[r, np.broadcast_to(np.sqrt(self.sv), (len(delta), len(self.sv)))]
        dm, variance, _ = self.angular_statistics(delta)
        return np.concatenate((dm / sigmas[0], np.sqrt(self.counts) * (psi - self.pm) / sigmas[1], np.sqrt(variance) / sigmas[0], np.broadcast_to(np.sqrt(self.pv) / sigmas[1], psi.shape)), axis=1)

    def sse(self, delta, psi, metric='angular', sigmas=(1, 1)):
        return np.sum(self.residuals(delta, psi, metric, sigmas) ** 2, axis=1)


class Cancelled(Exception):
    pass


class Objective:
    def __init__(self, request, cancel=None):
        self.req = request
        self.model = request.model.model_dump()
        self.rows = [r.model_dump() for r in request.measurements]
        from .statistics import RepeatAnalysis
        self.analysis = RepeatAnalysis(self.rows, request.duplicate_policy, request.angle_tolerance, request.metric, request.uncertainty_mode == 'auto')
        self.obs = self.analysis.display
        self.paths = [p.path for p in request.parameters]
        self.hybrid = [p.scale == 'log' and p.lower == 0 and p.path.endswith('.k') for p in request.parameters]
        self.a = np.array([0 if h else math.log10(p.lower) if p.scale == 'log' else p.lower for p,h in zip(request.parameters,self.hybrid)])
        self.b = np.array([math.log1p(p.upper / p.positive_min) if h else math.log10(p.upper) if p.scale == 'log' else p.upper for p,h in zip(request.parameters,self.hybrid)])
        self.sigmas = (1, 1)  # Legacy fixed sigma fields are accepted only for session migration.
        self.cancel = cancel or threading.Event()
        self.calls = 0

    def decode(self, z):
        v = self.a + np.atleast_2d(z) * (self.b - self.a)
        for i, p in enumerate(self.req.parameters):
            if self.hybrid[i]:
                v[:, i] = p.positive_min * np.expm1(v[:, i])
            elif p.scale == 'log':
                v[:, i] = 10 ** v[:, i]
        return v

    def encode(self, values):
        v = np.atleast_2d(values).copy().astype(float)
        for i, p in enumerate(self.req.parameters):
            if self.hybrid[i]:
                v[:, i] = np.log1p(v[:, i] / p.positive_min)
            elif p.scale == 'log':
                v[:, i] = np.log10(v[:, i])
        return (v - self.a) / (self.b - self.a)

    def prediction(self, z):
        if self.cancel.is_set():
            raise Cancelled()
        self.calls += len(np.atleast_2d(z))
        return simulate(self.model, self.obs.angles, self.decode(z), self.paths)

    def batch(self, z):
        d, p = self.prediction(z)
        q = self.analysis.sse(d, p)
        self.last_rms = self.analysis.raw_rms(d, p)
        return np.nan_to_num(q, nan=1e100, posinf=1e100, neginf=1e100)

    def scalar(self, z):
        return float(self.batch(z)[0])

    def residual(self, z):
        d, p = self.prediction(z)
        return np.nan_to_num(self.analysis.residuals(d, p)[0], nan=1e40, posinf=1e40, neginf=-1e40)


def phase_grid(obj, col, base, cap):
    par = obj.req.parameters[col]
    extra = np.array([])
    needed = 0
    if par.path.endswith('.k'):
        floor = max(par.positive_min, par.lower) if par.lower == 0 else par.lower
        extra = np.r_[0 if par.lower == 0 else par.lower, np.geomspace(floor, par.upper, base)]
    if par.path.startswith('layers.'):
        idx = int(par.path.split('.')[1])
        layer = obj.model['layers'][idx]
        n0 = next((p.lower for p in obj.req.parameters if p.path == 'ambient.n'), obj.model['ambient']['n'])
        tangent = n0 * np.sin(np.deg2rad(obj.obs.angles))
        if par.path.endswith('thickness_nm'):
            nmax = next((p.upper for p in obj.req.parameters if p.path == f'layers.{idx}.n'), layer['n'])
            qmax = np.max(abs(longitudinal(nmax + 1j * layer['k'], tangent).real))
            needed = int(math.ceil(64 * (par.upper - par.lower) * qmax / obj.model['wavelength_nm'])) + 1
            extra = np.linspace(par.lower, par.upper, min(cap, max(needed, 2)))
        elif par.path.endswith('.n'):
            dmax = next((p.upper for p in obj.req.parameters if p.path == f'layers.{idx}.thickness_nm'), layer['thickness_nm'])
            parts = []
            for t in np.unique(tangent):
                lo, hi = np.sqrt(max(par.lower ** 2 - t ** 2, 0)), np.sqrt(max(par.upper ** 2 - t ** 2, 0))
                count = int(math.ceil(64 * dmax * (hi - lo) / obj.model['wavelength_nm'])) + 1
                needed = max(needed, count)
                if hi > lo:
                    parts.append(np.sqrt(np.linspace(lo, hi, min(cap, max(count, 2))) ** 2 + t ** 2))
            if parts:
                extra = np.concatenate(parts)
    values = np.tile([get(obj.model, p.path) for p in obj.req.parameters], (len(extra), 1))
    if len(extra):
        values[:, col] = np.clip(extra, par.lower, par.upper)
        # Other initial parameter values may be outside bounds; only this
        # encoded column is used to augment the grid.
        encoded = np.log1p(values[:, col] / par.positive_min) if obj.hybrid[col] else np.log10(values[:, col]) if par.scale == 'log' else values[:, col]
        zextra = (encoded - obj.a[col]) / (obj.b[col] - obj.a[col])
    else:
        zextra = []
    baseline = np.r_[0, np.linspace(math.log(2) / (obj.b[col]-obj.a[col]), 1, base-1)] if obj.hybrid[col] else np.linspace(0,1,base)
    grid = np.unique(np.clip(np.r_[baseline, zextra], 0, 1))
    limited = len(grid) > cap or needed > cap
    if len(grid) > cap:
        grid = grid[np.rint(np.linspace(0, len(grid) - 1, cap)).astype(int)]
    return grid, limited


def safe_list(values):
    a = np.asarray(values, dtype=float)
    out = a.astype(object)
    out[~np.isfinite(a) | (a >= 1e90)] = None
    return out.tolist()


def unique_candidates(candidates, limit=120):
    kept = []
    for z, q in sorted(candidates, key=lambda x: x[1]):
        if q >= 1e90 or not np.isfinite(q) or any(np.max(abs(z - old[0])) < 2e-6 for old in kept):
            continue
        kept.append((np.asarray(z), float(q)))
        if len(kept) == limit:
            break
    return kept


def period(model, path, angle):
    if not path.endswith('thickness_nm'):
        return None
    l = model['layers'][int(path.split('.')[1])]
    if l['k'] != 0:
        return None
    q = complex(longitudinal(l['n'] + 1j * l['k'], model['ambient']['n'] * math.sin(math.radians(angle))))
    return model['wavelength_nm'] / (2 * q.real) if abs(q.imag) < 1e-10 and q.real > 1e-10 else None


def fixed_value_minimum(obj, col, value, grids):
    """Profile one parameter, globally sampling the remaining 1D coordinate."""
    initial = [np.clip(get(obj.model,p.path),p.lower,p.upper) for p in obj.req.parameters]
    initial[col] = value
    base = obj.encode(initial)[0]
    if len(obj.paths) == 1:
        return base, obj.scalar(base)
    other = 1-col
    grid = grids[other]
    points = np.tile(base,(len(grid),1));points[:,other]=grid
    scores=obj.batch(points)
    idx=np.flatnonzero((scores<=np.r_[np.inf,scores[:-1]]) & (scores<=np.r_[scores[1:],np.inf]))
    options=[(points[int(np.argmin(scores))],float(scores.min()))]
    for j in idx[np.argsort(scores[idx])[:8]]:
        def f(z):
            candidate=base.copy();candidate[other]=z
            return obj.scalar(candidate)
        opt=minimize_scalar(f,bounds=(grid[max(0,j-1)],grid[min(len(grid)-1,j+1)]),method='bounded',options={'xatol':1e-12})
        z=base.copy();z[other]=opt.x;options.append((z,float(opt.fun)))
    return min(options,key=lambda x:x[1])


def solve(request, progress=lambda p, m: None, cancel=None):
    started = time.perf_counter()
    obj = Objective(request, cancel)
    if request.duplicate_policy == 'ask' and obj.obs.duplicates:
        raise ValueError('Bitte Wiederholungen zuerst mitteln oder mehrfach gewichten.')
    ndim = len(obj.paths)
    level = ['quick', 'balanced', 'thorough'].index(request.quality)
    base = ([321, 641, 1281] if ndim == 1 else [80, 140, 220])[level]
    cap = ([2400, 7000, 18000] if ndim == 1 else [240, 512, 800])[level]
    grids, limited = [], False
    warnings = obj.obs.warnings.copy() + obj.analysis.warnings.copy()
    if request.use_uncertainties:
        warnings.append('Alte feste σ-Eingaben werden nicht mehr als Messunsicherheiten verwendet. Neue Auswertung aus Wiederholungen.')
    for col in range(ndim):
        g, cut = phase_grid(obj, col, base, cap)
        grids.append(g)
        limited |= cut
    if limited:
        warnings.append('Rasterauflösung begrenzt: schmale Minima können fehlen. Suchdichte erhöhen oder Teilbereiche zusätzlich prüfen.')
    points = grids[0][:, None] if ndim == 1 else np.column_stack([m.ravel() for m in np.meshgrid(*grids, indexing='ij')])
    scores = np.empty(len(points))
    rms_grid = np.empty(len(points))
    chunk = max(8, min(4096, 180000 // len(obj.obs.angles)))
    for start in range(0, len(points), chunk):
        stop = min(start + chunk, len(points))
        scores[start:stop] = obj.batch(points[start:stop])
        rms_grid[start:stop] = obj.last_rms
        progress(3 + 44 * stop / len(points), f'Globales Raster: {stop} / {len(points)}')
    valid = scores[scores < 1e90]
    if not len(valid):
        raise ValueError('Keine definierten ellipsometrischen Werte im Suchraum. Modell prüfen.')
    scale = max(1, float(abs(valid).max()))
    flat = float(np.ptp(valid)) < 1e-9 * scale
    if flat:
        warnings.append('Die Fehlerfunktion ist praktisch flach. Der Parameter ist damit nicht eindeutig bestimmbar.')
    candidates = []
    surface = scores.reshape(tuple(len(g) for g in grids))
    if ndim == 1:
        idx = np.flatnonzero((scores <= np.r_[np.inf, scores[:-1]]) & (scores <= np.r_[scores[1:], np.inf]))
        if flat:
            idx = np.array([np.argmin(scores)])
        maxlocal = [100, 240, 500][level]
        if len(idx) > maxlocal:
            warnings.append(f'Nur die besten {maxlocal} Rasterminima wurden lokal verfeinert.')
            idx = idx[np.argsort(scores[idx])[:maxlocal]]
        for k, j in enumerate(idx):
            lo, hi = grids[0][max(j - 1, 0)], grids[0][min(j + 1, len(scores) - 1)]
            opt = minimize_scalar(lambda z: obj.scalar([z]), bounds=(lo, hi), method='bounded', options={'xatol': 1e-13})
            candidates.append(min([(np.array([opt.x]), opt.fun), (points[j], scores[j])], key=lambda c: c[1]))
            progress(50 + 34 * (k + 1) / len(idx), f'Lokale Verfeinerung: {k + 1} / {len(idx)}')
    else:
        mask = (surface <= minimum_filter(surface, size=3, mode='constant', cval=np.inf) + 1e-12 * scale) & (surface < 1e90)
        regions, _ = label(mask, structure=np.ones((3, 3), int))
        ids = regions.ravel()
        members = np.flatnonzero(ids)
        ordered = members[np.lexsort((scores[members], ids[members]))]
        idx = ordered[np.r_[True, ids[ordered[1:]] != ids[ordered[:-1]]]]
        idx = idx[np.argsort(scores[idx])]
        maxlocal = [40, 80, 160][level]
        if len(idx) > maxlocal:
            warnings.append(f'{len(idx)} Rasterminima; die besten {maxlocal} lokal verfeinert.')
        progress(49, 'Zusätzliche globale Suche: Differential Evolution')
        def callback(z, convergence):
            if obj.cancel.is_set():
                raise Cancelled()
        de = differential_evolution(obj.scalar, [(0, 1)] * ndim, seed=1337, popsize=[8, 12, 16][level], maxiter=[55, 100, 180][level], polish=False, tol=1e-8, atol=1e-12, callback=callback)
        starts = [de.x, *points[idx[:maxlocal]], *de.population[np.argsort(de.population_energies)[:6]]]
        for k, z in enumerate(starts):
            opt = least_squares(obj.residual, np.clip(z, 1e-12, 1 - 1e-12), bounds=(np.zeros(ndim), np.ones(ndim)), jac='3-point', diff_step=1e-6, x_scale='jac', ftol=1e-12, xtol=1e-12, gtol=1e-10, max_nfev=[350, 600, 1000][level])
            candidates.append((opt.x, obj.scalar(opt.x)))
            if not opt.success:
                warnings.append('Eine lokale Verfeinerung erreichte das Iterationslimit.')
            progress(60 + 25 * (k + 1) / len(starts), f'Lokale Verfeinerung: {k + 1} / {len(starts)}')
    zero_candidates = {}
    for col, par in enumerate(request.parameters):
        if par.path.endswith('.k') and par.lower == 0:
            candidate = fixed_value_minimum(obj, col, 0, grids)
            zero_candidates[col] = candidate
            candidates.append(candidate)
    candidates = unique_candidates(candidates)
    if not candidates:
        raise ValueError('Keine endliche Lösung gefunden.')
    if ndim==2:
        from .diagnostics import verify_candidates
        progress(86,'Minima numerisch bestätigen')
        candidates=unique_candidates(verify_candidates(obj,candidates))
        if obj.minimum_checks['rejected']:
            warnings.append(f"{obj.minimum_checks['rejected']} nicht bestätigte Optimierungspunkte verworfen; sie werden nicht als lokale Minima ausgegeben.")
    # A constrained boundary minimum is not necessarily stationary after a
    # thickness-period shift when that period depends on another free index.
    # Discard non-global boundary points before creating periodic copies.
    on_boundary=lambda z:bool(np.any(z<1e-6) or np.any(z>1-1e-6))
    obj.discarded_boundary_candidates=sum(on_boundary(z) for z,q in candidates[1:])
    candidates=[c for i,c in enumerate(candidates) if i==0 or not on_boundary(c[0])]
    dcols = [i for i, p in enumerate(obj.paths) if p.endswith('thickness_nm')]
    periodicity = dict(kind='none', message='Keine exakte gemeinsame Dickenperiode nachgewiesen.', periods=[])
    if len(obj.obs.angles) == 1 and dcols and not flat:
        for z, q in candidates[:10]:
            vals = obj.decode(z)[0]
            m = copy.deepcopy(obj.model)
            for path, value in zip(obj.paths, vals):
                put(m, path, value)
            periods = [period(m, obj.paths[i], float(obj.obs.angles[0])) for i in dcols]
            if not all(t is not None for t in periods):
                continue
            axes = []
            for i, t in zip(dcols, periods):
                p = request.parameters[i]
                a, b = math.ceil((p.lower - vals[i]) / t - 1e-10), math.floor((p.upper - vals[i]) / t + 1e-10)
                axes.append(vals[i] + np.arange(a, min(b + 1, a + 200)) * t)
                if b - a + 1 > 200:
                    warnings.append('Periodenfamilie auf die ersten 200 Wiederholungen begrenzt.')
            combinations = np.column_stack([a.ravel() for a in np.meshgrid(*axes, indexing='ij')])[:800]
            values = np.tile(vals, (len(combinations), 1))
            values[:, dcols] = combinations
            for i, p in enumerate(request.parameters):
                values[:, i] = np.clip(values[:, i], p.lower, p.upper)
            encoded = obj.encode(values)
            candidates.extend(zip(encoded, obj.batch(encoded)))
            if not periodicity['periods']:
                periodicity.update(kind='exact' if ndim == 1 else 'lattice' if len(dcols) == 2 else 'conditional', periods=[dict(path=obj.paths[i], period_nm=float(t)) for i, t in zip(dcols, periods)])
        candidates = unique_candidates(candidates)
        if periodicity['periods']:
            periodicity['message'] = 'Dickenperiode(n): ' + ', '.join(f'{p["period_nm"]:.7g} nm' for p in periodicity['periods']) + ('. Bei festem zweiten Parameter; die Periode kann zwischen Wertepaaren variieren.' if periodicity['kind'] == 'conditional' else '. Analytische Wiederholungen wurden nachgerechnet.')
    elif len(obj.obs.angles) > 1:
        periodicity['message'] = 'Mehrere Winkel haben im Allgemeinen unterschiedliche Dickenperioden. Ähnlich gute Minima allein beweisen keine Periodizität.'
    if ndim==2:
        # Also validate any period-shifted points; equality of function values
        # alone does not certify an interior two-parameter minimum.
        candidates=unique_candidates(verify_candidates(obj,candidates))
    from .results import finalize
    return finalize(request, obj, candidates, grids, points, scores, rms_grid,
                    periodicity, warnings, flat, started, progress, zero_candidates)


def comparison(request, values):
    m = request.model.model_dump()
    for p, v in zip(request.parameters, values):
        put(m, p.path, v)
    rows = [r.model_dump() for r in request.measurements]
    from .statistics import RepeatAnalysis
    analysis = RepeatAnalysis(rows, request.duplicate_policy, request.angle_tolerance, request.metric, request.uncertainty_mode == 'auto')
    obs = analysis.display
    multi = len(obs.angles) > 1
    col = next((i for i, p in enumerate(request.parameters) if p.path.endswith('thickness_nm')), 0)
    if multi:
        x = np.unique(np.r_[np.linspace(obs.angles.min(), obs.angles.max(), 500), obs.angles])
        d, p = simulate(m, x)
        xlabel, scale = 'Einfallswinkel φ (°)', 'linear'
    else:
        par = request.parameters[col]
        x = np.r_[0, np.geomspace(par.positive_min,par.upper,999)] if par.scale == 'log' and par.lower == 0 else np.geomspace(par.lower, par.upper, 1000) if par.scale == 'log' else np.linspace(par.lower, par.upper, 1000)
        x = np.unique(np.r_[x, values[col]])
        d, p = simulate(m, obs.angles, x[:, None], [par.path])
        d, p = d.T, p.T
        xlabel, scale = parameter_label(m, par.path), par.scale
    fd, fp = simulate(m, obs.angles)
    points, residuals = [], []
    for j, group in enumerate(obs.groups):
        for i in group:
            r = rows[i]
            residuals.append(r | dict(model_angle=float(obs.angles[j]), fit_delta=float(fd[0, j]), fit_psi=float(fp[0, j]), delta_residual=float(wrap(fd[0, j] - r['delta'])), psi_residual=float(fp[0, j] - r['psi'])))
        display = [rows[i] for i in group] if request.duplicate_policy != 'average' else [dict(delta=analysis.records[j]['mean_delta'], psi=analysis.records[j]['mean_psi'], source=f'Mittelwert aus {len(group)} Messungen')]
        for r in display:
            points.append(dict(x=float(obs.angles[j]) if multi else float(values[col]), delta=r['delta'] % 360, psi=r['psi'], source=r['source']))
    fixed_label = parameter_label(m, request.parameters[1 - col].path) if not multi and len(request.parameters) == 2 else None
    return dict(mode='angle' if multi else 'parameter', xlabel=xlabel, scale=scale, x=x.tolist(), delta=safe_list(d[0]), psi=safe_list(p[0]), points=points, residuals=residuals, fitted_model=m, fixed_parameter_label=fixed_label, zero_floor=request.parameters[col].positive_min if not multi and request.parameters[col].path.endswith('.k') else None)
