# ElliFit 1.4.2

Lokale Auswertung monochromatischer Ellipsometrie mit globaler Suche nach Schichtdicke, Brechungsindex oder Extinktionskoeffizient. Ein oder zwei Parameter können gleichzeitig frei sein.

**[ElliFit 1.4.2 als ZIP herunterladen](https://github.com/kangaroocry/ElliFit/archive/95b954531f60e8fc52db93ada33de5e56d6bf638.zip)**

- [Quellcode und ausführliche Anleitung](https://github.com/kangaroocry/ElliFit/tree/ellifit-1.2)
- [Materialwerte, Schichtvorlagen und Quellen](https://github.com/kangaroocry/ElliFit/blob/95b954531f60e8fc52db93ada33de5e56d6bf638/MATERIALIEN.md)
- [Umgesetzte Verbesserungen](https://github.com/kangaroocry/ElliFit/blob/95b954531f60e8fc52db93ada33de5e56d6bf638/AENDERUNGEN_1.2.md)
- [Prüfprotokoll](https://github.com/kangaroocry/ElliFit/blob/95b954531f60e8fc52db93ada33de5e56d6bf638/PRUEFPROTOKOLL.md)

## Neu in 1.4.2

- **Ungewichtet fitten als Standard** in Oberfläche und API. Automatische Kovarianzgewichtung bleibt wählbar; ausdrücklich gespeicherte Sitzungseinstellungen bleiben erhalten. Bei einer Sitzung ohne Gewichtungsangabe gilt der neue ungewichtete Standard.
- Die Zoom-Option heißt jetzt **„Ausschnitt automatisch nachberechnen“**.
- **Mausrad-Zoom bei Konturplots ausgeschaltet**, sowohl für Winkel-RMS als auch für die tatsächliche gewichtete Fitgröße. Rechteck-Zoom und Werkzeugleiste bleiben nutzbar; andere Plotarten behalten ihre Bedienung.
- Nach einer erfolgreichen globalen Suche springt die Seite **automatisch zur Auswertung**, sobald die Ergebnisansichten fertig gezeichnet und wieder freigegeben sind.
- **„Fit relativ schlecht – Winkel-RMS über 1°“** benennt schlechte Passung und Warnschwelle ausdrücklich. Die Warnung erscheint erst bei > 1°; die separate Orientierung für sehr gute beziehungsweise mehrdeutige Lösungen bei ≤ 0,1° bleibt erhalten.

Ein zusätzlicher numerischer Fix verhindert vorzeitige lokale Bootstrap-Abbrüche bei extrem engen Parametergrenzen im ungewichteten Fit. Bei erreichten Grenzen werden beschnittene Intervalle weiterhin unterdrückt.

## Korrektur seit 1.4.1: Fitpunkte und Fehlerlandschaft

Bei automatischer Kovarianzgewichtung konnte eine korrekt gefundene Lösung neben dem Minimum der gezeichneten Kurve erscheinen: Die Suche minimierte eine gewichtete Abweichung, der Plot zeigte den ungewichteten Winkel-RMS. Diese Kriterien können unterschiedliche Minima besitzen. Auch Stokes- und Winkelmittelwertauswertungen benötigen ihre passende Fehlerdarstellung.

Standardmäßig zeigen jetzt **Kurve, Kontur, 3D-Höhe, Talprofil und Marker die tatsächlich minimierte Fit-Abweichung**. Die Gewichtung und Optimierung bleiben unverändert. Dargestellt wird die monotone Größe √(Q/K), mit im Bericht definierter Normierung und ausdrücklich benannter Einheit. Bei einem gemeinsamen ungewichteten Winkelresiduen-Fit ist sie identisch zum Winkel-RMS.

Der **ungewichtete Winkel-RMS bleibt als eigene Kontrollansicht** verfügbar. Ein sichtbarer Hinweis erklärt, weshalb gewichtete Fitpunkte nicht im Minimum dieser anderen Kurve liegen müssen. Der Anzeigewechsel verändert keine Fit-Einstellung. Wer ausdrücklich den Winkel-RMS aller Rohwerte minimieren möchte, wählt Δ/Ψ als Zielfunktion, gemeinsamen Fit aller Einzelwerte und „Ungewichtet fitten“ bei den Messunsicherheiten und berechnet neu.

Punkt- und Tabellenfarben bleiben bei der festen absoluten Winkel-RMS-Skala. Für eine abweichende Fitgröße verwendet die Landschaft eine eigene neutrale relative Farbskala. Die Kennzahlenleiste und Sortierungsbeschreibung unterscheiden Fit-Zielfunktion und Winkel-RMS. Exporte enthalten Fit-Abweichung, Einheit und Winkel-RMS getrennt; JSON nennt Definition und gewählte Ansicht.

Die Zoom-Nachberechnung behält bestätigte eindimensionale Minima zusätzlich zum regulären Raster exakt bei. Zweidimensionale Netze übertragen die tatsächliche Zielfunktion für jeden Stützpunkt. Auch manuelle Probelösungen verwenden die richtige dargestellte Höhe.

## Enthaltene Funktionen aus 1.4.0

- Integrierter Schichteditor: X/Y/fix, Suchgrenzen und Raster direkt am Parameter; übrige Optionen ausklappbar. Keine doppelte Vorschau/Parameterauswahl.
- Schichten mit Plus an jeder Grenzfläche einfügen, 0 nm Anfangsdicke, Rückgängig und eindeutige Materialübernahme je Zielkarte.
- Vollständig umbrechende Kommentare mit breiter Restspalte und kompakten Zahlenkolumnen.
- Prominente Warnungen vor Periodizität, mehreren guten Familien, Sättigung, schwachem Rang und starker Kopplung.
- Ausklappbare gleichwertige Periodenfamilien ohne bevorzugten Einzelwert im geschlossenen Zustand.
- Adaptive getrennte Talfortsetzungen in linearen/logarithmischen Suchkoordinaten, Ende am Rand, exakte bestätigte Wurzeln und klare Familien-/Aliaszuordnung.
- Automatische oder manuelle Nachrechnung im Zoom; eigene neue Suche im sichtbaren Ausschnitt. Zoom und Kamera bleiben bei Darstellungsupdates erhalten.
- 95-/99-%-Darstellung standardmäßig ausgeschaltet und bei den optionalen Diagnosen.
- 18 Materialien und elf Schichtvorlagen bei editierbarer Standardwellenlänge 632,8 nm.

## Prüfung

**86 Tests bestanden, ein erwarteter privater Importtest übersprungen; zehn tatsächliche Chromium-Prüfungen für 1.4.2 bestanden.** Zusätzlich zu den bisherigen wissenschaftlichen Regressionen geprüft: ungewichteter Standard trotz geeigneter Wiederholkovarianz, gespeicherte Gewichtungsoptionen, Warnschwelle bei exakt beziehungsweise über 1°, automatischer Sprung nach fertiger Darstellung, echte Mausradereignisse ohne Kontur-Zoom/Nachberechnung, Rechteck-Zoom, Wechsel zwischen Kontur/3D und RMS-/Fitgrößenansichten sowie Darstellung bis 390 px. Die Bootstrap-Grenzprüfung ist sowohl gewichtet als auch ungewichtet bestanden.

Prüfung unter Linux; ein tatsächlicher Windows-Lauf wurde hier nicht durchgeführt. Das verlinkte ZIP wurde heruntergeladen und mit allen **68 Quelldateien bytegenau** abgeglichen. Optische Formeln, globale Optimierung, Material-/Modellwerte, Abhängigkeiten und gemeinsamer Windows-Starter bleiben unverändert. Private Eingangsdaten, Zahlenresultate und QA-Artefakte werden nicht veröffentlicht.

## Start und Update

Alte ElliFit-Instanz beenden, ZIP vollständig in einen **neuen beschreibbaren Ordner** entpacken und **`Start_Windows.bat`** doppelklicken. Python 3.11 oder neuer in 64 Bit muss dauerhaft verfügbar sein; auch portables WinPython funktioniert über den Benutzer-PATH. Der Ordner mit `python.exe` sollte vor `Microsoft\WindowsApps` stehen. Prüfen mit `where.exe python` und `python --version` in einer neu geöffneten Eingabeaufforderung.

Pakete werden beim ersten Start aus dem Internet nur in der lokalen `.venv` eingerichtet. Adminrechte sind bei beschreibbarem Programmordner und erlaubter Programmausführung nicht erforderlich. Eigene Modell-, Material- und Sitzungsdateien können übernommen werden. Der separate WinPython-Starter bleibt entfallen.

Der Browser wartet auf Serverbereitschaft und eine weitere Sekunde. Während des Fits bleibt die Oberfläche bis zur fertig gezeichneten Ergebnisansicht ausgegraut. Einparameterfits starten mit logarithmischer Fehlerachse; danach ist manuelles Umschalten möglich. Der NumPy-/JSON-Fehler nach DAT-Import bleibt behoben.

Messdaten bleiben auf dem eigenen Rechner. Das Paket enthält Python-/JavaScript-Quellcode mit Startdateien, keine kompilierte EXE; Windows 7 ist nicht unterstützt. Frühere Stände bleiben in der Versionshistorie und auf [ellifit-1.1](https://github.com/kangaroocry/ElliFit/tree/ellifit-1.1) verfügbar.
