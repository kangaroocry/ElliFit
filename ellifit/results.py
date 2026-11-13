"""Result families, angular RMS, profiles and uncertainty reporting."""
from __future__ import annotations

import copy
import math
import time
import numpy as np
from scipy.optimize import brentq

from .core import comparison, fixed_value_minimum, medium_label, parameter_label, put, safe_list, simulate, wrap
from .statistics import group_periodic_candidates, parameter_uncertainty


def boundary(z):
    return bool(np.any(z < 1e-6) or np.any(z > 1-1e-6))


def alias_list(obj, group):
    members = group['members']
    base = members[0][2].copy()
    periods = group['periods']
    total = len(members)
    values = np.array([m[2] for m in members])
    if periods:
        axes=[];total=1
        for col, t in zip(group['dcols'], periods):
            p=obj.req.parameters[col]
            a=math.ceil((p.lower-base[col])/t-1e-10)
            b=math.floor((p.upper-base[col])/t+1e-10)
            total *= max(0,b-a+1)
            axes.append(base[col]+np.arange(a,min(b+1,a+200))*t)
        combos=np.column_stack([a.ravel() for a in np.meshgrid(*axes,indexing='ij')])[:200]
        values=np.tile(base,(len(combos),1));values[:,group['dcols']]=combos
    for i,p in enumerate(obj.req.parameters): values[:,i]=np.clip(values[:,i],p.lower,p.upper)
    encoded=obj.encode(values)
    scores=obj.batch(encoded)
    rms=obj.last_rms.copy()
    return [dict(index=i,values=v.tolist(),q=float(q),rmse_deg=float(r),at_boundary=boundary(z)) for i,(v,q,r,z) in enumerate(zip(values,scores,rms,encoded))],total


def k_profile(obj, col, values, best_q, grids, zero):
    p=obj.req.parameters[col]
    if zero is None:
        return dict(path=p.path,available=False,message='k = 0 liegt außerhalb des gewählten Suchbereichs.')
    z0,q0=zero
    v0=obj.decode(z0)[0]
    db,pb=simulate(obj.model,obj.obs.angles,np.asarray(values)[None,:],obj.paths)
    dz,pz=simulate(obj.model,obj.obs.angles,v0[None,:],obj.paths)
    influence=dict(delta_max_deg=float(np.max(abs(wrap(db-dz)))),psi_max_deg=float(np.max(abs(pb-pz))))
    result=dict(path=p.path,zero_values=v0.tolist(),zero_q=float(q0),influence=influence,
        available=obj.analysis.active,upper_limit=None,not_distinguishable=None,profile=None)
    if not obj.analysis.active:
        result['message']='Einfluss von k = 0 berechnet; ohne geeignete Messunsicherheiten ist keine statistische Nachweisgrenze bestimmbar.'
        return result
    threshold=2.705543454  # asymptotic 95% one-sided LR threshold at k=0
    difference=max(0,float(q0-best_q))
    result.update(delta_chi2=difference,threshold=threshold,not_distinguishable=difference<=threshold)
    if difference>threshold:
        result['message']='k = 0 ist im näherungsweisen Profilvergleich nicht mit der besten Lösung vereinbar.'
        return result
    x=np.unique(np.r_[0,np.geomspace(p.positive_min,p.upper,32),values[col]])
    q=[]
    for value in x:
        _,score=fixed_value_minimum(obj,col,float(value),grids)
        q.append(float(score))
    diff=np.maximum(np.asarray(q)-best_q,0)
    accepted=diff<=threshold
    # A bound is only reported for the connected region containing zero, with
    # no detected later accepted islands in the scanned interval.
    crossing=np.flatnonzero(~accepted)
    result['profile']=dict(k=x.tolist(),delta_chi2=diff.tolist())
    if len(crossing):
        j=int(crossing[0])
        if j>0 and not accepted[j:].any():
            def f(k):return fixed_value_minimum(obj,col,float(k),grids)[1]-best_q-threshold
            result['upper_limit']=float(brentq(f,x[j-1],x[j],xtol=max(1e-15,p.positive_min*1e-4)))
            result['message']='k ist nicht von null unterscheidbar. Näherungsweise Profil-Obergrenze im untersuchten Bereich verfügbar.'
        else:
            result['message']='k = 0 ist vereinbar, aber das Profil enthält getrennte Bereiche; keine einzelne Obergrenze ausgewiesen.'
    else:
        result['message']='k = 0 ist vereinbar; bis zur Suchobergrenze wurde keine Nachweisgrenze gefunden.'
    result['note']='Asymptotischer einseitiger 95-%-Profilvergleich mit geschätzten Wiederholkovarianzen; keine exakte Aussage bei kleinen Stichproben oder Modellfehlern.'
    return result


