import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { VimeoDownloader } from '../services/vimeoDownloader.js';
import { DirectDownloader } from '../services/directDownloader.js';
import { HLSDownloader } from '../services/hlsDownloader.js';
import cleanupService from '../services/cleanupService.js';
import { detectVideoType, getDownloadType, isSupported } from '../utils/videoTypeDetector.js';

const router = express.Router();

// Store active downloads với progress
const activeDownloads = new Map();

/**
 * POST /api/download
 * Body: { url: string, type: 'vimeo_playlist' | 'direct' }
 * Response: { success, downloadId }
 */
router.post('/', async (req, res) => {
  try {
    let { url, type } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL là bắt buộc'
      });
    }

    // AUTO-DETECT nếu không có type
    if (!type) {
      console.log('Auto-detecting video type...');
      const detection = detectVideoType(url);
      
      console.log(`Detected: ${detection.type} (${detection.method})`);
      
      if (!detection.supported) {
        return res.status(400).json({
          success: false,
          error: `Video type không được hỗ trợ: ${detection.type}`,
          reason: detection.reason,
          detectedType: detection.type
        });
      }

      type = getDownloadType(url);
      
      if (!type) {
        return res.status(400).json({
          success: false,
          error: 'Không thể xác định loại video để tải',
          detectedType: detection.type
        });
      }

      console.log(`Auto-selected download type: ${type}`);
    }

    // Validate type
    const validTypes = ['vimeo_playlist', 'hls', 'direct'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Type không hợp lệ: ${type}. Allowed: ${validTypes.join(', ')}`
      });
    }

    // Generate download ID
    const downloadId = uuidv4();

    // Initialize download progress
    activeDownloads.set(downloadId, {
      id: downloadId,
      url: url,
      type: type,
      status: 'pending',
      progress: 0,
      message: 'Đang khởi tạo...',
      createdAt: new Date(),
    });

    // Return immediately
    res.json({
      success: true,
      downloadId: downloadId,
      message: 'Download đã được khởi tạo'
    });

    // Start download in background
    processDownload(downloadId, url, type);

  } catch (error) {
    console.error('Error in download route:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/download/:downloadId/progress
 * Response: { downloadId, status, progress, message, ... }
 */
router.get('/:downloadId/progress', (req, res) => {
  const { downloadId } = req.params;

  const download = activeDownloads.get(downloadId);

  if (!download) {
    return res.status(404).json({
      success: false,
      error: 'Download không tồn tại'
    });
  }

  res.json(download);
});

/**
 * GET /api/download/list
 * Response: { downloads: [] }
 */
router.get('/list', (req, res) => {
  const downloads = Array.from(activeDownloads.values());
  res.json({
    success: true,
    downloads: downloads
  });
});

/**
 * DELETE /api/download/:downloadId
 * Cancel/remove download
 */
router.delete('/:downloadId', (req, res) => {
  const { downloadId } = req.params;

  if (!activeDownloads.has(downloadId)) {
    return res.status(404).json({
      success: false,
      error: 'Download không tồn tại'
    });
  }

  activeDownloads.delete(downloadId);

  res.json({
    success: true,
    message: 'Đã xóa download'
  });
});

/**
 * Process download in background
 */
async function processDownload(downloadId, url, type) {
  const updateProgress = (data) => {
    const download = activeDownloads.get(downloadId);
    if (download) {
      activeDownloads.set(downloadId, {
        ...download,
        ...data,
        updatedAt: new Date(),
      });
    }
  };

  try {
    updateProgress({
      status: 'downloading',
      progress: 0,
      message: 'Đang bắt đầu tải...'
    });

    let result;

    if (type === 'vimeo_playlist') {
      // Download Vimeo TS segments (JSON playlist)
      const downloader = new VimeoDownloader(url, downloadId, (progressData) => {
        updateProgress({
          status: 'downloading',
          stage: progressData.stage,
          progress: progressData.progress,
          message: progressData.message,
        });
      });

      result = await downloader.download();

    } else if (type === 'hls' || url.includes('.m3u8')) {
      // Download HLS stream
      const downloader = new HLSDownloader(url, downloadId, (progressData) => {
        updateProgress({
          status: 'downloading',
          stage: progressData.stage,
          progress: progressData.progress,
          message: progressData.message,
        });
      });

      result = await downloader.download();

    } else if (type === 'direct') {
      // Download direct video
      const downloader = new DirectDownloader(url, downloadId, (progressData) => {
        updateProgress({
          status: 'downloading',
          stage: progressData.stage,
          progress: progressData.progress,
          message: progressData.message,
          downloadedSize: progressData.downloadedSize,
          totalSize: progressData.totalSize,
        });
      });

      result = await downloader.download();

    } else {
      throw new Error(`Loại download không hợp lệ: ${type}`);
    }

    // Mark as completed
    updateProgress({
      status: 'completed',
      progress: 100,
      message: 'Hoàn thành!',
      fileName: result.fileName,
      downloadUrl: result.downloadUrl,
      filePath: result.filePath,
    });

    console.log(`Download completed: ${downloadId}`);

    // Schedule cleanup sau 15 phút
    cleanupService.scheduleCleanup(result.filePath, 15 * 60 * 1000);

  } catch (error) {
    console.error(`Download failed (${downloadId}):`, error);
    
    updateProgress({
      status: 'failed',
      progress: 0,
      message: `Lỗi: ${error.message}`,
      error: error.message,
    });
  }
}

export default router;
