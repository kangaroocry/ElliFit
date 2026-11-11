import argparse
import os
from pathlib import Path
import socket
import threading
import webbrowser


def main():
    parser = argparse.ArgumentParser(description='ElliFit · lokale Ellipsometrie')
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--models', type=Path)
    parser.add_argument('--materials', type=Path)
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    if args.models:
        os.environ['ELLIFIT_MODELS'] = str(args.models.expanduser().resolve())
    if args.materials:
        os.environ['ELLIFIT_MATERIALS'] = str(args.materials.expanduser().resolve())
    try:
        with socket.socket() as probe:
            probe.bind(('127.0.0.1', args.port))
    except OSError:
        print(f'Port {args.port} ist belegt. Mit --port {args.port + 1} starten.')
        raise SystemExit(1)
    import uvicorn
    url = f'http://127.0.0.1:{args.port}'
    print(f'ElliFit: {url}\nDieses Fenster offen lassen. Beenden mit Strg+C.')
    if not args.no_browser:
        timer = threading.Timer(1.2, lambda: webbrowser.open(url))
        timer.daemon = True
        timer.start()
    uvicorn.run('ellifit.server:app', host='127.0.0.1', port=args.port, log_level='warning')


if __name__ == '__main__':
    main()
