import { useState, useEffect } from 'react';
import ScanForm from './components/ScanForm';
import VideoList from './components/VideoList';
import DownloadList from './components/DownloadList';
import DisclaimerModal from './components/DisclaimerModal';
import './App.css';

const AGREEMENT_KEY = 'videoextractor_agreement_accepted';

function App() {
  const [videos, setVideos] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [agreed, setAgreed] = useState(false);

  // Check localStorage khi component mount
  useEffect(() => {
    const hasAgreed = localStorage.getItem(AGREEMENT_KEY) === 'true';
    if (hasAgreed) {
      setAgreed(true);
      setShowDisclaimer(false);
    } else {
      setShowDisclaimer(true);
    }
  }, []);

  const handleScanComplete = (scannedVideos) => {
    setVideos(scannedVideos);
  };

  const handleDownloadStart = (downloadInfo) => {
    setDownloads(prev => [downloadInfo, ...prev]);
  };

  const handleAgree = () => {
    // Lưu vào localStorage
    localStorage.setItem(AGREEMENT_KEY, 'true');
    setAgreed(true);
    setShowDisclaimer(false);
  };

  const handleShowDisclaimer = () => {
    setShowDisclaimer(true);
  };

  return (
    <div className="app">
      {/* Decorative blobs */}
      <div className="blob blob-left"></div>
      <div className="blob blob-right-top"></div>
      <div className="blob blob-right-mid"></div>
      <div className="blob blob-right-bottom"></div>

      {/* Disclaimer Modal */}
      {showDisclaimer && (
        <DisclaimerModal onAgree={handleAgree} />
      )}

      {/* Header */}
      <header className="header">
        <div className="header-container">
          <div className="logo">
            <span className="logo-icon">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M15 10l4.55-3.03A1 1 0 0 1 21 7.8v8.4a1 1 0 0 1-1.45.83L15 14v-4z" fill="currentColor"/>
                <rect x="3" y="6" width="12" height="12" rx="2" fill="currentColor"/>
              </svg>
            </span>
            <span className="logo-text">Video<span className="accent">Extractor</span></span>
          </div>
          <nav className="nav">
            <button className="nav-link" onClick={handleShowDisclaimer}>
              Điều khoản
            </button>
            <button className="moon-btn" onClick={() => {
              const root = document.documentElement;
              const isDark = root.getAttribute('data-theme') === 'dark';
              root.setAttribute('data-theme', isDark ? 'light' : 'dark');
            }} aria-label="Chuyển giao diện sáng/tối">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            </button>
          </nav>
        </div>
      </header>

      {/* Body */}
      <main className="body">
        <div className="body-container">
          {/* Hero Section */}
          <section className="hero">
            <span className="eyebrow">SIMPLE  •  FAST  •  PRIVACY FIRST</span>
            <h1 className="hero-title">
              Trích xuất video<br/>
              <span className="hero-title-highlight">
                <span className="tabdots">
                  <span></span><span></span><span></span>
                </span>
                từ web
              </span>
            </h1>
            <p className="hero-subtitle">
              Dán liên kết video, chúng tôi giúp bạn tải xuống nhanh chóng để học tập, lưu trữ hoặc nghiên cứu cá nhân.
            </p>
          </section>

          {/* Scan Form */}
          <section className="card">
            <ScanForm 
              onScanComplete={handleScanComplete}
              scanning={scanning}
              setScanning={setScanning}
              disabled={!agreed}
            />
          </section>

          {/* Video List */}
          {videos.length > 0 && (
            <section className="card">
              <div className="card-header">
                <h2 className="card-title">
                  <span className="card-icon">📹</span>
                  Video tìm thấy
                </h2>
                <span className="badge">{videos.length}</span>
              </div>
              <VideoList 
                videos={videos}
                onDownloadStart={handleDownloadStart}
                disabled={!agreed}
              />
            </section>
          )}

          {/* Download List */}
          {downloads.length > 0 && (
            <section className="card">
              <div className="card-header">
                <h2 className="card-title">
                  <span className="card-icon">⬇️</span>
                  Đang tải xuống
                </h2>
                <span className="badge badge-primary">{downloads.length}</span>
              </div>
              <DownloadList downloads={downloads} />
            </section>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <p className="footer-copyright">
            © 2026 <span className="footer-brand">astroThanh</span> — VideoExtractor
          </p>
          <p className="footer-disclaimer">
            Chỉ phục vụ mục đích học tập và nghiên cứu cá nhân
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
