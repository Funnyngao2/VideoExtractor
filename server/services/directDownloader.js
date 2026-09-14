import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/151.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Encoding': 'gzip, deflate',
  'Connection': 'keep-alive',
  'Referer': 'https://www.youtube.com/',
  'Origin': 'https://www.youtube.com',
};

/**
 * Download video/audio trực tiếp (MP4, WebM, MP3, etc.)
 */
export class DirectDownloader {
  constructor(videoUrl, downloadId, onProgress) {
    this.videoUrl = videoUrl;
    this.downloadId = downloadId;
    this.onProgress = onProgress || (() => {});
    this.downloadDir = path.join(process.cwd(), 'downloads');
  }

  /**
   * Main download function
   */
  async download() {
    try {
      // Tạo downloads directory
      if (!fs.existsSync(this.downloadDir)) {
        fs.mkdirSync(this.downloadDir, { recursive: true });
      }

      this.onProgress({
        stage: 'starting',
        message: 'Đang bắt đầu tải...',
        progress: 0,
      });

      // Xác định extension từ URL
      const extension = this.getFileExtension(this.videoUrl);
      const outputFile = path.join(this.downloadDir, `${this.downloadId}.${extension}`);

      this.onProgress({
        stage: 'downloading',
        message: 'Đang tải xuống...',
        progress: 5,
      });

      // Download file
      await this.downloadFile(this.videoUrl, outputFile);

      this.onProgress({
        stage: 'completed',
        message: 'Hoàn thành!',
        progress: 100,
        outputFile: outputFile,
        fileName: `${this.downloadId}.${extension}`,
      });

      return {
        success: true,
        fileName: `${this.downloadId}.${extension}`,
        filePath: outputFile,
        downloadUrl: `/downloads/${this.downloadId}.${extension}`,
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Download file với progress tracking
   */
  async downloadFile(url, outputPath) {
    try {
      // Get file info first
      const headResponse = await axios.head(url, {
        headers: HEADERS,
        timeout: 10000,
      }).catch(() => null);

      const totalSize = headResponse?.headers['content-length'] 
        ? parseInt(headResponse.headers['content-length'], 10) 
        : null;

      console.log(`Downloading: ${url}`);
      if (totalSize) {
        console.log(`Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
      }

      // Download với streaming
      const response = await axios({
        method: 'get',
        url: url,
        headers: HEADERS,
        responseType: 'stream',
        timeout: 300000, // 5 minutes timeout
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      const writer = fs.createWriteStream(outputPath);
      let downloadedSize = 0;

      // Track progress
      response.data.on('data', (chunk) => {
        downloadedSize += chunk.length;
        
        if (totalSize) {
          const percent = Math.round((downloadedSize / totalSize) * 85) + 5; // 5-90%
          this.onProgress({
            stage: 'downloading',
            message: `Đang tải: ${(downloadedSize / 1024 / 1024).toFixed(2)} / ${(totalSize / 1024 / 1024).toFixed(2)} MB`,
            progress: percent,
            downloadedSize,
            totalSize,
          });
        } else {
          // Không biết total size
          this.onProgress({
            stage: 'downloading',
            message: `Đang tải: ${(downloadedSize / 1024 / 1024).toFixed(2)} MB`,
            progress: 50, // Fixed progress
            downloadedSize,
          });
        }
      });

      // Pipe stream to file
      await pipeline(response.data, writer);

      const finalSize = fs.statSync(outputPath).size;
      console.log(`Download completed: ${(finalSize / 1024 / 1024).toFixed(2)} MB`);

      this.onProgress({
        stage: 'finalizing',
        message: 'Đang hoàn tất...',
        progress: 95,
      });

    } catch (error) {
      // Cleanup failed download
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      throw new Error(`Lỗi khi tải file: ${error.message}`);
    }
  }

  /**
   * Lấy file extension từ URL
   */
  getFileExtension(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Extract extension
      const match = pathname.match(/\.([a-z0-9]+)(?:[?#]|$)/i);
      if (match) {
        return match[1].toLowerCase();
      }

      // Default extensions based on URL patterns
      if (url.includes('.mp4')) return 'mp4';
      if (url.includes('.webm')) return 'webm';
      if (url.includes('.mp3')) return 'mp3';
      if (url.includes('.m4a')) return 'm4a';
      if (url.includes('.ogg') || url.includes('.ogv')) return 'ogg';

      // Default
      return 'mp4';
    } catch (e) {
      return 'mp4';
    }
  }
}
