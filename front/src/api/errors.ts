export class ApiValidationError extends Error {
  errors: Record<string, string[]>;
  constructor(errors: Record<string, string[]>) {
    super("validation_error");
    this.errors = errors;
  }
}