import copy
import os
from pathlib import Path
from threading import Event

import numpy as np
import pytest

from ellifit.core import Cancelled, FitRequest, Model, Objective, Observations, comparison, parse_data, reflection, simulate, solve, stokes, wrap


def rows(model, angles):
    d, p = simulate(model, angles)
    return [dict(id=str(i), angle=float(a), delta=float(di), psi=float(pi)) for i, (a, di, pi) in enumerate(zip(angles, d[0], p[0]))]


def request(parameters, angles=(60, 64, 68, 72, 76), **settings):
    truth = Model().model_dump()
    truth['layers'][0].update(thickness_nm=123.456, n=1.67)
    model = copy.deepcopy(truth)
    model['layers'][0]['thickness_nm'] = 80
    return FitRequest(model=model, measurements=rows(truth, angles), parameters=parameters, quality='quick', **settings)


def test_bare_substrate_analytical_dielectric_inversion():
    model = Model(layers=[]).model_dump()
    phi = np.deg2rad(np.array([50., 60, 70, 80]))
    rp, rs = reflection(model, np.rad2deg(phi))
    rho = rp[0] / rs[0]
    eps = np.sin(phi) ** 2 * (1 + np.tan(phi) ** 2 * ((1 - rho) / (1 + rho)) ** 2)
    expected = (model['substrate']['n'] + 1j * model['substrate']['k']) ** 2
    np.testing.assert_allclose(eps, expected, rtol=1e-12, atol=1e-12)


def test_zero_thickness_equals_bare_substrate():
    model = Model().model_dump()
    model['layers'][0]['thickness_nm'] = 0
    bare = copy.deepcopy(model)
    bare['layers'] = []
    for actual, expected in zip(reflection(model, [45, 70]), reflection(bare, [45, 70])):
        np.testing.assert_allclose(actual, expected, atol=1e-13)


def test_thick_absorber_has_stable_semi_infinite_limit():
    model = Model().model_dump()
    model['layers'][0].update(n=2, k=3, thickness_nm=1e7)
    limit = Model(layers=[]).model_dump()
    limit['substrate'].update(n=2, k=3)
    for actual, expected in zip(reflection(model, [45, 70]), reflection(limit, [45, 70])):
        assert np.isfinite(actual).all()
        np.testing.assert_allclose(actual, expected, atol=1e-13)


@pytest.mark.parametrize('angle, ambient, films, substrate', [
    (70, 1, [(1.46, 0, 118), (2.1, 0, 83)], (3.882, .019)),
    (62, 1, [(1.7, .18, 72), (.3, 3.4, 23), (2.2, .01, 200)], (1.5, 0)),
    (68, 1.52, [(1.1, 0, 90), (1.8, .2, 35)], (1.33, 0)),
])
def test_independent_tmm_reference(angle, ambient, films, substrate):
    tmm = pytest.importorskip('tmm')
    model = Model().model_dump()
    model['ambient']['n'] = ambient
    model['layers'] = [dict(name=str(i), n=n, k=k, thickness_nm=d) for i, (n, k, d) in enumerate(films)]
    model['substrate'].update(n=substrate[0], k=substrate[1])
    indices = [ambient, *[n + 1j * k for n, k, d in films], substrate[0] + 1j * substrate[1]]
    thicknesses = [np.inf, *[d for n, k, d in films], np.inf]
    rp, rs = reflection(model, [angle])
    for pol, actual in [('p', rp[0, 0]), ('s', rs[0, 0])]:
        expected = tmm.coh_tmm(pol, indices, thicknesses, np.deg2rad(angle), 632.8)['r']
        np.testing.assert_allclose(actual, expected, rtol=3e-12, atol=3e-12)


def test_phase_convention_and_wrap():
    model = Model().model_dump()
    model['delta_convention'] = 'standard'
    d, p = simulate(model, [70])
    model['delta_convention'] = 'reversed'
    dr, pr = simulate(model, [70])
    np.testing.assert_allclose((d + dr) % 360, 0, atol=1e-12)
    np.testing.assert_allclose(p, pr)
    assert abs(float(wrap(359.9 - .1)) + .2) < 1e-10


