import copy

import numpy as np
import pytest
from fastapi.testclient import TestClient

from ellifit import server
from ellifit.core import FitRequest, Model, medium_label, parameter_label, parameter_symbol, simulate, solve
from ellifit.results import result_notices


@pytest.fixture
def completed_job(monkeypatch):
    model=Model().model_dump();model['layers'][0]['thickness_nm']=118
    angles=[60,65,70,75];delta,psi=simulate(model,angles)
    rows=[dict(id=str(i),angle=a,delta=float(d),psi=float(p),source='Testprobe.dat',comment='Synthetische Probe')
          for i,(a,d,p) in enumerate(zip(angles,delta[0],psi[0]))]
    req=FitRequest(model=model,measurements=rows,parameters=[dict(path='layers.0.thickness_nm',lower=80,upper=150)],quality='quick',bootstrap_samples=0)
    result=solve(req)
    job=dict(status='completed',request=req,result=result)
    monkeypatch.setattr(server,'JOBS',{'test':job})
    return TestClient(server.app),job


def test_trial_evaluates_without_optimizing_or_mutating_completed_fit(completed_job):
    client,job=completed_job;before=copy.deepcopy(job['result'])
    response=client.post('/api/jobs/test/trial',json=dict(values=[118],name='Eigener Test'))
    assert response.status_code==200
    trial=response.json()
    assert trial['values']==[118] and trial['name']=='Eigener Test'
    assert trial['rmse_deg']<1e-8 and not trial['optimized']
    assert 'uncertainty' not in trial['comparison']
    assert job['result']==before


def test_zero_thickness_trial_is_allowed_outside_a_positive_log_search(completed_job):
    client,job=completed_job
    response=client.post('/api/jobs/test/trial',json=dict(values=[0]))
    assert response.status_code==200
    trial=response.json()
    assert trial['outside_search'] and not trial['optimized']
    assert trial['comparison']['mode']=='angle'
    assert trial['comparison']['fitted_model']['layers'][0]['thickness_nm']==0
    bare=job['request'].model.model_dump();bare['layers']=[]
    delta,psi=simulate(bare,[60,65,70,75])
    np.testing.assert_allclose([r['fit_delta'] for r in trial['comparison']['residuals']],delta[0])
    np.testing.assert_allclose([r['fit_psi'] for r in trial['comparison']['residuals']],psi[0])
    assert any(n['kind']=='warning' for n in trial['notices'])


def test_single_angle_zero_trial_curve_contains_the_entered_zero(monkeypatch):
    model=Model().model_dump();model['layers'][0]['thickness_nm']=118
    delta,psi=simulate(model,[70])
    req=FitRequest(model=model,measurements=[dict(id='a',angle=70,delta=float(delta[0,0]),psi=float(psi[0,0]))],
        parameters=[dict(path='layers.0.thickness_nm',lower=80,upper=150)],quality='quick',bootstrap_samples=0)
    monkeypatch.setattr(server,'JOBS',{'one':dict(status='completed',request=req,result=solve(req))})
    trial=TestClient(server.app).post('/api/jobs/one/trial',json=dict(values=[0])).json()
    assert trial['comparison']['mode']=='parameter'
    assert min(trial['comparison']['x'])==0
    assert trial['comparison']['points'][0]['x']==0


def test_trial_checks_physical_values_and_parameter_count(completed_job):
    client,job=completed_job
    for values in ([-1],[1,2],[1e9]):
        response=client.post('/api/jobs/test/trial',json=dict(values=values))
        assert response.status_code==400
    response=client.post('/api/jobs/test/trial',content='{"values":[NaN]}',headers={'content-type':'application/json'})
    assert response.status_code==400
    assert client.post('/api/jobs/unknown/trial',json=dict(values=[118])).status_code==404
    job['status']='running'
    assert client.post('/api/jobs/test/trial',json=dict(values=[118])).status_code==409


def test_layer_numbers_count_up_from_substrate_without_changing_paths():
    model=Model().model_dump()
    model['layers']=[dict(name='Oben',n=1.5,k=0,thickness_nm=30),dict(name='Mitte',n=1.7,k=0,thickness_nm=40),dict(name='Unten',n=2,k=0,thickness_nm=50)]
    assert medium_label(model,'layers.0.n')=='[3] Oben'
    assert medium_label(model,'layers.2.n')=='[1] Unten'
    assert medium_label(model,'substrate.n').startswith('[0] ')
    assert parameter_symbol(model,'layers.0.thickness_nm')=='d[3]'
    assert parameter_symbol(model,'layers.1.n')=='n[2]'
    assert parameter_symbol(model,'substrate.k')=='k[0]'
    assert parameter_symbol(model,'ambient.n')=='n[Einfall]'
    assert '[1] Unten' in parameter_label(model,'layers.2.n')


def test_notice_severity_distinguishes_critical_limits_from_general_information():
    result=dict(solutions=[dict(periodic=True)],periodicity=dict(message='Wiederholungen zusammengefasst.'),discarded_boundary_minima=0,
        warnings=['Das global kleinste Minimum liegt an einer Suchgrenze. Bitte den Suchbereich vergrößern.',
                  'Wenige Wiederholungen: geschätzte Kovarianzen sind unsicher.',
                  'Ein Messwinkel liefert zwei unabhängige Messgrößen.'])
    notices=result_notices(result)
    assert {n['kind'] for n in notices}=={'success','info','warning','critical'}
    assert next(n for n in notices if 'Suchgrenze' in n['text'])['kind']=='critical'
