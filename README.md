# ElliFit 1.4.1

Lokale Auswertung monochromatischer Ellipsometrie mit globaler Suche nach Schichtdicke, Brechungsindex oder Extinktionskoeffizient. Ein oder zwei Parameter können gleichzeitig frei sein.

**[ElliFit 1.4.1 als ZIP herunterladen](https://github.com/kangaroocry/ElliFit/archive/48b493f855f4650876051472f7da96f2cb083c7d.zip)**

- [Quellcode und ausführliche Anleitung](https://github.com/kangaroocry/ElliFit/tree/ellifit-1.2)
- [Materialwerte, Schichtvorlagen und Quellen](https://github.com/kangaroocry/ElliFit/blob/48b493f855f4650876051472f7da96f2cb083c7d/MATERIALIEN.md)
- [Umgesetzte Verbesserungen](https://github.com/kangaroocry/ElliFit/blob/48b493f855f4650876051472f7da96f2cb083c7d/AENDERUNGEN_1.2.md)
- [Prüfprotokoll](https://github.com/kangaroocry/ElliFit/blob/48b493f855f4650876051472f7da96f2cb083c7d/PRUEFPROTOKOLL.md)

## Korrektur in 1.4.1: Fitpunkte und Fehlerlandschaft

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

**85 Tests bestanden, ein erwarteter privater Importtest übersprungen; zehn tatsächliche Chromium-Prüfungen bestanden.** Der gemeldete Fall wurde lokal unabhängig nachgerechnet. Synthetische Regressionen vergleichen direkte Kovarianzverluste und getrennte gewichtete/ungewichtete Minima. Zusätzlich geprüft: exakte Zoom-Anker, Probelösungen, bewusst ungewichtetes Neufitten, Kontur/Talprofil/3D, Stokes, ungleiche Wiederholungszahlen, Exporte und Ansichten bis 390 px.

Prüfung unter Linux; ein tatsächlicher Windows-Lauf wurde hier nicht durchgeführt. Das verlinkte ZIP wurde heruntergeladen und mit allen **68 Quelldateien bytegenau** abgeglichen. Optische Formeln, Optimierung, Kovarianzgewichtung, Material-/Modellwerte, Abhängigkeiten und gemeinsamer Windows-Starter bleiben unverändert. Private Eingangsdaten, Zahlenresultate und QA-Artefakte werden nicht veröffentlicht.

## Start und Update

Alte ElliFit-Instanz beenden, ZIP vollständig in einen **neuen beschreibbaren Ordner** entpacken und **`Start_Windows.bat`** doppelklicken. Python 3.11 oder neuer in 64 Bit muss dauerhaft verfügbar sein; auch portables WinPython funktioniert über den Benutzer-PATH. Der Ordner mit `python.exe` sollte vor `Microsoft\WindowsApps` stehen. Prüfen mit `where.exe python` und `python --version` in einer neu geöffneten Eingabeaufforderung.

Pakete werden beim ersten Start aus dem Internet nur in der lokalen `.venv` eingerichtet. Adminrechte sind bei beschreibbarem Programmordner und erlaubter Programmausführung nicht erforderlich. Eigene Modell-, Material- und Sitzungsdateien können übernommen werden. Der separate WinPython-Starter bleibt entfallen.

Der Browser wartet auf Serverbereitschaft und eine weitere Sekunde. Während des Fits bleibt die Oberfläche bis zur fertig gezeichneten Ergebnisansicht ausgegraut. Einparameterfits starten mit logarithmischer Fehlerachse; danach ist manuelles Umschalten möglich. Der NumPy-/JSON-Fehler nach DAT-Import bleibt behoben.

Messdaten bleiben auf dem eigenen Rechner. Das Paket enthält Python-/JavaScript-Quellcode mit Startdateien, keine kompilierte EXE; Windows 7 ist nicht unterstützt. Frühere Stände bleiben in der Versionshistorie und auf [ellifit-1.1](https://github.com/kangaroocry/ElliFit/tree/ellifit-1.1) verfügbar.
