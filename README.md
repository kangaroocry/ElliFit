# ElliFit 1.2.8

Lokales Programm zur monochromatischen Ellipsometrie: Schichtmodelle und Materialien speichern, Messungen auswählen und Schichtdicke, Brechungsindex oder Extinktionskoeffizient global fitten. Ein oder zwei Parameter können gleichzeitig frei sein. Die Browseroberfläche und der Python-Rechenkern laufen auf demselben Rechner.

**[ElliFit 1.2.8 als ZIP herunterladen](https://github.com/kangaroocry/ElliFit/archive/refs/heads/ellifit-1.2.zip)** · [Materialwerte und Schichtvorlagen](MATERIALIEN.md) · [Änderungen gegenüber 1.1](AENDERUNGEN_1.2.md) · [Prüfprotokoll](PRUEFPROTOKOLL.md)

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

1. **Schichtmodell prüfen.** Einfallsmedium, Filme von oben nach unten und halbunendliches Substrat einstellen. **20 Materialien und 12 Schichtvorlagen** mit typischen Startwerten sind enthalten; Herkunft und Annahmen siehe [Materialbibliothek](MATERIALIEN.md) und Materialnotizen. Wellenlänge und Δ-Konvention befinden sich im ausklappbaren Bereich „Optische Einstellungen und Dateien“. Voreinstellung: **632,8 nm** und Elli-kompatibles Δ.
2. **Messdaten laden.** `.phi`, `.dat`, `.txt` oder einfache `.csv` enthalten drei numerische Spalten: Einfallswinkel, Δ, Ψ in Grad. Winkel werden gegen die Oberflächennormale gemessen. UTF-8/Windows-1252, Dezimalkomma/Dezimalpunkt und Kommentare hinter `>>` werden unterstützt. Alternativ Einzelwerte eingeben.
3. **Zeilen auswählen.** Das globale Häkchen wählt alle geladenen Zeilen unabhängig von Filter und Seite. „Gefilterte wählen“ ergänzt die aktuelle Ansicht. Gruppen können nach Winkel oder Quelle gebildet, ein-/ausgeklappt und gemeinsam ausgewählt werden. Bei wiederholten Winkeln gruppiert die Automatik sichtbar nach Winkel. Ein teilweise ausgewähltes Gruppenhäkchen zeigt einen Zwischenzustand. `Umschalt`-Klick wählt einen Bereich der gefilterten Zeilen. **„Anfang“ und „Ende“** springen direkt zur ersten beziehungsweise letzten Seite. Mit der **Seiteneingabe** werden beliebige Seiten erreicht; **„Messung #“** springt zu einer Nummer aus der #-Spalte und hebt das Ziel hervor. **„Letzte Messung“** zeigt die letzte aktuell sichtbare Messung in ursprünglicher Dateireihenfolge, auch wenn Winkelgruppen anders sortiert sind. Zielgruppen werden bei Bedarf aufgeklappt. Filter und Fit-Auswahl bleiben erhalten; ein herausgefiltertes Ziel wird erklärt.
4. **Einen oder zwei Parameter wählen.** Die kleinen Auswahlfelder unter d/n/k zeigen **fix**, **X** oder **Y**. Dort oder im Bereich „Globale Suche“ wählen; beide Ansichten bleiben synchron. X ist der erste, Y der zweite Fitparameter. Der einzige Parameter eines Einparameterfits ist X. Ohne ausgewählten Parameter wird noch kein Fit gestartet. Eine Auswahl folgt ihrer Schicht beim Verschieben; Löschen der Schicht entfernt auch ihre Auswahl.  Voreinstellungen: **d = 0,1–1 000 nm logarithmisch**, **n = 1–4 linear**, **k = 0–10 mit logarithmischen positiven Stützstellen plus exakt null**. Grenzen und Suchraster sind editierbar; bei n unter 1 oder k über 10 gegebenenfalls erweitern. Alle anderen Modellwerte bleiben fest.
5. **Global suchen.** Mehrere ausgewählte Winkel ergeben automatisch einen Mehrwinkelfit. Wiederholungen werden standardmäßig gemeinsam gefittet. Mittelung und eine Rückfrage lassen sich unter „Fitverfahren und Unsicherheiten“ wählen. Ein laufender Fit kann abgebrochen werden.
6. **Lösungsfamilien vergleichen.** Zeile, nummerierten Punkt im Fehlerplot oder eine Wiederholung innerhalb einer Periodenfamilie anklicken. Der Modellvergleich folgt der Auswahl. „Ins Modell übernehmen“ überträgt die Werte; anschließend das Modell speichern.

**Messdaten und Lösungen stehen vor den Diagrammen**, bei ausreichender Breite links und rechts nebeneinander. Die **Messbezeichnungen** sind in die weiße Kennzahlenleiste mit Winkel-RMS, Messanzahl und Rechenzeit integriert. Weitere Namen, Kommentare und Quellen werden dort aufgeklappt. Nach einem Fit bleibt die Bezeichnung der Datenbasis am gezeigten Vergleich erhalten. Ändert sich die Auswahl, bleibt die Auswahl für den nächsten Fit zusätzlich nachvollziehbar. Ein Filter ändert keine Auswahl.

**Mausrad mit Verweilzeit:** Zunächst wird die Seite gescrollt. Ruht der Zeiger etwa **0,5 Sekunden** über einer Liste oder einem Diagramm, wird dort lokales Scrollen beziehungsweise Diagrammzoom aktiviert; eine dezente Umrandung zeigt die Freigabe. Fortlaufendes Seitenscrollen bleibt auf der Seite, auch wenn sich eine Liste unter den Zeiger bewegt. Zum lokalen Wechsel kurz aufhören und verweilen. Verlassen des Bereichs beendet die lokale Freigabe; **Alt+Mausrad** bedient ihn sofort lokal. Der bisherige global/lokal-Schalter entfällt. Scrollleisten sowie Ziehen/Drehen der Diagramme bleiben verfügbar. Strg/Command-Zoom und horizontales Umschalt-Scrollen werden berücksichtigt. In geöffneten Dialogen bleibt das Scrollen im Dialog.

**Hinweise kompakt:** Die aufklappbare Übersicht „Hinweise zur Auswertung“ gruppiert Meldungen nach Art: allgemeine Informationen **blau**, Erledigt-/Erfolgsmeldungen **grün**, Warnungen **gelb** und kritische Hinweise **rot**. Weniger wichtige Details sind standardmäßig eingeklappt. Kritische Hinweise, etwa ein globales Minimum an einer künstlichen Suchgrenze, bleiben sichtbar. Parameterkopplung, Talverlauf und Unsicherheitstabellen befinden sich zusätzlich in einem aufklappbaren Analysebereich unter den Diagrammen.

**Nur Messungen derselben unveränderten Probe gemeinsam fitten.** Gleiche Winkel belegen keine gleiche Probe. Die ursprüngliche `.dat`-Sammlung enthält unterschiedliche Probenkommentare und ist deshalb nicht automatisch eine gemeinsame Wiederholungsserie.

Die mitgelieferte **synthetische Referenz** hat d = 118 nm und n = 1,46. Das Modell startet bei d = 80 nm; die globale Suche sollte 118 nm wiederfinden. Die Referenz ist rauschfrei und liefert keine experimentelle Unsicherheitsangabe. Für die ursprüngliche reale `.phi`-Probe ist nur die Wellenlänge bestätigt; ohne verifizierten Schichtaufbau und feste Materialwerte wird kein physikalisch validiertes Probenergebnis behauptet. Private Originaldateien und Handbuch sind nicht im öffentlichen Repository enthalten.

## Modelle, Materialien und Rückgängig

Modelle werden als UTF-8-JSON im Modellordner gespeichert und aus einer Liste geladen. Standardordner: `models`. Einzelne Dateien können geöffnet und heruntergeladen werden. Elli-`.cfg` wird nicht direkt importiert; ein solches Dateiformat liegt nicht vor.

Die separate **Materialbibliothek** speichert Name, n, k, optionale Wellenlänge, Notizen und optionale Standardunsicherheiten u(n)/u(k) im Ordner `materials`. Materialien lassen sich aus einem Medium übernehmen, bearbeiten, als JSON importieren/exportieren und auf Luft, Film oder Substrat anwenden. Die Schichtdicke bleibt erhalten. Bei abweichender Wellenlänge erscheint eine Rückfrage; eine Dispersionsumrechnung findet nicht statt. Ein absorbierendes Einfallsmedium wird nicht zugelassen.

**Mitgeliefert sind 20 typische Materialien bei 632,8 nm:** Si, natives/trockenes/nasses SiO2, Quarzglas, ALD-Al2O3, HfO2, ALD-TiO2, Si3N4, ITO, PMMA, Polystyrol, PDMS, N-BK7, BOROFLOAT 33, Au, Ag, Al, Wasser und Luft. Die Namen enthalten keinen Zusatz „Beispiel“; Herkunft und Prozessabhängigkeit stehen in den Materialnotizen. Typwerte sind keine Kalibrierwerte, optionale Unsicherheiten bleiben unbekannt. Die SiO2-Prozessvarianten beginnen gemeinsam bei n = 1,46; ALD-Al2O3 bei n = 1,65. Die [vollständige Übersicht](MATERIALIEN.md) nennt n/k, Quellen und Annahmen.

**Die 12 Schichtvorlagen** enthalten unter anderem Si + SiO2, Si + natives SiO2 + ALD-Al2O3 sowie PMMA-/Polystyrolfilme auf nativ oxidiertem Si und auf Glas. Native Anfangsdicke: 1,5 nm; ALD-Al2O3: 20 nm; Polymere: 100 nm. Modellnamen lesen sich vom Substrat zur Oberfläche, der Editor zeigt den Aufbau von oben nach unten. Bei transparentem Glas muss die Rückseitenreflexion vom erfassten Signal getrennt beziehungsweise unterdrückt sein; ElliFit berücksichtigt sie nicht. PMMA/Glas hat zudem wenig Indexkontrast. Alle Annahmen stehen in den Modellnotizen.

**Bei eigenen Bibliotheksordnern:** Die Ordnerauswahl bleibt erhalten. Neue JSON-Dateien aus dem entpackten `materials`-/`models`-Ordner ergänzen oder den Ordner in ElliFit umstellen. Eigene gleichnamige Dateien vorher sichern; eigene Modelle werden nicht automatisch umbenannt.

**Schichtkennungen zählen vom Substrat nach oben:** Das Substrat trägt **[0]**, der Film direkt darüber **[1]**, der nächste **[2]** usw.; oben steht die höchste Filmnummer. Das Einfallsmedium bleibt unnummeriert. Dieselbe Kennung steht im Diagramm, neben dem Namen, in Auswahlfeldern, Achsen und Ergebnissen. Nummern werden beim Umordnen angepasst und sind kein Teil des Materialnamens. Die optische Reihenfolge und die gespeicherten Schichtpfade bleiben erhalten. Neu hinzugefügte Schichten starten mit **d = 0 nm**.

Der Rückgängig-Pfeil stellt Modellbearbeitung und numerische Sucheinstellungen wieder her, einschließlich gelöschter/verschobener Schichten und angewendeter Materialien. Wiederherstellen ist ebenfalls möglich. Gespeicherte Dateien und Messdatenlöschungen werden dadurch nicht zurückgenommen. Die Historie umfasst bis zu 80 Schritte und gilt für die aktuelle Sitzung. `Strg+Z` außerhalb eines Texteingabefeldes wirkt ebenfalls auf diese Historie.

Eingabefelder und Parameteranzeigen verwenden **eine Nachkommastelle für Dicken in nm und drei für n, k und Winkel**. Kleinere Werte erhalten zusätzliche Nachkommastellen oder eine Exponentialdarstellung, damit beispielsweise k = 10⁻⁸ von null unterscheidbar bleibt. **Die kleinen Pfeile rechts am Zahlenfeld** ändern n/k normalerweise um 0,001 und d um 0,1 nm; bei kleinen Werten wird der Schritt angepasst. Eine besondere Bedienung über Tastaturpfeile ist nicht erforderlich. Ergebnisse werden intern mit voller Gleitkommapräzision berechnet; unveränderte gerundete Felder runden das Modell nicht. Vollständige Werte bleiben in JSON und CSV erhalten. Dezimaltrennzeichen ist das Komma, Tausendertrennung ein Leerzeichen. JSON verwendet sein standardisiertes Zahlenformat mit Punkt.

## Eigene Probelösungen ausprobieren

Nach einer Suche können am Ende der Lösungsliste **ein oder zwei Parameterwerte** samt optionalem Namen eingegeben werden. **„Werte der Auswahl“** übernimmt die aktuell angezeigte Familie beziehungsweise Probelösung als Ausgangspunkt. **„Ausprobieren“** berechnet direkt die theoretischen Winkel, Residuen und den Winkel-RMS mit dem Modell und den ausgewählten Daten des abgeschlossenen Fits.

Diese Werte werden **nicht optimiert**. Probelösungen erscheinen separat als **T1, T2, …**, lassen sich anklicken und sind als eigene Markierungen in den Diagrammen sichtbar. Die gefundenen Minima, deren Rangfolge und die ausgewiesene beste Fitgüte bleiben erhalten. Für Probelösungen werden keine Fitunsicherheiten oder lokalen Fitting-Gleichungen ausgegeben. Eine gegebenenfalls angezeigte Messverträglichkeit ist ein direkter Mittelwertvergleich bei festen übrigen Modellwerten.

Physikalisch zulässige Werte außerhalb der Suchgrenzen sind möglich und werden gekennzeichnet. d = 0 nm kann auch nach einer logarithmischen Suche ausprobiert werden; die Darstellung berücksichtigt den Nullpunkt. Ungültige n/k/d-Werte werden abgewiesen. Mit **„Ins Modell übernehmen“** wird auch eine Probelösung übernommen; die Modellbearbeitung lässt sich rückgängig machen. Entfernen einer Probelösung verändert keine Fitfamilie.

Probelösungen lassen sich als eigenes **CSV** exportieren. Der vollständige **Fitbericht-JSON** enthält ihre Werte getrennt von den Optimierungsergebnissen und kennzeichnet den tatsächlich angezeigten Vergleich. Die Sitzungsdatei speichert weiterhin die Eingaben; nach dem Öffnen müssen Fits und Probelösungen neu berechnet werden.

## Diagramme und feste RMS-Farbstufen

**Neue Fits übernehmen die Skalen der Suchraster** für die zugehörigen Parameterachsen. Auch ein Wechsel des Suchrasters zwischen linear/log aktualisiert die Darstellung. Danach lassen sich die Anzeigeachsen unabhängig über die Logarithmus-Häkchen umschalten, ohne einen neuen Fit zu starten. Die RMS-Achse eines Einparameterfits bleibt separat einstellbar. Der Winkelvergleich startet mit linearer Winkelachse; der Einwinkel-Parametervergleich übernimmt die Skala seines Kurvenparameters.

**Schichtkennungen** stehen größer links neben den farbigen Kästchen und Eingabeschichten. Kompakte Symbole wie **d[1], d[2], n[1], n[2]** erscheinen in Gleichungen, Punktinfos und Ergebnisköpfen. Das Substrat heißt entsprechend **n[0]** beziehungsweise **k[0]**, das Einfallsmedium **n[Einfall]**. Vollständige Materialnamen bleiben auf Achsen und in Tabellen erhalten.

Bei einem freien Parameter zeigt die Fehlerlandschaft den **Winkel-RMS** gegen den Parameter, mit zusätzlichen lokalen Stützstellen nahe den Minima. Das entspricht bis auf den konstanten Faktor √(2N) der Wurzel der Fehlerquadratsumme und ist leichter über unterschiedliche Punktzahlen zu vergleichen. Bei zwei Parametern erscheinen ein Konturplot oder eine drehbare 3D-Fläche. **Kleinere Werte sind besser; die besten Fits liegen in den Minima.**

Die **3D-Fläche verwendet ein adaptives Dreiecksnetz**. Bestätigte Minima und zusätzlich berechnete Talpunkte sind selbst Stützpunkte dieser Fläche. Schmale Talumgebungen werden quer zum Tal und anhand weiterer Modellrechnungen innerhalb der Dreiecke nachberechnet. Dadurch liegen die Talpunkte nicht mehr unter einer nur aus einem zu groben Rechteckraster interpolierten Landschaft. Die Fläche zwischen Stützpunkten bleibt eine Näherung; ein endliches Netz kann weitere Details übersehen. Die Kontur enthält das globale Suchraster, die nachgerechneten Talpunkte und separat umrandete Lösungsregionen. Der globale Suchalgorithmus wird durch die Darstellungsverfeinerung nicht ersetzt.

```text
RMS = sqrt[Σ(wrap(Δtheo − Δexp)² + (Ψtheo − Ψexp)²) / (2N)]
```

| Winkel-RMS | Farbe |
|---|---|
| bis einschließlich 0,001° | dieselbe kräftige Grünfarbe, ohne Farbsprung |
| 0,01° | mittlere Grünabstufung |
| 0,1° | klares Grün für einen sehr guten Fit |
| 1° | Gelb |
| 10° | Rot |
| 142,3° (theoretisches Maximum) | Pink |

Zwischen 0,001° und dem theoretischen Höchstwert von √[(180² + 90²)/2] ≈ 142,3° wird die Farbe über die Dekaden interpoliert. Von 0,1° bis 0,001° geht das Grün kontinuierlich in ein kräftigeres, satteres Grün über. Pink wird erst am Höchstwert erreicht; es gibt keinen violetten Abschnitt und kein gleichfarbiges Plateau ab 100°. Die Farbskala ist bei jedem Datensatz gleich und gilt für Tabelle, Kontur, 3D und nummerierte Minimum-Punkte. Die Tabelle ist dezent hinterlegt; Punkte sind kräftiger mit heller Umrandung. Im **1D-Plot wird auch der Hintergrund nach dem jeweiligen y-Wert eingefärbt**, mit geringerer Deckkraft und einer dunklen Kurve. Das gilt sowohl für die logarithmische als auch für die lineare y-Achse. Der Hintergrund wird nur im sichtbaren Diagrammbereich gezeichnet und folgt Zoom, Verschieben und Autoscale; seine Ausdehnung zählt nicht zu den Daten. **Autoscale richtet sich ausschließlich nach Kurve und Minimum-Punkten.**

Die Farblegende und die automatische 1D-Achsenskalierung reichen nach oben höchstens bis zum theoretischen RMS-Maximum. Legende, Hintergrund und Marker verwenden dieselbe Farbdefinition. Die Konturfarbe wird logarithmisch abgestuft, ihre Legende und die Hoverangaben zeigen den **RMS in Grad**. In 3D ist die Höhe der RMS auf einer logarithmischen z-Achse: kleine Werte ergeben Täler. Numerische Nullwerte werden in logarithmischen Höhen nur zur Darstellung bei 10⁻⁹° begrenzt; tatsächliche RMS-Werte bleiben im Bericht und in Exporten erhalten. Es gibt keine zusätzliche transformierte Fitgüte-Kennzahl und keine entsprechende CSV- oder JSON-Spalte.

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

Seit 1.2.5 werden nicht globale Randminima **vor** der Erzeugung periodischer Kopien ausgeschlossen. Eine Randlösung kann bei freiem n nach einer Dickenverschiebung denselben Fehlerwert haben, ohne am neuen Ort ein inneres Minimum zu sein: Die Periode hängt von n ab. Solche Punkte wurden zuvor fälschlich als zusätzliche Familien ausgegeben. Die zweidimensionalen Optimierungen verwenden jetzt eine skalierte Jacobi-Matrix mit zentralen Differenzen. Sowohl gefundene Kandidaten als auch periodische Kopien werden zusätzlich auf zulässige Stationarität und lokalen Abstieg geprüft; unbestätigte Punkte werden erneut optimiert oder verworfen. Das ist eine numerische Kontrolle, kein mathematischer Vollständigkeitsbeweis.

Eine Familie kann viele Aliase enthalten. Bis zu 200 werden einzeln dargestellt; die analytische Gesamtzahl bleibt angegeben. Lokale Unsicherheiten gehören immer zur jeweiligen Familie beziehungsweise ausgewählten Wiederholung. Über periodische Aliase werden weder Parameter noch Unsicherheiten gemittelt.

## Ein Messwinkel, zwei Parameter und schmale Fehlertäler

Ein Messwinkel liefert zwei skalare Mittelwerte, Δ und Ψ. Mehrere Wiederholungen verbessern deren Bestimmung und die Streuungsschätzung, liefern aber keine zusätzliche Messgeometrie. Zwei freie Parameter bei einem Winkel ergeben einen **gesättigten Fit**: Auf Ebene der Mittelwerte bleiben `2 × Anzahl Winkel − Anzahl Parameter = 0` Freiheitsgrade zur unabhängigen Prüfung des Modells.

Das bedeutet **nicht automatisch eine kontinuierliche Kurve exakter Lösungen**. Bei vollem Rang der lokalen Jacobi-Matrix sind exakte Wurzeln lokal isoliert. Ein sehr schmales Fehlertal kann trotzdem viele annähernd gute Wertepaare enthalten: Der Einfluss des einen Parameters wird durch den anderen weitgehend kompensiert. Ein tatsächlicher Rangdefekt ist von dieser starken, aber endlichen Korrelation zu unterscheiden. Rang und Korrelation werden angezeigt; sehr hohe Korrelationen werden mit zusätzlichen Stellen ausgegeben, damit etwa −0,9999993 nicht irreführend wie exakt −1 aussieht. Die Rangprüfung ist numerisch und lokal; sie beweist keine globale Eindeutigkeit oder exakte Mannigfaltigkeit.

Bei passenden Daten können mehrere Familien beide Winkelmittelwerte praktisch exakt treffen. ElliFit kennzeichnet einen Treffer bei einem **RMS der Mittelwerte ≤ 0,000001°** als numerische Interpolation. Diese Toleranz ist eine Rechengenauigkeit, **keine experimentelle Unsicherheit**. Die Liste und die ursprüngliche Farbskala zeigen weiterhin den **RMS über alle Einzelmessungen**. Selbst bei genau getroffenen Mittelwerten bleibt darin die Wiederholstreuung stehen; dieser Streuungsanteil wird getrennt erläutert und nicht als zusätzlicher Fehler addiert. Numerisch gleichwertige Wurzeln erhalten eine stabile Reihenfolge nach ihrem ersten Wertepunkt im Suchbereich; diese Reihenfolge ist keine physikalische Präferenz.

Ein χ²red nahe 1 ist hier besonders leicht misszuverstehen: Werden zwei Mittelwerte exakt getroffen und wird die 2×2-Kovarianz aus denselben m lokalen Wiederholungen geschätzt, beträgt der verbleibende gewichtete Streuungsanteil **Q = 2(m−1)**. Mit dem bisherigen Nenner `2m−2` ergibt sich χ²red = 1 zwangsläufig. Das ist **kein unabhängiger Gütenachweis**. Die gesättigte Ergebnisliste zeigt deshalb einen Interpolationshinweis statt dieses Werts; im vollständigen Bericht bleibt er ausdrücklich diagnostisch erhalten.

Bei einem Winkel und starker Kopplung beziehungsweise schwacher Bestimmbarkeit ergänzt ElliFit:

- **Numerisches Talprofil:** Ein Parameter wird vorgegeben, der andere mit dem vollständigen optischen Modell erneut minimiert. Bei d/n wird n vorgegeben und d profiliert. Eine vorhandene exakte Dickenperiode begrenzt die numerische Phasensuche auf einen Zyklus; weitere in den Suchbereich fallende Kopien werden ergänzt. Kleine umrandete, abschaltbare Punkte zeigen die Talspur im Kontur-/3D-Plot, getrennt von den nummerierten Minima. Sie sind **keine zusätzlichen Lösungen**. Ein eigenes Diagramm zeigt den RMS der Winkelmittelwerte entlang dieses Profils. Die Kurve ist eine numerische Stichprobe der jeweils besten bedingten Anpassung; ein endliches Raster kann schmale oder zusätzliche Äste übersehen.
- **Lokale lineare Kompensation:** `p₁ ≈ p₁* + a(p₂−p₂*)`, berechnet aus der lokalen gewichteten Empfindlichkeit. Bei d/n wird nach Möglichkeit d als abhängige Größe angegeben. Die Relation und ihre Mitte folgen der ausgewählten Familie und periodischen Wiederholung. Sie gilt nur in der unmittelbaren Umgebung, mit festen übrigen Modellwerten und aktuellen Fitgewichten.
- **Optische Phasennäherung bei transparentem d/n-Film:** `d sqrt(n² − n_Einfall² sin²φ) ≈ C`, mit n_Einfall des Einfallsmediums. Die rechte Seite verändert sich zwischen periodischen Kopien exakt um λ/2. Konstante Phase allein hält die Fresnel-Amplituden jedoch nicht konstant: Diese Formel ist **keine exakte globale Δ/Ψ-Lösungskurve**. Das numerische Profil berücksichtigt die Amplituden vollständig.

Für einen gemeinsamen **95-%-Mittelwertvergleich** wird bei einem Winkel und aktiv verwendeter geeigneter Wiederholkovarianz S die Größe `T² = m r̄ᵀ S⁻¹ r̄` betrachtet. Für zwei Komponenten und m > 2 gilt unter unabhängigen normalverteilten lokalen Winkelabweichungen die Grenze `2(m−1)/(m−2) × F[2,m−2](0,95)`. Bei **drei Wiederholungen ist diese Grenze 798**, erheblich größer als die asymptotische χ²-Grenze. Entsprechende Profilpunkte sind im Profilplot und CSV gekennzeichnet. Dies ist eine bedingte Betrachtung ausschließlich der Messstreuung bei festen übrigen Modell- und Kalibrierwerten; keine globale Parameterintervall- oder Modellgültigkeitsaussage. Ohne geeignete aktive Kovarianz wird kein statistischer Bereich erfunden. Diese Behandlung des gemeinsamen Winkelmittelwerts ist vom weiterhin asymptotischen k-Nullvergleich zu unterscheiden.

## Messverträgliche Lösungsregionen

Bei zwei freien Parametern zeigt ein hervorgehobener Bereich die **Messverträglichkeit statt ausschließlich isolierter Minima**. **95 % und 99 %** sind umschaltbar. Türkise Umrandung und transparente Füllung im Konturplot haben eine andere Bedeutung als die feste RMS-Farbskala; in 3D werden die nachgerechneten Bereichsgrenzen eingezeichnet. Minima bleiben als Punktschätzungen markiert. Gleich gut interpolierende Familien besitzen keine durch den Fehlerwert belegte physikalische Rangfolge.

Die angegebenen Parameter-Spannweiten gehören zum Bereich der ausgewählten Familie und Wiederholung. **Sie sind keine frei kombinierbaren Werteintervalle:** Nur die Wertepaare innerhalb der Umrandung erfüllen den gemeinsamen Vergleich. Durch Suchgrenzen oder Profilabschnitte beschnittene Bereiche werden gekennzeichnet. Periodische Wiederholungen werden bei der Anzeige berücksichtigt und nicht als zusätzliche unabhängige Messinformation interpretiert.

Für einen Winkel wird der oben beschriebene endliche Hotelling-T²-Vergleich invertiert. Bei mehreren Winkeln werden die einzelnen Mittelwertvergleiche mit **Bonferroni-Korrektur** simultan berücksichtigt; diese Darstellung ist konservativ. Das gemeinsame Niveau beruht auf mindestens drei geeigneten unabhängigen Wiederholungen pro Winkel und lokalen Normalverteilungsannahmen. Automatische Kovarianzgewichtung muss aktiv sein; andernfalls wird kein statistischer Bereich behauptet.

Diese Regionen berücksichtigen **nur Messstreuung bei festem Schichtmodell und festen übrigen Modell-/Kalibrierwerten**. Sie sind weder eine Wahrscheinlichkeit für das wahre Parameterpaar noch eine Prüfung unbekannter systematischer Fehler. Die angezeigten lokalen Standardunsicherheiten sind keine abgesicherten engen 95-%-Intervalle bei nur drei Wiederholungen. Ein exakter Mittelwerttreffer bleibt mit einem falschen Schichtmodell möglich.

Bei einem erkannten schmalen Tal werden die Bereichsgrenzen mit erneut minimierten Profilquerschnitten und direkten Modellrechnungen verfolgt. Ein gewöhnliches Dreiecksnetz kann solche extrem dünnen gekrümmten Bänder sonst fälschlich in viele Inseln aufteilen. Zusätzliche nicht erfasste Profiläste können dennoch fehlen. Ohne Talprofil werden die Grenzen aus dem adaptiv berechneten Netz angenähert. Alle angezeigten Bereiche sind numerisch begrenzt; sie stellen keinen Vollständigkeitsnachweis dar. Das 95-%-Profil bleibt im separaten Profilplot als zusätzliche Diagnose erhalten, während die 95-/99-%-Wahl die umrandeten Regionen steuert.

Zusätzliche ausreichend verschiedene Messwinkel können Tal und Mehrdeutigkeiten einschränken und erstmals verbleibende Freiheitsgrade zur Modellprüfung schaffen. Mehr Wiederholungen desselben Winkels liefern dafür keinen Ersatz. Auch ein Mehrwinkelfit muss auf systematische Fehler und unzutreffende feste Material-/Schichtwerte geprüft werden.

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
- **Lösungsfamilien-CSV:** Parameter, RMS der Einzelwerte und Mittelwerte, Perioden/Aliase, Randstatus, diagnostisches χ²red und Freiheitsgrade zur Modellprüfung; keine absolute Q-Spalte.
- **Probelösungen-CSV:** Eigene Wertepaare/-werte, Name, Winkel-RMS, Kennzeichnung als nicht optimiert und Lage außerhalb der Suchgrenzen.
- **Residuen-CSV:** Alle ursprünglichen ausgewählten Einzelwerte der angezeigten Lösung, auch bei einem Mittelwertfit.
- **Fehlerlandschaft-CSV:** Parameter und Winkel-RMS; bei zwei Parametern die nachgerechneten Stützpunkte des adaptiven Flächennetzes. Das ursprüngliche Rechteckraster bleibt zusätzlich im JSON-Bericht enthalten.
- **Talprofil-CSV:** Bedingte Wertepaare, RMS der Einzelwerte und Mittelwerte, gegebenenfalls T² mit 95-%-Vergleichsgrenze und Kennzeichnung. Nur verfügbar, wenn ein Talprofil berechnet wurde.
- **Lösungsbereiche-CSV:** Grenzen der gewählten 95-/99-%-Messverträglichkeit, Parameter, nachgerechneter Winkel-RMS, Teilbereich/Schleife und Kennzeichnung beschnittener Bereiche.
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
