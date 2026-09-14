import { useState } from 'react';
import { scanUrl } from '../services/api';
import './ScanForm.css';

function ScanForm({ onScanComplete, scanning, setScanning, disabled }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError('Vui lòng nhập URL');
      return;
    }

    // Validate URL
    try {
      new URL(url);
    } catch (e) {
      setError('URL không hợp lệ');
      return;
    }

    setError('');
    setScanning(true);

    try {
      const result = await scanUrl(url);
      
      if (result.success && result.videos) {
        onScanComplete(result.videos);
        
        if (result.videos.length === 0) {
          setError('Không tìm thấy video nào trên trang này');
        }
      } else {
        setError('Không thể scan URL');
      }
    } catch (err) {
      setError(err.message || 'Đã xảy ra lỗi khi scan URL');
      console.error('Scan error:', err);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="scan-form-container">
      <form onSubmit={handleSubmit} className="scan-form">
        <div className="form-group">
          <label className="form-label">
            <span className="form-label-icon">🔗</span>
            URL trang web
          </label>
          <div className="input-wrapper">
            <input
              type="text"
              className="form-input"
              placeholder="https://example.com/video-page"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={scanning || disabled}
            />
            <button 
              type="submit" 
              className="form-button"
              disabled={scanning || disabled}
            >
              {scanning ? (
                <>
                  <span className="spinner"></span>
                  <span>Đang quét...</span>
                </>
              ) : (
                <>
                  <span>🔍</span>
                  <span>Quét video</span>
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="form-error">
            <span className="form-error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {disabled && (
          <div className="form-warning">
            <span className="form-warning-icon">🔒</span>
            <span>Vui lòng đọc và đồng ý với điều khoản sử dụng trước</span>
          </div>
        )}
      </form>

      <div className="scan-info">
        <div className="scan-info-item">
          <span className="scan-info-icon">✓</span>
          <span>HLS Streaming</span>
        </div>
        <div className="scan-info-item">
          <span className="scan-info-icon">✓</span>
          <span>Vimeo Playlists</span>
        </div>
        <div className="scan-info-item">
          <span className="scan-info-icon">✓</span>
          <span>Direct MP4/WebM</span>
        </div>
      </div>
    </div>
  );
}

export default ScanForm;
