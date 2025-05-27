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
const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('marketing');
  const [isLoading, setIsLoading] = useState(true);
  const [marketingData, setMarketingData] = useState(null);
  const [salesData, setSalesData] = useState(null);
  const [period, setPeriod] = useState('90d');

  // Carregar dados da API
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const marketingResponse = await KommoAPI.getMarketingDashboard();
        const salesResponse = await KommoAPI.getSalesDashboard();
        
        setMarketingData(marketingResponse);
        setSalesData(salesResponse);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        // Usar dados mockados em caso de erro
        setMarketingData(KommoAPI.getMockData('/marketing/dashboard'));
        setSalesData(KommoAPI.getMockData('/sales/dashboard'));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [period]);

  // Renderizar conteúdo de loading
  if (isLoading) {
    return (
      <div className="dashboard-optimized">
        <div className="dashboard-header">
          <h1>Dashboard SA IMOB</h1>
        </div>
        <div className="loading">
          <div className="spinner"></div>
          <div className="loading-text">Carregando dados do Kommo CRM...</div>
        </div>
      </div>
    );
  }

  // Verificar se os dados foram carregados
  if (!marketingData || !salesData) {
    return (
      <div className="dashboard-optimized">
        <div className="dashboard-header">
          <h1>Dashboard SA IMOB</h1>
        </div>
        <div className="error-message">
          Erro ao carregar dados. Por favor, tente novamente mais tarde.
        </div>
      </div>
    );
  }

  // Mini card para métricas
  const MiniMetricCard = ({ title, value, subtitle, color, icon, trend, trendUp }) => {
    return (
      <div className="mini-metric-card">
        <div className="mini-metric-content">
          <div className="mini-metric-header">
            <div className="mini-metric-title">{title}</div>
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

  // Componente de gráfico compacto
  const CompactChart = ({ type, data, config, style = { height: '100%', width: '100%' } }) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);
    
    useEffect(() => {
      if (chartRef.current) {
        if (!chartInstance.current) {
          chartInstance.current = echarts.init(chartRef.current);
        }
        
        let option = {};
        
        if (type === 'line') {
          option = {
            grid: { top: 15, right: 15, bottom: 25, left: 35, containLabel: true },
            tooltip: { trigger: 'axis' },
            xAxis: {
              type: 'category',
              data: data.map(item => item[config.xKey]),
              axisLabel: { fontSize: 10 },
              axisLine: { lineStyle: { color: COLORS.light } }
            },
            yAxis: {
              type: 'value',
              axisLabel: { fontSize: 10 },
              splitLine: { lineStyle: { color: COLORS.light, opacity: 0.5 } }
            },
            series: [{
              data: data.map(item => item[config.yKey]),
              type: 'line',
              smooth: true,
              symbol: 'circle',
              symbolSize: 5,
              lineStyle: { width: 3, color: config.color || COLORS.primary },
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
          option = {
            tooltip: {
              trigger: 'item',
              formatter: '{b}: {c} ({d}%)'
            },
            legend: {
              orient: 'vertical',
              right: 10,
              top: 'center',
              itemWidth: 10,
              itemHeight: 10,
              textStyle: { fontSize: 10 }
            },
            series: [{
              type: 'pie',
              radius: ['40%', '70%'],
              center: ['30%', '50%'],
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
          option = {
            grid: { top: 15, right: 15, bottom: 25, left: 35, containLabel: true },
            tooltip: { trigger: 'axis' },
            xAxis: {
              type: 'category',
              data: data.map(item => item[config.xKey]),
              axisLabel: { fontSize: 10, interval: 0, rotate: 30 },
              axisLine: { lineStyle: { color: COLORS.light } }
            },
            yAxis: {
              type: 'value',
              axisLabel: { fontSize: 10 },
              splitLine: { lineStyle: { color: COLORS.light, opacity: 0.5 } }
            },
            series: [{
              data: data.map(item => item[config.yKey]),
              type: 'bar',
              barMaxWidth: '60%',
              itemStyle: { 
                color: config.color || COLORS.primary,
                borderRadius: [3, 3, 0, 0]
              }
            }]
          };
        } else if (type === 'gauge') {
          option = {
            series: [{
              type: 'gauge',
              startAngle: 180,
              endAngle: 0,
              min: 0,
              max: 100,
              radius: '100%',
              axisLine: {
                lineStyle: {
                  width: 20,
                  color: [
                    [0.3, COLORS.danger],
                    [0.7, COLORS.warning],
                    [1, COLORS.success]
                  ]
                }
              },
              pointer: {
                itemStyle: { color: 'inherit' },
                length: '60%',
                width: 5
              },
              axisTick: { show: false },
              splitLine: { show: false },
              axisLabel: { show: false },
              detail: {
                fontSize: 20,
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
    }, [data, type, config]);
    
    return <div ref={chartRef} style={style} />;
  };

  // Indicador NPS
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
    
    return (
      <div className="nps-indicator">
        <div className="nps-score" style={{ color }}>{score}%</div>
        <div className="nps-category" style={{ color }}>{category}</div>
        <div className="nps-breakdown">
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
            <div className="card-title">Leads - Últimos 90 dias</div>
            <div className="metrics-group">
              <MiniMetricCard
                title="Total de Leads"
                value={marketingData.totalLeads}
                color={COLORS.primary}
              />
              <MiniMetricCard
                title="Leads Facebook"
                value={marketingData.leadsBySource[0].value}
                subtitle={`${Math.round(marketingData.leadsBySource[0].value / marketingData.totalLeads * 100)}%`}
                color={COLORS.secondary}
              />
              <MiniMetricCard
                title="Leads OLX"
                value={marketingData.leadsBySource[2].value}
                subtitle={`${Math.round(marketingData.leadsBySource[2].value / marketingData.totalLeads * 100)}%`}
                color={COLORS.tertiary}
              />
            </div>
          </div>

          <div className="card card-metrics-group">
            <div className="card-title">Métricas do Facebook Ads</div>
            <div className="metrics-group">
              <MiniMetricCard
                title="Custo por Lead"
                value={`R$ ${facebookMetrics.costPerLead.toFixed(2)}`}
                color={COLORS.primary}
              />
              <MiniMetricCard
                title="CTR"
                value={`${facebookMetrics.ctr}%`}
                color={COLORS.success}
              />
              <MiniMetricCard
                title="CPC"
                value={`R$ ${facebookMetrics.cpc}`}
                color={COLORS.tertiary}
              />
            </div>
          </div>

          <div className="card card-metrics-group">
            <div className="card-title">Investimento e Alcance</div>
            <div className="metrics-group">
              <MiniMetricCard
                title="Investimento"
                value={`R$ ${Math.round(facebookMetrics.totalSpent).toLocaleString('pt-BR')}`}
                color={COLORS.secondary}
              />
              <MiniMetricCard
                title="Impressões"
                value={facebookMetrics.impressions.toLocaleString('pt-BR')}
                color={COLORS.primary}
              />
              <MiniMetricCard
                title="Alcance"
                value={facebookMetrics.reach.toLocaleString('pt-BR')}
                color={COLORS.tertiary}
              />
            </div>
          </div>
        </div>

        {/* Linha 2: Gráficos principais */}
        <div className="dashboard-row">
          <div className="card card-md">
            <div className="card-title">Leads por Fonte</div>
            <CompactChart 
              type="pie" 
              data={marketingData.leadsBySource} 
              config={{ colors: [COLORS.primary, COLORS.secondary, COLORS.tertiary, COLORS.success, COLORS.warning] }}
              style={{ height: '250px' }}
            />
          </div>
          
          <div className="card card-lg">
            <div className="card-title">Tendência de Leads (Últimos 8 meses)</div>
            <CompactChart 
              type="line" 
              data={marketingData.metricsTrend} 
              config={{ xKey: 'month', yKey: 'leads', color: COLORS.primary }}
              style={{ height: '250px' }}
            />
          </div>
        </div>

        {/* Linha 3: Tendências */}
        <div className="dashboard-row">
          <div className="card card-md">
            <div className="card-title">Tendência de CPL</div>
            <CompactChart 
              type="line" 
              data={marketingData.metricsTrend} 
              config={{ xKey: 'month', yKey: 'cpl', color: COLORS.secondary }}
              style={{ height: '200px' }}
            />
          </div>
          
          <div className="card card-md">
            <div className="card-title">Tendência de Investimento</div>
            <CompactChart 
              type="line" 
              data={marketingData.metricsTrend} 
              config={{ xKey: 'month', yKey: 'spent', color: COLORS.tertiary }}
              style={{ height: '200px' }}
            />
          </div>
          
          <div className="card card-md">
            <div className="card-title">Leads por Anúncio</div>
            <CompactChart 
              type="bar" 
              data={marketingData.leadsByAd} 
              config={{ xKey: 'name', yKey: 'value', color: COLORS.success }}
              style={{ height: '200px' }}
            />
          </div>
        </div>

        {/* Linha 4: Tags e propriedades */}
        <div className="dashboard-row">
          <div className="card card-md">
            <div className="card-title">Leads por Tag</div>
            <CompactChart 
              type="pie" 
              data={marketingData.leadsByTag} 
              config={{ colors: [COLORS.primary, COLORS.secondary, COLORS.tertiary] }}
              style={{ height: '200px' }}
            />
          </div>
          
          <div className="card card-md">
            <div className="card-title">Tipo de Imóvel</div>
            <CompactChart 
              type="pie" 
              data={marketingData.customFields.propertyType} 
              config={{ colors: [COLORS.secondary, COLORS.tertiary, COLORS.success, COLORS.warning] }}
              style={{ height: '200px' }}
            />
          </div>
          
          <div className="card card-md">
            <div className="card-title">Região de Interesse</div>
            <CompactChart 
              type="pie" 
              data={marketingData.customFields.regionInterest} 
              config={{ colors: [COLORS.primary, COLORS.secondary, COLORS.tertiary, COLORS.success] }}
              style={{ height: '200px' }}
            />
          </div>
        </div>

        {/* Linha 5: Métricas de engajamento */}
        <div className="dashboard-row row-compact">
          <div className="card card-metrics-group wide">
            <div className="card-title">Métricas de Engajamento do Facebook</div>
            <div className="metrics-group">
              <MiniMetricCard
                title="Curtidas"
                value={facebookMetrics.engagement.likes.toLocaleString('pt-BR')}
                color={COLORS.primary}
              />
              <MiniMetricCard
                title="Comentários"
                value={facebookMetrics.engagement.comments.toLocaleString('pt-BR')}
                color={COLORS.secondary}
              />
              <MiniMetricCard
                title="Compartilhamentos"
                value={facebookMetrics.engagement.shares.toLocaleString('pt-BR')}
                color={COLORS.tertiary}
              />
              <MiniMetricCard
                title="Visualizações de Vídeo"
                value={facebookMetrics.engagement.videoViews.toLocaleString('pt-BR')}
                color={COLORS.success}
              />
              <MiniMetricCard
                title="Visitas ao Perfil"
                value={facebookMetrics.engagement.profileVisits.toLocaleString('pt-BR')}
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
                value={salesData.totalLeads}
                color={COLORS.primary}
              />
              <MiniMetricCard
                title="Leads Ativos"
                value={salesData.leadsByUser.reduce((sum, user) => sum + user.active, 0)}
                subtitle={`${Math.round(salesData.leadsByUser.reduce((sum, user) => sum + user.active, 0) / salesData.totalLeads * 100)}%`}
                color={COLORS.success}
              />
              <MiniMetricCard
                title="Leads Perdidos"
                value={salesData.leadsByUser.reduce((sum, user) => sum + user.lost, 0)}
                subtitle={`${Math.round(salesData.leadsByUser.reduce((sum, user) => sum + user.lost, 0) / salesData.totalLeads * 100)}%`}
                color={COLORS.danger}
              />
            </div>
          </div>

          <div className="card card-metrics-group">
            <div className="card-title">Métricas de Conversão</div>
            <div className="metrics-group">
              <MiniMetricCard
                title="Lead Cycle"
                value={`${salesData.leadCycleTime} dias`}
                color={COLORS.secondary}
              />
              <MiniMetricCard
                title="Win Rate"
                value={`${salesData.winRate}%`}
                color={COLORS.tertiary}
              />
              <MiniMetricCard
                title="Ticket Médio"
                value={`R$ ${salesData.averageDealSize.toLocaleString('pt-BR')}`}
                color={COLORS.primary}
              />
            </div>
          </div>

          <div className="card card-gauge">
            <div className="card-title">Win Rate</div>
            <CompactChart 
              type="gauge" 
              data={[]} 
              config={{ value: salesData.winRate, name: 'Win Rate' }}
              style={{ height: '120px' }}
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
            <CompactChart 
              type="line" 
              data={salesData.salesTrend} 
              config={{ xKey: 'month', yKey: 'sales', color: COLORS.success }}
              style={{ height: '250px' }}
            />
          </div>
        </div>

        {/* Linha 3: Gráficos de funil e etapas */}
        <div className="dashboard-row">
          <div className="card card-md">
            <div className="card-title">Leads por Etapa</div>
            <CompactChart 
              type="pie" 
              data={salesData.leadsByStage} 
              config={{ colors: [COLORS.primary, COLORS.secondary, COLORS.tertiary, COLORS.success, COLORS.warning] }}
              style={{ height: '200px' }}
            />
          </div>
          
          <div className="card card-lg">
            <div className="card-title">Valor das Vendas (R$)</div>
            <CompactChart 
              type="line" 
              data={salesData.salesTrend} 
              config={{ xKey: 'month', yKey: 'value', color: COLORS.secondary }}
              style={{ height: '200px' }}
            />
          </div>
        </div>

        {/* Linha 4: Desempenho por corretor */}
        <div className="dashboard-row">
          <div className="card card-md">
            <div className="card-title">Leads por Corretor</div>
            <CompactChart 
              type="bar" 
              data={salesData.leadsByUser} 
              config={{ xKey: 'name', yKey: 'value', color: COLORS.primary }}
              style={{ height: '200px' }}
            />
          </div>
          
          <div className="card card-md">
            <div className="card-title">Reuniões por Corretor</div>
            <CompactChart 
              type="bar" 
              data={salesData.leadsByUser} 
              config={{ xKey: 'name', yKey: 'meetings', color: COLORS.secondary }}
              style={{ height: '200px' }}
            />
          </div>
          
          <div className="card card-md">
            <div className="card-title">Vendas por Corretor</div>
            <CompactChart 
              type="bar" 
              data={salesData.leadsByUser} 
              config={{ xKey: 'name', yKey: 'sales', color: COLORS.success }}
              style={{ height: '200px' }}
            />
          </div>
        </div>

        {/* Linha 5: Taxas de conversão */}
        <div className="dashboard-row row-compact">
          <div className="card card-metrics-group wide">
            <div className="card-title">Taxas de Conversão</div>
            <div className="metrics-group">
              <MiniMetricCard
                title="Conversão em Reuniões"
                value={`${salesData.conversionRates.meetings}%`}
                color={COLORS.primary}
              />
              <MiniMetricCard
                title="Conversão em Prospects"
                value={`${salesData.conversionRates.prospects}%`}
                color={COLORS.secondary}
              />
              <MiniMetricCard
                title="Conversão em Vendas"
                value={`${salesData.conversionRates.sales}%`}
                color={COLORS.success}
              />
              <MiniMetricCard
                title="Recuperados por SalesBot"
                value={salesData.salesbotRecovery}
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
            <CompactChart 
              type="pie" 
              data={salesData.customFields.financingType} 
              config={{ colors: [COLORS.primary, COLORS.secondary, COLORS.tertiary] }}
              style={{ height: '200px' }}
            />
          </div>
          
          <div className="card card-md">
            <div className="card-title">Finalidade do Imóvel</div>
            <CompactChart 
              type="pie" 
              data={salesData.customFields.propertyPurpose} 
              config={{ colors: [COLORS.secondary, COLORS.tertiary] }}
              style={{ height: '200px' }}
            />
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
          <button className="action-button">
            <span className="icon">↓</span> Exportar
          </button>
          <button className="action-button">
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
};

export default Dashboard;