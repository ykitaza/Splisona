export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorResponse(statusCode: number, code: string, message: string) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ error: code, message }),
  };
}

export function notFound(resource = "Resource") {
  return new AppError(404, "NOT_FOUND", `${resource} not found`);
}

export function badRequest(message: string, fields?: string[]) {
  return {
    statusCode: 400,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ error: "VALIDATION_ERROR", message, fields }),
  };
}
