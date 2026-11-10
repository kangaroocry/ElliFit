# Prüfprotokoll – ElliFit 1.1

Stand: 10. November 2026. Neu erzeugter und erneut geprüfter Quellstand.

## Numerik und API

**25 Tests bestanden** unter Linux mit Python 3.12; Ausführung mit `ELLIFIT_EXAMPLES_DIR` auf den lokalen Original-Messdateien. Ohne die nicht veröffentlichten Originaldateien wird der betreffende Test übersprungen.

Geprüft wurden analytische Substratinversion, Nullschichtdicke, der Grenzfall dicker Absorber, Mehrschichtamplituden gegen die unabhängige Bibliothek `tmm` in drei Fällen (transparent, absorbierend, evaneszent), Δ-Konvention und 0°/360°-Übergang, undefinierte Reflexion, vollständige Wiederholungsgewichtung, Kreismittelung, CSV/Dezimalkomma, Originaldateien, globale d- und d/n-Fits, Stokes-n-Fits, Randminima, eine und zwei unabhängige Dickenperioden, Absorption und flache Zielfunktionen, Substrat-n/k, Abbruch, Rückfrage bei Wiederholungen, Einwinkelplot mit Dicke als zweitem Parameter, Modellpersistenz, Import und Origin-Prüfung.

Zwei Hinweise aus den Testbibliotheken betreffen zukünftige Änderungen von pytest und Starlettes Testclient; keine Anwendungstests sind fehlgeschlagen.

## Browser

Automatisierte Bedienprüfung mit Playwright und echtem Chromium unter Linux:

| Prüfung | Ergebnis |
|---|---|
| Ein Parameter, mehrere Winkel | Referenzdicke 118 nm wiedergefunden |
| Ein Winkel | Vier vergleichbare Dickenlösungen, Periode 283,157894 nm |
| Auswahl eines anderen Minimums | Modellvergleich folgt der ausgewählten Lösung |
| Zwei Parameter, mehrere Winkel | d = 118 nm und n = 1,46 wiedergefunden |
| Kontur und 3D | Umschalten erfolgreich |
| Ergebnisexport | Drei CSV-Arten und JSON-Bericht tatsächlich heruntergeladen |
| Messdaten-CSV | Exportiert und mit gleicher Anzahl erneut importiert |
| Sitzung | Speichern und Öffnen samt Auswahl |
| Modellordner | Ordnerwechsel, Speicherung und erneutes Laden |
| Original-.phi | 10 Zeilen; mit Mittelung 9, mit Mehrfachgewichtung 10 effektive Messungen |
| Original-.dat | 16.377 Messungen; Auswahl und Seitennavigation |
| Abbruch | Größere globale Suche über Oberfläche abgebrochen |
| Schmale Darstellung | 390 px ohne horizontalen Seitenüberlauf |
| JavaScript-Laufzeitfehler | Keine |

Die 14 protokollierten Prüfpunkte stehen zusammengefasst in `Pruefdaten_Browser.json`. Dort sind nur synthetische Referenzergebnisse und Importanzahlen enthalten; keine ursprünglichen Messwertlisten.

## Grenzen

Ein tatsächlicher Windows-Lauf und eine Windows-7-Kompatibilität wurden nicht geprüft. Der Windows-Starter ist Quellcode, keine kompilierte EXE. Die ursprüngliche reale Probe kann ohne verifizierten Schichtaufbau und Materialwerte nicht physikalisch validiert ausgewertet werden. Numerische Referenzergebnisse sind keine experimentelle Genauigkeitsangabe.

Eine endliche globale Suche garantiert nicht jedes Minimum. Die README erläutert Rasterbegrenzung, Periodenprüfung, Fehlermaße und physikalische Modellgrenzen.
