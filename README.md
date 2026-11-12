# ElliFit 1.2.2

Lokales Programm zur monochromatischen Ellipsometrie: Schichtmodelle und Materialien speichern, Messungen auswählen und Schichtdicke, Brechungsindex oder Extinktionskoeffizient global fitten. Ein oder zwei Parameter können gleichzeitig frei sein. Die Browseroberfläche und der Python-Rechenkern laufen auf demselben Rechner.

**[ElliFit 1.2.2 als ZIP herunterladen](https://github.com/kangaroocry/ElliFit/archive/refs/heads/ellifit-1.2.zip)** · [Änderungen gegenüber 1.1](AENDERUNGEN_1.2.md) · [Prüfprotokoll](PRUEFPROTOKOLL.md)

## Start unter Windows und mit WinPython

Das ZIP **vollständig in einen beschreibbaren Ordner entpacken**, etwa unter Dokumente. Eine vorhandene ältere Version zunächst behalten; eigene Modell-, Material- und Sitzungsdateien können übernommen werden.

**Mit vorhandenem WinPython:** `Start_WinPython.bat` doppelklicken. Voreingestellt ist der vom Nutzer genannte Pfad `C:\Programme_portable\WinPython\WPy64-31290`. Der Starter findet `python.exe` direkt dort, in `python` oder in einem Unterordner `python-*`. Er erstellt die private Umgebung `.venv-winpython` im ElliFit-Ordner. WinPython und der System-PATH werden dabei nicht verändert; eine zusätzliche Python-Installation und Adminrechte sind dafür nicht erforderlich. Der ElliFit-Ordner muss beschreibbar sein und der Rechner die Ausführung erlauben.

Für andere Installationen den Pfad am Anfang der Batchdatei oder `ELLIFIT_WINPYTHON_ROOT` anpassen. WinPython muss auch bei späteren Starts vorhanden sein. Eine gegebenenfalls bestehende `.venv` wird von diesem Starter nicht verwendet.

**Mit normal installiertem Python 3.11 oder neuer, 64 Bit:** `Start_Windows.bat` doppelklicken. Der Starter verwendet den Python Launcher beziehungsweise `python` und erstellt `.venv` im Programmordner.

Beim ersten Start benötigen beide Starter Internet für die Python-Pakete. Danach öffnet sich der Browser mit `http://127.0.0.1:8765`. Das Konsolenfenster offen lassen; mit `Strg+C` beenden. Bei Fehlern die Ausgabe im Konsolenfenster beachten. Eine beschädigte private Umgebung kann umbenannt und vom Starter neu erstellt werden.

**Updates und Browser-Cache:** Ab 1.2.2 werden HTML und Oberflächendateien nicht dauerhaft im Browser zwischengespeichert. JavaScript und CSS erhalten zusätzlich Dateiadressen mit Version und Inhaltskennung; beim normalen Start öffnet sich eine URL mit Versionsangabe. So werden alte Oberflächendateien bei einem Update nicht mit dem neuen Rechenkern kombiniert. Eine zusätzliche Versionsprüfung meldet Abweichungen verständlich. Die Konsole nennt Version und Programmordner. Ist der Port belegt, wird ausdrücklich angezeigt, dass die neue Version nicht gestartet wurde.

In 1.2.0/1.2.1 konnten trotz neuer Versionsnummer in der Seite noch ältere JavaScript-Dateien aus dem Cache geladen werden. Das konnte graue Ergebniszeilen, fehlende 1D-Farben und fehlende fix/X/Y-Auswahlfelder verursachen. In diesem Fall half das Löschen der Browserdaten für die lokale Seite; ein damit wieder funktionierendes 1.2.1 kann weiterverwendet werden.

Nach der Erstinstallation läuft ElliFit offline. Plotly-JavaScript wird lokal ausgeliefert; es gibt keinen CDN-Zugriff. Messdaten werden nicht an GitHub oder andere Dienste gesendet. Die Anwendung besteht aus **Python und JavaScript mit Startdateien, nicht aus einer kompilierten EXE**.

**Windows 7 wird nicht unterstützt.** Das vorhandene WinPython 3.12 setzt eine neuere Windows-Version voraus. Die Version wurde unter Linux numerisch und im Chromium-Browser geprüft; ein tatsächlicher Windows-/WinPython-Lauf wurde hier nicht durchgeführt.

Bei belegtem Port beispielsweise:

```bat
Start_WinPython.bat --port 8766
```

Unter Linux/macOS `sh start.sh`; alternativ eine virtuelle Umgebung anlegen, `pip install -r requirements.txt` und `python launch.py` ausführen. `--no-browser` unterdrückt das automatische Öffnen des Browsers. `--models "C:\Pfad\Modelle"` und `--materials "C:\Pfad\Materialien"` ändern die Bibliotheksordner; diese lassen sich auch in der Oberfläche wechseln.

## Erste Auswertung

1. **Schichtmodell prüfen.** Einfallsmedium, Filme von oben nach unten und halbunendliches Substrat einstellen. Mitgelieferte Materialwerte sind Beispiele. Wellenlänge und Δ-Konvention befinden sich im ausklappbaren Bereich „Optische Einstellungen und Dateien“. Voreinstellung: **632,8 nm** und Elli-kompatibles Δ.
2. **Messdaten laden.** `.phi`, `.dat`, `.txt` oder einfache `.csv` enthalten drei numerische Spalten: Einfallswinkel, Δ, Ψ in Grad. Winkel werden gegen die Oberflächennormale gemessen. UTF-8/Windows-1252, Dezimalkomma/Dezimalpunkt und Kommentare hinter `>>` werden unterstützt. Alternativ Einzelwerte eingeben.
3. **Zeilen auswählen.** Das globale Häkchen wählt alle geladenen Zeilen unabhängig von Filter und Seite. „Gefilterte wählen“ ergänzt die aktuelle Ansicht. Gruppen können nach Winkel oder Quelle gebildet, ein-/ausgeklappt und gemeinsam ausgewählt werden. Bei wiederholten Winkeln gruppiert die Automatik sichtbar nach Winkel. Ein teilweise ausgewähltes Gruppenhäkchen zeigt einen Zwischenzustand. `Umschalt`-Klick wählt einen Bereich der gefilterten Zeilen.
4. **Einen oder zwei Parameter wählen.** Die kleinen Auswahlfelder unter d/n/k zeigen **fix**, **X** oder **Y**. Dort oder im Bereich „Globale Suche“ wählen; beide Ansichten bleiben synchron. X ist der erste, Y der zweite Fitparameter. Der einzige Parameter eines Einparameterfits ist X. Ohne ausgewählten Parameter wird noch kein Fit gestartet. Eine Auswahl folgt ihrer Schicht beim Verschieben; Löschen der Schicht entfernt auch ihre Auswahl.  Voreinstellungen: **d = 0,1–1 000 nm logarithmisch**, **n = 1–4 linear**, **k = 0–10 mit logarithmischen positiven Stützstellen plus exakt null**. Grenzen und Suchraster sind editierbar; bei n unter 1 oder k über 10 gegebenenfalls erweitern. Alle anderen Modellwerte bleiben fest.
5. **Global suchen.** Mehrere ausgewählte Winkel ergeben automatisch einen Mehrwinkelfit. Wiederholungen werden standardmäßig gemeinsam gefittet. Mittelung und eine Rückfrage lassen sich unter „Fitverfahren und Unsicherheiten“ wählen. Ein laufender Fit kann abgebrochen werden.
6. **Lösungsfamilien vergleichen.** Zeile, nummerierten Punkt im Fehlerplot oder eine Wiederholung innerhalb einer Periodenfamilie anklicken. Der Modellvergleich folgt der Auswahl. „Ins Modell übernehmen“ überträgt die Werte; anschließend das Modell speichern.

**Nur Messungen derselben unveränderten Probe gemeinsam fitten.** Gleiche Winkel belegen keine gleiche Probe. Die ursprüngliche `.dat`-Sammlung enthält unterschiedliche Probenkommentare und ist deshalb nicht automatisch eine gemeinsame Wiederholungsserie.

Die mitgelieferte **synthetische Referenz** hat d = 118 nm und n = 1,46. Das Modell startet bei d = 80 nm; die globale Suche sollte 118 nm wiederfinden. Die Referenz ist rauschfrei und liefert keine experimentelle Unsicherheitsangabe. Für die ursprüngliche reale `.phi`-Probe ist nur die Wellenlänge bestätigt; ohne verifizierten Schichtaufbau und feste Materialwerte wird kein physikalisch validiertes Probenergebnis behauptet. Private Originaldateien und Handbuch sind nicht im öffentlichen Repository enthalten.

## Modelle, Materialien und Rückgängig

Modelle werden als UTF-8-JSON im Modellordner gespeichert und aus einer Liste geladen. Standardordner: `models`. Einzelne Dateien können geöffnet und heruntergeladen werden. Elli-`.cfg` wird nicht direkt importiert; ein solches Dateiformat liegt nicht vor.

Die separate **Materialbibliothek** speichert Name, n, k, optionale Wellenlänge, Notizen und optionale Standardunsicherheiten u(n)/u(k) im Ordner `materials`. Materialien lassen sich aus einem Medium übernehmen, bearbeiten, als JSON importieren/exportieren und auf Luft, Film oder Substrat anwenden. Die Schichtdicke bleibt erhalten. Bei abweichender Wellenlänge erscheint eine Rückfrage; eine Dispersionsumrechnung findet nicht statt. Die Beispieldateien sind entsprechend gekennzeichnet. Ein absorbierendes Einfallsmedium wird nicht zugelassen.

Der Rückgängig-Pfeil stellt Modellbearbeitung und numerische Sucheinstellungen wieder her, einschließlich gelöschter/verschobener Schichten und angewendeter Materialien. Wiederherstellen ist ebenfalls möglich. Gespeicherte Dateien und Messdatenlöschungen werden dadurch nicht zurückgenommen. Die Historie umfasst bis zu 80 Schritte und gilt für die aktuelle Sitzung. `Strg+Z` außerhalb eines Texteingabefeldes wirkt ebenfalls auf diese Historie.

Eingabefelder zeigen in der Regel **vier signifikante Stellen**, Ergebnisse werden intern mit voller Gleitkommapräzision berechnet. Unveränderte, gerundet angezeigte Felder runden das Modell nicht. Ein Tooltip zeigt mehr Stellen. Pfeiltasten ändern n typischerweise um 0,001 und d um 0,1 nm; bei großen Werten beziehungsweise sehr kleinem k passt sich der Schritt an. Die Oberfläche verwendet Dezimalkomma und Leerzeichen zur Tausendertrennung. JSON-Dateien verwenden das standardisierte Zahlenformat mit Punkt.

## Diagramme und feste RMS-Farbstufen

Anzeigeachsen und Suchraster sind **unabhängig**. Die Logarithmus-Häkchen ändern die Darstellung; sie lösen keinen neuen Fit aus. Die Fehlerachsen sind anfangs logarithmisch. Der Winkelvergleich startet mit linearer Winkelachse; auch dort ist eine logarithmische x-Achse wählbar.

Bei einem freien Parameter zeigt die Fehlerlandschaft den **Winkel-RMS** gegen den Parameter, mit zusätzlichen lokalen Stützstellen nahe den Minima. Das entspricht bis auf den konstanten Faktor √(2N) der Wurzel der Fehlerquadratsumme und ist leichter über unterschiedliche Punktzahlen zu vergleichen. Bei zwei Parametern erscheinen ein Konturplot oder eine drehbare 3D-Fläche. **Kleinere Werte sind besser; die besten Fits liegen in den Minima.**

```text
RMS = sqrt[Σ(wrap(Δtheo − Δexp)² + (Ψtheo − Ψexp)²) / (2N)]
```

| Winkel-RMS | Farbe |
|---|---|
| unter 0,01° | fest cyan |
| 0,01° | sattes Grün Richtung Türkis |
| 0,1° | helles, leicht gelbliches Grün |
| 1° | Gelb |
| 10° | Rot |
| 100° | Pink |
| über 100° | fest Violett |

Zwischen 0,01° und 100° wird die Farbe gleichmäßig über die Dekaden interpoliert. Die Farbskala ist bei jedem Datensatz gleich und gilt für Tabelle, Kontur, 3D und nummerierte Minimum-Punkte. Die Tabelle ist dezent hinterlegt; Punkte sind kräftiger mit heller Umrandung. Im **1D-Plot wird auch der Hintergrund nach dem jeweiligen y-Wert eingefärbt**, mit geringerer Deckkraft und einer dunklen Kurve. Das gilt sowohl für die logarithmische als auch für die lineare y-Achse.

Die Konturfarbe wird logarithmisch abgestuft, ihre Legende und die Hoverangaben zeigen den **RMS in Grad**. In 3D ist die Höhe der RMS auf einer logarithmischen z-Achse: kleine Werte ergeben Täler. Numerische Nullwerte werden in logarithmischen Höhen nur zur Darstellung bei 10⁻⁹° begrenzt; tatsächliche RMS-Werte bleiben im Bericht und in Exporten erhalten. Es gibt keine zusätzliche transformierte Fitgüte-Kennzahl und keine entsprechende CSV- oder JSON-Spalte.

**Der Winkel-RMS beschreibt die absolute Übereinstimmung in Winkeln, keine statistische Signifikanz und keine physikalische Plausibilität.** Er bleibt beim bloßen Vervielfachen derselben Messwerte gleich. Seine Bewertung hängt weiterhin von Probe, Messgeometrie und Gerätestreuung ab. Ein kleiner RMS bestätigt weder Eindeutigkeit noch das Schichtmodell. Ein R² ist wegen zyklischem Δ und möglicher Mehrdeutigkeit kein sinnvoller Standard.

Die Ergebnisliste wird nach der **gewählten Zielfunktion** sortiert. Bei Kovarianzgewichtung oder Stokes-Abstand muss diese Reihenfolge nicht der Reihenfolge des ungewichteten Winkel-RMS und damit der Farbe entsprechen. Die absolute Fehlerquadratsumme Q bleibt aus der Ergebnisliste entfernt; im vollständigen JSON-Bericht ist sie für Diagnosezwecke enthalten.

**k = 0 auf einer logarithmischen Anzeige:** Null hat keinen Logarithmus. Bei einer k-Achse einschließlich null verwendet ElliFit deshalb `log10(1 + k/k0)` mit dem eingestellten kleinsten positiven Rasterwert k0. Nahe null ist diese Achse linear, darüber näherungsweise logarithmisch. Die Beschriftung zeigt die tatsächlichen k-Werte einschließlich null. Das ist in der Bildunterschrift erklärt. Das Suchraster enthält null separat und positive logarithmische Stützstellen; lokale Verfeinerung darf auch zwischen null und k0 liegen. k0 ist keine willkürliche Nachweisgrenze und ersetzt nicht kleine Werte durch null.

Im **Mehrwinkelvergleich** stehen Theorie und Messungen gegen den Winkel. Im **Einwinkelvergleich** stehen sie gegen den freien Parameter; Messpunkte liegen am Wert der ausgewählten Lösung. Bei zwei freien Parametern wird eine Dicke als Kurvenparameter bevorzugt, der andere Parameter bleibt auf dem gewählten Lösungswert fixiert und wird benannt. **Δ ist immer rot links, Ψ immer blau rechts.** Δ-Linien werden am 0°/360°-Sprung unterbrochen. Sehr große Messlisten werden nur bei der Punktdarstellung ausgedünnt; die Rechnung berücksichtigt alle ausgewählten Zeilen.

## Periodische Lösungen und Bereichsgrenzen

Für eine transparente variable Filmdicke bei einem Winkel gilt bei propagierender Welle:

```text
T = λ / [2 Re(sqrt(N_Film² − n_Einfallsmedium² sin²φ))]
```

Analytisch nachgewiesene Wiederholungen werden als **eine hervorgehobene Lösungsfamilie** dargestellt: Periode, Anzahl und nach Dicke geordnete Wiederholungen. Die ersten Werte sind direkt anklickbar, weitere ausklappbar. Bei zwei transparenten variablen Dicken sind zwei Perioden möglich. Bei gleichzeitig freiem n gilt die Dickenperiode nur beim jeweiligen festen n-Wert. Ähnliche Güte allein führt nicht zur Zusammenfassung. Bei Absorption, evaneszenter Ausbreitung oder mehreren unterschiedlichen Winkeln wird keine exakte allgemeine Dickenperiode behauptet.

Nicht globale Randminima werden aus der Ergebnisliste entfernt. Liegt das beste Minimum an einer künstlichen Suchgrenze, erscheint der Hinweis, den Bereich zu vergrößern. Die physikalische Grenze k = 0 wird ausdrücklich unterschieden. Eine praktisch flache Zielfunktion beziehungsweise eine rangdefiziente Sensitivität wird als fehlende Bestimmbarkeit gemeldet.

Eine Familie kann viele Aliase enthalten. Bis zu 200 werden einzeln dargestellt; die analytische Gesamtzahl bleibt angegeben. Lokale Unsicherheiten gehören immer zur jeweiligen Familie beziehungsweise ausgewählten Wiederholung. Über periodische Aliase werden weder Parameter noch Unsicherheiten gemittelt.

## Messunsicherheiten aus Wiederholungen

Es gibt **keine pauschalen Eingabefelder für σΔ oder σΨ**. Bei wiederholten Winkeln schätzt ElliFit die gemeinsame 2×2-Kovarianz aus den Δ/Ψ-Paaren. Δ wird dafür lokal um das Kreismittel entrollt, damit 359,99° und 0,01° benachbart bleiben. Angezeigt werden Streuung der Einzelwerte s, Unsicherheit des Mittelwerts ū = s/√m und Δ/Ψ-Korrelation.

Mindestens drei geeignete, unterschiedliche Wiederholungen mit nicht singulärer Kovarianz sind technisch erforderlich. Drei Werte sind noch keine belastbare statistische Charakterisierung; bei wenigen Wiederholungen erscheint ein Hinweis. Exakt kopierte Werte, fehlende Streuung, zu große zyklische Streuung, singuläre Kovarianz und Hinweise auf Drift werden nicht als verschwindende Unsicherheit interpretiert. Einfache Lag-1-Korrelationen der geladenen Reihenfolge dienen als **Hinweis**, nicht als Nachweis von Drift oder Unabhängigkeit. Eine tatsächliche Zeitreihenanalyse ersetzt das nicht.

Nur wenn **alle ausgewählten Winkel** geeignete Kovarianzen haben, wird der Winkel-Fit automatisch mit ihnen gewichtet:

```text
r = [wrap(Δtheo − Δexp), Ψtheo − Ψexp]
Q = Σ rᵀ Σ_Winkel⁻¹ r
χ²red = Q / (2N_Rohwerte − p), sofern genügend Freiheitsgrade vorliegen
```

Die Kreuzkorrelation und die Streuung innerhalb der Wiederholungen bleiben erhalten. Bei dieser vollständigen Gewichtung liefern **gemeinsamer Fit aller Einzelwerte und Fit der Mittelwerte mit korrekt fortgepflanzter Kovarianz dieselbe Lösung**. Rechenzeit wird durch exakte gruppierte Summenstatistiken gespart. Die lokalen Mittelwerte werden im Vergleichsplot gezeigt; Rohwerte bleiben im Bericht/Residuenexport verfügbar.

Fehlen passende Kovarianzen, wird der gesamte Fit ungewichtet durchgeführt und darauf hingewiesen. Dabei sind die Optionen verschieden: „Gemeinsamer Fit“ berücksichtigt alle Einzelwerte; ein Winkel mit mehr Wiederholungen erhält entsprechend mehr Gewicht. „Winkelmittelwerte“ gibt jedem Winkel ein Wertepaar und gleiches Gewicht. Die Rohdaten und ihre Streuung bleiben für die Statistik erhalten, aber ohne geeignete Kovarianzen wird keine statistische Gleichwertigkeit dieser beiden Schätzverfahren behauptet. Winkel innerhalb der einstellbaren Toleranz (Vorgabe 0,001°) werden am gemeinsamen mittleren Einfallswinkel modelliert.

Alternativ kann der **Stokes-Abstand** minimiert werden:

```text
s(Δ, Ψ) = [cos(2Ψ), sin(2Ψ) cos(Δ), sin(2Ψ) sin(Δ)]
Q = Σ ||s_theo − s_exp||²
```

Das vermeidet künstliche Δ-Empfindlichkeit nahe Ψ = 0°/90°. Die automatische Winkel-Kovarianzgewichtung ist dabei ausgeschaltet. Bei vollständigen Wiederholungen kann deren Kovarianz trotzdem zum Parameterunsicherheitsbeitrag fortgepflanzt werden. Der Winkel-RMS bleibt als zusätzliche absolute Winkeldiagnose sichtbar.

## Parameterunsicherheiten, Kalibrierung und schwaches k

Der Fit überträgt die Messstreuung auf die Parameter. Die lokale Jacobi-Matrix und die tatsächlichen Fitgewichte ergeben eine Kovarianzfortpflanzung; bei ungewichteten Schätzern wird eine Sandwich-Kovarianz verwendet. Bei Rangdefekt oder sehr starker Parameterkorrelation werden keine scheinbar präzisen lokalen Fehlerbalken ausgegeben. Ein Δ/Ψ-Paar liefert nur zwei unabhängige Größen: Ein exakter Zweiparameterfit bei einem Winkel bestätigt keine Eindeutigkeit.

Angezeigt werden **u statistisch**, **u Kalibrierung** und, soweit beide Beiträge bestimmbar sind, **u kombiniert**. Es gibt **keinen zusätzlichen pauschalen „Fitfehler“**, der die bereits fortgepflanzte Messunsicherheit nochmals addiert. Große Restfehler führen zu einem Hinweis auf Modell, Drift oder Kalibrierung; die Unsicherheiten werden nicht automatisch passend aufgebläht.

Optionale Kalibrierangaben stehen ausklappbar weiter unten: gemeinsame Standardunsicherheit des Winkels und der Wellenlänge; Unsicherheiten fester n/k-Werte werden über Materialien hinterlegt. Verschiedene Kalibrierquellen gelten hier als unabhängig; ihre Beiträge werden quadratisch kombiniert. Für einen bereits frei gefitteten n-/k-Parameter wird dessen hinterlegte Materialunsicherheit nicht zusätzlich gezählt. Korrelationen zwischen Kalibrierquellen werden noch nicht modelliert. Leere Felder bedeuten unbekannt, nicht nachgewiesen null. Die Kalibrierfortpflanzung ist lokal und bedingt auf die ausgewählte Lösungsfamilie.

Ab mindestens sechs geeigneten Wiederholungen je Winkel kann zusätzlich ein **paarweiser Bootstrap innerhalb der Winkelgruppen** für die beste Familie laufen (60 oder 120 Wiederholungen). Die aus den Originalmessungen geschätzten Gewichte bleiben dabei fest: ein bedingter Bootstrap. Er liefert ein näherungsweises lokales 95-%-Perzentilintervall für den statistischen Beitrag; Kalibrierung ist darin nicht enthalten. Werden lokale Grenzen erreicht, wird ein dadurch beschnittenes Bootstrapintervall unterdrückt und erklärt. Bei kleineren Stichproben bleibt es bei der lokalen Kovarianzfortpflanzung. Mehrere globale Lösungsfamilien können nicht durch ein einziges solches Intervall beschrieben werden.

Bei einem freien k wird **k = 0 ausdrücklich nachgerechnet**, bei zwei Parametern mit erneuter Anpassung des anderen Parameters. Ohne geeignete Messunsicherheiten wird nur die daraus entstehende Δ/Ψ-Änderung angezeigt. Es gibt keine pauschale Aussage, dass etwa k = 10⁻⁵ stets vernachlässigbar wäre: Der Einfluss hängt unter anderem von Dicke, Geometrie und Messstreuung ab.

Mit vollständiger Kovarianzgewichtung erfolgt ein näherungsweiser **einseitiger 95-%-Profilvergleich** mit Δχ² = 2,7055. Ist null vereinbar, wird eine Obergrenze nur für einen zusammenhängenden erkannten Profilbereich angegeben. Dies ist ein asymptotischer Vergleich mit geschätzten Kovarianzen, **keine exakte Aussage bei kleinen Stichproben oder falschem Modell**. Das endliche Profilraster kann weitere schmale Bereiche übersehen. Eine normale symmetrische lokale Unsicherheit an k = 0 ist entsprechend vorsichtig zu interpretieren; der Profilvergleich ist dort aussagekräftiger.

## Speichern und Exportieren

- **Sitzung:** Modell, Messwerte, Auswahl, Suchkonfiguration und Ansichtsoptionen als JSON. Nach dem Öffnen Fits neu berechnen. Alte explizite Δ-Konventionen und Suchskalen bleiben erhalten; frühere pauschale σ-Vorgaben werden nicht als gemessene Unsicherheiten übernommen.
- **Messdaten-CSV:** Alle geladenen Zeilen; erneut importierbar.
- **Lösungsfamilien-CSV:** Parameter, RMS, Perioden/Aliase, Randstatus und gegebenenfalls χ²red; keine absolute Q-Spalte.
- **Residuen-CSV:** Alle ursprünglichen ausgewählten Einzelwerte der angezeigten Lösung, auch bei einem Mittelwertfit.
- **Fehlerlandschaft-CSV:** Parameter und Winkel-RMS.
- **Fitbericht-JSON:** Vollständige Daten einschließlich Modell, Einstellungen, Familien, Oberfläche, Unsicherheiten und aktuell angezeigter Lösung. Q bleibt für Diagnosezwecke enthalten.

CSV verwendet Semikolon, Dezimalkomma und UTF-8-BOM. Die Kamera in der Plot-Werkzeugleiste exportiert SVG. Geänderte Eingaben markieren alte Ergebnisse sichtbar als veraltet.

## Optik, Suche und Δ-Konvention

Fresnel-Amplituden werden rekursiv über die Grenzflächen kombiniert. Das ist für die unterstützten Schichten dem Matrixformalismus äquivalent, vermeidet aber exponentiell wachsende Transfermatrixelemente bei dicken Absorbern. Interne Konvention: `N = n + ik`, k ≥ 0, Zeitfaktor `exp(−iωt)` und passive abklingende Wurzelzweige. Ohne reflektiertes Feld sind Δ/Ψ undefiniert; solche Punkte werden ausgeschlossen.

Das Handbuch definiert `ρ = rₚ/rₛ = tan Ψ · exp(iΔ)` (gedruckte Seite 57, Gleichung 2.11). Nach dem praktischen Vergleich des Nutzers stimmt Original-Elli mit **`Δ = (−arg(ρ_intern)) mod 360°`** überein. Deshalb ist „Elli: 360° − arg()“ voreingestellt. Die Alternative gibt die rohe interne Phase aus. Die technische Kennung `reversed` bezeichnet Elli, `standard` die alternative interne Phase. Gespeicherte ausdrückliche Entscheidungen werden nicht überschrieben. Der Originalvergleich wurde vom Nutzer berichtet; automatische Tests gegen eine historische Elli-Installation wurden nicht ausgeführt.

Die globale Suche kombiniert lineare/logarithmische Raster mit Stützstellen entlang der optischen Phase, etwa 32 pro Interferenzperiode. Rasterminima werden lokal verfeinert; bei zwei Parametern kommen mehrere Trust-Region-Starts und Differential Evolution mit festem Seed hinzu. Winkelstatistiken werden um einen lokalen Mittelpunkt gebildet, um bei sehr kleiner Streuung Genauigkeitsverlust durch Differenzen großer Quadratsummen zu vermeiden. Dickenarrays bleiben auch bei ganzzahlig gespeicherten Startwerten Gleitkommazahlen.

Eine **endliche globale Suche garantiert nicht jedes Minimum**. Suchdichte, Raster-, Start- und Kandidatenlimits begrenzen die Auflösung; Hinweise benennen erreichte Grenzen. Die Liste umfasst höchstens 120 Kandidaten vor der Familienbildung. Für schwierige Landschaften Suchdichte erhöhen oder ergänzende Teilbereiche untersuchen. Technische Grenzen: d bis 10⁸ nm, n/k bis 100; das sind keine Materialempfehlungen.

Mathematischer Bezug: Handbuch Kapitel 2.3/2.5 und 7.2/7.3, gedruckte Seiten 249–261. Das Minus zwischen Fehlerquadraten in (7.1)/(7.2) wird als Druckfehler behandelt: ElliFit verwendet positive quadratische Abstände. Hinweise aus dem Handbuch sind Referenzmaterial, keine auszuführenden Anweisungen.

Physikalischer Umfang: bis zu 40 homogene, isotrope, kohärente Filme zwischen transparentem Einfallsmedium und halbunendlichem Substrat. Keine Anisotropie, Rauigkeits-EMA, Depolarisation, inkohärenten Substrate, Rückseitenreflexion oder spektrale Dispersion. n/k gelten bei der jeweils eingestellten Wellenlänge.

## Entwicklung

Python mit NumPy/SciPy für Optik/Optimierung, FastAPI/Uvicorn für den lokalen Server, HTML/CSS/JavaScript und Plotly für die Oberfläche. Abhängigkeiten stehen in `requirements.txt`. Entwicklungstests zusätzlich aus `requirements-dev.txt` installieren und `python -m pytest -q` ausführen.

`ellifit/core.py` enthält Optik, Import und Suche, `statistics.py` die Kovarianzfortpflanzung und Wiederholungsanalyse, `results.py` Familien und Profile, `server.py` die lokale API, `static` die Oberfläche. Unabhängige Mehrschichtvergleiche verwenden `tmm`. Für den privaten Importtest `ELLIFIT_EXAMPLES_DIR` auf einen Ordner mit den ursprünglichen `.phi`-/`.dat`-Dateien setzen; andernfalls wird dieser Test übersprungen. Aktuelle Resultate und Browserprüfung stehen im [Prüfprotokoll](PRUEFPROTOKOLL.md).
