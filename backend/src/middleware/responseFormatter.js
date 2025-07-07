export const responseFormatter = (req, res, next) => {
  // Success response helper
  res.apiSuccess = (payload, message = 'Success', meta = null) => {
    const response = {
      success: true,
      message,
      // REMOVED: data,  ❌ This was undefined!
      timestamp: new Date().toISOString(),
      ...payload  // This spreads the actual data
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