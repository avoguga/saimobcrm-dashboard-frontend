import React from 'react';

const KpiCard = ({ title, value, subtitle, trend, color }) => {
  // Determine as classes de cores baseadas no parâmetro color
  const colorClass = color || 'primary'; // default to primary if no color is provided
  
  // Determine o ícone de tendência
  const trendIcon = trend > 0 ? '↑' : trend < 0 ? '↓' : '';
  const trendClass = trend > 0 ? 'trend-up' : trend < 0 ? 'trend-down' : '';

  return (
    <div className={`kpi-card ${colorClass}`}>
      <div className="kpi-title">{title}</div>
      <div className="kpi-value-container">
        <div className="kpi-value">{value}</div>
        {trend !== undefined && (
          <div className={`kpi-trend ${trendClass}`}>
            <span className="trend-icon">{trendIcon}</span>
            <span className="trend-value">{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      {subtitle && <div className="kpi-subtitle">{subtitle}</div>}
    </div>
  );
};

export default KpiCard;