# ElliFit 1.2

Lokale Auswertung monochromatischer Ellipsometrie: Schichtmodelle und Materialien speichern und Schichtdicke, Brechungsindex oder Extinktionskoeffizient global fitten. Ein oder zwei Parameter können gleichzeitig frei sein.

**[ElliFit 1.2 als ZIP herunterladen](https://github.com/kangaroocry/ElliFit/archive/refs/heads/ellifit-1.2.zip)**

- [Quellcode und ausführliche Anleitung](https://github.com/kangaroocry/ElliFit/tree/ellifit-1.2)
- [Umgesetzte Verbesserungen](https://github.com/kangaroocry/ElliFit/blob/ellifit-1.2/AENDERUNGEN_1.2.md)
- [Prüfprotokoll: 42 Tests und 15 Browserprüfpunkte](https://github.com/kangaroocry/ElliFit/blob/ellifit-1.2/PRUEFPROTOKOLL.md)

Neu sind zusammengefasste Periodenfamilien, eine feste farbliche Fitgüte, unabhängige Log-Achsen, gruppierbare Messdaten, eine Materialbibliothek, Rückgängig und konsistente deutsche Zahlenformate. Messunsicherheiten werden aus geeigneten Wiederholungen abgeleitet; statistische und optionale Kalibrierbeiträge bleiben getrennt. k kann einschließlich null über positive logarithmische Stützstellen untersucht werden.

ZIP vollständig in einen beschreibbaren Ordner entpacken. Mit vorhandenem WinPython **`Start_WinPython.bat`** doppelklicken; voreingestellt ist `C:\Programme_portable\WinPython\WPy64-31290`. Der Starter verwendet eine private Umgebung im ElliFit-Ordner, ohne WinPython oder den System-PATH zu verändern. Alternativ mit Python 3.11 oder neuer (64 Bit) `Start_Windows.bat` verwenden. Beim ersten Start werden Abhängigkeiten aus dem Internet installiert. Danach läuft das Programm lokal mit Browseroberfläche.

Die Wellenlänge bleibt editierbar, Standard 632,8 nm. Elli-kompatibles Δ ist voreingestellt; explizite Konventionen vorhandener Modelle bleiben erhalten. Materialwerte sind Beispiele und müssen zur Probe passen. Private Originalmessdateien und Handbuch werden nicht veröffentlicht.

Numerik/API und Browser wurden unter Linux geprüft. Ein echter Windows-/WinPython-Lauf wurde hier nicht durchgeführt; Windows 7 ist nicht unterstützt. Das Paket enthält Quellcode mit Startdateien, keine kompilierte EXE. Der frühere Stand bleibt auf [ellifit-1.1](https://github.com/kangaroocry/ElliFit/tree/ellifit-1.1) verfügbar.
