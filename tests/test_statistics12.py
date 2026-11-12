import copy
import numpy as np
from scipy.linalg import block_diag

from ellifit.core import Model, FitRequest, Objective, Observations, Parameter, simulate, solve, wrap
from ellifit.statistics import RepeatAnalysis, parameter_uncertainty


def repeated_data(model=None, angles=(60,64,68,72), m=20, seed=19, symmetric=False):
    model=model or Model().model_dump()
    model=copy.deepcopy(model)
    model['layers'][0]['thickness_nm']=118
    angles=np.asarray(angles,float)
    d,p=simulate(model,angles)
    rng=np.random.default_rng(seed)
    covariance=np.array([[.02**2,.45*.02*.012],[.45*.02*.012,.012**2]])
    rows=[]
    for j,a in enumerate(angles):
        noise=rng.multivariate_normal([0,0],covariance,m//2 if symmetric else m)
        if symmetric:
            noise=np.r_[noise,-noise];rng.shuffle(noise)
        for i,(dd,pp) in enumerate(noise):rows.append(dict(id=f'{j}-{i}',angle=float(a),delta=float((d[0,j]+dd)%360),psi=float(p[0,j]+pp),source='test'))
    return model,rows


def test_gls_sufficient_statistics_match_every_correlated_residual():
    model,rows=repeated_data()
    analysis=RepeatAnalysis(rows)
    assert analysis.active
    pred_d=np.array([[1.,180,359.,83],[360.,179,1.,50]])
    pred_p=np.array([[20.,40,60.,30],[25.,45,65.,35]])
    expected=[]
    for d,p in zip(pred_d,pred_p):
        q=0
        for j,group in enumerate(analysis.groups):
            residual=np.array([[float(wrap(d[j]-rows[i]['delta'])),p[j]-rows[i]['psi']] for i in group])
            q+=np.einsum('ij,jk,ik->',residual,analysis.precisions[j],residual)
        expected.append(q)
    np.testing.assert_allclose(analysis.sse(pred_d,pred_p),expected,rtol=3e-10)


def test_average_and_joint_gls_have_identical_objective_and_estimate():
    model,rows=repeated_data()
    repeat=RepeatAnalysis(rows,'repeat');average=RepeatAnalysis(rows,'average')
    d,p=simulate(model,repeat.angles)
    np.testing.assert_allclose(repeat.sse(d,p),average.sse(d,p),rtol=1e-12)
    args=dict(model=model,measurements=rows,parameters=[dict(path='layers.0.thickness_nm',lower=80,upper=150)],quality='quick',bootstrap_samples=0)
    joint=solve(FitRequest(**args,duplicate_policy='repeat'))
    means=solve(FitRequest(**args,duplicate_policy='average'))
    np.testing.assert_allclose(joint['solutions'][0]['values'],means['solutions'][0]['values'],atol=1e-7)
    assert joint['solutions'][0]['uncertainty']['available']
    assert joint['measurement_uncertainty']['weighted']


def test_missing_and_duplicate_observations_never_create_zero_uncertainty():
    one=[dict(id='a',angle=70,delta=100,psi=30)]
    for data in [one,[one[0]|{'id':str(i)} for i in range(10)]]:
        result=RepeatAnalysis(data).public()
        assert not result['complete'] and not result['weighted']
        assert result['groups'][0]['uncertainty_mean_delta'] is None
        assert result['groups'][0]['uncertainty_mean_psi'] is None


def test_drift_is_flagged_and_not_averaged_into_tiny_uncertainty():
    rows=[dict(id=str(i),angle=70,delta=100+i*.05,psi=30+i*.03) for i in range(20)]
    result=RepeatAnalysis(rows).public()
    assert not result['complete']
    assert 'Drift' in result['groups'][0]['status']


def test_statistical_and_calibration_contributions_are_separate():
    model,rows=repeated_data()
    model['substrate']['uncertainty_n']=.002
    req=FitRequest(model=model,measurements=rows,parameters=[dict(path='layers.0.thickness_nm',lower=80,upper=150),dict(path='layers.0.n',lower=1.3,upper=1.7)],calibration=dict(angle_deg=.01,wavelength_nm=.1),bootstrap_samples=0)
    obj=Objective(req)
    result=parameter_uncertainty(obj,[118,1.46])
    assert result['available'] and not result['weak']
    assert all(v>0 for v in result['statistical'])
    assert all(v>0 for v in result['calibration'])
    np.testing.assert_allclose(np.array(result['combined'])**2,np.array(result['statistical'])**2+np.array(result['calibration'])**2)
    assert len(result['calibration_sources'])==3
    obj.req.calibration.angle_deg=None;obj.req.calibration.wavelength_nm=None;obj.model['substrate']['uncertainty_n']=None
    other=parameter_uncertainty(obj,[118,1.46])
    assert other['calibration'] is None and other['combined'] is None


def test_propagated_gls_covariance_matches_independent_fisher_matrix():
    model,rows=repeated_data()
    req=FitRequest(model=model,measurements=rows,parameters=[dict(path='layers.0.thickness_nm',lower=80,upper=150),dict(path='layers.0.n',lower=1.3,upper=1.7)],bootstrap_samples=0)
    obj=Objective(req);values=np.array([118,1.46]);columns=[]
    for i,h in enumerate([1e-4,1e-6]):
        a,b=values.copy(),values.copy();a[i]-=h;b[i]+=h
        da,pa=simulate(model,obj.obs.angles,a[None,:],obj.paths);db,pb=simulate(model,obj.obs.angles,b[None,:],obj.paths)
        columns.append(np.column_stack((wrap(db[0]-da[0]),pb[0]-pa[0])).ravel()/(2*h))
    J=np.column_stack(columns);W=block_diag(*[n*w for n,w in zip(obj.analysis.raw.counts,obj.analysis.precisions)])
    expected=np.linalg.inv(J.T@W@J)
    actual=parameter_uncertainty(obj,values)['covariance_statistical']
    np.testing.assert_allclose(actual,expected,rtol=2e-4,atol=1e-10)


def test_paired_bootstrap_produces_local_intervals_when_repeats_exist():
    model,rows=repeated_data(m=24)
    req=FitRequest(model=model,measurements=rows,parameters=[dict(path='layers.0.thickness_nm',lower=80,upper=150)],bootstrap_samples=60)
    obj=Objective(req)
    result=parameter_uncertainty(obj,[118],bootstrap=60)
    assert result['bootstrap_samples']>=48
    low,high=result['bootstrap95'][0]
    assert low<high and low>110 and high<125


def test_periodic_aliases_become_one_best_family_in_thickness_order():
    model=Model().model_dump();model['layers'][0]['thickness_nm']=118
    d,p=simulate(model,[70])
    req=FitRequest(model=model,measurements=[dict(id='a',angle=70,delta=float(d[0,0]),psi=float(p[0,0]))],parameters=[dict(path='layers.0.thickness_nm',lower=.1,upper=1000)],quality='quick',bootstrap_samples=0)
    result=solve(req);family=result['solutions'][0]
    assert family['periodic'] and family['alias_count']>=4
    ds=[a['values'][0] for a in family['aliases']]
    assert ds==sorted(ds)
    np.testing.assert_allclose(np.diff(ds),family['periods'][0]['period_nm'],atol=1e-4)
    assert all(not s['at_boundary'] for s in result['solutions'][1:])


def test_hybrid_k_includes_exact_zero_and_resolves_small_positive_values():
    model=Model().model_dump();model['layers'][0].update(thickness_nm=900,k=1e-5)
    d,p=simulate(model,[60,65,70,75])
    rows=[dict(id=str(i),angle=a,delta=float(dd),psi=float(pp)) for i,(a,dd,pp) in enumerate(zip([60,65,70,75],d[0],p[0]))]
    req=FitRequest(model=model,measurements=rows,parameters=[dict(path='layers.0.k',lower=0,upper=10)],quality='quick',bootstrap_samples=0)
    obj=Objective(req)
    assert obj.hybrid==[True]
    assert obj.decode([[0]])[0,0]==0
    np.testing.assert_allclose(obj.decode(obj.encode([[0],[1e-8],[1e-4],[10]])),[[0],[1e-8],[1e-4],[10]],rtol=1e-12)
    result=solve(req)
    assert abs(result['solutions'][0]['values'][0]-1e-5)<1e-7
    assert result['zero_tests'][0]['not_distinguishable'] is None


def test_k_zero_has_measured_profile_limit_instead_of_arbitrary_floor():
    model,rows=repeated_data(symmetric=True,m=20)
    req=FitRequest(model=model,measurements=rows,parameters=[dict(path='layers.0.k',lower=0,upper=10)],quality='quick',bootstrap_samples=0)
    result=solve(req);zero=result['zero_tests'][0]
    assert zero['available'] and zero['not_distinguishable']
    assert 0<zero['upper_limit']<.1
    assert zero['profile'] is not None


def test_angular_rms_is_independent_of_number_of_identical_repeats():
    rows=[dict(id='a',angle=70,delta=100,psi=30),dict(id='b',angle=70,delta=100.02,psi=30.01)]
    a=RepeatAnalysis(rows,automatic=False)
    b=RepeatAnalysis([r|{'id':str(i)} for i,r in enumerate(rows*20)],automatic=False)
    da,pa=np.array([[100.01]]),np.array([[30.005]])
    np.testing.assert_allclose(a.raw_rms(da,pa),b.raw_rms(da,pa),atol=1e-12)


def test_tiny_repeat_scatter_retains_precision_of_direct_residuals():
    rng=np.random.default_rng(472)
    rows=[dict(id=str(i),angle=70,delta=330+rng.normal(0,1e-6),psi=30+rng.normal(0,1e-6)) for i in range(40)]
    obs=Observations(rows)
    expected=sum(float(wrap(330-r['delta']))**2+(30-r['psi'])**2 for r in rows)
    np.testing.assert_allclose(obs.sse([[330]],[[30]])[0],expected,rtol=1e-6,atol=1e-21)


def test_physical_zero_does_not_hide_another_artificial_boundary():
    model=Model().model_dump();model['layers'][0]['thickness_nm']=150
    angles=[60,65,70,75];d,p=simulate(model,angles)
    rows=[dict(id=str(i),angle=a,delta=float(dd),psi=float(pp)) for i,(a,dd,pp) in enumerate(zip(angles,d[0],p[0]))]
    req=FitRequest(model=model,measurements=rows,parameters=[dict(path='layers.0.thickness_nm',lower=80,upper=120),dict(path='layers.0.k',lower=0,upper=.1)],quality='quick',bootstrap_samples=0)
    result=solve(req)
    assert result['solutions'][0]['at_boundary']
    assert result['solutions'][0]['values'][1]<1e-10
    assert any('Suchbereich vergrößern' in w for w in result['warnings'])


def test_bootstrap_intervals_at_artificial_bounds_are_not_reported_as_precision():
    model,rows=repeated_data(m=24)
    req=FitRequest(model=model,measurements=rows,parameters=[dict(path='layers.0.thickness_nm',lower=117.99999,upper=118.00001)],bootstrap_samples=60)
    result=parameter_uncertainty(Objective(req),[118],bootstrap=60)
    assert result['bootstrap_boundary_hits']>0
    assert result['bootstrap95'] is None
    assert 'beschnitten' in result['bootstrap_note']
