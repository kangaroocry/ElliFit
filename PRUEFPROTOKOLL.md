# Prüfprotokoll – ElliFit 1.6.0

Stand: 18. November 2026. Numerik/API und lokale Browseroberfläche unter Linux geprüft. Keine Durchführung auf einem echten Windows-System.

## Prüfung von 1.6.0

**107 automatisierte Tests bestanden** unter Python 3.12. Der Importtest lief mit den bereitgestellten Originaldateien. Die Testumgebung meldete zwei Veraltungshinweise von pytest-Erweiterung und TestClient. Die Windows-Startdatei ist dieselbe wie in 1.5.0. Die Ausführung auf einem Windows-Rechner steht aus.

- Im synthetischen Dreipunkttest bei 66°, 70° und 74° lieferte 1.5.0 zusätzliche Kandidaten bei 104, 128 und 136 nm auf den Flanken. Bei allen drei Suchdichten meldet 1.6.0 im Intervall 80–160 nm dasselbe einzige Minimum bei 118,005 nm mit Winkel-RMS 0,022716°.
- Die Δ- und Ψ-Messlinien wurden am vorhergesagten Winkel des Modells gegengeprüft. Die mitoptimierte Profilkurve liegt an allen geprüften Stellen auf oder unter dem Schnitt bei festem Partner. Die optische 1-nm-Empfindlichkeit stimmt mit der direkten Differenz der Modellvorhersagen überein.
- Am analytischen Brewsterwinkel für Glas mit n = 1,5 liefert die Optik Ψ = 0° und unbestimmtes Δ. Stokes-Fit, optischer Winkelscan, Mittelung gemischter Messungen und 3D-Netz der Stokes-Zielfunktion wurden am Pol geprüft. Die JSON-Ausgaben enthalten gültige Nullwerte für undefinierte Größen.
- Geprüft wurden zudem Zeitspalten, Einheiten, CSV-Rundlauf, gespeicherte Vorlagen, unabhängige Fits je Quelldatei mit zwei Parametern und die Grenzen einer Mittelung über Zeiten oder Probenorientierungen.
- Im lokalen Chromium wurden Vorbereitung, Auswertung, Modell- und Fitvergleich, reale Dateiimporte, beide Messlinien, Parameterprofil, Serienexport und ein gedrucktes PDF über die Bedienoberfläche geprüft. Die Referenz ergab bei 70° vier gleichwertige Dicken im Suchbereich von 0,1 bis 1 000 nm und über neun Winkel d = 118,0 nm. Das Layout wurde bei 1 366 und 390 px geprüft. Im gesamten Ablauf traten keine JavaScript-Laufzeitfehler auf. [Einzelne Browserprüfungen](Pruefdaten_Browser.json)

## Prüfung von 1.5.0

Die automatisierten Prüfungen decken Optik, Statistik, Suche, Import, Sitzungen, HTTP-Schnittstelle und Startlogik ab. Getestet wurde unter Linux mit Python 3.12 und lokalem Chromium. Die vorgesehenen Windows-Startdateien sind Teil der Auslieferung.

- 160 deterministisch erzeugte, transparente und absorbierende Stapel mit bis zu vier Filmen wurden mit der unabhängigen Transfermatrix-Implementierung tmm verglichen. Die größte Winkelabweichung lag unter 10⁻¹² Grad. Bei einem unabhängigen Mehrwinkel-Datensatz ergab sich d = 118,75 nm und n = 1,654.
- Bei exakt kritischem Strahlgang eines endlichen Films stimmten die ellipsometrischen Winkel mit dem analytischen Grenzwert bis auf weniger als 10⁻¹² Grad überein. Zusätzlich wurden die verschwindende Filmdicke, gemischte Strahlen in derselben Vektorrechnung und die Phasenwarnung am Brewsterwinkel geprüft.
- Beim gemeinsamen Fit einer transparenten und einer absorbierenden Schicht ergaben 118,000, 401,158 und 684,316 nm genau eine Periodenfamilie. Der zweite Film hatte jeweils 60 nm. Für den Zusatzwinkel wurden die paarweisen Stokes-Abstände an den ausgegebenen Vorhersagen geprüft.
- Der Test mit schwacher Absorption zwischen 20 und 40 000 nm ergab 282 innere Minima. Alle Familien waren in der Oberfläche zugänglich. In einer großen exakten Familie konnte die Wiederholung Nr. 235 direkt ausgewählt und gegen die Periodenformel geprüft werden.
- Die Prüfung der Fehlerfortpflanzung umfasst Beiträge fester Filmdicken, die Behandlung freier Dicken und eine Winkelunsicherheit über der 90°-Grenze. Im letzten Fall bleiben die lokale Empfindlichkeit und die statistische Komponente einsehbar.
- Die Winkelmittel in Fit, Vergleichsplot und Diagnose stimmen auch beim Übergang über 0° und bei größerer Streuung überein. CSV-Rundlauf, alte Messdaten, markierte Azimute, Wiederholungen am selben Ort sowie separate Einzelfits wurden geprüft.
- Elf Browserprüfungen umfassten auch Schichtverschiebung und Löschung, Übernahme eines früheren Fits, Kriterium und Winkel-RMS in derselben Tabelle, physikalische k-Grenze und Layout bis 390 px Breite. Einzelheiten stehen in [Pruefdaten_Browser.json](Pruefdaten_Browser.json).

## Prüfung von 1.4.3

**Drei gezielte Regressionen und sechs tatsächliche Chromium-Prüfungen bestanden.** Die vorhandenen Prüfungen betreffen periodische Aliasbildung sowie versionierte und inhaltsabhängige Browserdateien. Alle fünf JavaScript-Dateien bestehen die Syntaxprüfung. Zwei unveränderte Bibliothekswarnungen. Rechenkern, Optimierung, Statistik, Materialien, Modelle und Starter sind bytegleich zu 1.4.2; dort ist die vollständige Suite mit 86 bestandenen Tests dokumentiert. Für diese reine Darstellungsänderung wurden die relevanten Prüfungen gezielt ausgeführt.

1. Tatsächlicher Einwinkelfit mit synthetischen Daten: Formel mit Schichtnummer, Dezimalkomma, nm und ganzzahligem Zählerbereich schon im eingeklappten Familieneintrag sichtbar. Alle Aliase erfüllen die periodische Gleichung.
2. Andere Wiederholung ausgewählt und wieder eingeklappt: Auswahl und Vergleich bleiben nutzbar; Formeln behalten dieselbe Basis.
3. Verschobene untere Suchgrenze und mehr als 200 Wiederholungen: erste Dicke liegt im Suchbereich, Zähler nennt die vollständige analytische Anzahl und wird nicht durch das Listenlimit gekürzt.
4. Tatsächlicher d/n-Fit: periodische Dicke und innerhalb der Familie konstanter Brechungsindex mit eindeutigen Schichtnummern sichtbar.
5. Tatsächlicher Fit zweier Dicken: unabhängige Zähler m₁/m₂, alle Wertepaare und Familienanzahl gegen das periodische Produktgitter geprüft.
6. Formelblöcke bis 390 px sichtbar und umbrechend, ohne horizontalen Seitenüberlauf oder JavaScript-Laufzeitfehler. Desktopdarstellung visuell geprüft.

Nur synthetische Daten und getrennte Bibliotheksordner verwendet; keine privaten Daten, Browser-Skripte oder Screenshots im Paket. Die bestehenden Standardwerte und Bedienkorrekturen aus 1.4.2 bleiben erhalten.

## Basisprüfung von 1.4.2

