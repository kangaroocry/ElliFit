# ElliFit 1.4.0

Lokale Auswertung monochromatischer Ellipsometrie mit globaler Suche nach Schichtdicke, Brechungsindex oder Extinktionskoeffizient. Ein oder zwei Parameter können gleichzeitig frei sein.

**[ElliFit 1.4.0 als ZIP herunterladen](https://github.com/kangaroocry/ElliFit/archive/e2b04a6f63063d2b4da4f9a47ae3e4d099f38313.zip)**

- [Quellcode und ausführliche Anleitung](https://github.com/kangaroocry/ElliFit/tree/ellifit-1.2)
- [Materialwerte, Schichtvorlagen und Quellen](https://github.com/kangaroocry/ElliFit/blob/e2b04a6f63063d2b4da4f9a47ae3e4d099f38313/MATERIALIEN.md)
- [Umgesetzte Verbesserungen](https://github.com/kangaroocry/ElliFit/blob/e2b04a6f63063d2b4da4f9a47ae3e4d099f38313/AENDERUNGEN_1.2.md)
- [Prüfprotokoll](https://github.com/kangaroocry/ElliFit/blob/e2b04a6f63063d2b4da4f9a47ae3e4d099f38313/PRUEFPROTOKOLL.md)

## Neu in 1.4.0

**Modell und Suche in einem Editor:** Jede Schichtkarte zeigt Nummer, Rolle, Material und n/k/d. Unter aktiven X-/Y-Feldern stehen die Suchgrenzen und das lineare/logarithmische Raster. Die zusätzliche Stack-Vorschau und doppelte Parameterauswahl entfallen. Allgemeine Suchoptionen stehen ausklappbar darunter. Kleine Plus-Schaltflächen fügen Filme genau an der gewählten Grenzfläche ein; Anfangsdicke 0 nm, Parametermapping und Rückgängig bleiben erhalten.

**Material direkt je Schicht übernehmen:** Das Dropdown am Schichtnamen überträgt Materialwerte auf genau diese Karte und erhält die Dicke. Die Materialbibliothek bleibt zum Bearbeiten und Speichern verfügbar. Die Messliste nutzt mehr Platz für vollständig umbrechende Kommentare; Zahlenkolumnen sind kompakter.

**Mehrdeutigkeit sichtbar machen:** Ein prominenter Hinweisblock warnt vor periodischen Lösungen, mehreren guten Familien, gesättigten/schwachen Fits, starker Parameterkopplung und gut passenden Talspannen. Auch Randminima und schlechte beste Fits werden hervorgehoben. Kleine RMS-Werte allein belegen keine eindeutige oder physikalisch richtige Lösung.

**Gleichwertige Periodenfamilien:** Eingeklappt erscheinen Anzahl und gemeinsamer RMS, kein bevorzugter einzelner Parameterwert. Aufklappen öffnet eine zentrierte Tabelle der gleichwertigen Wiederholungen. Die für die Diagramme gewählte Wiederholung ist ausdrücklich benannt.

**Taläste gezielt ansehen:** Von bestätigten Lösungen aus werden getrennte lokale Verläufe in den linearen/logarithmischen Suchkoordinaten fortgesetzt. Sie stoppen an der Grenze eines der beiden Parameter und laufen nicht am Rand weiter. Andere bestätigte Wurzeln auf demselben Ast bleiben exakt erhalten. Astwahl, lokale Näherungsgleichungen und CSV nennen Familie und Wiederholung. Verschiedene Fortsetzungen können sich überlagern. Die 95-/99-%-Darstellung ist standardmäßig ausgeschaltet und bei den optionalen Diagnosen.

**Im Zoom nachrechnen und suchen:** Nach einer Zoompause wird die Darstellung dichter mit dem Modell des angezeigten Fits berechnet, ohne die Lösungsliste zu optimieren. Automatik abschaltbar; manuelle Nachrechnung verfügbar. Veraltete Antworten werden verworfen. Tick-/Beschriftungsupdates und Neuzeichnungen behalten den Ausschnitt; nur eine ausdrückliche Auswahl einer außerhalb liegenden Lösung darf dorthin verschieben. „Im Ausschnitt neu suchen“ übernimmt die sichtbaren Parametergrenzen und startet ausdrücklich eine neue globale Suche. Bei geänderten Eingaben zuerst einen aktuellen Fit berechnen.

## Prüfung

**80 Tests bestanden, ein erwarteter privater Importtest übersprungen; elf tatsächliche Chromium-Prüfungen bestanden.** Geprüft wurden unter anderem Randabbruch und dünne logarithmische Talverläufe, direkte optische Vergleichswerte, unveränderte Fit-Ergebnisse bei Ansichtsnachrechnung, echtes Mausrad-Zoom, Familienwahl, tiefe Profilminima, CSV, 3D-Kamera und Ansichten von 1 920 bis 390 px. Prüfung unter Linux; ein tatsächlicher Windows-Lauf wurde hier nicht durchgeführt.

Das verlinkte ZIP wurde heruntergeladen und mit allen **65 Quelldateien bytegenau** abgeglichen. Optische Formeln, globale Optimierung, Laufzeitabhängigkeiten, 18 Materialien, elf Modelle und der gemeinsame Windows-Starter bleiben unverändert. Private Dateien und QA-Artefakte werden nicht veröffentlicht.

## Start und Update

Alte ElliFit-Instanz beenden, ZIP vollständig in einen **neuen beschreibbaren Ordner** entpacken und **`Start_Windows.bat`** doppelklicken. Python 3.11 oder neuer in 64 Bit muss dauerhaft verfügbar sein; auch portables WinPython funktioniert über den Benutzer-PATH. Der Ordner mit `python.exe` sollte vor `Microsoft\WindowsApps` stehen. Prüfen mit `where.exe python` und `python --version` in einer neu geöffneten Eingabeaufforderung.

Pakete werden beim ersten Start aus dem Internet nur in der lokalen `.venv` eingerichtet. Adminrechte sind bei beschreibbarem Programmordner und erlaubter Programmausführung nicht erforderlich. Eigene Modell-, Material- und Sitzungsdateien können übernommen werden. Der separate WinPython-Starter bleibt entfallen.

Der Browser wartet auf Serverbereitschaft und eine weitere Sekunde. Während des Fits bleibt die Oberfläche bis zur fertig gezeichneten Ergebnisansicht ausgegraut. Einparameterfits starten mit logarithmischer RMS-Achse; danach ist manuelles Umschalten möglich. Der NumPy-/JSON-Fehler nach DAT-Import aus älteren Versionen bleibt behoben.

Standardwellenlänge 632,8 nm, editierbar; Elli-kompatibles Delta voreingestellt. Materialien und Dicken sind typische editierbare Startwerte. Messdaten bleiben auf dem eigenen Rechner. Das Paket enthält Python-/JavaScript-Quellcode mit Startdateien, keine kompilierte EXE; Windows 7 ist nicht unterstützt. Frühere Stände bleiben in der Versionshistorie und auf [ellifit-1.1](https://github.com/kangaroocry/ElliFit/tree/ellifit-1.1) verfügbar.