def finalize(request,obj,candidates,grids,points,scores,rms_grid,periodicity,warnings,flat,started,progress,zeros):
    if flat:candidates=candidates[:1]
    # Only the globally best boundary candidate is retained. k=0 remains
    # independently available to the zero/profile comparison even if excluded.
    discarded=getattr(obj,'discarded_boundary_candidates',0)+sum(boundary(z) for z,q in candidates[1:])
    candidates=[c for i,c in enumerate(candidates) if i==0 or not boundary(c[0])]
    families=group_periodic_candidates(obj,candidates,flat)
    # Numerical ties carry no preference between distinct interpolating roots.
    # Make their order deterministic using the first in-range parameter tuple.
    ordered=[];cluster=[];anchor=None
    for family in families:
        if anchor is not None and abs(family['q']-anchor)>1e-10*max(1.,abs(anchor)):
            ordered.extend(sorted(cluster,key=lambda g:tuple(g['key'])));cluster=[];anchor=None
        if anchor is None:anchor=family['q']
        cluster.append(family)
    ordered.extend(sorted(cluster,key=lambda g:tuple(g['key'])))
    families=ordered
    solutions=[];all_aliases=[]
    progress(88,'Periodenfamilien und Parameterunsicherheiten')
    for rank,group in enumerate(families,1):
        aliases,total=alias_list(obj,group)
        if not aliases:continue
        preferred=next((a for a in aliases if not a['at_boundary']),aliases[0])
        periods=[dict(path=obj.paths[i],period_nm=float(t),label=parameter_label(obj.model,obj.paths[i])) for i,t in zip(group['dcols'],group['periods'])]
        row=dict(rank=rank,values=preferred['values'],q=group['q'],sqrt_q=math.sqrt(max(0,group['q'])),
            rmse_deg=preferred['rmse_deg'],at_boundary=preferred['at_boundary'],
            aliases=aliases,alias_count=total,representative_alias=preferred['index'],periods=periods,
            periodic=bool(periods and total>1))
        row['uncertainty']=parameter_uncertainty(obj,row['values'],request.bootstrap_samples if rank==1 else 0)
        if obj.analysis.active:
            dof=2*obj.analysis.raw.count-len(obj.paths)
            row['reduced_chi2']=row['q']/dof if dof>0 else None
        solutions.append(row)
        all_aliases.extend([a|dict(rank=rank) for a in aliases])
    if not solutions:raise ValueError('Keine innere Lösung gefunden. Suchbereich vergrößern.')
    best=solutions[0]
    from .diagnostics import fit_diagnostics
    progress(90,'Bestimmbarkeit und numerisches Talprofil')
    diagnostics=fit_diagnostics(obj,solutions,grids,progress)
    if diagnostics['saturated']:
        warnings.append('Gesättigter Fit: zwei freie Parameter bei einem Messwinkel. Die Winkelmittelwerte können interpoliert werden; es bleiben keine unabhängigen Freiheitsgrade zur Modellprüfung. χ²red aus derselben Wiederholstreuung ist hier kein Gütenachweis.')
    if diagnostics.get('strongly_correlated'):
        warnings.append('Die Parameter sind stark gekoppelt. Das numerische Talprofil zeigt Kompensationspaare; Talpunkte sind keine zusätzlichen exakten Lösungen. Lokale Unsicherheiten gelten nur innerhalb der gewählten Familie.')
    for s in solutions:s['equivalent']=s['rmse_deg']<=best['rmse_deg']+request.equivalence_deg+1e-9
    for alias in all_aliases:alias['equivalent']=alias['rmse_deg']<=best['rmse_deg']+request.equivalence_deg+1e-9
    if best['at_boundary']:
        best_z=obj.encode(best['values'])[0]
        physical_zero=[p.path.endswith('.k') and p.lower==0 and best['values'][i]<p.positive_min*1e-3 for i,p in enumerate(request.parameters)]
        if any(physical_zero):
            warnings.append('Der beste Fit liegt bei k = 0, der physikalischen Nullgrenze. Kein negatives k erforderlich.')
        if any((z<1e-6 or z>1-1e-6) and not zero for z,zero in zip(best_z,physical_zero)):
            warnings.append('Das global kleinste Minimum liegt an einer Suchgrenze. Bitte den Suchbereich vergrößern.')
    if best['uncertainty']['weak']:
        warnings.append(best['uncertainty']['note'])
    if best.get('reduced_chi2') is not None and best['reduced_chi2']>3:
        warnings.append('Die Residuen sind größer als aus den Wiederholungen erwartet. Probe, Drift, Kalibrierung und Schichtmodell prüfen; Unsicherheiten wurden nicht pauschal aufgebläht.')
    if len(obj.obs.angles)==1 and len(obj.paths)==2:
        warnings.append('Ein Messwinkel liefert zwei unabhängige Messgrößen. Wiederholungen lösen eine globale Mehrdeutigkeit nicht auf.')
    zero_tests=[]
    for col,p in enumerate(request.parameters):
        if p.path.endswith('.k'):
            progress(93,'k = 0 und mögliche Nachweisgrenze prüfen')
            zero_tests.append(k_profile(obj,col,best['values'],best['q'],grids,zeros.get(col)))
    axes=[]
    for i,g in enumerate(grids):
        z=np.zeros((len(g),len(obj.paths)));z[:,i]=g
        axes.append(obj.decode(z)[:,i].tolist())
    shape=tuple(len(g) for g in grids)
    surface=dict(axes=axes,q=safe_list(scores.reshape(shape) if len(shape)==1 else scores.reshape(shape).T),
        rms=safe_list(rms_grid.reshape(shape) if len(shape)==1 else rms_grid.reshape(shape).T),
        scales=[p.scale for p in request.parameters],zero_floors=[p.positive_min if p.path.endswith('.k') and p.lower==0 else None for p in request.parameters])
    if len(shape)==1:
        offsets=np.geomspace(2e-8,.004,18)
        centers=[obj.encode(a['values'])[0,0] for a in all_aliases]
        detail=np.unique(np.clip(np.concatenate([np.r_[z-offsets,z,z+offsets] for z in centers]),0,1))
        dq=obj.batch(detail[:,None]);dr=obj.last_rms.copy()
        x=np.r_[grids[0],detail];q=np.r_[scores,dq];r=np.r_[rms_grid,dr];order=np.argsort(x)
        surface.update(axes=[obj.decode(x[order,None])[:,0].tolist()],q=safe_list(q[order]),rms=safe_list(r[order]))
    from .landscape import build_landscape
    mesh,regions=build_landscape(obj,grids,solutions,diagnostics,progress)
    if mesh:surface['mesh']=mesh
    diagnostics['regions']=regions
    equal=[a for a in all_aliases if a['equivalent']]
    periodicity['first_solutions']=sorted(equal,key=lambda a:tuple(a['values']))[:12]
    periodicity['equivalent_count']=sum(s['equivalent'] for s in solutions)
    periodicity['alias_count']=sum(s['alias_count'] for s in solutions if s['equivalent'])
    periodicity['message']='Echte periodische Wiederholungen sind je Familie zu einem Listeneintrag zusammengefasst.' if any(s['periodic'] for s in solutions) else 'Keine exakte Periodenfamilie nachgewiesen. Ähnliche Fitgüte allein bedeutet keine Periodizität.'
    # Legacy metadata kept for reading existing report tooling.
    best_periods=best['periods']
    periodicity['periods']=best_periods
    if best_periods:periodicity['kind']='exact' if len(obj.paths)==1 else 'lattice' if len(best_periods)==2 else 'conditional'
    result=dict(model=obj.model,parameters=[p.model_dump()|dict(label=parameter_label(obj.model,p.path),medium_label=medium_label(obj.model,p.path)) for p in request.parameters],
        settings=request.model_dump(exclude={'model','parameters','measurements'}),solutions=solutions,surface=surface,
        periodicity=periodicity,measurement_uncertainty=obj.analysis.public(),zero_tests=zero_tests,identifiability=diagnostics,
        minimum_checks=getattr(obj,'minimum_checks',None),
        rms_definition=dict(formula='sqrt[Σ(wrap(Δtheo − Δexp)² + (Ψtheo − Ψexp)²) / (2N)]',unit='degree',lower_is_better=True,
            note='Absolute Winkelabweichung über alle ausgewählten Rohwerte; kein Signifikanztest oder Beweis physikalischer Plausibilität.'),
        warnings=list(dict.fromkeys(warnings)),discarded_boundary_minima=discarded,
        counts=dict(selected=len(obj.rows),effective=obj.obs.count,angles=len(obj.obs.angles),grid=len(points),evaluations=obj.calls,families=len(solutions),aliases=sum(s['alias_count'] for s in solutions)),
        elapsed_seconds=time.perf_counter()-started,comparison=comparison(request,best['values']))
    labels={}
    for row in obj.rows:
        key=(row['source'],row['comment'])
        labels[key]=labels.get(key,0)+1
    result['measurement_context']=dict(count=len(obj.rows),label_count=len(labels),
        labels=[dict(source=s,comment=c,count=n) for (s,c),n in list(labels.items())[:200]],
        omitted_labels=max(0,len(labels)-200))
    progress(100,'Fit abgeschlossen')
    return result
