import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import * as echarts from 'echarts';
import { KommoAPI } from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import SimpleModal from './SimpleModal';
import DetailModal from './common/DetailModal';
import MultiSelectFilter from './common/MultiSelectFilter';
import { COLORS } from '../constants/colors';
import ExcelExporter from '../utils/excelExport';
import './Dashboard.css';

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


const DashboardSales = ({ period, setPeriod, windowSize, corretores, selectedCorretor, setSelectedCorretor, selectedSource, setSelectedSource, pendingCorretor, setPendingCorretor, pendingSource, setPendingSource, applyFilters, hasPendingFilters, sourceOptions, data, isLoading, isUpdating, customPeriod, setCustomPeriod, showCustomPeriod, setShowCustomPeriod, handlePeriodChange, applyCustomPeriod }) => {
  
  const [rawSalesData, setRawSalesData] = useState(data); // Dados originais sem filtro

  // Funções de exportação Excel
  const handleExportMeetings = () => {
    if (!salesData?.leadsByUser || salesData.leadsByUser.length === 0) {
      alert('Não há dados de reuniões para exportar');
      return;
    }

    const filters = {
      corretor: selectedCorretor,
      fonte: selectedSource
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
      filters,
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

    const filters = {
      corretor: selectedCorretor,
      fonte: selectedSource
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
      filters,
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

    const filters = {
      corretor: selectedCorretor,
      fonte: selectedSource
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
      filters,
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

      // DEBUG: Log para verificar parâmetros enviados
      console.log('🔍 Detail Table API Params:', {
        period,
        corretorName,
        selectedSource,
        extraParams,
        fullUrl: `/dashboard/detailed-tables?${new URLSearchParams({
          corretor: corretorName || '',
          fonte: selectedSource || '',
          ...extraParams
        }).toString()}`
      });

      // Usar o corretor específico clicado e o filtro de fonte selecionado
      const tablesData = await KommoAPI.getDetailedTables(corretorName, selectedSource || '', extraParams);
      
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

      const dataMap = {
        'leads': getFilteredData(),
        'reunioes': getFilteredData(),
        'propostas': tablesData.propostasDetalhes || [],
        'vendas': tablesData.vendasDetalhes || []
      };

      modalStateRef.current = {
        ...modalStateRef.current,
        isLoading: false,
        data: dataMap[type]
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

      // DEBUG: Log para verificar parâmetros enviados
      console.log('🔍 Detail Table API Params (General):', {
        period,
        type,
        extraParams,
        fullUrl: `/dashboard/detailed-tables?${new URLSearchParams(extraParams).toString()}`
      });

      // Buscar dados sem filtros de backend (filtragem será feita no frontend)
      const tablesData = await KommoAPI.getDetailedTables('', '', extraParams);
      
      const dataMap = {
        'leads': [...(tablesData.leadsDetalhes || []), ...(tablesData.organicosDetalhes || [])],
        'reunioes': tablesData.reunioesDetalhes || [],
        'propostas': tablesData.propostasDetalhes || [],
        'vendas': tablesData.vendasDetalhes || []
      };

      modalStateRef.current = {
        ...modalStateRef.current,
        isLoading: false,
        data: dataMap[type]
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
      const leadsData = salesData.analyticsTeam.user_performance
        .map(user => ({
          name: user.user_name,
          value: user.new_leads || 0
        }))
        .sort((a, b) => b.value - a.value); // Ordenar decrescente

      const activitiesData = salesData.analyticsTeam.user_performance
        .map(user => ({
          name: user.user_name,
          value: user.activities || 0
        }))
        .sort((a, b) => b.value - a.value); // Ordenar decrescente

      const wonDealsData = salesData.analyticsTeam.user_performance
        .map(user => ({
          name: user.user_name,
          value: user.won_deals || 0
        }))
        .sort((a, b) => b.value - a.value); // Ordenar decrescente

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
      
      return users.filter(user => {
        // Se o campo de busca é "Corretor", buscar pelo nome do corretor
        if (searchField === 'Corretor') {
          const corretorName = user.name || '';
          return corretorName.toLowerCase().includes(searchValue.toLowerCase().trim());
        }
        
        // Para outros campos, buscar nos leads individuais
        // Se não tem leads individuais, manter na lista (pode ser dados antigos)
        if (!user.leads || !Array.isArray(user.leads) || user.leads.length === 0) {
          return true; // Manter usuários sem leads individuais
        }
        
        // Verificar se algum lead individual tem o valor buscado
        return user.leads.some(lead => {
          let fieldValue = '';
          
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
              fieldValue = lead.publico || lead.audience || lead.publicoAlvo || lead.target_audience || '';
              break;
            case 'Produto':
              fieldValue = lead.produto || lead.product || lead.empreendimento || '';
              break;
            case 'Funil':
              fieldValue = lead.funil || lead.funnel || lead.pipeline || lead.pipeline_name || '';
              break;
            case 'Etapa':
              fieldValue = lead.etapa || lead.stage || lead.status || lead.stage_name || '';
              break;
            default:
              fieldValue = lead.leadName || lead.name || lead.client_name || '';
          }
          
          return fieldValue.toLowerCase().includes(searchValue.toLowerCase().trim());
        });
      });
    };

    // Debug temporário para diagnosticar o problema
    const originalData = [...salesData.leadsByUser].filter(user => user.name !== 'SA IMOB');
    const filteredData = filterByAdvancedSearch(originalData);
    
    console.log('🔍 DEBUG Leads Data:');
    console.log('Original data:', originalData);
    console.log('Filtered data:', filteredData);
    console.log('SearchValue:', searchValue);
    console.log('SearchField:', searchField);
    console.log('Original count:', originalData.length);
    console.log('Filtered count:', filteredData.length);
    console.log('Original total leads:', originalData.reduce((sum, user) => sum + (user.value || 0), 0));
    console.log('Filtered total leads:', filteredData.reduce((sum, user) => sum + (user.value || 0), 0));

    return {
      // Ordenar por total de leads (value) - decrescente
      // Filtrar corretores válidos e por busca avançada
      sortedLeadsData: filteredData.sort((a, b) => (b.value || 0) - (a.value || 0)),
        
      // Ordenar por reuniões - decrescente  
      // Usar os mesmos dados filtrados para consistência
      sortedMeetingsData: filteredData
        .map(user => ({
          ...user,
          meetingsHeld: user.meetingsHeld || user.meetings || 0
        }))
        .sort((a, b) => (b.meetingsHeld || 0) - (a.meetingsHeld || 0)),
        
      // Ordenar por vendas - decrescente
      // Usar os mesmos dados filtrados para consistência
      sortedSalesData: filteredData
        .sort((a, b) => (b.sales || 0) - (a.sales || 0))
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
            console.log('🎯 Clique na barra:', params);
            console.log('🎯 Nome do corretor:', params.name);
            console.log('🎯 Série clicada:', params.seriesName);
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
        updateOption = {
          xAxis: {
            data: data.map(item => item[config.xKey])
          },
          series: [{
            name: config.name || 'Data', // Use name for navigation
            data: data.map(item => item[config.yKey]),
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

        /* Estilos para MultiSelectFilter */
        .multi-select-container {
          display: flex;
          gap: 4px;
          position: relative;
          min-width: 200px;
          flex: 1;
          max-width: 250px;
          align-items: center;
        }

        .multi-select-wrapper {
          position: relative;
        }

        .multi-select-button {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 10px 12px;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          color: #2d3748;
          cursor: pointer;
          transition: all 0.2s ease;
          min-height: 42px;
          height: 42px;
        }

        .multi-select-button:hover {
          border-color: #4E5859;
          box-shadow: 0 0 0 1px rgba(78, 88, 89, 0.1);
        }

        .multi-select-button:focus {
          outline: none;
          border-color: #4E5859;
          box-shadow: 0 0 0 3px rgba(78, 88, 89, 0.1);
        }

        .multi-select-text {
          flex: 1;
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .multi-select-arrow {
          margin-left: 8px;
          font-size: 12px;
          transition: transform 0.2s ease;
          transform-origin: center;
        }

        .multi-select-arrow.open {
          transform: rotate(180deg);
        }

        .multi-select-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          max-height: 250px;
          overflow-y: auto;
          margin-top: 2px;
        }

        .multi-select-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          cursor: pointer;
          transition: background-color 0.15s ease;
          font-size: 14px;
        }

        .multi-select-option:hover {
          background-color: #f7fafc;
        }

        .multi-select-option.selected {
          background-color: rgba(78, 88, 89, 0.1);
          color: #4E5859;
          font-weight: 500;
        }

        .multi-select-option.select-all {
          background-color: #f8f9fa;
          font-weight: 600;
          color: #4E5859;
          border-bottom: 1px solid #e2e8f0;
        }

        .multi-select-option.select-all:hover {
          background-color: #e9ecef;
        }

        .multi-select-divider {
          height: 1px;
          background-color: #e2e8f0;
          margin: 0;
        }

        .multi-select-option input[type="checkbox"] {
          margin: 0;
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .multi-select-option span {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Responsividade para MultiSelectFilter */
        @media (max-width: 768px) {
          .multi-select-container {
            min-width: 150px;
          }
          
          .multi-select-button {
            padding: 8px 10px;
            font-size: 13px;
            min-height: 38px;
          }
          
          .multi-select-option {
            padding: 8px 10px;
            font-size: 13px;
          }
          
          .multi-select-dropdown {
            max-height: 200px;
          }
        }

        @media (max-width: 480px) {
          .filters-group {
            flex-direction: column;
            gap: 12px;
          }
          
          .multi-select-container {
            min-width: unset;
          }
        }

        /* Estilos para filtro de busca avançada */
        .advanced-search-filter {
          display: flex;
          gap: 4px;
          align-items: center;
          min-width: 300px;
          flex: 1;
          max-width: 400px;
        }

        .search-field-selector {
          flex-shrink: 0;
        }

        .search-field-select {
          padding: 10px 12px;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 8px 0 0 8px;
          font-size: 14px;
          color: #2d3748;
          transition: all 0.2s ease;
          min-height: 42px;
          height: 42px;
          box-sizing: border-box;
          outline: none;
          border-right: 1px solid #e2e8f0;
          min-width: 100px;
        }

        .search-field-select:hover,
        .search-field-select:focus {
          border-color: #4E5859;
          box-shadow: 0 0 0 1px rgba(78, 88, 89, 0.1);
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
          border: 2px solid #e2e8f0;
          border-radius: 0 8px 8px 0;
          border-left: none;
          font-size: 14px;
          color: #2d3748;
          transition: all 0.2s ease;
          min-height: 42px;
          height: 42px;
          box-sizing: border-box;
          outline: none;
        }

        .search-value-input:hover,
        .search-value-input:focus {
          border-color: #4E5859;
          box-shadow: 0 0 0 1px rgba(78, 88, 89, 0.1);
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
            min-width: 80px;
          }
        }

        @media (max-width: 480px) {
          .advanced-search-filter {
            min-width: unset;
            max-width: none;
            flex-direction: column;
            gap: 8px;
          }
          
          .search-field-select {
            border-radius: 8px;
            border-right: 2px solid #e2e8f0;
            width: 100%;
          }
          
          .search-value-input {
            border-radius: 8px;
            border-left: 2px solid #e2e8f0;
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

        /* Responsividade para indicador de filtros */
        @media (max-width: 768px) {
          .filters-group {
            width: 100%;
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }
          
          .multi-select-container {
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
              <MultiSelectFilter 
                label="Corretor"
                options={corretores.map(corretor => ({
                  value: corretor.name,
                  label: corretor.name
                }))}
                selectedValues={pendingCorretor ? (pendingCorretor.includes(',') ? pendingCorretor.split(',') : [pendingCorretor]) : []}
                onChange={(values) => setPendingCorretor(values.length === 0 ? '' : values.join(','))}
                placeholder="Todos os Corretores"
              />
              
              <MultiSelectFilter 
                label="Fonte"
                options={sourceOptions}
                selectedValues={pendingSource ? (pendingSource.includes(',') ? pendingSource.split(',') : [pendingSource]) : []}
                onChange={(values) => setPendingSource(values.length === 0 ? '' : values.join(','))}
                placeholder="Todas as Fontes"
              />

              {/* Filtro de busca avançada */}
              <div className="advanced-search-filter">
                <div className="search-field-selector">
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
                </div>
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

              {/* Botão para aplicar filtros */}
              {hasPendingFilters() && (
                <button 
                  className="apply-filters-btn"
                  onClick={applyFilters}
                  disabled={isUpdating}
                  title="Aplicar filtros selecionados"
                >
                  {isUpdating ? 'Aplicando...' : 'Aplicar Filtros'}
                </button>
              )}

              {/* Indicador de filtros ativos */}
              {(selectedCorretor || selectedSource) && (
                <div className="filter-indicator">
                  <span className="filter-icon">🔍</span>
                  <span className="filter-text">Filtros Ativos</span>
                  <button 
                    className="clear-filters-btn"
                    onClick={() => {
                      setSelectedCorretor('');
                      setSelectedSource('');
                      setPendingCorretor('');
                      setPendingSource('');
                    }}
                    title="Limpar todos os filtros"
                  >
                    ×
                  </button>
                </div>
              )}
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
                  {salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.meetingsHeld || 0), 0) : 0}
                </div>
                <TrendIndicator value={(() => {
                  const current = salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.meetingsHeld || 0), 0) : 0;
                  const previous = comparisonData?.previousPeriod?.totalMeetings || 0;
                  return previous > 0 ? ((current - previous) / previous) * 100 : 0;
                })()} />
              </div>
              <div className="mini-metric-title">REUNIÕES REALIZADAS</div>
              <div className="mini-metric-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#000000', fontWeight: '600' }}>
                  {(() => {
                    const totalMeetings = salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.meetingsHeld || 0), 0) : 0;
                    const totalLeads = salesData.totalLeads || 0;
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
                  {salesData?.totalProposals || (salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.proposalsHeld || 0), 0) : 0)}
                </div>
                <TrendIndicator value={(() => {
                  const current = salesData?.totalProposals || (salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.proposalsHeld || 0), 0) : 0);
                  const previous = comparisonData?.previousPeriod?.totalProposals || 0;
                  return previous > 0 ? ((current - previous) / previous) * 100 : 0;
                })()} />
              </div>
              <div className="mini-metric-title">PROPOSTAS REALIZADAS</div>
              <div className="mini-metric-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#000000', fontWeight: '600' }}>
                  {(() => {
                    const totalProposals = salesData?.totalProposals || (salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.proposalsHeld || 0), 0) : 0);
                    const totalMeetings = salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.meetingsHeld || 0), 0) : 0;
                    const conversionRate = totalMeetings > 0 ? (totalProposals / totalMeetings) * 100 : 0;
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
                  {salesData?.wonLeads || (salesData?.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.sales || 0), 0) : 0)}
                </div>
                <TrendIndicator value={(() => {
                  const current = salesData?.wonLeads || (salesData?.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.sales || 0), 0) : 0);
                  const previous = comparisonData?.previousPeriod?.totalSales || salesData?.previousWonLeads || 0;
                  return previous > 0 ? ((current - previous) / previous) * 100 : 0;
                })()} />
              </div>
              <div className="mini-metric-title">VENDAS REALIZADAS</div>
              <div className="mini-metric-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#000000', fontWeight: '600' }}>
                  {(() => {
                    const totalSales = salesData?.wonLeads || (salesData?.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.sales || 0), 0) : 0);
                    const totalProposals = salesData?.proposalStats?.total || 0;
                    const conversionRate = totalProposals > 0 ? (totalSales / totalProposals) * 100 : 0;
                    return conversionRate.toFixed(1);
                  })()}%
                </span>
                <span>TAXA CONV.</span>
              </div>
            </div>
            <div className="mini-metric-card">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className="mini-metric-value" style={{ color: '#374151' }}>
                  R$ {(salesData?.averageDealSize || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <TrendIndicator value={(() => {
                  const current = salesData?.averageDealSize || 0;
                  const previous = comparisonData?.previousPeriod?.averageDealSize || salesData?.previousAverageDealSize || 0;
                  return previous > 0 ? ((current - previous) / previous) * 100 : 0;
                })()} />
              </div>
              <div className="mini-metric-title">TICKET MÉDIO</div>
            </div>
            <div className="mini-metric-card">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className="mini-metric-value" style={{ color: '#374151' }}>
                  R$ {(salesData?.totalRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <TrendIndicator value={(() => {
                  const current = salesData?.totalRevenue || 0;
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
        {salesData?.leadsByUser && salesData.leadsByUser.length > 0 ? (
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
              <div className="card-title">Rank Corretores - Reunião</div>
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
              {salesData?.totalLeads > 0 ? (
                <>
                  <p>Foram encontrados {salesData.totalLeads} leads com as fontes selecionadas: <strong>{selectedSource}</strong></p>
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