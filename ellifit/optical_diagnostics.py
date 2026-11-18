"""Local optical diagnostics for the selected stack and measurement geometry."""
import copy

import numpy as np
from scipy.optimize import minimize_scalar

from .core import finite_number, fixed_value_minimum, phase_grid, reflection, safe_list, simulate, stokes, stokes_direction, wrap


def residual_summary(rows):
    delta = np.array([r['delta_residual'] for r in rows], float)
    psi = np.array([r['psi_residual'] for r in rows], float)
    measured = stokes([r['delta'] for r in rows], [r['psi'] for r in rows])
    fitted = stokes(np.array([r['fit_delta'] for r in rows], float), np.array([r['fit_psi'] for r in rows], float))
    return dict(delta_rms=finite_number(np.sqrt(np.mean(delta**2))), psi_rms=finite_number(np.sqrt(np.mean(psi**2))),
                stokes_chord_rms=finite_number(np.sqrt(np.mean(np.sum((fitted-measured)**2, axis=1)))))


def optical_sensitivity(model, groups, layer):
    angles = np.unique([g['angle'] for g in groups])
    if layer is not None and not 0 <= layer < len(model['layers']):
        raise ValueError('Diese Schicht gehört nicht zum Fitmodell.')
    rp, _ = reflection(model, angles)
    delta, psi = simulate(model, angles)
    shifts = None
    if layer is not None:
        plus = copy.deepcopy(model)
        plus['layers'][layer]['thickness_nm'] += 1.
        dd, pp = simulate(plus, angles)
        shifts = {float(a): (finite_number(d), finite_number(p)) for a,d,p in zip(angles,wrap(dd-delta)[0],(pp-psi)[0])}
    # This is an angular scan of the full stack in the incident medium. Bound
    # its cost even for extremely optically thick or highly oscillatory films.
    optical_length = sum(m['n']*m['thickness_nm'] for m in model['layers'])
    target = max(721, int(64 * optical_length / model['wavelength_nm']) + 1)
    grid = np.unique(np.r_[np.linspace(.001, 89.999, min(target, 8193)), angles])
    power = np.abs(reflection(model, grid)[0][0])**2
    minima = np.flatnonzero((power[1:-1] < power[:-2]) & (power[1:-1] <= power[2:]))+1
    if np.ptp(power) <= 1e-14:
        minima = np.array([], int)
    nearby = {}
    for a in angles:
        if not len(minima):
            break
        i = int(minima[np.argmin(abs(grid[minima]-a))])
        if i not in nearby:
            opt = minimize_scalar(lambda x: abs(reflection(model, [x])[0][0,0])**2,
                                  bounds=(grid[i-1], grid[i+1]), method='bounded', options={'xatol': 1e-9})
            nearby[i] = dict(angle_deg=float(opt.x), rp=finite_number(opt.fun))
    scan = []
    for j, a in enumerate(angles):
        nearest = min(nearby.values(), key=lambda m: abs(m['angle_deg']-a)) if nearby else None
        dd, dp = shifts[float(a)] if shifts is not None else (None,None)
        scan.append(dict(angle_deg=float(a), rp=finite_number(abs(rp[0,j])**2), nearest=nearest, delta_change=dd, psi_change=dp))
    return dict(rows=scan, layer=layer, delta_d_nm=1., minimum_count=len(minima), resolution_limited=target>8193,
                range_deg=[float(grid[0]), float(grid[-1])])


def _zero_segments(obj, x, y, field, circular):
    """Interpolate zero crossings in the same coordinates used for the search."""
    segments = []
    for corners in [((0,0),(0,1),(1,1)), ((0,0),(1,1),(1,0))]:
        values = np.stack([field[dy:dy+len(y)-1, dx:dx+len(x)-1] for dy,dx in corners], axis=-1)
        low, high = np.min(values,axis=-1), np.max(values,axis=-1)
        eligible = (low <= 0) & (high >= 0) & (high > low)
        if circular:
            eligible &= (high-low < 180)
        rows, cols = np.nonzero(eligible)
        if not len(rows):
            continue
        verts = np.stack([np.column_stack((x[cols+dx],y[rows+dy])) for dy,dx in corners],axis=1)
        vals = values[rows,cols]
        hits = [[] for _ in rows]
        for i, j in ((0,1),(1,2),(2,0)):
            cross = ((vals[:,i] <= 0) & (vals[:,j] > 0)) | ((vals[:,j] <= 0) & (vals[:,i] > 0))
            indices = np.flatnonzero(cross)
            t = vals[indices,i]/(vals[indices,i]-vals[indices,j])
            z = verts[indices,i] + t[:,None]*(verts[indices,j]-verts[indices,i])
            for k, point in zip(indices, obj.decode(z)):
                hits[k].append(point.tolist())
        segments.extend(s for s in hits if len(s)==2 and s[0]!=s[1])
    return segments