**86 Tests bestanden, ein erwarteter privater Importtest übersprungen.** Zwei unveränderte Bibliothekswarnungen. Alle fünf JavaScript-Dateien bestehen die Syntaxprüfung. Prüfung unter Linux/Chromium; kein tatsächlicher Windows-Lauf.

- Neuer unabhängiger Vergleich mit direkt berechneten Winkelresiduen: Ohne ausdrücklich gewählte Gewichtung findet die globale Suche das ungewichtete Minimum, obwohl geeignete Wiederholkovarianzen vorhanden sind. Die bestehende GLS-Regression aktiviert Gewichtung nun ausdrücklich und bleibt bestanden.
- Bootstrap-Grenzprüfung sowohl gewichtet als auch ungewichtet bestanden. Bei extrem engen Suchgrenzen konnte der ungewichtete lokale Bootstrap zuvor bereits wegen eines kleinen Anfangsgradienten stoppen. Der lokale Bootstrap verwendet jetzt Schritt-/Kostenkonvergenz statt dieses absoluten Gradienten-Abbruchs und unterdrückt bei erreichten Grenzen das beschnittene Intervall.
- Optische Formeln und globale Optimierung sind unverändert. Material-/Modellbibliotheken, Laufzeitabhängigkeiten und Windows-Starter sind bytegleich zur Vorversion.

**Zehn tatsächliche Chromium-Prüfungen bestanden:**

1. Frischer Start mit „Ungewichtet fitten“, Versionskennung und neuer Beschriftung „Ausschnitt automatisch nachberechnen“. Referenzfit bei 118 nm; 1D-Mausrad bleibt verfügbar.
2. Sitzung ohne Gewichtungsfeld bleibt trotz geeigneter vollständiger Wiederholkovarianz ungewichtet und minimiert den Winkel-RMS.
3. Ausdrücklich gespeicherte automatische Gewichtung bleibt erhalten und liefert weiterhin das korrekt dargestellte gewichtete Minimum.
4. Warnung „Fit relativ schlecht – Winkel-RMS über 1°“ bei > 1°; bei exakt 1° noch nicht. Schwelle und Bedeutung stehen im Text, kritische Einstufung ab 10° erhalten.
5. Ungültiger Start ohne Auswahl: Freigabe ohne automatischen Sprung. Erfolgreiche Fits springen dagegen nach fertiger Darstellung zur Auswertung, unterhalb des festen Kopfbereichs.
6. Echte Mausradereignisse im Konturplot nach Verweilzeit sowie mit Alt: unveränderte Achsen, keine dadurch ausgelöste Ausschnitt-Nachberechnung.
7. Aufgezogenes Zoomrechteck und anschließende automatische Nachberechnung bleiben nutzbar; Zoom erhalten.
8. Kontur → 3D → Kontur schaltet Mausrad-Zoom passend aus/ein/aus.
9. Gewichtete Konturen und RMS-Kontrollansicht: Mausrad-Zoom in beiden Darstellungen ausgeschaltet, richtige Zielfunktion erhalten.
10. Ansichten bis 390 px ohne horizontalen Überlauf oder JavaScript-Laufzeitfehler.

Ausschließlich synthetische Browser-Prüfdaten; keine privaten Dateien oder Zahlenresultate hinzugefügt. Die Zusammenfassung der Prüfungen steht zusätzlich in `Pruefdaten_Browser.json`.

## Basisprüfung von 1.4.1

**85 Tests bestanden, ein erwarteter privater Importtest übersprungen.** Zwei unveränderte AnyIO-/Starlette-Bibliothekswarnungen. Alle fünf JavaScript-Dateien bestehen die Syntaxprüfung. Die optische Berechnung, Optimierung und Kovarianzgewichtung sind unverändert; ergänzt wurden Definition/Übertragung der tatsächlichen Zielfunktion und konsistente Darstellungen.

Fünf neue unabhängige Regressionsprüfungen:

- Synthetischer Mehrschichtfall mit anisotroper, korrelierter Wiederholstreuung und Modellabweichung: direkte Residuen und separat invertierte Stichprobenkovarianz liefern dasselbe gewichtete Minimum wie die Suche. Das unabhängig minimierte ungewichtete RMS hat eine andere Position. Die dargestellte Fit-Abweichung ist die monotone Größe √(Q/K).
- Ungewichteter gemeinsamer Fit: Fitgröße stimmt weiterhin exakt mit dem bisherigen Winkel-RMS überein.
- Stokes-Abweichung direkt aus Stokes-Vektoren verglichen; Winkel-RMS wird nicht als Stokes-Zielfunktion ausgegeben.
- Ungewichtete Winkelmittelwerte mit ungleichen Wiederholungszahlen: eigene Gradeinheit und passende Normierung statt anders gewichteter Rohwert-RMS.
- Q-Werte im nachgerechneten zweidimensionalen Netz gegen direkte Modellberechnungen geprüft. Einparametrige Nachrechnung behält exakte Minimum-Anker zusätzlich zum regulären Raster.

Der vorgelegte Screenshot-Fall wurde mit der privaten Originaldatei und dem abgelesenen Schichtmodell lokal nachgerechnet. Die automatische Gewichtung ist aktiv; das Suchergebnis ist ein Minimum der gewichteten Zielfunktion, während das Minimum der zuvor gezeichneten ungewichteten RMS-Kurve woanders liegt. Der Bildbefund ist damit erklärt, ohne die Gewichtung stillschweigend auszuschalten. Private Messungen, Schichtdateien, Zahlenresultate und Screenshots werden nicht veröffentlicht.

**Zehn tatsächliche Chromium-Prüfungen bestanden:**

1. Ungewichteter Referenzfit bei 118 nm unverändert; Winkel-RMS, bisheriger Hintergrund, logarithmische Fehlerachse und Versions-/Cache-Schutz erhalten.
2. Privater Fall mit vier Messungen: gewichtete Lösung unverändert, Marker exakt im Minimum der minimierten Kurve; Kovarianzgewichtung und dimensionslose Einheit sichtbar erklärt.
3. Wechsel zur gekennzeichneten RMS-Kontrollansicht zeigt das andere Minimum; Rückkehr erhält x-Zoom und Ergebnisliste. Die Ansicht ändert keine Sucheinstellung.
4. Zoom-Nachrechnung enthält den exakten Minimum-Anker. Eine Probelösung mit kleinerem Winkel-RMS, aber schlechterer gewichteter Fitgröße wird korrekt höher dargestellt. JSON definiert Zielfunktion und Ansichtsart.
5. Bewusst deaktivierte Gewichtung findet das unabhängig bestätigte Winkel-RMS-Minimum; Plot und Marker stimmen überein.
6. Gewichteter Zweiparameterfit: Kontur, Talprofil und Minima verwenden dieselbe Zielfunktion. Neutrale Landschaftsfarben und feste RMS-Punkt-/Listenfarben sind ausdrücklich getrennt.
7. 3D-Höhen und nachgerechnetes Netz verwenden Q; Kameralage bleibt erhalten. Landschafts-CSV führt Fit-Abweichung, Einheit und Winkel-RMS getrennt.
8. Stokes-Fit zeigt eigene Zielfunktion statt einer Winkel-RMS-Landschaft. Lösungs-CSV enthält beide Größen mit Einheit.
9. Ungewichteter Mittelwertfit mit ungleichen Wiederholungszahlen zeigt die minimierte Mittelwertabweichung in Grad.
10. Größenwahl, Hinweise und Fehlerachsen von 1 680 bis 390 px ohne bleibenden horizontalen Überlauf oder JavaScript-Laufzeitfehler.

