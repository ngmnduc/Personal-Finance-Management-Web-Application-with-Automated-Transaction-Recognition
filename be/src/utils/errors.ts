export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'AppError';
  }

  static BadRequest(message = 'Bad Request', code = 'BAD_REQUEST') {
    return new AppError(400, code, message);
  }

  static Unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED') {
    return new AppError(401, code, message);
  }

  static Forbidden(message = 'Forbidden', code = 'FORBIDDEN') {
    return new AppError(403, code, message);
  }

  static NotFound(message = 'Not Found', code = 'NOT_FOUND') {
    return new AppError(404, code, message);
  }

  static Conflict(message = 'Conflict', code = 'CONFLICT') {
    return new AppError(409, code, message);
  }

  static Unprocessable(message = 'Unprocessable Entity', code = 'UNPROCESSABLE') {
    return new AppError(422, code, message);
  }

  static Internal(message = 'Internal Server Error', code = 'INTERNAL_ERROR') {
    return new AppError(500, code, message);
  }
}