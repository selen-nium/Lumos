/**
 * Standardizes API response format across all endpoints
 */
export const responseFormatter = (req, res, next) => {
  // Success response helper
  res.apiSuccess = (data, message = 'Success', meta = null) => {
    const response = {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    };

    // Add metadata if provided (pagination, etc.)
    if (meta) {
      response.meta = meta;
    }

    res.json(response);
  };

  // Error response helper
  res.apiError = (message, statusCode = 400, details = null) => {
    const response = {
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    };

    if (details) {
      response.details = details;
    }

    res.status(statusCode).json(response);
  };

  // Pagination helper
  res.apiPaginated = (data, pagination, message = 'Success') => {
    res.apiSuccess(data, message, {
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: Math.ceil(pagination.total / pagination.limit),
        hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
        hasPrev: pagination.page > 1
      }
    });
  };

  next();
};