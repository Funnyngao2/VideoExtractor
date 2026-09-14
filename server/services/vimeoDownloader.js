import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import ParallelDownloader from '../utils/parallelDownloader.js';

const execPromise = promisify(exec);

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/151.0.0.0 Safari/537.36',
};

/**
 * Download video từ Vimeo playlist (TS segments)
 */
export class VimeoDownloader {
  constructor(playlistUrl, downloadId, onProgress) {
    this.playlistUrl = playlistUrl;
    this.downloadId = downloadId;
    this.onProgress = onProgress || (() => {});
    this.tempDir = path.join(process.cwd(), 'temp', downloadId);
    this.downloadDir = path.join(process.cwd(), 'downloads');
  }

  /**
   * Main download function
   */
  async download() {
    try {
      // Tạo temp directory
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }

      if (!fs.existsSync(this.downloadDir)) {
        fs.mkdirSync(this.downloadDir, { recursive: true });
      }

      this.onProgress({
        stage: 'fetching_playlist',
        message: 'Đang tải playlist...',
        progress: 0,
      });

      // 1. Download playlist
      const playlist = await this.fetchPlaylist();

      this.onProgress({
        stage: 'analyzing',
        message: 'Đang phân tích playlist...',
        progress: 5,
      });

      // 2. Chọn video và audio tốt nhất
      const { video, audio, baseUrl } = this.selectBestQuality(playlist);

      // 3. Download video track
      const videoFile = path.join(this.tempDir, 'video_raw.mp4');
      await this.downloadTrack(video, baseUrl, videoFile, 'video');

      // 4. Download audio track (nếu có)
      let audioFile = null;
      if (audio) {
        audioFile = path.join(this.tempDir, 'audio_raw.mp4');
        await this.downloadTrack(audio, baseUrl, audioFile, 'audio');
      }

      // 5. Merge với FFmpeg
      const outputFile = path.join(this.downloadDir, `${this.downloadId}.mp4`);
      await this.mergeWithFFmpeg(videoFile, audioFile, outputFile);

      // 6. Cleanup temp files
      this.cleanup();

      this.onProgress({
        stage: 'completed',
        message: 'Hoàn thành!',
        progress: 100,
        outputFile: outputFile,
        fileName: `${this.downloadId}.mp4`,
      });

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
   * Fetch playlist JSON
   */
  async fetchPlaylist() {
    try {
      const response = await axios.get(this.playlistUrl, {
        headers: HEADERS,
        timeout: 30000,
      });

      return response.data;
    } catch (error) {
      throw new Error(`Không thể tải playlist: ${error.message}`);
    }
  }

  /**
   * Chọn video và audio chất lượng tốt nhất
   */
  selectBestQuality(playlist) {
    const videos = playlist.video || [];
    const audios = playlist.audio || [];

    if (videos.length === 0) {
      throw new Error('Không tìm thấy video stream trong playlist');
    }

    // Chọn video cao nhất
    const bestVideo = videos.reduce((best, current) => {
      const bestScore = (best.width || 0) * (best.height || 0) * (best.bitrate || 0);
      const currentScore = (current.width || 0) * (current.height || 0) * (current.bitrate || 0);
      return currentScore > bestScore ? current : best;
    });

    // Chọn audio tốt nhất (nếu có)
    let bestAudio = null;
    if (audios.length > 0) {
      bestAudio = audios.reduce((best, current) => {
        return (current.bitrate || 0) > (best.bitrate || 0) ? current : best;
      });
    }

    const baseUrl = this.makeBaseUrl(playlist.base_url || '');

    console.log(`Video chọn: ${bestVideo.width}x${bestVideo.height} @ ${(bestVideo.bitrate / 1000000).toFixed(2)} Mbps`);
    if (bestAudio) {
      console.log(`Audio chọn: ${(bestAudio.bitrate / 1000).toFixed(0)} kbps`);
    }

    return {
      video: bestVideo,
      audio: bestAudio,
      baseUrl: baseUrl,
    };
  }

  /**
   * Make base URL
   */
  makeBaseUrl(baseUrlPath) {
    try {
      const playlistUrlObj = new URL(this.playlistUrl);
      const baseUrlObj = new URL(baseUrlPath, playlistUrlObj);
      return baseUrlObj.href;
    } catch (e) {
      return this.playlistUrl.substring(0, this.playlistUrl.lastIndexOf('/') + 1);
    }
  }

  /**
   * Download một track (video hoặc audio) với PARALLEL downloads
   */
  async downloadTrack(track, baseUrl, outputFile, trackType) {
    const segments = track.segments || [];
    
    if (segments.length === 0) {
      throw new Error(`Track ${trackType} không có segments`);
    }

    this.onProgress({
      stage: `downloading_${trackType}`,
      message: `Đang tải ${trackType}...`,
      progress: trackType === 'video' ? 10 : 50,
    });

    const writeStream = fs.createWriteStream(outputFile);

    try {
      // Write init segment
      if (track.init_segment) {
        // Base64 encoded init segment
        const initData = Buffer.from(track.init_segment, 'base64');
        writeStream.write(initData);
        console.log(`Init segment (${trackType}): ${(initData.length / 1024).toFixed(1)} KB`);
      } else if (track.init_segment_url) {
        // Init segment URL
        const initUrl = new URL(track.init_segment_url, baseUrl).href;
        const initResponse = await axios.get(initUrl, {
          headers: HEADERS,
          responseType: 'arraybuffer',
          timeout: 60000,
        });
        writeStream.write(Buffer.from(initResponse.data));
      }

      // Prepare segments for parallel download
      const segmentUrls = segments.map((segment, index) => ({
        url: new URL(segment.url, baseUrl).href,
        index: index,
      }));

      const totalSegments = segments.length;
      const progressStart = trackType === 'video' ? 10 : 50;
      const progressRange = 40;

      // Download segments in parallel (5 concurrent)
      const downloader = new ParallelDownloader(5);
      
      const downloadedSegments = await downloader.downloadSegmentsParallel(
        segmentUrls,
        HEADERS,
        (completed, total) => {
          const progressPercent = progressStart + (completed / total) * progressRange;
          
          this.onProgress({
            stage: `downloading_${trackType}`,
            message: `Đang tải ${trackType}: ${completed}/${total} (parallel)`,
            progress: Math.round(progressPercent),
          });
        }
      );

      // Write all segments in order
      for (const segment of downloadedSegments) {
        writeStream.write(segment.data);
      }

      writeStream.end();

      // Wait for write to finish
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      const fileSize = fs.statSync(outputFile).size;
      console.log(`Hoàn thành ${trackType}: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

    } catch (error) {
      writeStream.destroy();
      throw new Error(`Lỗi tải ${trackType}: ${error.message}`);
    }
  }

  /**
   * Merge video và audio với FFmpeg
   */
  async mergeWithFFmpeg(videoFile, audioFile, outputFile) {
    this.onProgress({
      stage: 'merging',
      message: 'Đang ghép video và audio...',
      progress: 90,
    });

    try {
      let command;

      if (audioFile && fs.existsSync(audioFile)) {
        // Merge video + audio
        command = `ffmpeg -y -i "${videoFile}" -i "${audioFile}" -map 0:v:0 -map 1:a:0 -c copy -movflags +faststart "${outputFile}"`;
      } else {
        // Chỉ có video
        command = `ffmpeg -y -i "${videoFile}" -c copy -movflags +faststart "${outputFile}"`;
      }

      console.log('Running FFmpeg command...');
      const { stdout, stderr } = await execPromise(command);

      if (!fs.existsSync(outputFile)) {
        throw new Error('FFmpeg không tạo được file output');
      }

      const fileSize = fs.statSync(outputFile).size;
      console.log(`File output: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

      this.onProgress({
        stage: 'merging',
        message: 'Đã ghép xong!',
        progress: 95,
      });

    } catch (error) {
      throw new Error(`Lỗi khi merge với FFmpeg: ${error.message}`);
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
