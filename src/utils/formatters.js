/**
 * Utilitários para formatação de dados
 */

/**
 * Formata valores de acordo com o tipo especificado
 * @param {number} value - Valor a ser formatado
 * @param {string} format - Tipo de formatação ('currency', 'percentage', 'time', 'number')
 * @returns {string} Valor formatado
 */
export const formatValue = (value, format = 'number') => {
  if (!value && value !== 0) return '0';
  
  switch (format) {
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'currency':
      return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    case 'time':
      return `${value} dias`;
    default:
      return value.toLocaleString('pt-BR');
  }
};

/**
 * Formata valores em moeda brasileira
 * @param {number} value - Valor a ser formatado
 * @returns {string} Valor formatado em reais
 */
export const formatCurrency = (value) => {
  if (!value && value !== 0) return 'R$ 0,00';
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
};

/**
 * Formata valores em percentual
 * @param {number} value - Valor a ser formatado
 * @returns {string} Valor formatado em percentual
 */
export const formatPercentage = (value) => {
  if (!value && value !== 0) return '0%';
  return `${value.toFixed(1)}%`;
};

/**
 * Formata números para o padrão brasileiro
 * @param {number} value - Valor a ser formatado
 * @returns {string} Número formatado
 */
export const formatNumber = (value) => {
  if (!value && value !== 0) return '0';
  return value.toLocaleString('pt-BR');
};

/**
 * Calcula tendência entre dois valores
 * @param {number} currentValue - Valor atual
 * @param {number} previousValue - Valor anterior
 * @returns {object} Objeto com percentage, trend e difference
 */
export const calculateTrend = (currentValue, previousValue) => {
  if (!previousValue || previousValue === 0) {
    return { percentage: 0, trend: 'neutral', difference: 0 };
  }
  
  const difference = currentValue - previousValue;
  const percentage = (difference / previousValue) * 100;
  
  let trend = 'neutral';
  if (percentage > 1) {
    trend = 'up';
  } else if (percentage < -1) {
    trend = 'down';
  }
  
  return { percentage, trend, difference };
};