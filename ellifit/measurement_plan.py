"""Choose an additional incidence angle that separates the displayed hypotheses."""
import numpy as np

from .core import finite_number, simulate, stokes


def family_values(params, family, index):
    """Map a zero-based ordinal into the exact in-range thickness lattice."""
    if not 0 <= index < family['alias_count']:
        raise IndexError('Wiederholung außerhalb der Periodenfamilie.')
    if index < len(family['aliases']):
        return family['aliases'][index]['values'].copy()
    values = family['aliases'][0]['values'].copy()
    columns = {p.path:i for i,p in enumerate(params)}
    for axis in reversed(family['periods']):
        col, t = columns[axis['path']], axis['period_nm']
        count = int(np.floor((params[col].upper-values[col])/t+1e-10))+1
        index, m = divmod(index, count)
        values[col] = min(params[col].upper, values[col]+m*t)
    return values


def next_angle(obj, solutions, maximum_candidates=12):
    rms = solutions[0]['rmse_deg']
    limit = max(.1, rms + obj.req.equivalence_deg) if rms is not None else None
    families = [s for s in solutions if s['equivalent']] if limit is None else [
        s for s in solutions if s['rmse_deg'] is not None and s['rmse_deg'] <= limit + 1e-9]
    total = sum(s['alias_count'] for s in families)
    if total < 2:
        return None
    # Allocate one representative per family before distributing spare slots
    # among their periods. Sample the full index range, also beyond row 200.
    if len(families)>maximum_candidates:
        keep = np.linspace(0,len(families)-1,maximum_candidates).round().astype(int)
        families = [families[i] for i in keep]
    counts = [1]*len(families)
    sizes = [s['alias_count'] for s in families]
    while sum(counts)<min(maximum_candidates,sum(sizes)):
        i = max((j for j in range(len(sizes)) if counts[j]<sizes[j]), key=lambda j:sizes[j]/counts[j])
        counts[i] += 1
    candidates = []
    for family,count in zip(families,counts):
        for i in range(count):
            member = i*(family['alias_count']-1)//max(1,count-1)
            candidates.append((family['rank'], member+1, family_values(obj.req.parameters,family,member)))
    measured = np.asarray(obj.obs.geometry_angles)
    grid = np.arange(45., 80.01, .5)
    grid = grid[np.all(abs(grid[:,None]-measured[None,:]) >= 1., axis=1)]
    if not len(grid) or len(candidates)<2:
        return None
    delta, psi = simulate(obj.model, grid, [v for _,_,v in candidates], obj.paths)
    vectors = stokes(delta, psi)
    left, right = np.triu_indices(len(candidates), 1)
    separations = np.linalg.norm(vectors[left]-vectors[right], axis=-1)
    minimum = separations.min(axis=0)
    valid = np.isfinite(minimum)
    if not valid.any():
        return None
    best = int(np.argmax(np.where(valid, minimum, -1)))
    return dict(angle_deg=float(grid[best]), smallest_stokes_distance=float(minimum[best]),
                informative=bool(minimum[best]>1e-6), candidates_total=total, candidates_used=len(candidates),
                rms_cutoff_deg=limit, range_deg=[45,80], step_deg=.5,
                predictions=[dict(family=f, alias=a, values=v, delta=finite_number(delta[i,best]), psi=finite_number(psi[i,best]))
                             for i,(f,a,v) in enumerate(candidates)])
