from types import SimpleNamespace
import threading
import time

import launch


def test_browser_waits_for_server_and_settling_interval(monkeypatch):
    server = SimpleNamespace(started=False, should_exit=False)
    stopped, opened = threading.Event(), threading.Event()
    calls = []

    def open_browser(url):
        calls.append((url, server.started, time.monotonic()))
        opened.set()

    monkeypatch.setattr(launch.webbrowser, 'open', open_browser)
    thread = threading.Thread(target=launch.open_browser_when_ready,
                              args=(server, 'http://127.0.0.1:8765/?v=test', stopped, 0.04))
    thread.start()
    try:
        assert not opened.wait(0.06)
        ready = time.monotonic()
        server.started = True
        assert opened.wait(3)
        assert len(calls) == 1
        assert calls[0][0] == 'http://127.0.0.1:8765/?v=test'
        assert calls[0][1] is True and calls[0][2] - ready >= 0.035
    finally:
        stopped.set()
        thread.join(3)
    assert not thread.is_alive()


def test_no_browser_if_startup_stops_before_listening(monkeypatch):
    server = SimpleNamespace(started=False, should_exit=False)
    stopped = threading.Event()
    calls = []
    monkeypatch.setattr(launch.webbrowser, 'open', calls.append)
    thread = threading.Thread(target=launch.open_browser_when_ready,
                              args=(server, 'unused', stopped, 0))
    thread.start()
    stopped.set()
    thread.join(3)
    assert not thread.is_alive() and not calls


def test_shutdown_interrupts_browser_delay(monkeypatch):
    server = SimpleNamespace(started=True, should_exit=False)
    waiting = threading.Event()

    class StopEvent(threading.Event):
        def wait(self, timeout=None):
            waiting.set()
            return super().wait(timeout)

    stopped = StopEvent()
    calls = []
    monkeypatch.setattr(launch.webbrowser, 'open', calls.append)
    thread = threading.Thread(target=launch.open_browser_when_ready,
                              args=(server, 'unused', stopped, 10))
    thread.start()
    assert waiting.wait(3)
    stopped.set()
    thread.join(3)
    assert not thread.is_alive() and not calls


def test_no_browser_for_server_already_exiting(monkeypatch):
    calls = []
    monkeypatch.setattr(launch.webbrowser, 'open', calls.append)
    launch.open_browser_when_ready(SimpleNamespace(started=True, should_exit=True),
                                   'unused', threading.Event(), delay=0)
    assert not calls
