# ElliFit – umgesetzte Änderungen

Stand: 17. November 2026. Quellstand 1.4.2; ersetzt die Bedienoberfläche und erweitert die Auswertung von 1.1.1.

## Ungewichteter Standard und Bedienung in 1.4.2

- Ungewichtet fitten als Vorgabe in Oberfläche und API; ausdrückliche Sitzungsoptionen erhalten. Automatische Kovarianzgewichtung bleibt wählbar und setzt passende Wiederholungen voraus.
- Beschriftung „Ausschnitt automatisch nachberechnen“.
- Mausrad-Zoom bei RMS- und Fitgrößen-Konturplots ausgeschaltet; Rechteck und Werkzeugleisten-Zoom bleiben erhalten, andere Plotarten unverändert.
- Automatischer Sprung zur Auswertung nach erfolgreicher Suche und fertiger Darstellung; kein Sprung bei Abbruch oder Fehler.
- Klare Warnung „Fit relativ schlecht – Winkel-RMS über 1°“, erst oberhalb von 1°. Die gesonderte Orientierung für sehr gute Lösungen bei ≤ 0,1° bleibt erhalten.
- Lokale Bootstrap-Fits bei extrem engen Grenzen stoppen auch ungewichtet nicht vorzeitig an der kleinen Anfangsgradientennorm; beschnittene Intervalle werden unterdrückt.

- **Prüfung:** 86 Tests bestanden, ein erwarteter privater Importtest übersprungen und zehn echte Chromium-Prüfungen bestanden.

## Konsistente Fit-Minima und Fehlerdarstellung in 1.4.1

- **Ursache nachgerechnet:** Die automatische Kovarianzgewichtung kann ein anderes Minimum als der ungewichtete Winkel-RMS liefern. 1.4.0 minimierte korrekt die gewichtete Zielfunktion, zeichnete aber den ungewichteten RMS. Das führte zu scheinbar falsch liegenden Markierungen.
- **Gleiche Größe für Suche und Darstellung:** Standardmäßig tatsächlich minimierte Fit-Abweichung in 1D, Kontur, 3D und Talprofil. Monotone Darstellung √(Q/K), mit ausdrücklich benannter Einheit. Optimierung und Gewichtung bleiben unverändert.
- **RMS bleibt verfügbar:** Eigene Kontrollansicht mit sichtbarer Erklärung; feste RMS-Farben für Punkte/Liste erhalten. Neutrale relative Landschaftsfarben für abweichende Fitgrößen, keine Winkelfarbgrenzen auf dimensionslosen Achsen. Passender Kennzahlen- und Sortierungstext.
- **Zoom-Anker erhalten:** Eindimensionale Nachberechnung enthält exakte bestätigte Minima zusätzlich zum regulären Raster. Q und RMS in lokalen/3D-Netzen, Marker, Probelösungen und Exporte verwenden passende Werte.
- **Weitere Fälle abgedeckt:** Stokes-Fit und ungewichtete Winkelmittelwertauswertung mit ungleichen Wiederholungszahlen ebenfalls korrekt bezeichnet und dargestellt. Anzeigewechsel verändert keine Sucheinstellung; bewusstes ungewichtetes Neufitten bleibt verfügbar.
- **Prüfung:** 85 Tests bestanden, ein privater Importtest erwartungsgemäß übersprungen, zehn tatsächliche Chromium-Prüfungen einschließlich des vorgelegten privaten Falls. Keine privaten Eingangsdaten oder Ergebnisse im Repository. Keine neuen Laufzeitabhängigkeiten; gemeinsamer Windows-Starter unverändert.

## Integrierter Schichteditor und untersuchbare Fehlerlandschaft in 1.4.0