Zusätzliche Mesh-Werte und die Normierungsdefinition sind Bestandteil der API/JSON-Ausgaben. Optionale Konfidenzlinien mit RMS-Höhen werden nicht auf eine andere 3D-Fitgrößenachse übertragen; 2D-Parametergrenzen bleiben optional verfügbar. Materialien, Schichtvorlagen, Abhängigkeiten und gemeinsamer Windows-Starter sind unverändert. Ein tatsächlicher Windows-Lauf wurde nicht durchgeführt.

## Basisprüfung von 1.4.0

**80 Tests bestanden, ein erwarteter privater Importtest übersprungen.** Zwei unveränderte AnyIO-/Starlette-Bibliothekswarnungen. Der übersprungene Test benötigt die ursprünglichen privaten Beispieldateien über eine ausdrücklich gesetzte Umgebungsvariable; diese werden nicht ausgeliefert. Die gesamte öffentliche Rechen-/API-/Startsuite einschließlich neuer Fortsetzungs-/Zoomregressionen ist bestanden. Nach Anpassung der Speicheraufteilung der Zoomauswertung wurden die sechs gezielten neuen Prüfungen nochmals bestanden. Alle vier JavaScript-Dateien bestehen die Syntaxprüfung.

Neue Prüfungen kontrollieren:

- Analytisches künstliches Tal endet beim ersten freien Parameterrand, ohne entlang der Begrenzung weiterzulaufen. Ein bereits auf dem Rand liegender Startpunkt erzeugt keinen Randpfad.
- Physikalischer Film mit 2 nm Dicke und logarithmischem Dickenbereich: nachgerechnete Talpunkte sind tatsächlich bedingte Minima gegenüber unabhängigen kleinen Nachbarstörungen.
- Andere bestätigte Wurzeln auf demselben Talast bleiben mit ihrem tatsächlichen Fehlerwert erhalten und werden nicht von der normalen Abtastung übersprungen.
- Sichtbare Ausschnitte werden mit dem optischen Modell nachgerechnet: logarithmische und lineare Koordinaten, direkte Winkel-RMS-Vergleiche, exaktes k = 0 auf der Hybridachse sowie Minimum-Anker im lokalen Netz.
- Die Ansichts-API verändert weder ursprüngliche Suchparameter noch Ergebnisliste. Unbekannte/laufende Jobs, ungültige Grenzen und fehlende Überschneidung werden abgewiesen.
- Der Cache-Schlüssel bezieht auch das neue Editor-/Interaktionsmodul ein.

**Elf tatsächliche Chromium-Prüfungen bestanden:**

1. Integrierter Schichteditor ohne Vorschau und doppelte Parameterauswahl; lokale Suchgrenzen/Raster direkt unter X/Y. Reine Suchänderungen verändern die Modelldatei nicht.
2. Schichten an oberer und innerer Grenzfläche eingefügt, 0 nm Anfangsdicke, Fitpfade beim Einfügen/Löschen erhalten, Rückgängig. Material per Dropdown auf das benannte Ziel angewendet; übrige Schichten und Dicke erhalten.
3. Lange Kommentare nutzen die breite Restspalte und umbrechen vollständig, kompakte Zahlenkolumnen und Quelle unter dem Kommentar.
4. Periodenfamilien ohne bevorzugten Einzelwert in eingeklappter Ansicht; echte gleichwertige Untertabelle, Aliaswahl, zentrierte Parameter und sichtbare Warnung.
5. Automatische und manuelle 1D-Nachrechnung im Zoom: 241 Modellpunkte, Lösungsliste unverändert, Zoom trotz außerhalb liegender aktiver Lösung erhalten. Automatik abschaltbar.
6. Ausdrückliche neue globale Suche im Zoom übernimmt die Grenzen und findet die synthetische Referenz 118 nm. Die Periodizitätswarnung bleibt bei engerem Suchbereich erhalten.
7. Echter gekoppelter Zweiparameterfit mit fünf getrennten Fortsetzungen: keine inneren Randpfade; Warnungen zu Sättigung/Kopplung/guten Bereichen sichtbar. Astwahl, lokale Gleichungen und d[2]/n[2] eindeutig. Konfidenzansicht standardmäßig ausgeschaltet.
8. Sechs echte Mausrad-Zooms im gekoppelten Konturplot; kein Rücksprung nach Tick-/Beschriftungsupdates oder automatischer 161×161-Nachrechnung.
9. Manuelle 3D-Nachrechnung erhält die gedrehte Kamera, Rückkehr zur Kontur funktioniert.
10. Editor und Ergebnisansichten von 1 920 bis 390 px, jeweils ein- und ausgeklappte Eingaben, ohne bleibenden horizontalen Überlauf. Keine JavaScript-Laufzeitfehler. Nach Größenänderungen wurde die asynchrone Plotly-Größenanpassung abgewartet.
11. Mit frisch erzeugtem Ergebnis des endgültigen Talalgorithmus: weitere bestätigte Wurzeln auf demselben Ast erscheinen als tiefe Minima und auswählbare Familien-/Aliasmarker. Talprofil-CSV enthält Ast, Familie und Wiederholung; die optionale Konfidenzansicht ist ausgeschaltet.

Bei der GUI-Prüfung wurden ausschließlich synthetische Messungen und separate Bibliotheksordner verwendet. Browser-/Analysedateien und Screenshots werden nicht veröffentlicht. Die 18 Materialien und elf Schichtmodelle, optischen Formeln, globale Optimierung, Laufzeitabhängigkeiten und der gemeinsame Windows-Starter bleiben unverändert. Ein tatsächlicher Windows-Lauf wurde weiterhin nicht durchgeführt. Frühere Prüfungen sind unten und in `Pruefdaten_Browser.json` nach Version getrennt dokumentiert.

## Basisprüfung von 1.3.2

**26 gezielte Rechen-/API-/Starttests bestanden**, mit zwei unveränderten AnyIO-/Starlette-Bibliothekswarnungen. Enthalten sind sämtliche Wiederholungs-/Unsicherheitsprüfungen aus `test_statistics12.py`, API-/Cache- und Startprüfungen. Zwei neue synthetische Fälle führen Import und Wiederholungsanalyse bis zur HTTP-Antwort: weit verteilte Δ-Werte ohne geeignete Kovarianz und gültige Wiederholungen am 0°-/360°-Übergang. Zusätzlich werden native Wahrheitswerte und strikte JSON-Serialisierbarkeit kontrolliert. Alle drei JavaScript-Dateien bestehen die Syntaxprüfung.

**Private neu hochgeladene DAT unabhängig über die API geprüft:** 16 434 Messungen, keine verworfenen Datenzeilen, sieben Winkelgruppen. Import HTTP 200. Die anschließende Wiederholungsanalyse reproduziert in 1.3.1 exakt den gemeldeten NumPy-/JSON-Fehler (HTTP 400); in 1.3.2 HTTP 200 und ausschließlich native `bool`-Felder. Keine Messwerte oder Kommentare werden veröffentlicht.

**Vier tatsächliche Chromium-Prüfungen bestanden:**

1. Vollständiger Import derselben privaten DAT, automatische Streuungsanalyse aller Winkel ohne NumPy-/JSON-Fehler, 100 Zeilen pro Seite und erhaltene Auswahl.
2. Direkter Sprung zur letzten Messung, Auswahl von drei Zeilen und vollständiger Fit samt JSON-Ergebnis und Diagrammen. Diese Ausführungsprüfung behauptet keine physikalische Gültigkeit des angenommenen Schichtmodells.
3. Unabhängiger synthetischer Auslöser mit breit verteilten Δ-Werten durch Import, Wiederholungsanalyse und Fit: ungewichteter Modus, unbekannte Unsicherheit und lesbarer JSON-Fitbericht korrekt erhalten.
4. Anschließender synthetischer Referenzfit mit 118 nm, Versions-/Cache-Schutz, logarithmischer RMS-Achse, Freigabe nach fertiger Darstellung und 390-px-Ansicht ohne Laufzeitfehler oder horizontalen Überlauf.

