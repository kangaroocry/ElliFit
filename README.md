# ElliFit 1.3.1

Lokale Auswertung monochromatischer Ellipsometrie: Schichtmodelle und Materialien speichern und Schichtdicke, Brechungsindex oder Extinktionskoeffizient global fitten. Ein oder zwei Parameter können gleichzeitig frei sein.

**[ElliFit 1.3.1 als ZIP herunterladen](https://github.com/kangaroocry/ElliFit/archive/87d3111ebae9f56674302a282a9e817a766b2684.zip)**

- [Quellcode und ausführliche Anleitung](https://github.com/kangaroocry/ElliFit/tree/ellifit-1.2)
- [Materialwerte, Schichtvorlagen und Quellen](https://github.com/kangaroocry/ElliFit/blob/87d3111ebae9f56674302a282a9e817a766b2684/MATERIALIEN.md)
- [Umgesetzte Verbesserungen](https://github.com/kangaroocry/ElliFit/blob/87d3111ebae9f56674302a282a9e817a766b2684/AENDERUNGEN_1.2.md)
- [Prüfprotokoll](https://github.com/kangaroocry/ElliFit/blob/87d3111ebae9f56674302a282a9e817a766b2684/PRUEFPROTOKOLL.md)

## Neu in 1.3.1

Während der Suche und der anschließenden Ergebnisdarstellung sind Eingaben und Ergebnisansichten ausgegraut und gesperrt. Ein aktives Fortschrittsfeld ermöglicht den Abbruch der laufenden Suche. Die Oberfläche wird erst nach fertig gezeichneten Diagrammen, Beschriftungen und gegebenenfalls Talprofil wieder farbig. Auch Abbruch und Fehler geben die Bedienelemente wieder frei.

Der Browser öffnet sich erst, wenn der Server tatsächlich lauscht, und nach einer zusätzlichen Sekunde. Langsame Bibliotheksimporte führen so nicht mehr zu einem vorzeitigen Seitenaufruf. Beendeter oder fehlgeschlagener Start verhindert einen nachträglichen Browseraufruf.

Jeder neue Einparameterfit beginnt mit logarithmischer Winkel-RMS-Achse, auch nach einer linearen Parameter-Y-Achse beim Zweiparameterfit. Danach bleibt manuelles Umschalten möglich. Bei zwei freien Parametern folgen die Parameterachsen weiterhin den jeweiligen Suchrastern.

Geprüft mit **zehn gezielten Start-/API-Tests und acht tatsächlichen Chromium-Szenarien**, einschließlich verzögerter Kurven-/Talprofil-/3D-Darstellung, Abbruch, Fehlern und erneuten Fits. Ein zusätzlich verzögerter echter Serverstart lieferte beim ersten automatisch ausgelösten Seitenaufruf HTTP 200. Die optischen Rechenmodule, Bibliothekswerte und Windows-Batchdateien bleiben unverändert.

## Seit 1.3.0

Modell, Suchparameter und Messdaten stehen oben über die volle Breite; der Eingabebereich lässt sich einklappen. Der editierbare Schichtaufbau steht vor seiner Vorschau. Ab 1 240 px erscheinen Lösungsliste, Fehlerlandschaft und Fit-Kurven nebeneinander; schmalere Ansichten brechen passend um.

Ein Lösungswechsel erhält den Plotzoom, solange der gewählte Punkt sichtbar ist. Andernfalls wird der Ausschnitt bei gleicher Zoomstufe dorthin verschoben. Achsenticks und Zahlenauflösung folgen dem Zoom. Minima erhalten versetzte, hell hinterlegte und anklickbare Nummern. Auch die Vergleichsansicht und die 3D-Kamera behalten ihre Ansicht beim Lösungswechsel.

Messlisten beginnen mit **100 Einträgen je Seite** und **„Ohne Gruppen“**. Die Seitenlänge ist frei wählbar, die Dateireihenfolge per Knopf umkehrbar. Anfang/Ende, direkte Messungsnummer und „Letzte Messung“ funktionieren in beiden Richtungen. Rohdaten und Fit-Auswahl bleiben erhalten; Sitzungen speichern die Ansichtsoptionen.

Ergebnisse, Zähler, Hinweise und Unsicherheitsdiagnosen nennen den zugehörigen Fit mit Zeitpunkt und Modell. Nach Eingabeänderungen wird ausdrücklich auf den früheren Eingabestand hingewiesen; die Messliste zeigt separat die aktuelle Auswahl für den nächsten Fit.

Die Bibliothek enthält jetzt **18 Materialien und elf Schichtvorlagen bei 632,8 nm**. Identische native/wet/dry-SiO2-Materialwerte sind zu einem Eintrag zusammengefasst; die native Oxidschicht bleibt mit typischer Anfangsdicke 1,5 nm in den Modellen. Reale Prozessabhängigkeit ist erläutert, ohne pauschale Indexunterschiede zu erfinden. Enthalten sind unter anderem Si/natives SiO2/ALD-Al2O3, Polymerfilme auf Si und Glas sowie Nitrid-, HfO2- und ITO-Aufbauten. Materialwerte sind editierbare Startwerte.

Basisprüfung von 1.3.0: **68 Rechen-/API-Tests, 88 unabhängige optische Vergleiche und 13 tatsächliche Chromium-Szenarien**, einschließlich 16 050 synthetischer Messungen, enger Zooms, echter Punkt-/Nummernklicks, Speichern/Rückgängig und schmaler Ansichten. Das aktuelle **1.3.1-ZIP** wurde heruntergeladen und mit allen **62 Quelldateien bytegenau** abgeglichen. Optische Formeln, Suchverfahren, Abhängigkeiten und Windows-Batchdateien sind unverändert.

## Start und Update

ZIP **vollständig in einen neuen beschreibbaren Ordner entpacken**. So werden entfernte mitgelieferte SiO2-Duplikate nicht aus einem alten Programmordner übernommen. Eigene Modell-, Material- und Sitzungsdateien können anschließend gezielt übernommen werden. Vorhandene eigene Bibliotheksordner werden nicht automatisch verändert.

Mit vorhandenem WinPython **`Start_WinPython.bat`** doppelklicken; voreingestellt bleibt `C:\Programme_portable\WinPython\WPy64-31290`. Der Starter verwendet eine private Umgebung im ElliFit-Ordner, ohne WinPython oder den System-PATH zu verändern. Adminrechte sind bei beschreibbarem Programmordner und erlaubter Programmausführung nicht erforderlich. Alternativ mit Python 3.11 oder neuer (64 Bit) `Start_Windows.bat` verwenden. Beim ersten Start werden Abhängigkeiten aus dem Internet installiert. Danach läuft das Programm lokal mit Browseroberfläche.

Die Wellenlänge bleibt editierbar, Standard 632,8 nm. Elli-kompatibles Δ ist voreingestellt; ausdrücklich gespeicherte Konventionen bleiben erhalten. Private Originalmessdateien und Handbuch werden nicht veröffentlicht.

Numerik/API und Browser wurden unter Linux geprüft. Ein tatsächlicher Windows-/WinPython-Lauf wurde hier nicht durchgeführt; Windows 7 ist nicht unterstützt. Das Paket enthält Quellcode mit Startdateien, keine kompilierte EXE. Frühere Stände bleiben in der Versionshistorie und auf [ellifit-1.1](https://github.com/kangaroocry/ElliFit/tree/ellifit-1.1) verfügbar.
