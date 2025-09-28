// Production Configuration for Plesk Deployment
export const config = {
  // Update with your Plesk backend domain
  apiUrl: 'https://yourdomain.com/api', // or https://api.yourdomain.com/api if using subdomain
  frontendUrl: 'https://yourdomain.com',
  environment: 'production'
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
  return false;
};

// Helper function to check if we're in production
export const isProduction = () => {
  return true;
};
