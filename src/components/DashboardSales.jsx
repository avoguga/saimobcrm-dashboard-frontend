import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import * as echarts from 'echarts';
import Select from 'react-select';
import { KommoAPI } from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import SimpleModal from './SimpleModal';
import DetailModal from './common/DetailModal';
import { COLORS } from '../constants/colors';
import ExcelExporter from '../utils/excelExport';
import { flexibleSearch } from '../utils/textUtils';
import { getChartHeight, getChartConfigs } from '../constants/dashboardConfig';
import ComparisonMetricCard from './dashboard/sales/components/ComparisonMetricCard';
import TrendIndicator from './dashboard/sales/components/TrendIndicator';
import { useSalesData } from './dashboard/sales/hooks/useSalesData';
import { useAdvancedSearch } from './dashboard/sales/hooks/useAdvancedSearch';
import './Dashboard.css';
import './dashboard/sales/styles/SalesDashboard.css';

// Funções utilitárias para consolidar código duplicado
const getPeriodLabel = (period, customPeriod) => {
  if (period === 'current_month') return 'Mês Atual';
  if (period === 'previous_month') return 'Mês Anterior';
  if (period === 'year') return 'Anual';
  if (period === 'custom' && customPeriod?.startDate && customPeriod?.endDate) {
    return `${customPeriod.startDate} a ${customPeriod.endDate}`;
  }
  if (period === '7d') return '7 dias';
  return period;
};

// Função para formatar valores monetários no padrão brasileiro
const formatCurrency = (value) => {
  // Garantir que temos um número válido
  const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  
  // Usar o formatador nativo do JavaScript com locale pt-BR
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    // Não usar style: 'currency' porque já adicionamos R$ manualmente
  }).format(numValue);
};

// Função para converter string monetária brasileira para número
const parseBrazilianCurrency = (value) => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  // Converter para string se necessário
  let str = value.toString();
  
  // Remover R$, espaços e outros caracteres não numéricos (exceto vírgula e ponto)
  str = str.replace(/[R$\s]/g, '');
  
  // Remover pontos (separadores de milhares) 
  str = str.replace(/\./g, '');
  
  // Substituir vírgula (separador decimal) por ponto
  str = str.replace(',', '.');
  
  // Converter para número
  const num = parseFloat(str);
  
  // Retornar 0 se não for um número válido
  return isNaN(num) ? 0 : num;
};

