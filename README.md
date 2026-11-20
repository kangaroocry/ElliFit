# ElliFit 1.6.1

Lokale Auswertung monochromatischer Ellipsometrie mit globaler Suche nach Schichtdicke, Brechungsindex oder Extinktionskoeffizient. Ein oder zwei Parameter können gleichzeitig frei sein.

**[ElliFit 1.6.1 als ZIP herunterladen](https://github.com/kangaroocry/ElliFit/releases/download/v1.6.1/ElliFit_1.6.1.zip)** · [Versionsseite](https://github.com/kangaroocry/ElliFit/releases/tag/v1.6.1)

Unter Windows das ZIP vollständig entpacken und **`Start_Windows.bat`** doppelklicken. Der Starter verwendet auch WinPython aus dem Benutzer-PATH.

## Neu in 1.6.1

Neue Messdateien lassen sich direkt im Tab **Modellfit und Lösungen** öffnen oder ablegen. Nach dem Import wechselt ElliFit zu **Messdaten und Schichtmodell**. Periodische Wiederholungen heißen in der aufgeklappten Liste zum Beispiel **2.1** und **2.2**.

Die RMS-Skala zeigt Gelb bei 1°, Orange bei 10°, Rot bei 100° und Pink beim Maximum. Ein Winkel-RMS über 1° bis einschließlich 10° heißt **Fit relativ schlecht**. Über 10° lautet der Befund **Fit sehr schlecht**.

Die Diagrammoptionen verbinden **Plot-Ausschnitt neu berechnen** mit **Automatisch**. **Im Plot-Ausschnitt neu fitten** wird bei einem neu gewählten Parameterbereich freigegeben.

## Neu in 1.6.0

In **Vorbereitung** stehen Messauswahl und Schichtmodell zusammen. Eigene Auswertevorlagen speichern freie Parameter, Suchgrenzen und Fitkriterium. Nach der globalen Suche zeigt **Auswertung** zuerst den Befund. Bei periodischen Dicken sind Anzahl und Gleichung der gleichwertigen Lösungen sofort sichtbar. Zwei Fits lassen sich vergleichen, die jeweils dargestellte Lösung als Laborbericht drucken.

Die eindimensionale Suche prüft Kandidaten beidseitig. Beim reproduzierten Flankenfehler bleibt das Minimum bei **118,005 nm**. Im Zweiparameterfit zeigen optionale Δ- und Ψ-Messlinien sowie Profile, welche Kombinationen mit der Messung vereinbar sind. Zeitreihen haben eine eigene Importzuordnung. Serien können je Quelldatei, Zeitpunkt, Ort oder Azimut separat ausgewertet werden. Eine optische Diagnose berechnet die 1-nm-Empfindlichkeit und die p-Reflexionsminima des Schichtstapels.

107 automatisierte Tests bestanden. Im Chromium-Browser wurden unter anderem der Originalimport mit 16 434 Messungen, periodische und Mehrwinkelfits, die Serienauswertung, der Laborbericht und die schmale Ansicht geprüft. Getestete Plattform war Linux mit Python 3.12.

- [Quellcode und ausführliche Anleitung](https://github.com/kangaroocry/ElliFit/tree/v1.6.1)
- [Materialwerte und Schichtvorlagen](https://github.com/kangaroocry/ElliFit/blob/v1.6.1/MATERIALIEN.md)
- [Änderungsübersicht](https://github.com/kangaroocry/ElliFit/blob/v1.6.1/AENDERUNGEN_1.2.md)
- [Prüfprotokoll](https://github.com/kangaroocry/ElliFit/blob/v1.6.1/PRUEFPROTOKOLL.md)

## Periodische Gleichungen in 1.4.3

Periodische Lösungsfamilien zeigen jetzt **schon eingeklappt** eine kompakte Gleichung, etwa **`d[1] = (45,6 + m · 206,8) nm`**, mit ganzzahligem Zählerbereich im untersuchten Suchbereich. Die Basis bleibt bei Auswahl einer anderen Wiederholung unverändert und bevorzugt keinen Einzelwert.

Zwei periodische Dicken erhalten unabhängige Zähler **m₁/m₂** mit eindeutigen Schichtnummern. Andere innerhalb der Familie konstante Fitparameter bleiben sichtbar. Die Zählergrenzen berücksichtigen auch Wiederholungen jenseits des Limits von 200 einzeln dargestellten Lösungen. Gleichungen umbrechen auf schmalen Bildschirmen. Suche, Periodenerkennung und wissenschaftliche Auswertung bleiben unverändert.

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

## Prüfung von 1.4.3

**Drei passende Regressionen und sechs tatsächliche Chromium-Prüfungen für 1.4.3 bestanden**, zusätzlich alle fünf JavaScript-Dateien syntaktisch geprüft. Kontrolliert wurden echte Fitabläufe mit synthetischen Daten: eingeklappte Formel, Aliaswahl, verschobene Suchgrenzen, über 200 Wiederholungen, d/n-Familien, zwei unabhängige periodische Dicken und Darstellung bis 390 px. Angezeigte Familien und Wertepaare wurden gegen die periodischen Gleichungen geprüft. Keine JavaScript-Laufzeitfehler.

Die vollständige Basisprüfung von 1.4.2 mit 86 bestandenen Tests und einem erwarteten privaten Importtest-Skip bleibt im Prüfprotokoll dokumentiert. Rechenkern, Statistik, Materialien, Modelle, Abhängigkeiten und Starter sind gegenüber 1.4.2 bytegleich. Das verlinkte ZIP wurde heruntergeladen und mit allen **68 Quelldateien bytegenau** abgeglichen. Prüfung unter Linux/Chromium; kein tatsächlicher Windows-Lauf. Private Daten und lokale QA-Artefakte werden nicht veröffentlicht.

## Start und Update

Alte ElliFit-Instanz beenden, ZIP vollständig in einen **neuen beschreibbaren Ordner** entpacken und **`Start_Windows.bat`** doppelklicken. Python 3.11 oder neuer in 64 Bit muss dauerhaft verfügbar sein; auch portables WinPython funktioniert über den Benutzer-PATH. Der Ordner mit `python.exe` sollte vor `Microsoft\WindowsApps` stehen. Prüfen mit `where.exe python` und `python --version` in einer neu geöffneten Eingabeaufforderung.

Pakete werden beim ersten Start aus dem Internet nur in der lokalen `.venv` eingerichtet. Adminrechte sind bei beschreibbarem Programmordner und erlaubter Programmausführung nicht erforderlich. Eigene Modell-, Material- und Sitzungsdateien können übernommen werden. Der separate WinPython-Starter bleibt entfallen.

Der Browser wartet auf Serverbereitschaft und eine weitere Sekunde. Während des Fits bleibt die Oberfläche bis zur fertig gezeichneten Ergebnisansicht ausgegraut. Einparameterfits starten mit logarithmischer Fehlerachse; danach ist manuelles Umschalten möglich. Der NumPy-/JSON-Fehler nach DAT-Import bleibt behoben.

Messdaten bleiben auf dem eigenen Rechner. Das Paket enthält Python-/JavaScript-Quellcode mit Startdateien, keine kompilierte EXE; Windows 7 ist nicht unterstützt. Frühere Stände bleiben in der Versionshistorie und auf [ellifit-1.1](https://github.com/kangaroocry/ElliFit/tree/ellifit-1.1) verfügbar.