def test_no_reflection_is_undefined():
    model = Model(layers=[]).model_dump()
    model['substrate'].update(n=1, k=0)
    d, p = simulate(model, [70])
    assert np.isnan(d).all() and np.isnan(p).all()


def test_repeated_rows_preserve_exact_objective():
    rng = np.random.default_rng(42)
    data = [dict(id=str(i), angle=70, delta=float(d), psi=float(p)) for i, (d, p) in enumerate(zip(rng.uniform(0, 360, 401), rng.uniform(0, 90, 401)))]
    obs = Observations(data)
    d, p = np.array([[.1], [180], [359.9]]), np.array([[20.], [50], [89]])
    expected = [sum((wrap(di - r['delta']) / .1) ** 2 + ((pi - r['psi']) / .2) ** 2 for r in data) for di, pi in zip(d[:, 0], p[:, 0])]
    np.testing.assert_allclose(obs.sse(d, p, sigmas=(.1, .2)), expected, rtol=1e-12)
    expected = [sum(np.sum((stokes(di, pi) - stokes(r['delta'], r['psi'])) ** 2) for r in data) for di, pi in zip(d[:, 0], p[:, 0])]
    np.testing.assert_allclose(obs.sse(d, p, 'stokes'), expected, rtol=1e-12)


def test_circular_mean_and_duplicate_counts():
    data = [dict(id='a', angle=70, delta=359, psi=20), dict(id='b', angle=70.00001, delta=1, psi=22)]
    avg, repeat = Observations(data, 'average'), Observations(data, 'repeat')
    assert avg.count == 1 and repeat.count == 2
    assert abs(float(wrap(avg.ds[0][0]))) < 1e-10
    assert avg.pm[0] == 21


def test_import_formats_and_quoted_export_roundtrip():
    text = 'Null-Elli winkelabhängig\nProbenkommentar\n70.0 359,9 21,5 >> Test\n'
    data = parse_data(text.encode('cp1252'), 'sample.phi')
    assert data['count'] == 1 and data['rows'][0]['psi'] == 21.5
    assert data['rows'][0]['comment'] == 'Test'
    quoted = b'"Winkel";"Delta";"Psi";"Kommentar"\n"70";"359,9";"21,5";"test"\n'
    assert parse_data(quoted, 'export.csv')['rows'][0]['delta'] == 359.9


def test_original_user_files_if_available():
    folder = os.environ.get('ELLIFIT_EXAMPLES_DIR')
    if not folder:
        pytest.skip('Original measurements are intentionally not distributed')
    root = Path(folder)
    phi, dat = next(root.rglob('*.phi')), next(root.rglob('*.dat'))
    assert parse_data(phi.read_bytes(), phi.name)['count'] == 10
    assert parse_data(dat.read_bytes(), dat.name)['count'] == 16377


def test_global_thickness_fit():
    req = request([dict(path='layers.0.thickness_nm', lower=.1, upper=1000)])
    result = solve(req)
    assert abs(result['solutions'][0]['values'][0] - 123.456) < .002
    assert result['solutions'][0]['rmse_deg'] < .001


def test_boundary_minimum_is_reported():
    result = solve(request([dict(path='layers.0.thickness_nm', lower=110, upper=120)]))
    assert result['solutions'][0]['at_boundary']


def test_simultaneous_thickness_and_index():
    req = request([dict(path='layers.0.thickness_nm', lower=.1, upper=1000), dict(path='layers.0.n', lower=1.1, upper=3)])
    result = solve(req)
    np.testing.assert_allclose(result['solutions'][0]['values'], [123.456, 1.67], atol=3e-3)
    assert result['solutions'][0]['rmse_deg'] < .001


def test_stokes_index_fit():
    req = request([dict(path='layers.0.n', lower=1, upper=4)], metric='stokes')
    req.model.layers[0].thickness_nm = 123.456
    assert abs(solve(req)['solutions'][0]['values'][0] - 1.67) < 1e-5


def test_single_angle_periodic_family():
    req = request([dict(path='layers.0.thickness_nm', lower=.1, upper=1000)], angles=(70,))
    result = solve(req)
    expected = 632.8 / (2 * np.sqrt(1.67 ** 2 - np.sin(np.deg2rad(70)) ** 2))
    assert result['periodicity']['kind'] == 'exact'
    assert abs(result['periodicity']['periods'][0]['period_nm'] - expected) < 1e-10
    values = sorted(s['values'][0] for s in result['periodicity']['first_solutions'])
    assert len(values) >= 4
    np.testing.assert_allclose(np.diff(values), expected, atol=.003)


