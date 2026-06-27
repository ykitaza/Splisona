export class NotFoundError extends Error {
  constructor(resource = "Resource") {
    super(`${resource} not found`);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class ValidationError extends Error {
  public readonly fields?: string[];
  constructor(message: string, fields?: string[]) {
    super(message);
    this.name = "ValidationError";
    this.fields = fields;
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}
