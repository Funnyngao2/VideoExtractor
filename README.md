# 🎬 Video Downloader - Web Video Scanner & Downloader

Ứng dụng web để scan và tải video từ các trang web, hỗ trợ nhiều định dạng video bao gồm cả TS segments (Vimeo) và video trực tiếp (MP4, WebM, etc.).

## ✨ Tính năng

- 🔍 **Scan URL**: Tự động tìm kiếm tất cả video links trong một trang web
- 📹 **Hỗ trợ nhiều định dạng**:
  - Video trực tiếp: MP4, WebM, OGG
  - Streaming: HLS (.m3u8), DASH (.mpd)
  - Vimeo playlist (TS segments)
- ⬇️ **Download thông minh**:
  - Video MP4/WebM: Download trực tiếp với progress tracking
  - Video TS segments: Download từng segment, merge với FFmpeg
- 📊 **Real-time progress**: Theo dõi tiến độ download real-time
- 🎨 **UI đẹp mắt**: Giao diện hiện đại với gradient và animations

## 🏗️ Kiến trúc

```
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API service layer
│   │   └── App.jsx        # Main app
│   └── package.json
│
├── server/                 # Node.js + Express backend
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   │   ├── videoScanner.js      # Scan URLs tìm videos
│   │   ├── vimeoDownloader.js   # Download TS segments
│   │   └── directDownloader.js  # Download direct videos
│   ├── downloads/         # Downloaded videos
│   ├── temp/             # Temporary files
│   └── index.js
│
└── toolvideo.py          # Python version (reference)
```

## 📋 Yêu cầu hệ thống

- **Node.js**: v18+ 
- **npm**: v9+
- **FFmpeg**: Cần cài đặt để merge video TS segments

### Cài đặt FFmpeg

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

