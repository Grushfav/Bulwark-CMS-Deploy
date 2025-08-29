// Configuration file using environment variables
export const config = {
  // Get values from environment variables with fallbacks
  apiUrl: 'https://bulwark-cms-deploy.onrender.com/api', // Force deployed backend
  frontendUrl: import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173',
  environment: import.meta.env.VITE_ENVIRONMENT || 'production'
};

// Helper function to get current API URL
export const getApiUrl = () => {
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
