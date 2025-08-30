// Configuration file using environment variables
export const config = {
  // Get values from environment variables with fallbacks
  apiUrl: `http://localhost:5000/api?t=${Date.now()}`, // Local backend for testing with cache busting
  frontendUrl: import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173',
  environment: import.meta.env.VITE_ENVIRONMENT || 'local'
};

// Helper function to get current API URL
export const getApiUrl = () => {
  // Force localhost for development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  return config.apiUrl;
};

// Helper function to get current frontend URL
export const getFrontendUrl = () => {
  return config.environment;
};

// Helper function to get current environment
export const getEnvironment = () => {
  return config.environment;
};

// Helper function to check if we're in development
export const isDevelopment = () => {
  return config.environment === 'local';
};

// Helper function to check if we're in production
export const isProduction = () => {
  return config.environment === 'production';
};
