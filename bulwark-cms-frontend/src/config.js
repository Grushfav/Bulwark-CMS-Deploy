// Configuration file using environment variables
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  frontendUrl: import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173',
  environment: import.meta.env.VITE_ENVIRONMENT || 'production'
};

// Helper function to get current API URL
export const getApiUrl = () => {
  return config.apiUrl;
};

// Helper function to get current frontend URL
export const getFrontendUrl = () => {
  return config.frontendUrl;
};

// Helper function to get current environment
export const getEnvironment = () => {
  return config.environment;
};

// Helper function to check if we're in development
export const isDevelopment = () => {
  return config.environment === 'local' || config.environment === 'development';
};

// Helper function to check if we're in production
export const isProduction = () => {
  return config.environment === 'production';
};
