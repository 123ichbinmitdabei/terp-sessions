-- =============================================================================
-- Sessions PWA — Backend-Patch v8.7.5 / Paket 12b.3 A7: Werks-Sorten-Migration
-- =============================================================================
-- Migriert 127 in der App eingebettete Werks-Aroma-Sorten in
-- community_strains mit is_factory_seed=true. Owner ist ein spezieller
-- FACTORY-User in csc_users der nicht login-bar ist (pin_hash entspricht
-- keiner valid bcrypt-Hash-Form, also kann crypt(pin, pin_hash) niemals
-- erfolgreich vergleichen).
--
-- IDEMPOTENZ: 'on conflict do nothing' beim User; bei den Sorten:
-- Existenz-Check via author_code='FACTORY' AND name=src.name. Re-Run
-- aktualisiert NICHT (würde manuelle Edits durch Admins ueberschreiben).
--
-- DEPLOYMENT: im Supabase SQL-Editor ausfuehren. Vorher empfohlen:
-- Backup der community_strains-Tabelle. KEINE Aenderung an csc-backend.sql.
-- =============================================================================

-- ── FACTORY-Pseudo-User ────────────────────────────────────────────────────
-- bcrypt-Hashes beginnen mit \$2[abxy]\$. Unser Hash ist ein literaler String
-- der nicht-bcrypt ist → crypt() failed silently mit "wrong hash" → kein
-- erfolgreiches Login moeglich. Pseudonym 'Werk' macht es im Admin-UI sichtbar.

insert into csc_users (
  code, pin_hash, pin_salt, kdf_salt, hkdf_salt, encrypted_seed, encrypted_seed_iv
) values (
  'FACTORY',
  '$$NO_LOGIN_FOR_FACTORY_USER$$',
  '',
  'factory-kdf-salt-padding-XXXX',
  'factory-hkdf-salt-padding-XX',
  'factory-encrypted-seed-padding',
  'factory-iv-padding'
)
on conflict (code) do nothing;

update csc_users set pseudonym = 'Werk' where code = 'FACTORY' and pseudonym is null;

-- ── 127 Werks-Sorten ──────────────────────────────────────────────
insert into community_strains (
  author_code, show_pseudonym, is_factory_seed,
  name, genetics, terpenes, temp_min, temp_recommended, temp_max, description
)
select 'FACTORY', false, true, src.name, src.genetics, src.terpenes,
       src.temp_min, src.temp_recommended, src.temp_max, src.description
