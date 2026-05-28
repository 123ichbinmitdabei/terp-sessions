# CSC-Mode — Sicherheitsdoku (v8.5.0-prep)

> Status: **Backend-Schema + dormant Client committed; Feature-Flag default AUS; KEIN Live-Push als Feature.**
> Andre muss vor Aktivierung das Supabase-Projekt anlegen, `csc-backend.sql` ausführen, `csc-config.json` mit URL + Anon-Key befüllen und die 5 Selbst-Angriffe gegen die echte Instanz laufen lassen.

## Threat-Model

Daten: Cannabis-Konsumdaten je Session (Stärke 1–10, Effekt, Aroma, Gerät, Start-Zeit, Dauer). Nach DSGVO Art. 9 **besondere Daten** (Gesundheit), pseudonym per CSC-Code.

Angreifer:
1. Person mit Kenntnis des Anon-Keys (öffentlich im PWA-JS).
2. Person mit Kenntnis eines fremden CSC-Codes (per Social Engineering oder Brute-Force).
3. Vertrauenswürdiger Kreis-Mitglied, das fremde Einzeldaten exfiltrieren will.
4. Verlust eines lokalen Geräts mit eingeloggtem CSC-Mode.

## Architektur

- **Tabellen** (`csc_users`, `csc_circles`, `csc_sessions`) liegen im `public`-Schema mit `enable row level security` **und ohne Policies**. PostgREST denied damit jeden direkten Zugriff für die Rollen `anon` und `authenticated`. Zusätzlich `revoke all` auf den Tabellen.
- **Operationen ausschließlich** über `SECURITY DEFINER` RPCs, die explizit für `anon` mit `grant execute` freigeschaltet sind.
- Jede RPC ruft zuerst `csc_internal_verify_pin(code, pin)`, die per `pgcrypto`/`crypt()` (`gen_salt('bf', 8)`) den bcrypt-Hash vergleicht. Falsche PINs erhöhen `failed_attempts`; ab 5 → 15-Minuten-Lockout (`locked_until`).
- Code-Format: `CSC-####` (4 Ziffern) ist Spec-konform. Pool 9 000. Eingebaut: `csc_internal_generate_code()` mit Kollisions-Retry (max 200) und Abbruch-Exception bei Erschöpfung.

## Die 5 Selbst-Angriffe — logische Bewertung (Code-Review)

> Diese Tabelle ist eine **logische Bewertung** auf Basis des SQL. Sie ersetzt **nicht** die Live-Ausführung gegen die echte Supabase-Instanz, die Andre nach dem Setup laufen lassen muss.

| # | Angriff | Erwartung | Code-Beleg |
|---|---|---|---|
| 1 | Direkter `SELECT * FROM csc_sessions` mit Anon-Key | **401/403** | `revoke all on csc_sessions from anon` + `enable row level security` ohne Policies. PostgREST liefert für anon kein Read-Recht. |
| 2 | RPC ohne PIN (z.B. `csc_pull_sessions(code, null)`) | **AUTH_FAILED** | Erste Code-Zeile jeder RPC: `ok := csc_internal_verify_pin(...)`; bei null: Regex `'^[0-9]{4,12}$'` fail → `false` → `raise exception 'AUTH_FAILED'`. |
| 3 | RPC mit falschem PIN | **AUTH_FAILED + Lockout nach 5 Versuchen** | bcrypt-Vergleich `pin_hash = crypt(p_pin, pin_hash)` schlägt fehl. `failed_attempts` inkrementiert; bei `+1 >= 5` setzt `locked_until = now() + 15 min`. Folgende Versuche werden ohne bcrypt-Vergleich (auch bei korrektem PIN!) abgelehnt, solange Lockout aktiv. |
| 4 | `csc_circle_stats` für fremden Kreis (Caller ist nicht Mitglied) | **NOT_A_MEMBER** | Explizite Prüfung: `select exists (select 1 from csc_users where code = p_code and circle_id = p_circle_id)`. Bei false → raise NOT_A_MEMBER. |
| 5 | Versuch, Einzeldaten via `csc_circle_stats` zu erhalten | **Nur Aggregate, sonst nichts** | RPC returnt nur `members`, `sessions`, `avg_strength`, `top_effect`, `enough`. Keine ID, kein Code, keine Einzel-Sessions. Bei `< 3 Mitgliedern` (k-anonymity) zusätzlich `enough=false` ohne Daten. |

## Was die Bewertung **NICHT** ersetzt

- **Real-Lauf der Angriffe** gegen die echte Supabase-Instanz mit `curl` / `psql` / dem Anon-Key.
- **Audit der Server-Logs** während eines Penetrations-Tests (sehen wir 401/403, wenn wir mit dem Anon-Key direkt zugreifen?).
- **Externe Code-Review** der SQL-Datei durch eine zweite Person.

## Selbstkritik (die 3 Pflicht-Fragen aus dem Auftrag)

1. **Habe ich geraten oder steht jede Policy-Entscheidung auf sicherem Grund?**
   Das Muster „RLS deny-all + SECURITY DEFINER RPCs" ist das **offizielle Supabase-Pattern** für Anonymous-Access-mit-Geschäftslogik (siehe Supabase-Doku → „Privileged Functions"). bcrypt via pgcrypto ist Standard. Brute-Force-Lockout serverseitig. **Eine Stelle, die ich offen markiere:** der Code-Pool von 9 000 ist nach Spec, aber für eine wachsende CSC-Community knapp; in der Praxis sollte das auf 6 Ziffern (1 M) oder Alphanumerisch erweitert werden, sobald >500 Mitglieder. Das ist in `csc_internal_generate_code()` als TODO-Empfehlung kommentiert (Exception bei Erschöpfung).