Der gemeinsame Windows-Starter wurde statisch auf PATH-Vorrang, Interpreterprüfung, lokale Paketinstallation, Fehlerpfade und Argumentweitergabe geprüft; CRLF-Zeilenenden bestätigt. Ein tatsächlicher Windows-/WinPython-Lauf wurde nicht durchgeführt. Der separate WinPython-Starter entfällt. Optische Formeln, Suchverfahren, Material-/Modellwerte und Abhängigkeiten sind unverändert; in der Statistik ändert sich nur der Datentyp des Freigabewerts bei gleicher Entscheidungslogik. Private Dateien und Analyseartefakte bleiben außerhalb des Pakets.

## Basisprüfung von 1.3.1

**Zehn gezielte Start-/API-Tests bestanden**: vier neue Prüfungen des Browseraufrufs und die sechs bestehenden API-/Cache-Prüfungen. Die neuen Tests kontrollieren, dass der Browser auf Serverbereitschaft und Nachlauf wartet, bei beendetem/fehlgeschlagenem Start nicht geöffnet wird und ein Abbruch die Wartezeit unterbricht. Zwei unveränderte AnyIO-/Starlette-Bibliothekswarnungen; alle drei JavaScript-Dateien bestehen die Syntaxprüfung. Die optischen Rechenmodule sind bytegleich zu 1.3.0; dessen 68 Rechen-/API-Tests bleiben die numerische Basisprüfung.

**Tatsächlicher Serverstart mit zusätzlicher Verzögerung von 1,6 Sekunden:** Der automatisch ausgelöste Browseraufruf wurde abgefangen und seine URL sofort per HTTP angefragt. Genau ein Aufruf, erst rund eine Sekunde nach geöffneten Server-Sockets; erster Seitenaufruf HTTP 200 und passende API-Version 1.3.1. Kein Aktualisieren nötig. Der Prüflauf mit `--no-browser` startet weiterhin ohne Browseraufruf.

**Acht tatsächliche Chromium-Szenarien bestanden:**

1. Ganze Oberfläche während Berechnung und absichtlich verzögerter Diagrammdarstellung grau und inert. Fortschritt/Abbruch bleiben erreichbar; Strg+S öffnet kein Speicherdialog. Freigabe erst nach fertigen 1D-Ergebnissen, auch bei 390 px ohne horizontalen Überlauf.
2. Zoom und versetzte Minimum-Beschriftungen nach der nun abgewarteten Ergebnisdarstellung weiterhin korrekt.
3. Echter gekoppelter Zweiparameterfit mit linearer Parameter-Y-Achse; die Sperre wartet auch auf das absichtlich verzögerte Talprofil im Diagnosebereich.
4. Anschließender Einparameterfit startet mit logarithmischer RMS-Achse. Manuelles Umschalten auf linear bleibt möglich; der nächste Fit startet erneut logarithmisch.
5. Laufenden echten Zweiparameterfit über das aktive Abbruchfeld beendet; Eingaben und Fokus danach wieder freigegeben.
6. Absichtlich fehlgeschlagener Fitstart zeigt die konkrete Fehlermeldung und hebt die Sperre auf, ohne Eingaben zu verlieren.
7. Absichtlicher Plotfehler wird abgefangen; Sperre aufgehoben und anschließender echter Fit wieder vollständig farbig und erfolgreich. Keine JavaScript-Laufzeitfehler.
8. Echter Zweiparameterfit direkt in 3D; logarithmische RMS-Z-Achse, Sperre bis nach absichtlich verzögerter Mesh-Darstellung und anschließende vollständige Freigabe.

Die Browserprüfungen verwenden synthetische Messungen und separate Bibliotheksordner. Windows-Batchdateien, Laufzeitabhängigkeiten und Material-/Modellwerte sind unverändert. Ein echter Windows-/WinPython-Start wurde weiterhin nicht durchgeführt. Private Dateien und Browserartefakte werden nicht veröffentlicht. Aktuelle und frühere Prüfpunkte sind in [Pruefdaten_Browser.json](Pruefdaten_Browser.json) getrennt erfasst.

## Basisprüfung von 1.3.0

**68 Rechen-/API-Tests bestanden**, einschließlich des privaten Importtests; zwei unveränderte AnyIO-/Starlette-Bibliothekswarnungen. Alle drei JavaScript-Dateien bestehen die Syntaxprüfung. Die Versions-/Cache-Prüfung umfasst das neue Ansichtsmodul und erkennt dessen Inhaltsänderungen ohne Versionswechsel. Optische Formeln, Suchverfahren, Anforderungen und Windows-Starter bleiben unverändert; im Standardmodell ändern sich nur Name und Notizen.

**18 Materialien und elf Schichtvorlagen** über die realen API-Endpunkte validiert. Die bisherigen identischen SiO2-Materialeinträge sind zusammengefasst; native Oxidmodelle mit 1,5 nm bleiben enthalten. Alle Vorlagen verwenden konsistente Materialwerte. **88 unabhängige tmm-Vergleiche** der komplexen Reflexionskoeffizienten bestanden: elf Modelle, vier Winkel, zwei Polarisationen. Das Standardmodell stimmt mit der allgemeinen Si/SiO2-Vorlage überein. Herkunft und Grenzen der Richtwerte stehen in [MATERIALIEN.md](MATERIALIEN.md).

**13 tatsächliche Chromium-Szenarien bestanden:**

1. Version und Cache-Schutz; 100 Zeilen je Seite, „Ohne Gruppen“, editierbarer Aufbau vor Vorschau, 18 Materialien und elf Modelle einschließlich nativem Oxid.
2. Echter Referenzfit mit 118 nm; Lösungsliste, Fehlerlandschaft und Modellvergleich in einer Reihe; Eingaben einklappbar, helle Minimum-Beschriftungen mit Abstand zum Punkt.
3. Zoom bleibt bei Listenwahl und tatsächlichem Klick auf sichtbare Minimum-Punkte erhalten. Eine außerhalb liegende Lösung verschiebt die Ansicht bei gleicher Zoomstufe.
4. Achsenticks und Zahlenauflösung folgen engen Zooms auf Log-, Parameter- und Winkelachsen sowie beiden Δ-/Ψ-Achsen. Vergleichszoom bleibt beim Lösungswechsel erhalten.
5. Frühere Ergebnisse schon beim Tippen/Ändern gekennzeichnet; Rückgängig stellt den passenden Eingabestand wieder her. Fit-Zähler und Unsicherheitsdiagnosen bleiben am tatsächlich berechneten Stand.
6. 16 050 synthetische Messungen: frei eingestellte Seitenlänge 37, umgekehrte Dateiansicht, Anfang/Ende, direkte Messungsnummer und letzte Messung auch mit Gruppen. Rohdaten und Fit-Auswahl bleiben unverändert.
7. Seitenlänge, Reihenfolge und ausdrückliche Gruppierung mit einer Sitzung gespeichert und wiederhergestellt; ältere Sitzungsoptionen bleiben lesbar.
8. Echter gekoppelter Zweiparameterfit mit Talprofil und Lösungsregionen. Konturzoom bleibt bei Familien-/Aliaswahl erhalten; enge n-Achsenticks bleiben unterscheidbar.
9. Gedrehte 3D-Kamera beim Lösungswechsel erhalten; Rückkehr zur Kontur, Talprofil und Diagnoseansicht nutzbar.
10. Nach 3D wieder korrekte 1D-Ansicht; eigene Null-Dicken-Probe auf Hybridachse, dynamische physikalische Ticks nahe null und RMS-Hintergrund nach Zoom.
11. Ansichten von 1 920 bis 390 px ohne horizontalen Seitenüberlauf. Ab 1 240 px stehen alle drei Ergebnisansichten nebeneinander, darunter sinnvoller Umbruch. Keine JavaScript-Laufzeitfehler.
12. Minimum-Nummer tatsächlich angeklickt; positive kleine RMS-Ticks werden nicht als null beschriftet. Echter Autoscale-Knopf richtet den Bereich nach Daten statt Farbhintergrund aus.
13. Speichern unter im neuen Layout, abgebrochenes Überschreiben und Rückgängig zum Datei-/Fit-Speicherpunkt; Fitbericht heruntergeladen und endgültige breite Ansicht geprüft.

