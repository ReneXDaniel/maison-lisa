# Online-Vorschau auf Render

Diese Anleitung bringt MAISON LISA als **passwortgeschützte Vorschau** ins Internet. Danach kannst du alle Funktionen im Browser testen, auf dem Laptop und auf dem Handy, und den Link mit anderen teilen.

In der Vorschau ist **alles echt**: Registrierung, Login, Chat in Echtzeit, Warenkorb, Rabatte, Kasse, Lisas Atelier, Uploads und Downloads. **Simuliert** sind nur drei externe Dienste, und das ist auf jeder Seite gekennzeichnet („Vorschau-Modus“):

| Dienst | In der Vorschau |
|---|---|
| E-Mail | Wird nicht verschickt, sondern landet im **Test-Postfach** (Link im Balken unten links) |
| Ausweisprüfung | Eine Testseite, auf der du „volljährig“ oder „minderjährig“ wählst |
| Zahlung | Eine Testseite, auf der du „Zahlung erfolgreich“ oder „abgelehnt“ wählst; es fließt kein Geld |

Jede Seite fragt zuerst nach dem **Vorschau-Passwort**, damit niemand Fremdes die Testseiten benutzen kann.

## Was du brauchst

- Ein **GitHub-Konto** (kostenlos): https://github.com
- Ein **Render-Konto** (kostenlos): https://render.com. Am einfachsten meldest du dich dort direkt mit GitHub an.

## Schritt 1: Leeres GitHub-Repository anlegen

1. Auf GitHub oben rechts auf **+** und dann **New repository** klicken.
2. Als Name `maison-lisa` eintragen und **Private** wählen.
3. **Keine** README, .gitignore oder Lizenz hinzufügen; das Repository muss leer sein.
4. **Create repository** klicken.
5. Claude in diesem Chat den Namen mitteilen, zum Beispiel `deinname/maison-lisa`. Claude lädt den Code dann hoch.

## Schritt 2: Vorschau auf Render erstellen

1. Bei Render anmelden und oben auf **New** und dann **Blueprint** klicken.
2. GitHub verbinden (falls noch nicht geschehen) und Render Zugriff auf das Repository `maison-lisa` geben.
3. Das Repository auswählen. Render liest die Datei `render.yaml` und zeigt einen Webdienst `maison-lisa-vorschau` und eine Datenbank `maison-lisa-db`.
4. Render fragt nach zwei Werten:
   - **PREVIEW_PASSWORD**: das Passwort für die ganze Seite (mindestens 8 Zeichen). Das gibst du allen, die testen sollen.
   - **SEED_ADMIN_PASSWORD**: Lisas Admin-Passwort (mindestens 12 Zeichen).
5. **Apply** bzw. **Deploy Blueprint** klicken.

Der erste Aufbau dauert etwa 5 bis 10 Minuten. Danach steht im Webdienst oben eine Adresse wie `https://maison-lisa-vorschau.onrender.com`.

## Schritt 3: Testen

Öffne die Adresse. Der Browser fragt nach Benutzername und Passwort:

- **Benutzername:** beliebig, zum Beispiel `vorschau`
- **Passwort:** dein PREVIEW_PASSWORD

So testest du die wichtigsten Abläufe:

- **Als Kundin oder Kunde:** registrieren, dann im Balken unten links auf **Test-Postfach** tippen und den Bestätigungslink öffnen. Danach die Ausweisprüfung starten und auf der Testseite „volljährig“ wählen. Ab jetzt funktionieren Chat, Anfragen und Kauf.
- **Als Lisa:** in einem zweiten Browser oder privaten Fenster mit `lisa@maison-lisa.test` und deinem SEED_ADMIN_PASSWORD anmelden. Du landest im Atelier.
- **Live-Chat:** Kundin und Lisa in zwei Fenstern nebeneinander. Nachrichten erscheinen sofort, mit „Zugestellt“ und „Gelesen“.
- **Rabattcode:** `LISA15` (15 % ab 30 €, ab der zweiten Bestellung). Die erste Bestellung bekommt automatisch 10 % Willkommensrabatt.

## Gut zu wissen

- **Kostenloser Tarif:** Der Server schläft nach etwa 15 Minuten ohne Besuch ein. Der nächste Aufruf dauert dann bis zu einer Minute; danach ist alles wieder schnell. Daten und Bilder bleiben dabei erhalten.
- **Kostenlose Datenbank:** Sie ist bei Render zeitlich begrenzt. Das Ablaufdatum steht im Render-Dashboard bei `maison-lisa-db`. Für dauerhaftes Testen dort auf einen bezahlten Tarif wechseln.
- **Falls der Aufbau scheitert** (zum Beispiel mit „out of memory“): im Webdienst unter **Settings** → **Instance Type** auf **Starter** wechseln und neu bauen.
- **Aktualisierungen:** Jede Änderung, die ins GitHub-Repository kommt, baut Render automatisch neu.
- **Nicht für echte Kundschaft:** Die Vorschau nimmt keine echten Zahlungen an und prüft keine echten Ausweise. Für den echten Start siehe [GO-LIVE.md](GO-LIVE.md).
