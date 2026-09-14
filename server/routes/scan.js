import express from 'express';
import { scanVideoLinks } from '../services/videoScanner.js';

const router = express.Router();

/**
 * POST /api/scan
 * Body: { url: string }
 * Response: { success, url, count, videos: [] }
 */
router.post('/', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL là bắt buộc'
      });
    }

    // Validate URL
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({
        success: false,
        error: 'URL không hợp lệ'
      });
    }

    const result = await scanVideoLinks(url);
    res.json(result);

  } catch (error) {
    console.error('Error in scan route:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
