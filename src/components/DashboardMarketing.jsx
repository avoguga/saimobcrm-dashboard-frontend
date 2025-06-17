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

function DashboardMarketing({ period, setPeriod, windowSize, selectedSource, setSelectedSource, sourceOptions, data, salesData, isLoading, isUpdating, customPeriod, setCustomPeriod, showCustomPeriod, setShowCustomPeriod, handlePeriodChange, applyCustomPeriod, onDataRefresh }) {
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

  // Debug: Verificar se os props estão chegando corretamente
  useEffect(() => {
    console.log('🔍 DashboardMarketing props:', { 
      customPeriod, 
      showCustomPeriod, 
      period,
      setCustomPeriod: typeof setCustomPeriod,
      setShowCustomPeriod: typeof setShowCustomPeriod,
      applyCustomPeriod: typeof applyCustomPeriod
    });
  }, [customPeriod, showCustomPeriod, period]);

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
      console.log('✅ Usando insights que vieram do Dashboard.jsx:', data.campaignInsights);
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
      return isMobile ? '200px' : '240px';
    } else if (size === 'medium') {
      return isMobile ? '250px' : '300px';
    } else {
      return isMobile ? '300px' : '350px';
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
        
        const insights = await GranularAPI.getFacebookCampaignInsights(newFilters.campaignIds, dateRange);
        setCampaignInsights(insights);
        console.log('✅ Insights de campanhas carregados:', insights);
        
        // REMOVIDO: onDataRefresh para evitar re-render desnecessário
        // Os insights já são suficientes para mostrar os dados filtrados
      } catch (error) {
        console.error('Erro ao carregar insights de campanhas:', error);
        setCampaignInsights(null);
      } finally {
        setLoadingInsights(false);
      }
    } else {
      // Se não há campanhas selecionadas, apenas limpar insights
      setCampaignInsights(null);
      console.log('✅ Filtros de campanha limpos, usando dados gerais');
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

  // Mini Metric Card Component
  const MiniMetricCard = ({ title, value, subtitle, color = COLORS.primary }) => (
    <div className="mini-metric-card">
      <div className="mini-metric-value" style={{ color }}>{value}</div>
      <div className="mini-metric-title">{title}</div>
      {subtitle && <div className="mini-metric-subtitle">{subtitle}</div>}
    </div>
  );

const MiniMetricCardWithTrend = ({ title, value, current, previous, color = COLORS.primary, subtitle }) => {
  const getTrendInfo = () => {
    // Sempre mostrar a tendência, mesmo com valores zero
    if (!previous && previous !== 0) return { text: '', color: COLORS.tertiary, bg: 'rgba(117, 119, 123, 0.1)', border: 'rgba(117, 119, 123, 0.3)' };
    
    // Calcular a variação percentual
    let change = 0;
    let isPositive = true;
    
    if (previous === 0 && current !== 0) {
      // Caso especial: crescimento a partir de zero
      change = current > 0 ? 100 : -100;
      isPositive = current > 0;
    } else if (previous !== 0) {
      // Caso normal: calcular variação percentual
      change = ((current - previous) / Math.abs(previous)) * 100;
      isPositive = change >= 0;
    }
    
    return {
      text: `${isPositive ? '+' : ''}${change.toFixed(1)}%`,
      icon: isPositive ? '↗' : '↘',
      color: isPositive ? COLORS.success : COLORS.danger,
      bg: isPositive ? 'rgba(76, 224, 179, 0.15)' : 'rgba(255, 58, 94, 0.15)',
      border: isPositive ? 'rgba(76, 224, 179, 0.3)' : 'rgba(255, 58, 94, 0.3)'
    };
  };

  const trendInfo = getTrendInfo();

  return (
    <div className="mini-metric-card">
      <div className="mini-metric-value" style={{ color }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
        <div className="mini-metric-title">{title}</div>
        {trendInfo.text && (
          <div 
            className={`trend-tag-square ${(current - previous) < 0 ? 'negative' : ''}`}
            style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: '2px',
              padding: '8px',
              borderRadius: '8px',
              backgroundColor: trendInfo.bg,
              border: `1px solid ${trendInfo.border}`,
              color: trendInfo.color,
              fontWeight: '600',
              fontSize: '10px',
              minWidth: '40px',
              minHeight: '40px',
              boxShadow: `0 2px 4px ${trendInfo.bg}60`,
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{ fontSize: '16px', lineHeight: 1 }}>
              {trendInfo.icon}
            </span>
            <span style={{ lineHeight: 1, fontSize: '13px', fontWeight: '700' }}>
              {trendInfo.text}
            </span>
          </div>
        )}
      </div>
      {subtitle && <div className="mini-metric-subtitle">{subtitle}</div>}
    </div>
  );
};

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
            grid: { top: 20, right: 20, bottom: 40, left: 60 },
            xAxis: {
              type: 'category',
              data: [], // Eixo vazio inicialmente
              axisLabel: { 
                fontSize: isMobile ? 10 : 12,
                rotate: isMobile ? 45 : 0
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
              barWidth: isMobile ? '60%' : '70%'
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
            data: data.map(item => item[config.yKey])
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

    // Removed loading sync - using dynamic updates without loading animations

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
      <div className="dashboard-row row-header">
        <div className="section-title">
          <h2>Dashboard de Marketing</h2>
          <div className="dashboard-controls">
            <div className="filters-group">
              <div className="source-selector">
                <label className="filter-label">Fonte:</label>
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

              {/* Filtro de Campanhas Facebook */}
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
                                  // Se todas estão selecionadas, desmarcar todas (SEM recarregar dados)
                                  setSelectedCampaigns([]);
                                  setCampaignFilters({
                                    ...campaignFilters,
                                    campaignIds: []
                                  });
                                  setCampaignInsights(null); // Limpar insights apenas
                                  console.log('✅ Todas as campanhas desmarcadas, usando dados gerais');
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
                                // Limpar sem recarregar dados
                                setSelectedCampaigns([]);
                                setCampaignFilters({
                                  ...campaignFilters,
                                  campaignIds: []
                                });
                                setCampaignInsights(null); // Limpar insights apenas
                                console.log('✅ Filtros de campanha limpos (botão Limpar)');
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
            <div className="period-controls" style={{ position: 'relative' }}>
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
              ? `Facebook Ads - ${selectedCampaigns.length} Campanha(s) Selecionada(s)`
              : 'Métricas do Facebook Ads'}
            {loadingInsights && <span className="loading-indicator"> - Atualizando...</span>}
          </div>
          <div className="metrics-group">
            <MiniMetricCardWithTrend
              title="Custo por Lead"
              value={`R$ ${facebookMetrics.costPerLead?.toFixed(2) || '0,00'}`}
              current={facebookMetrics.costPerLead || 0}
              previous={filteredData.previousFacebookMetrics?.costPerLead || 0}
              color={COLORS.primary}
            />
            <MiniMetricCardWithTrend
              title="CTR"
              value={`${(facebookMetrics.ctr || 0).toFixed(2)}%`}
              current={facebookMetrics.ctr || 0}
              previous={filteredData.previousFacebookMetrics?.ctr || 0}
              color={COLORS.secondary}
            />
            <MiniMetricCardWithTrend
              title="CPM"
              value={`R$ ${(facebookMetrics.cpm || 0).toFixed(2)}`}
              current={facebookMetrics.cpm || 0}
              previous={filteredData.previousFacebookMetrics?.cpm || 0}
              color={COLORS.dark}
            />
            <MiniMetricCardWithTrend
              title="Impressões"
              value={(facebookMetrics.impressions || 0).toLocaleString()}
              current={facebookMetrics.impressions || 0}
              previous={filteredData.previousFacebookMetrics?.impressions || 0}
              color={COLORS.primary}
            />
            <MiniMetricCardWithTrend
              title="Alcance"
              value={(facebookMetrics.reach || 0).toLocaleString()}
              current={facebookMetrics.reach || 0}
              previous={filteredData.previousFacebookMetrics?.reach || 0}
              color={COLORS.secondary}
            />
            <MiniMetricCardWithTrend
              title="Cliques"
              value={(facebookMetrics.clicks || 0).toLocaleString()}
              current={facebookMetrics.clicks || 0}
              previous={filteredData.previousFacebookMetrics?.clicks || 0}
              color={COLORS.tertiary}
            />
            <MiniMetricCardWithTrend
              title="Gasto"
              value={`R$ ${(facebookMetrics.spend || 0).toFixed(2)}`}
              current={facebookMetrics.spend || 0}
              previous={filteredData.previousFacebookMetrics?.spend || 0}
              color={COLORS.warning}
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