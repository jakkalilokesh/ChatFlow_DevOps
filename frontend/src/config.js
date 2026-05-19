// frontend/src/config.js
const getBackendUrl = (envUrl) => {
  if (!envUrl || envUrl.includes('3-26-196-59.nip.io')) {
    return 'https://34-234-215-6.nip.io';
  }
  return envUrl;
};

export const API_URL = getBackendUrl(process.env.REACT_APP_API_URL);
export const SOCKET_URL = getBackendUrl(process.env.REACT_APP_SOCKET_URL || process.env.REACT_APP_WS_URL);
