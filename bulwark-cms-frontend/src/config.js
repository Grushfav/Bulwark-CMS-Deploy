// Configuration file using environment variables
export const config = {
  // Force localhost for development
  apiUrl: 'http://localhost:5000/api',
  frontendUrl: import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173',
  environment: 'local'
};

// Helper function to get current API URL
export const getApiUrl = () => {
  // Always use localhost for development
  return 'http://localhost:5000/api';
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
