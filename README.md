# ElliFit 1.2.4

Lokale Auswertung monochromatischer Ellipsometrie: Schichtmodelle und Materialien speichern und Schichtdicke, Brechungsindex oder Extinktionskoeffizient global fitten. Ein oder zwei Parameter können gleichzeitig frei sein.

**[ElliFit 1.2.4 als ZIP herunterladen](https://github.com/kangaroocry/ElliFit/archive/bf3de2ba8e11a3f598d90cf886b4208ea1cf2b89.zip)**

- [Quellcode und ausführliche Anleitung](https://github.com/kangaroocry/ElliFit/tree/ellifit-1.2)
- [Umgesetzte Verbesserungen](https://github.com/kangaroocry/ElliFit/blob/ellifit-1.2/AENDERUNGEN_1.2.md)
- [Prüfprotokoll einschließlich aktueller Bedienprüfung](https://github.com/kangaroocry/ElliFit/blob/ellifit-1.2/PRUEFPROTOKOLL.md)

Neu in 1.2.4: Autoscale berücksichtigt den farbigen 1D-Hintergrund nicht mehr. Anfang/Ende, direkte Seiten-/Messungsnummern und „Letzte Messung“ erschließen lange Listen mit einem Sprung. Unter 0,001° bleibt kräftiges Grün ohne Cyan-Stufe. Schichtkennungen wie [2] Al2O3 stehen einheitlich in Aufbau, Eingaben, Achsen und Ergebnisüberschriften.

Die RMS-Skala reicht weiterhin über klares Grün bei 0,1°, Gelb bei 1° und Rot bei 10° bis Pink beim theoretischen Maximum von 142,3°. Dieselben Farben gelten in Liste, Markern, Kontur, 3D und 1D-Hintergrund.

Seit 1.2.2 verhindert das Programm veraltete JavaScript-/CSS-Dateien aus dem Browser-Cache beim Update und prüft die Versionsübereinstimmung mit dem Rechenkern. Seit 1.2.1 enthalten sind die direkte Auswahl fix/X/Y an den Modellwerten und die rückgängig machbare Schichtbearbeitung. Enthalten sind außerdem zusammengefasste Periodenfamilien, Winkel-RMS mit festen Farbstufen und dezent gefärbtem 1D-Hintergrund, unabhängige Log-Achsen, gruppierbare Messdaten, eine Materialbibliothek, Rückgängig und konsistente deutsche Zahlenformate. Messunsicherheiten werden aus geeigneten Wiederholungen abgeleitet; statistische und optionale Kalibrierbeiträge bleiben getrennt. k kann einschließlich null über positive logarithmische Stützstellen untersucht werden.

ZIP vollständig in einen beschreibbaren Ordner entpacken. Mit vorhandenem WinPython **`Start_WinPython.bat`** doppelklicken; voreingestellt ist `C:\Programme_portable\WinPython\WPy64-31290`. Der Starter verwendet eine private Umgebung im ElliFit-Ordner, ohne WinPython oder den System-PATH zu verändern. Alternativ mit Python 3.11 oder neuer (64 Bit) `Start_Windows.bat` verwenden. Beim ersten Start werden Abhängigkeiten aus dem Internet installiert. Danach läuft das Programm lokal mit Browseroberfläche.

Die Wellenlänge bleibt editierbar, Standard 632,8 nm. Elli-kompatibles Δ ist voreingestellt; explizite Konventionen vorhandener Modelle bleiben erhalten. Materialwerte sind Beispiele und müssen zur Probe passen. Private Originalmessdateien und Handbuch werden nicht veröffentlicht.

Numerik/API und Browser wurden unter Linux geprüft. Ein echter Windows-/WinPython-Lauf wurde hier nicht durchgeführt; Windows 7 ist nicht unterstützt. Das Paket enthält Quellcode mit Startdateien, keine kompilierte EXE. Der frühere Stand bleibt auf [ellifit-1.1](https://github.com/kangaroocry/ElliFit/tree/ellifit-1.1) verfügbar.
