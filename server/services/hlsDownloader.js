import { promisify } from 'util';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const execPromise = promisify(exec);

/**
 * Download HLS video (.m3u8) sử dụng FFmpeg
 */
export class HLSDownloader {
  constructor(playlistUrl, downloadId, onProgress) {
    this.playlistUrl = playlistUrl;
    this.downloadId = downloadId;
    this.onProgress = onProgress || (() => {});
    this.downloadDir = path.join(process.cwd(), 'downloads');
    this.tempDir = path.join(process.cwd(), 'temp', downloadId);
  }

  /**
   * Main download function
   */
  async download() {
    try {
      // Tạo directories
      if (!fs.existsSync(this.downloadDir)) {
        fs.mkdirSync(this.downloadDir, { recursive: true });
      }

      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }

      this.onProgress({
        stage: 'starting',
        message: 'Đang khởi tạo...',
        progress: 0,
      });

      const outputFile = path.join(this.downloadDir, `${this.downloadId}.mp4`);

      this.onProgress({
        stage: 'downloading',
        message: 'Đang tải HLS stream...',
        progress: 10,
      });

      // Use FFmpeg to download HLS
      await this.downloadWithFFmpeg(this.playlistUrl, outputFile);

      this.onProgress({
        stage: 'completed',
        message: 'Hoàn thành!',
        progress: 100,
        outputFile: outputFile,
        fileName: `${this.downloadId}.mp4`,
      });

      // Cleanup
      this.cleanup();

      return {
        success: true,
        fileName: `${this.downloadId}.mp4`,
        filePath: outputFile,
        downloadUrl: `/downloads/${this.downloadId}.mp4`,
      };

    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  /**
   * Download HLS với FFmpeg
   */
  async downloadWithFFmpeg(playlistUrl, outputFile) {
    try {
      console.log('Downloading HLS with FFmpeg...');
      console.log(`Playlist: ${playlistUrl}`);
      console.log(`Output: ${outputFile}`);

      // FFmpeg command với progress tracking
      const command = [
        'ffmpeg',
        '-y',                    // Overwrite
        '-i', `"${playlistUrl}"`, // Input playlist
        '-c', 'copy',            // Copy codec (faster, no re-encode)
        '-bsf:a', 'aac_adtstoasc', // Fix AAC format
        '-movflags', '+faststart',  // Web optimization
        '-progress', 'pipe:1',      // Progress to stdout
        `"${outputFile}"`
      ].join(' ');

      console.log(`Command: ${command}`);

      this.onProgress({
        stage: 'downloading',
        message: 'FFmpeg đang tải và ghép video...',
        progress: 30,
      });

      // Execute với progress tracking
      const process = exec(command);

      let lastProgress = 30;

      // Track progress from FFmpeg output
      process.stdout?.on('data', (data) => {
        const output = data.toString();
        
        // Try to extract time from progress
        const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2})/);
        if (timeMatch) {
          const [, hours, minutes, seconds] = timeMatch;
          const totalSeconds = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
          
          // Estimate progress (assume 5 min video max for now)
          const estimatedDuration = 300; // 5 minutes
          const progress = Math.min(90, 30 + (totalSeconds / estimatedDuration) * 60);
          
          if (progress > lastProgress) {
            lastProgress = progress;
            this.onProgress({
              stage: 'downloading',
              message: `Đang tải: ${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`,
              progress: Math.round(progress),
            });
          }
        }
      });

      process.stderr?.on('data', (data) => {
        const output = data.toString();
        console.log('FFmpeg:', output);
      });

      // Wait for completion
      await new Promise((resolve, reject) => {
        process.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`FFmpeg exited with code ${code}`));
          }
        });

        process.on('error', (error) => {
          reject(error);
        });
      });

      if (!fs.existsSync(outputFile)) {
        throw new Error('FFmpeg không tạo được file output');
      }

      const fileSize = fs.statSync(outputFile).size;
      console.log(`Download completed: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

      this.onProgress({
        stage: 'finalizing',
        message: 'Đang hoàn tất...',
        progress: 95,
      });

    } catch (error) {
      throw new Error(`Lỗi khi download HLS: ${error.message}`);
    }
  }

  /**
   * Cleanup temp files
   */
  cleanup() {
    try {
      if (fs.existsSync(this.tempDir)) {
        fs.rmSync(this.tempDir, { recursive: true, force: true });
        console.log('Đã xóa temp files');
      }
    } catch (error) {
      console.error('Lỗi khi cleanup:', error.message);
    }
  }
}
