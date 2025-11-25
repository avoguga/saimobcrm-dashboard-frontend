import React from 'react';
import { formatValue, calculateTrend } from '../../../../utils/formatters';

/**
 * Componente de métrica com comparação entre períodos
 * Exibe valor atual, valor anterior e indicador de tendência
 */
const ComparisonMetricCard = ({ title, currentValue, previousValue, format = 'number', onClick }) => {
  const { percentage, trend, difference } = calculateTrend(currentValue, previousValue);

  // Estilo baseado na tendência
  const getTrendStyle = () => {
    switch (trend) {
      case 'up':
        return {
          backgroundColor: 'rgba(76, 224, 179, 0.25)', // Verde com mais opacidade
          color: '#374151', // Cinza escuro
          icon: '↑',
          sign: '+'
        };
      case 'down':
        return {
          backgroundColor: 'rgba(255, 58, 94, 0.25)', // Vermelho com mais opacidade
          color: '#374151', // Cinza escuro
          icon: '↓',
          sign: ''
        };
      default:
        return {
          backgroundColor: 'rgba(117, 119, 123, 0.15)', // Cinza claro
          color: '#374151', // Cinza escuro
          icon: '→',
          sign: ''
        };
    }
  };

  const trendStyle = getTrendStyle();

  return (
    <div
      className={`comparison-metric-new ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="metric-header-new">
        <h3 className="metric-title-new">{title}</h3>
      </div>

      <div className="metric-main-value">
        {formatValue(currentValue, format)}
      </div>

      <div className="metric-previous">
        <span className="previous-label-new">PERÍODO ANTERIOR:</span>
        <div className="previous-value-new">{formatValue(previousValue, format)}</div>
      </div>

      <div
        className="trend-indicator-new"
        style={{
          backgroundColor: trendStyle.backgroundColor,
          color: trendStyle.color
        }}
      >
        <span className="trend-icon-new">{trendStyle.icon}</span>
        <span className="trend-text-new">
          {trendStyle.sign}{Math.abs(percentage).toFixed(1)}%
        </span>
        {format === 'currency' && difference !== 0 && (
          <span className="trend-extra">
            ({trendStyle.sign}R$ {Math.abs(difference).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
          </span>
        )}
        {format === 'time' && difference !== 0 && (
          <span className="trend-extra">
            ({trendStyle.sign}{Math.abs(difference).toFixed(1)} dias)
          </span>
        )}
      </div>
    </div>
  );
};

export default ComparisonMetricCard;