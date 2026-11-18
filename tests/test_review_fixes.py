"""Regression cases from the review of 1.4.3, all using synthetic data."""

import numpy as np
import pytest

from ellifit.core import FitRequest, Model, Objective, Observations, comparison, parse_data, period, reflection, simulate, solve, stokes, wrap
from ellifit.statistics import parameter_uncertainty


def rows_for(model, angles, noise=((0, 0),)):
    delta, psi = simulate(model, angles)
    rows = []
    for phi, d, p in zip(angles, delta[0], psi[0]):
        for dd, dp in noise:
            rows.append(dict(id=str(len(rows)), angle=phi, delta=(d+dd)%360, psi=p+dp))
    return rows


def request(model, rows, params, **settings):
    return FitRequest(model=model, measurements=rows, parameters=[
        dict(path=path, lower=lo, upper=hi, scale='linear') for path,lo,hi in params
    ], quality=settings.pop('quality','quick'), bootstrap_samples=0, **settings)


def test_critical_film_agrees_with_analytic_limit_and_zero_thickness():
    model=Model().model_dump()
    phi=60.
    n0=1.5
    nf=n0*np.sin(np.deg2rad(phi))
    ns=3.882+.019j
    model['ambient']['n']=n0
    model['layers'][0].update(n=nf,k=0,thickness_nm=150)
    rp,rs=reflection(model,[phi,47.],[[0.],[150.]],['layers.0.thickness_nm'])
    q0=n0*np.cos(np.deg2rad(phi))
    qs=np.sqrt(ns**2-nf**2)
    beta=2*np.pi*150/model['wavelength_nm']
    for actual,a,b,scale in [(rp,q0/n0**2,qs/ns**2,nf**2),(rs,q0,qs,1.)]:
        yin=b/(1-1j*b*beta*scale)
        np.testing.assert_allclose(actual[1,0],(a-yin)/(a+yin),atol=3e-13)
        np.testing.assert_allclose(actual[0,0],(a-b)/(a+b),atol=3e-13)
    for polarization,amplitude in zip(('p','s'),(rp,rs)):
        from tmm import coh_tmm
        for i,d in enumerate((0,150)):
            expected=coh_tmm(polarization,[n0,nf,ns],[np.inf,d,np.inf],np.deg2rad(47),632.8)['r']
            np.testing.assert_allclose(amplitude[i,1],expected,atol=3e-13)


def test_fixed_thickness_and_out_of_domain_angular_calibration():
    model=Model().model_dump()
    model['layers'].append(dict(name='Unterlage',n=1.654,k=0,thickness_nm=221.,uncertainty_thickness_nm=1.))
    model['layers'][0]['uncertainty_thickness_nm']=5  # free d is never a calibration source
    noise=[(-.003,.001),(.001,.002),(.003,-.001),(-.001,-.002)]
    req=request(model,rows_for(model,[70,89.5],noise),[('layers.0.thickness_nm',60,100)],
                calibration=dict(angle_deg=1., wavelength_nm=.1))
    u=parameter_uncertainty(Objective(req),[80.])
    src={c['path']:c for c in u['calibration_sources']}
    assert set(src)=={'angle','wavelength_nm','layers.1.thickness_nm'}
    assert src['angle']['contribution'][0]>0 and src['layers.1.thickness_nm']['contribution'][0]>.01
    assert u['statistical'] and u['combined'] is None and u['calibration'] is None
    assert not u['calibration_complete'] and u['calibration_warnings']
    req.calibration.angle_deg=.2
    good=parameter_uncertainty(Objective(req),[80.])
    assert good['calibration_complete'] and good['combined'][0]>=good['statistical'][0]
    np.testing.assert_allclose(good['calibration'][0],np.linalg.norm([s['contribution'][0] for s in good['calibration_sources']]))


def test_mixed_periodic_family_and_measurement_plan():
    model=Model().model_dump()
    model['layers']=[dict(name='T',n=1.46,k=0,thickness_nm=118),dict(name='A',n=1.8,k=.12,thickness_nm=60)]
    result=solve(request(model,rows_for(model,[70]),[('layers.0.thickness_nm',40,900),('layers.1.thickness_nm',40,80)]))
    family=result['solutions'][0];t=period(model,'layers.0.thickness_nm',70)
    assert len(result['solutions'])==1 and family['periodic'] and family['alias_count']==3
    values=np.array([a['values'] for a in family['aliases']])
    np.testing.assert_allclose(values[:,0],118+np.arange(3)*t,atol=1e-6)
    np.testing.assert_allclose(values[:,1],60,atol=1e-6)
    plan=result['next_angle'];assert plan['informative'] and abs(plan['angle_deg']-70)>=1.
    assert plan['candidates_used']==3 and plan['smallest_stokes_distance']>0
    vs=stokes([p['delta'] for p in plan['predictions']],[p['psi'] for p in plan['predictions']])
    assert min(np.linalg.norm(vs[i]-vs[j]) for i,j in ((0,1),(0,2),(1,2)))==pytest.approx(plan['smallest_stokes_distance'])


def test_minima_beyond_120_and_goodness_count():
    model=Model().model_dump();model['layers'][0].update(k=1e-6,thickness_nm=118)
    res=solve(request(model,rows_for(model,[70]),[('layers.0.thickness_nm',20,40000)],quality='thorough'))
    assert res['counts']['grid_minima']==res['counts']['refined_grid_minima']
    assert len(res['solutions'])>=280 and sum(s['rmse_deg']<.1 for s in res['solutions'])>=140
    assert all(not s['periodic'] for s in res['solutions'])


