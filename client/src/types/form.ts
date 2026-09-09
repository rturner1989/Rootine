// Client-only shape for multi-field form error state — never crosses the
// wire, so no schema.
export type FieldError = { field: string; message: string }