Browser-Schreibprüfungen verwenden separate temporäre Bibliothekskopien. Private Messdateien, Handbuch, Analysen und Screenshots werden nicht veröffentlicht. Aktuelle und historische Prüfungen sind in [Pruefdaten_Browser.json](Pruefdaten_Browser.json) nach Version getrennt.

## Basisprüfung von 1.2.9

**68 Rechen-/API-Tests bestanden**, einschließlich des privaten Importtests. Zwei unveränderte AnyIO-/Starlette-Bibliothekswarnungen. Die zehn gezielten API-/Speicherprüfungen wurden vorab separat bestanden; beide JavaScript-Dateien bestehen die Syntaxprüfung.

Neue Speicherprüfungen kontrollieren für Modelle und Materialien: unzulässige Pfade sowie reservierte Windows-Gerätenamen ohne Dateiveränderung abweisen; Konflikt ohne Überschreibbestätigung erhält das Original; Speichern als Kopie bewahrt die Ausgangsdatei; ausdrückliches Überschreiben persistiert den geänderten Inhalt. Die Versions-/Cache-Prüfung bezieht das neue Speichermodul ein und erkennt auch Änderungen an dessen Inhalt ohne Versionswechsel.

**Zehn tatsächliche Chromium-Szenarien bestanden:**

1. Dateiname und Status für neue, geladene und geänderte Modelle; Status schon beim Tippen. Reine Sucheinstellung ändert keine Modelldatei. Rückgängig/Wiederherstellen erkennt den Speicherpunkt.
2. Echte Überschreibrückfrage abgebrochen und bestätigt, tatsächliche Datei kontrolliert. Dateizuordnung und Speicherpunkt bleiben beim Rückgängig korrekt.
3. Speichern unter mit Dateinamen und ergänztem .json; Dialogabbruch, ungültiger Pfad und abgelehnte Dateikollision verändern nichts; erfolgreiche Kopie erhält das Original.
4. Modellwechsel mit Speichern, Verwerfen und Abbrechen; Auswahl bei Abbruch korrekt. Das bisherige Dokument wird vor dem Wechsel gespeichert. Neue Dokumente erhalten eine neue Historie.
5. Neuer Entwurf beim Wechsel zuerst unter Dateinamen gespeichert; abgebrochener Speichern-unter-Dialog bewahrt den Entwurf.
6. Strg+S mit noch fokussierter Eingabe; absichtlich fehlgeschlagener Schreibzugriff erhält Datei und Änderungsstatus, erneuter Versuch gelingt. Tatsächliches Browser-Neuladen per Rückfrage abgebrochen.
7. Externer JSON-Import bleibt als noch nicht in der Bibliothek gespeichert erkennbar. Export setzt den Speicherstatus nicht zurück. Sitzungswechsel nach Abbruch mit derselben Importdatei erneut ausführbar.
8. Gleiches Dateiverhalten für Materialien: Status, überschreiben/abbrechen, Kopie, Wechsel mit Speichern/Abbrechen. Schließen bewahrt den Entwurf; Übernahme macht das Modell geändert.
9. Tatsächlicher Referenzfit und Ergebnisübernahme behalten die Dateizuordnung; Übernahme ist eine rückgängig machbare Änderung des geladenen Dokuments.
10. Dateileiste und Speichern-unter-Dialog bei 390 px ohne horizontalen Überlauf oder JavaScript-Laufzeitfehler.

Die Browserprüfungen verwenden ausschließlich separate temporäre Bibliothekskopien. Keine Prüfschreibvorgänge in den mitgelieferten Modell-/Materialdateien. 20 Materialien und zwölf Schichtvorlagen sind unverändert aus 1.2.8 enthalten. WinPython-Starter bytegleich, optische Formeln und Suchverfahren unverändert. Private Daten und Screenshots werden nicht veröffentlicht.

## Basisprüfung von 1.2.8

**64 Rechen-/API-Tests bestanden**, einschließlich des privaten Importtests; zwei unveränderte AnyIO-/Starlette-Bibliothekswarnungen. JavaScript-Syntaxprüfung bestanden. Die optischen Formeln und der Suchalgorithmus wurden nicht geändert.

Zusätzliche Bibliotheksprüfung: alle **20 Materialien und 12 Schichtvorlagen** über die realen API-Endpunkte geladen und validiert. Einheitliche 632,8 nm, Quellen in den Notizen, keine erfundenen Materialunsicherheiten, keine „Beispiel“-Namenszusätze, konsistente Materialwerte zwischen Vorlagen und Bibliothek. Optische Reihenfolge von ALD-Al2O3 / nativem Oxid / Si geprüft. **96 unabhängige tmm-Vergleiche** der komplexen Reflexionskoeffizienten: zwölf Modelle, vier Winkel, zwei Polarisationen, Toleranz 4 × 10⁻¹². Alle Vergleiche bestanden, alle berechneten Winkel endlich und Ψ im gültigen Bereich. Standardmodell stimmt mit der trockenen Oxidvorlage überein.

**Vier tatsächliche Chromium-Szenarien bestanden:**

1. Version und Cache-Schutz, zwölf sauber benannte Modelle; tatsächlicher Referenzfit weiterhin bei 118 nm mit eindeutiger SiO2-Schichtkennung.
2. Alle zwölf Vorlagen tatsächlich in der Oberfläche geladen; korrekte Schichtnummern und ALD-/Oxid-Reihenfolge, Anfangsdicken erhalten.
3. Alle zwanzig Materialien tatsächlich ausgewählt; Notizen und Wellenlänge geladen. Kleines positives k bleibt von null unterscheidbar. Materialübernahme bewahrt die Dicke und lässt sich rückgängig machen; neu eingefügte Schicht weiterhin bei 0 nm.
4. Glas/Polymer-Vorlage mit konkretem Glasindex und Rückseitenhinweis; Seite und Materialdialog bei 390 px ohne horizontalen Überlauf oder JavaScript-Laufzeitfehler.

Der WinPython-Starter ist bytegleich zu 1.2.7. Keine neue Laufzeitabhängigkeit. Private Messdaten, Handbuch, Rohdaten aus der Literaturrecherche und Screenshots werden nicht veröffentlicht. Die Quellen und Rundungsannahmen der einzelnen mitgelieferten Richtwerte sind in MATERIALIEN.md und den Materialdateien dokumentiert.

## Basisprüfung von 1.2.7

**64 Rechen-/API-Tests bestanden**, einschließlich des privaten Importtests. Nach verständlicherer Bereichsvalidierung der Probelösungen wurden die sechs neuen Prüfungen gezielt nochmals erfolgreich ausgeführt. JavaScript-Syntaxprüfung bestanden. Die zwei Bibliothekswarnungen betreffen AnyIO/Starlette.