**Windows:**
- Download từ [ffmpeg.org](https://ffmpeg.org/download.html)
- Thêm vào PATH

**Kiểm tra FFmpeg:**
```bash
ffmpeg -version
```

## 🚀 Cài đặt

### 1. Clone repository

```bash
cd /home/thanhtechhub/Documents/appnoibo/toolstaivideo
```

### 2. Cài đặt Server

```bash
cd server
npm install
```

### 3. Cài đặt Client

```bash
cd ../client
npm install
```

## 🎯 Sử dụng

### Chạy Development Mode

**Terminal 1 - Server:**
```bash
cd server
npm start
# Server chạy tại http://localhost:5000
```

**Terminal 2 - Client:**
```bash
cd client
npm run dev
# Client chạy tại http://localhost:5173
```

Mở browser tại `http://localhost:5173`

### Chạy Production Mode

**Build client:**
```bash
cd client
npm run build
```

**Serve static files từ server:**
```bash
cd server
# Cập nhật server/index.js để serve client/dist
npm start
```

## 📖 Hướng dẫn sử dụng

### 1. Scan URL để tìm video

1. Nhập URL của trang web có video vào ô input
2. Click **"Scan Video"**
3. Đợi hệ thống quét trang web
4. Danh sách video sẽ hiển thị bên dưới

### 2. Download video

1. Từ danh sách video đã scan
2. Click nút **"⬇️ Tải xuống"** trên video muốn tải
3. Theo dõi progress bar trong phần "Đang tải"
4. Khi hoàn thành, click **"💾 Tải file"** để download về máy

### 3. Các loại video được hỗ trợ

- **MP4/WebM/OGG**: Tải trực tiếp từ URL
- **TS Segments (Vimeo)**: 
  - Tải playlist JSON
  - Download từng segment (video + audio)
  - Merge với FFmpeg
  - Export file MP4 cuối cùng

## 🔧 API Endpoints

### Server API (http://localhost:5000/api)

#### 1. Scan URL
```http
POST /api/scan
Content-Type: application/json

{
  "url": "https://example.com/video-page"
}

Response:
{
  "success": true,
  "url": "https://example.com/video-page",
  "count": 3,
  "videos": [
    {
      "type": "direct",
      "format": "mp4",
      "url": "https://example.com/video.mp4",
      "source": "video_tag"
    }
  ]
}
```

#### 2. Start Download
```http
POST /api/download
Content-Type: application/json

{
  "url": "https://video-url.mp4",
  "type": "direct"  // hoặc "vimeo_playlist"
}

Response:
{
  "success": true,
  "downloadId": "uuid-string",
  "message": "Download đã được khởi tạo"
}
```

#### 3. Get Download Progress
```http
GET /api/download/:downloadId/progress

Response:
{
  "id": "uuid",
  "url": "...",
  "status": "downloading",
  "progress": 45,
  "message": "Đang tải video: 10/20",
  "stage": "downloading_video"
}
```

#### 4. List All Downloads
```http
GET /api/download/list

Response:
{
  "success": true,
  "downloads": [...]
}
```

## 🎨 Screenshots

### Scan Form
- Input URL với validation
- Loading state khi đang scan
- Error messages

### Video List
- Format badges (MP4, TS, M3U8, etc.)
- Video type labels
- Download buttons

### Download Progress
- Real-time progress bars
- Stage messages (đang tải, đang merge, etc.)
- File size tracking
- Success/Error states

## 🛠️ Cấu trúc Code

### Client Components

**ScanForm.jsx**: Form nhập URL và scan
**VideoList.jsx**: Hiển thị danh sách videos
**DownloadList.jsx**: Hiển thị progress downloads
**api.js**: Service layer để gọi backend APIs

### Server Services

**videoScanner.js**: 
- Scan HTML page với Cheerio
- Tìm video tags, source tags, links
- Tìm Vimeo playlist URLs trong scripts
- Parse JSON configs

**vimeoDownloader.js**:
- Fetch playlist JSON
- Chọn video/audio chất lượng cao nhất
- Download init segment
- Download all media segments
- Merge với FFmpeg

**directDownloader.js**:
- Download video trực tiếp
- Stream với progress tracking
- Xử lý file extensions

## 🔍 Cách hoạt động

### TS Segments Download (Vimeo)

1. **Fetch Playlist**: GET playlist.json từ Vimeo CDN
2. **Parse**: Đọc video/audio tracks, segments list
3. **Select Best Quality**: Chọn resolution cao nhất
4. **Download Init Segment**: Base64 decode hoặc download URL
5. **Download Media Segments**: Loop qua tất cả segments
6. **Merge với FFmpeg**: 
   ```bash
   ffmpeg -i video_raw.mp4 -i audio_raw.mp4 -map 0:v:0 -map 1:a:0 -c copy output.mp4
   ```
7. **Cleanup**: Xóa temp files

### Direct Video Download

1. **HEAD request**: Lấy Content-Length
2. **Stream download**: axios responseType: 'stream'
3. **Progress tracking**: Theo dõi bytes downloaded
4. **Save to file**: fs.createWriteStream

## 📝 Biến môi trường

**client/.env**:
```env
VITE_API_URL=http://localhost:5000/api
```

**server** (optional .env):
```env
PORT=5000
```

## 🐛 Troubleshooting

### Lỗi: FFmpeg not found
```bash
# Kiểm tra FFmpeg đã cài chưa
ffmpeg -version

# Nếu chưa có, cài đặt:
# Ubuntu: sudo apt install ffmpeg
# macOS: brew install ffmpeg
```

### Lỗi: CORS
- Đảm bảo server có `cors` enabled
- Check `client/.env` có đúng API URL

### Lỗi: Cannot scan URL
- URL phải hợp lệ (http/https)
- Trang web phải public (không require login)
- Một số site có thể block scraping

### Video không tải được
- Check FFmpeg đã cài đặt
- Check network connection
- Một số video có DRM protection
- Check server logs để xem lỗi chi tiết

## 🤝 Đóng góp

Contributions are welcome! 

1. Fork the repo
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

MIT License

## 👤 Author

Created with ❤️ by thanhtechhub

## 🙏 Credits

- **React** - UI framework
- **Vite** - Build tool
- **Express** - Server framework
- **Cheerio** - HTML parsing
- **Axios** - HTTP client
- **FFmpeg** - Video processing
- **UUID** - Unique IDs

---

**Happy Downloading! 🎉**
