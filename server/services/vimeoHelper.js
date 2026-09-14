import axios from 'axios';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/151.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.5',
  'Referer': 'https://player.vimeo.com/',
};

/**
 * Lấy playlist URL từ Vimeo video ID
 */
export async function getVimeoPlaylistUrl(videoId) {
  try {
    console.log(`Fetching Vimeo config for video ID: ${videoId}`);
    
    // Fetch Vimeo player page
    const playerUrl = `https://player.vimeo.com/video/${videoId}`;
    const response = await axios.get(playerUrl, {
      headers: HEADERS,
      timeout: 15000,
    });

    const html = response.data;

    // Tìm config JSON trong HTML - nhiều patterns
    const configPatterns = [
      /var\s+config\s*=\s*({[\s\S]*?});/,
      /window\.playerConfig\s*=\s*({[\s\S]*?});/,
      /"config":\s*({[\s\S]*?}),/,
      /data-config='({[\s\S]*?})'/,
      /data-config="({[\s\S]*?})"/,
    ];

    let config = null;

    for (const pattern of configPatterns) {
      const match = html.match(pattern);
      if (match) {
        try {
          config = JSON.parse(match[1]);
          console.log('Found config with pattern');
          break;
        } catch (e) {
          continue;
        }
      }
    }

    // Tìm trực tiếp trong script tags
    if (!config) {
      const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
      let scriptMatch;
      
      while ((scriptMatch = scriptRegex.exec(html)) !== null) {
        const scriptContent = scriptMatch[1];
        
        // Tìm JSON object có chứa "request" và "files"
        if (scriptContent.includes('"request"') && scriptContent.includes('"files"')) {
          // Try to extract JSON
          const jsonMatch = scriptContent.match(/({[\s\S]*"request"[\s\S]*"files"[\s\S]*})/);
          if (jsonMatch) {
            try {
              config = JSON.parse(jsonMatch[1]);
              console.log('Found config in script tag');
              break;
            } catch (e) {
              // Continue searching
            }
          }
        }
      }
    }

    if (!config) {
      // Try alternative API endpoint
      console.log('Trying Vimeo API endpoint...');
      
      try {
        const apiUrl = `https://api.vimeo.com/videos/${videoId}`;
        const apiResponse = await axios.get(apiUrl, {
          headers: {
            ...HEADERS,
            'Authorization': 'bearer', // Public API
          },
          timeout: 10000,
        });

        // This might not work without auth, but worth a try
        if (apiResponse.data && apiResponse.data.files) {
          config = { request: { files: apiResponse.data.files } };
        }
      } catch (apiErr) {
        console.log('API endpoint failed:', apiErr.message);
      }
    }

    if (!config) {
      // Return the embedded URL itself so user can try
      return {
        playlistUrl: null,
        progressiveUrls: [],
        videoId: videoId,
        embedUrl: playerUrl,
      };
    }

    // Tìm playlist URL trong config
    const cdnUrl = config?.request?.files?.hls?.cdns;
    const dashCdnUrl = config?.request?.files?.dash?.cdns;
    const progressiveFiles = config?.request?.files?.progressive;

    let playlistUrl = null;

    // Priority 1: HLS playlist (best for TS segments)
    if (cdnUrl) {
      const cdnKeys = Object.keys(cdnUrl);
      if (cdnKeys.length > 0) {
        const firstCdn = cdnUrl[cdnKeys[0]];
        playlistUrl = firstCdn?.url;
      }
    }

    // Priority 2: DASH playlist
    if (!playlistUrl && dashCdnUrl) {
      const cdnKeys = Object.keys(dashCdnUrl);
      if (cdnKeys.length > 0) {
        const firstCdn = dashCdnUrl[cdnKeys[0]];
        playlistUrl = firstCdn?.url;
      }
    }

    // Priority 3: Progressive files (direct MP4)
    const progressiveUrls = [];
    if (progressiveFiles && Array.isArray(progressiveFiles)) {
      progressiveFiles.forEach(file => {
        if (file.url) {
          progressiveUrls.push({
            url: file.url,
            quality: file.quality || 'unknown',
            width: file.width,
            height: file.height,
            type: 'progressive',
          });
        }
      });
    }

    return {
      playlistUrl: playlistUrl,
      progressiveUrls: progressiveUrls,
      videoId: videoId,
      embedUrl: playerUrl,
    };

  } catch (error) {
    console.error(`Error fetching Vimeo config: ${error.message}`);
    // Return basic info instead of throwing
    return {
      playlistUrl: null,
      progressiveUrls: [],
      videoId: videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}`,
      error: error.message,
    };
  }
}

/**
 * Parse Vimeo player URL để lấy video ID
 */
export function parseVimeoId(url) {
  const patterns = [
    /player\.vimeo\.com\/video\/(\d+)/,
    /vimeo\.com\/(\d+)/,
    /vimeo\.com\/channels\/[\w-]+\/(\d+)/,
    /vimeo\.com\/groups\/[\w-]+\/videos\/(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}
