# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Catalog-backed categories per championship.
- Category-aware public, admin, and delegate views.
- Delegate registration now requires a category and stores `category_id`.
- Admin fixture generation can be filtered by category.
- Legacy compatibility fallbacks for category data in mock and older schemas.

### Changed

- Public championship context now resolves the active category from Supabase data.
- PDF receipts for delegates now include the selected category.
- Schema verification checks cover `event_categories`, `teams.category_id`, and `matches.category_id`.

### Fixed

- Delegate approval access remains gated behind approved team status and matching email.
- Fixture and standings queries no longer mix categories when category data exists.
