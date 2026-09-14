import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes
});

/**
 * Scan một URL để tìm video links
 */
export const scanUrl = async (url) => {
  try {
    const response = await api.post('/scan', { url });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error || 
      error.message || 
      'Không thể scan URL'
    );
  }
};

/**
 * Bắt đầu download một video
 */
export const startDownload = async (url, type = null) => {
  try {
    const payload = { url };
    
    // Type là optional - backend sẽ auto-detect
    if (type) {
      payload.type = type;
    }

    const response = await api.post('/download', payload);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error || 
      error.message || 
      'Không thể bắt đầu download'
    );
  }
};

/**
 * Lấy progress của một download
 */
export const getDownloadProgress = async (downloadId) => {
  try {
    const response = await api.get(`/download/${downloadId}/progress`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error || 
      error.message || 
      'Không thể lấy progress'
    );
  }
};

/**
 * Lấy danh sách tất cả downloads
 */
export const getDownloadList = async () => {
  try {
    const response = await api.get('/download/list');
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error || 
      error.message || 
      'Không thể lấy danh sách downloads'
    );
  }
};

/**
 * Xóa/cancel một download
 */
export const cancelDownload = async (downloadId) => {
  try {
    const response = await api.delete(`/download/${downloadId}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error || 
      error.message || 
      'Không thể xóa download'
    );
  }
};

export default api;
