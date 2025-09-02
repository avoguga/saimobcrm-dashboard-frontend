/**
 * Configurações e constantes do Dashboard de Vendas
 */

/**
 * Campos disponíveis para busca avançada
 */
export const SEARCH_FIELDS = [
  'Nome do Lead',
  'Telefone', 
  'Email'
];

/**
 * Configurações de altura dos gráficos
 */
export const CHART_HEIGHTS = {
  small: {
    mobile: '280px',
    desktop: '320px'
  },
  medium: {
    mobile: '320px',
    desktop: '380px'
  },
  large: {
    mobile: '380px',
    desktop: '420px'
  }
};

/**
 * Função utilitária para obter altura do gráfico
 * @param {string} size - Tamanho do gráfico ('small', 'medium', 'large')
 * @param {boolean} isMobile - Se é dispositivo móvel
 * @returns {string} Altura do gráfico
 */
export const getChartHeight = (size = 'medium', isMobile = false) => {
  const heights = CHART_HEIGHTS[size] || CHART_HEIGHTS.medium;
  return isMobile ? heights.mobile : heights.desktop;
};

/**
 * Configurações padrão dos gráficos
 * @param {object} colors - Objeto com as cores do tema
 * @returns {object} Configurações dos gráficos
 */
export const getChartConfigs = (colors) => ({
  leadsConfig: { 
    xKey: 'name', 
    yKey: 'value', 
    color: colors.primary 
  },
  meetingsConfig: { 
    xKey: 'name', 
    yKey: 'meetingsHeld', 
    color: colors.secondary 
  },
  salesConfig: { 
    xKey: 'name', 
    yKey: 'sales', 
    color: colors.success 
  },
  activitiesConfig: { 
    xKey: 'name', 
    yKey: 'value', 
    color: colors.secondary 
  }
});

/**
 * Mapeamento de campos para busca de leads
 */
export const LEAD_FIELD_MAPPING = {
  'Nome do Lead': ['leadName', 'name', 'client_name'],
  'Telefone': ['phone', 'telefone'],
  'Email': ['email', 'email_address']
};