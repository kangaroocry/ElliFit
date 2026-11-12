"""Numerical minimum checks and conditional parameter-profile diagnostics."""
from __future__ import annotations

import copy
import math
import numpy as np
from scipy.optimize import least_squares, minimize_scalar
from scipy.stats import f as f_distribution

from .core import period, put, safe_list, simulate, wrap


def check_minimum(obj, z):
    """Check feasible stationarity and nearby descent in normalized coordinates."""
    z = np.asarray(z, float)
    residual = obj.residual(z)
    q = float(residual @ residual)
    if not np.isfinite(q) or q>=1e70:
        return False,(z,q),dict(stationarity=None,singular_values=[])
    columns = []
    for i in range(len(z)):
        lo, hi = z.copy(), z.copy()
        lo[i], hi[i] = max(0., z[i]-2e-6), min(1., z[i]+2e-6)
        if obj.hybrid[i] and obj.decode(z)[0,i]<1e-7:
            physical=obj.decode(z)[0]
            left,right=physical.copy(),physical.copy()
            left[i]=max(obj.req.parameters[i].lower,physical[i]-1e-7)
            right[i]=min(obj.req.parameters[i].upper,physical[i]+1e-7)
            lo[i],hi[i]=obj.encode(left)[0,i],obj.encode(right)[0,i]
        columns.append((obj.residual(hi)-obj.residual(lo))/(hi[i]-lo[i]))
    jac = np.column_stack(columns)
    gradient = jac.T @ residual
    gradient[((z < 1e-6) & (gradient >= 0)) | ((z > 1-1e-6) & (gradient <= 0))] = 0
    denominator = np.maximum(np.linalg.norm(jac, axis=0)*max(1., np.linalg.norm(residual)), 1e-20)
    stationarity = float(np.max(abs(gradient)/denominator))
    _, singular, vectors = np.linalg.svd(jac, full_matrices=False)
    options = [(z, q)]
    directions=list(vectors)
    if len(z)==2:
        directions.extend([(vectors[0]+vectors[1])/math.sqrt(2),(vectors[0]-vectors[1])/math.sqrt(2)])
    for vector in directions:
        for h in (-1e-4, 1e-4):
            candidate = np.clip(z+h*vector, 0, 1)
            options.append((candidate, obj.scalar(candidate)))
    best = min(options, key=lambda item:item[1])
    descent = best[1] < q-1e-7*max(1., q)
    return stationarity < 3e-6 and not descent, best, dict(stationarity=stationarity, singular_values=singular.tolist())


def verify_candidates(obj, candidates):
    accepted, repaired, rejected = [], 0, 0
    for z, q in candidates:
        valid, better, _ = check_minimum(obj, z)
        if not valid:
            for _ in range(2):
                opt = least_squares(obj.residual, np.clip(better[0],1e-12,1-1e-12), bounds=(np.zeros(len(z)),np.ones(len(z))),
                    jac='3-point', diff_step=1e-6, x_scale='jac', max_nfev=1600, ftol=1e-13, xtol=1e-13, gtol=1e-10)
                z, q = opt.x, obj.scalar(opt.x)
                valid, better, _ = check_minimum(obj, z)
                if valid:
                    repaired += 1
                    break
        if valid:
            accepted.append((z,q))
        else:
            rejected += 1
    if not accepted:
        raise ValueError('Kein lokales Minimum numerisch bestätigt. Suchbereich, Modell oder Suchdichte prüfen.')
    old=getattr(obj,'minimum_checks',dict(checked=0,repaired=0,rejected=0))
    obj.minimum_checks = dict(checked=old['checked']+len(candidates), repaired=old['repaired']+repaired, rejected=old['rejected']+rejected,
        method='Skalierte Jacobi-Matrix, zulässige Stationarität und lokale Abstiegskontrolle')
    return accepted


def mean_deviation(obj, values):
    d,p = simulate(obj.model,obj.analysis.angles,np.asarray(values)[None,:],obj.paths)
    targets = obj.analysis.records
    residual = np.column_stack((wrap(d[0]-[r['mean_delta'] for r in targets]),p[0]-[r['mean_psi'] for r in targets]))
    rms = float(np.sqrt(np.mean(residual**2))) if np.isfinite(residual).all() else None
    statistic = None
    if rms is not None and len(targets)==1 and obj.analysis.active:
        statistic = float(obj.analysis.raw.counts[0]*(residual[0] @ obj.analysis.precisions[0] @ residual[0]))
    return dict(rmse_deg=rms, delta_deg=safe_list(residual[:,0]), psi_deg=safe_list(residual[:,1]),
        numerical_match=rms is not None and rms <= 1e-6, statistic=statistic)


