# ElliFit 1.1

Lokale Auswertung monochromatischer Ellipsometrie: Schichtmodelle definieren und Schichtdicke, Brechungsindex oder zwei Parameter gemeinsam global fitten. Die Browseroberfläche kommuniziert ausschließlich mit einem Python-Rechenkern auf demselben Rechner.

## Download und Windows-Start

**[Programm als ZIP herunterladen](https://github.com/kangaroocry/ElliFit/archive/refs/heads/ellifit-1.1.zip)**

1. Das ZIP **vollständig entpacken**, z. B. in `Dokumente\ElliFit`. Nicht direkt im ZIP starten.
2. **Python 3.11 oder neuer, 64 Bit** von <https://www.python.org/downloads/> installieren. Den Python Launcher beziehungsweise „Add Python to PATH“ aktivieren.
3. **`Start_Windows.bat` doppelklicken.** Beim ersten Start werden Python-Pakete aus dem Internet in den Unterordner `.venv` installiert.
4. Der Browser öffnet `http://127.0.0.1:8765`. Das Konsolenfenster offen lassen; zum Beenden dort `Strg+C` drücken oder das Fenster schließen.

Nach der Erstinstallation benötigt die Anwendung keine Internetverbindung. Plotly wird als Python-Paket installiert; seine JavaScript-Datei wird lokal ausgeliefert, nicht von einem CDN geladen. Messdaten und Modelle werden nicht an GitHub oder andere Dienste gesendet.

Das Paket enthält **Quellcode mit Startdatei, keine kompilierte EXE**. Der erste Start benötigt Internet und eine passende Python-Installation. Standardmäßig ist keine systemweite Paketinstallation nötig; die virtuelle Umgebung liegt im Programmordner. Ob die Python-Installation ohne Admin-Rechte möglich ist, hängt vom Rechner ab.

**Windows 7 ist mit diesem Stand nicht unterstützt.** Dafür wäre eine eigene Zusammenstellung älterer, kompatibler Python-, Bibliotheks- und Browserversionen mit tatsächlicher Prüfung auf Windows 7 nötig. Die Tests dieser Version liefen unter Linux; ein echter Windows-Lauf wurde hier nicht ausgeführt.

Wenn die Erstinstallation fehlschlägt, Fehlerausgabe prüfen und die Batchdatei erneut starten. Bei einem belegten Port:

```bat
.venv\Scripts\python.exe launch.py --port 8766
```

Unter Linux/macOS: `sh start.sh`. Alternativ manuell eine virtuelle Umgebung erstellen, `pip install -r requirements.txt` und `python launch.py` ausführen.

## Referenz und reale Proben

Beim Öffnen sind **synthetische Referenzdaten** geladen: tatsächliche Filmdicke **118 nm**, Film-n **1,46**, Luft / Film / Si-Beispiel. Die Modelldicke startet absichtlich bei 80 nm. Die globale Suche sollte 118 nm wiederfinden. Die Referenzdaten sind rauschfrei; extrem kleine numerische Fehler sind keine Aussage zur experimentellen Genauigkeit.

Die Wellenlänge ist auf **632,8 nm voreingestellt und editierbar**. n und k gelten jeweils bei der eingestellten Wellenlänge; eine automatische Dispersionskorrektur ist nicht enthalten.

**Die mitgelieferten Materialwerte sind Beispiele.** Für die ursprüngliche reale Messdatei ist nur die Wellenlänge bestätigt. Ein verifizierter Schichtaufbau und passende feste n/k-Werte wurden nicht angegeben. Es wird daher kein physikalisch validiertes Ergebnis für diese Probe behauptet.

Die ursprünglichen Messdateien und das Handbuch werden nicht in diesem öffentlichen Repository verteilt. Ihre Formate und der Import wurden lokal geprüft. Eigene Dateien über „Dateien laden“ importieren.

## Bedienung

1. **Modell:** Einfallsmedium, endliche Filme von oben nach unten und Substrat einstellen. `N = n + ik`, `k ≥ 0`, Dicke in nm. Schichten lassen sich ergänzen, entfernen und umsortieren. Für ein blankes Substrat die endlichen Filme entfernen.
2. **Messungen:** `.phi`, `.dat`, `.txt` oder einfache `.csv` laden; alternativ Winkel, Δ und Ψ manuell eingeben. Beide ursprünglichen Dateitypen werden gleichartig behandelt: drei numerische Spalten **Einfallswinkel, Delta, Psi in Grad**. Winkel werden gegen die Oberflächennormale gemessen. UTF-8, Windows-1252, Dezimalpunkt, Dezimalkomma und Kommentare hinter `>>` sind unterstützt.
3. **Auswahl:** Häkchen bestimmen, welche Zeilen in den Fit eingehen. Das globale Häkchen wählt alle geladenen Zeilen, unabhängig vom Filter. „Gefilterte wählen“ ergänzt die aktuell gefilterten Zeilen; „Keine“ leert die Auswahl. Nach Quelle, Kommentar, Zeilennummer und Winkel filtern. `Umschalt`-Klick wählt einen zusammenhängenden Bereich der gefilterten Ansicht. Die Tabelle zeigt 50 Zeilen je Seite; die ganze Auswahl wird gerechnet.
4. **Parameter:** Einen oder zwei Parameter wählen. Unterstützt sind d, n und k der Filme, n/k des Substrats und n des transparenten Einfallsmediums. Standard-Dickenbereich **0,1–1000 nm**; beide Grenzen editierbar. Alle anderen Modellwerte bleiben fest. Für k = 0 die lineare Skala verwenden; logarithmische Grenzen müssen positiv sein.
5. **Fit:** Globale Suche starten. Mehrere ausgewählte Winkel führen automatisch zu einem Mehrwinkelfit. Bei Wiederholungen fragt die Oberfläche nach Mittelung oder Mehrfachgewichtung; dies ist auch dauerhaft einstellbar. Abbruch ist über „Abbrechen“ möglich.
6. **Lösungen:** Die Liste ist nach Q aufsteigend sortiert. Eine Zeile oder einen Minimum-Punkt anklicken, um die zugehörige Modellkurve zu sehen. „Ins Modell übernehmen“ überträgt die Werte; anschließend speichern.

**Nur Messungen derselben unveränderten Probe gemeinsam fitten.** Gleiche Winkel allein bedeuten nicht gleiche Probe. Insbesondere die ursprüngliche `.dat`-Sammlung enthält unterschiedliche Probenkommentare; sie ist nicht automatisch eine gemeinsame Wiederholungsserie.

## Modelle und Sitzungen speichern

- **Modellordner:** Standardmäßig `models` neben `launch.py`. Unter „Modellordner“ einen anderen Pfad eingeben oder mit `python launch.py --models "C:\Pfad\Modelle"` starten. Die Oberfläche merkt den Ordner im Browser. Die Dateien werden als UTF-8-JSON gespeichert und aus einer Liste geladen. Zusätzlich stehen JSON-Download und Öffnen einer einzelnen Modelldatei zur Verfügung.
- **Sitzung:** Enthält Modell, Messwerte, Auswahl und Suchkonfiguration. Beim erneuten Öffnen die Fits neu berechnen. Ergebnisse werden über den separaten Fitbericht exportiert.
- **Elli-`.cfg`:** Kein direkter Import; ein entsprechendes Dateiformat wurde nicht bereitgestellt. Der neue Modelldateityp ist JSON mit `schema_version: 1`.

Beim Umstellen der Eingaben bleiben vorhandene Ergebnisse als Vergleich sichtbar und werden als veraltet gekennzeichnet. Ein neuer Fit aktualisiert die Darstellung.

## Diagramme und Export

**Ein Parameter:** Q gegen den Parameter, bei logarithmischer Parameterskala als log-log-Plot. Lokale Verfeinerungen zeigen die Tiefe der Minima zusätzlich zum globalen Raster. Numerische Nullwerte werden im Log-Plot bei 10⁻²⁰ dargestellt; in der Ergebnisliste bleiben die tatsächlichen Q-Werte erhalten.

**Zwei Parameter:** Konturplot mit den beiden Fitparametern auf x/y und **log₁₀ Q als Farbe**. Mit zwei logarithmischen Parameterachsen ergibt dies die gewünschte log-log-log-Darstellung. Optional ist eine drehbare 3D-Fläche verfügbar. Gefundene Minima werden als Wertepaare markiert.

**Mehrwinkelfit:** Experimentelle Punkte und theoretische Kurven gegen den Einfallswinkel. Δ ist immer **rot** auf der linken Achse, Ψ immer **blau** auf der rechten Achse.

**Einwinkelfit:** Theorie gegen den freien Parameter; experimentelle Punkte liegen am gefitteten x-Wert. Bei zwei freien Parametern wird eine Dicke als Kurvenparameter bevorzugt, sonst der erste Parameter. Der andere Parameter bleibt auf dem Wert der gewählten Lösung fixiert und wird in der Beschriftung genannt. Δ-Linien werden an 0°/360° unterbrochen.

Mit Ziehen zoomen, mit Doppelklick zurücksetzen. Die Kamera in der Plot-Werkzeugleiste exportiert SVG. Bei sehr vielen Wiederholungen wird nur die Punktdarstellung auf etwa 3.500 Punkte ausgedünnt, nicht die Rechnung.

Verfügbare Exporte:

- Messwerte als CSV; erneut importierbar.
- Ergebnisliste als CSV: Parameter, Q, √Q, Winkel-RMS, Vergleichbarkeit, Randstatus und gegebenenfalls χ²red.
- Residuen der angezeigten Lösung als CSV. Bei vorheriger Mittelung enthält dieser Export zur Kontrolle **alle ursprünglichen Zeilen**; die Zielfunktion bezieht sich dagegen auf die Winkelmittelwerte. Diese Mittelwerte stehen im Fitbericht unter `comparison.points`.
- Fehlerlandschaft als CSV.
- Vollständiger Fitbericht als JSON mit Modell, Parametern, Einstellungen, Kandidaten, Perioden, Oberfläche und Vergleichsdaten. Die zusätzlich angezeigte Lösung steht unter `displayed_solution` / `displayed_comparison`.

CSV-Dateien verwenden Semikolon, Dezimalkomma und UTF-8-BOM für deutsche Tabellenkalkulationen.

## Zielfunktion, Unsicherheiten und Wiederholungen

Standard:

```text
rΔ = wrap(Δtheo − Δexp) in [−180°, 180°)
rΨ = Ψtheo − Ψexp
Q = Σ(rΔ² + rΨ²)
Winkel-RMS = sqrt[Σ(rΔ² + rΨ²) / (2N)]
```

Der Winkel-RMS in Grad ist über unterschiedliche Punktzahlen besser vergleichbar als √Q. Ein gewöhnliches R² ist wegen zyklischem Δ und der möglichen Mehrdeutigkeit kein geeigneter Standardwert.

Optional kann mit den eingegebenen globalen Standardunsicherheiten gewichtet werden:

```text
Q = Σ[(rΔ / σΔ)² + (rΨ / σΨ)²]
χ²red = Q / (2N − p), sofern 2N > p
```

`p` ist die Zahl freier Parameter. Bei vorheriger Mittelung sind σΔ/σΨ als Unsicherheiten der **Mittelwerte** zu verstehen; es wird keine automatische Division durch √m vorgenommen. Die Startwerte 0,05° sind Beispiele, keine aus den Dateien ermittelten Gerätespezifikationen. χ² setzt passende Unsicherheiten und unabhängige Fehler voraus.

Alternativ:

```text
s(Δ, Ψ) = [cos(2Ψ), sin(2Ψ) cos(Δ), sin(2Ψ) sin(Δ)]
Q = Σ ||s_theo − s_exp||²
```

Der Stokes-Abstand vermeidet künstliche Δ-Empfindlichkeit an Ψ = 0°/90°. Die Winkel-σ-Gewichtung ist dafür deaktiviert. Die Ergebnisliste bleibt nach der gewählten Zielfunktion sortiert; Winkel-RMS wird zusätzlich angezeigt.

Wiederholungen innerhalb der einstellbaren Winkeltoleranz (Start: 0,001°) werden am gemeinsamen mittleren Einfallswinkel modelliert:

- **Mitteln:** Δ als komplexes Kreismittel, Ψ arithmetisch; jeder Winkel liefert ein Wertepaar. Nicht eindeutiges Δ-Kreismitteln wird abgelehnt, große Streuung wird gemeldet.
- **Mehrfachgewichten:** Die Fehlerquadratsumme aller ursprünglichen Werte einschließlich der Streuung bleibt erhalten. Ausreichende gruppierte Summenstatistiken beschleunigen die Suche, ohne Wiederholungen auf gleich gewichtete Mittelwerte zu reduzieren.

## Periodizität und Eindeutigkeit

Bei einem Winkel und einer transparenten, propagierenden variablen Filmdicke gilt:

```text
T = λ / [2 Re(sqrt(N_Film² − n_Einfallsmedium² sin²φ))]
```

Analytische Wiederholungen innerhalb der Suchgrenzen werden nachgerechnet. Die ersten vergleichbaren Lösungen erscheinen zusätzlich nach Dicke sortiert. Wenn n gleichzeitig frei ist, gilt die Periode nur beim jeweiligen festen zweiten Parameter. Zwei variable transparente Dicken können zwei unabhängige Perioden besitzen. Bei Absorption oder evaneszenter Ausbreitung wird keine exakte Dickenperiode behauptet. Praktisch flache Fehlerfunktionen werden als fehlende Bestimmbarkeit behandelt.

Mehrere Winkel haben im Allgemeinen unterschiedliche Perioden. Ähnlich gute Minima allein sind kein Periodennachweis.

Die einstellbare **Fit-Toleranz** markiert im ungewichteten Winkelmodus Lösungen mit `RMS ≤ RMS_best + Toleranz`. Bei gewichteten Winkeln ist die Q-Toleranz `2N · Toleranz² / min(σΔ,σΨ)²`, bei Stokes `N · (2 · Toleranz_in_Radiant)²`. Das ist ein transparentes Qualitätskriterium, **kein Konfidenzintervall und kein Beweis identischer Modellkurven**.

Eine lokale Jacobi-Matrix prüft schwache beziehungsweise korrelierte Sensitivitäten. Diese Prüfung ersetzt keine vollständige Unsicherheitsanalyse. Ein Δ/Ψ-Paar liefert nur zwei unabhängige Messgrößen; ein exakter Zweiparameter-Fit bestätigt daher weder Eindeutigkeit noch Modellrichtigkeit.

## Mathematik und globale Suche

Fresnel-Amplituden werden rekursiv über alle Grenzflächen kombiniert. Das ist im unterstützten Schichtmodell dem Matrixformalismus physikalisch äquivalent, vermeidet bei dicken absorbierenden Filmen aber exponentiell wachsende Transfermatrixelemente.

Konvention: `N = n + ik`, `k ≥ 0`, Zeitfaktor `exp(−iωt)`, `ρ = rₚ/rₛ = tan Ψ · exp(iΔ)`. Der Wurzelzweig erzeugt passive, abklingende Wellen. Für eine abweichende Gerätekonvention kann das Δ-Vorzeichen umgekehrt werden. Die Konvention sollte mit einer bekannten Referenzprobe geprüft werden. Ohne reflektiertes Feld sind Δ/Ψ undefiniert; solche Suchpunkte werden ausgeschlossen.

Die Suche verbindet ein logarithmisches/lineares Raster mit zusätzlichen Stützstellen entlang der optischen Phase, angestrebt etwa 32 pro Interferenzperiode. Rasterminima werden lokal verfeinert: eindimensional durch beschränkte skalare Minimierung, zweidimensional mit mehreren Trust-Region-Least-Squares-Starts. Bei zwei Parametern ergänzt Differential Evolution mit festem Seed die globale Suche. Numerisch gleiche Kandidaten werden zusammengefasst.

Es sind keine engen lokalen Startgrenzen erforderlich. Dennoch kann eine **endliche globale Suche nicht jedes Minimum garantieren**. Suchdichte und technische Obergrenzen begrenzen die Auflösung; entsprechende Hinweise werden ausgegeben. Die Liste enthält maximal 120 unterschiedliche Minima. Periodenfamilien und lokale Startzahlen sind ebenfalls begrenzt. Größere Suchdichte oder ergänzende Teilbereichssuchen helfen bei stark oszillierenden Landschaften. Technische Grenzen: d bis 10⁸ nm, n/k bis 100; das sind keine Materialempfehlungen.

Bezug zum ursprünglichen Handbuch: Kapitel 2.3/2.5 und 7.2/7.3, gedruckte Seiten 249–261. Das Minus zwischen den Fehlerquadraten in (7.1)/(7.2) wird als Druckfehler behandelt: ElliFit verwendet die positive Summe der quadrierten Residuen.

## Physikalische Grenzen

Bis zu 40 homogene, isotrope, kohärente Filme zwischen einem transparenten Einfallsmedium und einem halbunendlichen Substrat. Absorbierende Filme/Substrate sind erlaubt. Keine Anisotropie, Rauigkeits-EMA, Depolarisation, inkohärenten Substrate, Rückseitenreflexion oder spektralen Dispersionsmodelle. Ein ungeeignetes Modell kann trotz kleiner Fehler falsche physikalische Parameter liefern.

## Entwicklung und Prüfungen

```sh
python -m venv .venv
# Windows: .venv\Scripts\python.exe verwenden
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python -m pytest -q
```

`ellifit/core.py` enthält Optik, Datenimport, gruppierte Residuen und globale Suche; `ellifit/server.py` den lokalen Server und Dateizugriff; `ellifit/static` die Oberfläche. Die Tests vergleichen Mehrschichtamplituden auch mit der unabhängigen Bibliothek `tmm`.

Für den optionalen lokalen Test der ursprünglichen Dateien: `ELLIFIT_EXAMPLES_DIR` auf einen Ordner mit `.phi` und `.dat` setzen. Ohne diese privaten Dateien wird genau dieser Test übersprungen. Prüfdetails stehen in [PRUEFPROTOKOLL.md](PRUEFPROTOKOLL.md).