def test_absorber_has_no_exact_period():
    req = request([dict(path='layers.0.thickness_nm', lower=.1, upper=1000)], angles=(70,))
    req.model.layers[0].k = .1
    assert solve(req)['periodicity']['kind'] == 'none'


def test_flat_objective_not_called_periodic():
    req = request([dict(path='layers.0.thickness_nm', lower=.1, upper=1000)], angles=(70,))
    req.model.substrate.n = req.model.layers[0].n
    req.model.substrate.k = req.model.layers[0].k
    result = solve(req)
    assert result['periodicity']['kind'] == 'none'
    assert any('flach' in w for w in result['warnings'])


def test_two_transparent_thickness_periods():
    m = Model().model_dump()
    m['layers'] = [dict(name='A', n=1.46, k=0, thickness_nm=118), dict(name='B', n=2, k=0, thickness_nm=55)]
    req = FitRequest(model=m, measurements=rows(m, [70]), quality='quick', parameters=[dict(path='layers.0.thickness_nm', lower=.1, upper=1000), dict(path='layers.1.thickness_nm', lower=.1, upper=1000)])
    result = solve(req)
    assert result['periodicity']['kind'] == 'lattice'
    expected = [632.8 / (2 * np.sqrt(n ** 2 - np.sin(np.deg2rad(70)) ** 2)) for n in [1.46, 2]]
    np.testing.assert_allclose([p['period_nm'] for p in result['periodicity']['periods']], expected)
    assert result['periodicity']['equivalent_count'] >= 8


def test_substrate_nk_fit_rejects_undefined_corner():
    m = Model(layers=[]).model_dump()
    req = FitRequest(model=m, measurements=rows(m, [70]), quality='quick', parameters=[dict(path='substrate.n', lower=1, upper=4), dict(path='substrate.k', lower=0, upper=2)])
    obj = Objective(req)
    assert obj.batch([[0, 0]])[0] == 1e100
    np.testing.assert_allclose(solve(req)['solutions'][0]['values'], [3.882, .019], atol=1e-5)


def test_duplicate_decision_and_cancellation():
    req = request([dict(path='layers.0.thickness_nm', lower=.1, upper=1000)], angles=(70, 70))
    with pytest.raises(ValueError, match='Wiederholungen'):
        solve(req)
    req.duplicate_policy = 'repeat'
    event = Event()
    event.set()
    with pytest.raises(Cancelled):
        solve(req, cancel=event)


def test_single_angle_plot_with_thickness_as_second_parameter():
    req = request([dict(path='layers.0.n', lower=1, upper=4), dict(path='layers.0.thickness_nm', lower=.1, upper=1000)], angles=(70,))
    result = comparison(req, [1.67, 123.456])
    assert result['xlabel'].endswith('d / nm')
    assert result['fixed_parameter_label'].endswith(' · n')
    assert result['points'][0]['x'] == 123.456


def test_default_output_matches_opposite_phasor_reference():
    # Independent bare-interface reference with N=n-ik / exp(+i*omega*t).
    # This tests the output conversion, not the unavailable original Elli binary.
    model = Model(layers=[]).model_dump()
    phi = np.deg2rad(np.array([50., 60, 70, 80]))
    index = model['substrate']['n'] - 1j * model['substrate']['k']
    q = np.sqrt(index ** 2 - np.sin(phi) ** 2 + 0j)
    rs = (np.cos(phi) - q) / (np.cos(phi) + q)
    rp = (index ** 2 * np.cos(phi) - q) / (index ** 2 * np.cos(phi) + q)
    rho = rp / rs
    delta, psi = simulate(model, np.rad2deg(phi))
    np.testing.assert_allclose(wrap(delta[0] - np.rad2deg(np.angle(rho))), 0, atol=1e-10)
    np.testing.assert_allclose(psi[0], np.rad2deg(np.arctan(abs(rho))), atol=1e-12)
