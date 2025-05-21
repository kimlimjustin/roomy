// import { dev } from '$app/environment';

// Environment configuration
export const PORT = process.env.PORT || '3000';
export const HTTP_PROXY = process.env.HTTP_PROXY || '';

// Parse proxy information
const proxyData = {
  protocol: HTTP_PROXY?.startsWith('https') ? 'https' : 'http',
  hostname: HTTP_PROXY?.split('://')[1]?.split(':')[0] || '',
  port: parseInt(HTTP_PROXY?.split(':').pop() || '0') || 80
};

export { proxyData };