const createDataMap = (tablesData) => ({
  'leads': [...(tablesData.leadsDetalhes || []), ...(tablesData.organicosDetalhes || [])],
  'reunioes': [...(tablesData.reunioesDetalhes || []), ...(tablesData.reunioesOrganicasDetalhes || [])],
  'propostas': tablesData.leadsDetalhes ? tablesData.leadsDetalhes
    .filter(lead => 
      lead['É Proposta'] === true || 
      lead['Etapa']?.toLowerCase().includes('proposta')
    )
    .map(lead => ({
      ...lead,
      'is_proposta': lead['É Proposta']
    })) : [],
  'vendas': tablesData.vendasDetalhes || []
});



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
  
  // Hooks customizados para gerenciar estado
  const salesDataHook = useSalesData(data);
  const searchHook = useAdvancedSearch();
  
  // Desestruturação para facilitar uso
  const { rawSalesData, salesData, comparisonData, setRawSalesData, setSalesData, setComparisonData, corretorOptions, sourceSelectOptions } = salesDataHook;
  const { searchField, searchValue, setSearchField, setSearchValue } = searchHook;



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
  const handleExportMeetings = async () => {
    try {
      // Usar dados cached se disponível, como faz o modal
      let tablesData;
      const currentData = data?._rawTablesData;
      
      if (currentData) {
        // Usar dados em cache para exportação instantânea
        tablesData = currentData;
      } else {
        // Fallback: fazer nova requisição se não tiver cache
        const extraParams = {
          period: period,
          ...(period === 'custom' && customPeriod?.startDate && customPeriod?.endDate && {
            startDate: customPeriod.startDate,
            endDate: customPeriod.endDate
          }),
          ...(filters.corretor && { corretor: filters.corretor }),
          ...(filters.source && { fonte: filters.source })
        };
        
        if (searchField && searchValue) {
          if (searchField === 'Corretor') {
            extraParams.corretor = searchValue;
          } else {
            extraParams[searchField.toLowerCase().replace(/\s+/g, '_')] = searchValue;
          }
        }

        tablesData = await KommoAPI.getDetailedTables('', '', extraParams);
      }
      
      const dataMap = createDataMap(tablesData);
      
      let modalData = dataMap['reunioes'];
      
      // Aplicar filtro de busca avançada se houver
      if (searchValue && searchField && searchField !== 'Corretor') {
        modalData = modalData.filter(item => {
          const fieldValue = item[searchField] || '';
          return fieldValue.toString().toLowerCase().includes(searchValue.toLowerCase());
        });
      }

      if (!modalData || modalData.length === 0) {
        alert('Não há dados de reuniões para exportar');
        return;
      }

      const exportFilters = {
        corretor: filters.corretor,
        fonte: filters.source,
        ...(searchField && searchValue && { [searchField]: searchValue })
      };

      const periodLabel = getPeriodLabel(period, customPeriod);

      const result = ExcelExporter.exportDetailedModalData(
        modalData,
        'reunioes',
        exportFilters,
        periodLabel
      );

      if (result.success) {
        alert(`Relatório de reuniões exportado com sucesso: ${result.fileName}`);
      } else {
        alert(`Erro ao exportar: ${result.error}`);
      }
    } catch (error) {
      console.error('Erro ao exportar reuniões:', error);
      alert(`Erro ao exportar reuniões: ${error.message}`);
    }
  };

  const handleExportSales = async () => {
    try {
      // Usar dados cached se disponível, como faz o modal
      let tablesData;
      const currentData = data?._rawTablesData;
      
      if (currentData) {
        // Usar dados em cache para exportação instantânea
        tablesData = currentData;
      } else {
        // Fallback: fazer nova requisição se não tiver cache
        const extraParams = {
          period: period,
          ...(period === 'custom' && customPeriod?.startDate && customPeriod?.endDate && {
            startDate: customPeriod.startDate,
            endDate: customPeriod.endDate
          }),
          ...(filters.corretor && { corretor: filters.corretor }),
          ...(filters.source && { fonte: filters.source })
        };
        
        if (searchField && searchValue) {
          if (searchField === 'Corretor') {
            extraParams.corretor = searchValue;
          } else {
            extraParams[searchField.toLowerCase().replace(/\s+/g, '_')] = searchValue;
          }
        }

        tablesData = await KommoAPI.getDetailedTables('', '', extraParams);
      }
      
      const dataMap = createDataMap(tablesData);
      
      let modalData = dataMap['vendas'];
      
      // Aplicar filtro de busca avançada se houver
      if (searchValue && searchField && searchField !== 'Corretor') {
        modalData = modalData.filter(item => {
          const fieldValue = item[searchField] || '';
          return fieldValue.toString().toLowerCase().includes(searchValue.toLowerCase());
        });
      }

      if (!modalData || modalData.length === 0) {
        alert('Não há dados de vendas para exportar');
        return;
      }

      const exportFilters = {
        corretor: filters.corretor,
        fonte: filters.source,
        ...(searchField && searchValue && { [searchField]: searchValue })
      };

      const periodLabel = getPeriodLabel(period, customPeriod);

      const result = ExcelExporter.exportDetailedModalData(
        modalData,
        'vendas',
        exportFilters,
        periodLabel
      );

      if (result.success) {
        alert(`Relatório de vendas exportado com sucesso: ${result.fileName}`);
      } else {
        alert(`Erro ao exportar: ${result.error}`);
      }
    } catch (error) {
      console.error('Erro ao exportar vendas:', error);
      alert(`Erro ao exportar vendas: ${error.message}`);
    }
  };

  const handleExportLeads = async () => {
    try {
      // Usar dados cached se disponível, como faz o modal
      let tablesData;
      const currentData = data?._rawTablesData;
      
      if (currentData) {
        // Usar dados em cache para exportação instantânea
        tablesData = currentData;
      } else {
        // Fallback: fazer nova requisição se não tiver cache
        const extraParams = {
          period: period,
          ...(period === 'custom' && customPeriod?.startDate && customPeriod?.endDate && {
            startDate: customPeriod.startDate,
            endDate: customPeriod.endDate
          }),
          ...(filters.corretor && { corretor: filters.corretor }),
          ...(filters.source && { fonte: filters.source })
        };
        
        if (searchField && searchValue) {
          if (searchField === 'Corretor') {
            extraParams.corretor = searchValue;
          } else {
            extraParams[searchField.toLowerCase().replace(/\s+/g, '_')] = searchValue;
          }
        }

        tablesData = await KommoAPI.getDetailedTables('', '', extraParams);
      }
      
      const dataMap = createDataMap(tablesData);
      
      let modalData = dataMap['leads'];
      
      // Aplicar filtro de busca avançada se houver
      if (searchValue && searchField && searchField !== 'Corretor') {
        modalData = modalData.filter(item => {
          const fieldValue = item[searchField] || '';
          return fieldValue.toString().toLowerCase().includes(searchValue.toLowerCase());
        });
      }

      if (!modalData || modalData.length === 0) {
        alert('Não há dados de leads para exportar');
        return;
      }

      const exportFilters = {
        corretor: filters.corretor,
        fonte: filters.source,
        ...(searchField && searchValue && { [searchField]: searchValue })
      };

      const periodLabel = getPeriodLabel(period, customPeriod);

      const result = ExcelExporter.exportDetailedModalData(
        modalData,
        'leads',
        exportFilters,
        periodLabel
      );

      if (result.success) {
        alert(`Relatório de leads exportado com sucesso: ${result.fileName}`);
      } else {
        alert(`Erro ao exportar: ${result.error}`);
      }
    } catch (error) {
      console.error('Erro ao exportar leads:', error);
      alert(`Erro ao exportar leads: ${error.message}`);
    }
  };
  
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


      // ✅ OTIMIZAÇÃO: SEMPRE usar dados já carregados e filtrar no frontend
      let tablesData;
      
      // Verificar se temos dados já carregados
      const currentData = salesData?._rawTablesData || data?._rawTablesData;
      
      if (currentData) {
        // SEMPRE usar dados carregados e filtrar pelo corretor no frontend
        const corretorFilter = corretorName === 'VAZIO' ? 'SA IMOB' : corretorName;
        
        // Aplicar filtro de corretor e fonte se houver
        const applyFilters = (items) => {
          let filtered = items?.filter(item => 
            item.Corretor === corretorFilter || item.Corretor === corretorName
          ) || [];
          
          // Aplicar filtro de fonte se estiver ativo
          if (filters.source && filters.source.trim() !== '') {
            const selectedSources = filters.source.split(',').map(s => s.trim()).filter(s => s);
            if (selectedSources.length > 0) {
              filtered = filtered.filter(item => {
                const itemFonte = item.fonte || item.Fonte || item.source || item.utm_source || '';
                return selectedSources.includes(itemFonte);
              });
            }
          }
          
          return filtered;
        };
        
        tablesData = {
          leadsDetalhes: applyFilters(currentData.leadsDetalhes),
          organicosDetalhes: applyFilters(currentData.organicosDetalhes),
          reunioesDetalhes: applyFilters(currentData.reunioesDetalhes),
          reunioesOrganicasDetalhes: applyFilters(currentData.reunioesOrganicasDetalhes),
          vendasDetalhes: applyFilters(currentData.vendasDetalhes),
          propostasDetalhes: applyFilters(currentData.propostasDetalhes)
        };
      } else {
        // Só fazer requisição se não temos dados carregados
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
      
      // Se é tipo propostas, filtrar dos leadsDetalhes
      if (type === 'propostas') {
        // Buscar propostas dos leadsDetalhes do backend
        if (tablesData.leadsDetalhes && tablesData.leadsDetalhes.length > 0) {
          modalData = tablesData.leadsDetalhes
            .filter(lead => 
              lead['É Proposta'] === true || 
              lead['Etapa']?.toLowerCase().includes('proposta')
            )
            .map(lead => ({
              ...lead,
              'is_proposta': lead['É Proposta'] // Mapear o campo para o formato esperado pelo modal
            }));
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
                }))
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


      // ✅ OTIMIZAÇÃO: SEMPRE reutilizar dados já carregados no dashboard
      // Os dados já foram carregados com os filtros de período corretos
      let tablesData;
      
      // Verificar se temos dados já carregados do dashboard
      const currentData = salesData?._rawTablesData || data?._rawTablesData;
      
      if (currentData) {
        // SEMPRE usar os dados já carregados - eles já estão com o período correto
        tablesData = currentData;
      } else {
        // Só fazer requisição se não temos dados carregados
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
        'propostas': tablesData.leadsDetalhes ? tablesData.leadsDetalhes
          .filter(lead => 
            lead['É Proposta'] === true || 
            lead['Etapa']?.toLowerCase().includes('proposta')
          )
          .map(lead => ({
            ...lead,
            'is_proposta': lead['É Proposta'] // Mapear o campo para o formato esperado pelo modal
          })) : getAllProposals(),
        'vendas': tablesData.vendasDetalhes || []
      };
      
      // Aplicar pré-filtro se houver filtro ativo no dashboard
      let modalData = dataMap[type];
      
      // Aplicar filtros de corretor se houver
      if (filters.corretor && filters.corretor.trim() !== '') {
        const selectedCorretores = filters.corretor.split(',').map(c => c.trim()).filter(c => c);
        if (selectedCorretores.length > 0) {
          modalData = modalData.filter(item => {
            const itemCorretor = item.Corretor || '';
            return selectedCorretores.some(corretor => 
              itemCorretor === corretor || 
              (corretor === 'VAZIO' && (itemCorretor === 'Vazio' || itemCorretor === 'SA IMOB')) ||
              (corretor === 'Vazio' && itemCorretor === 'SA IMOB')
            );
          });
        }
      }
      
      // Aplicar filtros de fonte se houver
      if (filters.source && filters.source.trim() !== '') {
        const selectedSources = filters.source.split(',').map(s => s.trim()).filter(s => s);
        if (selectedSources.length > 0) {
          modalData = modalData.filter(item => {
            const itemFonte = item.fonte || item.Fonte || item.source || item.utm_source || '';
            return selectedSources.includes(itemFonte);
          });
        }
      }
      
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
  // Configurações dos gráficos memoizadas para evitar hooks condicionais
  const chartConfigs = useMemo(() => getChartConfigs(COLORS), []);

  const chartStyle = useMemo(() => ({ height: getChartHeight('small', isMobile) }), [isMobile]);

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
    if (!salesData?._rawTablesData) {
      return {
        sortedLeadsData: [],
        sortedMeetingsData: [],
        sortedSalesData: []
      };
    }
    
    // Usar os mesmos dados que o modal usa para garantir consistência
    const tablesData = salesData._rawTablesData;
    
    // Buscar todos os leads da mesma forma que o modal
    let allLeads = [
      ...(tablesData.leadsDetalhes || []),
      ...(tablesData.organicosDetalhes || [])
    ];
    
    // Buscar todas as reuniões separadamente
    let allMeetings = [
      ...(tablesData.reunioesDetalhes || []),
      ...(tablesData.reunioesOrganicasDetalhes || [])
    ];
    
    // Buscar todas as vendas separadamente para calcular vendas corretas
    let allSales = [
      ...(tablesData.vendasDetalhes || [])
    ];
    
    // Aplicar filtros de corretor se houver
    if (filters.corretor && filters.corretor.trim() !== '') {
      const selectedCorretores = filters.corretor.split(',').map(c => c.trim()).filter(c => c);
      if (selectedCorretores.length > 0) {
        allLeads = allLeads.filter(lead => {
          const leadCorretor = lead.Corretor || '';
          return selectedCorretores.some(corretor => 
            leadCorretor === corretor || 
            (corretor === 'VAZIO' && (leadCorretor === 'Vazio' || leadCorretor === 'SA IMOB')) ||
            (corretor === 'Vazio' && leadCorretor === 'SA IMOB')
          );
        });
        
        allMeetings = allMeetings.filter(meeting => {
          const meetingCorretor = meeting.Corretor || '';
          return selectedCorretores.some(corretor => 
            meetingCorretor === corretor || 
            (corretor === 'VAZIO' && (meetingCorretor === 'Vazio' || meetingCorretor === 'SA IMOB')) ||
            (corretor === 'Vazio' && meetingCorretor === 'SA IMOB')
          );
        });
        
        allSales = allSales.filter(sale => {
          const saleCorretor = sale.Corretor || '';
          return selectedCorretores.some(corretor => 
            saleCorretor === corretor || 
            (corretor === 'VAZIO' && (saleCorretor === 'Vazio' || saleCorretor === 'SA IMOB')) ||
            (corretor === 'Vazio' && saleCorretor === 'SA IMOB')
          );
        });
      }
    }
    
    // Aplicar filtros de fonte se houver
    if (filters.source && filters.source.trim() !== '') {
      const selectedSources = filters.source.split(',').map(s => s.trim()).filter(s => s);
      if (selectedSources.length > 0) {
        allLeads = allLeads.filter(lead => {
          const leadFonte = lead.fonte || lead.Fonte || lead.source || lead.utm_source || '';
          return selectedSources.includes(leadFonte);
        });
        
        allMeetings = allMeetings.filter(meeting => {
          const meetingFonte = meeting.fonte || meeting.Fonte || meeting.source || meeting.utm_source || '';
          return selectedSources.includes(meetingFonte);
        });
        
        allSales = allSales.filter(sale => {
          const saleFonte = sale.fonte || sale.Fonte || sale.source || sale.utm_source || '';
          return selectedSources.includes(saleFonte);
        });
      }
    }
    
    // Aplicar filtros de busca avançada se houver
    if (searchValue && searchField && searchField !== 'Corretor') {
      allLeads = allLeads.filter(lead => {
        const fieldValue = lead[searchField] || '';
        return flexibleSearch(fieldValue, searchValue);
      });
      
      allMeetings = allMeetings.filter(meeting => {
        const fieldValue = meeting[searchField] || '';
        return flexibleSearch(fieldValue, searchValue);
      });
      
      allSales = allSales.filter(sale => {
        const fieldValue = sale[searchField] || '';
        return flexibleSearch(fieldValue, searchValue);
      });
    }
    
    // Se filtro de busca avançada é por Corretor, aplicar filtro específico
    if (searchValue && searchField === 'Corretor') {
      allLeads = allLeads.filter(lead => {
        const corretorName = lead.Corretor || '';
        return flexibleSearch(corretorName, searchValue);
      });
      
      allMeetings = allMeetings.filter(meeting => {
        const corretorName = meeting.Corretor || '';
        return flexibleSearch(corretorName, searchValue);
      });
      
      allSales = allSales.filter(sale => {
        const corretorName = sale.Corretor || '';
        return flexibleSearch(corretorName, searchValue);
      });
    }

    // Nova lógica: Agrupar por corretor e calcular métricas (mesma base de dados do modal)
    const corretorStats = {};
    
    // Processar leads
    allLeads.forEach(lead => {
      const corretorName = lead.Corretor === 'SA IMOB' ? 'Vazio' : (lead.Corretor || 'Desconhecido');
      
      if (!corretorStats[corretorName]) {
        corretorStats[corretorName] = {
          name: corretorName,
          value: 0, // total leads
          meetingsHeld: 0,
          proposalsHeld: 0,
          sales: 0
        };
      }
      
      corretorStats[corretorName].value++;
    });
    
    // Processar reuniões separadamente
    allMeetings.forEach(meeting => {
      const corretorName = meeting.Corretor === 'SA IMOB' ? 'Vazio' : (meeting.Corretor || 'Desconhecido');
      
      if (!corretorStats[corretorName]) {
        corretorStats[corretorName] = {
          name: corretorName,
          value: 0,
          meetingsHeld: 0,
          proposalsHeld: 0,
          sales: 0
        };
      }
      
      corretorStats[corretorName].meetingsHeld++;
    });
    
    // Processar propostas dos leads
    allLeads.forEach(lead => {
      const corretorName = lead.Corretor === 'SA IMOB' ? 'Vazio' : (lead.Corretor || 'Desconhecido');
      
      // Calcular propostas
      if (lead['É Proposta'] === true || lead.is_proposta === true || 
          (lead.Etapa && lead.Etapa.toLowerCase().includes('proposta'))) {
        if (!corretorStats[corretorName]) {
          corretorStats[corretorName] = {
            name: corretorName,
            value: 0,
            meetingsHeld: 0,
            proposalsHeld: 0,
            sales: 0
          };
        }
        corretorStats[corretorName].proposalsHeld++;
      }
    });
    
    // Processar vendas usando dados específicos de vendas
    allSales.forEach(sale => {
      const corretorName = sale.Corretor === 'SA IMOB' ? 'Vazio' : (sale.Corretor || 'Desconhecido');
      
      if (!corretorStats[corretorName]) {
        corretorStats[corretorName] = {
          name: corretorName,
          value: 0,
          meetingsHeld: 0,
          proposalsHeld: 0,
          sales: 0
        };
      }
      
      // Cada venda filtrada é uma venda válida
      corretorStats[corretorName].sales++;
    });
    
    // Converter para array
    const finalData = Object.values(corretorStats);

    // Usar nova lógica baseada nos mesmos dados do modal
    const sortedLeads = [...finalData].sort((a, b) => {
      const diff = Number(b.value || 0) - Number(a.value || 0);
      return diff !== 0 ? diff : (a.name || '').localeCompare(b.name || '');
    });
    
    const sortedMeetings = [...finalData].sort((a, b) => {
      const diff = Number(b.meetingsHeld || 0) - Number(a.meetingsHeld || 0);
      return diff !== 0 ? diff : (a.name || '').localeCompare(b.name || '');
    });
    
    const sortedSales = [...finalData].sort((a, b) => {
      const diff = Number(b.sales || 0) - Number(a.sales || 0);
      return diff !== 0 ? diff : (a.name || '').localeCompare(b.name || '');
    });

    return {
      sortedLeadsData: sortedLeads,
      sortedMeetingsData: sortedMeetings,
      sortedSalesData: sortedSales
    };
  }, [salesData?._rawTablesData, searchField, searchValue, filters.corretor, filters.source]);

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
                  R$ {formatCurrency((() => {
                    // Verificar se há algum filtro ativo (corretor, fonte ou busca avançada)
                    const hasCorretorFilter = filters.corretor && filters.corretor.trim() !== '';
                    const hasSourceFilter = filters.source && filters.source.trim() !== '';
                    const hasSearchFilter = searchValue && searchValue.trim() !== '';
                    const hasAnyFilter = hasCorretorFilter || hasSourceFilter || hasSearchFilter;
                    
                    if (hasAnyFilter) {
                      // Com filtro: calcular ticket médio baseado nas vendas filtradas
                      const rawData = salesData?._rawTablesData || data?._rawTablesData;
                      
                      // Buscar vendas detalhadas e aplicar TODOS os filtros
                      let vendasFiltradas = rawData?.vendasDetalhes || [];
                      
                      // Aplicar filtro de corretor se houver
                      if (hasCorretorFilter) {
                        const selectedCorretores = filters.corretor.split(',').map(c => c.trim()).filter(c => c);
                        vendasFiltradas = vendasFiltradas.filter(venda => {
                          const vendaCorretor = venda.Corretor || '';
                          return selectedCorretores.some(corretor => 
                            vendaCorretor === corretor || 
                            (corretor === 'VAZIO' && (vendaCorretor === 'Vazio' || vendaCorretor === 'SA IMOB')) ||
                            (corretor === 'Vazio' && vendaCorretor === 'SA IMOB')
                          );
                        });
                      }
                      
                      // Aplicar filtro de fonte se houver
                      if (hasSourceFilter) {
                        const selectedSources = filters.source.split(',').map(s => s.trim()).filter(s => s);
                        vendasFiltradas = vendasFiltradas.filter(venda => {
                          const vendaFonte = venda.fonte || venda.Fonte || venda.source || venda.utm_source || '';
                          return selectedSources.includes(vendaFonte);
                        });
                      }
                      
                      // Aplicar filtro de busca avançada se houver
                      if (hasSearchFilter && searchField) {
                        vendasFiltradas = vendasFiltradas.filter(venda => {
                          const fieldValue = venda[searchField] || '';
                          return flexibleSearch(fieldValue, searchValue);
                        });
                      }
                      
                      // Calcular receita total das vendas filtradas
                      const receitaFiltrada = vendasFiltradas.reduce((sum, venda) => {
                        const valor = venda['Valor da Venda'] || venda.valor || venda.ValorVenda || 0;
                        return sum + parseBrazilianCurrency(valor);
                      }, 0);
                      
                      // Calcular número de vendas filtradas
                      const numeroVendasFiltradas = vendasFiltradas.length;
                      
                      // Calcular ticket médio
                      return numeroVendasFiltradas > 0 ? receitaFiltrada / numeroVendasFiltradas : 0;
                    } else {
                      // Sem filtro: usar dados do summary
                      const rawData = salesData?._rawTablesData || data?._rawTablesData;
                      const totalRevenue = rawData?.summary?.valor_total_vendas || salesData?.kpis?.sales?.total_revenue || 0;
                      const totalSales = rawData?.summary?.total_vendas || salesData?.kpis?.sales?.total || 0;
                      return totalSales > 0 ? totalRevenue / totalSales : 0;
                    }
                  })())}
                </div>
                <TrendIndicator value={(() => {
                  // Mesma lógica de filtros do valor principal
                  const hasCorretorFilter = filters.corretor && filters.corretor.trim() !== '';
                  const hasSourceFilter = filters.source && filters.source.trim() !== '';
                  const hasSearchFilter = searchValue && searchValue.trim() !== '';
                  const hasAnyFilter = hasCorretorFilter || hasSourceFilter || hasSearchFilter;
                  
                  let current;
                  const rawData = salesData?._rawTablesData || data?._rawTablesData;
                  
                  if (hasAnyFilter) {
                    // Com filtro: calcular ticket médio baseado nas vendas filtradas
                    let vendasFiltradas = rawData?.vendasDetalhes || [];
                    
                    // Aplicar filtro de corretor se houver
                    if (hasCorretorFilter) {
                      const selectedCorretores = filters.corretor.split(',').map(c => c.trim()).filter(c => c);
                      vendasFiltradas = vendasFiltradas.filter(venda => {
                        const vendaCorretor = venda.Corretor || '';
                        return selectedCorretores.some(corretor => 
                          vendaCorretor === corretor || 
                          (corretor === 'VAZIO' && (vendaCorretor === 'Vazio' || vendaCorretor === 'SA IMOB')) ||
                          (corretor === 'Vazio' && vendaCorretor === 'SA IMOB')
                        );
                      });
                    }
                    
                    // Aplicar filtro de fonte se houver
                    if (hasSourceFilter) {
                      const selectedSources = filters.source.split(',').map(s => s.trim()).filter(s => s);
                      vendasFiltradas = vendasFiltradas.filter(venda => {
                        const vendaFonte = venda.fonte || venda.Fonte || venda.source || venda.utm_source || '';
                        return selectedSources.includes(vendaFonte);
                      });
                    }
                    
                    // Aplicar filtro de busca avançada se houver
                    if (hasSearchFilter && searchField) {
                      vendasFiltradas = vendasFiltradas.filter(venda => {
                        const fieldValue = venda[searchField] || '';
                        return flexibleSearch(fieldValue, searchValue);
                      });
                    }
                    
                    // Calcular receita total das vendas filtradas
                    const receitaFiltrada = vendasFiltradas.reduce((sum, venda) => {
                      const valor = venda['Valor da Venda'] || venda.valor || venda.ValorVenda || 0;
                      return sum + parseBrazilianCurrency(valor);
                    }, 0);
                    
                    // Calcular número de vendas filtradas
                    const numeroVendasFiltradas = vendasFiltradas.length;
                    
                    // Calcular ticket médio atual
                    current = numeroVendasFiltradas > 0 ? receitaFiltrada / numeroVendasFiltradas : 0;
                  } else {
                    // Sem filtro: usar dados do summary
                    const totalRevenue = rawData?.summary?.valor_total_vendas || 0;
                    const totalSales = rawData?.summary?.total_vendas || 0;
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
                  R$ {formatCurrency((() => {
                    // Verificar se há algum filtro ativo (corretor, fonte ou busca avançada)
                    const hasCorretorFilter = filters.corretor && filters.corretor.trim() !== '';
                    const hasSourceFilter = filters.source && filters.source.trim() !== '';
                    const hasSearchFilter = searchValue && searchValue.trim() !== '';
                    const hasAnyFilter = hasCorretorFilter || hasSourceFilter || hasSearchFilter;
                    
                    const rawData = salesData?._rawTablesData || data?._rawTablesData;
                    
                    if (hasAnyFilter) {
                      // Com filtro: calcular receita total das vendas filtradas
                      let vendasFiltradas = rawData?.vendasDetalhes || [];
                      
                      // Aplicar filtro de corretor se houver
                      if (hasCorretorFilter) {
                        const selectedCorretores = filters.corretor.split(',').map(c => c.trim()).filter(c => c);
                        vendasFiltradas = vendasFiltradas.filter(venda => {
                          const vendaCorretor = venda.Corretor || '';
                          return selectedCorretores.some(corretor => 
                            vendaCorretor === corretor || 
                            (corretor === 'VAZIO' && (vendaCorretor === 'Vazio' || vendaCorretor === 'SA IMOB')) ||
                            (corretor === 'Vazio' && vendaCorretor === 'SA IMOB')
                          );
                        });
                      }
                      
                      // Aplicar filtro de fonte se houver
                      if (hasSourceFilter) {
                        const selectedSources = filters.source.split(',').map(s => s.trim()).filter(s => s);
                        vendasFiltradas = vendasFiltradas.filter(venda => {
                          const vendaFonte = venda.fonte || venda.Fonte || venda.source || venda.utm_source || '';
                          return selectedSources.includes(vendaFonte);
                        });
                      }
                      
                      // Aplicar filtro de busca avançada se houver
                      if (hasSearchFilter && searchField) {
                        vendasFiltradas = vendasFiltradas.filter(venda => {
                          const fieldValue = venda[searchField] || '';
                          return flexibleSearch(fieldValue, searchValue);
                        });
                      }
                      
                      // Calcular receita total das vendas filtradas
                      return vendasFiltradas.reduce((sum, venda) => {
                        const valor = venda['Valor da Venda'] || venda.valor || venda.ValorVenda || 0;
                        return sum + parseBrazilianCurrency(valor);
                      }, 0);
                    } else {
                      // Sem filtro: usar valor total do summary
                      const totalRevenue = rawData?.summary?.valor_total_vendas || 0;
                      return totalRevenue;
                    }
                  })())}
                </div>
                <TrendIndicator value={(() => {
                  // Mesma lógica de filtros do valor principal
                  const hasCorretorFilter = filters.corretor && filters.corretor.trim() !== '';
                  const hasSourceFilter = filters.source && filters.source.trim() !== '';
                  const hasSearchFilter = searchValue && searchValue.trim() !== '';
                  const hasAnyFilter = hasCorretorFilter || hasSourceFilter || hasSearchFilter;
                  
                  const rawData = salesData?._rawTablesData || data?._rawTablesData;
                  
                  let current;
                  if (hasAnyFilter) {
                    // Com filtro: calcular receita total das vendas filtradas
                    let vendasFiltradas = rawData?.vendasDetalhes || [];
                    
                    // Aplicar filtro de corretor se houver
                    if (hasCorretorFilter) {
                      const selectedCorretores = filters.corretor.split(',').map(c => c.trim()).filter(c => c);
                      vendasFiltradas = vendasFiltradas.filter(venda => {
                        const vendaCorretor = venda.Corretor || '';
                        return selectedCorretores.some(corretor => 
                          vendaCorretor === corretor || 
                          (corretor === 'VAZIO' && (vendaCorretor === 'Vazio' || vendaCorretor === 'SA IMOB')) ||
                          (corretor === 'Vazio' && vendaCorretor === 'SA IMOB')
                        );
                      });
                    }
                    
                    // Aplicar filtro de fonte se houver
                    if (hasSourceFilter) {
                      const selectedSources = filters.source.split(',').map(s => s.trim()).filter(s => s);
                      vendasFiltradas = vendasFiltradas.filter(venda => {
                        const vendaFonte = venda.fonte || venda.Fonte || venda.source || venda.utm_source || '';
                        return selectedSources.includes(vendaFonte);
                      });
                    }
                    
                    // Aplicar filtro de busca avançada se houver
                    if (hasSearchFilter && searchField) {
                      vendasFiltradas = vendasFiltradas.filter(venda => {
                        const fieldValue = venda[searchField] || '';
                        return flexibleSearch(fieldValue, searchValue);
                      });
                    }
                    
                    // Calcular receita total das vendas filtradas
                    current = vendasFiltradas.reduce((sum, venda) => {
                      const valor = venda['Valor da Venda'] || venda.valor || venda.ValorVenda || 0;
                      return sum + parseBrazilianCurrency(valor);
                    }, 0);
                  } else {
                    // Sem filtro: usar valor total
                    current = rawData?.summary?.valor_total_vendas || 0;
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
        {sortedChartsData.sortedLeadsData.length > 0 ? (
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