- Modell- und Suchparameter verschmolzen: lokale X/Y/fix-Rollen, Grenzen und Raster am betreffenden Zahlenfeld; übrige Optionen gesammelt ausklappbar. Doppelte Auswahl und zusätzliche Stack-Vorschau entfernt, Rollen/Nummern/n/k/d bleiben im Editor.
- Plus-Schaltflächen an jeder Grenzfläche, neue Filme bei 0 nm, Parametermapping und Rückgängig erhalten. Materialauswahl direkt je Zielkarte, Quelle/Kommentar erhält mehr Platz und vollständigen Umbruch.
- Sichtbare Übernahmewarnungen für Periodizität, mehrere gute Familien, gesättigte oder schwache Fits, starke Kopplung, gute Talspannen und Rand-/schlechte beste Fits. Hinweise gehören ausdrücklich zum datierten Fit.
- Periodische Familien als ausklappbare gleichwertige Tabellen; eingeklappt keine bevorzugten Einzelwerte. Parameter- und Aliaswerte zentriert unter ihren Überschriften.
- Getrennte, adaptive Talfortsetzung in normierten linearen/logarithmischen Suchkoordinaten. Ende an der ersten Grenze, keine Randfortsetzung. Weitere bestätigte Wurzeln auf demselben Ast exakt aufgenommen. Astwahl und lokale Gleichungen nennen Familie/Wiederholung; CSV enthält Astkennungen.
- Zoom automatisch oder manuell nachrechnen, ohne Minima neu zu optimieren. Neuer expliziter Suchknopf übernimmt den Ausschnitt als Suchgrenzen. Geänderte Eingaben verhindern die Vermischung mit einem alten Fit. Veraltete Antworten werden verworfen.
- Achsenticks und Beschriftungen schreiben die aktuellen Ansichtsgrenzen bei ihrer Aktualisierung mit. Rein darstellende Neuzeichnungen verschieben nicht mehr zur aktiven Lösung; nur ausdrückliche Lösungswahl darf dies. Echte Mausrad-Zooms geprüft.
- 95-/99-%-Darstellung standardmäßig aus und bei den optionalen Diagnosen; keine erfundene Konfidenzaussage aus kleinen RMS-Werten.
- Optische Formeln, globale Optimierung, 18 Materialien, elf Modelle und gemeinsamer Windows-Starter aus 1.3.2 bleiben erhalten. Keine neuen Laufzeitabhängigkeiten.

## DAT-Import und gemeinsamer Windows-Start in 1.3.2

- **NumPy-Wahrheitswert nach Import korrigiert:** Stark verteilte Δ-Werte konnten in der Wiederholungsanalyse einen `numpy.bool_` erzeugen, den FastAPI nicht in JSON übertragen konnte. Jetzt ausdrücklich nativer `bool`; Wiederholungsregeln und Unsicherheitsrechnung bleiben gleich. Der Import selbst war bereits erfolgreich. Neue synthetische API-Regressionen prüfen breite Verteilung und gültige Wiederholungen über den 0°-/360°-Übergang.
- **Ein gemeinsamer Windows-Starter:** `Start_WinPython.bat` entfernt. `Start_Windows.bat` bevorzugt funktionierendes Python aus PATH, prüft Version/64 Bit und verwendet sonst `py -3`. Lokale `.venv`, keine Paketinstallation ins portable Python; vorhandene Umgebung validiert und Startargumente weitergereicht. CRLF-Zeilenenden; ein tatsächlicher Windows-Lauf wurde hier nicht durchgeführt.
- **Prüfung:** 26 gezielte Rechen-/API-/Starttests, private DAT mit 16 434 Einträgen und vier echte Browserabläufe. Rohdatei, private Ergebnisse und Screenshots bleiben außerhalb des Repositorys.
- **Unverändert:** Optische Formeln, globale Suche, Material-/Modellwerte, Laufzeitabhängigkeiten und Oberflächenverhalten aus 1.3.1.

## Berechnung und Start in 1.3.1

- **Bis zur fertigen Darstellung ausgegraut:** Eingaben und Ergebnisansichten sind während der Suche und beim anschließenden Zeichnen gesperrt. Ein separates Fortschrittsfeld bleibt sichtbar; die laufende Suche ist dort abbrechbar. Erst nach fertig gezeichneten Kurven, Beschriftungen und gegebenenfalls Talprofil werden die Ansichten wieder farbig. Abbruch und Fehler heben die Sperre ebenfalls auf.
- **Browser erst nach Serverbereitschaft:** Der bisherige feste Timer vor dem Serverstart entfällt. Der Browser wartet auf die geöffneten Server-Sockets und eine weitere Sekunde. Abbruch oder fehlgeschlagener Start verhindern einen nachträglichen Browseraufruf; `--no-browser` bleibt verfügbar.
- **RMS-Achse neuer Einparameterfits logarithmisch:** Eine zuvor lineare Parameter-Y-Achse im Zweiparameterfit wird nicht auf den nachfolgenden Fehlerkurvenplot übertragen. Auch ein vorher manuell linear gestellter RMS-Plot startet beim nächsten Fit wieder logarithmisch. Manuelles Umschalten danach bleibt möglich; zwei freie Parameter übernehmen weiterhin ihre jeweiligen Suchrasterskalen.
- **Unverändert:** Optische Rechenmodule, globale Suche, Material-/Modellwerte, Laufzeitabhängigkeiten und Windows-Batchdateien. Die neue Anordnung aus 1.3.0 bleibt erhalten.

