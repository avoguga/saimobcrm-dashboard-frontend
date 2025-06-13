import { createPortal } from 'react-dom';

const SimpleModal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  
  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    backdropFilter: 'blur(2px)',
    animation: 'fadeIn 0.2s ease-out'
  };

  const contentStyle = {
    backgroundColor: 'white',
    borderRadius: '16px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    margin: '20px',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
    animation: 'slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  };

  const headerStyle = {
    padding: '24px 32px 20px',
    borderBottom: '1px solid #f0f0f0',
    background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)'
  };

  const titleStyle = {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
    color: '#2d3748',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  };

  const iconStyle = {
    fontSize: '24px'
  };

  const bodyStyle = {
    padding: '32px'
  };

  const footerStyle = {
    padding: '20px 32px 24px',
    borderTop: '1px solid #f0f0f0',
    background: '#fafbfc',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const closeButtonStyle = {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#a0aec0',
    cursor: 'pointer',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    transition: 'all 0.2s ease',
    zIndex: 1
  };

  return createPortal(
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideIn {
          from { 
            opacity: 0; 
            transform: translateY(-20px) scale(0.95); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
          }
        }
      `}</style>
      <div style={overlayStyle} onClick={onClose}>
        <div style={{ ...contentStyle, position: 'relative' }} onClick={(e) => e.stopPropagation()}>
          <button 
            style={closeButtonStyle}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.target.style.background = '#f7fafc';
              e.target.style.color = '#2d3748';
              e.target.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'none';
              e.target.style.color = '#a0aec0';
              e.target.style.transform = 'scale(1)';
            }}
          >
            ×
          </button>
          
          <div style={headerStyle}>
            <h2 style={titleStyle}>
              <span style={iconStyle}>📅</span>
              Período Personalizado
            </h2>
          </div>
          
          <div style={bodyStyle}>
            {children}
          </div>
          
          <div style={footerStyle}>
            <div style={{ fontSize: '14px', color: '#718096' }}>
              💡 Selecione um intervalo de datas para análise personalizada
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default SimpleModal;