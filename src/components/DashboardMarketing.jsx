import { useState, useEffect, useRef, memo } from 'react';
import * as echarts from 'echarts';
import LoadingSpinner from './LoadingSpinner';
import GranularAPI from '../services/granularAPI';
import './Dashboard.css';

// Paleta de cores da SA IMOB
const COLORS = {
  primary: '#4E5859',
  secondary: '#96856F',
  tertiary: '#75777B',
  dark: '#212121',
  light: '#C1C5C9',
  white: '#FFFFFF',
  success: '#4ce0b3',
  warning: '#ffaa5b',
  danger: '#ff3a5e',
  lightBg: '#f8f9fa'
};

// Multi-select filter component
const MultiSelectFilter = ({ label, options, selectedValues, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggleOption = (value) => {
    const newSelectedValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    
    onChange(newSelectedValues);
  };

  const handleSelectAll = () => {
    if (selectedValues.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map(option => option.value));
    }
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length === 1) {
      const option = options.find(opt => opt.value === selectedValues[0]);
      return option?.label || selectedValues[0];
    }
    return `${selectedValues.length} selecionados`;
  };

  return (
    <div className="filter-container">
      <label className="filter-label">{label}:</label>
      <div className="multi-select-wrapper">
        <button
          type="button"
          className="multi-select-button"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="multi-select-text">{getDisplayText()}</span>
          <span className={`multi-select-arrow ${isOpen ? 'open' : ''}`}>▼</span>
        </button>

        {isOpen && (
          <div className="multi-select-dropdown">
            <div className="multi-select-option select-all" onClick={handleSelectAll}>
              <input
                type="checkbox"
                checked={selectedValues.length === options.length}
                readOnly
              />
              <span>Selecionar Todos</span>
            </div>
            <div className="multi-select-divider"></div>
            {options.map((option) => (
              <div
                key={option.value}
                className={`multi-select-option ${selectedValues.includes(option.value) ? 'selected' : ''}`}
                onClick={() => handleToggleOption(option.value)}
              >
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option.value)}
                  readOnly
                />
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function DashboardMarketing({ period, setPeriod, windowSize, selectedSource, setSelectedSource, sourceOptions, data, salesData, salesData, isLoading, isUpdating, customPeriod, setCustomPeriod, showCustomPeriod, setShowCustomPeriod, handlePeriodChange, applyCustomPeriod, onDataRefresh }) {
  const [marketingData, setMarketingData] = useState(data);
  const [filteredData, setFilteredData] = useState(data);
  
  // Estados para filtros de campanhas Facebook
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState([]);
  const [campaignFilters, setCampaignFilters] = useState({
    campaignIds: [],
    status: [],
    objective: [],
    searchTerm: ''
  });
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [showCampaignFilter, setShowCampaignFilter] = useState(false);
  const [campaignInsights, setCampaignInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Constantes de responsividade
  const isMobile = windowSize.width < 768;
  const isSmallMobile = windowSize.width < 480;

  // Usar dados que vêm do componente pai (Dashboard.jsx)
  useEffect(() => {
    if (data && data.facebookCampaigns) {
      setCampaigns(data.facebookCampaigns);
      
      // Selecionar TODAS as campanhas por padrão
      const allCampaignIds = data.facebookCampaigns.map(campaign => campaign.id);
      setSelectedCampaigns(allCampaignIds);
      
      setCampaignFilters({
        campaignIds: allCampaignIds,
        status: [],
        objective: [],
        searchTerm: ''
      });
      
      // Mostrar filtro de campanhas sempre que houver campanhas
      setShowCampaignFilter(true);
    }
    
    if (data && data.campaignInsights) {
      setCampaignInsights(data.campaignInsights);
    }
  }, [data]);

  // Effect para fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Atualizar dados quando recebidos do cache
  useEffect(() => {
    if (data) {
      setMarketingData(data);
      setFilteredData(data);
    }
  }, [data]);

  // Effect para atualizar insights quando o período muda (se há campanhas selecionadas)
  useEffect(() => {
    // Só executar se há campanhas selecionadas e o período mudou
    if (selectedCampaigns.length > 0 && period) {
      console.log('📅 Período mudou, atualizando insights das campanhas selecionadas:', { 
        period, 
        customPeriod, 
        selectedCampaigns: selectedCampaigns.length 
      });
      
      // Função assíncrona para atualizar insights sem mostrar loading
      const updateInsightsSilently = async () => {
        try {
          // Preparar range de datas baseado no período selecionado
          let dateRange;
          if (period === 'custom' && customPeriod.startDate && customPeriod.endDate) {
            dateRange = { start: customPeriod.startDate, end: customPeriod.endDate };
          } else {
            // Calcular datas baseado no período
            const endDate = new Date();
            const startDate = new Date();
            
            switch (period) {
              case '7d':
                startDate.setDate(endDate.getDate() - 7);
                break;
              case '30d':
                startDate.setDate(endDate.getDate() - 30);
                break;
              case '60d':
                startDate.setDate(endDate.getDate() - 60);
                break;
              case '90d':
                startDate.setDate(endDate.getDate() - 90);
                break;
              default:
                startDate.setDate(endDate.getDate() - 30);
            }
            
            dateRange = {
              start: startDate.toISOString().split('T')[0],
              end: endDate.toISOString().split('T')[0]
            };
          }
          
          // Carregar insights sem mostrar loading (similar ao auto-refresh)
          const insights = await GranularAPI.getFacebookCampaignInsights(selectedCampaigns, dateRange);
          setCampaignInsights(insights);
          console.log('✅ Insights de campanhas atualizados silenciosamente:', insights);
        } catch (error) {
          console.error('Erro ao atualizar insights de campanhas:', error);
        }
      };
      
      updateInsightsSilently();
    }
  }, [period, customPeriod?.startDate, customPeriod?.endDate]); // Monitorar mudanças no período

  // Effect para atualizar insights quando o período muda (se há campanhas selecionadas)
  useEffect(() => {
    // Só executar se há campanhas selecionadas e o período mudou
    if (selectedCampaigns.length > 0 && period) {
      // Função assíncrona para atualizar insights sem mostrar loading
      const updateInsightsSilently = async () => {
        try {
          // Preparar range de datas baseado no período selecionado
          let dateRange;
          if (period === 'current_month') {
            const today = new Date();
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            dateRange = {
              start: firstDayOfMonth.toISOString().split('T')[0],
              end: today.toISOString().split('T')[0]
            };
          } else if (period === 'custom' && customPeriod.startDate && customPeriod.endDate) {
            dateRange = { start: customPeriod.startDate, end: customPeriod.endDate };
          } else {
            // Calcular datas baseado no período
            const endDate = new Date();
            const startDate = new Date();
            
            switch (period) {
              case '7d':
                startDate.setDate(endDate.getDate() - 7);
                break;
              case '30d':
                startDate.setDate(endDate.getDate() - 30);
                break;
              case '60d':
                startDate.setDate(endDate.getDate() - 60);
                break;
              case '90d':
                startDate.setDate(endDate.getDate() - 90);
                break;
              default:
                startDate.setDate(endDate.getDate() - 30);
            }
            
            dateRange = {
              start: startDate.toISOString().split('T')[0],
              end: endDate.toISOString().split('T')[0]
            };
          }
          
          // Carregar insights sem mostrar loading (similar ao auto-refresh)
          const insights = await GranularAPI.getFacebookCampaignInsights(selectedCampaigns, dateRange);
          setCampaignInsights(insights);
        } catch (error) {
          // Error handled silently
        }
      };
      
      updateInsightsSilently();
    }
  }, [period, customPeriod?.startDate, customPeriod?.endDate]); // Monitorar mudanças no período
  
  // Effect para carregar dados demográficos
  useEffect(() => {
    const loadDemographicData = async () => {
      setLoadingDemographics(true);
      try {
        let dateRange;
        if (period === 'current_month') {
          const today = new Date();
          const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          dateRange = {
            start: firstDayOfMonth.toISOString().split('T')[0],
            end: today.toISOString().split('T')[0]
          };
        } else if (period === 'custom' && customPeriod.startDate && customPeriod.endDate) {
          dateRange = { start: customPeriod.startDate, end: customPeriod.endDate };
        } else {
          const endDate = new Date();
          const startDate = new Date();
          
          switch (period) {
            case '7d':
              startDate.setDate(endDate.getDate() - 7);
              break;
            case '30d':
              startDate.setDate(endDate.getDate() - 30);
              break;
            case '60d':
              startDate.setDate(endDate.getDate() - 60);
              break;
            case '90d':
              startDate.setDate(endDate.getDate() - 90);
              break;
            default:
              startDate.setDate(endDate.getDate() - 30);
          }
          
          dateRange = {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0]
          };
        }
        
        // Buscar dados demográficos (gênero real, cidade mockada)
        const demographics = await GranularAPI.getFacebookInsightsWithBreakdowns(
          selectedCampaigns.length > 0 ? selectedCampaigns : [],
          dateRange
        );
        
        setDemographicData(demographics);
      } catch (error) {
        // Error handled, fallback to mock data
        // Em caso de erro, usar dados mockados apenas para gênero
        setDemographicData({
          genderData: [
            { name: 'Masculino', value: 427 },
            { name: 'Feminino', value: 358 },
            { name: 'Não informado', value: 62 }
          ],
          cityData: [] // Não usar dados de cidade
        });
      } finally {
        setLoadingDemographics(false);
      }
    };
    
    loadDemographicData();
  }, [period, customPeriod?.startDate, customPeriod?.endDate, selectedCampaigns]);

  // Filtrar dados dinamicamente sem recarregar da API
  useEffect(() => {
    if (!marketingData) return;

    if (!selectedSource || selectedSource === '') {
      // Sem filtro - mostrar todos os dados
      setFilteredData(marketingData);
    } else {
      // Filtrar dados por fonte selecionada, mas preservar métricas do Facebook
      const filteredLeadsBySource = marketingData.leadsBySource?.filter(source => 
        source.name === selectedSource
      ) || [];
      
      const selectedSourceLeads = marketingData.leadsBySource?.find(source => 
        source.name === selectedSource
      );

      const filtered = {
        ...marketingData, // Preservar todas as métricas originais (Facebook, etc)
        leadsBySource: filteredLeadsBySource,
        totalLeads: selectedSourceLeads?.value || 0,
        activeLeads: selectedSourceLeads?.active || 0, // Adicione esta linha
        // Preservar leadsByAd se existir para a fonte específica
        leadsByAd: marketingData.leadsByAd?.filter(ad => 
          ad.source === selectedSource || !ad.source
        ) || marketingData.leadsByAd || []
      };
      
      setFilteredData(filtered);
    }
  }, [marketingData, selectedSource]);

  // Helpers responsivos
  const getChartHeight = (size = 'medium') => {
    if (size === 'small') {
      return isMobile ? '280px' : '320px';
    } else if (size === 'medium') {
      return isMobile ? '320px' : '380px';
    } else {
      return isMobile ? '380px' : '420px';
    }
  };

  // Função para aplicar filtros de campanha (otimizada para evitar re-renders desnecessários)
  const handleCampaignFilterChange = async (newFilters) => {
    setCampaignFilters(newFilters);
    
    // Se houver campanhas selecionadas, carregar insights específicos
    if (newFilters.campaignIds.length > 0) {
      setLoadingInsights(true);
      try {
        // Preparar range de datas baseado no período selecionado
        let dateRange;
        if (period === 'current_month') {
          const today = new Date();
          const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          dateRange = {
            start: firstDayOfMonth.toISOString().split('T')[0],
            end: today.toISOString().split('T')[0]
          };
        } else if (period === 'custom' && customPeriod.startDate && customPeriod.endDate) {
          dateRange = { start: customPeriod.startDate, end: customPeriod.endDate };
        } else {
          // Calcular datas baseado no período
          const endDate = new Date();
          const startDate = new Date();
          
          switch (period) {
            case '7d':
              startDate.setDate(endDate.getDate() - 7);
              break;
            case '30d':
              startDate.setDate(endDate.getDate() - 30);
              break;
            case '60d':
              startDate.setDate(endDate.getDate() - 60);
              break;
            case '90d':
              startDate.setDate(endDate.getDate() - 90);
              break;
            default:
              startDate.setDate(endDate.getDate() - 30);
          }
          
          dateRange = {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0]
          };
        }
        
        const insights = await GranularAPI.getFacebookCampaignInsights(newFilters.campaignIds, dateRange);
        setCampaignInsights(insights);
        
        // REMOVIDO: onDataRefresh para evitar re-render desnecessário
        // Os insights já são suficientes para mostrar os dados filtrados
      } catch (error) {
        setCampaignInsights(null);
      } finally {
        setLoadingInsights(false);
      }
    } else {
      // Se não há campanhas selecionadas, apenas limpar insights
      setCampaignInsights(null);
    }
  };

  // Handler para seleção de campanhas
  const handleCampaignSelect = (campaignId) => {
    const newSelectedCampaigns = selectedCampaigns.includes(campaignId)
      ? selectedCampaigns.filter(id => id !== campaignId)
      : [...selectedCampaigns, campaignId];
    
    setSelectedCampaigns(newSelectedCampaigns);
    
    const newFilters = {
      ...campaignFilters,
      campaignIds: newSelectedCampaigns
    };
    
    handleCampaignFilterChange(newFilters);
  };

  // Componente para exibir indicador de tendência (mesmo do DashboardSales)
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
        ? 'rgba(76, 224, 179, 0.15)'  // Verde claro para positivo
        : 'rgba(255, 58, 94, 0.15)',  // Vermelho claro para negativo
      color: isPositive 
        ? '#4ce0b3' // Verde para positivo
        : '#ff3a5e', // Vermelho para negativo
      marginLeft: '8px'
    };
    
    return (
      <div style={style} className="trend-indicator-square">
        {isPositive ? '↗' : '↘'} {isPositive ? '+' : ''}{Math.abs(value).toFixed(1)}%
      </div>
    );
  };

  // Mini Metric Card Component
  const MiniMetricCard = ({ title, value, subtitle, color = COLORS.primary }) => (
    <div className="mini-metric-card">
      <div className="mini-metric-value" style={{ color }}>{value}</div>
      <div className="mini-metric-title">{title}</div>
      {subtitle && <div className="mini-metric-subtitle">{subtitle}</div>}
    </div>
  );

  // Mini Metric Card com TrendIndicator (versão simples)
  const MiniMetricCardWithTrend = ({ title, value, trendValue, color = COLORS.primary, subtitle }) => (
    <div className="mini-metric-card">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div className="mini-metric-value" style={{ color }}>{value}</div>
        <TrendIndicator value={trendValue} />
      </div>
      <div className="mini-metric-title">{title}</div>
      {subtitle && <div className="mini-metric-subtitle">{subtitle}</div>}
    </div>
  );

  // Enhanced Compact Chart Component with Dynamic Updates (ECharts Strategy)
  const CompactChart = memo(({ data, type, config, style, loading = false }) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

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
              itemStyle: { color: config.color },
              barWidth: isMobile ? '50%' : '70%',
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
            tooltip: {
              trigger: 'item',
              formatter: '{a} <br/>{b}: {c} ({d}%)'
            },
            legend: {
              orient: isMobile ? 'horizontal' : 'vertical',
              left: isMobile ? 'center' : 'left',
              bottom: isMobile ? 0 : 'auto',
              textStyle: { fontSize: isMobile ? 10 : 12 }
            },
            series: [{
              name: config.name || 'Data',
              type: 'pie',
              radius: isMobile ? ['20%', '50%'] : ['25%', '60%'],
              center: isMobile ? ['50%', '40%'] : ['50%', '50%'],
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
        } else if (type === 'line') {
          emptyOption = {
            grid: { top: 20, right: 20, bottom: 40, left: 60 },
            xAxis: {
              type: 'category',
              data: [],
              axisLabel: { fontSize: isMobile ? 10 : 12 }
            },
            yAxis: {
              type: 'value',
              axisLabel: { fontSize: isMobile ? 10 : 12 }
            },
            series: [{
              data: [],
              type: 'line',
              itemStyle: { color: config.color },
              lineStyle: { color: config.color, width: 2 },
              symbol: 'circle',
              symbolSize: 6
            }],
            tooltip: {
              trigger: 'axis',
              formatter: function(params) {
                const item = params[0];
                return `${item.name}: ${item.value}`;
              }
            }
          };
        }
        
        chartInstance.current.setOption(emptyOption);
      }
    }, [type, config, isMobile]);

    // Controlar loading animation - APENAS no carregamento inicial, não em mudanças de filtro
    useEffect(() => {
      if (!chartInstance.current) return;
      
      // Só mostrar loading se for carregamento inicial (sem dados ainda)
      if (loading && (!data || data.length === 0)) {
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
    }, [loading, data, config.color]);

    // Atualizar dados dinamicamente quando mudam (ASYNC UPDATE) - SEM LOADING
    useEffect(() => {
      if (!chartInstance.current || !data || data.length === 0) return;

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
      } else if (type === 'line') {
        updateOption = {
          xAxis: {
            data: data.map(item => item[config.xKey])
          },
          series: [{
            name: config.name || 'Data',
            data: data.map(item => item[config.yKey])
          }]
        };
      }

      // Use setOption to update data dynamically (ECharts finds differences automatically)
      chartInstance.current.setOption(updateOption, false); // false = merge mode
      
    }, [data, type, config]);

    // Cleanup
    useEffect(() => {
      return () => {
        if (chartInstance.current) {
          chartInstance.current.dispose();
          chartInstance.current = null;
        }
      };
    }, []);

    return <div ref={chartRef} style={style} />;
  });

  // Se está carregando E não tem dados, mostrar loading spinner
  if (isLoading && !marketingData) {
    return <LoadingSpinner message="Carregando dados de marketing..." />;
  }

  // Se não tem dados E não está carregando, mostrar erro
  if (!marketingData) {
    return (
      <div className="dashboard-content">
        <div className="error-message">
          Dados de marketing não disponíveis.
        </div>
      </div>
    );
  }

  // Usar insights das campanhas selecionadas se disponível, senão usar dados gerais
  const facebookMetrics = campaignInsights && selectedCampaigns.length > 0 ? {
    costPerLead: campaignInsights.costPerLead || 0,
    ctr: campaignInsights.averageCTR || 0,
    cpc: campaignInsights.averageCPC || 0,
    cpm: campaignInsights.averageCPM || 0,
    impressions: campaignInsights.totalImpressions || 0,
    reach: campaignInsights.totalReach || 0,
    clicks: campaignInsights.totalClicks || 0,
    spend: campaignInsights.totalSpend || 0,
    inlineLinkClicks: campaignInsights.totalInlineLinkClicks || 0,
    inlineLinkClickCtr: campaignInsights.inlineLinkClickCTR || 0,
    costPerInlineLinkClick: campaignInsights.costPerInlineLinkClick || 0,
    engagement: {
      likes: campaignInsights.totalPostReactions || 0,
      comments: campaignInsights.totalComments || 0,
      shares: 0, // Não disponível na estrutura atual
      videoViews: 0, // Não disponível na estrutura atual
      profileVisits: 0,
      pageEngagement: campaignInsights.totalPageEngagement || 0,
      postEngagement: campaignInsights.totalPostEngagement || 0
    }
  } : filteredData?.facebookMetrics || {
    costPerLead: 0,
    ctr: 0,
    cpc: 0,
    cpm: 0,
    impressions: 0,
    reach: 0,
    clicks: 0,
    spend: 0,
    inlineLinkClicks: 0,
    inlineLinkClickCtr: 0,
    costPerInlineLinkClick: 0,
    engagement: {
      likes: 0,
      comments: 0,
      shares: 0,
      videoViews: 0,
      profileVisits: 0,
      pageEngagement: 0,
      postEngagement: 0
    }
  };

  return (
    <div className={`dashboard-content ${isUpdating ? 'updating' : ''}`}>
      {/* CSS Aprimorado para garantir consistência com o DashboardSales */}
      <style>{`
        /* Estilos para o indicador de tendência */
        .trend-indicator-square {
          background-color: rgba(255, 82, 82, 0.15);
          color: #ff3a5e;
          border-radius: 8px;
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 600;
          display: inline-block;
          text-align: center;
          transition: all 0.2s ease;
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
        
        /* Correção do alinhamento dos filtros */
        .filter-container {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .filter-label {
          min-width: 70px;
          white-space: nowrap;
        }
        
        .campaign-selector {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .campaign-filter-content {
          flex-grow: 1;
        }
        
        /* Estilos para MultiSelectFilter */
        .multi-select-container {
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
          min-width: 200px;
        }

        .multi-select-wrapper {
          position: relative;
          flex: 1;
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
        }

        .multi-select-button:hover {
          border-color: #4E5859;
          box-shadow: 0 0 0 1px rgba(78, 88, 89, 0.1);
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

        .multi-select-divider {
          height: 1px;
          background-color: #e2e8f0;
          margin: 0;
        }

        /* Indicador de filtros ativos */
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
        }
        
        /* Estilos para o seletor de campanhas */
        .campaign-filter-button {
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
        }
        
        .campaign-filter-button:hover {
          border-color: #4E5859;
          box-shadow: 0 0 0 1px rgba(78, 88, 89, 0.1);
        }
        
        .dropdown-arrow {
          margin-left: 8px;
          font-size: 12px;
          transition: transform 0.2s ease;
        }
        
        .dropdown-arrow.open {
          transform: rotate(180deg);
        }
        
        .campaign-dropdown {
          display: none;
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          margin-top: 2px;
          padding: 12px;
        }
        
        .campaign-dropdown.show {
          display: block;
        }
        
        .campaign-search {
          margin-bottom: 12px;
        }
        
        .campaign-search-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 14px;
        }
        
        .campaign-actions {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        
        .select-all-btn, .clear-all-btn {
          padding: 8px 12px;
          border: none;
          border-radius: 6px;
          background: #f8f9fa;
          color: #4E5859;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .select-all-btn:hover, .clear-all-btn:hover {
          background: #e2e8f0;
        }
        
        .campaign-list {
          max-height: 200px;
          overflow-y: auto;
          border-top: 1px solid #e2e8f0;
          padding-top: 8px;
        }
        
        .campaign-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        
        .campaign-item:hover {
          background-color: #f7fafc;
        }
        
        .campaign-name {
          flex: 1;
          font-size: 13px;
        }
        
        .campaign-status {
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 10px;
          background: rgba(150, 150, 150, 0.1);
          color: #75777B;
        }
        
        .campaign-status.active {
          background: rgba(76, 224, 179, 0.15);
          color: #4ce0b3;
        }
        
        .campaign-status.paused {
          background: rgba(255, 170, 91, 0.15);
          color: #ffaa5b;
        }
        
        /* Responsividade para mobile */
        @media (max-width: 768px) {
          .dashboard-controls {
            flex-direction: column;
            gap: 16px;
            align-items: stretch;
          }
          
          .filters-group {
            flex-direction: column;
            gap: 12px;
          }
          
          .filter-container, .campaign-selector {
            flex-direction: row;
            gap: 8px;
            align-items: center;
          }
          
          .period-controls {
            width: 100%;
          }
          
          .period-selector {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            width: 100%;
            justify-content: center;
          }
          
          .period-selector button {
            flex: 1 0 auto;
            padding: 8px 12px;
            font-size: 13px;
            min-width: 0;
            text-align: center;
          }
        }
        
        /* CORREÇÕES PARA O DROPDOWN EM CELULAR */
        @media (max-width: 480px) {
          .filter-container, .campaign-selector {
            flex-direction: row;
          }
          
          .filter-label {
            min-width: 60px;
            font-size: 13px;
          }
          
          .period-selector {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 4px;
          }
          
          .period-selector button {
            padding: 8px;
            font-size: 12px;
            min-height: 36px;
            width: 100%;
          }
          
          .period-selector button:nth-child(4),
          .period-selector button:nth-child(5) {
            grid-column: auto;
          }
          
          /* FIX para o dropdown de campanhas */
          .campaign-filter-container {
            position: static;
            width: 100%;
          }
          
          .campaign-dropdown {
    position: fixed;
    top: auto;
    left: 0;
    right: 0;
    bottom: 0;
    margin: 0;
    width: 100vw; /* Forçar largura para 100% da viewport */
    max-height: 80vh;
    overflow-y: auto;
    border-radius: 16px 16px 0 0;
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1100;
    padding: 16px;
    border-left: 0;
    border-right: 0;
    border-bottom: 0;
    animation: slide-up 0.3s ease;
    transform: translateX(0); /* Forçar centralização horizontal */
  }
          


          @keyframes slide-up {
            from {
              transform: translateY(100%);
            }
            to {
              transform: translateY(0);
            }
          }
          
          .campaign-dropdown::before {
            content: '';
            display: block;
            width: 40px;
            height: 4px;
            background: #e2e8f0;
            border-radius: 2px;
            margin: 0 auto 16px;
          }

          .campaign-dropdown.show {
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100vw;
    height: 100vh;
    margin: 0;
    padding: 20px;
    border-radius: 0;
    border: none;
    background-color: #fff;
    z-index: 2000;
    overflow-y: auto;
    animation: fade-in 0.2s ease;
  }
  
  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  /* Cabeçalho do modal com título e botão fechar */
  .campaign-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 16px;
    margin-bottom: 16px;
    border-bottom: 1px solid #e2e8f0;
  }
  
  .campaign-modal-title {
    font-size: 18px;
    font-weight: 600;
    color: #4E5859;
  }
  
  .campaign-close-btn {
    background: none;
    border: none;
    font-size: 24px;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: #4a5568;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }
  
  .campaign-close-btn:hover {
    background-color: #f7fafc;
  }
  
  /* Estilos aprimorados para o conteúdo em tela cheia */
  .campaign-search {
    margin-bottom: 16px;
  }
  
  .campaign-search-input {
    width: 100%;
    padding: 14px 16px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 16px;
  }
  
  .campaign-actions {
    display: flex;
    justify-content: space-between;
    margin-bottom: 16px;
  }
  
  .select-all-btn, .clear-all-btn {
    padding: 12px 16px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #f8f9fa;
    color: #4E5859;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .select-all-btn:hover, .clear-all-btn:hover {
    background: #e2e8f0;
  }
  
  .campaign-list {
    flex: 1;
    overflow-y: auto;
    border-top: 1px solid #e2e8f0;
    padding-top: 16px;
    margin-bottom: 16px;
  }
  
  .campaign-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 12px;
    border-radius: 8px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }
  
  .campaign-item:hover {
    background-color: #f7fafc;
  }
  
  .campaign-item input[type="checkbox"] {
    width: 20px;
    height: 20px;
  }
  
  .campaign-name {
    flex: 1;
    font-size: 15px;
  }
  
  .campaign-status {
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 12px;
    background: rgba(150, 150, 150, 0.1);
    color: #75777B;
  }
  
  .campaign-status.active {
    background: rgba(76, 224, 179, 0.15);
    color: #4ce0b3;
  }
  
  .campaign-status.paused {
    background: rgba(255, 170, 91, 0.15);
    color: #ffaa5b;
  }
}
          
          .campaign-list {
            max-height: 40vh;
          }
          
          .campaign-search-input {
            padding: 12px;
            font-size: 16px;
          }
          
          .campaign-actions {
            margin: 12px 0;
          }
          
          .select-all-btn, .clear-all-btn {
            padding: 10px 16px;
            font-size: 14px;
          }
          
          .campaign-item {
            padding: 12px 8px;
          }
        }
      `}</style>

      <div className="dashboard-row row-header">
        <div className="section-title">
          <h2>Dashboard de Marketing</h2>
          <div className="dashboard-controls">
            <div className="filters-group">
              <div className="filter-container">
                <label className="filter-label">Fonte:</label>
                <div className="select-wrapper">
                  <select 
                    value={selectedSource} 
                    onChange={(e) => setSelectedSource(e.target.value)}
                    className="source-select"
                  >
                    {sourceOptions.map(source => (
                      <option key={source.value} value={source.value}>
                        {source.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Filtro de Campanhas Facebook - alinhado horizontalmente */}
              {showCampaignFilter && (
                <div className="campaign-selector">
                  <label className="filter-label">Campanhas:</label>
                  <div className="campaign-filter-content">
                    {loadingCampaigns ? (
                      <div className="campaign-loading">Carregando campanhas...</div>
                    ) : (
                      <div className="campaign-filter-container" ref={dropdownRef}>
                        <button 
                          className="campaign-filter-button"
                          onClick={() => setShowDropdown(!showDropdown)}
                        >
                          {selectedCampaigns.length === 0 
                            ? 'Selecionar campanhas' 
                            : selectedCampaigns.length === campaigns.length 
                              ? `Todas as campanhas (${selectedCampaigns.length})`
                              : `${selectedCampaigns.length} campanha(s) selecionada(s)`}
                          <span className={`dropdown-arrow ${showDropdown ? 'open' : ''}`}>▼</span>
                        </button>
                        
                        <div className={`campaign-dropdown ${showDropdown ? 'show' : ''}`}>
  {/* Adicionando cabeçalho com título e botão fechar */}
  <div className="campaign-modal-header">
    <div className="campaign-modal-title">Selecionar Campanhas</div>
    <button 
      className="campaign-close-btn"
      onClick={() => setShowDropdown(false)}
      aria-label="Fechar"
    >
      ×
    </button>
  </div>

  <div className="campaign-search">
    <input
      type="text"
      placeholder="Buscar campanhas..."
      value={campaignFilters.searchTerm}
      onChange={(e) => setCampaignFilters({
        ...campaignFilters,
        searchTerm: e.target.value
      })}
      className="campaign-search-input"
    />
  </div>
                          
                          <div className="campaign-actions">
                            <button 
                              className="select-all-btn"
                              onClick={() => {
                                if (selectedCampaigns.length === campaigns.length) {
                                  // Se todas estão selecionadas, desmarcar todas
                                  setSelectedCampaigns([]);
                                  setCampaignFilters({
                                    ...campaignFilters,
                                    campaignIds: []
                                  });
                                  setCampaignInsights(null);
                                } else {
                                  // Se nem todas estão selecionadas, selecionar todas
                                  const allCampaignIds = campaigns.map(c => c.id);
                                  setSelectedCampaigns(allCampaignIds);
                                  handleCampaignFilterChange({
                                    ...campaignFilters,
                                    campaignIds: allCampaignIds
                                  });
                                }
                              }}
                            >
                              {selectedCampaigns.length === campaigns.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                            </button>
                            <button 
                              className="clear-all-btn"
                              onClick={() => {
                                setSelectedCampaigns([]);
                                setCampaignFilters({
                                  ...campaignFilters,
                                  campaignIds: []
                                });
                                setCampaignInsights(null);
                              }}
                            >
                              Limpar
                            </button>
                          </div>
                          
                          <div className="campaign-list">
                            {campaigns
                              .filter(campaign => 
                                !campaignFilters.searchTerm || 
                                campaign.name.toLowerCase().includes(campaignFilters.searchTerm.toLowerCase())
                              )
                              .map(campaign => (
                                <label key={campaign.id} className="campaign-item">
                                  <input
                                    type="checkbox"
                                    checked={selectedCampaigns.includes(campaign.id)}
                                    onChange={() => handleCampaignSelect(campaign.id)}
                                  />
                                  <span className="campaign-name">{campaign.name}</span>
                                  <span className={`campaign-status ${campaign.status?.toLowerCase()}`}>
                                    {campaign.status === 'ACTIVE' ? 'Ativa' : 'Pausada'}
                                  </span>
                                </label>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="period-controls">
              <div className="period-selector">
                <button 
                  className={period === '7d' ? 'active' : ''} 
                  onClick={() => handlePeriodChange('7d')}
                >
                  7 Dias
                </button>
                <button 
                  className={period === '30d' ? 'active' : ''} 
                  onClick={() => handlePeriodChange('30d')}
                >
                  30 Dias
                </button>
                <button 
                  className={period === '60d' ? 'active' : ''} 
                  onClick={() => handlePeriodChange('60d')}
                >
                  60 Dias
                </button>
                <button 
                  className={period === '90d' ? 'active' : ''} 
                  onClick={() => handlePeriodChange('90d')}
                >
                  90 Dias
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

     {/* Linha 1: Facebook Ads sozinho */}
      <div className="dashboard-row row-compact">
        <div className="card card-metrics-group wide">
          <div className="card-title">
            {campaignInsights && selectedCampaigns.length > 0 
              ? `Métricas de Performance - ${selectedCampaigns.length} Campanha(s) Selecionada(s)`
              : 'Métricas de Performance'}
            {loadingInsights && <span className="loading-indicator"> - Atualizando...</span>}
          </div>
          <div className="metrics-group">
            <MiniMetricCardWithTrend
              title="ALCANCE"
              value={(facebookMetrics.reach || 0).toLocaleString()}
              trendValue={6.8}
              color={COLORS.primary}
            />
            <MiniMetricCardWithTrend
              title="IMPRESSÕES"
              value={(facebookMetrics.impressions || 0).toLocaleString()}
              trendValue={12.4}
              color={COLORS.secondary}
            />
            <MiniMetricCardWithTrend
              title="CUSTO POR LEAD"
              value={`R$ ${facebookMetrics.costPerLead?.toFixed(2) || '0,00'}`}
              trendValue={-15.5}
              color={COLORS.tertiary}
            />
            <MiniMetricCardWithTrend
              title="CUSTO POR CLIQUE"
              value={`R$ ${facebookMetrics.cpc?.toFixed(2) || '0,00'}`}
              trendValue={-8.2}
              color={COLORS.dark}
            />
            <MiniMetricCardWithTrend
              title="CPM"
              value={`R$ ${(facebookMetrics.cpm || 0).toFixed(2)}`}
              trendValue={-5.7}
              color={COLORS.warning}
            />
            <MiniMetricCardWithTrend
              title="CLIQUES"
              value={(facebookMetrics.clicks || 0).toLocaleString()}
              trendValue={18.9}
              color={COLORS.success}
            />
            <MiniMetricCardWithTrend
              title="CLIQUES NO LINK"
              value={(facebookMetrics.inlineLinkClicks || 0).toLocaleString()}
              trendValue={22.7}
              color={COLORS.primary}
            />
            {(facebookMetrics.inlineLinkClicks || 0) > 0 && (
              <MiniMetricCardWithTrend
                title="Link Clicks"
                value={(facebookMetrics.inlineLinkClicks || 0).toLocaleString()}
                current={facebookMetrics.inlineLinkClicks || 0}
                previous={filteredData.previousFacebookMetrics?.inlineLinkClicks || 0}
                color={COLORS.success}
              />
            )}
            {campaignInsights && selectedCampaigns.length > 0 && (
              <>
                <MiniMetricCardWithTrend
                  title="Engajamento Página"
                  value={(facebookMetrics.engagement.pageEngagement || 0).toLocaleString()}
                  current={facebookMetrics.engagement.pageEngagement || 0}
                  previous={filteredData.previousFacebookMetrics?.engagement?.pageEngagement || 0}
                  color={COLORS.primary}
                />
                <MiniMetricCardWithTrend
                  title="Reações"
                  value={(facebookMetrics.engagement.likes || 0).toLocaleString()}
                  current={facebookMetrics.engagement.likes || 0}
                  previous={filteredData.previousFacebookMetrics?.engagement?.likes || 0}
                  color={COLORS.success}
                />
                <MiniMetricCardWithTrend
                  title="Comentários"
                  value={(facebookMetrics.engagement.comments || 0).toLocaleString()}
                  current={facebookMetrics.engagement.comments || 0}
                  previous={filteredData.previousFacebookMetrics?.engagement?.comments || 0}
                  color={COLORS.warning}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Linha 2: Status dos Leads de Marketing */}
      <div className="dashboard-row row-compact">
        <div className="card card-metrics-group wide">
          <div className="card-title">Status dos Leads de Marketing</div>
          <div className="metrics-group">
            <MiniMetricCardWithTrend
              title="Total de Leads"
              value={filteredData.totalLeads || 0}
              current={filteredData.totalLeads || 0}
              previous={filteredData.previousPeriodLeads || 0}
              color={COLORS.primary}
            />
          </div>
        </div>
      </div>

      {/* Linha 3: Gráficos - Primeira linha com 2 gráficos pie */}
      <div className="dashboard-row">
        {/* Status dos Leads CRM - movido do dashboard de vendas */}
        <div className="card card-lg">
          <div className="card-title">Status dos Leads CRM</div>
          <CompactChart 
            type="pie" 
            data={[
              {
                name: 'Leads em Negociação',
                value: salesData?.activeLeads ||  // V2: KPIs endpoint - usando dados de vendas
                       (salesData?.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.active || 0), 0) : 0)
              },
              {
                name: 'Leads em Remarketing',
                value: salesData?.pipelineStatus?.find(stage => stage.name === 'Leads em Remarketing')?.value || 0
              },
              {
                name: 'Leads Reativados',
                value: 0  // Temporariamente 0 até implementar salesbotRecovery nos V2
              }
            ].filter(item => item.value > 0)} 
            config={{ 
              name: 'Status dos Leads CRM',
              colors: [COLORS.primary, COLORS.secondary, COLORS.success]
            }}
            style={{ height: getChartHeight('medium') }}
            loading={false}
          />
        </div>

        {filteredData.leadsBySource && filteredData.leadsBySource.length > 0 && (
          <div className="card card-lg">
            <div className="card-title">Leads por Fonte</div>
            <CompactChart 
              type="pie" 
              data={filteredData.leadsBySource} 
              config={{ name: 'Leads por Fonte', colors: [COLORS.primary, COLORS.secondary, COLORS.tertiary, COLORS.success, COLORS.warning] }}
              style={{ height: getChartHeight('medium') }}
              loading={false}
            />
          </div>
        )}
      </div>

      {/* Linha 4: Segunda linha com gráfico de barras */}
      {filteredData.leadsByAd && filteredData.leadsByAd.length > 0 && (
        <div className="dashboard-row">
          <div className="card card-full">
            <div className="card-title">Leads por Anúncio</div>
            <CompactChart 
              type="bar" 
              data={filteredData.leadsByAd} 
              config={{ xKey: 'name', yKey: 'value', color: COLORS.tertiary }}
              style={{ height: getChartHeight('medium') }}
              loading={false}
            />
          </div>
        </div>
      )}

      {/* Linha 5: Tendência e métricas do Facebook */}
      <div className="dashboard-row">
        {filteredData.metricsTrend && filteredData.metricsTrend.length > 0 && (
          <div className="card card-lg">
            <div className="card-title">Tendência de Leads</div>
            <CompactChart 
              type="line" 
              data={filteredData.metricsTrend} 
              config={{ xKey: 'month', yKey: 'leads', color: COLORS.primary }}
              style={{ height: getChartHeight('large') }}
              loading={false}
            />
          </div>
        )}
        
      
      </div>
      
      {/* Modal de período customizado */}
      {showCustomPeriod && (
        <div className="custom-period-backdrop" onClick={() => setShowCustomPeriod(false)}>
          <div className="custom-period-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Selecionar Período Personalizado</h3>
            <div className="date-inputs">
              <label>
                Data Inicial:
                <input
                  type="date"
                  value={customPeriod.startDate}
                  onChange={(e) => setCustomPeriod(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </label>
              <label>
                Data Final:
                <input
                  type="date"
                  value={customPeriod.endDate}
                  onChange={(e) => setCustomPeriod(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </label>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowCustomPeriod(false)}>Cancelar</button>
              <button onClick={applyCustomPeriod}>Aplicar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardMarketing;