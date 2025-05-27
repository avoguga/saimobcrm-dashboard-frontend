import React from 'react';
import './ProgressiveLoading.css';

/**
 * Componente para exibir carregamento progressivo
 * Mostra feedback visual enquanto cada parte do dashboard carrega
 */
const ProgressiveLoading = ({ 
  loadedSections = [], 
  totalSections = 5,
  completedColor = '#4E5859',
  pendingColor = '#C1C5C9'
}) => {
  // Calcular progresso em porcentagem
  const progress = Math.round((loadedSections.length / totalSections) * 100);
  
  return (
    <div className="progressive-loading">
      <div className="progress-container">
        <div 
          className="progress-bar"
          style={{ width: `${progress}%`, backgroundColor: completedColor }}
        ></div>
      </div>
      
      <div className="loading-message">
        Carregando dados: {progress}% concluído
      </div>
      
      <div className="loading-details">
        {Array.from({ length: totalSections }).map((_, index) => {
          const isLoaded = loadedSections.includes(index);
          return (
            <div 
              key={index}
              className={`loading-indicator ${isLoaded ? 'loaded' : ''}`}
              style={{ backgroundColor: isLoaded ? completedColor : pendingColor }}
            >
              {index + 1}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressiveLoading;