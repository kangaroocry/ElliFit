"""Independent synthetic regressions for correlated, saturated d/n fits."""
import copy

import numpy as np
import pytest
from scipy.optimize import least_squares, minimize_scalar

from ellifit.core import FitRequest, Model, Objective, period, put, simulate, solve, wrap
from ellifit.diagnostics import _profile_minimum, check_minimum, fit_diagnostics, mean_deviation
from ellifit.statistics import parameter_uncertainty


def coupled_request():
    model=Model().model_dump()
    model['wavelength_nm']=635
    model['layers']=[dict(name='Film A',n=1.42,k=0,thickness_nm=270),
                     dict(name='Film B',n=1.47,k=0,thickness_nm=63)]
    d,p=simulate(model,[68])
    # Three independent synthetic pairs, zero mean, nonsingular covariance.
    noise=[(-.012,-.015),(.014,.020),(-.002,-.005)]
    rows=[dict(id=str(i),angle=68,delta=float(d[0,0]+dd),psi=float(p[0,0]+pp))
          for i,(dd,pp) in enumerate(noise)]
    return FitRequest(model=model,measurements=rows,
        parameters=[dict(path='layers.0.thickness_nm',lower=110,upper=980,scale='log'),
                    dict(path='layers.0.n',lower=1.01,upper=2,scale='linear')],
        quality='quick',bootstrap_samples=0)


@pytest.fixture(scope='module')
def coupled_result():
    return solve(coupled_request())


def test_boundary_minimum_is_not_stationary_after_a_parameter_dependent_period_shift():
    obj=Objective(coupled_request())
    edge=minimize_scalar(lambda n:obj.scalar(obj.encode([980,n])[0]),
        bounds=(1.031,1.034),method='bounded',options={'xatol':1e-14})
    refined=least_squares(lambda v:obj.residual(obj.encode([980,v[0]])[0]),[edge.x],
        bounds=([1.031],[1.034]),jac='3-point',diff_step=1e-6,x_scale='jac',
        ftol=1e-14,xtol=1e-14,gtol=1e-12)
    values=np.array([980.,refined.x[0]])
    assert check_minimum(obj,obj.encode(values)[0])[0]
    model=copy.deepcopy(obj.model);put(model,'layers.0.n',values[1])
    t=period(model,'layers.0.thickness_nm',68)
    alias=values.copy();alias[0]-=t
    assert alias[0]>obj.req.parameters[0].lower
    # Equal Q under a phase shift is insufficient to establish a 2D minimum.
    np.testing.assert_allclose(obj.scalar(obj.encode(values)[0]),obj.scalar(obj.encode(alias)[0]),rtol=2e-9)
    assert not check_minimum(obj,obj.encode(alias)[0])[0]


def test_only_confirmed_interior_minima_become_families(coupled_result):
    result=coupled_result;obj=Objective(coupled_request())
    assert len(result['solutions'])==2
    assert result['discarded_boundary_minima']>=1
    assert result['minimum_checks']['checked']>=len(result['solutions'])
    for solution in result['solutions']:
        assert solution['mean_fit']['numerical_match']
        for alias in solution['aliases']:
            assert check_minimum(obj,obj.encode(alias['values'])[0])[0]
    root=min(result['solutions'],key=lambda s:abs(s['values'][1]-1.42))
    np.testing.assert_allclose(root['values'],[270,1.42],atol=3e-7)
    assert result['solutions'][0]['values'][0]<result['solutions'][1]['values'][0]


def test_saturated_means_keep_repeat_scatter_and_do_not_validate_model(coupled_result):
    result=coupled_result;d=result['identifiability'];best=result['solutions'][0]
    assert d['saturated'] and d['lack_of_fit_dof']==0
    assert d['independent_mean_components']==2 and d['free_parameters']==2
    assert best['mean_fit']['rmse_deg']<1e-6
    np.testing.assert_allclose(best['rmse_deg'],d['repeated_rms_floor_deg'],rtol=1e-9)
    # Fitting both means with their own sample covariance forces Q=2(m-1).
    np.testing.assert_allclose(best['q'],4,rtol=1e-8)
    np.testing.assert_allclose(best['reduced_chi2'],1,rtol=1e-8)
    assert any('kein Gütenachweis' in w for w in result['warnings'])