## Breiter Arbeitsplatz und verlässliche Ansichten in 1.3.0

- **Eingaben oben, Ergebnisse über volle Breite:** Modell, Suche und Messdaten oben, insgesamt einklappbar; editierbarer Stack vor der Vorschau. Ab 1 240 px Lösungsliste, Fehlerlandschaft und Modellvergleich in einer Zeile, darunter angepasster Umbruch. Keine dauerhafte linke Eingabespalte mehr.
- **Zoom erhalten:** Auswahl über Liste, Punkt oder Nummer erhält die Ansicht. Nur außerhalb liegende gewählte Minima verschieben das Fenster bei gleicher Zoomstufe. Vergleichsansicht, Talprofil und 3D-Kamera behalten ebenfalls ihre Ansicht im selben Fit.
- **Minima lesbar beschriften:** Abgesetzte helle Nummern vorzugsweise unter dem Punkt, platzabhängig versetzt und anklickbar. Klicks auf Minima werden auch dann erkannt, wenn Plotly die darüberliegende Kurve bevorzugt trifft.
- **Achsen aktualisieren:** Sichtbare Bereiche bestimmen Tickpositionen und Zahlenauflösung; native Log-, lineare und Null-Hybridachsen sowie Δ/Ψ berücksichtigt. Kleine positive Werte bleiben erkennbar. RMS-Hintergrund und Autoscale behalten ihr bisheriges Verhalten.
- **Messlisten:** 100 Einträge je Seite, frei wählbare positive Seitenlänge, Dateianfang/Dateiende zuerst, „Ohne Gruppen“ voreingestellt. Navigation und „Letzte Messung“ funktionieren in beiden Richtungen. Originaldaten und Auswahl bleiben erhalten; Sitzungen speichern die Ansichtsoptionen.
- **Hinweise zum richtigen Fit:** Zeitpunkt, Modell und Eingabestand sichtbar. Änderungen kennzeichnen alte Ergebnisse und deren Hinweise ausdrücklich. Fit-Zähler und Unsicherheitstabellen verwenden den alten Fit-Snapshot, die Messliste zeigt die aktuelle Auswahl. Rückgängig kann den passenden Stand wiederherstellen.
- **SiO2 zusammengefasst:** Ein gemeinsamer Materialeintrag statt drei identischer n/k-Datensätze; eine allgemeine Si/SiO2-Vorlage statt Wet-/Dry-Duplikaten. Native Oxidmodelle mit 1,5 nm bleiben. Reale Prozessabhängigkeit wird erläutert, keine universellen Wet-/Dry-Korrekturen behauptet. Neu: 18 Materialien, elf Schichtvorlagen.
- **Unverändert:** Optische Formeln, Suchalgorithmen, RMS-Farben und WinPython-Starter; keine neuen Laufzeitabhängigkeiten.

## Dateiverhalten für Modelle und Materialien in 1.2.9

