"""Repeat statistics, GLS sufficient statistics, uncertainty propagation.

The covariance estimates describe independent, stable repetitions of one sample.
Missing/singular estimates never become a zero measurement uncertainty.
"""
from __future__ import annotations

import copy
import math
import numpy as np
from scipy.linalg import block_diag
from scipy.optimize import least_squares

from .core import Observations, parameter_label, put, simulate, stokes, wrap


class RepeatAnalysis:
    def __init__(self, rows, policy='repeat', tolerance=.001, metric='angular', automatic=True):
        self.raw = Observations(rows, 'repeat', tolerance)
        self.display = Observations(rows, policy, tolerance)
        self.angles, self.groups = self.raw.angles, self.raw.groups
        self.records, self.covariances, self.precisions = [], [], []
        self.stokes_covariances = []
        self.warnings = []
        for j, group in enumerate(self.groups):
            d, p = self.raw.ds[j], self.raw.ps[j]
            m = len(d)
            z = np.mean(np.exp(1j * np.deg2rad(d)))
            center = float(np.rad2deg(np.angle(z)) % 360)
            du = center + wrap(d - center)
            y = np.column_stack((du, p))
            mean = y.mean(axis=0)
            unique = len(np.unique(y, axis=0))
            covariance = np.cov(y, rowvar=False, ddof=1) if m >= 2 else None
            vec = stokes(d, p)
            scov = np.cov(vec, rowvar=False, ddof=1) if m >= 2 else None
            drift = False
            if m >= 8:
                for col in y.T:
                    if np.std(col[:-1]) > 0 and np.std(col[1:]) > 0:
                        r = np.corrcoef(col[:-1], col[1:])[0, 1]
                        drift |= bool(abs(r) > .65)
            valid = m >= 3 and unique >= 3 and abs(z) > .95 and not drift
            if valid:
                eig = np.linalg.eigvalsh(covariance)
                valid = bool(eig.min() > max(1e-16, eig.max() * 1e-10))
            reason = 'aus Wiederholungen geschätzt' if valid else 'zu wenige unabhängige Wiederholungen'
            if drift:
                reason = 'mögliche Drift / zeitliche Korrelation'
            elif m >= 3 and not valid:
                reason = 'Streuung fehlt, ist singulär oder Δ ist nicht lokal eindeutig'
            if unique < m:
                self.warnings.append(f'Bei {self.angles[j]:g}° sind Werte exakt doppelt; die Unabhängigkeit der Wiederholungen prüfen.')
            if drift:
                self.warnings.append(f'Bei {self.angles[j]:g}° deutet die Reihenfolge auf Drift/Korrelation hin. Keine automatische Unsicherheit für diesen Winkel.')
            std = np.sqrt(np.maximum(np.diag(covariance), 0)) if covariance is not None else None
            corr = float(covariance[0, 1] / np.prod(std)) if std is not None and np.prod(std) > 0 else None
            self.records.append(dict(angle=float(self.angles[j]), count=m, unique_count=unique,
                mean_delta=float(mean[0] % 360), mean_psi=float(mean[1]),
                std_delta=float(std[0]) if std is not None and std[0] > 0 else None,
                std_psi=float(std[1]) if std is not None and std[1] > 0 else None,
                uncertainty_mean_delta=float(std[0] / np.sqrt(m)) if valid else None,
                uncertainty_mean_psi=float(std[1] / np.sqrt(m)) if valid else None,
                covariance=covariance.tolist() if covariance is not None else None,
                correlation=corr, usable=valid, status=reason))
            self.covariances.append(covariance if valid else None)
            self.stokes_covariances.append(scov if valid else None)
            self.precisions.append(np.linalg.inv(covariance) if valid else None)
        self.complete = all(c is not None for c in self.covariances)
        self.active = bool(automatic and metric == 'angular' and self.complete)
        self.metric, self.policy = metric, policy
        if automatic and not self.complete:
            self.warnings.append('Messunsicherheiten nicht für alle Winkel bestimmbar: ungewichteter Fit. Fehlende Unsicherheiten werden nicht durch null oder pauschale Vorgaben ersetzt.')
        if self.complete and min(len(g) for g in self.groups) < 10:
            self.warnings.append('Wenige Wiederholungen: geschätzte Kovarianzen und statistische Intervalle sind unsicher; χ²-Angaben sind Näherungen.')

    def public(self):
        return dict(groups=self.records, complete=self.complete, weighted=self.active,
            mode='repeat_covariance' if self.active else 'unweighted', warnings=list(dict.fromkeys(self.warnings)),
            assumptions='Unabhängige Wiederholungen derselben stabilen Probe. Systematische Fehler sind nicht aus der Streuung bestimmbar.')

    def residuals(self, delta, psi):
        if not self.active:
            return self.display.residuals(delta, psi, self.metric)
        delta, psi = np.atleast_2d(delta), np.atleast_2d(psi)
        dm, variances, crosses = self.raw.angular_statistics(delta)
        out = []
        for j, count in enumerate(self.raw.counts):
            mean_p = self.raw.pm[j]
            W = self.precisions[j]
            means = np.column_stack((dm[:, j], np.sqrt(count) * (psi[:, j] - mean_p)))
            root = np.linalg.cholesky(W)
            out.append(means @ root)
            spread = np.maximum(W[0, 0] * variances[:, j] + 2 * W[0, 1] * crosses[:, j] + W[1, 1] * self.raw.pv[j], 0)
            out.append(np.sqrt(spread)[:, None])
        return np.concatenate(out, axis=1)

    def sse(self, delta, psi):
        return np.sum(self.residuals(delta, psi)**2, axis=1)

    def raw_rms(self, delta, psi):
        return np.sqrt(self.raw.sse(delta, psi) / (2 * self.raw.count))


