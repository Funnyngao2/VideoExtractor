import { useState, useEffect } from 'react';
import './DisclaimerModal.css';

function DisclaimerModal({ onAgree }) {
  const [agreed, setAgreed] = useState(false);
  const [hasAgreedBefore, setHasAgreedBefore] = useState(false);

  useEffect(() => {
    // Check nếu đã agree trước đó
    const hasAgreed = localStorage.getItem('videoextractor_agreement_accepted') === 'true';
    setHasAgreedBefore(hasAgreed);
    if (hasAgreed) {
      setAgreed(true);
    }
  }, []);

  const handleAgree = () => {
    if (agreed) {
      onAgree();
    }
  };

  const handleClose = () => {
    if (hasAgreedBefore) {
      onAgree(); // Close modal nếu đã agree trước đó
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          {hasAgreedBefore && (
            <button className="modal-close" onClick={handleClose} title="Đóng">
              ✕
            </button>
          )}
          <div className="modal-icon">⚖️</div>
          <h2 className="modal-title">Cam kết sử dụng có trách nhiệm</h2>
        </div>

        <div className="modal-body">
          <div className="disclaimer-section">
            <h3 className="disclaimer-heading">Mục đích sử dụng</h3>
            <p className="disclaimer-text">
              Công cụ này được phát triển nhằm phục vụ <strong>mục đích học tập và nghiên cứu cá nhân</strong> theo quy định của pháp luật về quyền tác giả. Việc sử dụng công cụ này đồng nghĩa với việc bạn cam kết:
            </p>
          </div>

          <div className="disclaimer-list">
            <div className="disclaimer-item">
              <div className="disclaimer-item-icon">✓</div>
              <div className="disclaimer-item-content">
                <h4>Học tập và nghiên cứu cá nhân</h4>
                <p>Chỉ sử dụng nội dung tải về cho mục đích học tập, nghiên cứu, phân tích và tham khảo cá nhân, không phục vụ mục đích thương mại.</p>
              </div>
            </div>

            <div className="disclaimer-item">
              <div className="disclaimer-item-icon">✗</div>
              <div className="disclaimer-item-content">
                <h4>Không sao chép, phân phối</h4>
                <p>Không sao chép, tái sử dụng, phân phối, hoặc chia sẻ công khai nội dung đã tải về mà không có sự cho phép của tác giả hoặc chủ sở hữu bản quyền.</p>
              </div>
            </div>

            <div className="disclaimer-item">
              <div className="disclaimer-item-icon">✗</div>
              <div className="disclaimer-item-content">
                <h4>Không kinh doanh, buôn bán</h4>
                <p>Không sử dụng nội dung tải về cho bất kỳ mục đích thương mại nào bao gồm nhưng không giới hạn: bán, cho thuê, quảng cáo, hoặc kiếm lợi nhuận dưới mọi hình thức.</p>
              </div>
            </div>

            <div className="disclaimer-item">
              <div className="disclaimer-item-icon">⚠</div>
              <div className="disclaimer-item-content">
                <h4>Tuân thủ pháp luật</h4>
                <p>Tuân thủ đầy đủ các quy định của pháp luật về quyền tác giả, quyền sở hữu trí tuệ và các quy định liên quan tại quốc gia bạn sinh sống.</p>
              </div>
            </div>
          </div>

          <div className="disclaimer-warning">
            <div className="disclaimer-warning-icon">⚠️</div>
            <div className="disclaimer-warning-content">
              <h4>Lưu ý quan trọng</h4>
              <p>
                Vi phạm quyền tác giả là hành vi vi phạm pháp luật và có thể bị xử lý theo quy định. 
                Người phát triển công cụ này không chịu trách nhiệm đối với bất kỳ hành vi vi phạm nào của người sử dụng.
              </p>
            </div>
          </div>

          <div className="disclaimer-checkbox">
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="checkbox-input"
              />
              <span className="checkbox-text">
                Tôi đã đọc, hiểu rõ và cam kết tuân thủ các điều khoản sử dụng trên. Tôi hiểu rằng việc vi phạm các cam kết này có thể dẫn đến hậu quả pháp lý nghiêm trọng.
              </span>
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className={`modal-button ${agreed ? 'modal-button-primary' : 'modal-button-disabled'}`}
            onClick={handleAgree}
            disabled={!agreed}
          >
            {hasAgreedBefore 
              ? 'Đóng' 
              : agreed 
                ? 'Tôi đồng ý' 
                : 'Vui lòng đọc và chấp nhận điều khoản'
            }
          </button>
        </div>
      </div>
    </div>
  );
}

export default DisclaimerModal;
