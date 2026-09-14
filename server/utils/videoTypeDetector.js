/**
 * Auto-detect video type và download method
 */

export function detectVideoType(url) {
  const urlLower = url.toLowerCase();
  
  // 1. YouTube & Google Video
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
    return {
      type: 'youtube',
      method: 'ytdl',
      supported: false, // Chưa support
      reason: 'YouTube requires ytdl-core or yt-dlp'
    };
  }

  // Google Video CDN (YouTube's CDN) - CÓ THỂ TẢI DIRECT
  if (urlLower.includes('googlevideo.com')) {
    return {
      type: 'google_video',
      method: 'direct',
      supported: true,
      note: 'Direct download from Google Video CDN'
    };
  }

  // 2. Vimeo
  if (urlLower.includes('vimeo.com') || urlLower.includes('vimeocdn.com')) {
    // Vimeo playlist JSON
    if (urlLower.includes('.json')) {
      return {
        type: 'vimeo_playlist',
        method: 'vimeo_downloader',
        supported: true
      };
    }
    // Vimeo player
    if (urlLower.includes('player.vimeo.com')) {
      return {
        type: 'vimeo_embedded',
        method: 'vimeo_helper',
        supported: true,
        note: 'Will extract playlist URL'
      };
    }
    // Direct vimeo.com link
    return {
      type: 'vimeo_direct',
      method: 'vimeo_helper',
      supported: true,
      note: 'Will extract playlist URL'
    };
  }

  // 3. HLS (.m3u8)
  if (urlLower.includes('.m3u8')) {
    return {
      type: 'hls',
      method: 'ffmpeg',
      supported: true
    };
  }

  // 4. DASH (.mpd)
  if (urlLower.includes('.mpd')) {
    return {
      type: 'dash',
      method: 'ffmpeg',
      supported: false, // TODO: Implement
      reason: 'DASH support coming soon'
    };
  }

  // 5. TS segments
  if (urlLower.includes('.ts')) {
    return {
      type: 'ts_segment',
      method: 'direct',
      supported: true,
      note: 'Single segment, may need playlist'
    };
  }

  // 6. Direct MP4
  if (urlLower.includes('.mp4')) {
    return {
      type: 'direct_mp4',
      method: 'direct',
      supported: true
    };
  }

  // 7. Direct WebM
  if (urlLower.includes('.webm')) {
    return {
      type: 'direct_webm',
      method: 'direct',
      supported: true
    };
  }

  // 8. Direct OGG/OGV
  if (urlLower.includes('.ogg') || urlLower.includes('.ogv')) {
    return {
      type: 'direct_ogg',
      method: 'direct',
      supported: true
    };
  }

  // 9. Facebook
  if (urlLower.includes('facebook.com') || urlLower.includes('fb.watch')) {
    return {
      type: 'facebook',
      method: 'fb_downloader',
      supported: false,
      reason: 'Facebook requires special handling'
    };
  }

  // 10. Instagram
  if (urlLower.includes('instagram.com')) {
    return {
      type: 'instagram',
      method: 'insta_downloader',
      supported: false,
      reason: 'Instagram requires authentication'
    };
  }

  // 11. TikTok
  if (urlLower.includes('tiktok.com')) {
    return {
      type: 'tiktok',
      method: 'tiktok_downloader',
      supported: false,
      reason: 'TikTok requires special handling'
    };
  }

  // 12. Twitter/X
  if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) {
    return {
      type: 'twitter',
      method: 'twitter_downloader',
      supported: false,
      reason: 'Twitter/X requires API access'
    };
  }

  // Unknown
  return {
    type: 'unknown',
    method: 'unknown',
    supported: false,
    reason: 'Video type not recognized'
  };
}

/**
 * Get recommended download type for backend
 */
export function getDownloadType(url) {
  const detection = detectVideoType(url);

  // Map detection to download route types
  switch (detection.type) {
    case 'vimeo_playlist':
      return 'vimeo_playlist';
    
    case 'vimeo_embedded':
    case 'vimeo_direct':
      return 'hls'; // Will be converted to HLS playlist
    
    case 'hls':
      return 'hls';
    
    case 'google_video':
    case 'direct_mp4':
    case 'direct_webm':
    case 'direct_ogg':
      return 'direct';
    
    default:
      return null;
  }
}

/**
 * Check if URL is supported
 */
export function isSupported(url) {
  const detection = detectVideoType(url);
  return detection.supported;
}

/**
 * Get user-friendly message
 */
export function getVideoTypeMessage(url) {
  const detection = detectVideoType(url);

  if (detection.supported) {
    return {
      success: true,
      message: `Detected: ${detection.type}`,
      downloadType: getDownloadType(url)
    };
  } else {
    return {
      success: false,
      message: `Not supported: ${detection.type}`,
      reason: detection.reason || 'Unknown format'
    };
  }
}

export default {
  detectVideoType,
  getDownloadType,
  isSupported,
  getVideoTypeMessage
};
