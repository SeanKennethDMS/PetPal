export const getBasePath = () => {
    if (window.location.hostname.includes('vercel.app')) {
      return '';
    }
    if (window.location.hostname === '127.0.0.1' && window.location.port === '5501') {
      return '/frontend/public';
    }
    return '';
  };