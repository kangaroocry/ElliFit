"""Evaluate a visible parameter rectangle without changing a completed fit."""
import numpy as np
from .core import Objective, safe_list


def evaluate_view(request, bounds, scales, size=161, anchors=()):
    if len(bounds)!=len(request.parameters) or len(scales)!=len(bounds):raise ValueError('Falsche Anzahl Parametergrenzen.')
    axes=[];clipped=[]
    for parameter,pair,scale in zip(request.parameters,bounds,scales):
        if len(pair)!=2 or not np.isfinite(pair).all():raise ValueError('Endliche Grenzen erforderlich.')
        lo,hi=max(parameter.lower,min(pair)),min(parameter.upper,max(pair))
        if not lo<hi:raise ValueError('Der sichtbare Ausschnitt liegt außerhalb des berechneten Suchbereichs.')
        if scale not in ('linear','log'):raise ValueError('Unbekannte Achsenskalierung.')
        if scale=='log' and lo>0:axis=np.geomspace(lo,hi,size)
        elif scale=='log':axis=parameter.positive_min*np.expm1(np.linspace(np.log1p(lo/parameter.positive_min),np.log1p(hi/parameter.positive_min),size))
        else:axis=np.linspace(lo,hi,size)
        axes.append(axis);clipped.append([lo,hi])
    values=axes[0][:,None] if len(axes)==1 else np.column_stack([g.ravel() for g in np.meshgrid(*axes,indexing='xy')])
    obj=Objective(request);q=[];rms=[]
    chunk=max(1,min(4000,250000//max(1,len(obj.obs.angles))))
    for start in range(0,len(values),chunk):
        q.extend(obj.batch(obj.encode(values[start:start+chunk])));rms.extend(obj.last_rms)
    shape=(size,) if len(axes)==1 else (size,size)
    out=dict(axes=[a.tolist() for a in axes],rms=safe_list(np.array(rms).reshape(shape)),q=safe_list(np.array(q).reshape(shape)),bounds=clipped,
        scales=scales,zero_floors=[p.positive_min if p.lower==0 and p.scale=='log' else None for p in request.parameters],evaluations=len(values),optimized=False,
        note='Nachgerechnete Darstellung des abgeschlossenen Fits; die Lösungsliste wurde nicht neu optimiert.')
    if len(axes)==2:
        # Evaluated minima and valley anchors remain vertices in the local mesh.
        extra=np.asarray([v for v in anchors if all(lo<=x<=hi for x,(lo,hi) in zip(v,clipped))],float)
        mesh_values=values
        mesh_rms=np.array(rms)
        if len(extra):
            obj.batch(obj.encode(extra));mesh_rms=np.r_[mesh_rms,obj.last_rms];mesh_values=np.vstack((values,extra))
        encoded=obj.encode(mesh_values)
        from .landscape import _triangles
        _,indices=np.unique(np.round(encoded,12),axis=0,return_index=True);indices=np.sort(indices)
        out['mesh']=dict(values=mesh_values[indices].tolist(),rms=safe_list(mesh_rms[indices]),triangles=_triangles(encoded[indices]).tolist())
    return out
