// frontend/src/config.js
const getBackendUrl = (envUrl) => {
  if (envUrl && !envUrl.includes('3-26-196-59.nip.io')) {
    return envUrl;
  }
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000'; // Local development consolidated gateway/proxy
  }
  return 'https://34-234-215-6.nip.io'; // AWS production fallback
};

export const API_URL = getBackendUrl(process.env.REACT_APP_API_URL);
export const SOCKET_URL = getBackendUrl(process.env.REACT_APP_SOCKET_URL || process.env.REACT_APP_WS_URL);
