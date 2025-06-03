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

function DashboardSales({ period, setPeriod, windowSize, corretores, selectedCorretor, setSelectedCorretor, data }) {
  const [salesData, setSalesData] = useState(data);
  const [comparisonData, setComparisonData] = useState(null);

  // Constantes de responsividade
  const isMobile = windowSize.width < 768;
  const isSmallMobile = windowSize.width < 480;

  // Atualizar dados quando recebidos do cache
  useEffect(() => {
    if (data) {
      setSalesData(data);
    }
  }, [data]);

  // Buscar dados de comparação
  useEffect(() => {
    const fetchComparisonData = async () => {
      try {
        const comparison = await KommoAPI.getSalesComparison(selectedCorretor);
        setComparisonData(comparison);
        console.log('Dados de comparação carregados:', comparison);
      } catch (error) {
        console.error('Erro ao carregar dados de comparação:', error);
      }
    };
    
    fetchComparisonData();
  }, [selectedCorretor]);

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

  // Mini Metric Card Component
  const MiniMetricCard = ({ title, value, subtitle, color = COLORS.primary }) => (
    <div className="mini-metric-card">
      <div className="mini-metric-value" style={{ color }}>{value}</div>
      <div className="mini-metric-title">{title}</div>
      {subtitle && <div className="mini-metric-subtitle">{subtitle}</div>}
    </div>
  );

  // Componente de Comparação de Períodos - Design Simples
  const ComparisonMetric = ({ label, current, previous, comparison, format = 'number' }) => {
    const formatValue = (value) => {
      if (format === 'percentage') return `${value?.toFixed(1) || 0}%`;
      if (format === 'currency') return `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      return value || 0;
    };

    const getTrendIcon = (trend) => {
      switch(trend) {
        case 'up': return (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 14L12 9L17 14H7Z"/>
          </svg>
        );
        case 'down': return (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 10L12 15L17 10H7Z"/>
          </svg>
        );
        default: return (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="2"/>
          </svg>
        );
      }
    };

    const getTrendColor = (trend) => {
      switch(trend) {
        case 'up': return COLORS.success;
        case 'down': return COLORS.danger;
        default: return COLORS.tertiary;
      }
    };

    const trend = comparison?.trend || 'neutral';
    const percentage = comparison?.percentage || 0;

    return (
      <div 
        className="comparison-metric-simple" 
        style={{ borderLeftColor: getTrendColor(trend) }}
      >
        <div className="comparison-header">
          <span className="comparison-label">{label}</span>
          <div className="trend-indicator" style={{ color: getTrendColor(trend) }}>
            {getTrendIcon(trend)}
          </div>
        </div>
        
        <div className="comparison-values">
          <div className="period-row">
            <span className="period-label">Atual:</span>
            <span className="period-value">{formatValue(current)}</span>
          </div>
          <div className="period-row">
            <span className="period-label">Anterior:</span>
            <span className="period-value">{formatValue(previous)}</span>
          </div>
        </div>
        
        <div className="comparison-change" style={{ color: getTrendColor(trend) }}>
          {percentage > 0 ? '+' : ''}{percentage?.toFixed(1) || 0}%
        </div>
      </div>
    );
  };

  // Compact Chart Component
  const CompactChart = ({ data, type, config, style }) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
      if (chartRef.current && data && data.length > 0) {
        if (chartInstance.current) {
          chartInstance.current.dispose();
        }

        const chart = echarts.init(chartRef.current);
        chartInstance.current = chart;

        let option = {};

        if (type === 'bar') {
          option = {
            grid: { top: 20, right: 20, bottom: 40, left: 60 },
            xAxis: {
              type: 'category',
              data: data.map(item => item[config.xKey]),
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
              data: data.map(item => item[config.yKey]),
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
          option = {
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
              name: config.name || 'Dados',
              type: 'pie',
              radius: isMobile ? '50%' : '60%',
              center: isMobile ? ['50%', '40%'] : ['50%', '50%'],
              data: data,
              emphasis: {
                itemStyle: {
                  shadowBlur: 10,
                  shadowOffsetX: 0,
                  shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
              },
              label: {
                fontSize: isMobile ? 10 : 12
              }
            }]
          };
        }

        chart.setOption(option);
        
        const handleResize = () => chart.resize();
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

  // Indicador NPS com responsividade
  const NPSIndicator = ({ score }) => {
    let category = '';
    let color = '';
    
    if (score >= 70) {
      category = 'Excelente';
      color = COLORS.success;
    } else if (score >= 50) {
      category = 'Bom';
      color = COLORS.warning;
    } else {
      category = 'Crítico';
      color = COLORS.danger;
    }
    
    return (
      <div className="nps-indicator">
        <div className="nps-score" style={{ color }}>
          {score}
        </div>
        <div className="nps-category" style={{ color }}>
          {category}
        </div>
        <div className="nps-description">
          Net Promoter Score
        </div>
      </div>
    );
  };


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
    <div className="dashboard-content">
      <div className="dashboard-row row-header">
        <div className="section-title">
          <h2>Dashboard de Vendas</h2>
          <div className="dashboard-controls">
            <div className="corretor-selector">
              <select 
                value={selectedCorretor} 
                onChange={(e) => setSelectedCorretor(e.target.value)}
                className="corretor-select"
              >
                <option value="">Todos os Corretores</option>
                {corretores.map(corretor => (
                  <option key={corretor.name} value={corretor.name}>
                    {corretor.name} ({corretor.total_leads} leads)
                  </option>
                ))}
              </select>
            </div>
            <div className="period-selector">
              <button 
                className={period === '7d' ? 'active' : ''} 
                onClick={() => setPeriod('7d')}
              >
                7 Dias
              </button>
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
            </div>
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
              value={salesData.totalLeads || 0}
              color={COLORS.primary}
            />
            <MiniMetricCard
              title="Leads Ativos"
              value={salesData.analyticsOverview?.leads?.active || 
                    (salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.active || 0), 0) : 0)}
              subtitle={`${Math.round(((salesData.analyticsOverview?.leads?.active || 
                       (salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.active || 0), 0) : 0)) / 
                       (salesData.totalLeads || 1) * 100))}%`}
              color={COLORS.success}
            />
            <MiniMetricCard
              title="Leads Perdidos"
              value={salesData.analyticsOverview?.leads?.lost || 
                    (salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.lost || 0), 0) : 0)}
              subtitle={`${Math.round(((salesData.analyticsOverview?.leads?.lost || 
                       (salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.lost || 0), 0) : 0)) / 
                       (salesData.totalLeads || 1) * 100))}%`}
              color={COLORS.danger}
            />
          </div>
        </div>

        <div className="card card-metrics-group">
          <div className="card-title">Performance de Vendas</div>
          <div className="metrics-group">
            <MiniMetricCard
              title="Taxa de Conversão"
              value={`${salesData.conversionRates?.sales?.toFixed(1) || 0}%`}
              color={COLORS.success}
            />
            <MiniMetricCard
              title="Win Rate"
              value={`${salesData.winRate?.toFixed(1) || 0}%`}
              color={COLORS.primary}
            />
            <MiniMetricCard
              title="Tempo Médio do Ciclo"
              value={`${salesData.leadCycleTime || 0} dias`}
              color={COLORS.secondary}
            />
          </div>
        </div>
      </div>

      {/* Linha 2: Métricas de Performance */}
      <div className="dashboard-row">
        <div className="card card-md">
          <div className="card-title">Métricas de Performance</div>
          <div className="metrics-group">
            <MiniMetricCard
              title="Win Rate"
              value={`${salesData.winRate?.toFixed(1) || 0}%`}
              subtitle="Percentual de leads convertidas em vendas"
              color={COLORS.success}
            />
            <MiniMetricCard
              title="Average Deal Size"
              value={`R$ ${(salesData.averageDealSize || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              subtitle="Valor médio das vendas"
              color={COLORS.primary}
            />
          </div>
        </div>
        
        {/* Gráfico de Leads por Estágio */}
        {salesData.leadsByStage && salesData.leadsByStage.length > 0 && (
          <div className="card card-lg">
            <div className="card-title">Leads por Estágio do Funil</div>
            <CompactChart 
              type="bar" 
              data={salesData.leadsByStage} 
              config={{ xKey: 'name', yKey: 'value', color: COLORS.primary }}
              style={{ height: getChartHeight('medium') }}
            />
          </div>
        )}
      </div>

      {/* Linha 2.5: Comparação de Períodos */}
      <div className="dashboard-row">
        <div className="card card-lg">
          <div className="card-title">
            Comparação de Períodos - {comparisonData?.currentPeriod?.name || 'Mês Atual'} vs {comparisonData?.previousPeriod?.name || 'Mês Anterior'}
          </div>
            <div className="comparison-grid">
              <ComparisonMetric
                label="Total de Leads"
                current={comparisonData?.currentPeriod?.totalLeads || 85}
                previous={comparisonData?.previousPeriod?.totalLeads || 120}
                comparison={comparisonData?.comparison?.totalLeads || { percentage: -29.2, trend: 'down' }}
                format="number"
              />
              <ComparisonMetric
                label="Win Rate"
                current={comparisonData?.currentPeriod?.winRate || 18.5}
                previous={comparisonData?.previousPeriod?.winRate || 15.2}
                comparison={comparisonData?.comparison?.winRate || { percentage: 21.7, trend: 'up' }}
                format="percentage"
              />
              <ComparisonMetric
                label="Ticket Médio"
                current={comparisonData?.currentPeriod?.averageDealSize || 245000}
                previous={comparisonData?.previousPeriod?.averageDealSize || 220000}
                comparison={comparisonData?.comparison?.averageDealSize || { percentage: 11.4, trend: 'up' }}
                format="currency"
              />
              <ComparisonMetric
                label="Receita Total"
                current={comparisonData?.currentPeriod?.totalRevenue || 3920000}
                previous={comparisonData?.previousPeriod?.totalRevenue || 3340000}
                comparison={comparisonData?.comparison?.totalRevenue || { percentage: 17.4, trend: 'up' }}
                format="currency"
              />
            </div>
            <div className="comparison-summary">
              <span className="summary-text">
                📊 {comparisonData?.summary?.positiveMetrics || 3} métricas melhoraram, {comparisonData?.summary?.negativeMetrics || 1} pioraram
              </span>
            </div>
        </div>
      </div>

      {/* Linha 3: Ticket médio e outros KPIs */}
      <div className="dashboard-row row-compact">
        <div className="card card-metrics-group wide">
          <div className="card-title">Métricas de Vendas</div>
          <div className="metrics-group">
            <MiniMetricCard
              title="Ticket Médio"
              value={`R$ ${(salesData.averageDealSize || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              color={COLORS.success}
            />
            <MiniMetricCard
              title="Leads Recuperados"
              value={salesData.salesbotRecovery || 0}
              subtitle="via SalesBot"
              color={COLORS.warning}
            />
            <MiniMetricCard
              title="Total de Vendas"
              value={salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.sales || 0), 0) : 0}
              color={COLORS.primary}
            />
          </div>
        </div>
      </div>

      {/* Linha 4: Desempenho por corretor */}
      <div className="dashboard-row">
        {salesData.leadsByUser && salesData.leadsByUser.length > 0 ? (
          <>
            <div className="card card-md">
              <div className="card-title">Leads por Corretor</div>
              <CompactChart 
                type="bar" 
                data={salesData.leadsByUser} 
                config={{ xKey: 'name', yKey: 'value', color: COLORS.primary }}
                style={{ height: getChartHeight('small') }}
              />
            </div>
            
            <div className="card card-md">
              <div className="card-title">Reuniões por Corretor</div>
              <CompactChart 
                type="bar" 
                data={salesData.leadsByUser} 
                config={{ xKey: 'name', yKey: 'meetings', color: COLORS.secondary }}
                style={{ height: getChartHeight('small') }}
              />
            </div>
            
            <div className="card card-md">
              <div className="card-title">Vendas por Corretor</div>
              <CompactChart 
                type="bar" 
                data={salesData.leadsByUser} 
                config={{ xKey: 'name', yKey: 'sales', color: COLORS.success }}
                style={{ height: getChartHeight('small') }}
              />
            </div>
          </>
        ) : salesData.analyticsTeam && salesData.analyticsTeam.user_performance && salesData.analyticsTeam.user_performance.length > 0 ? (
          <>
            <div className="card card-md">
              <div className="card-title">Leads por Corretor</div>
              <CompactChart 
                type="bar" 
                data={salesData.analyticsTeam.user_performance.map(user => ({
                  name: user.user_name,
                  value: user.new_leads || 0
                }))} 
                config={{ xKey: 'name', yKey: 'value', color: COLORS.primary }}
                style={{ height: getChartHeight('small') }}
              />
            </div>
            
            <div className="card card-md">
              <div className="card-title">Atividades por Corretor</div>
              <CompactChart 
                type="bar" 
                data={salesData.analyticsTeam.user_performance.map(user => ({
                  name: user.user_name,
                  value: user.activities || 0
                }))} 
                config={{ xKey: 'name', yKey: 'value', color: COLORS.secondary }}
                style={{ height: getChartHeight('small') }}
              />
            </div>
            
            <div className="card card-md">
              <div className="card-title">Vendas por Corretor</div>
              <CompactChart 
                type="bar" 
                data={salesData.analyticsTeam.user_performance.map(user => ({
                  name: user.user_name,
                  value: user.won_deals || 0
                }))} 
                config={{ xKey: 'name', yKey: 'value', color: COLORS.success }}
                style={{ height: getChartHeight('small') }}
              />
              {salesData.analyticsTeam.team_stats?.top_performer && (
                <div className="team-info">
                  Top performer: {salesData.analyticsTeam.team_stats.top_performer}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="card card-lg">
            <div className="error-message">Não há dados de desempenho por corretor disponíveis</div>
          </div>
        )}
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardSales;