# Prüfprotokoll – ElliFit 1.2.1

Stand: 12. November 2026. Numerik/API und lokale Browseroberfläche unter Linux geprüft. Keine Durchführung auf einem echten Windows-System.

## Automatisierte Rechen- und API-Tests

**42 Tests bestanden**, einschließlich des privaten Importtests mit den ursprünglichen Dateien:

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

JavaScript-Syntaxprüfung mit `node --check ellifit/static/app.js` bestanden. Zwei Warnungen stammen aus AnyIOs pytest-Anbindung und Starlettes Testclient bezüglich künftiger Schnittstellen; kein Anwendungstest ist fehlgeschlagen.

## Browserprüfung

Automatisierte tatsächliche Bedienung mit Playwright und Chromium; 18 protokollierte Prüfpunkte in [Pruefdaten_Browser.json](Pruefdaten_Browser.json):

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

Die JSON-Prüfdaten enthalten ausschließlich synthetische Ergebnisse und Importanzahlen; keine privaten Messwertlisten. Browserprüfung bezeichnet die tatsächliche Ausführung und Bedienung der lokal gestarteten Anwendung im Browser, nicht einen Upload der Messdaten an einen Webdienst.

## Umgebung und Aussagegrenzen

Geprüft mit Python 3.12.14, NumPy 2.3.5, SciPy 1.17.0, FastAPI 0.141.1, Pydantic 2.13.4, Uvicorn 0.52.1, Plotly 7.1.0, pytest 9.2.0, tmm 0.2.0 und Playwright 1.62.0. Die Anforderungen erlauben kompatible Versionsbereiche.

Ein tatsächlicher Windows-/WinPython-Lauf wurde nicht durchgeführt. Die Batchdateien und der voreingestellte WinPython-Pfad bleiben im Paket; die Batchdateien verwenden Windows-Zeilenenden. Windows 7 ist nicht unterstützt. Das Paket enthält Quellcode, keine kompilierte EXE.

Numerische Referenzen sind keine experimentelle Genauigkeitsangabe. Die reale Probe kann ohne verifiziertes Schichtsystem und Materialwerte nicht physikalisch validiert werden. Lokale Kovarianzen, bedingte Bootstrapintervalle und asymptotische k-Profile ersetzen weder die Kontrolle systematischer Fehler noch die Prüfung globaler Mehrdeutigkeit. Eine endliche globale Suche kann Minima übersehen; Details stehen in der [README](README.md).
