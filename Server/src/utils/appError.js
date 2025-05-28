class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
        this.isOperational = true;
    }

    static badRequest(message) {
        return new AppError(message, 400);
    }

    static notFound(message) {
        return new AppError(message, 404);
    }

    static internalServerError(message) {
        return new AppError(message, 500);
    }

    static unauthorized(message) {
        return new AppError(message, 401);
    }

    static forbidden(message) {
        return new AppError(message, 403);
    }

    static conflict(message) {
        return new AppError(message, 409);
    }

    static unprocessableEntity(message) {
        return new AppError(message, 422);
    }

    static tooManyRequests(message) {
        return new AppError(message, 429);
    }

    static serviceUnavailable(message) {
        return new AppError(message, 503);
    }

    static gatewayTimeout(message) {
        return new AppError(message, 504);
    }

    static badGateway(message) {
        return new AppError(message, 502);
    }

    static networkAuthenticationRequired(message) {
        return new AppError(message, 511);
    }

    static success(message, data) {
        return {
            status: "success",
            message,
            data,
        };
    }
}

export default AppError;