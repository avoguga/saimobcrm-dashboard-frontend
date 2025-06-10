import { useEffect, useRef } from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ 
  message = "Carregando dados...", 
  chartLoading = false,
  chartRef = null 
}) => {
  const loadingRef = useRef(null);

  // Simula o loading do ECharts quando necessário
  useEffect(() => {
    if (chartLoading && chartRef?.current) {
      // Se tiver uma instância do ECharts, usar a animação nativa
      const chart = chartRef.current.getEchartsInstance?.();
      if (chart && chart.showLoading) {
        chart.showLoading('default', {
          text: message,
          color: '#4E5859',
          textColor: '#4E5859',
          maskColor: 'rgba(255, 255, 255, 0.8)',
          zlevel: 0,
          fontSize: 14,
          showSpinner: true,
          spinnerRadius: 10,
          lineWidth: 3
        });
        
        return () => {
          if (chart.hideLoading) {
            chart.hideLoading();
          }
        };
      }
    }
  }, [chartLoading, chartRef, message]);

  // Se é loading de chart específico, não renderizar o spinner padrão
  if (chartLoading && chartRef?.current) {
    return null;
  }

  return (
    <div className="loading-container" ref={loadingRef}>
      <div className="loading-spinner">
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      <div className="loading-message">{message}</div>
      <div className="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div className="loading-progress">
        <div className="progress-bar"></div>
      </div>
    </div>
  );
};

export default LoadingSpinner;