def test_mean_matches_marker_diagnostics_and_wrapping():
    model=Model().model_dump()
    rr=[dict(id=str(i),angle=70,delta=d,psi=30) for i,d in enumerate([350,350,80])]
    req=request(model,rr,[('layers.0.thickness_nm',40,100)],duplicate_policy='average')
    obj=Objective(req);target=obj.obs.ds[0].item()
    assert target==pytest.approx(20)
    assert comparison(req,[80])['points'][0]['delta']==pytest.approx(target)
    assert obj.analysis.records[0]['mean_delta']==pytest.approx(target)
    with pytest.raises(ValueError):
        Observations([dict(angle=70,psi=30,delta=d) for d in (0,180)],'average')


def test_contexts_keep_one_incidence_and_independent_repeat_groups():
    model=Model().model_dump(); rows=rows_for(model,[70]*4)
    for i,r in enumerate(rows):
        r.update(measurement_kind='azimuth',azimuth_deg=90*i,site='A',delta=r['delta']+.01*i)
    req=request(model,rows,[('layers.0.thickness_nm',60,100)],duplicate_policy='average',uncertainty_mode='auto')
    res=solve(req)
    assert res['counts']['angles']==1 and res['counts']['effective']==4
    assert not res['measurement_uncertainty']['weighted']
    assert res['identifiability']['lack_of_fit_dof']==1 and res['comparison']['mode']=='parameter'
    assert sorted(p['azimuth_deg'] for p in res['comparison']['points'])==[0,90,180,270]
    assert len(res['comparison']['delta'])==len(res['comparison']['x'])
    grouped=rows_for(model,[70],[(.03,.01),(-.02,.03),(0,-.02),(-.01,-.02)])
    reps=[dict(r,id=site+r['id'],measurement_kind='location',site=site) for site in ['A','B'] for r in grouped]
    reps[0]['measurement_kind']='repeat'  # same named site as the next three records
    o=Objective(request(model,reps,[('layers.0.thickness_nm',60,100)],duplicate_policy='average',uncertainty_mode='auto'))
    assert o.analysis.active and o.obs.count==2
    assert [r['count'] for r in o.analysis.records]==[4,4]


def test_context_csv_preserves_azimuth_zero_and_multiline_comment():
    csv='Winkel_Grad;Delta_Grad;Psi_Grad;Kommentar;Quelle;Originalzeile;Messart;Messort;Azimut_Grad\n70;359,9;20;"A;B\nC";probe.dat;27;azimuth;Mitte;0\n'
    row=parse_data(csv.encode(),'export.csv')['rows'][0]
    assert (row['site'],row['azimuth_deg'],row['source'],row['line'],row['comment'])==('Mitte',0,'probe.dat',27,'A;B\nC')
    assert row['measurement_kind']=='azimuth'
    assert parse_data(b'70 150 25  >> Test','alt.dat')['rows'][0]['measurement_kind']=='repeat'


def test_brewster_and_physical_zero_are_distinguished_from_search_limits():
    model=Model(layers=[],substrate=dict(n=1.5,k=0)).model_dump()
    phi=float(np.rad2deg(np.arctan(1.5))-.0001)
    req=request(model,rows_for(model,[phi,68,72]),[('substrate.k',0,.15)])
    res=solve(req)
    assert phi in res['comparison']['phase_warning_angles']
    assert res['solutions'][0]['boundary_axes']==[dict(path='substrate.k',side='lower',physical_zero=True,label=res['parameters'][0]['label'])]
    assert not any('Suchbereich vergrößern' in w for w in res['warnings'])


def test_group_fit_uses_original_request_and_keeps_repetitions_by_family(monkeypatch):
    from fastapi.testclient import TestClient
    from ellifit import server
    model=Model().model_dump()
    rows=[]
    for phi,d in ((0,118),(90,121)):
        truth=Model().model_dump();truth['layers'][0]['thickness_nm']=d
        for r in rows_for(truth,[70]):
            rows.append(r|dict(id=str(phi),measurement_kind='azimuth',azimuth_deg=phi))
    req=request(model,rows,[('layers.0.thickness_nm',40,700)])
    snapshot=req.model_dump()
    monkeypatch.setattr(server,'JOBS',{'test':dict(status='completed',request=req)})
    client=TestClient(server.app)
    response=client.post('/api/jobs/test/group-fit',json={'row_id':'90'})
    assert response.status_code==200,response.text
    group=response.json()
    assert group['azimuth_deg']==90 and group['count']==1 and group['good_values']==3
    assert group['families'][0]['first_values'][0]==pytest.approx(121,abs=1e-4)
    assert group['families'][0]['alias_count']==3 and req.model_dump()==snapshot
    assert client.post('/api/jobs/test/group-fit',json={'row_id':'unknown'}).status_code==404


def test_period_members_beyond_table_limit_use_mixed_radix_indices():
    from ellifit.measurement_plan import family_values
    from ellifit.core import Parameter
    pars=[Parameter(path='layers.0.thickness_nm',lower=1,upper=1000,scale='linear'),
          Parameter(path='layers.1.thickness_nm',lower=1,upper=5000,scale='linear')]
    sample=dict(alias_count=3*500,aliases=[dict(values=[10.,3.])],
                periods=[dict(path=pars[0].path,period_nm=400.),dict(path=pars[1].path,period_nm=10.)])
    assert family_values(pars,sample,501)==[410.,13.]
    assert family_values(pars,sample,1499)==[810.,4993.]
    with pytest.raises(IndexError):family_values(pars,sample,1500)
