import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import scanRouter from './routes/scan.js';
import downloadRouter from './routes/download.js';
import cleanupService from './services/cleanupService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files - serve downloads folder
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

// Routes
app.use('/api/scan', scanRouter);
app.use('/api/download', downloadRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server đang chạy' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Đã xảy ra lỗi',
    message: err.message
  });
});

// Start cleanup service (xóa files cũ hơn 15 phút, check mỗi 5 phút)
cleanupService.startPeriodicCleanup(
  5 * 60 * 1000,   // Check every 5 minutes
  15 * 60 * 1000   // Delete files older than 15 minutes
);

app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
  console.log(`🧹 Auto-cleanup: Files sẽ bị xóa sau 15 phút`);
});