Neue Prüfungen umfassen direkte Modellrechnung einer Probelösung ohne Optimierung/Änderung vorhandener Fitfamilien, physikalisch zulässiges d = 0 außerhalb einer positiven logarithmischen Suche, Ein- und Mehrwinkelvergleich, Ablehnung ungültiger Werte/Parameterzahlen, verfügbare abgeschlossene Jobs, umgekehrte Nummerierung einschließlich Substrat [0] sowie die Einstufung kritischer Hinweise.

**10 tatsächliche Chromium-Prüfungen bestanden:**

1. Feldpfeile mit der Maus geklickt: n um 0,001, d um 0,1 nm und kleine k-Werte mit angepassten Schritten. Drei/eine Nachkommastellen; Tastaturpfeile ändern das Modell nicht.
2. Neue Schicht bei exakt 0 nm; Nummerierung von Substrat [0] nach oben in Diagramm, Eingaben, Parameterwahl und Materialziel. Rückgängig/Wiederherstellen und tatsächlicher JSON-Export erhalten optische Reihenfolge und ursprüngliche Namen.
3. Messdaten links und Ergebnisse rechts vor den Plots; Namen in der Kennzahlenleiste. Hinweise/Analyse standardmäßig eingeklappt. Die zusätzliche Nullschicht verändert das Wiederfinden der Referenzdicke nicht.
4. Probelösungen tatsächlich eingegeben, ausgewählt, verglichen, gelöscht und als CSV/JSON heruntergeladen. d = 0 ist im Fehlerplot darstellbar, die Fitfamilien bleiben unverändert und es werden keine Fitunsicherheiten für Probelösungen ausgegeben.
5. Verweilen mit echten Mausradereignissen: zehn fortlaufende Scrollereignisse bleiben global; nach Ruhe über der Liste ist lokales Scrollen aktiv. Verlassen beendet die Freigabe. Eine alte Scrollschalter-Einstellung aus einer Sitzung wird ignoriert.
6. Nach Verweilen echtes lokales 2D-Zoom; Seitenscrollen und RMS-Farbhintergrund bleiben nutzbar.
7. Tatsächlicher Zweiparameterfit mit d[2]/n[2], vorhandenen Lösungsregionen und aufklappbarem Analyseplot. Eigenes Wertepaar bleibt unoptimiert; n = 0 wird abgewiesen. Echtes lokales 3D-Zoom nach Verweilen.
8. Alle vier Hinweistypen erzeugt und verschiedene Hintergrundfarben geprüft. Ein globales Randminimum bleibt als kritischer Hinweis sichtbar und öffnet die Details.
9. 390-px-Ansicht ohne horizontalen Seitenüberlauf; keine JavaScript-Laufzeitfehler.
10. Endgültige Oberfläche mit drei Filmen als [3]/[2]/[1] über Substrat [0], neue Filme bei null. Feldpfeile bewahren explizite Nullunsicherheiten, Hinweisfarben und schmale Ansicht korrekt.

Private Messwerte und Screenshots werden nicht veröffentlicht. Historische und aktuelle Browserprüfungen bleiben in `Pruefdaten_Browser.json` nach Version getrennt. Der WinPython-Starter bleibt unverändert.

## Basisprüfung von 1.2.6

**58 Rechen-/API-Tests bestanden**, einschließlich des privaten Importtests. JavaScript-Syntaxprüfung bestanden. Die zwei Warnungen betreffen AnyIO/Starlette als Testbibliotheken.

Zusätzliche Prüfungen gegenüber 1.2.5:

- Jeder ausgegebene Minimum-/Talanker ist nicht nur als Punkt vorhanden, sondern Teil mindestens einer Fläche des adaptiven Netzes. Seine Höhe entspricht dem direkt berechneten Winkel-RMS. Die Kontrolle hat nahezu zusammenfallende Punkte aufgedeckt, die eine gewöhnliche Triangulierung als koplanar weglassen konnte; die Vernetzung erhält diese Anker jetzt.
- Schmale, gekrümmte 95-%-Profilbänder bleiben als zusammenhängende Teilbereiche mit korrekt zugeordneten Periodenwiederholungen erhalten. Nachgerechnete Grenzpunkte erfüllen den Mittelwertvergleich; bei 99 % verbinden sich im synthetischen Beispiel die beiden Familien.
- Endlicher Hotelling-T²-Mittelwertvergleich: drei Wiederholungen ergeben die 95-%-Grenze 798; bei zwei gleichzeitig betrachteten Winkeln berücksichtigt die Darstellung die Bonferroni-Korrektur.
- Ohne aktiv verwendete geeignete Kovarianz wird kein statistischer Bereich erfunden. Grenzextraktion erhält Löcher und Beschneidung durch den Suchbereich.

**12 tatsächliche Chromium-Prüfungen bestanden:**

1. Version, Cache-Schutz, Einparameter-Referenz, Datensatzbezeichnung und unverändertes 1D-Autoscale.
2. Synthetischer gekoppelter Fit mit zwei Familien: prominente 95-%-Bereiche, Voraussetzungen und Parameter-Spannweiten; Namen/Kommentare der gefitteten Daten sichtbar.
3. Umschaltung 95/99 %, sich bei breiterem Niveau verbindende Familien und abschaltbare Umrandung; RMS-Farben bleiben erhalten.
4. Große Schichtkennungen außerhalb der Kästchen; d[1]/n[1] in Gleichungen und Punktinfos; neue Nachkommastellen und Unterscheidung kleiner positiver k-Werte von null.
5. Tatsächliche 3D-Darstellung mit 68 064 nachgerechneten Netzpunkten, 604 expliziten Ankern und 136 099 Dreiecken im synthetischen Beispiel.
6. Lösungsbereiche, adaptive Stützpunkte und vollständigen Fitbericht tatsächlich heruntergeladen und auf Inhalte/Bezeichnungen geprüft.
7. Echte Mausradereignisse über langen Listen und dem 3D-Plot: standardmäßig Seitenscrollen, unveränderte lokale Listenposition bzw. Diagrammkamera. Alt+Mausrad und ausdrückliche lokale Freigabe bedienen die Liste.
8. Jeweils zwei Dicken sowie zwei Brechungsindizes tatsächlich gefittet: eindeutige Schichtkennung, passende Suchraster-/Anzeigeachsen und keine erfundene Region bei fehlender Kovarianz.
9. Suchrasterwechsel synchronisiert die Anzeige; die Bezeichnungen eines gezeigten Fits bleiben nach Auswahländerungen erhalten.
10. 390-px-Ansicht ohne horizontalen Seitenüberlauf; keine JavaScript-Laufzeitfehler.
11. Privates Nutzerbeispiel mit zwei Familien: 95-%-Bereiche stimmen mit der unabhängigen vorherigen Störungsanalyse überein, 99-%-Bereiche verbinden Familien. Adaptives 3D-Netz und mobile Ansicht fehlerfrei. Nur bestandene Kontrolle und Familienanzahl werden veröffentlicht.
12. Endgültige Oberfläche: Raster und Achsen gemeinsam rückgängig/wiederhergestellt; Zahlenformatierung korrekt, kompakte Regionshinweise mit aufklappbaren Voraussetzungen, 3D und schmale Ansicht fehlerfrei.

Private Messwerte, Analysedateien und Screenshots sind weiterhin nicht im Repository enthalten. Historische Prüfungen und aktuelle Kontrollen sind in `Pruefdaten_Browser.json` mit Versionsnummern getrennt.

