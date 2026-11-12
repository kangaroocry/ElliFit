from fastapi.testclient import TestClient
import html
import re
import shutil
from ellifit import server
from ellifit import __version__
from ellifit.core import Model


def test_model_save_load_and_validation(tmp_path, monkeypatch):
    monkeypatch.setattr(server, 'MODEL_DIR', tmp_path)
    client = TestClient(server.app)
    model = Model(name='Testmodell').model_dump()
    saved = client.post('/api/models', json={'model': model})
    assert saved.status_code == 200
    filename = saved.json()['filename']
    assert client.get('/api/models').json()['models'][0]['name'] == 'Testmodell'
    assert client.get('/api/models/' + filename).json() == model
    assert client.post('/api/models', json={'model': model}).status_code == 409
    assert client.post('/api/models', json={'model': model, 'filename': '../bad.json'}).status_code == 400
    model['ambient']['k'] = 1
    assert client.post('/api/validate-model', json=model).status_code == 422


def test_import_and_origin_restriction():
    client = TestClient(server.app)
    data = client.post('/api/import', files={'file': ('a.dat', b'Header\n70 359.9 20.1 >> a\n')})
    assert data.status_code == 200 and data.json()['count'] == 1
    assert client.post('/api/models', json={'model': Model().model_dump()}, headers={'origin': 'https://unrelated.example'}).status_code == 403


def test_material_library_roundtrip_and_validation(tmp_path,monkeypatch):
    monkeypatch.setattr(server,'MATERIAL_DIR',tmp_path)
    client=TestClient(server.app)
    material=dict(schema_version=1,name='Testglas',n=1.456,k=0,wavelength_nm=632.8,uncertainty_n=.001,notes='Referenz')
    saved=client.post('/api/materials',json={'material':material})
    assert saved.status_code==200
    filename=saved.json()['filename']
    loaded=client.get('/api/materials/'+filename).json()
    assert loaded['n']==1.456 and loaded['uncertainty_n']==.001
    assert client.get('/api/materials').json()['materials'][0]['name']=='Testglas'
    assert client.post('/api/materials',json={'material':material}).status_code==409
    assert client.post('/api/materials',json={'material':material,'filename':'../bad.json'}).status_code==400
    assert client.post('/api/validate-material',json=material|{'wavelength_nm':-1}).status_code==422


def test_session_normalizes_legacy_defaults_and_preserves_explicit_convention():
    client=TestClient(server.app)
    model=Model().model_dump();model.pop('delta_convention')
    session=dict(type='ellifit-session',version=1,model=model,
        measurements=[dict(id='a',angle=70,delta=100,psi=30)],selected=['a'],
        parameters=[dict(path='layers.0.n',lower=1,upper=4),dict(path='')])
    response=client.post('/api/validate-session',json=session)
    assert response.status_code==200
    normalized=response.json()
    assert normalized['model']['delta_convention']=='reversed'
    assert normalized['parameters'][0]['scale']=='linear'
    assert normalized['measurements'][0]['source']=='Manuell'
    session['model']['delta_convention']='standard'
    assert client.post('/api/validate-session',json=session).json()['model']['delta_convention']=='standard'
    session['parameters']=[dict(path=''),dict(path='')]
    assert client.post('/api/validate-session',json=session).status_code==200
    assert client.post('/api/fit',json=dict(model=model,measurements=session['measurements'],parameters=[])).status_code==422


def test_browser_assets_are_versioned_and_never_heuristically_cached():
    client=TestClient(server.app)
    page=client.get('/')
    assets=[html.unescape(path) for path in re.findall(r'(?:src|href)="([^"]+)"',page.text) if path.startswith(('/static/','/plotly.js'))]
    assert len(assets)==3
    assert all('?v=' in path for path in assets)
    assert all('&build=' in path for path in assets if path.startswith('/static/'))
    for path in ['/', '/api/info', *assets]:
        response=client.get(path)
        assert response.status_code==200
        assert response.headers['cache-control']=='no-store'
        assert response.headers['x-ellifit-version']==__version__


def test_asset_addresses_change_when_contents_change_without_version_bump(tmp_path,monkeypatch):
    for name in ['index.html','app.js','style.css']:
        shutil.copy2(server.STATIC/name,tmp_path/name)
    monkeypatch.setattr(server,'STATIC',tmp_path)
    client=TestClient(server.app)
    def bundle():return re.search(r'/static/app\.js\?v=[^" ]+',client.get('/').text).group()
    first=bundle()
    app=tmp_path/'app.js'
    app.write_text(app.read_text()+'\n// changed asset\n')
    second=bundle()
    css=tmp_path/'style.css'
    css.write_text(css.read_text()+'\n/* changed style */\n')
    assert first!=second and second!=bundle()
