"""Identify the first column before importing Optrel measurements."""
import re


UNITS = {'s': 1., 'ms': .001, 'µs': 1e-6, 'min': 60., 'h': 3600.}


def column_metadata(text):
    header, preview = [], []
    for line in text.splitlines():
        if not line.strip():
            continue
        if re.match(r'^\s*["\']?[+\-]?(?:\d|[.,]\d)', line):
            preview.append(line.strip()[:220])
            if len(preview) == 3:
                break
        elif not preview and len(header) < 20:
            header.append(line.casefold())
    columns = next((s for s in header if ('delta' in s or 'δ' in s) and ('psi' in s or 'ψ' in s)), '')
    first = re.split(r'delta|δ', columns, maxsplit=1)[0]
    time = re.search(r'(?:\b(?:time|zeit|messzeit|t)\b|(?:time|zeit)_)(?:\s*[\[(/_]?\s*(ms|µs|μs|us|min|sec|s|h)\b)?', first)
    unit = time.group(1) if time else None
    if unit in ('μs', 'us'):
        unit = 'µs'
    if unit == 'sec':
        unit = 's'
    kind = 'time' if time else 'angle' if re.search(r'winkel|angle|phi|φ|ϕ|winkel_grad', first) else 'unknown'
    stated = re.search(r'(?:einfallswinkel|angle of incidence|incidence angle|aoi)\s*[:=]\s*(\d+(?:[.,]\d+)?)', '\n'.join(header))
    return dict(kind=kind, unit=unit, angle=float(stated[1].replace(',', '.')) if stated else None, preview=preview)
