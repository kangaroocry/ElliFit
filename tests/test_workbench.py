"""Regression tests for decisions users make in the preparation and evaluation views."""
import json

import numpy as np
import pytest
from fastapi.testclient import TestClient

from ellifit import server
from ellifit.core import FitRequest, Model, Objective, Observations, parse_data, simulate, solve, stokes, wrap
from ellifit.optical_diagnostics import measurement_lines, optical_sensitivity
from ellifit.statistics import RepeatAnalysis

PATH = 'layers.0.thickness_nm'


def data(model, angles, params, values):
    d,p=simulate(model,angles,[values],params)
    return [dict(id=str(i),angle=a,delta=float(d[0,i]),psi=float(p[0,i])) for i,a in enumerate(angles)]


def test_reported_scalar_minima_are_not_roundoff_flanks():
    model=Model().model_dump()
    rows=data(model,[66,70,74],[PATH],[118])
    for r,dd,dp in zip(rows,[.035,-.022,.018],[-.011,.026,-.019]):
        r['delta']+=dd; r['psi']+=dp
    for quality in ('quick','balanced','thorough'):
        req=FitRequest(model=model,measurements=rows,parameters=[dict(path=PATH,lower=80,upper=160,scale='linear')],quality=quality,bootstrap_samples=0)
        result=solve(req)
        assert len(result['solutions'])==1
        best=result['solutions'][0]
        assert best['values'][0]==pytest.approx(118.004989,abs=.00001)
        assert best['rmse_deg']==pytest.approx(.022716,abs=.000002)
        assert result['minimum_checks']['checked']>=1


def test_kinetic_units_and_source_context_roundtrip():
    c=TestClient(server.app)
    raw='Zeit [ms], Delta, Psi\n0 150 35\n5 151 34\n90000 152 33'.encode()
    args={'files':{'file':('lauf.dat',raw)}}
    meta=c.post('/api/import?inspect_columns=true',**args).json()
    assert meta['requires_columns'] and meta['kind']=='time' and meta['unit']=='ms' and len(meta['preview'])==3
    assert c.post('/api/import',**args).status_code==400
    assert c.post('/api/import?first_column=angle',**args).status_code==400
    rows=c.post('/api/import?first_column=time&incidence=70',**args).json()['rows']
    assert [r['angle'] for r in rows]==[70]*3
    assert [r['time_s'] for r in rows]==[0,.005,90]
    obs=Observations(rows,'repeat')
    assert list(obs.geometry_angles)==[70] and len(obs.groups)==3
    assert not RepeatAnalysis(rows).complete
    csv='Winkel_Grad;Delta_Grad;Psi_Grad;Messart;Messort;Azimut_Grad;Zeit_s;Quelle\n70;150;35;repeat;;;0,005;lauf.dat'
    assert parse_data(csv.encode(),'export.csv')['rows'][0]['time_s']==.005
    unknown=c.post('/api/import?inspect_columns=true',files={'file':('reihe.txt',b'5 60 10\n15 70 20')}).json()
    assert unknown['kind']=='unknown' and unknown['requires_columns']


def test_brewster_null_stokes_and_angular_reporting():
    phi=float(np.rad2deg(np.arctan(1.5)))
    model=Model(layers=[],substrate={'name':'Glas','n':1.5}).model_dump()
    delta,psi=simulate(model,[phi])
    assert np.isnan(delta[0,0]) and psi[0,0]==0
    np.testing.assert_allclose(stokes(delta,psi)[0,0],[1,0,0])
    np.testing.assert_allclose(stokes(np.nan,90),[-1,0,0])
    req=FitRequest(model=model,measurements=[dict(id='a',angle=phi,delta=123,psi=0)],
        parameters=[dict(path='substrate.n',lower=1.4,upper=1.6,scale='linear')],metric='stokes',quality='quick',bootstrap_samples=0)
    result=solve(req)
    json.dumps(result,allow_nan=False)
    assert result['solutions'][0]['values'][0]==pytest.approx(1.5,abs=1e-7)
    assert result['solutions'][0]['rmse_deg'] is None
    assert result['comparison']['residuals'][0]['delta_residual'] is None
    assert result['comparison']['residual_summary']['stokes_chord_rms']<1e-7
    with pytest.raises(ValueError,match='Stokes'):solve(req.model_copy(update={'metric':'angular'}))
    diagnostic=optical_sensitivity(model,[dict(angle=70)],None)
    minimum=diagnostic['rows'][0]['nearest']
    assert minimum['angle_deg']==pytest.approx(phi,abs=.00001) and minimum['rp']<1e-14
    assert diagnostic['rows'][0]['delta_change'] is None


def test_sensitivity_and_measured_lines():
    model=Model().model_dump()
    obs=data(model,[70],[PATH,'layers.0.n'],[100,1.5])
    req=FitRequest(model=model,measurements=obs,parameters=[dict(path=PATH,lower=80,upper=120,scale='linear'),
        dict(path='layers.0.n',lower=1.4,upper=1.6,scale='linear')],quality='quick',bootstrap_samples=0)
    obj=Objective(req)
    lines=measurement_lines(obj,0)
    assert lines['delta'] and lines['psi']
    for key in ('delta','psi'):
        mid=np.mean(np.array(lines[key]),axis=1)
        d,p=simulate(model,[70],mid,obj.paths)
        residual=wrap(d[:,0]-obs[0]['delta']) if key=='delta' else p[:,0]-obs[0]['psi']
        assert np.max(np.abs(residual)) < .015
    before=simulate(model,[70])
    after=simulate(model,[70],[[81]],[PATH])
    row=optical_sensitivity(model,[dict(angle=70)],0)['rows'][0]
    assert row['delta_change']==pytest.approx(wrap(after[0]-before[0])[0,0])
    assert row['psi_change']==pytest.approx((after[1]-before[1])[0,0])