from (values
  ('Sativa allgemein', 'sativa'::text, ARRAY['limonene','pinene']::text[], 180::int, 190::int, 200::int, 'Energetisch, klar, kreative Sorten'),
  ('Indica allgemein', 'indica'::text, ARRAY['myrcene','linalool']::text[], 180::int, 195::int, 210::int, 'Entspannend, schwer, abendlich'),
  ('Hybrid balanciert', 'hybrid'::text, ARRAY[]::text[], 180::int, 190::int, 200::int, 'Ausgewogen Sativa/Indica'),
  ('CBD-Sorten', null::text, ARRAY[]::text[], 160::int, 175::int, 180::int, 'CBD verdampft ab 160°C, mild'),
  ('Mikro-Dose', null::text, ARRAY[]::text[], 155::int, 170::int, 180::int, 'Sehr sanft, Terpene erhalten'),
  ('Amnesia Haze', 'sativa'::text, ARRAY['limonene']::text[], 175::int, 185::int, 195::int, 'Zitrus, Erde, energiegeladen'),
  ('Super Lemon Haze', 'sativa'::text, ARRAY['limonene']::text[], 170::int, 185::int, 200::int, 'Intensiv zitrusartig, klare Sativa'),
  ('Jack Herer', 'sativa'::text, ARRAY['pinene','terpinolene']::text[], 175::int, 185::int, 195::int, 'Pinie, Erde, klar'),
  ('Sour Diesel', 'sativa'::text, ARRAY['caryophyllene','limonene']::text[], 175::int, 185::int, 195::int, 'Diesel, Zitrus, energetisch'),
  ('Durban Poison', 'sativa'::text, ARRAY['terpinolene']::text[], 175::int, 185::int, 195::int, 'Süß, anis-artig, fokussiert'),
  ('Green Crack', 'sativa'::text, ARRAY['myrcene','pinene']::text[], 175::int, 185::int, 195::int, 'Mango-süß, sehr energetisch'),
  ('Maui Wowie', 'sativa'::text, ARRAY['limonene']::text[], 170::int, 180::int, 195::int, 'Tropisch-süß, leicht'),
  ('Tangie', 'sativa'::text, ARRAY['limonene','myrcene']::text[], 170::int, 185::int, 195::int, 'Mandarine, citrusbombe'),
  ('Northern Lights', 'indica'::text, ARRAY['myrcene','caryophyllene']::text[], 180::int, 195::int, 210::int, 'Süß, erdig, klassische Indica'),
  ('Granddaddy Purple', 'indica'::text, ARRAY['myrcene','linalool']::text[], 185::int, 200::int, 215::int, 'Beeren, süß, schwere Indica'),
  ('Bubba Kush', 'indica'::text, ARRAY['caryophyllene','myrcene']::text[], 185::int, 200::int, 215::int, 'Schokoladig, sehr schwer'),
  ('Critical Mass', 'indica'::text, ARRAY['myrcene']::text[], 180::int, 195::int, 210::int, 'Süß, erdig, beruhigend'),
  ('Afghan Kush', 'indica'::text, ARRAY['caryophyllene','humulene']::text[], 180::int, 195::int, 215::int, 'Hash-würzig, tiefenentspannend'),
  ('Purple Kush', 'indica'::text, ARRAY['myrcene','pinene']::text[], 185::int, 200::int, 215::int, 'Beerig-süß, schwer'),
  ('Hindu Kush', 'indica'::text, ARRAY['myrcene','limonene']::text[], 185::int, 200::int, 215::int, 'Sandelholz, beruhigend'),
  ('Master Kush', 'indica'::text, ARRAY['caryophyllene']::text[], 180::int, 195::int, 210::int, 'Erdig-zitrusartig, klassisch'),
  ('Skywalker OG', 'indica'::text, ARRAY['caryophyllene','limonene']::text[], 180::int, 195::int, 210::int, 'Pinie-erdig, kraftvoll'),
  ('White Widow', 'hybrid'::text, ARRAY['myrcene','pinene']::text[], 180::int, 190::int, 200::int, 'Erdig-würzig, ausgewogen'),
  ('Blue Dream', 'hybrid'::text, ARRAY['myrcene','pinene']::text[], 175::int, 185::int, 195::int, 'Beerig, ausgleichend'),
  ('OG Kush', 'hybrid'::text, ARRAY['myrcene','limonene']::text[], 180::int, 190::int, 205::int, 'Erdig-zitrusartig, kraftvoll'),
  ('Skunk #1', 'hybrid'::text, ARRAY['myrcene']::text[], 180::int, 190::int, 205::int, 'Klassisch skunky'),
  ('Pineapple Express', 'hybrid'::text, ARRAY['caryophyllene','limonene']::text[], 175::int, 185::int, 200::int, 'Tropisch-süß'),
  ('AK-47', 'hybrid'::text, ARRAY['caryophyllene']::text[], 175::int, 185::int, 200::int, 'Erdig-süß, langer Effekt'),
  ('Gelato', 'hybrid'::text, ARRAY['caryophyllene','limonene']::text[], 180::int, 190::int, 200::int, 'Süß, dessert-artig'),
  ('Wedding Cake', 'hybrid'::text, ARRAY['limonene','caryophyllene']::text[], 180::int, 195::int, 210::int, 'Vanille, süß, schwer'),
  ('Girl Scout Cookies', 'hybrid'::text, ARRAY['caryophyllene','limonene']::text[], 180::int, 195::int, 205::int, 'Süß-erdig, Hybrid-Klassiker'),
  ('Runtz', 'hybrid'::text, ARRAY['caryophyllene']::text[], 180::int, 195::int, 205::int, 'Bonbon-süß, tropisch'),
  ('Zkittlez', 'hybrid'::text, ARRAY['caryophyllene','humulene']::text[], 175::int, 190::int, 200::int, 'Beerig-bonbon, ausgewogen'),
  ('Sherbet', 'hybrid'::text, ARRAY['caryophyllene']::text[], 180::int, 190::int, 205::int, 'Süß-cremig, ausgewogen'),
  ('Do-Si-Dos', 'hybrid'::text, ARRAY['limonene','caryophyllene']::text[], 185::int, 195::int, 210::int, 'Süß-floral, indica-lastig'),
  ('Mimosa', 'hybrid'::text, ARRAY['limonene']::text[], 175::int, 185::int, 200::int, 'Zitrus-fruchtig, sativa-lastig'),
  ('Gorilla Glue #4', 'hybrid'::text, ARRAY['caryophyllene','limonene']::text[], 180::int, 195::int, 210::int, 'Erdig-süß, sehr kraftvoll'),
  ('Bruce Banner', 'hybrid'::text, ARRAY['caryophyllene','myrcene']::text[], 180::int, 190::int, 205::int, 'Erdig-süß, kraftvoll'),
  ('Cherry Pie', 'hybrid'::text, ARRAY['myrcene','caryophyllene']::text[], 175::int, 190::int, 205::int, 'Süß-fruchtig'),
  ('GSC (Cookies)', 'hybrid'::text, ARRAY['caryophyllene','limonene']::text[], 180::int, 195::int, 205::int, 'Süß-erdig wie GSC'),
  ('Strawberry Cough', 'sativa'::text, ARRAY['myrcene','limonene']::text[], 175::int, 185::int, 195::int, 'Erdbeer-süß, sativa'),
  ('Lemon Skunk', 'hybrid'::text, ARRAY['limonene','myrcene']::text[], 175::int, 185::int, 195::int, 'Zitrusartig skunky'),
  ('Chemdog', 'hybrid'::text, ARRAY['caryophyllene','myrcene']::text[], 180::int, 195::int, 210::int, 'Diesel-erdig, kraftvoll'),
  ('Sundae Driver', 'hybrid'::text, ARRAY['caryophyllene','limonene']::text[], 180::int, 190::int, 205::int, 'Süß-cremig'),
  ('Forbidden Fruit', 'hybrid'::text, ARRAY['caryophyllene','myrcene']::text[], 180::int, 195::int, 205::int, 'Tropisch fruchtig'),
  ('Ice Cream Cake', 'indica'::text, ARRAY['limonene','caryophyllene']::text[], 185::int, 195::int, 210::int, 'Süß-cremig, schwere Indica'),
  ('MAC (Miracle Alien Cookies)', 'hybrid'::text, ARRAY['limonene','caryophyllene']::text[], 180::int, 190::int, 205::int, 'Komplex süß-fruchtig'),
  ('Charas / klassischer Hash', null::text, ARRAY['humulene','caryophyllene']::text[], 175::int, 195::int, 215::int, 'Würzig, lange Tradition'),
  ('Marokkanisches Hash', null::text, ARRAY['humulene']::text[], 180::int, 200::int, 215::int, 'Erdig, weich, sandig'),
  ('Nederwiet generisch', 'hybrid'::text, ARRAY[]::text[], 180::int, 190::int, 200::int, 'Klassische Coffeeshop-Qualität'),
  ('Lavendel-aromatisch (Linalool)', null::text, ARRAY['linalool']::text[], 155::int, 170::int, 185::int, 'Linalool-reich, sehr entspannend'),
  ('Zitrusartig (Limonen)', null::text, ARRAY['limonene']::text[], 160::int, 175::int, 190::int, 'Limonen-reich, hellt auf'),
  ('Pinie/waldig (Pinen)', null::text, ARRAY['pinene']::text[], 150::int, 170::int, 185::int, 'Pinen, fördert Konzentration'),
  ('Pfeffer/würzig (Caryophyllen)', null::text, ARRAY['caryophyllene']::text[], 170::int, 190::int, 205::int, 'Caryophyllen, entzündungshemmend'),
  ('Erdig/moschus (Myrcen)', null::text, ARRAY['myrcene']::text[], 170::int, 185::int, 200::int, 'Myrcen-dominant, beruhigend'),
  ('Hopfen/würzig (Humulen)', null::text, ARRAY['humulene']::text[], 180::int, 195::int, 210::int, 'Humulen, appetithemmend'),
  ('Mango/tropisch (Terpinolen)', null::text, ARRAY['terpinolene']::text[], 170::int, 185::int, 195::int, 'Terpinolen, frisch-fruchtig'),
  ('Sour Diesel', 'sativa'::text, ARRAY['caryophyllene','limonene']::text[], 180::int, 195::int, 210::int, 'Klassischer Diesel-Sativa, energiereich'),
  ('Jack Herer', 'sativa'::text, ARRAY['pinene','terpinolene']::text[], 175::int, 190::int, 205::int, 'Würzig-piney, klar im Kopf'),
  ('Durban Poison', 'sativa'::text, ARRAY['terpinolene','myrcene']::text[], 175::int, 190::int, 200::int, 'Pure südafrikanische Sativa, anise-würzig'),
  ('Super Lemon Haze', 'sativa'::text, ARRAY['limonene','terpinolene']::text[], 175::int, 185::int, 200::int, 'Zitrus dominant, uplifting'),
  ('Green Crack', 'sativa'::text, ARRAY['myrcene','caryophyllene']::text[], 180::int, 190::int, 205::int, 'Energetisch, mango-süß'),
  ('Tangie', 'sativa'::text, ARRAY['limonene','myrcene']::text[], 175::int, 185::int, 200::int, 'Mandarinen-süß, kreativ'),
  ('Lemon Haze', 'sativa'::text, ARRAY['limonene','pinene']::text[], 175::int, 185::int, 200::int, 'Frisch zitronig'),
  ('Northern Lights', 'indica'::text, ARRAY['myrcene','pinene']::text[], 180::int, 195::int, 210::int, 'Legendäre tiefe Indica, schlaffördernd'),
  ('Granddaddy Purple', 'indica'::text, ARRAY['myrcene','caryophyllene']::text[], 180::int, 195::int, 210::int, 'Beeren-süß, schwere Körperwirkung'),
  ('Bubba Kush', 'indica'::text, ARRAY['caryophyllene','limonene']::text[], 185::int, 200::int, 215::int, 'Erdig-kaffeeartig, stark sedierend'),
  ('Hindu Kush', 'indica'::text, ARRAY['caryophyllene','myrcene']::text[], 180::int, 195::int, 210::int, 'Reine Landrasse, erdig-sandalwürzig'),
  ('Skywalker OG', 'indica'::text, ARRAY['caryophyllene','limonene']::text[], 185::int, 195::int, 210::int, 'OG-Linie mit Skywalker-Crossing, körperlastig'),
  ('Purple Punch', 'indica'::text, ARRAY['caryophyllene','limonene']::text[], 185::int, 195::int, 210::int, 'Traube-Kirsch, abendgeeignet'),
  ('9 Pound Hammer', 'indica'::text, ARRAY['myrcene','pinene']::text[], 185::int, 200::int, 215::int, 'Trauben-aromatisch, sehr stark sedierend'),
  ('Master Kush', 'indica'::text, ARRAY['myrcene','caryophyllene']::text[], 180::int, 195::int, 210::int, 'Erdig-würzig, balanced Indica'),
  ('OG Kush', 'hybrid'::text, ARRAY['myrcene','limonene','caryophyllene']::text[], 180::int, 195::int, 210::int, 'Ikonisch erdig-zitronig, vielseitig'),
  ('Pineapple Express', 'hybrid'::text, ARRAY['caryophyllene','limonene']::text[], 175::int, 190::int, 205::int, 'Tropisch fruchtig, ausgewogen'),
  ('Girl Scout Cookies', 'hybrid'::text, ARRAY['caryophyllene','limonene']::text[], 180::int, 195::int, 205::int, 'Süß-erdig, vielseitig wirkend'),
  ('Wedding Cake', 'hybrid'::text, ARRAY['caryophyllene','limonene']::text[], 180::int, 195::int, 210::int, 'Vanille-süß, ausgewogen-stark'),
  ('Cherry Pie', 'hybrid'::text, ARRAY['caryophyllene','myrcene']::text[], 180::int, 190::int, 205::int, 'Süß-fruchtig, ausgleichend'),
  ('Cookies & Cream', 'hybrid'::text, ARRAY['caryophyllene','limonene']::text[], 180::int, 195::int, 205::int, 'Cremig-süß, ausgleichend'),
  ('Headband', 'hybrid'::text, ARRAY['caryophyllene','myrcene']::text[], 180::int, 195::int, 210::int, 'Zitrus-Diesel, deutliche Wirkung im Kopf'),
  ('Trainwreck', 'hybrid'::text, ARRAY['terpinolene','pinene']::text[], 180::int, 195::int, 210::int, 'Zitrus-Kiefer, schnell wirkend'),
  ('White Widow', 'hybrid'::text, ARRAY['myrcene','pinene']::text[], 180::int, 195::int, 205::int, 'Klassischer harzreicher Hybrid'),
  ('AK-47', 'hybrid'::text, ARRAY['myrcene','caryophyllene']::text[], 180::int, 190::int, 205::int, 'Erdig-süß, langanhaltend'),
  ('Pineapple Chunk', 'hybrid'::text, ARRAY['pinene','myrcene']::text[], 180::int, 195::int, 205::int, 'Ananas-erdig'),
  ('Runtz', 'hybrid'::text, ARRAY['limonene','caryophyllene']::text[], 180::int, 195::int, 210::int, 'Süß-fruchtig, hohe Potenz'),
  ('Zkittlez', 'hybrid'::text, ARRAY['caryophyllene','humulene']::text[], 180::int, 195::int, 205::int, 'Beerenmix-süß, entspannend'),
  ('Gelato', 'hybrid'::text, ARRAY['caryophyllene','limonene']::text[], 180::int, 195::int, 210::int, 'Dessert-süß, ausbalanciert'),
  ('Sherbert', 'hybrid'::text, ARRAY['caryophyllene','limonene']::text[], 180::int, 195::int, 205::int, 'Cremig-fruchtig'),
  ('Biscotti', 'hybrid'::text, ARRAY['caryophyllene','limonene']::text[], 180::int, 195::int, 210::int, 'Erdig-kaffeesüß, kräftig'),
  ('Apple Fritter', 'hybrid'::text, ARRAY['caryophyllene','limonene']::text[], 180::int, 195::int, 210::int, 'Süß-erdig, gut für den Abend'),
  ('Mimosa', 'sativa'::text, ARRAY['limonene','myrcene']::text[], 175::int, 190::int, 200::int, 'Zitrus-spritzig, tageslicht-Sativa-leaning'),
  ('Dosidos', 'indica'::text, ARRAY['caryophyllene','limonene']::text[], 185::int, 200::int, 210::int, 'Tief erdig-süß, körperlich'),
  ('Khalifa Kush', 'hybrid'::text, ARRAY['myrcene','limonene']::text[], 180::int, 195::int, 210::int, 'OG-Linie, kräftiger Kopf-Hit'),
  ('Sunset Sherbet', 'hybrid'::text, ARRAY['caryophyllene','limonene']::text[], 180::int, 195::int, 210::int, 'Cremig mit Frucht-Anklang'),
  ('Donny Burger', 'indica'::text, ARRAY['caryophyllene','myrcene']::text[], 185::int, 200::int, 210::int, 'Gas-würzig, schwer'),
  ('Slurricane', 'indica'::text, ARRAY['caryophyllene','limonene']::text[], 185::int, 195::int, 210::int, 'Traubig-süß, lange Wirkung'),
  ('Pink Rozay', 'indica'::text, ARRAY['caryophyllene','limonene']::text[], 185::int, 195::int, 210::int, 'Süß-blumig, body-load'),
  ('Black Cherry Gelato', 'hybrid'::text, ARRAY['caryophyllene','myrcene']::text[], 180::int, 195::int, 210::int, 'Beerig, ausbalanciert'),
  ('Banana OG', 'indica'::text, ARRAY['caryophyllene','limonene']::text[], 185::int, 195::int, 210::int, 'Bananig-süß, stark körperlich'),
  ('Harlequin (5:2 CBD:THC)', null::text, ARRAY['myrcene','pinene']::text[], 160::int, 175::int, 185::int, 'CBD-betont, klarer Kopf, schmerzlindernd'),
  ('ACDC (~20:1 CBD:THC)', null::text, ARRAY['myrcene','pinene']::text[], 160::int, 175::int, 185::int, 'Sehr hohes CBD, kaum Rausch'),
  ('Cannatonic (1:1)', null::text, ARRAY['myrcene','pinene']::text[], 160::int, 175::int, 185::int, '1:1 CBD:THC, ausgewogen'),
  ('Charlotte’s Web', null::text, ARRAY['myrcene','caryophyllene']::text[], 160::int, 170::int, 185::int, 'CBD-Klassiker, sehr entspannend'),
  ('CBD Critical Mass', null::text, ARRAY['myrcene']::text[], 160::int, 175::int, 185::int, 'CBD-betont, beruhigend'),
  ('Stephen Hawking Kush', null::text, ARRAY['myrcene','caryophyllene']::text[], 170::int, 180::int, 195::int, 'CBD:THC ~1:1, klar entspannend'),
  ('Ringo’s Gift', null::text, ARRAY['myrcene','pinene']::text[], 160::int, 175::int, 185::int, 'CBD-dominant, klar im Kopf'),
  ('Remedy', null::text, ARRAY['myrcene']::text[], 160::int, 175::int, 185::int, 'Reines CBD, kaum THC'),
  ('Bedrocan (medizinisch Sativa)', 'sativa'::text, ARRAY['myrcene','pinene']::text[], 180::int, 195::int, 205::int, 'Standardisierte medizinische Sativa'),
  ('Bediol (1:1 CBD:THC)', null::text, ARRAY['myrcene','caryophyllene']::text[], 160::int, 175::int, 185::int, 'Medizinisch ausgewogen'),
  ('Bedrolite (CBD-hoch)', null::text, ARRAY['myrcene']::text[], 160::int, 175::int, 185::int, 'Sehr hohes CBD, kaum Rausch'),
  ('Pedanios 22/1', 'hybrid'::text, ARRAY['caryophyllene','myrcene']::text[], 180::int, 195::int, 210::int, 'Hochpotente medizinische Sorte'),
  ('Pedanios 14/1', 'hybrid'::text, ARRAY['myrcene','caryophyllene']::text[], 180::int, 190::int, 205::int, 'Mittlere Potenz, medizinisch'),
  ('Princeton', 'hybrid'::text, ARRAY['caryophyllene','limonene']::text[], 180::int, 195::int, 205::int, 'Balanced Hybrid, medizinisch'),
  ('Mikro-Dose / Balanced 5:5', null::text, ARRAY[]::text[], 160::int, 175::int, 190::int, '1:1 zum sehr leichten Tagestest'),
  ('Acapulco Gold', 'sativa'::text, ARRAY['pinene','caryophyllene']::text[], 180::int, 195::int, 205::int, 'Mexikanische Landrasse, hellsativa'),
  ('Panama Red', 'sativa'::text, ARRAY['caryophyllene','myrcene']::text[], 180::int, 195::int, 205::int, 'Klassische rote Landrasse'),
  ('Thai Stick', 'sativa'::text, ARRAY['terpinolene','myrcene']::text[], 180::int, 195::int, 205::int, 'Thailändische Landrasse, klar'),
  ('Afghan Kush', 'indica'::text, ARRAY['myrcene','caryophyllene']::text[], 185::int, 195::int, 210::int, 'Landrasse, klassisch sedierend'),
  ('Lamb’s Bread', 'sativa'::text, ARRAY['pinene','limonene']::text[], 180::int, 195::int, 205::int, 'Jamaikanische Sativa, uplifting'),
  ('Malawi Gold', 'sativa'::text, ARRAY['pinene','terpinolene']::text[], 180::int, 195::int, 205::int, 'Reine afrikanische Sativa'),
  ('Hawaiian Snow', 'sativa'::text, ARRAY['limonene','terpinolene']::text[], 175::int, 190::int, 205::int, 'Süß-tropisch, sativa-leaning'),
  ('Bubble Hash', null::text, ARRAY['caryophyllene','myrcene']::text[], 190::int, 205::int, 215::int, 'Eishash, sauber, sehr kraftvoll'),
  ('Dry Sift Hash', null::text, ARRAY['humulene','myrcene']::text[], 190::int, 205::int, 215::int, 'Trockensiebung, klassisch'),
  ('Libanese Red', null::text, ARRAY['humulene']::text[], 190::int, 205::int, 215::int, 'Libanesischer Roter, würzig'),
  ('Afghan Black', null::text, ARRAY['caryophyllene','myrcene']::text[], 190::int, 205::int, 215::int, 'Klassisches schwarzes Hash'),
  ('Niedertemp 160 °C (CBD-Modus)', null::text, ARRAY[]::text[], 150::int, 160::int, 170::int, 'Klares CBD-Profil, kaum Psychoaktivität'),
  ('Mitteltemp 180 °C (ausgewogen)', null::text, ARRAY[]::text[], 170::int, 180::int, 190::int, 'Ausgewogen für täglichen Gebrauch'),
  ('Hochtemp 210 °C (stark)', null::text, ARRAY[]::text[], 195::int, 205::int, 215::int, 'Volle Cannabinoid-Extraktion')
) as src(name, genetics, terpenes, temp_min, temp_recommended, temp_max, description)
where not exists (
  select 1 from community_strains cs
  where cs.author_code = 'FACTORY' and cs.name = src.name
);

-- =============================================================================
-- ENDE Werks-Migration (127 Sorten)
-- =============================================================================