def test_full_rank_strong_coupling_does_not_imply_an_exact_continuum(coupled_result):
    best=coupled_result['solutions'][0];u=best['uncertainty']
    assert u['sensitivity_rank']==2 and not u['weak']
    assert u['strongly_correlated'] and -.99999999<u['correlation']<-.995
    profile=coupled_result['identifiability']['profile']
    assert min(p['mean_rmse_deg'] for p in profile['points'] if p['mean_rmse_deg'] is not None)<1e-6
    assert max(p['mean_rmse_deg'] for p in profile['points'] if p['mean_rmse_deg'] is not None)>1
    assert all('rank' not in p for p in profile['overlay'])
    obj=Objective(coupled_request())
    for point in profile['points'][::25]:
        delta,psi=simulate(obj.model,[68],np.array([point['values']]),obj.paths)
        residual=[v for row in obj.rows for v in (float(wrap(delta[0,0]-row['delta'])),float(psi[0,0]-row['psi']))]
        np.testing.assert_allclose(point['rmse_deg'],np.sqrt(np.mean(np.square(residual))),rtol=1e-7,atol=1e-9)
    for solution in coupled_result['solutions']:
        point=next(p for p in profile['points'] if p['values'][1]==solution['values'][1])
        assert point['mean_rmse_deg']<1e-6


def test_estimated_covariance_with_three_repeats_uses_finite_sample_mean_comparison(coupled_result):
    profile=coupled_result['identifiability']['profile']
    # Hotelling T²: p(m-1)/(m-p) F[p,m-p](0.95) = 798 for m=3,p=2.
    np.testing.assert_allclose(profile['compatible95_threshold'],798,rtol=1e-12)
    for point in profile['points']:
        if point['statistic'] is not None:
            assert point['compatible95']==(point['statistic']<=798)


def test_local_tangent_predicts_independently_reprofiled_compensation(coupled_result):
    req=coupled_request();obj=Objective(req)
    root=min(coupled_result['solutions'],key=lambda s:abs(s['values'][1]-1.42))
    grids=[np.linspace(0,1,300)]*2
    low=_profile_minimum(obj,1,1.42-1e-6,grids)[0][0]
    high=_profile_minimum(obj,1,1.42+1e-6,grids)[0][0]
    expected=(high-low)/2e-6
    np.testing.assert_allclose(root['uncertainty']['local_relation']['slope'],expected,rtol=3e-3)


def test_unweighted_single_measurement_does_not_invent_confidence_regions():
    req=coupled_request();req.measurements=req.measurements[:1]
    obj=Objective(req);values=[270,1.42]
    solution=dict(values=values,uncertainty=parameter_uncertainty(obj,values))
    d=fit_diagnostics(obj,[solution],[np.linspace(0,1,100)]*2)
    assert d['profile'] and d['profile']['compatible95_threshold'] is None
    assert all(p['compatible95'] is None for p in d['profile']['points'])
    assert mean_deviation(obj,values)['statistic'] is None


def test_phase_relation_is_explicitly_approximate_and_predicts_thickness_period(coupled_result):
    req=coupled_request();obj=Objective(req)
    relation=coupled_result['identifiability']['phase_relation']
    best=coupled_result['solutions'][0]
    d,n=best['values']
    q=np.sqrt(n*n-relation['tangent_squared'])
    np.testing.assert_allclose(d*q,relation['optical_thickness_nm'])
    np.testing.assert_allclose(relation['period_optical_nm']/q,best['periods'][0]['period_nm'])
    assert 'keine exakte' in relation['note']
    exact=mean_deviation(obj,best['values'])['rmse_deg']
    other_n=n+.01;other_d=relation['optical_thickness_nm']/np.sqrt(other_n**2-relation['tangent_squared'])
    assert mean_deviation(obj,[other_d,other_n])['rmse_deg']>exact+1e-3
