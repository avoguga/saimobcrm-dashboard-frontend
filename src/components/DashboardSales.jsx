import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import * as echarts from 'echarts';
import Select from 'react-select';
import { KommoAPI } from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import SimpleModal from './SimpleModal';
import DetailModal from './common/DetailModal';
import { COLORS } from '../constants/colors';
import ExcelExporter from '../utils/excelExport';
import './Dashboard.css';

// Função para normalizar texto removendo acentos e caracteres especiais
const normalizeText = (text) => {
  if (!text) return '';
  return text.toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/ç/g, 'c') // Trata ç especificamente
    .trim();
};

// Função para verificar se o texto contém o termo de busca (flexível)
const flexibleSearch = (fieldValue, searchValue) => {
  const normalizedField = normalizeText(fieldValue);
  const normalizedSearch = normalizeText(searchValue);
  
  // Divide o termo de busca em palavras
  const searchWords = normalizedSearch.split(/\s+/).filter(word => word.length > 0);
  
  // Verifica se alguma palavra do termo está contida no campo
  // OU se o campo contém o termo completo
  return searchWords.some(word => normalizedField.includes(word)) || 
         normalizedField.includes(normalizedSearch);
};

// Componente de métrica com seta e fundo colorido (como na imagem)
const ComparisonMetricCard = ({ title, currentValue, previousValue, format = 'number' }) => {
  // Função para formatar valores
  const formatValue = (value) => {
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

  // Calcular diferença e tendência
  const calculateTrend = () => {
    if (!previousValue || previousValue === 0) {
      return { percentage: 0, trend: 'neutral', difference: 0 };
    }

    const difference = currentValue - previousValue;
    const percentage = (difference / previousValue) * 100;
    
    let trend = 'neutral';
    if (percentage > 1) trend = 'up';
    else if (percentage < -1) trend = 'down';

    return { percentage, trend, difference };
  };

  const { percentage, trend, difference } = calculateTrend();

  // Estilo baseado na tendência (como na imagem)
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
    <div className="comparison-metric-new">
      <div className="metric-header-new">
        <h3 className="metric-title-new">{title}</h3>
      </div>
      
      <div className="metric-main-value">
        {formatValue(currentValue)}
      </div>
      
      <div className="metric-previous">
        <span className="previous-label-new">PERÍODO ANTERIOR:</span>
        <div className="previous-value-new">{formatValue(previousValue)}</div>
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


// Componente para exibir indicador de tendência
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


// ✅ REFATORAÇÃO: Props simplificadas e organizadas
const DashboardSales = ({ 
  period, 
  setPeriod, 
  windowSize, 
  corretores, 
  filters, 
  updateFilter, 
  clearFilter, 
  clearFilters,
  hasActiveFilters,
  sourceOptions, 
  data, 
  isLoading, 
  isUpdating, 
  customPeriod, 
  setCustomPeriod, 
  showCustomPeriod, 
  setShowCustomPeriod, 
  handlePeriodChange, 
  applyCustomPeriod 
}) => {
  
  const [rawSalesData, setRawSalesData] = useState(data); // Dados originais sem filtro

  // ✅ Preparar dados para React-Select
  const corretorOptions = useMemo(() => 
    corretores.map(corretor => ({
      value: corretor.name,
      label: corretor.name
    }))
  , [corretores]);

  const sourceSelectOptions = useMemo(() => 
    sourceOptions.filter(opt => opt.value !== '').map(option => ({
      value: option.value,
      label: option.label
    }))
  , [sourceOptions]);

  // Converter valores dos filtros para formato do React-Select
  const selectedCorretorValues = useMemo(() => {
    if (!filters.corretor) return [];
    return filters.corretor.split(',').map(value => 
      corretorOptions.find(opt => opt.value === value.trim())
    ).filter(Boolean);
  }, [filters.corretor, corretorOptions]);

  const selectedSourceValues = useMemo(() => {
    if (!filters.source) return [];
    return filters.source.split(',').map(value => 
      sourceSelectOptions.find(opt => opt.value === value.trim())
    ).filter(Boolean);
  }, [filters.source, sourceSelectOptions]);

  // Funções de exportação Excel
  const handleExportMeetings = () => {
    if (!salesData?.leadsByUser || salesData.leadsByUser.length === 0) {
      alert('Não há dados de reuniões para exportar');
      return;
    }

    const exportFilters = {
      corretor: filters.corretor,
      fonte: filters.source
    };

    const periodLabel = (() => {
      if (period === 'current_month') return 'Mês Atual';
      if (period === 'previous_month') return 'Mês Anterior';
      if (period === 'year') return 'Anual';
      if (period === 'custom' && customPeriod?.startDate && customPeriod?.endDate) {
        return `${customPeriod.startDate} a ${customPeriod.endDate}`;
      }
      if (period === '7d') return '7 dias';
      return period;
    })();

    const result = ExcelExporter.exportMeetingsData(
      sortedChartsData.sortedMeetingsData || salesData.leadsByUser,
      exportFilters,
      periodLabel
    );

    if (result.success) {
      alert(`Relatório de reuniões exportado com sucesso: ${result.fileName}`);
    } else {
      alert(`Erro ao exportar: ${result.error}`);
    }
  };

  const handleExportSales = () => {
    if (!salesData?.leadsByUser || salesData.leadsByUser.length === 0) {
      alert('Não há dados de vendas para exportar');
      return;
    }

    const exportFilters = {
      corretor: filters.corretor,
      fonte: filters.source
    };

    const periodLabel = (() => {
      if (period === 'current_month') return 'Mês Atual';
      if (period === 'previous_month') return 'Mês Anterior';
      if (period === 'year') return 'Anual';
      if (period === 'custom' && customPeriod?.startDate && customPeriod?.endDate) {
        return `${customPeriod.startDate} a ${customPeriod.endDate}`;
      }
      if (period === '7d') return '7 dias';
      return period;
    })();

    const result = ExcelExporter.exportSalesData(
      sortedChartsData.sortedSalesData || salesData.leadsByUser,
      exportFilters,
      periodLabel
    );

    if (result.success) {
      alert(`Relatório de vendas exportado com sucesso: ${result.fileName}`);
    } else {
      alert(`Erro ao exportar: ${result.error}`);
    }
  };

  const handleExportLeads = () => {
    if (!salesData?.leadsByUser || salesData.leadsByUser.length === 0) {
      alert('Não há dados de leads para exportar');
      return;
    }

    const exportFilters = {
      corretor: filters.corretor,
      fonte: filters.source
    };

    const periodLabel = (() => {
      if (period === 'current_month') return 'Mês Atual';
      if (period === 'previous_month') return 'Mês Anterior';
      if (period === 'year') return 'Anual';
      if (period === 'custom' && customPeriod?.startDate && customPeriod?.endDate) {
        return `${customPeriod.startDate} a ${customPeriod.endDate}`;
      }
      if (period === '7d') return '7 dias';
      return period;
    })();

    const result = ExcelExporter.exportLeadsData(
      sortedChartsData.sortedLeadsData || salesData.leadsByUser,
      exportFilters,
      periodLabel
    );

    if (result.success) {
      alert(`Relatório de leads exportado com sucesso: ${result.fileName}`);
    } else {
      alert(`Erro ao exportar: ${result.error}`);
    }
  };
  const [salesData, setSalesData] = useState(data); // Dados filtrados
  const [comparisonData, setComparisonData] = useState(null);
  
  // Estados para filtro de busca avançada
  const [searchField, setSearchField] = useState('Corretor');
  const [searchValue, setSearchValue] = useState('');
  
  // Estado do modal usando ref para não causar re-renders
  const modalStateRef = useRef({
    isOpen: false,
    type: '',
    title: '',
    isLoading: false,
    data: [],
    error: null
  });
  
  const [modalForceUpdate, setModalForceUpdate] = useState(0);
  

  // Constantes de responsividade - memoizadas para evitar re-renders
  const isMobile = useMemo(() => windowSize.width < 768, [windowSize.width]);
  const isSmallMobile = useMemo(() => windowSize.width < 480, [windowSize.width]);


  // Função para filtrar dados no frontend - REMOVIDO pois filtros agora são aplicados no backend
  const filterSalesData = useMemo(() => {
    // Retorna os dados direto do backend sem filtragem adicional
    // Os filtros já foram aplicados na API
    return rawSalesData;
  }, [rawSalesData]);

  // Atualizar dados quando recebidos do cache
  useEffect(() => {
    if (data) {
      setRawSalesData(data);
    }
  }, [data]);

  // Atualizar dados filtrados quando filtros mudarem (INSTANTÂNEO - sem loading)
  useEffect(() => {
    setSalesData(filterSalesData);
  }, [filterSalesData]);

  // Criar dados de comparação usando os dados reais dos dois períodos
  useEffect(() => {
    if (salesData) {
      // Dados do período atual
      const currentMeetings = salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.meetingsHeld || 0), 0) : 0;
      const currentProposals = salesData?.proposalStats?.total || 0;
      const currentSales = salesData?.wonLeads || (salesData?.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.sales || 0), 0) : 0);
      
      // Dados do período anterior (da 2ª requisição)
      const previousData = salesData?.previousPeriodData;
      const previousMeetings = previousData?.leadsByUser ? previousData.leadsByUser.reduce((sum, user) => sum + (user.meetingsHeld || 0), 0) : 0;
      const previousProposals = previousData?.proposalStats?.total || 0;
      const previousSales = previousData?.wonLeads || (previousData?.leadsByUser ? previousData.leadsByUser.reduce((sum, user) => sum + (user.sales || 0), 0) : 0);
      
      const comparison = {
        currentPeriod: {
          totalLeads: salesData?.totalLeads || 0,
          activeLeads: salesData?.activeLeads || 0,
          winRate: salesData?.winRate || 0,
          averageDealSize: salesData?.averageDealSize || 0,
          totalRevenue: salesData?.totalRevenue || 0,
          conversionRates: salesData?.conversionRates || { meetings: 0, prospects: 0, sales: 0 },
          totalMeetings: currentMeetings,
          totalProposals: currentProposals,
          totalSales: currentSales
        },
        previousPeriod: {
          // Usar dados da 2ª requisição se disponíveis, senão usar campos de fallback
          totalLeads: previousData?.totalLeads || salesData?.previousTotalLeads || 0,
          activeLeads: previousData?.activeLeads || salesData?.previousActiveLeads || 0,
          winRate: previousData?.winRate || salesData?.previousWinRate || 0,
          averageDealSize: previousData?.averageDealSize || salesData?.previousAverageDealSize || 0,
          totalRevenue: previousData?.totalRevenue || 0,
          wonLeads: previousData?.wonLeads || salesData?.previousWonLeads || 0,
          conversionRates: previousData?.conversionRates || { meetings: 0, prospects: 0, sales: 0 },
          totalMeetings: previousMeetings,
          totalProposals: previousProposals,
          totalSales: previousSales
        }
      };
      
      setComparisonData(comparison);
    }
  }, [salesData]);

  // Função para abrir modal específico por corretor
  const openModalByCorretor = async (type, corretorName, value, params, seriesName) => {
    // Ajustar título baseado na série clicada
    const getTitle = () => {
      if (type === 'leads') {
        if (seriesName === 'Leads Orgânicos') {
          return `Leads Orgânicos de ${corretorName}`;
        } else if (seriesName === 'Leads') {
          return `Leads Pagos de ${corretorName}`;
        } else {
          return `Todos os Leads de ${corretorName}`;
        }
      } else if (type === 'reunioes') {
        if (seriesName === 'Reuniões Orgânicas') {
          return `Reuniões Orgânicas de ${corretorName}`;
        } else if (seriesName === 'Reuniões') {
          return `Reuniões Pagas de ${corretorName}`;
        } else {
          return `Todas as Reuniões de ${corretorName}`;
        }
      }
      return `Dados de ${corretorName}`;
    };

    modalStateRef.current = {
      isOpen: true,
      type,
      title: getTitle(),
      isLoading: true,
      data: [],
      error: null
    };
    
    setModalForceUpdate(prev => prev + 1);

    try {
      const extraParams = {};
      
      // Usar a mesma lógica dos gráficos: priorizar start_date/end_date sobre days
      if (period === 'custom' && customPeriod.startDate && customPeriod.endDate) {
        extraParams.start_date = customPeriod.startDate;
        extraParams.end_date = customPeriod.endDate;
      } else if (period === 'current_month') {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayStr = firstDay.toISOString().split('T')[0];
        const todayStr = now.toISOString().split('T')[0];
        
        extraParams.start_date = firstDayStr;
        extraParams.end_date = todayStr;
      } else if (period === 'previous_month') {
        // Para mês anterior completo
        const now = new Date();
        const firstDayPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        
        extraParams.start_date = firstDayPreviousMonth.toISOString().split('T')[0];
        extraParams.end_date = lastDayPreviousMonth.toISOString().split('T')[0];
      } else if (period === 'year') {
        // Para ano atual
        const now = new Date();
        const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
        
        extraParams.start_date = firstDayOfYear.toISOString().split('T')[0];
        extraParams.end_date = now.toISOString().split('T')[0];
      } else {
        // Para períodos predefinidos (7d), usar days
        const periodToDays = {
          '7d': 7
        };
        extraParams.days = periodToDays[period] || 30;
      }


      // ✅ OTIMIZAÇÃO: Tentar usar dados já carregados e filtrar no frontend
      let tablesData;
      
      // Verificar se podemos usar dados já carregados
      const currentData = data?._rawTablesData;
      const currentParams = data?._lastParams;
      
      const dateParamsMatch = currentParams && (
        (extraParams.start_date === currentParams.start_date && 
         extraParams.end_date === currentParams.end_date) ||
        (extraParams.days === currentParams.days)
      );
      
      if (currentData && dateParamsMatch) {
        
        // Filtrar dados no frontend pelo corretor
        const corretorFilter = corretorName === 'VAZIO' ? 'SA IMOB' : corretorName;
        
        tablesData = {
          leadsDetalhes: currentData.leadsDetalhes?.filter(lead => 
            lead.Corretor === corretorFilter || lead.Corretor === corretorName
          ) || [],
          organicosDetalhes: currentData.organicosDetalhes?.filter(lead => 
            lead.Corretor === corretorFilter || lead.Corretor === corretorName
          ) || [],
          reunioesDetalhes: currentData.reunioesDetalhes?.filter(reuniao => 
            reuniao.Corretor === corretorFilter || reuniao.Corretor === corretorName
          ) || [],
          reunioesOrganicasDetalhes: currentData.reunioesOrganicasDetalhes?.filter(reuniao => 
            reuniao.Corretor === corretorFilter || reuniao.Corretor === corretorName
          ) || [],
          vendasDetalhes: currentData.vendasDetalhes?.filter(venda => 
            venda.Corretor === corretorFilter || venda.Corretor === corretorName
          ) || [],
          propostasDetalhes: currentData.propostasDetalhes?.filter(proposta => 
            proposta.Corretor === corretorFilter || proposta.Corretor === corretorName
          ) || []
        };
      } else {
        // Se parâmetros diferentes, fazer nova requisição
        tablesData = await KommoAPI.getDetailedTables(corretorName, filters.source || '', extraParams);
      }
      
      // Filtrar dados baseado na série clicada
      const getFilteredData = () => {
        if (type === 'leads') {
          if (seriesName === 'Leads Orgânicos') {
            return tablesData.organicosDetalhes || [];
          } else if (seriesName === 'Leads') {
            return tablesData.leadsDetalhes || [];
          } else {
            // Fallback - mostrar leads pagos
            return tablesData.leadsDetalhes || [];
          }
        } else if (type === 'reunioes') {
          if (seriesName === 'Reuniões Orgânicas') {
            return tablesData.reunioesOrganicasDetalhes || [];
          } else if (seriesName === 'Reuniões') {
            return tablesData.reunioesDetalhes || [];
          } else {
            // Reuniões Totais - mostrar todas
            return [
              ...(tablesData.reunioesDetalhes || []),
              ...(tablesData.reunioesOrganicasDetalhes || [])
            ];
          }
        }
        return tablesData.vendasDetalhes || [];
      };

      let modalData = getFilteredData();
      
      // Se é tipo propostas ou vendas, usar os dados específicos
      if (type === 'propostas') {
        // Para propostas, buscar dos leads se não vier do backend
        if (tablesData.propostasDetalhes && tablesData.propostasDetalhes.length > 0) {
          modalData = tablesData.propostasDetalhes;
        } else {
          // Buscar propostas dos leads do corretor específico
          if (!salesData?.leadsByUser) {
            modalData = [];
          } else {
            const user = salesData.leadsByUser.find(u => u.name === corretorName);
            if (user && user.leads && Array.isArray(user.leads)) {
              modalData = user.leads
                .filter(lead => 
                  lead.is_proposta === true || 
                  lead.etapa?.toLowerCase().includes('proposta')
                )
                .map(lead => ({
                  'Data da Proposta': lead.createdDate || lead.created_date || 'N/A',
                  'Nome do Lead': lead.leadName || lead.name || lead.client_name || 'N/A',
                  'Corretor': corretorName,
                  'Fonte': lead.fonte || lead.source || 'N/A',
                  'Produto': lead.produto || lead.product || 'N/A',
                  'Anúncio': lead.anuncio || lead.ad || 'N/A',
                  'Público': lead.publico || lead.audience || 'N/A',
                  'is_proposta': lead.is_proposta,
                  'Etapa': lead.etapa || lead.stage || 'N/A'
                }));
            } else {
              modalData = [];
            }
          }
        }
      } else if (type === 'vendas') {
        modalData = tablesData.vendasDetalhes || [];
      }
      
      // Não filtrar propostas, pois propostasDetalhes já vem com os dados corretos do backend
      
      // Aplicar pré-filtro se houver filtro ativo no dashboard (exceto para filtro de corretor)
      if (searchValue && searchField && searchField !== 'Corretor') {
        modalData = modalData.filter(item => {
          const fieldValue = item[searchField] || '';
          return flexibleSearch(fieldValue, searchValue);
        });
      }

      modalStateRef.current = {
        ...modalStateRef.current,
        isLoading: false,
        data: modalData
      };
      
      setModalForceUpdate(prev => prev + 1);
    } catch (error) {
      modalStateRef.current = {
        ...modalStateRef.current,
        isLoading: false,
        error: error.message
      };
      
      setModalForceUpdate(prev => prev + 1);
    }
  };

  // Função para abrir modal sem causar re-render
  const openModal = async (type) => {
    const titles = {
      'leads': 'Todos os Leads',
      'reunioes': 'Reuniões Realizadas',
      'propostas': 'Propostas Enviadas', 
      'vendas': 'Vendas Realizadas'
    };

    modalStateRef.current = {
      isOpen: true,
      type,
      title: titles[type],
      isLoading: true,
      data: [],
      error: null
    };
    
    setModalForceUpdate(prev => prev + 1);  // Forçar re-render apenas do modal

    try {
      const extraParams = {};
      
      // Usar a mesma lógica dos gráficos: priorizar start_date/end_date sobre days
      if (period === 'custom' && customPeriod.startDate && customPeriod.endDate) {
        extraParams.start_date = customPeriod.startDate;
        extraParams.end_date = customPeriod.endDate;
      } else if (period === 'current_month') {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayStr = firstDay.toISOString().split('T')[0];
        const todayStr = now.toISOString().split('T')[0];
        
        extraParams.start_date = firstDayStr;
        extraParams.end_date = todayStr;
      } else if (period === 'previous_month') {
        // Para mês anterior completo
        const now = new Date();
        const firstDayPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        
        extraParams.start_date = firstDayPreviousMonth.toISOString().split('T')[0];
        extraParams.end_date = lastDayPreviousMonth.toISOString().split('T')[0];
      } else if (period === 'year') {
        // Para ano atual
        const now = new Date();
        const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
        
        extraParams.start_date = firstDayOfYear.toISOString().split('T')[0];
        extraParams.end_date = now.toISOString().split('T')[0];
      } else {
        // Para períodos predefinidos (7d), usar days
        const periodToDays = {
          '7d': 7
        };
        extraParams.days = periodToDays[period] || 30;
      }


      // ✅ OTIMIZAÇÃO: Reutilizar dados já carregados no dashboard ao invés de nova requisição
      // Só fazer nova requisição se os parâmetros de período forem diferentes dos atuais
      let tablesData;
      
      // Verificar se podemos usar dados já carregados do dashboard
      const currentData = data?._rawTablesData; // Dados originais salvos no dashboard
      
      // Função helper para verificar se os filtros de data mudaram
      const hasDateFilterChanged = (newParams) => {
        const currentParams = data?._lastParams;
        if (!currentParams) return true;
        
        // Comparar parâmetros de data
        const dateParamsChanged = 
          newParams.start_date !== currentParams.start_date ||
          newParams.end_date !== currentParams.end_date ||
          newParams.days !== currentParams.days;
          
        return dateParamsChanged;
      };
      
      const shouldReuseData = currentData && !hasDateFilterChanged(extraParams);
      
      if (shouldReuseData) {
        tablesData = currentData;
      } else {
        tablesData = await KommoAPI.getDetailedTables('', '', extraParams);
      }
      
      // Para propostas, vamos buscar dos leads que têm propostas usando a mesma lógica do leadsByUser
      const getAllProposals = () => {
        // Se não temos propostasDetalhes, vamos buscar dos leadsByUser
        if (!salesData?.leadsByUser) return [];
        
        const allProposals = [];
        
        // Percorrer cada corretor e seus leads
        salesData.leadsByUser.forEach(user => {
          if (user.leads && Array.isArray(user.leads)) {
            // Filtrar leads que são propostas usando a mesma lógica do dashboard
            const userProposals = user.leads.filter(lead => 
              lead.is_proposta === true || 
              lead.etapa?.toLowerCase().includes('proposta')
            );
            
            // Adicionar informações do corretor em cada lead
            userProposals.forEach(lead => {
              allProposals.push({
                'Data da Proposta': lead.createdDate || lead.created_date || 'N/A',
                'Nome do Lead': lead.leadName || lead.name || lead.client_name || 'N/A',
                'Corretor': user.name || 'N/A',
                'Fonte': lead.fonte || lead.source || 'N/A',
                'Produto': lead.produto || lead.product || 'N/A',
                'Anúncio': lead.anuncio || lead.ad || 'N/A',
                'Público': lead.publico || lead.audience || 'N/A',
                'is_proposta': lead.is_proposta,
                'Etapa': lead.etapa || lead.stage || 'N/A'
              });
            });
          }
        });
        
        return allProposals;
      };
      
      const dataMap = {
        'leads': [...(tablesData.leadsDetalhes || []), ...(tablesData.organicosDetalhes || [])],
        'reunioes': [...(tablesData.reunioesDetalhes || []), ...(tablesData.reunioesOrganicasDetalhes || [])],
        'propostas': tablesData.propostasDetalhes?.length > 0 ? tablesData.propostasDetalhes : getAllProposals(),
        'vendas': tablesData.vendasDetalhes || []
      };
      
      // Aplicar pré-filtro se houver filtro ativo no dashboard
      let modalData = dataMap[type];
      
      // Não filtrar propostas, pois propostasDetalhes já vem com os dados corretos do backend
      
      // Aplicar filtro de busca avançada (mesmo comportamento da primeira função)
      if (searchValue && searchField && searchField !== 'Corretor') {
        modalData = modalData.filter(item => {
          const fieldValue = item[searchField] || '';
          return flexibleSearch(fieldValue, searchValue);
        });
      }

      modalStateRef.current = {
        ...modalStateRef.current,
        isLoading: false,
        data: modalData
      };
      
      setModalForceUpdate(prev => prev + 1);
    } catch (error) {
      modalStateRef.current = {
        ...modalStateRef.current,
        isLoading: false,
        error: error.message
      };
      
      setModalForceUpdate(prev => prev + 1);
    }
  };

  // Função para fechar modal sem causar re-render
  const closeModal = () => {
    modalStateRef.current = {
      isOpen: false,
      type: '',
      title: '',
      isLoading: false,
      data: [],
      error: null
    };
    
    setModalForceUpdate(prev => prev + 1);
  };


  // Helpers responsivos - memoizados
  const getChartHeight = useMemo(() => (size = 'medium') => {
    if (size === 'small') {
      return isMobile ? '280px' : '320px';
    } else if (size === 'medium') {
      return isMobile ? '320px' : '380px';
    } else {
      return isMobile ? '380px' : '420px';
    }
  }, [isMobile]);

  // Configurações dos gráficos memoizadas para evitar hooks condicionais
  const chartConfigs = useMemo(() => ({
    leadsConfig: { xKey: 'name', yKey: 'value', color: COLORS.primary },
    meetingsConfig: { xKey: 'name', yKey: 'meetingsHeld', color: COLORS.secondary },
    salesConfig: { xKey: 'name', yKey: 'sales', color: COLORS.success },
    activitiesConfig: { xKey: 'name', yKey: 'value', color: COLORS.secondary }
  }), []);

  const chartStyle = useMemo(() => ({ height: getChartHeight('small') }), [getChartHeight]);

  // Dados dos gráficos memoizados (ORDENADOS DECRESCENTE)
  const chartData = useMemo(() => {
    if (salesData?.analyticsTeam?.user_performance?.length > 0) {
      // Mapear dados e ordenar cada categoria separadamente
      // Criar cópia do array antes de ordenar para garantir ordenação decrescente consistente
      const leadsData = [...salesData.analyticsTeam.user_performance]
        .map(user => ({
          name: user.user_name,
          value: Number(user.new_leads || 0)
        }))
        .sort((a, b) => {
          const diff = Number(b.value || 0) - Number(a.value || 0);
          return diff !== 0 ? diff : (a.name || '').localeCompare(b.name || '');
        }); // Ordenar decrescente (maior para menor)

      const activitiesData = [...salesData.analyticsTeam.user_performance]
        .map(user => ({
          name: user.user_name,
          value: Number(user.activities || 0)
        }))
        .sort((a, b) => {
          const diff = Number(b.value || 0) - Number(a.value || 0);
          return diff !== 0 ? diff : (a.name || '').localeCompare(b.name || '');
        }); // Ordenar decrescente (maior para menor)

      const wonDealsData = [...salesData.analyticsTeam.user_performance]
        .map(user => ({
          name: user.user_name,
          value: Number(user.won_deals || 0)
        }))
        .sort((a, b) => {
          const diff = Number(b.value || 0) - Number(a.value || 0);
          return diff !== 0 ? diff : (a.name || '').localeCompare(b.name || '');
        }); // Ordenar decrescente (maior para menor)

      return {
        leadsData,
        activitiesData,
        wonDealsData
      };
    }
    return { leadsData: [], activitiesData: [], wonDealsData: [] };
  }, [salesData?.analyticsTeam?.user_performance]);


  // Dados ordenados para gráficos de corretores (DECRESCENTE - maior para menor)
  // SEMPRE MOSTRA TODOS OS CORRETORES, mesmo com valor 0
  const sortedChartsData = useMemo(() => {
    if (!salesData?.leadsByUser || salesData.leadsByUser.length === 0) {
      return {
        sortedLeadsData: [],
        sortedMeetingsData: [],
        sortedSalesData: []
      };
    }


    // Função para filtrar por busca avançada
    const filterByAdvancedSearch = (users) => {
      if (!searchValue.trim()) return users;
      
      // Se o campo de busca é "Corretor", filtrar apenas pelos corretores
      if (searchField === 'Corretor') {
        return users.filter(user => {
          const corretorName = user.name || '';
          return flexibleSearch(corretorName, searchValue);
        });
      }
      
      // Para outros campos, filtrar os leads individuais e recalcular as métricas
      return users.map(user => {
        // Se não tem leads individuais, remover o usuário da lista
        if (!user.leads || !Array.isArray(user.leads) || user.leads.length === 0) {
          return null;
        }
        
        // Filtrar apenas os leads que correspondem ao critério
        const filteredLeads = user.leads.filter(lead => {
          let fieldValue = '';
          
          // Mapear os nomes dos campos do modal para os campos dos leads
          switch (searchField) {
            case 'Nome do Lead':
              fieldValue = lead.leadName || lead.name || lead.client_name || '';
              break;
            case 'Fonte':
              fieldValue = lead.fonte || lead.source || lead.utm_source || '';
              break;
            case 'Anúncio':
              fieldValue = lead.anuncio || lead.ad || lead.advertisement || lead.utm_campaign || '';
              break;
            case 'Público':
              fieldValue = lead['Público'] || lead.publico || lead.audience || lead.publicoAlvo || lead.target_audience || '';
              break;
            case 'Produto':
              fieldValue = lead['Produto'] || lead.produto || lead.product || lead.empreendimento || '';
              break;
            case 'Funil':
              fieldValue = lead['Funil'] || lead.funil || lead.funnel || lead.pipeline || lead.pipeline_name || '';
              break;
            case 'Etapa':
              fieldValue = lead['Etapa'] || lead.etapa || lead.stage || lead.status || lead.stage_name || '';
              break;
            default:
              fieldValue = lead.leadName || lead.name || lead.client_name || '';
          }
          
          return flexibleSearch(fieldValue, searchValue);
        });
        
        // Se não há leads filtrados, remover o usuário
        if (filteredLeads.length === 0) {
          return null;
        }
        
        // Para reuniões: usar dados do backend (como o modal) se disponível
        let meetingsHeld = 0;
        if (searchValue && searchField && searchField !== 'Corretor' && data && data._rawTablesData) {
          // Com filtro: contar reuniões do backend que passam pelo filtro
          const allMeetings = [
            ...(data._rawTablesData.reunioesDetalhes || []),
            ...(data._rawTablesData.reunioesOrganicasDetalhes || [])
          ];
          
          meetingsHeld = allMeetings.filter(meeting => {
            // Filtrar por corretor
            if (meeting.Corretor !== user.name) return false;
            
            // Aplicar filtro de busca
            let fieldValue = '';
            switch (searchField) {
              case 'Público':
                fieldValue = meeting['Público'] || meeting['Público-Alvo'] || meeting.publico || '';
                break;
              case 'Produto':
                fieldValue = meeting.Produto || meeting.produto || '';
                break;
              case 'Fonte':
                fieldValue = meeting.Fonte || meeting.fonte || '';
                break;
              case 'Anúncio':
                fieldValue = meeting.Anúncio || meeting.anuncio || '';
                break;
              case 'Funil':
                fieldValue = meeting.Funil || meeting.funil || '';
                break;
              case 'Etapa':
                fieldValue = meeting.Etapa || meeting.etapa || '';
                break;
              default:
                fieldValue = meeting['Nome do Lead'] || meeting.leadName || '';
            }
            
            return flexibleSearch(fieldValue, searchValue);
          }).length;
        } else {
          // Sem filtro: usar valor original do corretor
          meetingsHeld = Number(user.meetingsHeld || user.meetings || 0);
        }
        
        const proposalsHeld = filteredLeads.filter(lead => 
          lead.is_proposta === true || 
          lead.etapa?.toLowerCase().includes('proposta')
        ).length;
        
        const sales = filteredLeads.filter(lead => {
          const etapa = (lead.etapa || '').toLowerCase();
          // Excluir "venda perdida" explicitamente
          if (etapa.includes('perdida')) return false;
          // Incluir apenas vendas válidas
          return etapa.includes('venda') || etapa.includes('vendido') || etapa.includes('ganho');
        }).length;
        
        // Retornar o usuário com os leads filtrados e métricas recalculadas
        return {
          ...user,
          leads: filteredLeads,
          value: filteredLeads.length,
          active: filteredLeads.length,
          meetingsHeld: meetingsHeld,
          meetings: meetingsHeld,
          proposalsHeld: proposalsHeld,
          sales: sales
        };
      }).filter(user => user !== null); // Remover usuários nulos
    };

    // Filtrar dados e aplicar busca avançada
    // CORREÇÃO: Incluir SA IMOB mas renomear como "VAZIO"
    const originalData = [...salesData.leadsByUser].map(user => ({
      ...user,
      name: user.name === 'SA IMOB' ? 'Vazio' : user.name
    }));
    const filteredData = filterByAdvancedSearch(originalData);

    // Garantir ordenação decrescente consistente - sempre tratar como números
    // Em caso de empate, ordenar alfabeticamente por nome para consistência
    const sortedLeads = filteredData
      .map(user => ({
        ...user,
        // Calcular proposalsHeld para cada usuário (igual ao meetingsHeld)
        proposalsHeld: (user.leads || []).filter(lead => 
          lead.is_proposta === true || 
          lead.etapa?.toLowerCase().includes('proposta')
        ).length
      }))
      .sort((a, b) => {
        const diff = Number(b.value || 0) - Number(a.value || 0);
        return diff !== 0 ? diff : (a.name || '').localeCompare(b.name || '');
      });
    
    const sortedMeetings = filteredData
      .map(user => ({
        ...user,
        meetingsHeld: Number(user.meetingsHeld || user.meetings || 0)
      }))
      .sort((a, b) => {
        const diff = Number(b.meetingsHeld || 0) - Number(a.meetingsHeld || 0);
        return diff !== 0 ? diff : (a.name || '').localeCompare(b.name || '');
      });
      
    const sortedSales = filteredData
      .sort((a, b) => {
        const diff = Number(b.sales || 0) - Number(a.sales || 0);
        return diff !== 0 ? diff : (a.name || '').localeCompare(b.name || '');
      });

    // Debug: log para verificar ordenação

    return {
      // Ordenar por total de leads (value) - decrescente
      // Filtrar corretores válidos e por busca avançada
      sortedLeadsData: sortedLeads,
        
      // Ordenar por reuniões - decrescente  
      // Usar os mesmos dados filtrados para consistência
      sortedMeetingsData: sortedMeetings,
        
      // Ordenar por vendas - decrescente
      // Usar os mesmos dados filtrados para consistência
      sortedSalesData: sortedSales
    };
  }, [salesData?.leadsByUser, searchField, searchValue]);

  // Mini Metric Card Component
  const MiniMetricCard = ({ title, value, subtitle, color = COLORS.primary }) => (
    <div className="mini-metric-card">
      <div className="mini-metric-value" style={{ color }}>{value}</div>
      <div className="mini-metric-title">{title}</div>
      {subtitle && <div className="mini-metric-subtitle">{subtitle}</div>}
    </div>
  );

  // Grouped Bar Chart Component for Organic/Paid/Total Leads (matching Marketing dashboard)
  const GroupedBarChart = memo(({ data, style, loading = false, title = "Leads", onBarClick = null }) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);
    const isMobile = windowSize.width < 768;

    // Configuração de labels simplificada - apenas números
    const labelOption = {
      show: true,
      position: 'top',
      formatter: '{c}',
      fontSize: isMobile ? 9 : 12,
      fontWeight: 'bold',
      color: '#2d3748'
    };

    useEffect(() => {
      if (!chartRef.current) return;

      if (!chartInstance.current) {
        chartInstance.current = echarts.init(chartRef.current);
        
        // Configuração simplificada do gráfico
        const emptyOption = {
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              type: 'shadow'
            },
            formatter: function(params) {
              let result = `<strong>${params[0].name}</strong><br/>`;
              params.forEach(item => {
                const color = `<span style="display:inline-block;margin-right:5px;border-radius:10px;width:10px;height:10px;background-color:${item.color};"></span>`;
                result += `${color}${item.seriesName}: <strong>${item.value}</strong><br/>`;
              });
              return result;
            }
          },
          legend: {
            data: ['Leads', 'Leads Orgânicos'],
            top: 10,
            left: 'center',
            textStyle: { fontSize: 12, fontWeight: '500' },
            itemGap: 20
          },
          grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            top: '15%',
            containLabel: true
          },
          xAxis: {
            type: 'category',
            axisTick: { show: false },
            data: [],
            axisLabel: { 
              fontSize: 11,
              rotate: isMobile ? 30 : 0,
              interval: 0
            }
          },
          yAxis: {
            type: 'value',
            axisLabel: { fontSize: 12 }
          },
          series: [
            {
              name: 'Leads',
              type: 'bar',
              barGap: 0,
              label: labelOption,
              emphasis: { focus: 'series' },
              data: [],
              itemStyle: { color: '#96856F' }
            },
            {
              name: 'Leads Orgânicos',
              type: 'bar',
              label: labelOption,
              emphasis: { focus: 'series' },
              data: [],
              itemStyle: { color: '#4ce0b3' }
            }
          ]
        };
        
        chartInstance.current.setOption(emptyOption);
        
        // Adicionar evento de clique se fornecido
        if (onBarClick) {
          chartInstance.current.on('click', function (params) {
            onBarClick(params.name, params.value, params, params.seriesName);
          });
        }
      }
    }, [onBarClick]);

    // Controlar loading
    useEffect(() => {
      if (!chartInstance.current) return;
      
      if (loading || !data || data.length === 0) {
        chartInstance.current.showLoading({
          text: 'Carregando...',
          color: '#4E5859',
          textColor: '#666',
          maskColor: 'rgba(255, 255, 255, 0.8)',
          zlevel: 0
        });
        return;
      } else {
        chartInstance.current.hideLoading();
      }
    }, [loading, data]);

    // Atualizar dados
    useEffect(() => {
      if (!chartInstance.current || !data || data.length === 0 || loading) return;

      const updateOption = {
        xAxis: {
          data: data.map(item => item.name || item.period)
        },
        series: [
          {
            name: 'Leads',
            data: data.map(item => item.pagos || 0)
          },
          {
            name: 'Leads Orgânicos',
            data: data.map(item => item.organicos || 0)
          }
        ]
      };

      chartInstance.current.setOption(updateOption, false);
    }, [data, loading]);

    // Cleanup
    useEffect(() => {
      return () => {
        if (chartInstance.current) {
          chartInstance.current.dispose();
          chartInstance.current = null;
        }
      };
    }, []);

    return <div ref={chartRef} style={{...style, cursor: onBarClick ? 'pointer' : 'default'}} />;
  });

  // Memoized Compact Chart Component com Loading Animation e Update Dinâmico
  const CompactChart = memo(({ data, type, config, style, loading = false, onBarClick = null }) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);
    const [isLoading, setIsLoading] = useState(loading);

    // Inicializar chart com configuração vazia (eixos vazios)
    useEffect(() => {
      if (!chartRef.current) return;

      if (!chartInstance.current) {
        chartInstance.current = echarts.init(chartRef.current);
        
        // Mostrar chart vazio inicialmente com estrutura definida
        let emptyOption = {};
        
        if (type === 'bar') {
          emptyOption = {
            grid: { 
              top: isMobile ? 30 : 20, 
              right: isMobile ? 10 : 20, 
              bottom: isMobile ? 80 : 40, 
              left: isMobile ? 50 : 60 
            },
            xAxis: {
              type: 'category',
              data: [], // Eixo vazio inicialmente
              axisLabel: { 
                fontSize: isMobile ? 11 : 12,
                rotate: isMobile ? 45 : 0,
                interval: 0, // Força mostrar todos os labels
                overflow: 'none',
                width: isMobile ? 80 : 100,
                rich: {
                  a: {
                    fontSize: isMobile ? 10 : 12,
                    fontWeight: 'normal'
                  }
                }
              },
              axisLine: {
                show: true
              }
            },
            yAxis: {
              type: 'value',
              axisLabel: { fontSize: isMobile ? 10 : 12 }
            },
            series: [{
              name: config.name || 'Data',
              data: [], // Dados vazios inicialmente
              type: 'bar',
              itemStyle: { 
                color: config.color,
                emphasis: {
                  color: config.color,
                  opacity: 0.8
                }
              },
              emphasis: {
                focus: 'series',
                itemStyle: {
                  shadowBlur: 10,
                  shadowOffsetX: 0,
                  shadowOffsetY: 0,
                  shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
              },
              barWidth: isMobile ? '50%' : '70%',
              label: {
                show: true,
                position: 'top',
                fontSize: isMobile ? 10 : 14,
                fontWeight: 'bold',
                color: '#2d3748',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                padding: [2, 6],
                borderRadius: 4,
                formatter: function(params) {
                  return params.value;
                }
              }
            }],
            tooltip: {
              trigger: 'axis',
              formatter: function(params) {
                const item = params[0];
                return `${item.name}: ${item.value}`;
              }
            }
          };
        } else if (type === 'pie') {
          emptyOption = {
            series: [{
              name: config.name || 'Data',
              type: 'pie',
              radius: isMobile ? '60%' : '70%',
              center: ['50%', '50%'],
              data: [], // Dados vazios inicialmente
              label: {
                fontSize: isMobile ? 10 : 12,
                formatter: '{b}: {c} ({d}%)'
              },
              tooltip: {
                formatter: '{b}: {c} ({d}%)'
              }
            }]
          };
        }
        
        chartInstance.current.setOption(emptyOption);
        
        // Adicionar evento de clique se fornecido
        if (onBarClick && type === 'bar') {
          chartInstance.current.on('click', function (params) {
            onBarClick(params.name, params.value, params);
          });
        }
      }
    }, [type, config, isMobile, onBarClick]);

    // Controlar loading animation
    useEffect(() => {
      if (!chartInstance.current) return;
      
      if (isLoading || !data || data.length === 0) {
        chartInstance.current.showLoading({
          text: 'Carregando...',
          color: config.color,
          textColor: '#666',
          maskColor: 'rgba(255, 255, 255, 0.8)',
          zlevel: 0
        });
        return;
      } else {
        chartInstance.current.hideLoading();
      }
    }, [isLoading, data, config.color]);

    // Atualizar dados dinamicamente quando mudam (ASYNC UPDATE)
    useEffect(() => {
      if (!chartInstance.current || !data || data.length === 0 || isLoading) return;

      // ECharts will automatically animate transitions between data updates
      let updateOption = {};

      if (type === 'bar') {
        // Garantir ordenação decrescente antes de passar para o gráfico
        const sortedData = [...data].sort((a, b) => {
          const valueA = Number(a[config.yKey] || 0);
          const valueB = Number(b[config.yKey] || 0);
          const diff = valueB - valueA; // Decrescente
          return diff !== 0 ? diff : (a[config.xKey] || '').localeCompare(b[config.xKey] || '');
        });
        
        updateOption = {
          xAxis: {
            data: sortedData.map(item => item[config.xKey])
          },
          series: [{
            name: config.name || 'Data', // Use name for navigation
            data: sortedData.map(item => item[config.yKey]),
            itemStyle: { 
              color: config.color,
              emphasis: {
                color: config.color,
                opacity: 0.8
              }
            },
            emphasis: {
              focus: 'series',
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowOffsetY: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            },
            label: {
              show: true,
              position: 'top',
              fontSize: isMobile ? 12 : 14,
              fontWeight: 'bold',
              color: '#2d3748',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              padding: [2, 6],
              borderRadius: 4,
              formatter: function(params) {
                return params.value;
              }
            }
          }]
        };
      } else if (type === 'pie') {
        // Preparar dados com cores personalizadas para pie
        const pieData = data.map((item, index) => ({
          name: item.name,
          value: item.value,
          itemStyle: { 
            color: config.colors ? config.colors[index % config.colors.length] : config.color 
          }
        }));
        
        updateOption = {
          series: [{
            name: config.name || 'Data',
            data: pieData
          }]
        };
      }

      // Use setOption to update data dynamically (ECharts finds differences automatically)
      chartInstance.current.setOption(updateOption, false); // false = merge mode
      
    }, [data, type, config, isLoading]);

    // Sync loading state with parent
    useEffect(() => {
      setIsLoading(loading);
    }, [loading]);

    // Cleanup
    useEffect(() => {
      return () => {
        if (chartInstance.current) {
          chartInstance.current.dispose();
          chartInstance.current = null;
        }
      };
    }, []);

    return <div ref={chartRef} style={{...style, cursor: onBarClick ? 'pointer' : 'default'}} />;
  });

  // Se está carregando, mostrar loading spinner
  if (isLoading) {
    return <LoadingSpinner message="🔄 Atualizando dados de vendas..." />;
  }

  // Se não tem dados E não está carregando, mostrar erro
  if (!salesData) {
    return (
      <div className="dashboard-content">
        <div className="error-message">
          Dados de vendas não disponíveis.
        </div>
      </div>
    );
  }

  return (
    <div className={`dashboard-content ${isUpdating ? 'updating' : ''}`}>
      {/* CSS dos novos componentes de comparação e filtros de período */}
      <style>{`
        /* Estilos para o indicador de tendência */
        .trend-indicator {
          display: inline-flex;
          align-items: center;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          margin-left: 8px;
        }
        
        .trend-indicator.positive {
          background-color: rgba(0, 200, 83, 0.15);
          color: #00c853;
        }
        
        .trend-indicator.negative {
          background-color: rgba(255, 82, 82, 0.15);
          color: #ff5252;
        }
        
        .trend-indicator.neutral {
          background-color: rgba(158, 158, 158, 0.15);
          color: #9e9e9e;
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
        
        .trend-tag-square:hover {
          transform: scale(1.1);
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
        }
        
        .trend-tag-square {
          cursor: default;
          user-select: none;
          flex-shrink: 0;
        }
        
        .trend-indicator-square {
          background-color: rgba(255, 82, 82, 0.15);
          color: #ff3a5e;
          border-radius: 8px;
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 600;
          display: inline-block;
          text-align: center;
        }

        /* Estilização moderna dos controles de período */
        .period-controls {
          display: flex;
          flex-direction: column;
          gap: 16px;
          align-items: flex-end;
          position: relative;
        }

        .period-selector {
          display: flex;
          gap: 4px;
          background: rgba(255, 255, 255, 0.9);
          padding: 6px;
          border-radius: 12px;
          border: 1px solid #e0e6ed;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          backdrop-filter: blur(10px);
        }

        .period-selector button {
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: #64748b;
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
          position: relative;
          overflow: hidden;
        }

        .period-selector button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
          transition: left 0.5s ease;
        }

        .period-selector button:hover::before {
          left: 100%;
        }

        .period-selector button:hover {
          background: rgba(78, 88, 89, 0.1);
          color: #4E5859;
          transform: translateY(-1px);
        }

        .period-selector button.active {
          background: linear-gradient(135deg, #4E5859 0%, #96856F 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(78, 88, 89, 0.3);
          transform: translateY(-1px);
        }

        .period-selector button.active:hover {
          background: linear-gradient(135deg, #3a4344 0%, #7a6b5a 100%);
          transform: translateY(-2px);
        }

        /* Estilos para as tabelas de detalhes */
        .details-tabs {
          display: flex;
          gap: 2px;
          border-bottom: 2px solid #e0e0e0;
          margin-bottom: 20px;
        }

        .details-tab {
          padding: 12px 20px;
          border: none;
          background: #f8f9fa;
          color: #75777B;
          cursor: pointer;
          border-radius: 8px 8px 0 0;
          font-weight: 500;
          transition: all 0.2s ease;
          border-bottom: 3px solid transparent;
        }

        .details-tab:hover {
          background: #e9ecef;
          color: #4E5859;
        }

        .details-tab.active {
          background: #ffffff;
          color: #4E5859;
          font-weight: 600;
          border-bottom-color: #4E5859;
        }

        .details-table-container {
          width: 100%;
        }

        .details-table-wrapper {
          overflow-x: auto;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
        }

        .details-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
        }

        .details-table th {
          background: #f8f9fa;
          padding: 16px 12px;
          text-align: left;
          font-weight: 600;
          color: #4E5859;
          border-bottom: 2px solid #e0e0e0;
          white-space: nowrap;
        }

        .details-table td {
          padding: 14px 12px;
          border-bottom: 1px solid #f0f0f0;
          color: #212121;
        }

        .details-table tr:hover {
          background: #f8f9fa;
        }

        .details-table tr:last-child td {
          border-bottom: none;
        }

        .card-full {
          width: 100%;
          grid-column: 1 / -1;
        }

        /* Responsividade para tabelas */
        @media (max-width: 768px) {
          .details-tabs {
            flex-direction: column;
            gap: 4px;
          }
          
          .details-tab {
            border-radius: 6px;
            text-align: center;
          }
          
          .details-table th,
          .details-table td {
            padding: 10px 8px;
            font-size: 14px;
          }
          
          .details-table-wrapper {
            overflow-x: scroll;
          }
        }
        .comparison-metric-new {
          background: #ffffff;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          border: 1px solid #e0e0e0;
          transition: all 0.3s ease;
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .comparison-metric-new:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
          transform: translateY(-2px);
        }

        .metric-header-new {
          margin-bottom: 8px;
        }

        .metric-title-new {
          font-size: 16px;
          font-weight: 600;
          color: #4E5859;
          margin: 0;
          line-height: 1.3;
        }

        .metric-main-value {
          font-size: 32px;
          font-weight: 700;
          color: #212121;
          line-height: 1.1;
          margin-bottom: 12px;
        }

        .metric-previous {
          margin-bottom: 12px;
        }

        .previous-label-new {
          font-size: 12px;
          color: #75777B;
          font-weight: 500;
          letter-spacing: 0.5px;
          display: block;
          margin-bottom: 4px;
        }

        .previous-value-new {
          font-size: 14px;
          color: #555;
          font-weight: 600;
        }

        .trend-indicator-new {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 14px;
          margin-top: auto;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .trend-icon-new {
          font-size: 16px;
          font-weight: bold;
          min-width: 16px;
          text-align: center;
        }

        .trend-text-new {
          font-size: 14px;
          font-weight: 700;
        }

        .trend-extra {
          font-size: 12px;
          opacity: 0.9;
          margin-left: 4px;
        }

        .comparison-grid-new {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        .comparison-summary-new {
          text-align: center;
          padding-top: 16px;
          border-top: 1px solid #e0e0e0;
        }

        .summary-badge-new {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          background: #f8f9fa;
          padding: 12px 20px;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
        }

        .summary-icon-new {
          font-size: 18px;
        }

        .summary-text-new {
          font-size: 16px;
          font-weight: 600;
          color: #4E5859;
        }

        /* Responsividade */
        @media (max-width: 768px) {
          .comparison-grid-new {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          
          .comparison-metric-new {
            padding: 16px;
          }
          
          .metric-title-new {
            font-size: 14px;
          }
          
          .metric-main-value {
            font-size: 24px;
          }
          
          .trend-indicator-new {
            font-size: 13px;
            padding: 6px 10px;
          }
          
          .trend-icon-new {
            font-size: 14px;
          }
        }

        @media (max-width: 480px) {
          .comparison-metric-new {
            padding: 12px;
          }
          
          .metric-main-value {
            font-size: 20px;
          }
          
          .metric-title-new {
            font-size: 13px;
          }
        }

        /* Estilos para React-Select */
        .react-select-container {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 220px;
        }

        .react-select-label {
          font-size: 12px;
          font-weight: 600;
          color: #4E5859;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Customização do React-Select */
        .react-select__control {
          min-height: 42px !important;
          border: 2px solid #e2e8f0 !important;
          border-radius: 8px !important;
          box-shadow: none !important;
          transition: all 0.2s ease !important;
        }

        .react-select__control:hover {
          border-color: #4E5859 !important;
        }

        .react-select__control--is-focused {
          border-color: #4E5859 !important;
          box-shadow: 0 0 0 3px rgba(78, 88, 89, 0.1) !important;
        }

        .react-select__placeholder {
          color: #a0aec0 !important;
        }

        .react-select__multi-value {
          background-color: rgba(78, 88, 89, 0.1) !important;
          border-radius: 6px !important;
        }

        .react-select__multi-value__label {
          color: #4E5859 !important;
          font-weight: 500 !important;
        }

        .react-select__multi-value__remove {
          color: #4E5859 !important;
          cursor: pointer !important;
        }

        .react-select__multi-value__remove:hover {
          background-color: #4E5859 !important;
          color: white !important;
        }

        .react-select__menu {
          border: 2px solid #e2e8f0 !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          z-index: 1000 !important;
        }

        .react-select__option {
          padding: 12px 16px !important;
          cursor: pointer !important;
        }

        .react-select__option:hover {
          background-color: #f8fafc !important;
        }

        .react-select__option--is-selected {
          background-color: rgba(78, 88, 89, 0.1) !important;
          color: #4E5859 !important;
        }

        .react-select__option--is-focused {
          background-color: #f1f5f9 !important;
        }

        /* Responsividade */
        @media (max-width: 768px) {
          .react-select-container {
            min-width: 180px;
          }
          
          .react-select__control {
            min-height: 38px !important;
          }
        }

        @media (max-width: 480px) {
          .filters-group {
            flex-direction: column;
            gap: 12px;
          }
          
          .react-select-container {
            min-width: unset;
          }
        }

        /* Estilos para filtro de busca avançada */
        .advanced-search-filter {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 300px;
        }

        .search-filter-label {
          font-size: 12px;
          font-weight: 600;
          color: #4E5859;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .search-filter-container {
          display: flex;
          gap: 0;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
          transition: all 0.2s ease;
        }

        .search-filter-container:focus-within {
          border-color: #4E5859;
          box-shadow: 0 0 0 3px rgba(78, 88, 89, 0.1);
        }

        .search-field-select {
          padding: 10px 12px;
          background: #f8f9fa;
          border: none;
          font-size: 14px;
          color: #2d3748;
          transition: all 0.2s ease;
          min-height: 42px;
          height: 42px;
          box-sizing: border-box;
          outline: none;
          min-width: 120px;
          border-right: 1px solid #e2e8f0;
        }

        .search-field-select:focus {
          background: white;
        }

        .search-input-container {
          display: flex;
          align-items: center;
          position: relative;
          flex: 1;
        }

        .search-value-input {
          flex: 1;
          padding: 10px 12px;
          background: white;
          border: none;
          font-size: 14px;
          color: #2d3748;
          transition: all 0.2s ease;
          min-height: 42px;
          height: 42px;
          box-sizing: border-box;
          outline: none;
        }

        .search-value-input::placeholder {
          color: #a0aec0;
        }

        .search-clear-button {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #a0aec0;
          cursor: pointer;
          font-size: 18px;
          padding: 4px;
          line-height: 1;
          transition: color 0.2s ease;
        }

        .search-clear-button:hover {
          color: #4E5859;
        }

        /* Responsividade para filtro de busca avançada */
        @media (max-width: 768px) {
          .advanced-search-filter {
            min-width: 250px;
          }
          
          .search-field-select,
          .search-value-input {
            padding: 8px 10px;
            font-size: 13px;
            min-height: 38px;
          }
          
          .search-field-select {
            min-width: 100px;
          }
        }

        @media (max-width: 480px) {
          .advanced-search-filter {
            min-width: unset;
            max-width: none;
          }
          
          .search-filter-container {
            flex-direction: column;
            border-radius: 8px;
          }
          
          .search-field-select {
            border-right: none;
            border-bottom: 1px solid #e2e8f0;
            border-radius: 0;
          }
          
          .search-value-input {
            border-radius: 0;
          }
        }

        /* Estilos para o indicador de filtros ativos */
        .filter-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(78, 88, 89, 0.1);
          border: 2px solid #4E5859;
          border-radius: 8px;
          font-size: 14px;
          color: #4E5859;
          font-weight: 600;
          white-space: nowrap;
          margin-left: 8px;
          height: 42px;
          align-self: flex-end;
        }

        .filter-icon {
          font-size: 16px;
        }

        .filter-text {
          font-size: 13px;
        }

        .clear-filters-btn {
          background: none;
          border: none;
          color: #4E5859;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s ease;
        }

        .clear-filters-btn:hover {
          background: rgba(78, 88, 89, 0.2);
          transform: scale(1.1);
        }

        /* ✅ Novos estilos para filtros individuais - melhor UX */

        /* Responsividade para indicador de filtros */
        @media (max-width: 768px) {
          .filters-group {
            width: 100%;
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }
          
          .simple-filter {
            max-width: none;
            width: 100%;
          }
          
          .apply-filters-btn {
            align-self: stretch;
            width: 100%;
            justify-content: center;
            margin-left: 0;
          }
          
          .filter-indicator {
            padding: 6px 10px;
            font-size: 12px;
            margin-left: 0;
            margin-top: 0;
            align-self: stretch;
            width: 100%;
            justify-content: center;
          }
          
          .filter-icon {
            font-size: 14px;
          }
          
          .filter-text {
            font-size: 12px;
          }
        }

        /* Indicador de status global */
        .global-status-indicator {
          position: fixed;
          top: 300px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          background: linear-gradient(135deg, #4E5859 0%, #96856F 100%);
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .status-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-icon {
          animation: statusSpin 1s linear infinite;
        }

        @keyframes statusSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .status-text {
          font-size: 34px;
          font-weight: 500;
          white-space: nowrap;
        }
      `}</style>

      <div className="dashboard-row row-header">
        <div className="section-title">
          <h2>Dashboard de Vendas</h2>
          {/* Label do período selecionado */}
          <div style={{
            fontSize: '14px',
            color: '#64748b',
            fontWeight: '500',
            marginTop: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>📅</span>
            <span>
              Período: {(() => {
                const now = new Date();
                let startDate, endDate;
                
                if (period === 'current_month') {
                  startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                  endDate = now;
                } else if (period === '7d') {
                  endDate = now;
                  startDate = new Date(now);
                  startDate.setDate(startDate.getDate() - 7);
                } else if (period === 'previous_month') {
                  // Mês anterior completo
                  startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                  endDate = new Date(now.getFullYear(), now.getMonth(), 0);
                } else if (period === 'year') {
                  // Ano atual
                  startDate = new Date(now.getFullYear(), 0, 1);
                  endDate = now;
                } else if (period === 'custom' && customPeriod?.startDate && customPeriod?.endDate) {
                  startDate = new Date(customPeriod.startDate + 'T12:00:00');
                  endDate = new Date(customPeriod.endDate + 'T12:00:00');
                } else {
                  return 'Selecione um período';
                }
                
                return `${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}`;
              })()}
            </span>
          </div>
          <div className="dashboard-controls">
            <div className="filters-group">
              {/* ✅ REACT-SELECT: Filtro de corretor com múltipla seleção */}
              <div className="react-select-container">
                <label className="react-select-label">Corretor</label>
                <Select
                  isMulti={true}
                  isSearchable={true}
                  closeMenuOnSelect={false}
                  hideSelectedOptions={false}
                  value={selectedCorretorValues}
                  onChange={(selected) => {
                    const values = selected ? selected.map(opt => opt.value).filter(v => v !== '') : [];
                    updateFilter('corretor', values.join(','));
                  }}
                  options={corretorOptions}
                  placeholder="Selecionar corretores..."
                  noOptionsMessage={() => "Nenhuma opção encontrada"}
                  className="react-select"
                  classNamePrefix="react-select"
                />
              </div>
              
              {/* ✅ REACT-SELECT: Filtro de fonte com múltipla seleção */}
              <div className="react-select-container">
                <label className="react-select-label">Fonte</label>
                <Select
                  isMulti={true}
                  isSearchable={true}
                  closeMenuOnSelect={false}
                  hideSelectedOptions={false}
                  value={selectedSourceValues}
                  onChange={(selected) => {
                    const values = selected ? selected.map(opt => opt.value).filter(v => v !== '') : [];
                    updateFilter('source', values.join(','));
                  }}
                  options={sourceSelectOptions}
                  placeholder="Selecionar fontes..."
                  noOptionsMessage={() => "Nenhuma opção encontrada"}
                  className="react-select"
                  classNamePrefix="react-select"
                />
              </div>

              {/* Filtro de busca avançada */}
              <div className="advanced-search-filter">
                <label className="search-filter-label">Busca Avançada</label>
                <div className="search-filter-container">
                  <select
                    value={searchField}
                    onChange={(e) => {
                      setSearchField(e.target.value);
                      setSearchValue(''); // Limpar valor quando mudar o campo
                    }}
                    className="search-field-select"
                  >
                    <option value="Nome do Lead">Nome do Lead</option>
                    <option value="Corretor">Corretor</option>
                    <option value="Fonte">Fonte</option>
                    <option value="Anúncio">Anúncio</option>
                    <option value="Público">Público</option>
                    <option value="Produto">Produto</option>
                    <option value="Funil">Funil</option>
                    <option value="Etapa">Etapa</option>
                  </select>
                  <div className="search-input-container">
                    <input
                      type="text"
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      placeholder={`Buscar por ${searchField.toLowerCase()}...`}
                      className="search-value-input"
                    />
                    {searchValue && (
                      <button
                        onClick={() => setSearchValue('')}
                        className="search-clear-button"
                        title="Limpar busca"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* React-Select já gerencia as tags e botões de remoção */}
            </div>
            <div className="period-controls" style={{ position: 'relative' }}>
              <div className="period-selector">
                <button 
                  className={period === 'current_month' ? 'active' : ''} 
                  onClick={() => handlePeriodChange('current_month')}
                >
                  Mês Atual
                </button>
                <button 
                  className={period === '7d' ? 'active' : ''} 
                  onClick={() => handlePeriodChange('7d')}
                >
                  7 Dias
                </button>
                <button 
                  className={period === 'previous_month' ? 'active' : ''} 
                  onClick={() => handlePeriodChange('previous_month')}
                >
                  Mês Anterior
                </button>
                <button 
                  className={period === 'year' ? 'active' : ''} 
                  onClick={() => handlePeriodChange('year')}
                >
                  Anual
                </button>
                <button 
                  className={period === 'custom' ? 'active' : ''} 
                  onClick={() => handlePeriodChange('custom')}
                >
                  Personalizado
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Linha 1: KPIs principais */}
      <div className="dashboard-row row-compact">
         
        <div className="card card-metrics-group">
          <div className="card-title">Métricas de Vendas e Produtividade</div>
          <div className="metrics-group">
               <div className="metrics-group">
            <div 
              className="mini-metric-card"
              onClick={() => openModal('reunioes')}
              onKeyDown={(e) => e.key === 'Enter' && openModal('reunioes')}
              tabIndex={0}
              role="button"
              aria-label="Clique para ver detalhes das reuniões realizadas"
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className="mini-metric-value" style={{ color: COLORS.primary }}>
                  {sortedChartsData.sortedMeetingsData.reduce((sum, user) => sum + (user.meetingsHeld || 0), 0)}
                </div>
                <TrendIndicator value={(() => {
                  const current = sortedChartsData.sortedMeetingsData.reduce((sum, user) => sum + (user.meetingsHeld || 0), 0);
                  const previous = comparisonData?.previousPeriod?.totalMeetings || 0;
                  return previous > 0 ? ((current - previous) / previous) * 100 : 0;
                })()} />
              </div>
              <div className="mini-metric-title">REUNIÕES REALIZADAS</div>
              <div className="mini-metric-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#000000', fontWeight: '600' }}>
                  {(() => {
                    const totalMeetings = sortedChartsData.sortedMeetingsData.reduce((sum, user) => sum + (user.meetingsHeld || 0), 0);
                    const totalLeads = sortedChartsData.sortedLeadsData.reduce((sum, user) => sum + (user.value || 0), 0);
                    const conversionRate = totalLeads > 0 ? (totalMeetings / totalLeads) * 100 : 0;
                    return conversionRate.toFixed(1);
                  })()}%
                </span>
                <span>TAXA CONV.</span>
              </div>
            </div>
            <div 
              className="mini-metric-card"
              onClick={() => openModal('propostas')}
              onKeyDown={(e) => e.key === 'Enter' && openModal('propostas')}
              tabIndex={0}
              role="button"
              aria-label="Clique para ver detalhes das propostas realizadas"
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className="mini-metric-value" style={{ color: COLORS.secondary }}>
                  {sortedChartsData.sortedLeadsData.reduce((sum, user) => sum + (user.proposalsHeld || 0), 0)}
                </div>
                <TrendIndicator value={(() => {
                  const current = sortedChartsData.sortedLeadsData.reduce((sum, user) => sum + (user.proposalsHeld || 0), 0);
                  const previous = comparisonData?.previousPeriod?.totalProposals || 0;
                  return previous > 0 ? ((current - previous) / previous) * 100 : 0;
                })()} />
              </div>
              <div className="mini-metric-title">PROPOSTAS REALIZADAS</div>
              <div className="mini-metric-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#000000', fontWeight: '600' }}>
                  {(() => {
                    const totalProposals = sortedChartsData.sortedLeadsData.reduce((sum, user) => sum + (user.proposalsHeld || 0), 0);
                    const totalLeads = sortedChartsData.sortedLeadsData.reduce((sum, user) => sum + (user.value || 0), 0);
                    const conversionRate = totalLeads > 0 ? (totalProposals / totalLeads) * 100 : 0;
                    return conversionRate.toFixed(1);
                  })()}%
                </span>
                <span>TAXA CONV.</span>
              </div>
            </div>
          </div>
            <div 
              className="mini-metric-card"
              onClick={() => openModal('vendas')}
              onKeyDown={(e) => e.key === 'Enter' && openModal('vendas')}
              tabIndex={0}
              role="button"
              aria-label="Clique para ver detalhes das vendas realizadas"
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className="mini-metric-value" style={{ color: '#374151' }}>
                  {sortedChartsData.sortedSalesData.reduce((sum, user) => sum + (user.sales || 0), 0)}
                </div>
                <TrendIndicator value={(() => {
                  const current = sortedChartsData.sortedSalesData.reduce((sum, user) => sum + (user.sales || 0), 0);
                  const previous = comparisonData?.previousPeriod?.totalSales || salesData?.previousWonLeads || 0;
                  return previous > 0 ? ((current - previous) / previous) * 100 : 0;
                })()} />
              </div>
              <div className="mini-metric-title">VENDAS REALIZADAS</div>
              <div className="mini-metric-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#000000', fontWeight: '600' }}>
                  {(() => {
                    const totalSales = sortedChartsData.sortedSalesData.reduce((sum, user) => sum + (user.sales || 0), 0);
                    const totalLeads = sortedChartsData.sortedLeadsData.reduce((sum, user) => sum + (user.value || 0), 0);
                    const conversionRate = totalLeads > 0 ? (totalSales / totalLeads) * 100 : 0;
                    return conversionRate.toFixed(1);
                  })()}%
                </span>
                <span>TAXA CONV.</span>
              </div>
            </div>
            <div className="mini-metric-card">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className="mini-metric-value" style={{ color: '#374151' }}>
                  R$ {(() => {
                    // Se há filtro ativo, calcular pelos dados filtrados, senão usar dados globais da API
                    const hasFilter = searchValue.trim() !== '';
                    
                    let totalSales, totalRevenue, avgDealSize;
                    
                    if (hasFilter) {
                      // Com filtro: calcular pelos dados filtrados
                      totalSales = sortedChartsData.sortedSalesData.reduce((sum, user) => sum + (user.sales || 0), 0);
                      // Usar dados do summary ou _rawTablesData
                      const rawData = salesData?._rawTablesData || data?._rawTablesData;
                      const summaryRevenue = rawData?.summary?.valor_total_vendas || 0;
                      const summaryTotalSales = rawData?.summary?.total_vendas || 0;
                      avgDealSize = summaryTotalSales > 0 ? summaryRevenue / summaryTotalSales : 0;
                      totalRevenue = totalSales * avgDealSize;
                    } else {
                      // Sem filtro: usar dados do summary
                      const rawData = salesData?._rawTablesData || data?._rawTablesData;
                      totalRevenue = rawData?.summary?.valor_total_vendas || salesData?.kpis?.sales?.total_revenue || 0;
                      totalSales = rawData?.summary?.total_vendas || salesData?.kpis?.sales?.total || 0;
                      avgDealSize = totalSales > 0 ? totalRevenue / totalSales : 0;
                    }
                    return avgDealSize;
                  })().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <TrendIndicator value={(() => {
                  const hasFilter = searchValue.trim() !== '';
                  
                  let current;
                  const rawData = salesData?._rawTablesData || data?._rawTablesData;
                  const totalRevenue = rawData?.summary?.valor_total_vendas || 0;
                  const totalSales = rawData?.summary?.total_vendas || 0;
                  
                  if (hasFilter) {
                    // Com filtro: calcular baseado nas vendas filtradas
                    const filteredSales = sortedChartsData.sortedSalesData.reduce((sum, user) => sum + (user.sales || 0), 0);
                    current = filteredSales > 0 && totalSales > 0 ? (totalRevenue / totalSales) : 0;
                  } else {
                    // Sem filtro: usar dados do summary
                    current = totalSales > 0 ? totalRevenue / totalSales : 0;
                  }
                  const previous = comparisonData?.previousPeriod?.averageDealSize || salesData?.previousAverageDealSize || 0;
                  return previous > 0 ? ((current - previous) / previous) * 100 : 0;
                })()} />
              </div>
              <div className="mini-metric-title">TICKET MÉDIO</div>
            </div>
            <div className="mini-metric-card">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className="mini-metric-value" style={{ color: '#374151' }}>
                  R$ {(() => {
                    // Se há filtro ativo, calcular pelos dados filtrados, senão usar dados globais da API
                    const hasFilter = searchValue.trim() !== '';
                    
                    const rawData = salesData?._rawTablesData || data?._rawTablesData;
                    const totalRevenue = rawData?.summary?.valor_total_vendas || 0;
                    const totalSales = rawData?.summary?.total_vendas || 0;
                    
                    if (hasFilter) {
                      // Com filtro: calcular receita proporcional às vendas filtradas
                      const filteredSales = sortedChartsData.sortedSalesData.reduce((sum, user) => sum + (user.sales || 0), 0);
                      const avgDealSize = totalSales > 0 ? totalRevenue / totalSales : 0;
                      return filteredSales * avgDealSize;
                    } else {
                      // Sem filtro: usar valor total do summary
                      return totalRevenue;
                    }
                  })().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <TrendIndicator value={(() => {
                  const hasFilter = searchValue.trim() !== '';
                  
                  const rawData = salesData?._rawTablesData || data?._rawTablesData;
                  const totalRevenue = rawData?.summary?.valor_total_vendas || 0;
                  const totalSales = rawData?.summary?.total_vendas || 0;
                  
                  let current;
                  if (hasFilter) {
                    // Com filtro: calcular receita proporcional
                    const filteredSales = sortedChartsData.sortedSalesData.reduce((sum, user) => sum + (user.sales || 0), 0);
                    const avgDealSize = totalSales > 0 ? totalRevenue / totalSales : 0;
                    current = filteredSales * avgDealSize;
                  } else {
                    // Sem filtro: usar valor total
                    current = totalRevenue;
                  }
                  const previous = comparisonData?.previousPeriod?.totalRevenue || (salesData?.previousWonLeads || 0) * (salesData?.previousAverageDealSize || 0);
                  return previous > 0 ? ((current - previous) / previous) * 100 : 0;
                })()} />
              </div>
              <div className="mini-metric-title">RECEITA TOTAL</div>
            </div>
          </div>
        </div>
      </div>



      {/* Linha 5: Gráficos de Corretores - Layout Vertical */}
      <div className="dashboard-row" style={{ flexDirection: 'column' }}>
        {salesData?.leadsByUser && salesData.leadsByUser.length > 0 && sortedChartsData.sortedLeadsData.length > 0 ? (
          <>
            <div className="card card-full" key={`leads-${searchField}-${searchValue}`}>
              <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Leads criados no período (CRM)</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span 
                    style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#007bff',
                      backgroundColor: '#f0f4f8',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      border: '2px solid #e2e8f0',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => openModal('leads')}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#e3f2fd';
                      e.target.style.borderColor = '#007bff';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#f0f4f8';
                      e.target.style.borderColor = '#e2e8f0';
                    }}
                    title="Clique para ver detalhes dos leads"
                  >
                    Total: {sortedChartsData.sortedLeadsData.reduce((sum, user) => sum + (user.value || 0), 0)}
                  </span>
                  <button
                    onClick={handleExportLeads}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#218838';
                      e.target.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#28a745';
                      e.target.style.transform = 'translateY(0)';
                    }}
                    title="Exportar dados de leads para Excel"
                  >
                    📊 Excel
                  </button>
                </div>
              </div>
              <CompactChart 
                type="bar"
                data={sortedChartsData.sortedLeadsData}
                config={chartConfigs.leadsConfig}
                style={chartStyle}
                onBarClick={(corretorName) => openModalByCorretor('leads', corretorName)}
              />
            </div>
            
            <div className="card card-full" key={`meetings-${searchField}-${searchValue}`}>
              <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Rank Corretores - Reunião</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span 
                    style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#007bff',
                      backgroundColor: '#f0f4f8',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      border: '2px solid #e2e8f0',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => openModal('reunioes')}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#e3f2fd';
                      e.target.style.borderColor = '#007bff';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#f0f4f8';
                      e.target.style.borderColor = '#e2e8f0';
                    }}
                    title="Clique para ver todas as reuniões"
                  >
                    Total: {sortedChartsData.sortedMeetingsData.reduce((sum, user) => sum + (user.meetingsHeld || 0), 0)}
                  </span>
                  <button
                    onClick={handleExportMeetings}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#218838';
                      e.target.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#28a745';
                      e.target.style.transform = 'translateY(0)';
                    }}
                    title="Exportar dados de reuniões para Excel"
                  >
                    📊 Excel
                  </button>
                </div>
              </div>
              <CompactChart 
                type="bar" 
                data={sortedChartsData.sortedMeetingsData} 
                config={chartConfigs.meetingsConfig}
                style={chartStyle}
                onBarClick={(corretorName) => openModalByCorretor('reunioes', corretorName)}
                  />
            </div>
            
            <div className="card card-full" key={`sales-${searchField}-${searchValue}`}>
              <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Rank Corretores - Venda</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span 
                    style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#007bff',
                      backgroundColor: '#f0f4f8',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      border: '2px solid #e2e8f0',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => openModal('vendas')}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#e3f2fd';
                      e.target.style.borderColor = '#007bff';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#f0f4f8';
                      e.target.style.borderColor = '#e2e8f0';
                    }}
                    title="Clique para ver todas as vendas"
                  >
                    Total: {sortedChartsData.sortedSalesData.reduce((sum, user) => sum + (user.sales || 0), 0)}
                  </span>
                  <button
                    onClick={handleExportSales}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#218838';
                      e.target.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#28a745';
                      e.target.style.transform = 'translateY(0)';
                    }}
                    title="Exportar dados de vendas para Excel"
                  >
                    📊 Excel
                  </button>
                </div>
              </div>
              <CompactChart 
                type="bar" 
                data={sortedChartsData.sortedSalesData} 
                config={chartConfigs.salesConfig}
                style={chartStyle}
                onBarClick={(corretorName) => openModalByCorretor('vendas', corretorName)}
                  />
            </div>
          </>
        ) : salesData?.analyticsTeam && salesData.analyticsTeam.user_performance && salesData.analyticsTeam.user_performance.length > 0 ? (
          <>
            <div className="card card-full">
              <div className="card-title">Leads criados no período (CRM)</div>
              <CompactChart 
                type="bar" 
                data={chartData.leadsData} 
                config={chartConfigs.leadsConfig}
                style={chartStyle}
                  />
            </div>
            
            <div className="card card-full">
              <div className="card-title">Rank Corretores - Atividades</div>
              <CompactChart 
                type="bar" 
                data={chartData.activitiesData} 
                config={chartConfigs.activitiesConfig}
                style={chartStyle}
                  />
            </div>
            
            <div className="card card-full">
              <div className="card-title">Rank Corretores - Venda</div>
              <CompactChart 
                type="bar" 
                data={chartData.wonDealsData} 
                config={chartConfigs.salesConfig}
                style={chartStyle}
                  />
              {salesData?.analyticsTeam?.team_stats?.top_performer && (
                <div className="team-info">
                  Top performer: {salesData.analyticsTeam.team_stats.top_performer}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="card card-full">
            <div className="error-message">
              {searchValue && searchValue.trim() !== '' ? (
                // Quando há um filtro ativo mas não retorna resultados
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                  <h3 style={{ color: '#4a5568', marginBottom: '8px' }}>Dados não encontrados</h3>
                  <p style={{ color: '#718096', fontSize: '14px' }}>
                    Nenhum resultado encontrado para "{searchValue}" no campo "{searchField}"
                  </p>
                  <button
                    onClick={() => setSearchValue('')}
                    style={{
                      marginTop: '16px',
                      padding: '8px 16px',
                      backgroundColor: '#4E5859',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    Limpar filtro
                  </button>
                </div>
              ) : salesData?.totalLeads > 0 ? (
                <>
                  <p>Foram encontrados {salesData.totalLeads} leads com as fontes selecionadas: <strong>{filters.source}</strong></p>
                  <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                    Porém, não há dados de desempenho por corretor disponíveis para estas fontes específicas.
                  </p>
                  <p style={{ marginTop: '10px', fontSize: '13px', color: '#888' }}>
                    Isso pode ocorrer quando os leads não possuem corretor atribuído ou os corretores não têm atividade no período.
                  </p>
                </>
              ) : (
                'Não há dados de desempenho por corretor disponíveis'
              )}
            </div>
          </div>
        )}
      </div>


      {/* Modal para tabelas detalhadas */}
      <DetailModal
        isOpen={modalStateRef.current.isOpen}
        onClose={closeModal}
        type={modalStateRef.current.type}
        title={modalStateRef.current.title}
        isLoading={modalStateRef.current.isLoading}
        data={modalStateRef.current.data}
        error={modalStateRef.current.error}
        initialFilterField={searchField}
        initialFilterValue={searchValue}
        onFilterChange={(field, value) => {
          setSearchField(field);
          setSearchValue(value);
        }}
      />

      {/* Modal de Período Personalizado */}
      <SimpleModal
        isOpen={showCustomPeriod}
        onClose={() => {
          setShowCustomPeriod(false);
        }}
      >
        <div style={{ display: 'grid', gap: '24px' }}>
          {/* Campos de Data com Design Melhorado */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#4a5568',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>📅</span> Data Inicial
              </label>
              <input
                type="date"
                value={customPeriod?.startDate || ''}
                onChange={(e) => setCustomPeriod(prev => ({ ...prev, startDate: e.target.value }))}
                style={{ 
                  padding: '12px 16px', 
                  borderRadius: '8px', 
                  border: '2px solid #e2e8f0', 
                  width: '100%',
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                  backgroundColor: '#fafbfc'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#4E5859';
                  e.target.style.backgroundColor = 'white';
                  e.target.style.boxShadow = '0 0 0 3px rgba(78, 88, 89, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.backgroundColor = '#fafbfc';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#4a5568',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>🏁</span> Data Final
              </label>
              <input
                type="date"
                value={customPeriod?.endDate || ''}
                onChange={(e) => setCustomPeriod(prev => ({ ...prev, endDate: e.target.value }))}
                style={{ 
                  padding: '12px 16px', 
                  borderRadius: '8px', 
                  border: '2px solid #e2e8f0', 
                  width: '100%',
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                  backgroundColor: '#fafbfc'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#4E5859';
                  e.target.style.backgroundColor = 'white';
                  e.target.style.boxShadow = '0 0 0 3px rgba(78, 88, 89, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.backgroundColor = '#fafbfc';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Preview do Período Selecionado */}
          {customPeriod?.startDate && customPeriod?.endDate && (
            <div style={{
              padding: '16px',
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#0369a1'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📊</span> Período Selecionado
              </div>
              <div>
                {new Date(customPeriod.startDate + 'T12:00:00').toLocaleDateString('pt-BR')} até {' '}
                {new Date(customPeriod.endDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                {' '}({Math.ceil((new Date(customPeriod.endDate + 'T12:00:00') - new Date(customPeriod.startDate + 'T12:00:00')) / (1000 * 60 * 60 * 24)) + 1} dias)
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '8px' }}>
            <button 
              onClick={() => setShowCustomPeriod(false)}
              style={{ 
                padding: '12px 24px', 
                backgroundColor: '#f7fafc', 
                color: '#4a5568',
                border: '2px solid #e2e8f0', 
                borderRadius: '8px', 
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#edf2f7';
                e.target.style.borderColor = '#cbd5e0';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#f7fafc';
                e.target.style.borderColor = '#e2e8f0';
              }}
            >
              Cancelar
            </button>
            <button 
              onClick={() => {
                if (!customPeriod?.startDate || !customPeriod?.endDate) {
                  alert('Por favor, selecione ambas as datas');
                  return;
                }
                
                const startDate = new Date(customPeriod.startDate + 'T12:00:00');
                const endDate = new Date(customPeriod.endDate + 'T12:00:00');
                
                if (endDate <= startDate) {
                  alert('Data final deve ser posterior à data inicial');
                  return;
                }
                
                applyCustomPeriod(customPeriod);
                setShowCustomPeriod(false);
              }}
              disabled={!customPeriod?.startDate || !customPeriod?.endDate}
              style={{ 
                padding: '12px 24px', 
                backgroundColor: "#4E5859", 
                color: 'white',
                border: 'none', 
                borderRadius: '8px', 
                cursor: (!customPeriod?.startDate || !customPeriod?.endDate) ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                if (customPeriod?.startDate && customPeriod?.endDate) {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(78, 88, 89, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <span>✓</span> Aplicar Período
            </button>
          </div>
        </div>
      </SimpleModal>

      {/* Indicador de Status Geral */}
      {(isLoading || isUpdating) && (
        <div className="global-status-indicator">
          <div className="status-content">
            <span className="status-text">
              {isLoading ? 'Carregando dados de vendas...' :
               isUpdating ? 'Atualizando...' : 'Carregando...'}
            </span>
          </div>
        </div>
      )}

    </div>
  );
};

export default DashboardSales;