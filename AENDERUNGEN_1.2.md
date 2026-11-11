# ElliFit 1.2 – umgesetzte Änderungen

Stand: 11. November 2026. Quellstand 1.2.0; ersetzt die Bedienoberfläche und erweitert die Auswertung von 1.1.1.

## Bedienoberfläche

| Wunsch | Umsetzung |
|---|---|
| Logarithmische Achsen an-/abwählen | Separate Häkchen für x/y der Fehlerlandschaft und x des Modellvergleichs; Anzeige unabhängig vom Suchraster. |
| Passende Pfeiltastenschritte | n typischerweise 0,001, d 0,1 nm; Anpassung an Größenordnung und sehr kleines k. |
| Vier signifikante Stellen | Eingaben und Parameteranzeigen gerundet; Berechnung und unveränderte Modellwerte behalten volle Präzision. |
| Perioden zusammenfassen | Ein hervorgehobener Eintrag pro analytisch nachgewiesener Periodenfamilie, mit Periode und sortierter anklickbarer Aliasliste. |
| Fitgüte farblich zeigen | Feste Skala von grün über gelb zu rot; Tabelle dezent hinterlegt. |
| Höherer Gütewert für bessere Fits | G = −log₁₀(RMS / 1°), ohne datensatzabhängige Normierung. Kein R² und kein Plausibilitätsbeweis. |
| Randminima ausblenden | Nur globales Randminimum bleibt; Hinweis zum Erweitern künstlicher Suchgrenzen. k = 0 wird physikalisch gesondert erklärt. |
| Speicherbare Materialien | Eigene Bibliothek mit JSON-Dateien, Ordnerwahl, Import/Export und Anwendung auf ein Medium; Dicke bleibt erhalten. |
| Gleiche Kontur-/Listenfarben | Einheitliche feste G-Skala in Tabelle, Kontur und 3D. |
| Farben und Nummern der Minima | Gesättigte Marker mit heller Umrandung und Familiennummer aus der Liste; Auswahl aktualisiert den Modellvergleich. |
| Messdaten gruppieren | Automatisch bei wiederholten Winkeln, außerdem nach Winkel, Quelle oder ohne Gruppen; Gruppen auswählen/einklappen. |
| Rückgängig | Modell und numerische Sucheinstellungen, einschließlich gelöschter/verschobener Schichten und Materialanwendung; Wiederherstellen ebenfalls möglich. |
| Kompakte Schichtaktionen | ↑, ↓ und × rechts neben den Feldern; gleiche Spalten und Abstände auch für Einfallsmedium/Substrat. |
| Mehrschichten sichtbarer darstellen | Gerahmte, farblich abgestufte Schichtkarten und konsistentes Schichtdiagramm. |
| Tabellenköpfe zentrieren | Überschriften mittig über denselben Eingabespalten. |
| Schichtdiagramm beschriften | Rolle, Name, n, k und Dicke für jedes Medium; halbunendliche Medien mit d = ∞. |
| Seltene Einstellungen ausklappen | Wellenlänge/Δ-Konvention, Fitdetails und optionale Kalibrierangaben separat ausklappbar. |
| Beschreibende Achsentitel | Größenname, individueller Schichtname und Position, z. B. Schichtdicke „Film“ 1 (nm). |
| Lesbarkeit verbessern | Größere Eingaben, Überschriften und Tabellenschriften; responsive Darstellung bis 390 px geprüft. |
| Einheiten in Klammern | d (nm), Winkel-RMS (°) usw. |
| Zahlenformat vereinheitlichen | Dezimalkomma und Leerzeichen als Tausendertrennung in der Oberfläche; Dezimalkomma in CSV. Standardkonformes JSON behält den Punkt. |
| Absolute Fehlerquadratsumme entfernen | Aus Ergebnistabelle und Lösungs-CSV entfernt; RMS, G und gegebenenfalls χ²red bleiben. Q nur noch im vollständigen Diagnosebericht. |

Die 1D-Fehlerlandschaft zeigt den Winkel-RMS statt Q; die logarithmische Skalierung bleibt einstellbar. Die 2D-Kontur verwendet G als logarithmisches Fehlermaß mit umgekehrter Richtung: höher ist besser. Δ bleibt rot, Ψ blau.

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