## Basisprüfung von 1.2.5

**52 Rechen-/API-Tests bestanden**, einschließlich des privaten ursprünglichen Importtests. Nach der abschließenden Präzisionsverbesserung der Profilstützstellen wurden die acht neuen Diagnosetests nochmals erfolgreich ausgeführt. JavaScript-Syntaxprüfung bestanden. Zwei Warnungen im Gesamtlauf betreffen die verwendeten Testbibliotheken AnyIO/Starlette und keine fehlgeschlagene Anwendungskontrolle.

Die acht neuen synthetischen Tests prüfen:

- Ein tatsächliches beschränktes Randminimum hat nach einer von n abhängigen Dickenperiodenverschiebung denselben Q-Wert, ist dort aber kein inneres Minimum. Es wird aus der Familienbildung ausgeschlossen.
- Breiter Zweiparameter-Suchbereich mit zwei Filmen: zwei bestätigte Wurzeln und periodische Kopien; alle ausgegebenen Aliase auf Stationarität geprüft. Die frühere Version gab für denselben synthetischen Fall elf Einträge einschließlich nicht ausreichend verfeinerter Talpunkte aus. Die neue Version findet die zwei interpolierenden Familien.
- Beide Mittelwerte werden getroffen, während der Einzelwert-RMS beim Wiederholstreuungsanteil bleibt. Q = 2(m−1) und das dadurch zwangsläufige χ²red = 1 werden vom unabhängigen Modellnachweis unterschieden.
- Voller lokaler Rang trotz sehr starker Parameterkorrelation; kein fälschlich behauptetes exaktes Kontinuum. Profilwerte mit unabhängig berechneten Rohwertresiduen verglichen; Profilkurve trifft die bestätigten Wurzeln.
- Endlicher gemeinsamer 95-%-Mittelwertvergleich bei drei Wiederholungen mit Hotelling-T²-Grenze 798 und konsistenter Punktkennzeichnung.
- Lokale lineare Talrichtung gegen unabhängig erneut minimierte Nachbarprofile.
- Ohne geeignete aktive Kovarianz keine erfundene 95-%-Bereichsangabe.
- Optische Phasennäherung mit korrekter Dickenperiode; gleicher Phasenwert allein hält Δ/Ψ nicht exakt konstant.

**8 tatsächliche Chromium-Szenarien bestanden:**

1. Versions-/Cache-Schutz, Einparameter-Referenz und unverändertes 1D-Autoscale; ohne Anlass kein Talprofil.
2. Synthetischer gesättigter Einwinkelfit: zwei Familien, Mittelwerttreffer, RMS-Streuungsanteil, voller Rang und präzise statt zu −1 gerundete Korrelation; kein irreführendes χ²red in der Liste.
3. Abschaltbare, unnummerierte Talspurpunkte im Konturplot mit RMS-Farben; nummerierte Minima bleiben getrennt auswählbar.
4. Familien-/Aliaswechsel aktualisiert lokale lineare Richtung und optische Phasennäherung.
5. Talprofil-CSV, erweitertes Lösungs-CSV und vollständigen JSON-Bericht tatsächlich heruntergeladen und inhaltlich geprüft.
6. Profilkurve, Kontur und 3D-Talspur ausführbar; Mittelwertvergleich mit endlicher Stichprobe erklärt.
7. 390-px-Ansicht ohne bleibenden horizontalen Seitenüberlauf; keine JavaScript-Laufzeitfehler oder ungültigen Plot-Eigenschaften.
8. Nutzerbeispiel lokal mit frisch gestartetem endgültigem Rechenkern nachgerechnet: zwei numerisch interpolierende Familien mit Rang 2; dieselben Wurzeln im Profil, schaltbare Achsen und fehlerfreie schmale Ansicht. Private Eingangsdaten, Ergebnisse und Screenshots werden nicht veröffentlicht; protokolliert werden nur bestandene Prüfungen und Familienanzahl.

Die bisherigen Farb-, Navigations- und Schichtkennungsfunktionen aus 1.2.4 bleiben enthalten. Historische Browserprüfungen und aktuelle Ergebnisse sind in `Pruefdaten_Browser.json` mit Versionsnummern getrennt.

## Basisprüfung von 1.2.4

**7 API-/Vergleichsplot-Tests und die JavaScript-Syntaxprüfung bestanden.** Die optischen Formeln und die Suche sind unverändert; ergänzt wurden Anzeigenamen und eindeutige Medium-Kennungen in den Ergebnisparametern.

**7 gezielte Chromium-Prüfungen bestanden:**

- Fehler in 1.2.3 über den tatsächlichen Autoscale-Knopf nachgestellt: Hintergrund dehnte die logarithmische y-Achse auf 10⁻¹⁵ bis 10⁴ aus. In 1.2.4 richtet sich Autoscale nach den dargestellten Daten; reine Ansichtsflächen beeinflussen die Achsen nicht. Der physikalische RMS-Höchstwert begrenzt die obere Achse bei Bedarf, während kleine Datenbereiche klein bleiben.
- Hintergrund bei Zoom, Doppelklick und Autoscale mit logarithmischer sowie linearer Achse geprüft.
- Durchgehend identisches kräftiges Grün von null bis 0,001°, ohne Cyan-Stufe, in Legende, Ergebnissen und Markern.
- Zwei synthetische Filme: [1] SiO2 und [2] Al2O3. Nummern in Aufbau, Eingaben, Auswahl, Materialziel, Achsen, Ergebniskopf, Unsicherheiten und CSV geprüft; Modell-JSON bewahrt die ursprünglichen Namen ohne Nummernprefix. Umordnen und Rückgängig geprüft; gemeinsamer Fit findet d = 118 nm und n = 1,76 wieder.
- Ursprüngliche private `.dat`-Datei mit 16 377 Zeilen: Anfang/Ende, direkte Seite 200, Messung 8 123 und letzte Messung geprüft. Auswahl wird durch Navigation nicht geändert.
- Gruppierte und zugeklappte Messungen werden beim Sprung geöffnet; ausgefilterte Ziele werden verständlich gemeldet und Filter bleiben erhalten.
- Schmale Darstellung mit 390 px ohne horizontalen Seitenüberlauf; keine JavaScript-Laufzeitfehler.

Die folgenden umfangreichen Rechen-/Browserprüfungen dokumentieren den Stand **1.2.2**. Zwischenstände und aktuelle Prüfungen sind in `Pruefdaten_Browser.json` durch Versionsnummern getrennt. Die Farbabstufung aus 1.2.2/1.2.3 wurde in 1.2.4 wie oben beschrieben angepasst.

## Basisprüfung 1.2.2: Automatisierte Rechen- und API-Tests

**44 Tests bestanden**, einschließlich des privaten Importtests mit den ursprünglichen Dateien:

```sh
ELLIFIT_EXAMPLES_DIR=/Pfad/zu/privaten/Beispielen python -m pytest -q
```

Ohne diese privaten Dateien wird genau dieser Importtest übersprungen. Die Dateien werden nicht veröffentlicht. Der Testumfang umfasst:

