"""Continue separate conditional valleys in normalized search coordinates."""
from __future__ import annotations
import numpy as np
from scipy.optimize import least_squares
from .core import Cancelled


def continue_branch(obj, seed, fixed, step=.009, limit=240):
    """Follow the same local free-parameter minimum; stop at either box edge."""
    free=1-fixed;seed=np.clip(np.asarray(seed,float),0,1)
    if np.any((seed<2e-6)|(seed>1-2e-6)):return seed[None,:]
    def walk(direction):
        points=[];previous=seed.copy();h=step
        for _ in range(limit):
            if obj.cancel.is_set():raise Cancelled()
            target=float(np.clip(previous[fixed]+direction*h,0,1))
            if abs(target-previous[fixed])<1e-10:break
            lo,hi=max(0.,previous[free]-.055),min(1.,previous[free]+.055)
            def residual(value):
                z=previous.copy();z[fixed]=target;z[free]=value[0]
                return obj.residual(z)
            fit=least_squares(residual,[np.clip(previous[free],lo+1e-12,hi-1e-12)],bounds=([lo],[hi]),
                jac='3-point',diff_step=1e-5,xtol=2e-12,ftol=2e-12,gtol=1e-10,max_nfev=100)
            z=previous.copy();z[fixed]=target;z[free]=fit.x[0]
            at_box=bool(np.any(z<2e-6)|np.any(z>1-2e-6))
            at_local=not at_box and min(z[free]-lo,hi-z[free])<2e-5
            # A steep turn or a different branch requires a shorter fixed step.
            if (at_local or abs(z[free]-previous[free])>.035) and h>step/64:
                h/=2;continue
            if at_local or not fit.success:break
            points.append(z);previous=z
            if at_box:break
            h=min(step,h*1.4)
        return points
    left=walk(-1);right=walk(1)
    return np.array([*left[::-1],seed,*right])


def build_profiles(obj, solutions, fixed, threshold, progress=None):
    from .diagnostics import mean_deviation
    branches=[];overlay=[];all_points=[];seeds=[];seen=[]
    for family,solution in enumerate(solutions,1):
        for alias in solution.get('aliases',[dict(index=0,values=solution['values'])]):
            z=obj.encode(alias['values'])[0]
            if any(np.max(abs(z-old))<1e-8 for old in seen):continue
            seen.append(z);seeds.append((solution.get('rank',family),alias.get('index',0),z))
    for number,(family,alias,seed) in enumerate(seeds[:32]):
        zz=continue_branch(obj,seed,fixed)
        # Preserve other confirmed roots on this very continuation, even when
        # their narrow dip falls between two ordinary profile samples.
        extra=[]
        if len(zz)>1:
            free=1-fixed
            for _,_,anchor in seeds:
                if not zz[0,fixed]<=anchor[fixed]<=zz[-1,fixed]:continue
                predicted=float(np.interp(anchor[fixed],zz[:,fixed],zz[:,free]))
                if abs(predicted-anchor[free])>.02:continue
                lo,hi=max(0.,predicted-.035),min(1.,predicted+.035)
                def residual(v):
                    z=anchor.copy();z[free]=v[0];return obj.residual(z)
                opt=least_squares(residual,[np.clip(predicted,lo+1e-12,hi-1e-12)],bounds=([lo],[hi]),jac='3-point',
                    diff_step=1e-5,xtol=2e-12,ftol=2e-12,gtol=1e-10,max_nfev=100)
                if abs(opt.x[0]-anchor[free])<2e-6:extra.append(anchor)
        if extra:
            zz=np.vstack((zz,extra));_,keep=np.unique(np.round(zz,12),axis=0,return_index=True);zz=zz[np.sort(keep)];zz=zz[np.argsort(zz[:,fixed])]
        values=obj.decode(zz);branch_id=f'{family}:{alias}' 
        obj.batch(zz);rms=obj.last_rms.copy();scores=obj.analysis.sse(*obj.prediction(zz))
        points=[]
        for i,value in enumerate(values):
            mean=mean_deviation(obj,value)
            point=dict(values=value.tolist(),q=float(scores[i]),rmse_deg=float(rms[i]) if np.isfinite(rms[i]) else None,mean_rmse_deg=mean['rmse_deg'],statistic=mean['statistic'],
                compatible95=mean['statistic']<=threshold if threshold is not None and mean['statistic'] is not None else None,
                flat_in_profiled_parameter=False,branch=branch_id,family=family,alias=alias,
                at_boundary=bool(np.any(zz[i]<2e-6)|np.any(zz[i]>1-2e-6)))
            root=next(((f,a) for f,a,z in seeds if np.max(abs(z-zz[i]))<2e-8),None)
            if root:point.update(minimum_family=root[0],minimum_alias=root[1])
            points.append(point)
        branches.append(dict(id=branch_id,family=family,alias=alias,points=points,
            ends=[dict(at_boundary=points[j]['at_boundary'],values=points[j]['values']) for j in (0,-1)]))
        all_points.extend(points);overlay.extend(points)
        if progress:progress(90+2*(number+1)/max(1,len(seeds[:32])),f'Talast {number+1} / {min(32,len(seeds))}')
    return dict(fixed_index=fixed,profiled_index=1-fixed,points=all_points,overlay=overlay,branches=branches,
        computed_branches=len(branches),omitted_branches=max(0,len(seeds)-32),sampling='Adaptive Fortsetzung in den linearen/logarithmischen Suchkoordinaten',
        boundary_rule='Ein Talast endet beim Erreichen einer Grenze eines der beiden Parameter; kein Verlauf entlang der Grenze.')
