import React from 'react';

/**
 * Componente para exibir indicador de tendência
 * Mostra setas e percentual de mudança com cores
 */
const TrendIndicator = ({ value, showZero = false }) => {
  // Se o valor for null, undefined ou 0 e showZero for false, não exibir nada
  if ((value === null || value === undefined || (value === 0 && !showZero))) {
    return null;
  }

  // Determinar se o valor é positivo, negativo ou zero
  const isPositive = value > 0;

  // Estilo para o indicador de tendência com setas diagonais
  const style = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: isPositive
      ? 'rgba(76, 224, 179, 0.25)'  // Verde com mais opacidade
      : 'rgba(255, 58, 94, 0.25)',  // Vermelho com mais opacidade
    color: '#374151', // Cinza escuro
    marginLeft: '8px'
  };

  return (
    <div style={style} className="trend-indicator-square">
      {isPositive ? '↗' : '↘'} {isPositive ? '+' : ''}{Math.abs(value).toFixed(1)}%
    </div>
  );
};

export default TrendIndicator;
