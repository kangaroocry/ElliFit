# Prüfprotokoll – ElliFit 1.2.7

Stand: 13. November 2026. Numerik/API und lokale Browseroberfläche unter Linux geprüft. Keine Durchführung auf einem echten Windows-System.

## Aktuelle Prüfung von 1.2.7

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

Ein tatsächlicher Windows-/WinPython-Lauf wurde nicht durchgeführt. Die Batchdateien und der voreingestellte WinPython-Pfad bleiben im Paket; die Batchdateien verwenden Windows-Zeilenenden. Windows 7 ist nicht unterstützt. Das Paket enthält Quellcode, keine kompilierte EXE.

Numerische Referenzen sind keine experimentelle Genauigkeitsangabe. Die reale Probe kann ohne verifiziertes Schichtsystem und Materialwerte nicht physikalisch validiert werden. Lokale Kovarianzen, bedingte Bootstrapintervalle und asymptotische k-Profile ersetzen weder die Kontrolle systematischer Fehler noch die Prüfung globaler Mehrdeutigkeit. Eine endliche globale Suche kann Minima übersehen; Details stehen in der [README](README.md).
