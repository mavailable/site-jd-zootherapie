-- Mini-CRM "Prospects" — table unique par site client.
-- Appliqué sur la base D1 du projet (jdzoo-crm). Données privées (jamais servies publiquement).
CREATE TABLE IF NOT EXISTS contacts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  org         TEXT,
  phone       TEXT,
  email       TEXT,
  value       REAL,
  status      TEXT NOT NULL DEFAULT 'nouveau',
  next_action TEXT,
  next_date   TEXT,            -- date de relance, format 'YYYY-MM-DD'
  notes       TEXT,
  sort        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_next_date ON contacts(next_date);

-- Cartes d'exemple (la cliente les supprime). Marquées "(exemple)" sans ambiguïté.
INSERT INTO contacts (name, org, phone, email, value, status, next_action, next_date, notes, sort) VALUES
  ('Mme Durand (exemple)', NULL, '06 12 34 56 78', NULL, 60, 'rdv', 'Confirmer la séance découverte', date('now','+1 day'), 'Intéressée par une séance pour son fils. Exemple — à supprimer.', 0),
  ('EHPAD Les Tilleuls (exemple)', 'EHPAD Les Tilleuls', NULL, 'direction@example.org', 480, 'devis', 'Relancer après envoi du devis', date('now','-2 day'), 'Devis envoyé pour des ateliers mensuels. Exemple — à supprimer.', 0),
  ('École Jean Moulin (exemple)', 'École Jean Moulin', NULL, NULL, NULL, 'nouveau', 'Premier contact à prendre', NULL, 'Piste repérée sur un salon. Exemple — à supprimer.', 0);

-- ─── v2 : réglages CRM éditables par le client (singleton) ───
CREATE TABLE IF NOT EXISTS crm_settings (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  data       TEXT NOT NULL,                 -- JSON { columns, fields }
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── v2 : champs facturation / vente (base devis & factures). Tous nullables. ───
ALTER TABLE contacts ADD COLUMN billing_address TEXT;
ALTER TABLE contacts ADD COLUMN billing_postal  TEXT;
ALTER TABLE contacts ADD COLUMN billing_city    TEXT;
ALTER TABLE contacts ADD COLUMN billing_contact TEXT;
ALTER TABLE contacts ADD COLUMN client_siret    TEXT;
ALTER TABLE contacts ADD COLUMN order_ref       TEXT;
ALTER TABLE contacts ADD COLUMN sale_lines      TEXT;  -- JSON [{label,qty,unit_price}]
ALTER TABLE contacts ADD COLUMN sale_date       TEXT;  -- 'YYYY-MM-DD'
