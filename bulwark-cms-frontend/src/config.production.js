// Production Configuration for Plesk Deployment
export const config = {
  // Update with your Plesk backend domain
  apiUrl: 'https://backend.quirky-perlman.208-109-228-217.plesk.page/api',
  frontendUrl: 'https://quirky-perlman.208-109-228-217.plesk.page',
  environment: 'production'
};

// Helper function to get current API URL
export const getApiUrl = () => {
  return config.apiUrl;
};