- **Dateiname und Speicherstatus sichtbar:** Gespeichert/grün, geändert/gelb oder noch nicht gespeichert/blau. Status bereits beim Tippen; tatsächlicher Inhaltsvergleich mit dem letzten Lade-/Speicherpunkt. Suchparameterrollen und reine Sucheinstellungen zählen nicht als Änderung der Modelldatei.
- **Speichern und Speichern unter …:** Bestehende Datei nach Rückfrage überschreiben oder einen Dateinamen im aktuellen Bibliotheksordner wählen. Kollisionen gesondert bestätigen, ungültige Windows-Dateinamen abweisen. Export ist ein separater Download und setzt den Status nicht fälschlich zurück.
- **Ungespeicherte Änderungen schützen:** Bei Dokumentwechsel, Neu, Import, Referenz und Sitzung speichern/verwerfen/abbrechen. Abgebrochene oder fehlgeschlagene Speicherung erhält den Entwurf. Warnung beim Neuladen/Verlassen, solange Änderungen bestehen.
- **Rückgängig am Speicherpunkt:** Dateizuordnung bleibt bestehen, Rücknahme auf gespeicherten Inhalt wird sauber erkannt. Öffnen neuer Dokumente setzt die Historie zurück. Doppelte Ereignisse ohne Inhaltsänderung erzeugen keine leeren Historieneinträge. Fit-/Probelösungsübernahme ist eine rückgängig machbare Änderung der aktuellen Datei.
- **Materialien gleichartig:** Speichern, Kopie, Status und Wechselrückfragen; Schließen behält den Entwurf. Übernahme in eine Schicht speichert die Materialdatei nicht automatisch.
- **Bedienung:** Strg+S und Strg+Umschalt+S; Dateidialoge auch in schmaler Ansicht. Die 20 Materialien und zwölf Schichtvorlagen aus 1.2.8 sind enthalten; WinPython-Starter und Rechenverfahren bleiben unverändert.

## Materialbibliothek und Schichtvorlagen in 1.2.8

- **20 Materialien bei 632,8 nm:** Si, drei SiO2-Prozessvarianten, Quarzglas, ALD-Al2O3, HfO2, ALD-TiO2, Si3N4, ITO, PMMA, Polystyrol, PDMS, N-BK7, BOROFLOAT 33, Au, Ag, Al, Wasser und Luft. Herkunft und Annahmen in jeder Materialdatei, vollständige Tabelle in [MATERIALIEN.md](MATERIALIEN.md).
- **12 Schichtvorlagen:** Si/SiO2, Si/natives Oxid/ALD-Al2O3, Polymerfilme auf Si und Glas sowie Nitrid-, HfO2- und ITO-Aufbauten. Vorgegebene typische Dicken; physikalische Reihenfolge bleibt korrekt.
- **Namen ohne „Beispiel“:** Gilt für die mitgelieferten Materialien, Modelle und das Standardmodell. Bestehende eigene Dateien bleiben erhalten.
- **Prozessabhängige Startwerte kenntlich:** Natives, nasses und trockenes Oxid getrennt, ohne erfundene feste Brechungsindexunterschiede. ALD-Al2O3 wird von Saphir unterschieden. Gläser sind konkret benannt; Rückseitenreflexion und geringer Polymer/Glas-Kontrast werden erläutert.
- **Rechenkern und Bedienung unverändert:** Keine neue Dispersions- oder Rückseitenrechnung; keine neuen Abhängigkeiten. WinPython-Starter unverändert, neu hinzugefügte Filme weiterhin bei 0 nm.

## Kompakte Auswertung und Probelösungen in 1.2.7

- **Neue Schichten bei 0 nm:** Hinzufügen verändert das optische Modell zunächst nicht durch eine endliche neue Dicke.
- **Nummern von unten nach oben:** Substrat [0], darüber [1], [2] usw.; höchste Filmnummer oben. Gilt durchgängig für Diagramm, Editor, Auswahl, Achsen, Gleichungen, Tabellen und Exporte. Optische Reihenfolge und gespeicherte Pfade bleiben erhalten.
- **Eigene Probelösungen:** Ein oder zwei Werte direkt eingeben, berechnen, auswählen und im Modellvergleich betrachten. Separate T-Markierungen/Zeilen, keine Optimierung und keine erfundenen Fitunsicherheiten. Zulässige Werte außerhalb der Suchgrenzen einschließlich d = 0 möglich; physikalisch ungültige Werte werden verständlich abgewiesen. CSV und JSON bewahren Probelösungen getrennt von Fitfamilien.
- **Messdaten und Lösungen über den Plots:** Bei breiter Ansicht nebeneinander. Datennamen sind Teil der weißen Kennzahlenleiste; weitere Bezeichnungen werden dort aufgeklappt.
- **Hinweise gruppiert und farblich:** Informationen blau, Erfolg grün, Warnungen gelb, kritische Hinweise rot. Weniger wichtige Hinweise/Analysen eingeklappt; kritische Suchgrenzenhinweise bleiben sichtbar.
- **Verweilen statt Scroll-Schalter:** Nach etwa 0,5 s Ruhe über Liste/Diagramm lokales Scrollen beziehungsweise Zoom. Fortlaufendes Seitenscrollen bleibt global. Dezente Umrandung und weiterhin Alt+Mausrad als direkte Bedienung.
- **Feldpfeile an den Eingaben:** n/k normalerweise ±0,001, d ±0,1 nm; für kleine Werte angepasst. Keine spezielle Tastaturpfeil-Bedienung nötig. Normale Werte mit drei beziehungsweise einer Nachkommastelle; kleine Werte genauer. Volle Rechenpräzision bleibt erhalten.

