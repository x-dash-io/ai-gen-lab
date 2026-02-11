import { logger } from "@/lib/logger";

/**
 * Centralized error handling utilities
 */

export type ErrorCode = 
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "BAD_REQUEST"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public statusCode: number = 500,
    public userMessage?: string
  ) {
    super(message);
    this.name = "AppError";
  }

  static unauthorized(message = "Authentication required", userMessage = "Please sign in to continue") {
    return new AppError(message, "UNAUTHORIZED", 401, userMessage);
  }

  static forbidden(message = "Access denied", userMessage = "You don't have permission to perform this action") {
    return new AppError(message, "FORBIDDEN", 403, userMessage);
  }

  static notFound(resource = "Resource", userMessage?: string) {
    return new AppError(`${resource} not found`, "NOT_FOUND", 404, userMessage || `The requested ${resource.toLowerCase()} was not found`);
  }

  static badRequest(message: string, userMessage?: string) {
    return new AppError(message, "BAD_REQUEST", 400, userMessage || message);
  }

  static conflict(message: string, userMessage?: string) {
    return new AppError(message, "CONFLICT", 409, userMessage || message);
  }

  static validationError(message: string, userMessage?: string) {
    return new AppError(message, "VALIDATION_ERROR", 422, userMessage || message);
  }

  static rateLimited(userMessage = "Too many requests. Please try again later.") {
    return new AppError("Rate limit exceeded", "RATE_LIMITED", 429, userMessage);
  }

  static internal(message = "Internal server error") {
    return new AppError(message, "INTERNAL_ERROR", 500, "An unexpected error occurred. Please try again.");
  }
}

export function handleServerError(error: unknown): {
  message: string;
  statusCode: number;
  userMessage: string;
} {
  logger.error("Server error occurred", error);

  if (error instanceof AppError) {
    return {
      message: error.message,
      statusCode: error.statusCode,
      userMessage: error.userMessage || error.message,
    };
  }

  if (error instanceof Error) {
    const msg = error.message;

    // Handle known error message patterns
    if (msg === "UNAUTHORIZED" || msg.startsWith("UNAUTHORIZED:")) {
      return {
        message: "Unauthorized",
        statusCode: 401,
        userMessage: msg.includes(":") ? msg.split(":").slice(1).join(":").trim() : "Please sign in to continue",
      };
    }

    if (msg === "FORBIDDEN" || msg.startsWith("FORBIDDEN:")) {
      return {
        message: "Forbidden",
        statusCode: 403,
        userMessage: msg.includes(":") ? msg.split(":").slice(1).join(":").trim() : "You don't have permission to perform this action",
      };
    }

    if (msg === "NOT_FOUND" || msg.startsWith("NOT_FOUND:") || msg.includes("not found")) {
      return {
        message: "Not Found",
        statusCode: 404,
        userMessage: msg.includes(":") ? msg.split(":").slice(1).join(":").trim() : "The requested resource was not found",
      };
    }

    if (msg === "BAD_REQUEST" || msg.startsWith("BAD_REQUEST:")) {
      return {
        message: "Bad Request",
        statusCode: 400,
        userMessage: msg.includes(":") ? msg.split(":").slice(1).join(":").trim() : "Invalid request",
      };
    }

    if (msg === "CONFLICT" || msg.startsWith("CONFLICT:")) {
      return {
        message: "Conflict",
        statusCode: 409,
        userMessage: msg.includes(":") ? msg.split(":").slice(1).join(":").trim() : "Resource conflict",
      };
    }

    // Handle validation-like messages (contains "must" or "required" or "invalid")
    if (msg.match(/must|required|invalid|cannot|already/i)) {
      return {
        message: msg,
        statusCode: 400,
        userMessage: msg,
      };
    }

    return {
      message: error.message,
      statusCode: 500,
      userMessage: "An unexpected error occurred. Please try again.",
    };
  }

  return {
    message: "Unknown error",
    statusCode: 500,
    userMessage: "An unexpected error occurred. Please try again.",
  };
}

export function createErrorResponse(error: unknown) {
  const { message, statusCode, userMessage } = handleServerError(error);
  return Response.json({ error: userMessage, code: message }, { status: statusCode });
}
