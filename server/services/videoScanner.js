import axios from 'axios';
import * as cheerio from 'cheerio';
import { getVimeoPlaylistUrl } from './vimeoHelper.js';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/151.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate',
  'Connection': 'keep-alive',
};

/**
 * Scan một URL để tìm các video links
 */
export async function scanVideoLinks(url) {
  try {
    console.log(`Đang scan URL: ${url}`);
    
    const response = await axios.get(url, {
      headers: HEADERS,
      timeout: 30000,
      maxRedirects: 5,
    });

    const html = response.data;
    const $ = cheerio.load(html);
    const videos = [];

    // 1. Tìm các thẻ video
    $('video').each((i, elem) => {
      const src = $(elem).attr('src');
      const poster = $(elem).attr('poster');
      
      if (src) {
        videos.push({
          type: 'direct',
          format: getVideoFormat(src),
          url: makeAbsoluteUrl(src, url),
          poster: poster ? makeAbsoluteUrl(poster, url) : null,
          source: 'video_tag',
        });
      }

      // Tìm source tags bên trong video
      $(elem).find('source').each((j, source) => {
        const srcUrl = $(source).attr('src');
        const type = $(source).attr('type');
        
        if (srcUrl) {
          videos.push({
            type: 'direct',
            format: type || getVideoFormat(srcUrl),
            url: makeAbsoluteUrl(srcUrl, url),
            poster: poster ? makeAbsoluteUrl(poster, url) : null,
            source: 'source_tag',
          });
        }
      });
    });

    // 2. Tìm các link .mp4, .webm, .m3u8, .mpd - IMPROVED
    const videoExtensions = ['.mp4', '.webm', '.ogv', '.m3u8', '.mpd', '.ts'];
    
    // Check nhiều attributes hơn
    const attributesToCheck = ['href', 'src', 'data-src', 'data-video', 'data-video-src', 'data-url', 'data-file'];
    
    $('a, source, video, iframe, div[data-video], div[data-src]').each((i, elem) => {
      let videoUrl = null;
      
      // Check tất cả các attributes
      for (const attr of attributesToCheck) {
        const value = $(elem).attr(attr);
        if (value) {
          videoUrl = value;
          break;
        }
      }
      
      if (videoUrl) {
        const lowerUrl = videoUrl.toLowerCase();
        
        for (const ext of videoExtensions) {
          if (lowerUrl.includes(ext)) {
            videos.push({
              type: getVideoType(lowerUrl),
              format: getVideoFormat(videoUrl),
              url: makeAbsoluteUrl(videoUrl, url),
              source: 'link',
            });
            break;
          }
        }
      }
    });

    // 3. Tìm Vimeo playlist URLs và video IDs
    const vimeoRegex = /https?:\/\/[^"'\s]*vimeocdn\.com[^"'\s]*playlist\.json[^"'\s]*/gi;
    const vimeoMatches = html.match(vimeoRegex);
    
    if (vimeoMatches) {
      vimeoMatches.forEach(match => {
        videos.push({
          type: 'vimeo_playlist',
          format: 'ts_segments',
          url: match,
          source: 'vimeo',
        });
      });
    }

    // Tìm Vimeo video IDs từ player.vimeo.com
    const vimeoPlayerRegex = /player\.vimeo\.com\/video\/(\d+)/gi;
    let vimeoIdMatch;
    while ((vimeoIdMatch = vimeoPlayerRegex.exec(html)) !== null) {
      const videoId = vimeoIdMatch[1];
      videos.push({
        type: 'vimeo_embedded',
        format: 'vimeo',
        url: `https://player.vimeo.com/video/${videoId}`,
        videoId: videoId,
        source: 'vimeo_iframe',
      });
    }

    // Tìm Vimeo video IDs từ vimeo.com URLs
    const vimeoDirectRegex = /vimeo\.com\/(\d+)/gi;
    let vimeoDirectMatch;
    while ((vimeoDirectMatch = vimeoDirectRegex.exec(html)) !== null) {
      const videoId = vimeoDirectMatch[1];
      videos.push({
        type: 'vimeo_embedded',
        format: 'vimeo',
        url: `https://vimeo.com/${videoId}`,
        videoId: videoId,
        source: 'vimeo_link',
      });
    }

    // 4. Tìm các JSON config có thể chứa video URLs
    $('script[type="application/json"], script[type="application/ld+json"]').each((i, elem) => {
      try {
        const jsonText = $(elem).html();
        const jsonData = JSON.parse(jsonText);
        
        const videoUrls = findVideoUrlsInJson(jsonData);
        videoUrls.forEach(videoUrl => {
          videos.push({
            type: getVideoType(videoUrl),
            format: getVideoFormat(videoUrl),
            url: makeAbsoluteUrl(videoUrl, url),
            source: 'json_config',
          });
        });
      } catch (e) {
        // Ignore invalid JSON
      }
    });

    // 5. Tìm trong inline scripts - IMPROVED
    $('script:not([src])').each((i, elem) => {
      const scriptContent = $(elem).html();
      if (!scriptContent) return;

      // Tìm URLs trong script - nhiều patterns
      const urlPatterns = [
        // Standard video URLs
        /(https?:\/\/[^\s"'`]+\.(?:mp4|webm|m3u8|mpd|ts)(?:[^\s"'`]*)?)/gi,
        // URLs with query params
        /(https?:\/\/[^\s"'`]+\.mp4[^\s"'`]*)/gi,
        // Vimeo/CDN URLs
        /(https?:\/\/[^\s"'`]*(?:vimeocdn|cloudfront|akamai)[^\s"'`]*\.(?:mp4|m3u8))/gi,
        // JSON playlist URLs
        /(https?:\/\/[^\s"'`]*playlist\.json[^\s"'`]*)/gi,
      ];

      for (const pattern of urlPatterns) {
        const matches = scriptContent.match(pattern);
        if (matches) {
          matches.forEach(match => {
            // Clean escaped characters
            const cleanUrl = match
              .replace(/\\u002F/g, '/')
              .replace(/\\\//g, '/')
              .replace(/\\"/g, '')
              .replace(/\\/g, '');

            videos.push({
              type: getVideoType(cleanUrl),
              format: getVideoFormat(cleanUrl),
              url: cleanUrl,
              source: 'inline_script',
            });
          });
        }
      }

      // Tìm video sources trong data attributes và config objects
      const dataSourceRegex = /["'](?:src|source|url|file|video)["']\s*:\s*["'](https?:\/\/[^"']+)["']/gi;
      let dataMatch;
      while ((dataMatch = dataSourceRegex.exec(scriptContent)) !== null) {
        const videoUrl = dataMatch[1];
        if (isVideoUrl(videoUrl)) {
          videos.push({
            type: getVideoType(videoUrl),
            format: getVideoFormat(videoUrl),
            url: videoUrl,
            source: 'script_config',
          });
        }
      }

      // Tìm Vimeo config
      const vimeoConfigRegex = /"url":"(https?:\/\/[^"]*vimeocdn\.com[^"]*\.json[^"]*)"/gi;
      let vimeoMatch;
      while ((vimeoMatch = vimeoConfigRegex.exec(scriptContent)) !== null) {
        videos.push({
          type: 'vimeo_playlist',
          format: 'ts_segments',
          url: vimeoMatch[1].replace(/\\u002F/g, '/').replace(/\\/g, ''),
          source: 'vimeo_config',
        });
      }
    });

    // 6. Scan external JavaScript files để tìm video configs
    const externalScripts = $('script[src]').map((i, el) => $(el).attr('src')).get();
    
    for (const scriptSrc of externalScripts) {
      // Chỉ scan các script có thể chứa video config (player, vendor, etc.)
      const scriptUrl = scriptSrc.toLowerCase();
      if (scriptUrl.includes('player') || scriptUrl.includes('video') || scriptUrl.includes('vendor')) {
        try {
          const scriptFullUrl = makeAbsoluteUrl(scriptSrc, url);
          console.log(`Scanning external script: ${scriptFullUrl}`);
          
          const scriptResponse = await axios.get(scriptFullUrl, {
            headers: HEADERS,
            timeout: 10000,
          });
          
          const scriptContent = scriptResponse.data;
          
          // Tìm video URLs trong external script
          const videoUrlPattern = /(https?:\/\/[^\s"'`]+\.(?:mp4|webm|m3u8|json)(?:[^\s"'`]*)?)/gi;
          const scriptMatches = scriptContent.match(videoUrlPattern);
          
          if (scriptMatches) {
            scriptMatches.forEach(match => {
              const cleanUrl = match.replace(/\\/g, '');
              if (isVideoUrl(cleanUrl)) {
                videos.push({
                  type: getVideoType(cleanUrl),
                  format: getVideoFormat(cleanUrl),
                  url: cleanUrl,
                  source: 'external_script',
                });
              }
            });
          }
        } catch (err) {
          // Ignore script loading errors
          console.log(`Could not load script: ${scriptSrc}`);
        }
      }
    }

    // Loại bỏ duplicates
    const uniqueVideos = Array.from(
      new Map(videos.map(v => [v.url, v])).values()
    );

    // Fetch Vimeo playlist URLs cho các Vimeo embedded videos
    const vimeoEmbedded = uniqueVideos.filter(v => v.type === 'vimeo_embedded');
    for (const vimeoVideo of vimeoEmbedded) {
      try {
        const vimeoData = await getVimeoPlaylistUrl(vimeoVideo.videoId);
        
        // Add playlist URL nếu có
        if (vimeoData.playlistUrl) {
          videos.push({
            type: 'vimeo_playlist',
            format: 'ts_segments',
            url: vimeoData.playlistUrl,
            source: `vimeo_${vimeoVideo.videoId}`,
            videoId: vimeoVideo.videoId,
          });
        }

        // Add progressive URLs (direct MP4)
        if (vimeoData.progressiveUrls && vimeoData.progressiveUrls.length > 0) {
          vimeoData.progressiveUrls.forEach(prog => {
            videos.push({
              type: 'direct',
              format: 'mp4',
              url: prog.url,
              source: `vimeo_${vimeoVideo.videoId}_progressive`,
              quality: `${prog.width}x${prog.height}`,
            });
          });
        }
      } catch (err) {
        console.log(`Could not fetch Vimeo playlist for ${vimeoVideo.videoId}: ${err.message}`);
      }
    }

    // Re-deduplicate after adding Vimeo URLs
    const allVideos = Array.from(
      new Map(videos.map(v => [v.url, v])).values()
    );

    // Filter out Vimeo embedded iframes - chỉ giữ playlist URLs
    const finalUniqueVideos = allVideos.filter(v => {
      // Loại bỏ Vimeo embedded (chỉ là iframe player)
      if (v.type === 'vimeo_embedded') {
        return false;
      }
      return true;
    });

    console.log(`Tìm thấy ${finalUniqueVideos.length} video(s) (filtered)`);
    
    // Log để debug
    if (finalUniqueVideos.length > 0) {
      console.log('Videos found:');
      finalUniqueVideos.forEach(v => console.log(`  - ${v.format} (${v.type}): ${v.url.substring(0, 100)}...`));
    }
    
    return {
      success: true,
      url: url,
      count: finalUniqueVideos.length,
      videos: finalUniqueVideos,
    };

  } catch (error) {
    console.error('Lỗi khi scan URL:', error.message);
    throw new Error(`Không thể scan URL: ${error.message}`);
  }
}

/**
 * Tìm video URLs trong JSON object (recursive)
 */
function findVideoUrlsInJson(obj, urls = []) {
  if (typeof obj === 'string') {
    if (isVideoUrl(obj)) {
      urls.push(obj);
    }
  } else if (Array.isArray(obj)) {
    obj.forEach(item => findVideoUrlsInJson(item, urls));
  } else if (obj && typeof obj === 'object') {
    Object.values(obj).forEach(value => findVideoUrlsInJson(value, urls));
  }
  
  return urls;
}

/**
 * Kiểm tra xem string có phải video URL không
 */
function isVideoUrl(str) {
  if (typeof str !== 'string') return false;
  
  const videoExtensions = ['.mp4', '.webm', '.ogv', '.m3u8', '.mpd', '.ts'];
  const lower = str.toLowerCase();
  
  return str.startsWith('http') && 
         videoExtensions.some(ext => lower.includes(ext));
}

/**
 * Xác định loại video
 */
function getVideoType(url) {
  const lower = url.toLowerCase();
  
  if (lower.includes('vimeocdn.com') && lower.includes('.json')) {
    return 'vimeo_playlist';
  } else if (lower.includes('.m3u8')) {
    return 'hls';
  } else if (lower.includes('.mpd')) {
    return 'dash';
  } else if (lower.includes('.ts') && !lower.includes('playlist')) {
    return 'ts_segment';
  } else {
    return 'direct';
  }
}

/**
 * Lấy format từ URL
 */
function getVideoFormat(url) {
  const lower = url.toLowerCase();
  
  if (lower.includes('.mp4')) return 'mp4';
  if (lower.includes('.webm')) return 'webm';
  if (lower.includes('.ogv')) return 'ogv';
  if (lower.includes('.m3u8')) return 'm3u8';
  if (lower.includes('.mpd')) return 'mpd';
  if (lower.includes('.ts')) return 'ts';
  if (lower.includes('playlist.json')) return 'ts_segments';
  
  return 'unknown';
}

/**
 * Convert relative URL to absolute URL
 */
function makeAbsoluteUrl(relativeUrl, baseUrl) {
  try {
    if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
      return relativeUrl;
    }
    
    const base = new URL(baseUrl);
    const absolute = new URL(relativeUrl, base);
    return absolute.href;
  } catch (e) {
    return relativeUrl;
  }
}