def _profile_minimum(obj, fixed_col, fixed, grids):
    free_col=1-fixed_col
    values=[p.lower for p in obj.req.parameters];values[fixed_col]=fixed
    model=copy.deepcopy(obj.model)
    put(model,obj.paths[fixed_col],fixed)
    par=obj.req.parameters[free_col]
    t=period(model,par.path,float(obj.obs.angles[0]))
    low,high=par.lower,min(par.upper,par.lower+t) if t else par.upper
    if t:
        physical=np.linspace(low,high,81)
        points=np.tile(values,(len(physical),1));points[:,free_col]=physical
        grid=obj.encode(points)[:,free_col]
    else:
        grid=grids[free_col]
        if len(grid)>320:grid=grid[np.rint(np.linspace(0,len(grid)-1,320)).astype(int)]
    base=obj.encode(values)[0]
    points=np.tile(base,(len(grid),1));points[:,free_col]=grid
    scores=obj.batch(points)
    options=[(points[int(np.argmin(scores))],float(scores.min()))]
    idx=np.flatnonzero((scores<=np.r_[np.inf,scores[:-1]]) & (scores<=np.r_[scores[1:],np.inf]))
    for j in idx[np.argsort(scores[idx])[:8]]:
        def objective(x):
            candidate=base.copy();candidate[free_col]=x
            return obj.scalar(candidate)
        lo,hi=grid[max(0,j-1)],grid[min(len(grid)-1,j+1)]
        if hi<=lo:continue
        opt=minimize_scalar(objective,bounds=(lo,hi),method='bounded',options={'xatol':1e-12})
        z=base.copy();z[free_col]=opt.x;options.append((z,float(opt.fun)))
    z,q=min(options,key=lambda item:item[1])
    vals=obj.decode(z)[0]
    # Equal values over a phase cycle do not identify its thickness.
    flat=bool(np.ptp(scores)<1e-10*max(1.,abs(scores).max()))
    return vals,q,t,flat


