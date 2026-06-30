# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Automated championship flow migration with `team_payments`, `referees`, `match_referees`, `match_results`, `match_events`, `volleyball_sets`, `event_venues`, referee role, payment status, and result validation settings.
- Admin payments module at `/admin/pagos` with approve/reject actions and audit logging.
- Admin referees module at `/admin/arbitros` plus referee assignment from `/admin/fixture`.
- Referee panel at `/arbitro` with assigned matches, match start, result submission, football events, cards, and volleyball sets.
- Admin result validation APIs and `/admin/resultados` review flow for submitted/disputed results.
- Catalog-backed categories per championship.
- Category-aware public, admin, and delegate views.
- Delegate registration now requires a category and stores `category_id`.
- Admin fixture generation can be filtered by category.
- Legacy compatibility fallbacks for category data in mock and older schemas.

### Changed

- Admin fixture language now points to automatic scheduling instead of manual draw when generating matches.
- Automatic scheduling now requires assigned venues, active time slots, approved teams, approved payments, and category filtering.
- Public views now hide `submitted` and `disputed` results; standings count only validated results plus legacy finished matches.
- Team approval now requires approved payment unless an explicit audited override path is used for scheduling.
- Public championship context now resolves the active category from Supabase data.
- PDF receipts for delegates now include the selected category.
- Schema verification checks cover `event_categories`, automatic flow tables, `teams.category_id`, `matches.category_id`, and payment/referee/result policies.

### Fixed

- Delegate approval access remains gated behind approved team status and matching email.
- Fixture and standings queries no longer mix categories when category data exists.
