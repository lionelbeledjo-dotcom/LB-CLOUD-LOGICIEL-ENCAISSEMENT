# BLOC 3 — Conformité légale France (NF525 + RGPD)

Objectif : poser une base **NF525-compatible** (inaltérabilité, chainage, archivage, FEC, TVA) et les briques **RGPD** (export, suppression, consentement, politique).

## 1. Base de données (migration unique)

### TVA multi-taux
- Table `vat_rates` (company_id, rate, label, is_active) seedée à 20 / 10 / 5.5 / 2.1.
- `products.vat_rate` reste numeric (déjà OK), validation côté UI sur les taux autorisés.

### Inaltérabilité des ventes (NF525)
- Ajout sur `sales` :
  - `sequence_number bigint` — séquence continue par entreprise (sans trou).
  - `previous_hash text`, `current_hash text` — chaînage type blockchain.
  - `signed_at timestamptz`, `is_locked boolean default true`.
- Trigger `BEFORE INSERT` qui :
  1. attribue le prochain `sequence_number` par `company_id` (table `sale_sequences`),
  2. calcule `current_hash = sha256(previous_hash || invoice_number || total_ttc || sold_at || items_digest)`,
  3. récupère `previous_hash` depuis la dernière vente de l'entreprise.
- Trigger `BEFORE UPDATE/DELETE` qui **bloque** toute modification d'une vente verrouillée (`RAISE EXCEPTION`). Les corrections passent par **avoir** (vente négative liée).
- `sale_items` : même verrouillage en UPDATE/DELETE quand la vente parent est verrouillée.

### Journal des ventes sécurisé
- Table `sales_journal` (append-only) alimentée par trigger `AFTER INSERT` sur `sales` : id, company_id, sequence_number, invoice_number, total_ttc, hash, recorded_at. RLS lecture seule pour admin, aucune policy UPDATE/DELETE.

### Archivage
- Table `invoice_archives` (sale_id, company_id, payload jsonb figé, hash, archived_at). Snapshot complet de la facture (entête + lignes + entreprise + client) au moment de la validation.

### Historique des modifications
- Étendre `audit_logs` (déjà présent) avec `old_values jsonb`, `new_values jsonb`.
- Triggers `AFTER INSERT/UPDATE/DELETE` sur `products`, `customers`, `sales`, `sale_items`, `companies` qui écrivent dans `audit_logs`.

### Avoirs (corrections légales)
- `sales.is_credit_note boolean`, `sales.original_sale_id uuid` pour relier l'avoir à la facture d'origine.

## 2. Server functions (`createServerFn`)

- `exportFEC({ company_id, year })` — génère le **Fichier des Écritures Comptables** (format pipe-delimited, encodage UTF-8, 18 colonnes réglementaires) à partir de `sales` + `sale_items`. Retour : string + nom de fichier `FEC_<SIREN>_<YYYY>.txt`.
- `monthlyVatReport({ company_id, year, month })` — agrège TVA collectée par taux (20/10/5.5/2.1), HT, TTC, nombre de factures.
- `exportCustomerData({ customer_id })` — RGPD article 20 : JSON complet (client + ventes + lignes).
- `deleteCustomerData({ customer_id })` — RGPD article 17 : anonymise (pas de DELETE pour préserver la chaîne NF525) → remplace nom/email/téléphone/adresse par `[SUPPRIMÉ RGPD <date>]`, garde l'id et les ventes.

## 3. UI (`/conformite`)

Page unique avec onglets :
- **TVA** : tableau des taux + rapport mensuel (sélecteur mois/année, export PDF/CSV).
- **FEC** : sélecteur année + bouton téléchargement.
- **Journal** : table paginée des ventes scellées (numéro, hash, date).
- **Archives** : liste des factures archivées avec aperçu JSON.
- **Audit** : historique des modifications filtré par table/utilisateur.
- **RGPD** : recherche client → export JSON / anonymisation.

## 4. RGPD côté visiteur

- Composant `<CookieConsent />` (bandeau persistant `localStorage`, granularité : essentiels / analytics, refus par défaut).
- Route publique `/confidentialite` — politique de confidentialité (texte type CNIL adapté SaaS multi-tenant).
- Route publique `/cgv` — placeholder mentions légales (à compléter par l'entreprise).

## 5. Hors-scope (à confirmer plus tard)

- Signature électronique certifiée (eIDAS) — non requis NF525.
- Archivage à valeur probante chez tiers (FNTC) — peut s'ajouter en BLOC ultérieur.
- Certification NF525 réelle (audit AFNOR) — la base technique est posée, la certification est une démarche externe.

Prêt à implémenter ?