def test_recipe_validation_and_overwrite(tmp_path,monkeypatch):
    monkeypatch.setattr(server,'RECIPE_DIR',tmp_path)
    c=TestClient(server.app)
    recipe=dict(name='ALD',model=Model().model_dump(),parameters=[dict(path=PATH,lower=1,upper=200)],settings={'metric':'stokes'})
    url='/api/recipes/ALD.json'
    assert c.put(url,json=recipe).status_code==200
    assert c.get(url).json()['settings']['metric']=='stokes'
    assert c.get('/api/recipes').json()==[dict(name='ALD',file='ALD.json')]
    assert c.put(url,json=recipe).status_code==409
    assert c.put(url+'?overwrite=true',json=recipe|{'name':'ALD neu'}).status_code==200
    assert c.put('/api/recipes/Ungueltig.json',json=recipe|{'parameters':[dict(path='layers.4.n',lower=1,upper=2)]}).status_code==400
    assert not (tmp_path/'Ungueltig.json').exists()
    assert c.put(url+'?overwrite=true',json=recipe|{'settings':{'measurements':[]}}).status_code==400
    assert c.get(url).json()['name']=='ALD neu'


def test_conditional_profile_includes_fixed_solution_and_wraps_delta():
    from ellifit.optical_diagnostics import conditional_profile

    model=Model().model_dump()
    obs=data(model,[65,70,75],[PATH,'layers.0.n'],[100,1.5])
    req=FitRequest(model=model,measurements=obs,parameters=[dict(path=PATH,lower=80,upper=120,scale='linear'),
        dict(path='layers.0.n',lower=1.4,upper=1.6,scale='linear')],quality='quick',bootstrap_samples=0)
    r=conditional_profile(Objective(req),0,[100,1.5],[])
    ix=r['x'].index(100.)
    np.testing.assert_array_less(np.array(r['profiled_q']),np.array(r['fixed_q'])+1e-12)
    assert r['fixed_q'][ix]<1e-18 and np.all(np.array(r['partner'])>=1.4)
    assert np.max(np.subtract(r['fixed_q'],r['profiled_q']))>1


def test_measured_pole_stokes_average_is_phase_independent():
    rows=[dict(id='a',angle=70,delta=5,psi=0),dict(id='b',angle=70,delta=180,psi=3)]
    a=RepeatAnalysis(rows,'average',metric='stokes')
    b=RepeatAnalysis([rows[0]|{'delta':234},rows[1]],'average',metric='stokes')
    assert a.sse([[25]],[[2]])[0]==pytest.approx(b.sse([[25]],[[2]])[0])
    assert a.public()['groups'][0]['mean_delta'] is None


def test_mean_at_stokes_pole_matches_the_plotted_direction():
    from ellifit.core import comparison

    req=FitRequest(model=Model(),measurements=[
        dict(id='a',angle=70,delta=17,psi=0),dict(id='b',angle=70,delta=180,psi=3)],
        parameters=[dict(path=PATH,lower=75,upper=85)],duplicate_policy='average',metric='stokes')
    point=comparison(req,[80])['points'][0]
    assert point['delta']==pytest.approx(180)
    assert point['psi']==pytest.approx(1.5)
    opposite=req.measurements[1].model_copy(update={'psi':90})
    neutral=comparison(req.model_copy(update={'measurements':[req.measurements[0],opposite]}),[80])
    assert neutral['points'][0]['delta'] is None and neutral['points'][0]['psi'] is None


def test_batch_by_file_fits_both_parameters_with_the_same_template(monkeypatch):
    model=Model().model_dump()
    paths=[PATH,'layers.0.n']
    first=data(model,[65,70,75],paths,[100,1.5])
    rows=[r|dict(id='a'+r['id'],source='A',time_s=i) for i,r in enumerate(first)]
    rows+= [r|dict(id='b'+r['id'],source='B') for r in data(model,[66,72,76],paths,[101,1.52])]
    req=FitRequest(model=model,measurements=rows,parameters=[
        dict(path=paths[0],lower=90,upper=110,scale='linear'),
        dict(path=paths[1],lower=1.45,upper=1.58,scale='linear')],
        metric='stokes',quality='quick',bootstrap_samples=0)
    monkeypatch.setattr(server,'JOBS',{'batch':dict(status='completed',request=req)})
    c=TestClient(server.app)
    for row, values in [('a0',[100,1.5]),('b0',[101,1.52])]:
        response=c.post('/api/jobs/batch/group-fit',json={'row_id':row,'group_by':'source'})
        assert response.status_code==200,response.text
        group=response.json()
        assert group['criterion']=='Stokes-Abweichung' and group['angle_count']==3
        assert group['time_s'] is None and not group['saturated']
        np.testing.assert_allclose(group['families'][0]['values'],values,rtol=1e-6)


def test_stokes_surface_remains_drawable_where_raw_rms_is_undefined():
    model=Model(layers=[],substrate={'name':'Glas','n':1.5})
    req=FitRequest(model=model,measurements=[dict(id='p',angle=float(np.degrees(np.arctan(1.5))),delta=240,psi=0)],
        parameters=[dict(path='substrate.n',lower=1.48,upper=1.52,scale='linear'),dict(path='substrate.k',lower=0,upper=.02,scale='linear')],
        metric='stokes',quality='quick',bootstrap_samples=0)
    result=solve(req)
    json.dumps(result,allow_nan=False)
    mesh=result['surface']['mesh']
    assert mesh['fit_triangles'] and not mesh['triangles']
    assert result['solutions'][0]['rmse_deg'] is None
    assert mesh['q'][mesh['fit_triangles'][0][0]] is not None
