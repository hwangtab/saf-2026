- Chose integer for sale_price for easier calculations.
- Decided on a one-way trigger for status update ('sold') to maintain data integrity from the sales perspective.
- Added `edition_type` and `edition_limit` fields to the local `Artwork` type in `artwork-edit-form.tsx` rather than refactoring to use a shared type, to minimize changes to existing code structure and preserve backward compatibility with the existing `edition` string field.

### Summing Quantities

- Decided to use `SUM(quantity)` instead of simple row count for limited edition checks to maintain consistency with the database trigger logic.
