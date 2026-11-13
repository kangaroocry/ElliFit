# Materialbibliothek und Schichtvorlagen

Stand: 13. November 2026 · ElliFit 1.2.9 · **alle Werte bei 632,8 nm**. Bibliothekswerte seit 1.2.8 unverändert.

Die 20 JSON-Materialdateien sind sofort in „Materialien …“ auswählbar. Die 12 Schichtvorlagen stehen in der Modellauswahl. Namen enthalten keinen Zusatz „Beispiel“. Es sind **editierbare typische Startwerte**, keine zertifizierten Konstanten oder vermessenen Proben. Herkunft und wichtige Annahmen stehen auch in jeder Materialdatei unter „Notizen“. Optionale Unsicherheiten bleiben unbekannt; aus diesen Richtwerten werden keine Messunsicherheiten erfunden.

Die Rechnung verwendet N = n + i k. k = 0 bezeichnet bei transparenten Einträgen eine Modellnäherung, keinen Nachweis exakt verschwindender Absorption. Bei anderer Wellenlänge müssen passende n/k eingesetzt werden; das Ändern der Wellenlänge rechnet die Bibliothekswerte **nicht** automatisch um.

## Materialien

| Material | n | k | Herkunft / Annahme |
|---|---:|---:|---|
| Luft | 1 | 0 | Transparentes Einfallsmedium, n ≈ 1 |
| Si | 3,882 | 0,019 | [Quelle](https://www.filmetrics.com/products/instruments/refractive-index-database/si) |
| SiO2 (nativ) | 1,46 | 0 | [Quelle](https://www.filmetrics.com/products/instruments/refractive-index-database/sio2); n = 1,46 als gemeinsamer gerundeter Startwert |
| SiO2 (trocken) | 1,46 | 0 | [Quelle](https://www.filmetrics.com/products/instruments/refractive-index-database/sio2); n = 1,46 als gemeinsamer gerundeter Startwert |
| SiO2 (nass) | 1,46 | 0 | [Quelle](https://www.filmetrics.com/products/instruments/refractive-index-database/sio2); n = 1,46 als gemeinsamer gerundeter Startwert |
| Quarzglas (amorphes SiO2) | 1,457 | 0 | [Quelle](https://www.filmetrics.com/products/instruments/refractive-index-database/sio2) |
| Al2O3 (ALD) | 1,65 | 0 | [Quelle](https://www.sciencedirect.com/science/article/abs/pii/S0925346720307114) |
| HfO2 (Film) | 1,91 | 0 | [Quelle](https://www.filmetrics.com/products/instruments/refractive-index-database/hfo2); prozessabhängiger Richtwert, kein festes ALD-Rezept |
| TiO2 (ALD, 120 °C) | 2,389 | 2,1e-05 | [Quelle](https://doi.org/10.1103/PhysRevLett.115.177402); linear interpoliert und gerundet |
| Si3N4 | 2,023 | 0 | [Quelle](https://www.filmetrics.com/products/instruments/refractive-index-database/si3n4) |
| ITO | 1,858 | 0,058 | [Quelle](https://www.filmetrics.com/products/instruments/refractive-index-database/ito) |
| PMMA | 1,489 | 0 | [Quelle](https://doi.org/10.1364/AO.39.002067) |
| Polystyrol (PS) | 1,587 | 0 | [Quelle](https://bangslabs.com/technical-library/material-properties-of-polystyrene-and-polymethyl-methacrylate-pmma-microspheres/) |
| PDMS | 1,41 | 0 | [Quelle](https://epub.uni-bayreuth.de/id/eprint/120/1/Diss_Kuznetsov.pdf) |
| Glas (N-BK7) | 1,51509 | 0 | [Quelle](https://us.shop.schott.com/advanced-optics/en/Optical-Glass/SCHOTT-N-BK7/c/glass-SCHOTT%20N-BK7%C2%AE) |
| Glas (BOROFLOAT 33) | 1,47 | 0 | [Quelle](https://www.schott.com/en-us/products/borofloat/technical-details) |
| Au | 0,184 | 3,431 | [Quelle](https://doi.org/10.1103/PhysRevB.6.4370); linear interpoliert und gerundet |
| Ag | 0,0563 | 4,276 | [Quelle](https://doi.org/10.1103/PhysRevB.6.4370); linear interpoliert und gerundet |
| Al | 1,448 | 7,537 | [Quelle](https://doi.org/10.1364/AO.34.004755); linear interpoliert und gerundet |
| Wasser (20 °C) | 1,33211 | 0 | [Quelle](https://doi.org/10.1364/AO.46.003811) |

## Natives, nass und trocken gewachsenes SiO2

Die drei Einträge sind bewusst getrennt, beginnen aber jeweils mit **n = 1,46, k = 0**. Der dichte SiO2-Referenzwert bei 632,8 nm liegt um 1,457; 1,46 ist hier ein sinnvoll gerundeter Modellansatz. Es gibt keinen zuverlässigen universellen Zahlenversatz allein aus den Bezeichnungen „nativ“, „wet“ und „dry“. Dichte, OH-/Wassergehalt, Stöchiometrie, Grenzschicht und Nachbehandlung beeinflussen den tatsächlichen Wert. Bei nur etwa 1–2 nm nativem Oxid kann ein homogenes SiO2-Modell zudem nur eine effektive Beschreibung sein. Eine feste Prozesskorrektur würde mehr Genauigkeit vortäuschen, als bekannt ist. Den nativen Film zunächst mit n = 1,46 und d = 1,5 nm fixieren, wenn der darüberliegende Film bestimmt werden soll; bei bekannten Kalibrierwerten entsprechend ändern.

## ALD-Al2O3 und weitere Filme

Für amorphes **ALD-Al2O3** ist n = 1,65, k = 0 ein gebräuchlicher Ausgangspunkt. [Die Untersuchung von TMA/H2O- und TMA/O3-Filmen](https://www.sciencedirect.com/science/article/abs/pii/S0925346720307114) berichtet etwa 1,64 bzw. 1,65. Temperatur, Oxidationsmittel, Dichte und Wasseraufnahme sind relevant. Dies ist kein Saphirwert. HfO2 und ITO sind ebenfalls stark prozessabhängig. Der TiO2-Eintrag bezieht sich ausdrücklich auf den publizierten ALD-Datensatz, nicht auf beliebige TiO2-Kristalle.

## Schichtmodelle

Die Modellnamen lesen sich **vom Substrat zur Oberfläche**. Im Editor und in den JSON-Arrays stehen die endlichen Filme **von oben nach unten**. Luft ist jeweils das Einfallsmedium. Die Nummerierung zählt weiterhin vom Substrat [0] nach oben.

| Modell | Schichten vom Substrat nach oben, Anfangsdicken |
|---|---|
| Si (oxidfrei) | keine Filme |
| Si + SiO2 (trocken) | SiO2 (trocken) 80 nm |
| Si + SiO2 (nass) | SiO2 (nass) 100 nm |
| Si + natives SiO2 | SiO2 (nativ) 1,5 nm |
| Si + natives SiO2 + Al2O3 (ALD) | SiO2 (nativ) 1,5 nm; Al2O3 (ALD) 20 nm |
| Si + natives SiO2 + PMMA | SiO2 (nativ) 1,5 nm; PMMA 100 nm |
| Si + natives SiO2 + Polystyrol | SiO2 (nativ) 1,5 nm; Polystyrol (PS) 100 nm |
| Si + Si3N4 | Si3N4 80 nm |
| Si + natives SiO2 + HfO2 | SiO2 (nativ) 1,5 nm; HfO2 (Film) 10 nm |
| Glas (N-BK7) + Polystyrol | Polystyrol (PS) 100 nm |
| Glas (N-BK7) + PMMA | PMMA 100 nm |
| Glas (BOROFLOAT 33) + ITO | ITO 100 nm |

Die Vorlagen enthalten angenommene, endliche Anfangsdicken. **Neu per „Schicht hinzufügen“ eingefügte Filme starten unverändert bei 0 nm.** Die Bibliotheksmodelle ändern keine vorhandenen eigenen Modell- oder Sitzungsdateien.

## Polymer auf Glas

**Ja, Ellipsometrie auf Glas ist möglich.** Die Vorlagen für Polystyrol und PMMA auf N-BK7 sind enthalten, zusätzlich ITO auf BOROFLOAT 33. Voraussetzung für den aktuellen Rechenkern: Die Reflexion an der Glasrückseite darf nicht zum Detektorsignal beitragen, etwa durch räumliche Strahltrennung oder geeignete Unterdrückung. Transparentes Glas wird hier als halbunendliches Substrat behandelt; eine Glasdicke und inkohärente Rückseitenbeiträge werden nicht berechnet. Ein reales Objektträgerglas ist nicht automatisch N-BK7 oder BOROFLOAT 33.

Der Indexkontrast ist häufig kleiner als auf Si. Bei PMMA/N-BK7 ist er besonders gering; Polystyrol/N-BK7 bietet mehr Kontrast. Zusätzliche geeignete Messwinkel und ein bekanntes Polymer-n helfen. Trotzdem kann die Empfindlichkeit zu gering sein; die Aufnahme als Vorlage behauptet keine eindeutige Bestimmbarkeit. [HORIBA erläutert die Schwierigkeiten transparenter Filme auf transparenten Substraten](https://www.horiba.com/fileadmin/uploads/Scientific/Documents/TFilm/SE32.pdf).

## Quellen und Aufbereitung

Die Tabelle und jede Materialdatei verlinken die jeweilige Herkunft. Herstellerangaben von KLA/Filmetrics und SCHOTT, publizierte Polymerwerte sowie einzelne interpolierte Literaturwerte werden als Richtwerte verwendet. Au/Ag stammen aus Johnson & Christy (1972), Al aus Rakić (1995), TiO2 aus dem numerischen Datensatz zu Zhukovsky et al. (2015), Wasser aus der Formel von Daimon & Masumura (2007). Für die Einzelwert-Auswertung wurden die zugehörigen frei verfügbaren [CC0-Datensätze von refractiveindex.info](https://github.com/polyanskiy/refractiveindex.info-database) verwendet. Es werden keine vollständigen fremden Datentabellen gebündelt.

Literatur- oder Herstellertypwerte dürfen die Kalibrierung mit einer bekannten Probe nicht ersetzen. Reale Haftschichten, Oxide, Rauigkeit oder Anisotropie sind nur enthalten, wenn das entsprechende zulässige Schichtmodell sie ausdrücklich beschreibt.

## Vorhandene eigene Bibliotheksordner

Wer in ElliFit einen anderen Material-/Modellordner gespeichert hat, sieht weiterhin diesen Ordner. Die neuen JSON-Dateien aus `materials` beziehungsweise `models` in den eigenen Ordner **ergänzen** oder den Ordner in der Oberfläche umstellen. Eigene Dateien mit gleichem Namen vor einem Ersetzen sichern. Alte Dateien mit „Beispiel“ im Namen können in einer übernommenen Bibliothek weiter existieren; ElliFit benennt eigene Dateien nicht automatisch um.