## Lösungsregionen und Bedienung in 1.2.6

- **Lösungsregionen hervorheben:** Eigene Warn-/Informationskarte, 95-/99-%-Messverträglichkeit, abschaltbare Umrandung/Füllung und Parameter-Spannweiten zur gewählten Familie/Wiederholung. Feste RMS-Farben bleiben erhalten. Voraussetzungen, Messstreuung allein und mögliche Beschneidung werden erklärt; keine erfundene Region ohne geeignete aktive Kovarianzen.
- **Sehr schmale Talbänder:** Bereichsgrenzen entlang nachgerechneter Profilquerschnitte, damit eine grobe Vernetzung keine falschen Inseln erzeugt. Bei mehreren Winkeln konservativer simultaner Mittelwertvergleich. Zusätzliche Äste und nicht aufgelöste Details können weiterhin fehlen.
- **Talpunkte in der 3D-Fläche:** Adaptives Dreiecksnetz mit tatsächlich berechneten Minima, Talpunkten, Querstützstellen und gezielten Nachrechnungen. Nahezu zusammenfallende Stützpunkte werden bei der Vernetzung erhalten. Die Punkte hängen nicht mehr unter einer zu grob interpolierten Rechteckfläche.
- **Schichten eindeutig benennen:** d[1], d[2], n[1], n[2] usw. in Gleichungen, Hovers und Ergebnisköpfen; größere Nummern links neben den farbigen Schichtkästchen und Eingabekarten.
- **Punktinfos runden:** Eine Nachkommastelle für Dicken in nm, drei für n/k/Winkel. Kleine positive Werte bleiben als „< 0,001“ von null unterscheidbar; Rechenwerte und Exporte behalten volle Präzision.
- **Suchraster und Anzeige:** Rasterwahl linear/log stellt die Parameterachsen automatisch passend ein; nach dem Fit bleiben manuelle Achsenwechsel möglich.
- **Messbezeichnungen prominent:** Probennamen/Kommentare, Quellen und Anzahlen für die aktuelle Auswahl und den gezeigten Fit. Ergebnisbezeichnungen bleiben nach Auswahländerungen erhalten und werden im Bericht gespeichert.
- **Mausrad für die Seite:** Standardmäßig Seitenscrollen über Listen/Plots, breitere Scrollleisten; Alt+Mausrad für Listen und ausdrücklicher Seitenscroll-/Lokalschalter. Diagrammziehen und -drehen bleiben verfügbar.
- **Exporte:** Neues Lösungsbereiche-CSV und adaptive Stützpunkte im Fehlerlandschaft-CSV, einschließlich ergänzter Messbezeichnungen im JSON-Bericht.

## Gekoppelte Zweiparameterfits in 1.2.5

