### Admin Resource Management Pattern

- Used a single form component (`ArtistEditForm`) for both creation and editing.
- Handled `id` check to determine mode (`isEditing`).
- Separated image upload from initial creation to simplify the flow (create record first, then upload image using the generated ID).
- Added quick links between related resources (e.g., creating an artist while creating an artwork) to improve admin UX.
