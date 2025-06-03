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

function DashboardMarketing({ period, setPeriod, windowSize, data }) {
  const [marketingData, setMarketingData] = useState(data);

  // Constantes de responsividade
  const isMobile = windowSize.width < 768;
  const isSmallMobile = windowSize.width < 480;

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
        } else if (type === 'line') {
          option = {
            grid: { top: 20, right: 20, bottom: 40, left: 60 },
            xAxis: {
              type: 'category',
              data: data.map(item => item[config.xKey]),
              axisLabel: { 
                fontSize: isMobile ? 9 : 11,
                rotate: isMobile ? 45 : 0
              }
            },
            yAxis: {
              type: 'value',
              axisLabel: { fontSize: isMobile ? 10 : 12 }
            },
            series: [{
              data: data.map(item => item[config.yKey]),
              type: 'line',
              smooth: true,
              itemStyle: { color: config.color },
              lineStyle: { color: config.color, width: 2 }
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
    <div className="dashboard-content">
      <div className="dashboard-row row-header">
        <div className="section-title">
          <h2>Dashboard de Marketing</h2>
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
              value={`R$ ${facebookMetrics.costPerLead?.toFixed(2) || '0,00'}`}
              color={COLORS.primary}
            />
            <MiniMetricCard
              title="CTR"
              value={`${(facebookMetrics.ctr || 0).toFixed(2)}%`}
              color={COLORS.success}
            />
            <MiniMetricCard
              title="CPC"
              value={`R$ ${(facebookMetrics.cpc || 0).toFixed(2)}`}
              color={COLORS.tertiary}
            />
          </div>
        </div>
      </div>

      {/* Linha 2: Gráficos de distribuição de leads */}
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
        
        {marketingData.leadsByTag && marketingData.leadsByTag.length > 0 && (
          <div className="card card-md">
            <div className="card-title">Leads por Tag</div>
            <CompactChart 
              type="bar" 
              data={marketingData.leadsByTag} 
              config={{ xKey: 'name', yKey: 'value', color: COLORS.secondary }}
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
            <MiniMetricCard
              title="Impressões"
              value={(facebookMetrics.impressions || 0).toLocaleString('pt-BR')}
              color={COLORS.primary}
            />
            <MiniMetricCard
              title="Alcance"
              value={(facebookMetrics.reach || 0).toLocaleString('pt-BR')}
              color={COLORS.secondary}
            />
            <MiniMetricCard
              title="Cliques"
              value={(facebookMetrics.clicks || 0).toLocaleString('pt-BR')}
              color={COLORS.tertiary}
            />
            <MiniMetricCard
              title="Gasto Total"
              value={`R$ ${(facebookMetrics.totalSpent || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              color={COLORS.warning}
            />
          </div>
        </div>
      </div>

      {/* Linha 4: Engajamento */}
      <div className="dashboard-row">
        <div className="card card-lg">
          <div className="card-title">Engajamento nas Redes Sociais</div>
          <div className="metrics-grid">
            <MiniMetricCard
              title="Curtidas"
              value={(facebookMetrics.engagement?.likes || 0).toLocaleString('pt-BR')}
              color={COLORS.success}
            />
            <MiniMetricCard
              title="Comentários"
              value={(facebookMetrics.engagement?.comments || 0).toLocaleString('pt-BR')}
              color={COLORS.primary}
            />
            <MiniMetricCard
              title="Compartilhamentos"
              value={(facebookMetrics.engagement?.shares || 0).toLocaleString('pt-BR')}
              color={COLORS.secondary}
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
}

export default DashboardMarketing;