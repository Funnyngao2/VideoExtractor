import axios from 'axios';
import fs from 'fs';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const appendFile = promisify(fs.appendFile);

/**
 * Download nhiều segments song song với concurrency limit
 */
export class ParallelDownloader {
  constructor(maxConcurrent = 5) {
    this.maxConcurrent = maxConcurrent;
    this.activeDownloads = 0;
    this.queue = [];
  }

  /**
   * Download một segment
   */
  async downloadSegment(url, headers, timeout = 120000) {
    try {
      const response = await axios.get(url, {
        headers: headers,
        responseType: 'arraybuffer',
        timeout: timeout,
      });
      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(`Failed to download segment: ${error.message}`);
    }
  }

  /**
   * Download nhiều segments song song
   * @param {Array} segments - Array of {url, index}
   * @param {Object} headers - HTTP headers
   * @param {Function} onProgress - Callback (completedCount, totalCount)
   * @returns {Array} - Array of {index, data}
   */
  async downloadSegmentsParallel(segments, headers, onProgress) {
    const results = [];
    const total = segments.length;
    let completed = 0;

    // Create download tasks
    const downloadTasks = segments.map((segment, index) => {
      return async () => {
        const data = await this.downloadSegment(segment.url, headers);
        completed++;
        
        if (onProgress) {
          onProgress(completed, total);
        }

        return {
          index: segment.index !== undefined ? segment.index : index,
          data: data,
        };
      };
    });

    // Execute with concurrency limit
    const executeWithLimit = async (tasks) => {
      const executing = [];
      
      for (const task of tasks) {
        const promise = task().then(result => {
          // Remove from executing when done
          executing.splice(executing.indexOf(promise), 1);
          return result;
        });
        
        results.push(promise);
        executing.push(promise);

        // Wait if we hit the concurrency limit
        if (executing.length >= this.maxConcurrent) {
          await Promise.race(executing);
        }
      }

      // Wait for all remaining
      return Promise.all(results);
    };

    const downloadedSegments = await executeWithLimit(downloadTasks);

    // Sort by index to maintain order
    downloadedSegments.sort((a, b) => a.index - b.index);

    return downloadedSegments;
  }

  /**
   * Download và write segments trực tiếp vào file (memory efficient)
   */
  async downloadAndWrite(segments, headers, outputFile, onProgress) {
    // Create empty file
    await writeFile(outputFile, '');

    const total = segments.length;
    let completed = 0;
    const bufferMap = new Map(); // Store out-of-order segments
    let nextIndex = 0;

    const downloadTasks = segments.map((segment, index) => {
      return async () => {
        const data = await this.downloadSegment(segment.url, headers);
        
        // Check if this is the next segment to write
        if (index === nextIndex) {
          // Write immediately
          await appendFile(outputFile, data);
          nextIndex++;

          // Write any buffered segments that are now in order
          while (bufferMap.has(nextIndex)) {
            await appendFile(outputFile, bufferMap.get(nextIndex));
            bufferMap.delete(nextIndex);
            nextIndex++;
          }
        } else {
          // Buffer for later
          bufferMap.set(index, data);
        }

        completed++;
        if (onProgress) {
          onProgress(completed, total);
        }

        return { index, size: data.length };
      };
    });

    // Execute with concurrency limit
    const executing = [];
    
    for (const task of downloadTasks) {
      const promise = task().then(result => {
        executing.splice(executing.indexOf(promise), 1);
        return result;
      });
      
      executing.push(promise);

      if (executing.length >= this.maxConcurrent) {
        await Promise.race(executing);
      }
    }

    // Wait for all
    await Promise.all(executing);

    // Write any remaining buffered segments (shouldn't happen but safety)
    const remainingIndexes = Array.from(bufferMap.keys()).sort((a, b) => a - b);
    for (const index of remainingIndexes) {
      await appendFile(outputFile, bufferMap.get(index));
    }
  }
}

export default ParallelDownloader;
