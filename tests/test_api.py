from fastapi.testclient import TestClient
from ellifit import server
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