- **Falsche innere Minima korrigiert:** Periodische Kopien nicht globaler Randminima können bei freiem n keine neuen inneren Minima begründen. Randfilter jetzt vor der Periodenbildung; Stationarität und lokale Abstiegsmöglichkeiten werden auch nach Verschiebungen geprüft. Skalierte lokale Optimierung mit zentralen Differenzen, Nachoptimierung unbestätigter Punkte.
- **Gesättigte Fits erklären:** Ein Winkel und zwei Parameter liefern keine verbleibenden Freiheitsgrade zur Modellprüfung. Kennzeichnung numerischer Treffer der Mittelwerte, getrennte Angabe ihrer Abweichung und des verbleibenden Einzelwert-Streuungsanteils. Das in diesem Fall irreführende χ²red = 1 entfällt aus der Listenanzeige.
- **Rang und Kopplung:** Stark korrelierte, aber lokal getrennt bestimmbare Parameter werden von numerisch schwachen/rangdefekten Fällen unterschieden. Sehr hohe Korrelationen werden nicht zu scheinbar exakt ±1 gerundet.
- **Numerisches Talprofil:** Bedingte Nachoptimierung bei einem Winkel und starker Kopplung, eigene Mittelwert-RMS-Kurve und abschaltbare Talpunkte in Kontur/3D. Diese Punkte werden nicht als zusätzliche Minima nummeriert oder in die Lösungszahl eingerechnet.
- **Zusammenhang der Parameter:** Lokale lineare Kompensationsrichtung; für passende transparente d/n-Filme zusätzlich die optische Phasennäherung. Beide folgen der gewählten Familie/Wiederholung und werden klar als Näherungen ausgewiesen.
- **Mittelwertvergleich bei kleiner Stichprobe:** Gemeinsame 95-%-Verträglichkeit der beiden Winkelmittelwerte mit endlicher Hotelling-T²-Grenze statt ungeeigneter Großstichproben-Grenze; Voraussetzungen und Grenzen erklärt. Ohne geeignete aktive Wiederholkovarianz keine statistische Bereichsangabe.
- **Exporte:** Talprofil-CSV sowie zusätzliche Bestimmbarkeits-/Mittelwertdiagnostik im Lösungs-CSV und vollständigen JSON-Bericht. Numerisch gleichwertige Familien werden deterministisch nach dem ersten in den Bereich fallenden Wertepaar geordnet.

## Bedienung und Autoscale in 1.2.4

- **Autoscale korrigiert:** Der farbige 1D-Hintergrund liegt ausschließlich in Ansichtskoordinaten. Er folgt Zoom, Verschieben und automatischer Skalierung, ohne selbst die Achsengrenzen zu beeinflussen.
- **Kein Cyan-Sprung:** Bei und unter 0,001° bleibt dieselbe kräftige Grünfarbe erhalten. Alle anderen Farbanker bleiben wie in 1.2.3.
- **Direkte Navigation:** Anfang/Ende der angezeigten Messliste, Seiteneingabe, Sprung zu einer Messungsnummer sowie „Letzte Messung“ in Dateireihenfolge. Ziele werden hervorgehoben, Gruppen bei Bedarf aufgeklappt; Filter und Auswahl bleiben erhalten.
- **Einheitliche Schichtnamen:** `[1] SiO2`, `[2] Al2O3` usw. in Aufbau, Eingaben, Parameterauswahl, Achsen, Tabellen und Exporten. Die Nummer ist eine Anzeige der Position und kein Teil des gespeicherten Namens.
- **Ergebniskopf:** Jeder Parameter nennt sowohl Größe/Einheit als auch Film, beispielsweise `d (nm) · [2] Al2O3`.

## Neue RMS-Farbskala in 1.2.3

- Oberes Skalenende ist das theoretische Maximum √[(180² + 90²)/2] ≈ **142,3°**, dort **Pink**. Der Bereich oberhalb von 100° wird weiter abgestuft; der violette Abschnitt entfällt.
- **0,1° ist klares Grün**. Bis **0,001°** nimmt die Sättigung kontinuierlich zu; darunter bleibt die Farbe **Cyan**.
- Gelb bei 1° und Rot bei 10° bleiben erhalten. Die Übergänge sind logarithmisch in den RMS-Werten abgestuft.
- Gleiche Farben in Ergebnisliste, Markern, Kontur, 3D und im gedeckten 1D-Hintergrund. Die Legende wird aus derselben Farbdefinition erzeugt.
- Die Cache-Korrektur aus 1.2.2 verhindert auch bei diesem Update die Wiederverwendung der älteren Palette.

## Korrektur in 1.2.2

- Versions- und inhaltsabhängige Adressen für JavaScript/CSS; keine Wiederverwendung alter Dateien beim Update.
- Cache-Control: no-store für die lokalen Antworten; Browserstart mit Versionsangabe in der URL.
- Oberfläche und Rechenkern prüfen ihre Versionsnummern gegeneinander und melden Abweichungen.
- Konsole nennt Programmversion und Ordner. Ein belegter Port wird ausdrücklich als fehlgeschlagener Start erklärt.
- Vorheriges Fehlerbild mit bewusst gefülltem Cache nachgestellt: Seite zeigt 1.2.1, aber graue Ergebnisse und keine fix/X/Y-Felder. Danach im selben Browserkontext auf 1.2.2 gewechselt, ohne den Cache zu löschen: Farben und Auswahlfelder vorhanden.