def fit_diagnostics(obj, solutions, grids, progress=None):
    angles=len(obj.obs.angles);parameters=len(obj.paths)
    floor=float(np.sqrt(sum(np.sum(wrap(d-r['mean_delta'])**2)+np.sum((p-r['mean_psi'])**2)
        for d,p,r in zip(obj.analysis.raw.ds,obj.analysis.raw.ps,obj.analysis.records))/(2*obj.analysis.raw.count)))
    out=dict(unique_angles=angles, independent_mean_components=2*angles, free_parameters=parameters,
        lack_of_fit_dof=2*angles-parameters, saturated=2*angles==parameters, repeated_rms_floor_deg=floor,
        mean_match_tolerance_deg=1e-6, profile=None, phase_relation=None,
        note='Wiederholungen verbessern Mittelwerte und Streuungsschätzung, liefern aber keine weitere Messgeometrie.')
    for solution in solutions:
        solution['mean_fit']=mean_deviation(obj,solution['values'])
    if parameters!=2:return out
    best=solutions[0];uncertainty=best['uncertainty']
    out['strongly_correlated']=uncertainty.get('strongly_correlated',False)
    out['sensitivity_rank']=uncertainty.get('sensitivity_rank')
    out['condition_number']=uncertainty.get('condition_number')
    if angles!=1 or not (out['strongly_correlated'] or uncertainty.get('weak')):return out
    dcol=next((i for i,p in enumerate(obj.paths) if p.endswith('thickness_nm')),None)
    fixed_col=1-dcol if dcol is not None else 1
    free_col=1-fixed_col
    par=obj.req.parameters[fixed_col]
    base=np.geomspace(par.lower,par.upper,121) if par.scale=='log' and par.lower>0 else np.linspace(par.lower,par.upper,121)
    near=[]
    for solution in solutions:
        center=solution['values'][fixed_col]
        span=par.upper-par.lower
        near.extend(center+np.r_[0.,np.geomspace(1e-7*span,.02*span,21),-np.geomspace(1e-7*span,.02*span,21)])
    axis=np.unique(np.clip(np.r_[base,near],par.lower,par.upper))
    threshold=None
    m=int(obj.analysis.raw.counts[0])
    if obj.analysis.active and m>2:
        threshold=float(2*(m-1)/(m-2)*f_distribution.ppf(.95,2,m-2))
    profile=[];overlay=[]
    for step,fixed in enumerate(axis):
        if obj.cancel.is_set():
            from .core import Cancelled
            raise Cancelled()
        values,q,t,flat=_profile_minimum(obj,fixed_col,float(fixed),grids)
        # Include independently refined roots at their exact profile abscissa.
        # A scalar bounded search alone has a sqrt(machine epsilon) position
        # floor and need not reproduce a two-parameter root as accurately.
        for solution in solutions:
            anchor=np.asarray(solution['values'],float)
            if fixed!=anchor[fixed_col]:continue
            if t:
                lower=obj.req.parameters[free_col].lower
                anchor[free_col]=lower+(anchor[free_col]-lower)%t
            score=obj.scalar(obj.encode(anchor)[0])
            if score<=q+1e-12*max(1.,q):values,q=anchor,score
        mean=mean_deviation(obj,values)
        if mean['rmse_deg'] is None or q>=1e90:
            profile.append(dict(values=values.tolist(),q=None,rmse_deg=None,mean_rmse_deg=None,statistic=None,compatible95=None,flat_in_profiled_parameter=flat))
            continue
        obj.batch(obj.encode(values));raw=float(obj.last_rms[0])
        point=dict(values=values.tolist(),q=q,rmse_deg=raw,mean_rmse_deg=mean['rmse_deg'],statistic=mean['statistic'],
            compatible95=mean['statistic']<=threshold if threshold is not None else None,flat_in_profiled_parameter=flat)
        profile.append(point)
        variants=[values]
        if t and not flat:
            free=obj.req.parameters[free_col]
            first=math.ceil((free.lower-values[free_col])/t-1e-9);last=math.floor((free.upper-values[free_col])/t+1e-9)
            variants=[]
            for order in range(first,min(last+1,first+100)):
                alias=values.copy();alias[free_col]+=order*t;variants.append(alias)
        if not flat:
            overlay.extend(dict(values=v.tolist(),rmse_deg=raw,mean_rmse_deg=mean['rmse_deg']) for v in variants)
        if progress is not None and step%12==0:
            progress(90+2*(step+1)/len(axis),f'Talprofil: {step+1} / {len(axis)}')
    out['profile']=dict(fixed_index=fixed_col,profiled_index=free_col,points=profile,overlay=overlay,
        compatible95_threshold=threshold,compatible95_method='Hotelling-T² für den gemeinsamen Δ/Ψ-Mittelwert' if threshold is not None else None,
        repetitions=m,assumptions='Unabhängige normalverteilte lokale Winkelabweichungen; nur Messstreuung, feste Modell-/Kalibrierwerte. Bei wenigen Wiederholungen sind die Bereiche breit.',
        note='Numerisch minimierter Profilwert des anderen Parameters, mit analytischen Dickenwiederholungen. Talpunkte sind keine zusätzlichen lokalen Minima; ein endliches Raster kann Äste übersehen.')
    if dcol is not None:
        ncol=1-dcol;path=obj.paths[dcol];npath=obj.paths[ncol]
        if npath==path.rsplit('.',1)[0]+'.n':
            model=copy.deepcopy(obj.model)
            for p,v in zip(obj.paths,best['values']):put(model,p,v)
            layer=model['layers'][int(path.split('.')[1])]
            tangent=model['ambient']['n']*math.sin(math.radians(float(obj.obs.angles[0])))
            if layer['k']==0 and layer['n']>tangent:
                out['phase_relation']=dict(thickness_index=dcol,index_index=ncol,tangent_squared=tangent**2,
                    optical_thickness_nm=best['values'][dcol]*math.sqrt(best['values'][ncol]**2-tangent**2),
                    period_optical_nm=model['wavelength_nm']/2,
                    note='Näherungsweise konstante optische Phase. Fresnel-Amplituden hängen zusätzlich von n ab; dies ist keine exakte Δ/Ψ-Lösungskurve.')
    return out