- Analytische Substratinversion, Nullschichtdicke, dicke Absorber, undefinierte Reflexion und Mehrschichtamplituden gegen die unabhängige Bibliothek `tmm`, einschließlich absorbierender und evaneszenter Fälle.
- Beide Δ-Konventionen, unabhängige Prüfung der Elli-kompatiblen Phasenausgabe, 0°/360°-Übergang, CSV/Dezimalkomma und die ursprünglichen `.phi`-/`.dat`-Formate.
- Globale d-, d/n- und Substrat-n/k-Fits, Stokes-n-Fit, Randminima, flache Landschaften, Abbruch, Rückfrage bei Wiederholungen und Einwinkelvergleich mit Dicke als zweitem Parameter.
- Eine und zwei transparente Dickenperioden; analytische Aliase als eine Familie in aufsteigender Reihenfolge. Absorption ergibt keinen falschen exakten Periodennachweis.
- Gruppierte korrelierte Winkelresiduen gegen die Summe jedes einzelnen Residuenpaares, einschließlich zyklischer Zweigwechsel. Gleichheit von gewichtetem Rohwert- und Mittelwertfit.
- Fehlende beziehungsweise identische Wiederholungen, singuläre Kovarianz und Drifthinweise. Sehr kleine Streuung wird gegen direkte Residuen geprüft, um numerischen Auslöschungseffekten vorzubeugen.
- Getrennte statistische/Kalibrierbeiträge und quadratische Kombination. Fortgepflanzte GLS-Kovarianz gegen eine unabhängig differenzierte Fisher-Matrix.
- Paarweiser lokaler Bootstrap; an künstlichen Grenzen beschnittene Intervalle werden nicht als Präzisionsangabe ausgegeben.
- Exaktes k = 0 plus logarithmischer positiver Bereich, Wiederfinden von k = 10⁻⁵ und Profil-Obergrenze bei mit null verträglichen Daten. Eine physikalische k-Nullgrenze verdeckt keine weitere künstliche Suchgrenze.
- Unveränderter Winkel-RMS unverändert beim Vervielfachen derselben Werte. Modell-/Materialpersistenz, Validierung, Dateinamenprüfung, Origin-Prüfung und Normalisierung alter Sitzungen bei Erhalt expliziter Konventionen. Sitzungen ohne ausgewählte Parameter werden gespeichert; Fitaufrufe ohne Parameter bleiben ungültig.

Zusätzlich geprüft: versionsabhängige Datei-URLs, no-store-Antworten sowie neue Datei-URLs nach Inhaltsänderungen ohne Versionsänderung.

JavaScript-Syntaxprüfung mit `node --check ellifit/static/app.js` bestanden. Zwei Warnungen stammen aus AnyIOs pytest-Anbindung und Starlettes Testclient bezüglich künftiger Schnittstellen; kein Anwendungstest ist fehlgeschlagen.

## Browserprüfung

Automatisierte tatsächliche Bedienung mit Playwright und Chromium; 20 protokollierte Prüfpunkte in [Pruefdaten_Browser.json](Pruefdaten_Browser.json):

| Prüfung | Ergebnis |
|---|---|
| Voreinstellungen und Zahlenformat | 632,8 nm, Elli-Δ, d log, n linear, k log plus null; Optik zunächst eingeklappt |
| Direktauswahl der Fitparameter | fix/X/Y synchron zu den Suchparametern; Achsentausch erhält Grenzen, Schichtverschieben erhält Zuordnung; Rückgängig und Sitzung ohne Auswahl geprüft |
| RMS-Farbstufen | Alle Ankerfarben bei 0,01°/0,1°/1°/10°/100° sowie feste Endfarben cyan und violett geprüft |
| 1D-Hintergrund | 98 gedeckte Farbflächen unter der Kurve, auf logarithmischer und linearer y-Achse korrekt zugeordnet |
| Eingaben und Schichtbearbeitung | Pfeiltasten n/d, vierstellige Anzeige ohne Rundung unveränderter Modellwerte, Verschieben/Löschen/Rückgängig erfolgreich |
| Einparameter-Mehrwinkelfit | Synthetische Referenz d = 118 nm wiedergefunden; Achsen unabhängig vom Suchraster schaltbar; Δ rot, Ψ blau; keine zusätzliche transformierte Kennzahl oder Q-Spalte |
| Einwinkel-Periodenfamilie | Vier Dickenaliase mit T ≈ 283,1579 nm zusammengefasst; sortierte Aliaswahl aktualisiert den Vergleich; Markerfarben/-nummern konsistent |
| Simultaner d/n-Fit | d = 118 nm, n = 1,46 wiedergefunden; feste RMS-Konturskala und 3D-Umschaltung mit RMS-Tälern und logarithmischer z-Achse erfolgreich |
| Exporte und Sitzung | Vier Ergebnisformate tatsächlich heruntergeladen; Messdaten-CSV mit gleicher Anzahl erneut importiert; Sitzung gespeichert/geöffnet; Zusatzkennzahl auch aus CSV und JSON entfernt |
| Modelle und Materialien | Modell gespeichert/geladen; Material gespeichert, als JSON exportiert/importiert, angewendet und rückgängig gemacht; Dicke erhalten |
| Wiederholungsmessungen | 96 synthetische Messungen, Winkelgruppen mit Teilauswahl; GLS und Mittelwertfit identisch; statistischer Beitrag, Kalibrierung und Bootstrap angezeigt |
| k einschließlich null | Nullpunkt der Fehlerlandschaft vorhanden, erklärte Hybridachse und statistischer Nullvergleich dargestellt |
| Alte Konvention | Explizite alternative Δ-Konvention bleibt erhalten |
| Privater `.phi`-Import | 10 Zeilen, 9 Winkel; Rückfrage für Mittelwert- und Rohwertfit durchlaufen |
| Privater `.dat`-Import | 16 377 Zeilen, Seitennavigation, Filter und globales Häkchen erfolgreich |
| Abbruch | Globale Zweiparametersuche über die Oberfläche abgebrochen |
| Schmale Ansicht | 390 px ohne horizontalen Seitenüberlauf |
| JavaScript-Laufzeitfehler | Keine |
| Vorher gefüllter Browser-Cache | Altes JavaScript/CSS mit neuer 1.2.1-Seite reproduziert fehlende Farben und Auswahlfelder; nach Wechsel auf 1.2.2 im selben Browser ohne Löschen des Caches behoben |
| Versionsabweichung | Oberfläche 1.2.2 mit absichtlich abweichender API-Version 1.2.1 meldet den Fehler und deaktiviert den Fit |

Die JSON-Prüfdaten enthalten ausschließlich synthetische Ergebnisse und Importanzahlen; keine privaten Messwertlisten. Browserprüfung bezeichnet die tatsächliche Ausführung und Bedienung der lokal gestarteten Anwendung im Browser, nicht einen Upload der Messdaten an einen Webdienst.

## Umgebung und Aussagegrenzen

Geprüft mit Python 3.12.14, NumPy 2.3.5, SciPy 1.17.0, FastAPI 0.141.1, Pydantic 2.13.4, Uvicorn 0.52.1, Plotly 7.1.0, pytest 9.2.0, tmm 0.2.0 und Playwright 1.62.0. Die Anforderungen erlauben kompatible Versionsbereiche.

Ein tatsächlicher Windows-/WinPython-Lauf wurde nicht durchgeführt. Ab 1.3.2 wird ausschließlich `Start_Windows.bat` mit Python aus PATH beziehungsweise dem Python-Launcher ausgeliefert; die Datei verwendet Windows-Zeilenenden. Windows 7 ist nicht unterstützt. Das Paket enthält Quellcode, keine kompilierte EXE.

Numerische Referenzen sind keine experimentelle Genauigkeitsangabe. Die reale Probe kann ohne verifiziertes Schichtsystem und Materialwerte nicht physikalisch validiert werden. Lokale Kovarianzen, bedingte Bootstrapintervalle und asymptotische k-Profile ersetzen weder die Kontrolle systematischer Fehler noch die Prüfung globaler Mehrdeutigkeit. Eine endliche globale Suche kann Minima übersehen; Details stehen in der [README](README.md).