## Ergänzungen in 1.2.1

- Ausschließlich Winkel-RMS in Tabelle, Kontur, 3D, Hoverangaben und Exporten; kleinere Werte sind besser. Die zusätzliche transformierte Kennzahl wurde vollständig entfernt.
- Neue feste RMS-Farbstufen: cyan unter 0,01°; Grün/Türkis bei 0,01°; helles gelbliches Grün bei 0,1°; Gelb bei 1°; Rot bei 10°; Pink bei 100°; Violett darüber. Zwischenwerte werden über Dekaden interpoliert.
- 1D-Hintergrund entsprechend dem RMS eingefärbt, mit geringer Deckkraft und dunkler Kurve; funktioniert bei logarithmischer und linearer y-Achse.
- Schichtpositionen in Klammern: z. B. **Schichtdicke „Film“ (Schicht 1) (nm)**.
- Kompakte Auswahl **fix / X / Y** direkt unter den Modellfeldern. Farbe und Kennzeichnung zeigen den Status; die Auswahl bleibt mit den Suchparametern synchron. Achsentausch bewahrt die Suchgrenzen, Verschieben bewahrt die Zuordnung zur Schicht und Rückgängig stellt die Auswahl wieder her.
- Sitzungen dürfen auch einen noch nicht zur Suche konfigurierten Zustand ohne ausgewählten Parameter speichern. Ein Fit benötigt weiterhin mindestens einen Parameter.

## Bedienoberfläche

| Wunsch | Umsetzung |
|---|---|
| Logarithmische Achsen an-/abwählen | Separate Häkchen für x/y der Fehlerlandschaft und x des Modellvergleichs; Anzeige unabhängig vom Suchraster. |
| Passende Pfeiltastenschritte | n typischerweise 0,001, d 0,1 nm; Anpassung an Größenordnung und sehr kleines k. |
| Vier signifikante Stellen | Eingaben und Parameteranzeigen gerundet; Berechnung und unveränderte Modellwerte behalten volle Präzision. |
| Perioden zusammenfassen | Ein hervorgehobener Eintrag pro analytisch nachgewiesener Periodenfamilie, mit Periode und sortierter anklickbarer Aliasliste. |
| Fitgüte farblich zeigen | Feste Skala von grün über gelb zu rot; Tabelle dezent hinterlegt. |
| Fitgüte | Seit 1.2.1 ausschließlich Winkel-RMS in Grad: kleiner ist besser; feste Farbstufen ohne datensatzabhängige Normierung. |
| Randminima ausblenden | Nur globales Randminimum bleibt; Hinweis zum Erweitern künstlicher Suchgrenzen. k = 0 wird physikalisch gesondert erklärt. |
| Speicherbare Materialien | Eigene Bibliothek mit JSON-Dateien, Ordnerwahl, Import/Export und Anwendung auf ein Medium; Dicke bleibt erhalten. |
| Gleiche Kontur-/Listenfarben | Einheitliche feste RMS-Skala in Tabelle, Kontur und 3D. |
| Farben und Nummern der Minima | Gesättigte Marker mit heller Umrandung und Familiennummer aus der Liste; Auswahl aktualisiert den Modellvergleich. |
| Messdaten gruppieren | Automatisch bei wiederholten Winkeln, außerdem nach Winkel, Quelle oder ohne Gruppen; Gruppen auswählen/einklappen. |
| Rückgängig | Modell und numerische Sucheinstellungen, einschließlich gelöschter/verschobener Schichten und Materialanwendung; Wiederherstellen ebenfalls möglich. |
| Kompakte Schichtaktionen | ↑, ↓ und × rechts neben den Feldern; gleiche Spalten und Abstände auch für Einfallsmedium/Substrat. |
| Mehrschichten sichtbarer darstellen | Gerahmte, farblich abgestufte Schichtkarten und konsistentes Schichtdiagramm. |
| Tabellenköpfe zentrieren | Überschriften mittig über denselben Eingabespalten. |
| Schichtdiagramm beschriften | Rolle, Name, n, k und Dicke für jedes Medium; halbunendliche Medien mit d = ∞. |
| Seltene Einstellungen ausklappen | Wellenlänge/Δ-Konvention, Fitdetails und optionale Kalibrierangaben separat ausklappbar. |
| Beschreibende Achsentitel | Größenname und nummerierter Schichtname, z. B. Schichtdicke [1] Film (nm). |
| Lesbarkeit verbessern | Größere Eingaben, Überschriften und Tabellenschriften; responsive Darstellung bis 390 px geprüft. |
| Einheiten in Klammern | d (nm), Winkel-RMS (°) usw. |
| Zahlenformat vereinheitlichen | Dezimalkomma und Leerzeichen als Tausendertrennung in der Oberfläche; Dezimalkomma in CSV. Standardkonformes JSON behält den Punkt. |
| Absolute Fehlerquadratsumme entfernen | Aus Ergebnistabelle und Lösungs-CSV entfernt; RMS und gegebenenfalls χ²red bleiben. Q nur noch im vollständigen Diagnosebericht. |

