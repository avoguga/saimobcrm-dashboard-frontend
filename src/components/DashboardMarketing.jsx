import { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import LoadingSpinner from './LoadingSpinner';
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

function DashboardMarketing({ period, setPeriod, windowSize, selectedSource, setSelectedSource, sourceOptions, data, isLoading, isUpdating, customPeriod, setCustomPeriod, showCustomPeriod, setShowCustomPeriod, handlePeriodChange, applyCustomPeriod }) {
  const [marketingData, setMarketingData] = useState(data);

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

  // Atualizar dados quando recebidos do cache
  useEffect(() => {
    if (data) {
      setMarketingData(data);
    }
  }, [data]);

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

  // Mini metric card with trend
  const MiniMetricCardWithTrend = ({ title, value, current, previous, color = COLORS.primary, subtitle }) => {
    const getTrendInfo = () => {
      if (!previous || previous === 0) return { text: '', color: COLORS.tertiary, bg: 'rgba(117, 119, 123, 0.1)', border: 'rgba(117, 119, 123, 0.3)' };
      
      const change = current - previous;
      const percentage = (change / previous) * 100;
      
      return {
        text: `${change > 0 ? '+' : ''}${change.toLocaleString('pt-BR')} (${percentage > 0 ? '+' : ''}${percentage.toFixed(1)}%)`,
        color: change > 0 ? COLORS.success : change < 0 ? COLORS.danger : COLORS.tertiary,
        bg: change > 0 ? 'rgba(76, 224, 179, 0.1)' : change < 0 ? 'rgba(255, 58, 94, 0.1)' : 'rgba(117, 119, 123, 0.1)',
        border: change > 0 ? 'rgba(76, 224, 179, 0.3)' : change < 0 ? 'rgba(255, 58, 94, 0.3)' : 'rgba(117, 119, 123, 0.3)'
      };
    };

    const trendInfo = getTrendInfo();

    return (
      <div className="mini-metric-card">
        <div className="mini-metric-header">
          <div className="mini-metric-title" title={title}>{title}</div>
        </div>
        <div className="mini-metric-content">
          <div className="mini-metric-value" style={{ color }}>{value}</div>
          {subtitle && <div className="mini-metric-subtitle">{subtitle}</div>}
          {trendInfo.text && (
            <div 
              className="mini-metric-trend" 
              style={{ 
                color: trendInfo.color,
                background: trendInfo.bg,
                border: `1px solid ${trendInfo.border}`,
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '10px'
              }}
            >
              {trendInfo.text}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Compact Chart Component
  const CompactChart = ({ type, data, config, style }) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
      if (!chartRef.current || !data || data.length === 0) {
        return;
      }

      if (!chartInstance.current) {
        chartInstance.current = echarts.init(chartRef.current);
      }

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
            radius: isMobile ? ['20%', '50%'] : ['25%', '60%'],
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
              fontSize: isMobile ? 10 : 12,
              formatter: '{b}\n{c} ({d}%)'
            },
            labelLine: {
              show: !isMobile
            }
          }]
        };
      } else if (type === 'line') {
        option = {
          grid: { top: 20, right: 20, bottom: 40, left: 60 },
          xAxis: {
            type: 'category',
            data: data.map(item => item[config.xKey]),
            axisLabel: { fontSize: isMobile ? 10 : 12 }
          },
          yAxis: {
            type: 'value',
            axisLabel: { fontSize: isMobile ? 10 : 12 }
          },
          series: [{
            data: data.map(item => item[config.yKey]),
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

      chartInstance.current.setOption(option, true);
    }, [data, type, config]);
    
    return <div ref={chartRef} style={style} />;
  };

  // Se está carregando, mostrar loading spinner
  if (isLoading) {
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

  const facebookMetrics = marketingData.facebookMetrics;

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
                  📅 Personalizado
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Linha 1: KPIs principais */}
      <div className="dashboard-row row-compact">
        <div className="card card-metrics-group">
          <div className="card-title">Leads - Últimos {period.replace('d','')} dias</div>
          <div className="metrics-group">
            <MiniMetricCardWithTrend
              title="Total de Leads"
              value={marketingData.totalLeads || 0}
              current={marketingData.totalLeads || 0}
              previous={marketingData.previousPeriodLeads || 0}
              color={COLORS.primary}
            />
            {marketingData.leadsBySource && marketingData.leadsBySource.length > 0 && (
              <>
                <MiniMetricCardWithTrend
                  title="Leads Facebook"
                  value={marketingData.leadsBySource.find(src => src.name.includes('Facebook'))?.value || 0}
                  current={marketingData.leadsBySource.find(src => src.name.includes('Facebook'))?.value || 0}
                  previous={marketingData.previousFacebookLeads || 0}
                  subtitle={`${Math.round((marketingData.leadsBySource.find(src => src.name.includes('Facebook'))?.value || 0) / marketingData.totalLeads * 100)}%`}
                  color={COLORS.secondary}
                />
                <MiniMetricCardWithTrend
                  title="Leads OLX"
                  value={marketingData.leadsBySource.find(src => src.name.includes('OLX'))?.value || 0}
                  current={marketingData.leadsBySource.find(src => src.name.includes('OLX'))?.value || 0}
                  previous={marketingData.previousOlxLeads || 0}
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
            <MiniMetricCardWithTrend
              title="Custo por Lead"
              value={`R$ ${facebookMetrics.costPerLead?.toFixed(2) || '0,00'}`}
              current={facebookMetrics.costPerLead || 0}
              previous={marketingData.previousFacebookMetrics?.costPerLead || 0}
              color={COLORS.primary}
            />
            <MiniMetricCardWithTrend
              title="CTR"
              value={`${(facebookMetrics.ctr || 0).toFixed(2)}%`}
              current={facebookMetrics.ctr || 0}
              previous={marketingData.previousFacebookMetrics?.ctr || 0}
              color={COLORS.secondary}
            />
            <MiniMetricCardWithTrend
              title="CPC"
              value={`R$ ${(facebookMetrics.cpc || 0).toFixed(2)}`}
              current={facebookMetrics.cpc || 0}
              previous={marketingData.previousFacebookMetrics?.cpc || 0}
              color={COLORS.tertiary}
            />
          </div>
        </div>
      </div>

      {/* Linha 2: Gráficos */}
      <div className="dashboard-row">
        {marketingData.leadsBySource && marketingData.leadsBySource.length > 0 && (
          <div className="card card-md">
            <div className="card-title">Leads por Fonte</div>
            <CompactChart 
              type="pie" 
              data={marketingData.leadsBySource} 
              config={{ name: 'Leads por Fonte' }}
              style={{ height: getChartHeight('medium') }}
            />
          </div>
        )}

        {marketingData.leadsByAd && marketingData.leadsByAd.length > 0 && (
          <div className="card card-md">
            <div className="card-title">Leads por Anúncio</div>
            <CompactChart 
              type="bar" 
              data={marketingData.leadsByAd} 
              config={{ xKey: 'name', yKey: 'value', color: COLORS.tertiary }}
              style={{ height: getChartHeight('medium') }}
            />
          </div>
        )}
      </div>

      {/* Linha 3: Tendência e métricas do Facebook */}
      <div className="dashboard-row">
        {marketingData.metricsTrend && marketingData.metricsTrend.length > 0 && (
          <div className="card card-lg">
            <div className="card-title">Tendência de Leads</div>
            <CompactChart 
              type="line" 
              data={marketingData.metricsTrend} 
              config={{ xKey: 'month', yKey: 'leads', color: COLORS.primary }}
              style={{ height: getChartHeight('large') }}
            />
          </div>
        )}
        
        <div className="card card-sm">
          <div className="card-title">Métricas Detalhadas</div>
          <div className="metrics-grid">
            <MiniMetricCardWithTrend
              title="Impressões"
              value={(facebookMetrics.impressions || 0).toLocaleString('pt-BR')}
              current={facebookMetrics.impressions || 0}
              previous={marketingData.previousFacebookMetrics?.impressions || 0}
              color={COLORS.primary}
            />
            <MiniMetricCardWithTrend
              title="Alcance"
              value={(facebookMetrics.reach || 0).toLocaleString('pt-BR')}
              current={facebookMetrics.reach || 0}
              previous={marketingData.previousFacebookMetrics?.reach || 0}
              color={COLORS.secondary}
            />
            <MiniMetricCardWithTrend
              title="Cliques"
              value={(facebookMetrics.clicks || 0).toLocaleString('pt-BR')}
              current={facebookMetrics.clicks || 0}
              previous={marketingData.previousFacebookMetrics?.clicks || 0}
              color={COLORS.tertiary}
            />
            <MiniMetricCardWithTrend
              title="Curtidas"
              value={(facebookMetrics.engagement?.likes || 0).toLocaleString('pt-BR')}
              current={facebookMetrics.engagement?.likes || 0}
              previous={marketingData.previousFacebookMetrics?.engagement?.likes || 0}
              color={COLORS.success}
            />
            <MiniMetricCardWithTrend
              title="Comentários"
              value={(facebookMetrics.engagement?.comments || 0).toLocaleString('pt-BR')}
              current={facebookMetrics.engagement?.comments || 0}
              previous={marketingData.previousFacebookMetrics?.engagement?.comments || 0}
              color={COLORS.warning}
            />
            <MiniMetricCardWithTrend
              title="Compartilhamentos"
              value={(facebookMetrics.engagement?.shares || 0).toLocaleString('pt-BR')}
              current={facebookMetrics.engagement?.shares || 0}
              previous={marketingData.previousFacebookMetrics?.engagement?.shares || 0}
              color={COLORS.danger}
            />
            <MiniMetricCardWithTrend
              title="Visualizações de Vídeo"
              value={(facebookMetrics.engagement?.videoViews || 0).toLocaleString('pt-BR')}
              current={facebookMetrics.engagement?.videoViews || 0}
              previous={marketingData.previousFacebookMetrics?.engagement?.videoViews || 0}
              color={COLORS.success}
            />
            <MiniMetricCardWithTrend
              title="Visitas ao Perfil"
              value={(facebookMetrics.engagement?.profileVisits || 0).toLocaleString('pt-BR')}
              current={facebookMetrics.engagement?.profileVisits || 0}
              previous={marketingData.previousFacebookMetrics?.engagement?.profileVisits || 0}
              color={COLORS.warning}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardMarketing;