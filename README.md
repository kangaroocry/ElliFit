# ElliFit 1.3.2

Lokale Auswertung monochromatischer Ellipsometrie: Schichtmodelle und Materialien speichern und Schichtdicke, Brechungsindex oder Extinktionskoeffizient global fitten. Ein oder zwei Parameter können gleichzeitig frei sein.

**[ElliFit 1.3.2 als ZIP herunterladen](https://github.com/kangaroocry/ElliFit/archive/9fee7c96e9c23b66a0bd66717fc5f4bb97e5169f.zip)**

- [Quellcode und ausführliche Anleitung](https://github.com/kangaroocry/ElliFit/tree/ellifit-1.2)
- [Materialwerte, Schichtvorlagen und Quellen](https://github.com/kangaroocry/ElliFit/blob/9fee7c96e9c23b66a0bd66717fc5f4bb97e5169f/MATERIALIEN.md)
- [Umgesetzte Verbesserungen](https://github.com/kangaroocry/ElliFit/blob/9fee7c96e9c23b66a0bd66717fc5f4bb97e5169f/AENDERUNGEN_1.2.md)
- [Prüfprotokoll](https://github.com/kangaroocry/ElliFit/blob/9fee7c96e9c23b66a0bd66717fc5f4bb97e5169f/PRUEFPROTOKOLL.md)

## Neu in 1.3.2

Ein Fehler nach erfolgreichem DAT-Import ist behoben: Bei stark verteilten Delta-Werten konnte die automatische Wiederholungsanalyse einen NumPy-Wahrheitswert erzeugen, den die Browser-Schnittstelle nicht als JSON übertragen konnte. Die Meldung enthielt `'numpy.bool' object is not iterable` und `vars() argument must have __dict__ attribute`. Jetzt wird ausdrücklich ein normaler Python-Wahrheitswert verwendet. Messwerte, Kriterien für geeignete Wiederholungen und Unsicherheitsrechnung bleiben gleich; fehlende Unsicherheit wird nicht durch null ersetzt.

Der Fehler wurde mit der aktuell hochgeladenen privaten DAT mit 16 434 Messungen exakt reproduziert und nach der Korrektur durch Import, automatische Analyse und einen ausgewählten Fit geprüft. Ein unabhängiger synthetischer Auslöser ist als Regressionstest enthalten. Private Dateien, Messwerte, Kommentare und Ergebnisse werden nicht veröffentlicht.

Es gibt jetzt **einen gemeinsamen Windows-Starter: `Start_Windows.bat`**. Er bevorzugt funktionierendes Python aus PATH, prüft Python 3.11 oder neuer in 64 Bit und verwendet sonst `py -3`. Pakete werden ausschließlich in der lokalen `.venv` installiert. Der separate `Start_WinPython.bat` entfällt.

Geprüft mit **26 gezielten Rechen-/API-/Starttests und vier tatsächlichen Chromium-Prüfungen** unter Linux, einschließlich vollständigem DAT-Import, Wiederholungsanalyse, Fits und Referenzdicke 118 nm. Der Windows-Starter wurde statisch geprüft; ein tatsächlicher Windows-/WinPython-Lauf wurde hier nicht durchgeführt. Das verlinkte ZIP wurde heruntergeladen und mit allen **61 Quelldateien bytegenau** abgeglichen.

## Start und Update

ZIP vollständig in einen **neuen beschreibbaren Ordner** entpacken und **`Start_Windows.bat`** doppelklicken. Python muss dauerhaft verfügbar sein; auch portables WinPython funktioniert über den Benutzer-PATH. Der Ordner mit `python.exe` muss dort vor `Microsoft\WindowsApps` stehen. Mit `where.exe python` und `python --version` in einer neu geöffneten Eingabeaufforderung prüfen.

Beim ersten Start werden die Pakete aus dem Internet in `.venv` eingerichtet. Eine frühere `.venv-winpython` wird nicht automatisch übernommen. Eigene Modell-, Material- und Sitzungsdateien können gezielt in die neue Version übernommen werden; bestehende eigene Bibliotheksordner werden nicht automatisch verändert. Adminrechte sind bei beschreibbarem Programmordner und erlaubter Programmausführung nicht erforderlich.

Der Browser öffnet sich erst nach Serverbereitschaft und einer zusätzlichen Sekunde. Während Suche und Ergebnisdarstellung ist die Oberfläche ausgegraut und gesperrt; Fortschritt und Abbruch bleiben erreichbar. Erst nach fertig gezeichneten Ergebnissen wird sie wieder freigegeben. Einparameterfits beginnen mit logarithmischer RMS-Achse; anschließendes manuelles Umschalten bleibt möglich.

## Enthaltene Auswertung

Modell, Suche und Messdaten stehen oben über die volle Breite. Ab 1 240 px erscheinen Lösungsliste, Fehlerlandschaft und Fit-Kurven nebeneinander. Zoom bleibt beim Wechsel sichtbarer Lösungen erhalten; Achsenticks passen sich an. Frühere Ergebnisse und Hinweise nennen den zugehörigen Eingabestand. Lange Messlisten bieten freie Seitenlänge, standardmäßig 100 Einträge ohne Gruppen, umkehrbare Dateireihenfolge und direkte Sprünge.

18 Materialien und elf Schichtvorlagen bei 632,8 nm sind enthalten. Identische SiO2-Materialwerte sind zusammengefasst; native Oxidmodelle behalten ihre typische Anfangsdicke 1,5 nm. Materialwerte und Dicken sind editierbare Startwerte. Wellenlänge und Delta-Konvention bleiben einstellbar.

Optische Formeln, globale Suche, Material-/Modellwerte und Laufzeitabhängigkeiten bleiben unverändert. Die numerische Basisprüfung und frühere Browserprüfungen sind im Prüfprotokoll nach Version getrennt dokumentiert.

Das Programm läuft lokal mit Python und Browseroberfläche; Windows 7 ist nicht unterstützt. Das Paket enthält Quellcode mit Startdateien, keine kompilierte EXE. Frühere Stände bleiben in der Versionshistorie und auf [ellifit-1.1](https://github.com/kangaroocry/ElliFit/tree/ellifit-1.1) verfügbar.