Die 1D-Fehlerlandschaft zeigt den Winkel-RMS statt Q; die logarithmische Skalierung bleibt einstellbar. Die 2D-Kontur verwendet logarithmisch abgestufte RMS-Farben; in 3D bilden beste Fits die Täler. Δ bleibt rot, Ψ blau.

## Zuvor besprochene Punkte

- n standardmäßig **linear von 1 bis 4**, d **logarithmisch von 0,1 bis 1 000 nm**.
- k standardmäßig **0 bis 10**: exakt null plus positive logarithmische Stützstellen ab 10⁻⁸; der kleinste positive Rasterwert ist editierbar und keine Nachweisgrenze. Die Anzeige mit null verwendet eine erklärte log1p-Transformation.
- Gemeinsamer Fit wiederholter Messwerte als Voreinstellung; keine Mittelung verschiedener gefitteter Parameter oder periodischer Aliase.
- Messunsicherheiten automatisch aus geeigneten Δ/Ψ-Wiederholpaaren, einschließlich Kovarianz, Streuung und Unsicherheit der Mittelwerte. Keine festen σΔ-/σΨ-Eingabefelder.
- Fehlende, identische, singuläre oder auffällig korrelierte Wiederholungen ergeben keine angebliche Nullunsicherheit. Ohne vollständige geeignete Kovarianzen erfolgt ein erklärter ungewichteter Fit.
- Bei vollständiger Kovarianzgewichtung sind Mittelwertfit und gemeinsamer Rohwertfit statistisch gleich gewichtet; die Streuung bleibt für χ² erhalten.
- Statistische Parameterunsicherheit wird durch den Fit fortgepflanzt. Optionale Kalibrierbeiträge werden getrennt ausgewiesen und bei Unabhängigkeit quadratisch kombiniert; kein doppelt gezählter zusätzlicher „Fitfehler“.
- Lokaler paarweiser Bootstrap mit festen geschätzten Gewichten für die beste Familie; an Grenzen beschnittene Intervalle werden unterdrückt. Ein- und Zweiparameterkorrelationen werden lokal geprüft.
- Expliziter Nullvergleich für k; mit geeigneten Unsicherheiten näherungsweiser Profilvergleich und gegebenenfalls einseitige Obergrenze. Kein willkürlicher Schwellenwert, unterhalb dessen k immer als null gelten würde.
- Elli-kompatible Δ-Ausgabe bleibt voreingestellt; ausdrücklich gespeicherte Alternativen in Modellen und Sitzungen bleiben erhalten. Wellenlänge weiterhin editierbar, Standard 632,8 nm.
- Der WinPython-Starter für `C:\Programme_portable\WinPython\WPy64-31290` bleibt enthalten und verwendet eine private Umgebung ohne System-PATH-Änderung.

## Zusätzliche numerische Korrekturen

Ganzzahlig gespeicherte Ausgangsdicken können bei Parameteränderungen keine Nachkommastellen mehr abschneiden. Gruppierte Winkelstatistiken verwenden lokale Zentrierung, damit sehr kleine Messstreuungen nicht durch Subtraktion großer Quadratsummen verloren gehen. Ältere Sitzungsdateien werden beim Laden um validierte Standardfelder ergänzt.

Details zu Annahmen, Einschränkungen, Bedienung und Formeln stehen in der [README](README.md), tatsächliche Prüfungen im [Prüfprotokoll](PRUEFPROTOKOLL.md).