2. **Kann der Anon-Key irgendwie an fremde Daten kommen?**
   Nicht in dieser SQL-Design-Logik: für jeden Lese-Pfad ist ein PIN-Vergleich vorgeschaltet, der von Lockout geschützt ist. **Restrisiko:** Verlust eines lokalen Geräts mit eingeloggtem CSC-Mode → Code+PIN liegen in `localStorage`. Dagegen hilft nur, dass der User „Abmelden" verwendet (oder die App den Speicher beim Logout wirklich säubert — siehe `cscClient.logout()`).
3. **Worst Case bei Bug in der Policy?**
   Wenn z. B. das `revoke all` vergessen wäre und RLS-Policies fehlen, könnte `anon` direkt `csc_sessions` lesen → Verlust **aller** geteilten Sessions, pseudonym per Code (kein Klarname, aber Bewegungs-/Konsumdaten). **Mitigation:** Die `revoke`-Statements sind im SQL explizit. Trotzdem **Pflicht** für Andre: nach Ausführung im Supabase-Dashboard prüfen, dass `anon` als Rolle KEIN SELECT-Recht auf die drei Tabellen hat (kannst du im Tabellen-Editor → Permissions sehen).

## Empfehlung an Andre — würde ich live nehmen?

**Nein, nicht ohne Live-Verifikation und externe Review.** Konkret:

- ✅ **Schema + RLS-Pattern**: solide. Die Architektur deny-all + SECURITY-DEFINER ist korrekt umgesetzt.
- ✅ **Client-Code**: dormant, hinter Flag. Kein Risiko durch das Mergen, weil cscEnabled default false ist und ohne `csc-config.json` ohnehin nichts passiert.
- ⚠️ **Live-Verifikation fehlt**: ohne real ausgeführte Angriffe ist die Bewertung „nur logisch". Andre muss mit `curl` testen:
  1. `curl ... /rest/v1/csc_sessions -H "apikey: $ANON"` → erwartet 401/403/404.
  2. `curl ... /rest/v1/rpc/csc_pull_sessions -d '{"p_code":"...","p_pin":null}'` → erwartet AUTH_FAILED.
  3. Falsche PINs mehrmals durchspielen → erwartet Lockout-Verhalten.
  4. Kreis mit fremdem Code abfragen → erwartet NOT_A_MEMBER.
  5. Bestätigen, dass `csc_circle_stats` keine Einzeldaten zurückgibt.
- ⚠️ **Externe Review**: bei Gesundheitsdaten ist eine zweite Person, die das SQL liest, dringend zu empfehlen.

## DSGVO-Checkliste

| Anforderung | Status |
|---|---|
| Pseudonymisierung (kein Klarname, keine E-Mail) | ✅ nur CSC-Code; weder Tabelle noch RPC verlangen personenbezogene Daten |
| Datensparsamkeit | ✅ Client schickt nur 7 Felder (id, started_at, duration_sec, device, strength, effect, aroma); `notes` bleibt lokal (Test verifiziert) |
| Einwilligung | ⏳ **UI fehlt** (dormant), Andre muss vor Aktivierung einen Einwilligungs-Dialog hinzufügen, der explizit auf Cloud-Speicherung + Art. 9 hinweist |
| Auskunftsrecht | ✅ `csc_pull_sessions` liefert dem User seine Daten |
| Löschungsrecht | ✅ `csc_delete_account` cascade-löscht alle Sessions; `cscClient.deleteAccount()` löscht zusätzlich lokale Credentials |
| Speicherort | ⏳ Andre wählt: Supabase EU-Region (Frankfurt) → kein Drittlandtransfer; **nicht** Supabase US |
| Auftragsverarbeitungsvertrag | ⏳ Supabase Inc. ist DPA-Partner; Andre muss DPA unterschreiben |
| Privacy-Policy-Eintrag | ⏳ Andre muss die Privacy Policy von Mariana ergänzen (Welche Daten, Wo, Wie lange, Rechte) |
| Logs / Audit-Trail | ⚠️ Aktuell nur `last_seen_at`; Empfehlung: keine zusätzlichen Logs anlegen, um keine Profile zu schaffen |

## Was Andre konkret tun muss

1. Neues Supabase-Projekt in **EU-Region** anlegen (eigenes, NICHT vermischt mit `csc-bewerbungen`).
2. Im SQL-Editor `csc-backend.sql` komplett ausführen.
3. Im Tabellen-Editor verifizieren: für `csc_users`, `csc_sessions`, `csc_circles` ist **kein** SELECT/INSERT/UPDATE/DELETE für `anon` oder `authenticated` sichtbar — nur `EXECUTE` auf die `csc_*` RPCs.
4. Anon-Key + URL in `csc-config.json` eintragen (Datei lokal aus `csc-config.example.json` erzeugen — sie ist gitignored).
5. Die **5 Live-Angriffe** mit `curl` durchspielen (siehe Liste oben). Wenn auch nur einer Daten preisgibt: STOPP, kontaktiere mich.
6. UI-Schritt (in einer eigenen Session): Einwilligungs-Dialog + sichtbares Setup-Akkordeon. Das ist bewusst **nicht** in diesem Prep-Commit enthalten — erst nach erfolgreicher Live-Verifikation.
7. DPA mit Supabase abschließen, Privacy-Policy ergänzen.

Erst nach Punkten 5 + 6 + 7 sollte `PREFS.cscEnabled` für echte User freischaltbar sein.