def _prediction_vector(model, angles, metric):
    d, p = simulate(model, angles)
    return stokes(d[0], p[0]).ravel() if metric == 'stokes' else np.column_stack((d[0], p[0])).ravel()


def _difference(a, b, metric):
    diff = np.asarray(a) - b
    if metric == 'angular':
        diff[::2] = wrap(diff[::2])
    return diff


def parameter_uncertainty(obj, values, bootstrap=0):
    """Propagate measurement and optional calibration covariance separately.

    Uses a sandwich covariance for the actual (possibly unweighted) estimator.
    No residual-based multiplication or second 'fit error' is added.
    """
    values = np.asarray(values, float)
    metric, analysis = obj.req.metric, obj.analysis
    model = copy.deepcopy(obj.model)
    for path, v in zip(obj.paths, values):
        put(model, path, v)
    y = _prediction_vector(model, obj.obs.angles, metric)
    scales = np.array([max(abs(v), 1) for v in values])
    columns = []
    for i, (path, value) in enumerate(zip(obj.paths, values)):
        step = max(abs(value) * 1e-5, 1e-5 if path.endswith('thickness_nm') else 1e-7)
        lo, hi = max(value - step, 1e-12 if path.endswith('.n') else 0), value + step
        ma, mb = copy.deepcopy(model), copy.deepcopy(model)
        put(ma, path, lo); put(mb, path, hi)
        columns.append(_difference(_prediction_vector(mb, obj.obs.angles, metric), _prediction_vector(ma, obj.obs.angles, metric), metric) / (hi-lo) * scales[i])
    J = np.column_stack(columns)
    width = 3 if metric == 'stokes' else 2
    weights = []
    for j, count in enumerate(analysis.raw.counts):
        if analysis.active:
            weights.append(count * analysis.precisions[j])
        else:
            weights.append(np.eye(width) * (count if obj.req.duplicate_policy != 'average' else 1))
    W = block_diag(*weights)
    information = J.T @ W @ J
    singular = np.linalg.svd(information, compute_uv=False)
    weak = bool(singular[-1] <= max(1e-15, singular[0] * 1e-12))
    result = dict(available=False, method='Lokale Kovarianzfortpflanzung', statistical=None, calibration=None,
        combined=None, covariance_statistical=None, correlation=None, bootstrap95=None,
        calibration_sources=[], weak=weak, note='Messstreuung wird durch den Fit fortgepflanzt; kein zusätzlicher pauschaler Fitfehler.')
    weighted_jac=np.vstack([np.linalg.cholesky(w).T@J[j*width:(j+1)*width] for j,w in enumerate(weights)])
    sj=np.linalg.svd(weighted_jac,compute_uv=False)
    rank=int(np.sum(sj>max(1e-13,sj[0]*1e-10)))
    coupling=None;relation=None
    if len(values)==2:
        denom=math.sqrt(max(0.,information[0,0]*information[1,1]))
        coupling=float(np.clip(-information[0,1]/denom,-1,1)) if denom>0 else None
        dependent=next((i for i,path in enumerate(obj.paths) if path.endswith('thickness_nm')),0)
        independent=1-dependent
        if not weak and information[dependent,dependent]>1e-15:
            slope=-information[dependent,independent]/information[dependent,dependent]*scales[dependent]/scales[independent]
            relation=dict(dependent_index=dependent,independent_index=independent,slope=float(slope),center=values.tolist(),
                note='Lokale lineare Kompensationsrichtung der gewählten Lösungsfamilie; keine globale exakte Lösungskurve.')
    result.update(sensitivity_rank=rank,sensitivity_singular_values=sj.tolist(),
        condition_number=float(sj[0]/sj[-1]) if sj[-1]>0 else None,coupling_correlation=coupling,
        strongly_correlated=coupling is not None and abs(coupling)>.995,local_relation=relation)
    if weak:
        result['note'] = 'Rangdefekt oder sehr starke Parameterkorrelation; keine verlässlichen lokalen Fehlerbalken.'
        return result
    operator = np.diag(scales) @ np.linalg.solve(information, J.T @ W)
    Cstat = None
    if analysis.complete:
        covs = analysis.stokes_covariances if metric == 'stokes' else analysis.covariances
        Cy = block_diag(*[c / n for c, n in zip(covs, analysis.raw.counts)])
        Cstat = operator @ Cy @ operator.T
        result.update(available=True, statistical=np.sqrt(np.maximum(np.diag(Cstat), 0)).tolist(), covariance_statistical=Cstat.tolist())
        if len(values) == 2 and np.prod(result['statistical']) > 0:
            result['correlation'] = float(Cstat[0, 1] / np.prod(result['statistical']))
    else:
        result['note'] = 'Statistische Parameterunsicherheit mangels geeigneter Wiederholungen nicht bestimmbar.'
    Ccal = np.zeros((len(values), len(values)))
    cal = obj.req.calibration
    sources = []
    if cal.angle_deg is not None and cal.angle_deg > 0:
        sources.append(('Einfallswinkel', 'angle', cal.angle_deg))
    if cal.wavelength_nm is not None and cal.wavelength_nm > 0:
        sources.append(('Wellenlänge', 'wavelength_nm', cal.wavelength_nm))
    for location, medium in [('ambient', model['ambient']), ('substrate', model['substrate']), *[(f'layers.{i}', l) for i, l in enumerate(model['layers'])]]:
        for field in ('n', 'k'):
            path = location + '.' + field
            uncertainty = medium.get('uncertainty_' + field)
            if path not in obj.paths and uncertainty is not None and uncertainty > 0:
                sources.append((parameter_label(model, path), path, uncertainty))
    for name, path, sigma in sources:
        ma, mb = copy.deepcopy(model), copy.deepcopy(model)
        aa, ab = obj.obs.angles.copy(), obj.obs.angles.copy()
        if path == 'angle':
            lo, hi = -sigma, sigma
            if aa.min()+lo <= 0 or ab.max()+hi >= 90:
                continue
            aa += lo; ab += hi
        elif path == 'wavelength_nm':
            center = model[path]; lo, hi = max(center-sigma, center*.5), center+sigma
            ma[path], mb[path] = lo, hi
        else:
            from .core import get
            center = get(model, path); lo, hi = max(center-sigma, 1e-12 if path.endswith('.n') else 0), center+sigma
            put(ma, path, lo); put(mb, path, hi)
        derivative = _difference(_prediction_vector(mb, ab, metric), _prediction_vector(ma, aa, metric), metric) / (hi-lo)
        response = operator @ derivative * sigma
        Ccal += np.outer(response, response)
        result['calibration_sources'].append(dict(name=name, contribution=np.abs(response).tolist()))
    if result['calibration_sources']:
        result['calibration'] = np.sqrt(np.maximum(np.diag(Ccal), 0)).tolist()
        if Cstat is not None:
            result['combined'] = np.sqrt(np.maximum(np.diag(Cstat + Ccal), 0)).tolist()
    # Paired, within-angle bootstrap, restricted to the selected local family.
    # Original estimated covariance weights stay fixed (conditional bootstrap).
    if bootstrap and analysis.complete and min(analysis.raw.counts) >= 6:
        from .core import stokes as _stokes
        rng = np.random.default_rng(1337)
        samples, boundary_count = [], 0
        center_z = obj.encode(values)[0]
        lower, upper = np.maximum(0, center_z-.12), np.minimum(1, center_z+.12)
        # A thickness period must not be crossed by a bootstrap local fit.
        from .core import period
        if len(obj.obs.angles) == 1:
            for i, path in enumerate(obj.paths):
                t = period(model, path, float(obj.obs.angles[0]))
                if t:
                    va, vb = values.copy(), values.copy()
                    va[i] = max(obj.req.parameters[i].lower, values[i]-.45*t)
                    vb[i] = min(obj.req.parameters[i].upper, values[i]+.45*t)
                    lower[i], upper[i] = obj.encode(va)[0, i], obj.encode(vb)[0, i]
        roots = [np.linalg.cholesky(w) for w in weights]
        for _ in range(bootstrap):
            if obj.cancel.is_set():
                from .core import Cancelled
                raise Cancelled()
            means = []
            for d, p in zip(analysis.raw.ds, analysis.raw.ps):
                idx = rng.integers(0, len(d), len(d))
                if metric == 'stokes':
                    means.append(_stokes(d[idx], p[idx]).mean(axis=0))
                else:
                    mid = np.rad2deg(np.angle(np.mean(np.exp(1j*np.deg2rad(d)))))
                    means.append(np.array([np.mean(mid+wrap(d[idx]-mid)), np.mean(p[idx])]))
            target = np.array(means)
            def residual(z):
                fitted = obj.decode(z)
                d, p = simulate(obj.model, obj.obs.angles, fitted, obj.paths)
                pred = _stokes(d[0], p[0]) if metric == 'stokes' else np.column_stack((d[0], p[0]))
                diff = pred-target
                if metric == 'angular': diff[:, 0] = wrap(diff[:, 0])
                return np.concatenate([diff[j] @ roots[j] for j in range(len(diff))])
            fit = least_squares(residual, np.clip(center_z, lower+1e-12, upper-1e-12), bounds=(lower, upper), max_nfev=160)
            if fit.success and np.isfinite(fit.fun).all():
                samples.append(obj.decode(fit.x)[0])
                boundary_count += int(np.any(np.minimum(fit.x-lower, upper-fit.x) <= 1e-5*(upper-lower)))
        if len(samples) >= max(20, int(.8*bootstrap)):
            result['bootstrap_samples'] = len(samples)
            result['bootstrap_boundary_hits'] = boundary_count
            if boundary_count:
                result['bootstrap_note'] = f'Kein Bootstrapintervall: {boundary_count} von {len(samples)} lokalen Fits erreichen eine Grenze. Ein Intervall wäre dadurch beschnitten.'
            else:
                result['bootstrap95'] = np.percentile(samples, [2.5, 97.5], axis=0).T.tolist()
                result['bootstrap_note'] = 'Bedingter paarweiser Bootstrap mit festen geschätzten Gewichten; ausgewählte Lösungsfamilie. Keine globale Eindeutigkeitsaussage.'
    return result


