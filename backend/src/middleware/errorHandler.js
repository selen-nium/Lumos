
export const errorHandler = (err, req, res, next) => {
  // Log the actual error for debugging (but hide from users)
  console.error('❌ Error occurred:', {
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  // Default error response
  let statusCode = 500;
  let message = 'Something went wrong. Please try again.';
  let details = null;

  // specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Invalid input provided';
    details = err.message;
  } 
  else if (err.message?.includes('JWT') || err.message?.includes('token')) {
    statusCode = 401;
    message = 'Authentication failed. Please log in again.';
  }
  else if (err.message?.includes('permission') || err.message?.includes('access')) {
    statusCode = 403;
    message = 'You do not have permission to perform this action.';
  }
  else if (err.message?.includes('not found') || err.code === 'PGRST116') {
    statusCode = 404;
    message = 'The requested resource was not found.';
  }
  else if (err.message?.includes('OpenAI') || err.message?.includes('API')) {
    statusCode = 503;
    message = 'AI service is temporarily unavailable. Please try again in a moment.';
    details = 'Our AI assistant is having some trouble right now.';
  }
  else if (err.message?.includes('Supabase') || err.message?.includes('database')) {
    statusCode = 503;
    message = 'Database service is temporarily unavailable. Please try again.';
  }
  else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    statusCode = 503;
    message = 'External service unavailable. Please try again later.';
  }
  else if (err.message?.includes('timeout')) {
    statusCode = 408;
    message = 'Request timed out. Please try again with a shorter message.';
  }
  else if (statusCode >= 400 && statusCode < 500) {
    // client errors - show the actual message
    message = err.message || message;
  }

  // standardized error response
  const errorResponse = {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  };

  // Add details in development mode or for specific errors
  if (details || process.env.NODE_ENV === 'development') {
    errorResponse.details = details || (process.env.NODE_ENV === 'development' ? err.message : undefined);
  }

  // Add request context for debugging
  if (process.env.NODE_ENV === 'development') {
    errorResponse.debug = {
      path: req.path,
      method: req.method,
      errorType: err.name || 'Unknown'
    };
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * 404 errors for undefined routes
 */
export const notFoundHandler = (req, res) => {
  console.warn(`⚠️ 404 - Route not found: ${req.method} ${req.path}`);
  
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`,
    timestamp: new Date().toISOString(),
    availableRoutes: process.env.NODE_ENV === 'development' ? [
      'POST /api/chat/message',
      'GET /api/roadmap/user/:userId',
      'POST /api/roadmap/generate',
      'GET /api/templates/popular'
    ] : undefined
  });
};

/**
 * Async error wrapper
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create custom error with specific status code
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';
  }
}

/**
 * Helper function to throw user-friendly errors
 */
export const createError = (message, statusCode = 500, details = null) => {
  throw new AppError(message, statusCode, details);
};