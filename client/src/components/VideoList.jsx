import { useState } from 'react';
import { startDownload } from '../services/api';
import './VideoList.css';

function VideoList({ videos, onDownloadStart }) {
  const [downloading, setDownloading] = useState({});

  const getVideoTypeLabel = (type) => {
    const labels = {
      'vimeo_playlist': 'Vimeo Playlist',
      'direct': 'Direct Video',
      'hls': 'HLS Stream',
      'dash': 'DASH Stream',
      'ts_segment': 'TS Segment',
    };
    return labels[type] || type;
  };

  const getFormatBadge = (format) => {
    const badges = {
      'mp4': { color: '#4CAF50', text: 'MP4' },
      'webm': { color: '#2196F3', text: 'WebM' },
      'ts_segments': { color: '#FF9800', text: 'TS' },
      'm3u8': { color: '#9C27B0', text: 'M3U8' },
      'mpd': { color: '#E91E63', text: 'MPD' },
      'ts': { color: '#FF5722', text: 'TS' },
    };
    return badges[format] || { color: '#757575', text: format.toUpperCase() };
  };

  const handleDownload = async (video) => {
    const videoKey = video.url;
    
    if (downloading[videoKey]) {
      return; // Already downloading
    }

    setDownloading(prev => ({ ...prev, [videoKey]: true }));

    try {
      // KHÔNG cần truyền type - backend sẽ auto-detect
      const result = await startDownload(video.url);
      
      if (result.success) {
        onDownloadStart({
          id: result.downloadId,
          url: video.url,
          format: video.format,
          status: 'pending',
          progress: 0,
        });
      }
    } catch (error) {
      console.error('Download start error:', error);
      alert(`Lỗi: ${error.message}`);
    } finally {
      setDownloading(prev => ({ ...prev, [videoKey]: false }));
    }
  };

  const truncateUrl = (url, maxLength = 60) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  return (
    <div className="video-list">
      {videos.map((video, index) => {
        const formatBadge = getFormatBadge(video.format);
        const isDownloading = downloading[video.url];

        return (
          <div key={index} className="video-item">
            <div className="video-info">
              <div className="video-header">
                <span 
                  className="format-badge"
                  style={{ backgroundColor: formatBadge.color }}
                >
                  {formatBadge.text}
                </span>
                <span className="video-type">
                  {getVideoTypeLabel(video.type)}
                </span>
                {video.source && (
                  <span className="video-source">
                    📍 {video.source}
                  </span>
                )}
              </div>

              <div className="video-url" title={video.url}>
                🔗 {truncateUrl(video.url)}
              </div>

              {video.poster && (
                <div className="video-poster">
                  <img src={video.poster} alt="Video poster" />
                </div>
              )}
            </div>

            <div className="video-actions">
              <button
                className="download-btn"
                onClick={() => handleDownload(video)}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <>
                    <span className="spinner-small"></span>
                    Đang khởi tạo...
                  </>
                ) : (
                  <>
                    ⬇️ Tải xuống
                  </>
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default VideoList;
