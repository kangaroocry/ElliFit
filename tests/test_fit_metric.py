"""Independent regressions for objective minima versus raw-angle RMS."""
import copy
import numpy as np
import pytest
from scipy.optimize import minimize_scalar
from ellifit.core import FitRequest, Model, Objective, simulate, solve, wrap, stokes
from ellifit.fit_metric import definition, values
from ellifit.refinement import evaluate_view


def discrepant_request(metric='angular',policy='repeat'):
    model=Model().model_dump();model['layers']=[dict(name='Polymer',n=1.44,k=0,thickness_nm=6),dict(name='Oxide',n=1.65,k=0,thickness_nm=250),dict(name='Interface',n=1.46,k=0,thickness_nm=1.5)]
    d,p=simulate(model,[70],[[20]],['layers.0.thickness_nm'])
    noise=[(-.3,-.02),(.2,.015),(.4,-.01),(-.3,.015)]
    rows=[dict(id=str(i),angle=70,delta=float(d[0,0]+3+dd),psi=float(p[0,0]+pp)) for i,(dd,pp) in enumerate(noise)]
    return FitRequest(model=model,measurements=rows,parameters=[dict(path='layers.0.thickness_nm',lower=.05,upper=50,scale='linear')],metric=metric,duplicate_policy=policy,quality='quick',bootstrap_samples=0)


def test_weighted_minimum_differs_from_raw_rms_but_matches_displayed_fit_quantity():
    req=discrepant_request();observed=np.array([[r.delta,r.psi] for r in req.measurements]);precision=np.linalg.inv(np.cov(observed,rowvar=False,ddof=1))
    def residual(x):
        d,p=simulate(req.model.model_dump(),[70],[[x]],['layers.0.thickness_nm'])
        return np.c_[wrap(d[0,0]-observed[:,0]),p[0,0]-observed[:,1]]
    def weighted(x):
        r=residual(x);return float(np.einsum('ni,ij,nj->',r,precision,r))
    raw=lambda x:float(np.sqrt(np.mean(residual(x)**2)))
    minimum=minimize_scalar(weighted,bounds=(.05,50),method='bounded',options={'xatol':1e-11})
    rms_minimum=minimize_scalar(raw,bounds=(.05,50),method='bounded',options={'xatol':1e-11})
    assert abs(minimum.x-rms_minimum.x)>.5
    result=solve(req);best=result['solutions'][0];meta=result['fit_objective']
    assert meta['kind']=='weighted' and meta['unit']=='1' and meta['normalization']==8
    assert meta['differs_from_angular_rms']
    np.testing.assert_allclose(best['values'][0],minimum.x,atol=2e-5)
    np.testing.assert_allclose(best['q'],weighted(best['values'][0]),rtol=1e-9)
    np.testing.assert_allclose(values([best['q']],meta)[0],np.sqrt(weighted(best['values'][0])/8))
    np.testing.assert_allclose(best['rmse_deg'],raw(best['values'][0]),rtol=1e-10)
    # Dense display refinement retains the exact optimum instead of replacing it
    # with nearby regular grid samples. Both scalar quantities are exported.
    view=evaluate_view(req,[[.05,50]],['linear'],41,[best['values']])
    index=view['axes'][0].index(best['values'][0])
    assert index==int(np.argmin(view['q']))
    np.testing.assert_allclose(view['q'][index],best['q'],rtol=1e-10)
    assert int(np.argmin(view['rms']))!=index


def test_unweighted_repeat_fit_quantity_remains_the_original_angular_rms():
    req=discrepant_request();req.uncertainty_mode='none';obj=Objective(req);meta=definition(obj)
    assert meta['kind']=='angular' and not meta['differs_from_angular_rms']
    q=obj.batch(obj.encode([[10],[15],[20]]));np.testing.assert_allclose(values(q,meta),obj.last_rms,rtol=1e-12)


def test_stokes_display_is_the_minimized_stokes_distance_not_angle_rms():
    req=discrepant_request(metric='stokes');obj=Objective(req);meta=definition(obj)
    assert meta['kind']=='stokes' and meta['unit']=='1' and meta['normalization']==12
    d,p=simulate(req.model.model_dump(),[70],[[15]],obj.paths)
    expected=np.mean((stokes(d[0,0],p[0,0])-stokes([r.delta for r in req.measurements],[r.psi for r in req.measurements]))**2)
    np.testing.assert_allclose(values(obj.batch(obj.encode([[15]])),meta)[0],np.sqrt(expected),rtol=1e-12)


def test_mean_fit_with_unequal_repeat_counts_has_its_own_display_definition():
    req=discrepant_request(policy='average');req.uncertainty_mode='none'
    req.measurements.append(req.measurements[0].model_copy(update=dict(id='other-angle',angle=65)))
    obj=Objective(req);meta=definition(obj)
    assert meta['kind']=='mean_angles' and meta['unit']=='degree' and meta['normalization']==4
    q=obj.batch(obj.encode([[12],[18]]));assert not np.allclose(values(q,meta),obj.last_rms)


def test_surface_mesh_objective_scores_match_independent_evaluations():
    req=discrepant_request();req.parameters.append(req.parameters[0].model_copy(update=dict(path='layers.0.n',lower=1.3,upper=1.6)))
    view=evaluate_view(req,[[8,24],[1.35,1.5]],['linear','linear'],41,[[20,1.44]])
    obj=Objective(req);mesh=view['mesh'];indices=[0,len(mesh['q'])//2,len(mesh['q'])-1]
    expected=obj.batch(obj.encode(np.array(mesh['values'])[indices]))
    np.testing.assert_allclose(np.array(mesh['q'])[indices],expected,rtol=1e-11)
    assert view['fit_objective']['kind']=='weighted'
