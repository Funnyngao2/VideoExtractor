import fs from 'fs';
import path from 'path';

/**
 * Cleanup Service - Tự động xóa file sau một khoảng thời gian
 */
class CleanupService {
  constructor() {
    this.scheduledCleanups = new Map();
    this.downloadDir = path.join(process.cwd(), 'downloads');
  }

  /**
   * Schedule cleanup cho một file sau X milliseconds
   */
  scheduleCleanup(filePath, delayMs = 15 * 60 * 1000) { // Default 15 phút
    const fileName = path.basename(filePath);
    
    console.log(`Scheduled cleanup for ${fileName} in ${delayMs / 1000 / 60} minutes`);

    const timeoutId = setTimeout(() => {
      this.cleanupFile(filePath);
      this.scheduledCleanups.delete(filePath);
    }, delayMs);

    this.scheduledCleanups.set(filePath, {
      timeoutId,
      scheduledAt: new Date(),
      deleteAt: new Date(Date.now() + delayMs),
      fileName,
    });
  }

  /**
   * Xóa file
   */
  cleanupFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`✅ Cleaned up file: ${path.basename(filePath)}`);
      } else {
        console.log(`⚠️ File already removed: ${path.basename(filePath)}`);
      }
    } catch (error) {
      console.error(`❌ Error cleaning up file ${filePath}:`, error.message);
    }
  }

  /**
   * Cancel scheduled cleanup
   */
  cancelCleanup(filePath) {
    const scheduled = this.scheduledCleanups.get(filePath);
    if (scheduled) {
      clearTimeout(scheduled.timeoutId);
      this.scheduledCleanups.delete(filePath);
      console.log(`Cancelled cleanup for ${scheduled.fileName}`);
    }
  }

  /**
   * Lấy danh sách scheduled cleanups
   */
  getScheduledCleanups() {
    return Array.from(this.scheduledCleanups.entries()).map(([filePath, info]) => ({
      filePath,
      ...info,
    }));
  }

  /**
   * Cleanup tất cả files trong download directory cũ hơn X milliseconds
   */
  cleanupOldFiles(maxAgeMs = 15 * 60 * 1000) {
    try {
      if (!fs.existsSync(this.downloadDir)) {
        return;
      }

      const files = fs.readdirSync(this.downloadDir);
      const now = Date.now();
      let cleanedCount = 0;

      files.forEach(file => {
        const filePath = path.join(this.downloadDir, file);
        const stats = fs.statSync(filePath);

        // Check nếu file cũ hơn maxAge
        const fileAge = now - stats.mtimeMs;
        if (fileAge > maxAgeMs) {
          this.cleanupFile(filePath);
          cleanedCount++;
        }
      });

      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} old file(s)`);
      }
    } catch (error) {
      console.error('Error in cleanupOldFiles:', error.message);
    }
  }

  /**
   * Start periodic cleanup task (chạy mỗi 5 phút)
   */
  startPeriodicCleanup(intervalMs = 5 * 60 * 1000, maxAgeMs = 15 * 60 * 1000) {
    console.log(`🔄 Starting periodic cleanup every ${intervalMs / 1000 / 60} minutes`);
    
    // Cleanup ngay lập tức
    this.cleanupOldFiles(maxAgeMs);

    // Sau đó cleanup định kỳ
    setInterval(() => {
      this.cleanupOldFiles(maxAgeMs);
    }, intervalMs);
  }
}

// Singleton instance
const cleanupService = new CleanupService();

export default cleanupService;
