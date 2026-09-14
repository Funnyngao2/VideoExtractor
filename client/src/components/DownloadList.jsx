import { useEffect, useState } from 'react';
import { getDownloadProgress } from '../services/api';
import './DownloadList.css';

function DownloadList({ downloads }) {
  const [downloadStates, setDownloadStates] = useState({});

  // Poll progress for each download
  useEffect(() => {
    if (downloads.length === 0) return;

    const pollProgress = async () => {
      const updates = {};

      for (const download of downloads) {
        // Skip completed or failed downloads
        const currentState = downloadStates[download.id];
        if (currentState?.status === 'completed' || currentState?.status === 'failed') {
          continue;
        }

        try {
          const progress = await getDownloadProgress(download.id);
          updates[download.id] = progress;
        } catch (error) {
          console.error(`Error fetching progress for ${download.id}:`, error);
        }
      }

      if (Object.keys(updates).length > 0) {
        setDownloadStates(prev => ({ ...prev, ...updates }));
      }
    };

    // Initial poll
    pollProgress();

    // Poll every 1 second
    const interval = setInterval(pollProgress, 1000);

    return () => clearInterval(interval);
  }, [downloads, downloadStates]);

  const getStatusBadge = (status) => {
    const badges = {
      'pending': { color: '#FFC107', text: '⏳ Đang chờ', icon: '⏳' },
      'downloading': { color: '#2196F3', text: '⬇️ Đang tải', icon: '⬇️' },
      'completed': { color: '#4CAF50', text: '✅ Hoàn thành', icon: '✅' },
      'failed': { color: '#F44336', text: '❌ Thất bại', icon: '❌' },
    };
    return badges[status] || { color: '#757575', text: status, icon: '•' };
  };

  const getStageMessage = (stage) => {
    const messages = {
      'fetching_playlist': 'Đang tải playlist...',
      'analyzing': 'Đang phân tích...',
      'downloading_video': 'Đang tải video...',
      'downloading_audio': 'Đang tải audio...',
      'downloading': 'Đang tải xuống...',
      'merging': 'Đang ghép video/audio...',
      'starting': 'Đang khởi tạo...',
      'finalizing': 'Đang hoàn tất...',
      'completed': 'Hoàn thành!',
    };
    return messages[stage] || stage;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const truncateUrl = (url, maxLength = 50) => {
    if (!url || url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  const handleDownloadFile = (downloadUrl, fileName) => {
    const serverUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    const fullUrl = `${serverUrl}${downloadUrl}`;
    
    // Create a temporary link and click it
    const link = document.createElement('a');
    link.href = fullUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="download-list">
      {downloads.map((download) => {
        const state = downloadStates[download.id] || download;
        const statusBadge = getStatusBadge(state.status);
        const progress = state.progress || 0;
        const message = state.message || getStageMessage(state.stage);

        return (
          <div key={download.id} className="download-item">
            <div className="download-header">
              <div className="download-status">
                <span 
                  className="status-badge"
                  style={{ backgroundColor: statusBadge.color }}
                >
                  {statusBadge.text}
                </span>
                <span className="download-format">
                  {download.format || state.format || 'video'}
                </span>
              </div>

              {state.status === 'completed' && state.fileName && (
                <button
                  className="download-file-btn"
                  onClick={() => handleDownloadFile(state.downloadUrl, state.fileName)}
                >
                  💾 Tải file
                </button>
              )}
            </div>

            <div className="download-url" title={download.url || state.url}>
              🔗 {truncateUrl(download.url || state.url)}
            </div>

            {state.status !== 'completed' && state.status !== 'failed' && (
              <>
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar"
                    style={{ width: `${progress}%` }}
                  >
                    <span className="progress-text">{progress}%</span>
                  </div>
                </div>

                <div className="download-message">
                  {message}
                  {state.downloadedSize && state.totalSize && (
                    <span className="download-size">
                      {' '}({formatFileSize(state.downloadedSize)} / {formatFileSize(state.totalSize)})
                    </span>
                  )}
                  {state.downloadedSize && !state.totalSize && (
                    <span className="download-size">
                      {' '}({formatFileSize(state.downloadedSize)})
                    </span>
                  )}
                </div>
              </>
            )}

            {state.status === 'completed' && (
              <div className="download-complete">
                <div className="complete-icon">🎉</div>
                <div className="complete-text">
                  <strong>{state.fileName}</strong>
                  <div className="complete-message">Video đã sẵn sàng để tải xuống!</div>
                  <div className="cleanup-warning">⏰ File sẽ tự động xóa sau 15 phút</div>
                </div>
              </div>
            )}

            {state.status === 'failed' && (
              <div className="download-failed">
                <div className="error-icon">⚠️</div>
                <div className="error-text">
                  {state.error || 'Đã xảy ra lỗi khi tải video'}
                </div>
              </div>
            )}

            <div className="download-meta">
              <span className="download-id">ID: {download.id}</span>
              {state.createdAt && (
                <span className="download-time">
                  {new Date(state.createdAt).toLocaleString('vi-VN')}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default DownloadList;