def group_periodic_candidates(obj, candidates, flat=False):
    """Only analytic lossless aliases become one family. Similar Q is insufficient."""
    from .core import period
    dcols = [i for i, p in enumerate(obj.paths) if p.endswith('thickness_nm')]
    groups = []
    for z, q in candidates:
        values = obj.decode(z)[0]
        model = copy.deepcopy(obj.model)
        for path, v in zip(obj.paths, values): put(model, path, v)
        periods = [period(model, obj.paths[i], float(obj.obs.angles[0])) for i in dcols] if len(obj.obs.angles)==1 and dcols and not flat else []
        periods = periods if all(t is not None for t in periods) else []
        key = values.copy()
        if periods:
            for i, t in zip(dcols, periods):
                lower = obj.req.parameters[i].lower
                key[i] = lower + ((values[i]-lower) % t)
                if abs(key[i]-(lower+t)) < 1e-3: key[i] = lower
        match = None
        if periods:
            for group in groups:
                if not group['periods']: continue
                tolerance = np.array([max(1e-3, abs(t)*1e-5) if i in dcols else max(1e-6,abs(values[i])*1e-5) for i,t in enumerate([periods[dcols.index(i)] if i in dcols else 1 for i in range(len(values))])])
                if np.all(abs(group['key']-key) <= tolerance):
                    match = group; break
        if match is None:
            match=dict(key=key, periods=periods, dcols=dcols, members=[])
            groups.append(match)
        match['members'].append((z, q, values))
    for group in groups:
        group['members'].sort(key=lambda m: tuple(m[2][i] for i in dcols) if dcols else tuple(m[2]))
        group['q']=min(m[1] for m in group['members'])
    return sorted(groups, key=lambda g:g['q'])
