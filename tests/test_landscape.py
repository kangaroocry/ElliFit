import numpy as np
from scipy.spatial import Delaunay

from ellifit.core import FitRequest, Model, Objective, simulate
from ellifit.landscape import MeanCompatibility, _boundaries


def repeated_objective(angles=(68,),automatic='auto'):
    model=Model().model_dump();d,p=simulate(model,angles)
    noise=[(-.01,-.015),(.02,.019),(-.01,-.004)]
    rows=[dict(id=f'{i}-{j}',angle=a,delta=float(d[0,i]+dd),psi=float(p[0,i]+pp))
          for i,a in enumerate(angles) for j,(dd,pp) in enumerate(noise)]
    return Objective(FitRequest(model=model,measurements=rows,
        parameters=[dict(path='layers.0.thickness_nm',lower=30,upper=300),dict(path='layers.0.n',lower=1,upper=2)],
        uncertainty_mode=automatic,bootstrap_samples=0))


def test_three_repeat_confidence_boundary_is_798_not_chi_square():
    obj=repeated_objective();compatibility=MeanCompatibility(obj)
    record=obj.analysis.records[0]
    covariance=np.array(record['covariance'])
    residual=np.linalg.cholesky(covariance)@np.array([np.sqrt(798/3),0.])
    p=compatibility.from_prediction(np.array([[record['mean_delta']+residual[0]]]),np.array([[record['mean_psi']+residual[1]]]))
    np.testing.assert_allclose(p,.05,rtol=1e-11)
    assert compatibility.public()['groups']==1


def test_multiple_angle_confidence_uses_simultaneous_conservative_correction():
    obj=repeated_objective((65,70));compatibility=MeanCompatibility(obj)
    records=obj.analysis.records
    d=np.array([[r['mean_delta'] for r in records]]);p=np.array([[r['mean_psi'] for r in records]])
    covariance=np.array(records[0]['covariance'])
    # m=3, p=2: single-angle T²=3198 has p=.025; two tests -> .05.
    residual=np.linalg.cholesky(covariance)@np.array([np.sqrt(3198/3),0.])
    d[0,0]+=residual[0];p[0,0]+=residual[1]
    np.testing.assert_allclose(compatibility.from_prediction(d,p),.05,rtol=1e-10)
    assert 'Bonferroni' in compatibility.public()['method']


def test_disabled_covariance_has_no_invented_confidence_set():
    obj=repeated_objective(automatic='none');compatibility=MeanCompatibility(obj)
    assert not compatibility.available
    assert np.isnan(compatibility.from_prediction([[100]],[[30]])).all()
    assert compatibility.public()['unavailable_reason']


def test_confidence_boundary_clipping_preserves_holes_and_search_box():
    x,y=np.meshgrid(np.linspace(0,1,9),np.linspace(0,1,9))
    vertices=np.c_[x.ravel(),y.ravel()];triangles=Delaunay(vertices).simplices
    radius=np.linalg.norm(vertices-.5,axis=1)
    score=((radius>.18)&(radius<.47)).astype(float)
    rings,unclosed=_boundaries(vertices,triangles,score,.5)
    assert unclosed==0
    assert sum(area>0 for ring,area in rings)==1
    assert sum(area<0 for ring,area in rings)==1
    rings,unclosed=_boundaries(vertices,triangles,np.ones(len(vertices)),.05)
    assert unclosed==0 and len(rings)==1
    np.testing.assert_allclose(rings[0][1],1,atol=1e-12)
