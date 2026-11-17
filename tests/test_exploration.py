import copy
import threading
from types import SimpleNamespace
import numpy as np
from fastapi.testclient import TestClient
from ellifit import server
from ellifit.core import FitRequest, Model, simulate, wrap
from ellifit.profiles import continue_branch


def test_valley_stops_at_first_parameter_edge_instead_of_following_it():
    class Valley:
        cancel=threading.Event()
        def residual(self,z):return np.array([z[1]-2*z[0],.05*(z[0]-.2)])
    points=continue_branch(Valley(),[.2,.4],fixed=0)
    edge=(points[:,1]>1-2e-6)
    assert edge.sum()==1 and edge[-1]
    assert .49<points[-1,0]<.52
    assert not np.any(edge[:-1])
    np.testing.assert_allclose(points[1:-1,1],2*points[1:-1,0],atol=2e-7)


def view_request(parameters):
    model=Model().model_dump();truth=copy.deepcopy(model);truth['layers'][0]['thickness_nm']=118
    angles=[60,65,70,75];d,p=simulate(truth,angles)
    rows=[dict(id=str(i),angle=a,delta=float(d[0,i]),psi=float(p[0,i])) for i,a in enumerate(angles)]
    return FitRequest(model=model,measurements=rows,parameters=parameters,bootstrap_samples=0)


def test_view_refinement_evaluates_physical_model_and_does_not_change_fit(monkeypatch):
    req=view_request([dict(path='layers.0.thickness_nm',lower=.1,upper=1000,scale='log'),dict(path='layers.0.n',lower=1,upper=4,scale='linear')])
    result=dict(solutions=[dict(aliases=[dict(values=[118,1.46])])],identifiability={})
    job=dict(status='completed',request=req,result=result)
    monkeypatch.setattr(server,'JOBS',{'test':job});before=req.model_dump();saved=copy.deepcopy(result)
    response=TestClient(server.app).post('/api/jobs/test/view',json=dict(bounds=[[100,150],[1.4,1.5]],scales=['log','linear'],size=41))
    assert response.status_code==200,response.text[:100]
    data=response.json();assert not data['optimized'] and data['evaluations']==41**2
    np.testing.assert_allclose(np.diff(np.log(data['axes'][0])),np.diff(np.log(data['axes'][0]))[0])
    np.testing.assert_allclose(np.diff(data['axes'][1]),.1/40)
    values=np.array([[data['axes'][0][0],data['axes'][1][0]],[data['axes'][0][-1],data['axes'][1][-1]]])
    d,p=simulate(req.model.model_dump(),[r.angle for r in req.measurements],values,[x.path for x in req.parameters])
    residual=np.c_[wrap(d-[r.delta for r in req.measurements]),p-[r.psi for r in req.measurements]]
    np.testing.assert_allclose([data['rms'][0][0],data['rms'][-1][-1]],np.sqrt(np.mean(residual**2,axis=1)))
    index=np.argmin(np.linalg.norm(np.array(data['mesh']['values'])-[118,1.46],axis=1))
    np.testing.assert_allclose(data['mesh']['values'][index],[118,1.46],atol=1e-12)
    assert req.model_dump()==before and result==saved


def test_view_refinement_hybrid_log_axis_keeps_exact_zero(monkeypatch):
    req=view_request([dict(path='layers.0.k',lower=0,upper=.1,scale='log',positive_min=1e-8)])
    monkeypatch.setattr(server,'JOBS',{'test':dict(status='completed',request=req,result=dict(solutions=[],identifiability={}))})
    response=TestClient(server.app).post('/api/jobs/test/view',json=dict(bounds=[[0,.001]],scales=['log'],size=41))
    assert response.status_code==200
    x=response.json()['axes'][0];assert x[0]==0 and abs(x[-1]-.001)<1e-15
    assert all(a<b for a,b in zip(x,x[1:]))


def test_view_refinement_validates_job_and_search_overlap(monkeypatch):
    req=view_request([dict(path='layers.0.n',lower=1,upper=4)])
    monkeypatch.setattr(server,'JOBS',{'test':dict(status='completed',request=req,result=dict(solutions=[],identifiability={}))})
    client=TestClient(server.app);body=dict(bounds=[[5,6]],scales=['linear'],size=41)
    assert client.post('/api/jobs/missing/view',json=body).status_code==404
    assert client.post('/api/jobs/test/view',json=body).status_code==400
    server.JOBS['test']['status']='running'
    assert client.post('/api/jobs/test/view',json=body).status_code==409


def test_valley_seed_on_boundary_does_not_generate_a_boundary_track():
    class Valley:
        cancel=threading.Event()
        def residual(self,z):return np.array([z[1],.1*z[0]])
    points=continue_branch(Valley(),[.3,0],fixed=0)
    np.testing.assert_allclose(points,[[.3,0]])


def test_thin_logarithmic_valley_points_are_actual_conditional_minima():
    from ellifit.core import Objective
    from ellifit.diagnostics import fit_diagnostics
    from ellifit.statistics import parameter_uncertainty
    model=Model().model_dump();model['layers'][0].update(n=1.6,thickness_nm=2)
    d,p=simulate(model,[70])
    req=FitRequest(model=model,measurements=[dict(id='a',angle=70,delta=float(d[0,0]),psi=float(p[0,0]))],
        parameters=[dict(path='layers.0.thickness_nm',lower=.1,upper=50,scale='log'),dict(path='layers.0.n',lower=1.1,upper=2.5,scale='linear')],bootstrap_samples=0)
    obj=Objective(req);values=[2,1.6]
    solution=dict(values=values,rank=1,aliases=[dict(index=0,values=values)],uncertainty=parameter_uncertainty(obj,values))
    diag=fit_diagnostics(obj,[solution],[np.linspace(0,1,100)]*2)
    assert diag['profile']
    points=diag['profile']['points'];assert any(x['values'][0]<2 for x in points)
    for point in points[2:-2:7]:
        z=obj.encode(point['values'])[0];left=z.copy();right=z.copy();left[0]-=1e-5;right[0]+=1e-5
        assert obj.scalar(z)<=min(obj.scalar(left),obj.scalar(right))+1e-8