def measurement_lines(obj, group, bounds=None):
    if len(obj.paths) != 2 or not 0 <= group < len(obj.analysis.records):
        raise ValueError('Zwei Fitparameter und eine vorhandene Messgruppe auswählen.')
    axes, limited = [], False
    for i, p in enumerate(obj.req.parameters):
        lo, hi = (p.lower,p.upper) if bounds is None else bounds[i]
        if not np.isfinite([lo,hi]).all() or not p.lower <= lo < hi <= p.upper:
            raise ValueError('Der Ausschnitt liegt außerhalb des Suchbereichs.')
        endpoints = np.array([[q.lower for q in obj.req.parameters],[q.upper for q in obj.req.parameters]])
        endpoints[:,i] = [lo,hi]
        left,right = obj.encode(endpoints)[:,i]
        grid, cut = phase_grid(obj,i,101,361)
        axes.append(np.unique(np.r_[np.linspace(left,right,121), grid[(grid>left)&(grid<right)]]))
        limited |= cut
    x,y=axes
    mesh=np.column_stack([a.ravel() for a in np.meshgrid(x,y)])
    target=obj.analysis.records[group]
    d,p=simulate(obj.model,[target['angle']],obj.decode(mesh),obj.paths)
    shape=(len(y),len(x))
    ds=obj.analysis.raw.ds[group]
    pole=np.any(np.isin(obj.analysis.raw.ps[group],[0.,90.]))
    defined=abs(np.mean(np.exp(1j*np.deg2rad(ds)))) > 1e-8 and not pole
    mean_d,mean_p=target['mean_delta'] if defined else None,target['mean_psi']
    if pole and obj.req.duplicate_policy=='average' and obj.req.metric=='stokes':
        mean_d,mean_p=stokes_direction(obj.analysis.display.sm[group])
    return dict(group=group,angle=target['angle'],delta_deg=mean_d,psi_deg=mean_p,
                delta=_zero_segments(obj,x,y,wrap(d.reshape(shape)-mean_d),True) if mean_d is not None else [],
                psi=_zero_segments(obj,x,y,p.reshape(shape)-mean_p,False) if mean_p is not None else [],limited=limited)


def conditional_profile(obj, column, reference, anchors):
    """Compare an actual objective slice to a profile over the other search interval."""
    if len(obj.paths)!=2 or column not in (0,1) or len(reference)!=2:
        raise ValueError('Zwei freie Parameter sind für den Profilvergleich erforderlich.')
    if any(not p.lower<=v<=p.upper for p,v in zip(obj.req.parameters,reference)):
        raise ValueError('Für den Profilvergleich eine Lösung im Suchbereich wählen.')
    other=1-column
    grids=[None,None]
    grids[other],limited=phase_grid(obj,other,121,1201)
    zref=obj.encode(reference)[0]
    anchors=[a for a in anchors if len(a)==2]
    extra=obj.encode(anchors)[:,column] if anchors else []
    axis=np.unique(np.clip(np.r_[np.linspace(0,1,81), zref[column],extra],0,1))
    points=np.tile(zref,(len(axis),1));points[:,column]=axis
    fixed=obj.batch(points)
    x=obj.decode(points)[:,column]
    profiled=[];partners=[]
    for value, q, point in zip(x,fixed,points):
        z, best=fixed_value_minimum(obj,column,float(value),grids)
        if q<best:
            z,best=point,q
        profiled.append(best);partners.append(obj.decode(z)[0,other])
    return dict(x=safe_list(x), fixed_q=safe_list(fixed), profiled_q=safe_list(profiled),
                partner=safe_list(partners), reference=list(reference), limited=limited)
