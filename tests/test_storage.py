import json

import pytest
from fastapi.testclient import TestClient

from ellifit import server
from ellifit.core import Model


def document(kind):
    return Model(name='Meine Schichtfolge').model_dump() if kind == 'model' else dict(
        schema_version=1, name='Mein Material', n=1.65, k=0, wavelength_nm=632.8)


@pytest.mark.parametrize('kind', ['model', 'material'])
def test_portable_names_reject_paths_and_windows_devices_without_touching_files(tmp_path, monkeypatch, kind):
    monkeypatch.setattr(server, 'MODEL_DIR' if kind == 'model' else 'MATERIAL_DIR', tmp_path)
    client = TestClient(server.app)
    url = '/api/models' if kind == 'model' else '/api/materials'
    body = {kind: document(kind), 'filename': 'Ursprünglicher Stand.json'}
    assert client.post(url, json=body).status_code == 200
    original = (tmp_path / body['filename']).read_bytes()
    for name in ['../anderes.json', r'..\anderes.json', 'C:Datei.json', 'A/B.json',
                 'CON.json', 'prn.json', 'LPT1.extra.json', 'COM9.json', '.json',
                 'a?.json', 'a*.json', 'a|b.json', 'ohne Endung', ' a.json', 'a.json ']:
        response = client.post(url, json=body | {'filename': name, 'overwrite': True})
        assert response.status_code == 400, (name, response.text)
        assert (tmp_path / body['filename']).read_bytes() == original
    assert sorted(p.name for p in tmp_path.iterdir()) == [body['filename']]


@pytest.mark.parametrize('kind', ['model', 'material'])
def test_save_as_keeps_original_and_conflict_requires_explicit_overwrite(tmp_path, monkeypatch, kind):
    monkeypatch.setattr(server, 'MODEL_DIR' if kind == 'model' else 'MATERIAL_DIR', tmp_path)
    client = TestClient(server.app)
    url = '/api/models' if kind == 'model' else '/api/materials'
    first = document(kind)
    assert client.post(url, json={kind: first, 'filename': 'Original.json'}).status_code == 200
    original = (tmp_path / 'Original.json').read_bytes()
    changed = first | {'name': 'Geänderte Kopie'}
    if kind == 'model':
        changed = json.loads(json.dumps(changed))
        changed['layers'][0]['thickness_nm'] = 147.2
    else:
        changed['n'] = 1.712
    conflict = client.post(url, json={kind: changed, 'filename': 'Original.json'})
    assert conflict.status_code == 409
    assert conflict.json()['detail']['filename'] == 'Original.json'
    assert (tmp_path / 'Original.json').read_bytes() == original
    assert client.post(url, json={kind: changed, 'filename': 'Neue Kopie.json'}).status_code == 200
    assert (tmp_path / 'Original.json').read_bytes() == original
    assert client.get(url + '/Neue Kopie.json').json()['name'] == changed['name']
    assert client.post(url, json={kind: changed, 'filename': 'Original.json', 'overwrite': True}).status_code == 200
    stored = client.get(url + '/Original.json').json()
    assert stored['name'] == changed['name']
    assert stored['layers'][0]['thickness_nm'] == 147.2 if kind == 'model' else stored['n'] == 1.712
    assert not list(tmp_path.glob('*.tmp'))
