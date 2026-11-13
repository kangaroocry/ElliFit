# ElliFit 1.2 – umgesetzte Änderungen

Stand: 13. November 2026. Quellstand 1.2.6; ersetzt die Bedienoberfläche und erweitert die Auswertung von 1.1.1.

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
