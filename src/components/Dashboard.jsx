import { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { KommoAPI } from '../services/api';
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

// Dashboard principal otimizado
function Dashboard() {
  const [activeTab, setActiveTab] = useState('marketing');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [marketingData, setMarketingData] = useState(null);
  const [salesData, setSalesData] = useState(null);
  const [period, setPeriod] = useState('90d');
  
  // Hook para detecção de tamanho de tela responsiva
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  
  // Constantes de responsividade
  const isMobile = windowSize.width < 768;
  const isTablet = windowSize.width >= 768 && windowSize.width < 1200;
  const isSmallMobile = windowSize.width < 480;

  // Hook para atualizar o tamanho da janela
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    
    // Limpeza
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Carregar dados da API
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Converter o período para dias
        const days = parseInt(period.replace('d', ''));
        
        // Agora as chamadas não vão falhar completamente se um endpoint falhar
        const marketingResponse = await KommoAPI.getMarketingDashboard(days);
        const salesResponse = await KommoAPI.getSalesDashboard(days);
        
        // Log para depuração
        console.log('Marketing dashboard carregado:', marketingResponse);
        console.log('Sales dashboard carregado:', salesResponse);
        
        setMarketingData(marketingResponse);
        setSalesData(salesResponse);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setError(`Falha ao comunicar com o servidor. Por favor, tente novamente mais tarde.`);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [period]);

  // Atualizar dados
  const refreshData = async () => {
    setIsLoading(true);
    try {
      const days = parseInt(period.replace('d', ''));
      
      if (activeTab === 'marketing') {
        const marketingResponse = await KommoAPI.getMarketingDashboard(days);
        setMarketingData(marketingResponse);
      } else {
        const salesResponse = await KommoAPI.getSalesDashboard(days);
        setSalesData(salesResponse);
      }
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
      setError(`Não foi possível atualizar os dados: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helpers responsivos
  const getChartHeight = (size = 'medium') => {
    if (size === 'small') {
      return isSmallMobile ? '150px' : (isMobile ? '180px' : '200px');
    } else if (size === 'medium') {
      return isSmallMobile ? '180px' : (isMobile ? '220px' : '250px');
    } else if (size === 'large') {
      return isSmallMobile ? '200px' : (isMobile ? '250px' : '300px');
    }
    return '250px';
  };
  
  const truncateText = (text, maxLength) => {
    if (!text || typeof text !== 'string') return text;
    const limit = isSmallMobile ? 10 : (isMobile ? 15 : 20);
    const finalLength = maxLength || limit;
    return text.length > finalLength ? text.substring(0, finalLength) + '...' : text;
  };

  // Renderizar conteúdo de loading
  if (isLoading) {
    return (
      <div className="dashboard-optimized">
        <div className="dashboard-header">
          <div className="brand">
            <h1>SA IMOB</h1>
            <span className="subtitle">Kommo CRM Dashboard</span>
          </div>
        </div>
        <div className="loading">
          <div className="spinner"></div>
          <div className="loading-text">Carregando dados do Kommo CRM...</div>
        </div>
      </div>
    );
  }

  // Verificar se houve erro
  if (error) {
    return (
      <div className="dashboard-optimized">
        <div className="dashboard-header">
          <div className="brand">
            <h1>SA IMOB</h1>
            <span className="subtitle">Kommo CRM Dashboard</span>
          </div>
        </div>
        <div className="error-message">
          <h3>Erro ao carregar dados</h3>
          <p>{error}</p>
          <p className="error-info">Alguns endpoints estão apresentando problemas:</p>
          <ul className="error-list">
            <li>GET /leads/by-advertisement - Erro 500 (Interno do Servidor)</li>
            <li>GET /sales/trends - Erro 404 (Não Encontrado)</li>
          </ul>
          <button 
            className="action-button" 
            onClick={refreshData}
            style={{ marginTop: '20px' }}
          >
            <span className="icon">↻</span> Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  // Verificar se os dados foram carregados
  if (!marketingData || !salesData) {
    return (
      <div className="dashboard-optimized">
        <div className="dashboard-header">
          <div className="brand">
            <h1>SA IMOB</h1>
            <span className="subtitle">Kommo CRM Dashboard</span>
          </div>
        </div>
        <div className="error-message">
          Erro ao carregar dados. Os dados estão incompletos.
          <button 
            className="action-button" 
            onClick={refreshData}
            style={{ marginTop: '20px' }}
          >
            <span className="icon">↻</span> Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  // Mini card para métricas com suporte a responsividade
  const MiniMetricCard = ({ title, value, subtitle, color, icon, trend, trendUp }) => {
    // Truncar título em telas pequenas
    const titleDisplay = truncateText(title, isSmallMobile ? 10 : (isMobile ? 15 : undefined));
    
    return (
      <div className="mini-metric-card">
        <div className="mini-metric-content">
          <div className="mini-metric-header">
            <div className="mini-metric-title" title={title}>{titleDisplay}</div>
            {icon && <div className="mini-metric-icon">{icon}</div>}
          </div>
          <div className="mini-metric-value" style={{ color }}>{value}</div>
          {subtitle && <div className="mini-metric-subtitle">{subtitle}</div>}
          {trend && (
            <div className={`mini-metric-trend ${trendUp ? 'up' : 'down'}`}>
              {trendUp ? '↑' : '↓'} {trend}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Componente de gráfico compacto com responsividade
  const CompactChart = ({ type, data, config, style = { height: '100%', width: '100%' } }) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);
    
    useEffect(() => {
      if (chartRef.current) {
        if (!chartInstance.current) {
          chartInstance.current = echarts.init(chartRef.current);
        }
        
        let option = {};
        
        // Verificar se estamos em tela pequena
        const isSmallScreen = windowSize.width < 768;
        const isVerySmallScreen = windowSize.width < 480;
        
        // Função para truncar labels
        const truncateLabel = (label) => {
          if (isVerySmallScreen && typeof label === 'string' && label.length > 8) {
            return label.substring(0, 8) + '...';
          } else if (isSmallScreen && typeof label === 'string' && label.length > 12) {
            return label.substring(0, 12) + '...';
          }
          return label;
        };
        
        if (type === 'line') {
          // Processamento de dados para telas pequenas
          const xData = isSmallScreen 
            ? data.map(item => truncateLabel(item[config.xKey]))
            : data.map(item => item[config.xKey]);
            
          // Cálculo de intervalo para telas pequenas (mostrar menos pontos)
          const calculateInterval = () => {
            if (isVerySmallScreen && xData.length > 6) {
              return Math.ceil(xData.length / 4);
            }
            if (isSmallScreen && xData.length > 8) {
              return Math.ceil(xData.length / 6);
            }
            return 0; // Mostrar todos os labels
          };
          
          option = {
            grid: { 
              top: 15, 
              right: 15, 
              bottom: isSmallScreen ? 40 : 25, 
              left: isSmallScreen ? 40 : 35, 
              containLabel: true 
            },
            tooltip: { 
              trigger: 'axis',
              confine: true // Confina o tooltip à área do gráfico
            },
            xAxis: {
              type: 'category',
              data: xData,
              axisLabel: { 
                fontSize: isSmallScreen ? 9 : 10, 
                interval: calculateInterval(),
                rotate: isVerySmallScreen ? 45 : 0
              },
              axisLine: { lineStyle: { color: COLORS.light } }
            },
            yAxis: {
              type: 'value',
              axisLabel: { 
                fontSize: isSmallScreen ? 9 : 10 
              },
              splitLine: { lineStyle: { color: COLORS.light, opacity: 0.5 } }
            },
            series: [{
              data: data.map(item => item[config.yKey]),
              type: 'line',
              smooth: true,
              symbol: 'circle',
              symbolSize: isSmallScreen ? 4 : 5,
              lineStyle: { 
                width: isSmallScreen ? 2 : 3, 
                color: config.color || COLORS.primary 
              },
              itemStyle: { color: config.color || COLORS.primary },
              areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: echarts.color.modifyAlpha(config.color || COLORS.primary, 0.5) },
                  { offset: 1, color: echarts.color.modifyAlpha(config.color || COLORS.primary, 0.05) }
                ])
              }
            }]
          };
        } else if (type === 'pie') {
          // Ajustes responsivos para gráficos de pizza
          option = {
            tooltip: {
              trigger: 'item',
              formatter: '{b}: {c} ({d}%)',
              confine: true
            },
            legend: {
              orient: isSmallScreen ? 'horizontal' : 'vertical',
              right: isSmallScreen ? 'center' : 10,
              top: isSmallScreen ? 'bottom' : 'center',
              bottom: isSmallScreen ? 0 : undefined,
              itemWidth: isSmallScreen ? 8 : 10,
              itemHeight: isSmallScreen ? 8 : 10,
              textStyle: { 
                fontSize: isSmallScreen ? 9 : 10,
                padding: isSmallScreen ? [0, 2] : [0, 5]
              }
            },
            series: [{
              type: 'pie',
              radius: isSmallScreen ? ['30%', '65%'] : ['40%', '70%'],
              center: isSmallScreen ? ['40%', '45%'] : ['30%', '50%'],
              avoidLabelOverlap: true,
              itemStyle: {
                borderRadius: 3,
                borderColor: COLORS.white,
                borderWidth: 1
              },
              label: { show: false },
              emphasis: {
                label: { show: false }
              },
              labelLine: { show: false },
              data: data,
              color: config.colors || [
                COLORS.primary, COLORS.secondary, COLORS.tertiary, 
                COLORS.success, COLORS.warning, COLORS.danger
              ]
            }]
          };
        } else if (type === 'bar') {
          // Processamento de dados para telas pequenas
          const xData = data.map(item => item[config.xKey]);
          const processedXData = isSmallScreen 
            ? xData.map(truncateLabel) 
            : xData;
            
          option = {
            grid: { 
              top: 15, 
              right: 15, 
              bottom: isSmallScreen ? 40 : 25, 
              left: isSmallScreen ? 40 : 35, 
              containLabel: true 
            },
            tooltip: { 
              trigger: 'axis',
              confine: true
            },
            xAxis: {
              type: 'category',
              data: processedXData,
              axisLabel: { 
                fontSize: isSmallScreen ? 9 : 10, 
                interval: isVerySmallScreen ? 'auto' : 0, 
                rotate: isVerySmallScreen ? 45 : (isSmallScreen ? 30 : 30) 
              },
              axisLine: { lineStyle: { color: COLORS.light } }
            },
            yAxis: {
              type: 'value',
              axisLabel: { 
                fontSize: isSmallScreen ? 9 : 10 
              },
              splitLine: { lineStyle: { color: COLORS.light, opacity: 0.5 } }
            },
            series: [{
              data: data.map(item => item[config.yKey]),
              type: 'bar',
              barMaxWidth: isSmallScreen ? '40%' : '60%',
              itemStyle: { 
                color: config.color || COLORS.primary,
                borderRadius: [3, 3, 0, 0]
              }
            }]
          };
        } else if (type === 'gauge') {
          // Ajustes responsivos para gráficos de gauge
          option = {
            series: [{
              type: 'gauge',
              startAngle: 180,
              endAngle: 0,
              min: 0,
              max: 100,
              radius: isSmallScreen ? '90%' : '100%',
              center: ['50%', '60%'],
              axisLine: {
                lineStyle: {
                  width: isSmallScreen ? 15 : 20,
                  color: [
                    [0.3, COLORS.danger],
                    [0.7, COLORS.warning],
                    [1, COLORS.success]
                  ]
                }
              },
              pointer: {
                itemStyle: { color: 'inherit' },
                length: isSmallScreen ? '50%' : '60%',
                width: isSmallScreen ? 4 : 5
              },
              axisTick: { show: false },
              splitLine: { show: false },
              axisLabel: { show: false },
              detail: {
                fontSize: isSmallScreen ? 16 : 20,
                offsetCenter: [0, '0%'],
                formatter: '{value}%',
                color: COLORS.dark
              },
              data: [{ 
                value: config.value, 
                name: config.name || '',
                title: { show: false }
              }]
            }]
          };
        }
        
        chartInstance.current.setOption(option);
        
        const handleResize = () => {
          chartInstance.current && chartInstance.current.resize();
        };
        
        window.addEventListener('resize', handleResize);
        
        return () => {
          window.removeEventListener('resize', handleResize);
          chartInstance.current && chartInstance.current.dispose();
          chartInstance.current = null;
        };
      }
    }, [data, type, config, windowSize]); // Adicionado windowSize às dependências
    
    return <div ref={chartRef} style={style} />;
  };

  // Indicador NPS com responsividade
  const NPSIndicator = ({ score }) => {
    let category = '';
    let color = '';
    
    if (score >= 75) {
      category = 'Excelente';
      color = COLORS.success;
    } else if (score >= 50) {
      category = 'Bom';
      color = COLORS.warning;
    } else {
      category = 'Precisa melhorar';
      color = COLORS.danger;
    }
    
    // Layout responsivo para NPS
    return (
      <div className="nps-indicator">
        <div className="nps-score" style={{ 
          color, 
          fontSize: isSmallMobile ? '32px' : (isMobile ? '36px' : '48px')
        }}>
          {score}%
        </div>
        <div className="nps-category" style={{ 
          color, 
          fontSize: isSmallMobile ? '14px' : (isMobile ? '16px' : '18px')
        }}>
          {category}
        </div>
        <div className="nps-breakdown" style={{ 
          flexDirection: isMobile ? 'column' : 'row'
        }}>
          <div className="nps-segment promoters">
            <div className="nps-segment-label">Promotores</div>
            <div className="nps-segment-value">{Math.round(score * 0.75)}%</div>
          </div>
          <div className="nps-segment passives">
            <div className="nps-segment-label">Passivos</div>
            <div className="nps-segment-value">{Math.round(score * 0.2)}%</div>
          </div>
          <div className="nps-segment detractors">
            <div className="nps-segment-label">Detratores</div>
            <div className="nps-segment-value">{Math.round(score * 0.05)}%</div>
          </div>
        </div>
      </div>
    );
  };

  // Renderizar o Dashboard de Marketing
  const renderMarketingDashboard = () => {
    // Verificar se os dados necessários estão disponíveis
    if (!marketingData.facebookMetrics) {
      return (
        <div className="dashboard-content">
          <div className="error-message">
            Dados de métricas do Facebook não disponíveis.
          </div>
        </div>
      );
    }

    const facebookMetrics = marketingData.facebookMetrics;

    return (
      <div className="dashboard-content">
        <div className="dashboard-row row-header">
          <div className="section-title">
            <h2>Dashboard de Marketing</h2>
            <div className="period-selector">
              <button 
                className={period === '30d' ? 'active' : ''} 
                onClick={() => setPeriod('30d')}
              >
                30 Dias
              </button>
              <button 
                className={period === '90d' ? 'active' : ''} 
                onClick={() => setPeriod('90d')}
              >
                90 Dias
              </button>
              <button 
                className={period === '180d' ? 'active' : ''} 
                onClick={() => setPeriod('180d')}
              >
                180 Dias
              </button>
            </div>
          </div>
        </div>

        {/* Linha 1: KPIs principais */}
        <div className="dashboard-row row-compact">
          <div className="card card-metrics-group">
            <div className="card-title">Leads - Últimos {period.replace('d','')} dias</div>
            <div className="metrics-group">
              <MiniMetricCard
                title="Total de Leads"
                value={marketingData.totalLeads || 0}
                color={COLORS.primary}
              />
              {marketingData.leadsBySource && marketingData.leadsBySource.length > 0 && (
                <>
                  <MiniMetricCard
                    title="Leads Facebook"
                    value={marketingData.leadsBySource.find(src => src.name.includes('Facebook'))?.value || 0}
                    subtitle={`${Math.round((marketingData.leadsBySource.find(src => src.name.includes('Facebook'))?.value || 0) / marketingData.totalLeads * 100)}%`}
                    color={COLORS.secondary}
                  />
                  <MiniMetricCard
                    title="Leads OLX"
                    value={marketingData.leadsBySource.find(src => src.name.includes('OLX'))?.value || 0}
                    subtitle={`${Math.round((marketingData.leadsBySource.find(src => src.name.includes('OLX'))?.value || 0) / marketingData.totalLeads * 100)}%`}
                    color={COLORS.tertiary}
                  />
                </>
              )}
            </div>
          </div>

          <div className="card card-metrics-group">
            <div className="card-title">Métricas do Facebook Ads</div>
            <div className="metrics-group">
              <MiniMetricCard
                title="Custo por Lead"
                value={`R$ ${facebookMetrics.costPerLead?.toFixed(2) || 0}`}
                color={COLORS.primary}
              />
              <MiniMetricCard
                title="CTR"
                value={`${facebookMetrics.ctr || 0}%`}
                color={COLORS.success}
              />
              <MiniMetricCard
                title="CPC"
                value={`R$ ${facebookMetrics.cpc || 0}`}
                color={COLORS.tertiary}
              />
            </div>
          </div>

          <div className="card card-metrics-group">
            <div className="card-title">Investimento e Alcance</div>
            <div className="metrics-group">
              <MiniMetricCard
                title="Investimento"
                value={`R$ ${Math.round(facebookMetrics.totalSpent || 0).toLocaleString('pt-BR')}`}
                color={COLORS.secondary}
              />
              <MiniMetricCard
                title="Impressões"
                value={(facebookMetrics.impressions || 0).toLocaleString('pt-BR')}
                color={COLORS.primary}
              />
              <MiniMetricCard
                title="Alcance"
                value={(facebookMetrics.reach || 0).toLocaleString('pt-BR')}
                color={COLORS.tertiary}
              />
            </div>
          </div>
        </div>

        {/* Linha 2: Gráficos principais */}
        <div className="dashboard-row">
          <div className="card card-md">
            <div className="card-title">Leads por Fonte</div>
            {marketingData.leadsBySource && marketingData.leadsBySource.length > 0 ? (
              <CompactChart 
                type="pie" 
                data={marketingData.leadsBySource} 
                config={{ colors: [COLORS.primary, COLORS.secondary, COLORS.tertiary, COLORS.success, COLORS.warning] }}
                style={{ height: getChartHeight('medium') }}
              />
            ) : (
              <div className="empty-chart">Não há dados disponíveis</div>
            )}
          </div>
          
          <div className="card card-lg">
            <div className="card-title">Tendência de Leads (Últimos meses)</div>
            {marketingData.metricsTrend && marketingData.metricsTrend.length > 0 ? (
              <CompactChart 
                type="line" 
                data={marketingData.metricsTrend} 
                config={{ xKey: 'month', yKey: 'leads', color: COLORS.primary }}
                style={{ height: getChartHeight('medium') }}
              />
            ) : (
              <div className="empty-chart">Não há dados disponíveis</div>
            )}
          </div>
        </div>

        {/* Linha 3: Tendências */}
        <div className="dashboard-row">
          <div className="card card-md">
            <div className="card-title">Tendência de CPL</div>
            {marketingData.metricsTrend && marketingData.metricsTrend.length > 0 ? (
              <CompactChart 
                type="line" 
                data={marketingData.metricsTrend} 
                config={{ xKey: 'month', yKey: 'cpl', color: COLORS.secondary }}
                style={{ height: getChartHeight('small') }}
              />
            ) : (
              <div className="empty-chart">Não há dados disponíveis</div>
            )}
          </div>
          
          <div className="card card-md">
            <div className="card-title">Tendência de Investimento</div>
            {marketingData.metricsTrend && marketingData.metricsTrend.length > 0 ? (
              <CompactChart 
                type="line" 
                data={marketingData.metricsTrend} 
                config={{ xKey: 'month', yKey: 'spent', color: COLORS.tertiary }}
                style={{ height: getChartHeight('small') }}
              />
            ) : (
              <div className="empty-chart">Não há dados disponíveis</div>
            )}
          </div>
          
          <div className="card card-md">
            <div className="card-title">Leads por Anúncio</div>
            {marketingData.leadsByAd && marketingData.leadsByAd.length > 0 ? (
              <CompactChart 
                type="bar" 
                data={marketingData.leadsByAd} 
                config={{ xKey: 'name', yKey: 'value', color: COLORS.success }}
                style={{ height: getChartHeight('small') }}
              />
            ) : (
              <div className="empty-chart">Não há dados disponíveis</div>
            )}
          </div>
        </div>

        {/* Linha 4: Tags e propriedades */}
        <div className="dashboard-row">
          <div className="card card-md">
            <div className="card-title">Leads por Tag</div>
            {marketingData.leadsByTag && marketingData.leadsByTag.length > 0 ? (
              <CompactChart 
                type="pie" 
                data={marketingData.leadsByTag} 
                config={{ colors: [COLORS.primary, COLORS.secondary, COLORS.tertiary] }}
                style={{ height: getChartHeight('small') }}
              />
            ) : (
              <div className="empty-chart">Não há dados disponíveis</div>
            )}
          </div>
          
          <div className="card card-md">
            <div className="card-title">Tipo de Imóvel</div>
            {marketingData.customFields && marketingData.customFields.propertyType && marketingData.customFields.propertyType.length > 0 ? (
              <CompactChart 
                type="pie" 
                data={marketingData.customFields.propertyType} 
                config={{ colors: [COLORS.secondary, COLORS.tertiary, COLORS.success, COLORS.warning] }}
                style={{ height: getChartHeight('small') }}
              />
            ) : (
              <div className="empty-chart">Não há dados disponíveis</div>
            )}
          </div>
          
          <div className="card card-md">
            <div className="card-title">Região de Interesse</div>
            {marketingData.customFields && marketingData.customFields.regionInterest && marketingData.customFields.regionInterest.length > 0 ? (
              <CompactChart 
                type="pie" 
                data={marketingData.customFields.regionInterest} 
                config={{ colors: [COLORS.primary, COLORS.secondary, COLORS.tertiary, COLORS.success] }}
                style={{ height: getChartHeight('small') }}
              />
            ) : (
              <div className="empty-chart">Não há dados disponíveis</div>
            )}
          </div>
        </div>

        {/* Linha 5: Métricas de engajamento */}
        <div className="dashboard-row row-compact">
          <div className="card card-metrics-group wide">
            <div className="card-title">Métricas de Engajamento do Facebook</div>
            <div className="metrics-group">
              <MiniMetricCard
                title="Curtidas"
                value={(facebookMetrics.engagement?.likes || 0).toLocaleString('pt-BR')}
                color={COLORS.primary}
              />
              <MiniMetricCard
                title="Comentários"
                value={(facebookMetrics.engagement?.comments || 0).toLocaleString('pt-BR')}
                color={COLORS.secondary}
              />
              <MiniMetricCard
                title="Compartilhamentos"
                value={(facebookMetrics.engagement?.shares || 0).toLocaleString('pt-BR')}
                color={COLORS.tertiary}
              />
              <MiniMetricCard
                title="Visualizações de Vídeo"
                value={(facebookMetrics.engagement?.videoViews || 0).toLocaleString('pt-BR')}
                color={COLORS.success}
              />
              <MiniMetricCard
                title="Visitas ao Perfil"
                value={(facebookMetrics.engagement?.profileVisits || 0).toLocaleString('pt-BR')}
                color={COLORS.warning}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Renderizar o Dashboard de Vendas
  const renderSalesDashboard = () => {
    return (
      <div className="dashboard-content">
        <div className="dashboard-row row-header">
          <div className="section-title">
            <h2>Dashboard de Vendas</h2>
            <div className="period-selector">
              <button 
                className={period === '30d' ? 'active' : ''} 
                onClick={() => setPeriod('30d')}
              >
                30 Dias
              </button>
              <button 
                className={period === '90d' ? 'active' : ''} 
                onClick={() => setPeriod('90d')}
              >
                90 Dias
              </button>
              <button 
                className={period === '180d' ? 'active' : ''} 
                onClick={() => setPeriod('180d')}
              >
                180 Dias
              </button>
            </div>
          </div>
        </div>

        {/* Linha 1: KPIs principais */}
        <div className="dashboard-row row-compact">
          <div className="card card-metrics-group">
            <div className="card-title">Métricas de Leads</div>
            <div className="metrics-group">
              <MiniMetricCard
                title="Total de Leads"
                value={salesData.totalLeads || 0}
                color={COLORS.primary}
              />
              <MiniMetricCard
                title="Leads Ativos"
                value={salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.active || 0), 0) : 0}
                subtitle={`${Math.round((salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.active || 0), 0) : 0) / (salesData.totalLeads || 1) * 100)}%`}
                color={COLORS.success}
              />
              <MiniMetricCard
                title="Leads Perdidos"
                value={salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.lost || 0), 0) : 0}
                subtitle={`${Math.round((salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.lost || 0), 0) : 0) / (salesData.totalLeads || 1) * 100)}%`}
                color={COLORS.danger}
              />
            </div>
          </div>

          <div className="card card-metrics-group">
            <div className="card-title">Métricas de Conversão</div>
            <div className="metrics-group">
              <MiniMetricCard
                title="Lead Cycle"
                value={`${salesData.leadCycleTime?.toFixed(1) || 0} dias`}
                color={COLORS.secondary}
              />
              <MiniMetricCard
                title="Win Rate"
                value={`${salesData.winRate?.toFixed(1) || 0}%`}
                color={COLORS.tertiary}
              />
              <MiniMetricCard
                title="Ticket Médio"
                value={`R$ ${(salesData.averageDealSize || 0).toLocaleString('pt-BR')}`}
                color={COLORS.primary}
              />
            </div>
          </div>

          <div className="card card-gauge">
            <div className="card-title">Win Rate</div>
            <CompactChart 
              type="gauge" 
              data={[]} 
              config={{ value: salesData.winRate || 0, name: 'Win Rate' }}
              style={{ height: isMobile ? '100px' : '120px' }}
            />
          </div>
        </div>

        {/* Linha 2: NPS e gráficos principais */}
        <div className="dashboard-row">
          <div className="card card-md">
            <div className="card-title">Satisfação do Cliente</div>
            <NPSIndicator score={75} />
          </div>
          
          <div className="card card-lg">
            <div className="card-title">Vendas por Mês</div>
            {salesData.salesTrend && salesData.salesTrend.length > 0 ? (
              <CompactChart 
                type="line" 
                data={salesData.salesTrend} 
                config={{ xKey: 'month', yKey: 'sales', color: COLORS.success }}
                style={{ height: getChartHeight('medium') }}
              />
            ) : (
              <div className="empty-chart">Não há dados disponíveis</div>
            )}
          </div>
        </div>

        {/* Linha 3: Gráficos de funil e etapas */}
        <div className="dashboard-row">
          <div className="card card-md">
            <div className="card-title">Leads por Etapa</div>
            {salesData.leadsByStage && salesData.leadsByStage.length > 0 ? (
              <CompactChart 
                type="pie" 
                data={salesData.leadsByStage} 
                config={{ colors: [COLORS.primary, COLORS.secondary, COLORS.tertiary, COLORS.success, COLORS.warning] }}
                style={{ height: getChartHeight('small') }}
              />
            ) : (
              <div className="empty-chart">Não há dados disponíveis</div>
            )}
          </div>
          
          <div className="card card-lg">
            <div className="card-title">Valor das Vendas (R$)</div>
            {salesData.salesTrend && salesData.salesTrend.length > 0 ? (
              <CompactChart 
                type="line" 
                data={salesData.salesTrend} 
                config={{ xKey: 'month', yKey: 'value', color: COLORS.secondary }}
                style={{ height: getChartHeight('small') }}
              />
            ) : (
              <div className="empty-chart">Não há dados disponíveis</div>
            )}
          </div>
        </div>

        {/* Linha 4: Desempenho por corretor */}
        <div className="dashboard-row">
          <div className="card card-md">
            <div className="card-title">Leads por Corretor</div>
            {salesData.leadsByUser && salesData.leadsByUser.length > 0 ? (
              <CompactChart 
                type="bar" 
                data={salesData.leadsByUser} 
                config={{ xKey: 'name', yKey: 'value', color: COLORS.primary }}
                style={{ height: getChartHeight('small') }}
              />
            ) : (
              <div className="empty-chart">Não há dados disponíveis</div>
            )}
          </div>
          
          <div className="card card-md">
            <div className="card-title">Reuniões por Corretor</div>
            {salesData.leadsByUser && salesData.leadsByUser.length > 0 ? (
              <CompactChart 
                type="bar" 
                data={salesData.leadsByUser} 
                config={{ xKey: 'name', yKey: 'meetings', color: COLORS.secondary }}
                style={{ height: getChartHeight('small') }}
              />
            ) : (
              <div className="empty-chart">Não há dados disponíveis</div>
            )}
          </div>
          
          <div className="card card-md">
            <div className="card-title">Vendas por Corretor</div>
            {salesData.leadsByUser && salesData.leadsByUser.length > 0 ? (
              <CompactChart 
                type="bar" 
                data={salesData.leadsByUser} 
                config={{ xKey: 'name', yKey: 'sales', color: COLORS.success }}
                style={{ height: getChartHeight('small') }}
              />
            ) : (
              <div className="empty-chart">Não há dados disponíveis</div>
            )}
          </div>
        </div>

        {/* Linha 5: Taxas de conversão */}
        <div className="dashboard-row row-compact">
          <div className="card card-metrics-group wide">
            <div className="card-title">Taxas de Conversão</div>
            <div className="metrics-group">
              <MiniMetricCard
                title="Conversão em Reuniões"
                value={`${salesData.conversionRates?.meetings?.toFixed(1) || 0}%`}
                color={COLORS.primary}
              />
              <MiniMetricCard
                title="Conversão em Prospects"
                value={`${salesData.conversionRates?.prospects?.toFixed(1) || 0}%`}
                color={COLORS.secondary}
              />
              <MiniMetricCard
                title="Conversão em Vendas"
                value={`${salesData.conversionRates?.sales?.toFixed(1) || 0}%`}
                color={COLORS.success}
              />
              <MiniMetricCard
                title="Recuperados por SalesBot"
                value={salesData.salesbotRecovery || 0}
                subtitle="Leads"
                color={COLORS.tertiary}
              />
            </div>
          </div>
        </div>

        {/* Linha 6: Campos personalizados */}
        <div className="dashboard-row">
          <div className="card card-md">
            <div className="card-title">Tipo de Financiamento</div>
            {salesData.customFields && salesData.customFields.financingType && salesData.customFields.financingType.length > 0 ? (
              <CompactChart 
                type="pie" 
                data={salesData.customFields.financingType} 
                config={{ colors: [COLORS.primary, COLORS.secondary, COLORS.tertiary] }}
                style={{ height: getChartHeight('small') }}
              />
            ) : (
              <div className="empty-chart">Não há dados disponíveis</div>
            )}
          </div>
          
          <div className="card card-md">
            <div className="card-title">Finalidade do Imóvel</div>
            {salesData.customFields && salesData.customFields.propertyPurpose && salesData.customFields.propertyPurpose.length > 0 ? (
              <CompactChart 
                type="pie" 
                data={salesData.customFields.propertyPurpose} 
                config={{ colors: [COLORS.secondary, COLORS.tertiary] }}
                style={{ height: getChartHeight('small') }}
              />
            ) : (
              <div className="empty-chart">Não há dados disponíveis</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-optimized">
      <div className="dashboard-header">
        <div className="brand">
          <h1>SA IMOB</h1>
          <span className="subtitle">Kommo CRM Dashboard</span>
        </div>
        <div className="dashboard-tabs">
          <button 
            className={`tab-button ${activeTab === 'marketing' ? 'active' : ''}`} 
            onClick={() => setActiveTab('marketing')}
          >
            Marketing
          </button>
          <button 
            className={`tab-button ${activeTab === 'sales' ? 'active' : ''}`} 
            onClick={() => setActiveTab('sales')}
          >
            Vendas
          </button>
        </div>
        <div className="dashboard-actions">
          <button className="action-button" onClick={() => {
            // Exportar dados como JSON
            const dataToExport = activeTab === 'marketing' ? marketingData : salesData;
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", `${activeTab}_dashboard_${period}.json`);
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
          }}>
            <span className="icon">↓</span> Exportar
          </button>
          <button className="action-button" onClick={refreshData}>
            <span className="icon">↻</span> Atualizar
          </button>
        </div>
      </div>
      
      {activeTab === 'marketing' ? renderMarketingDashboard() : renderSalesDashboard()}
      
      <div className="dashboard-footer">
        <div className="data-timestamp">
          Dados atualizados em: {new Date().toLocaleString('pt-BR')}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;