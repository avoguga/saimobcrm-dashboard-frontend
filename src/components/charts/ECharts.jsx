// src/components/charts/ECharts.jsx
import { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import * as echarts from 'echarts';

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
  danger: '#ff3a5e'
};

// Array de cores da paleta para uso nos gráficos
const colorPalette = [
  COLORS.primary,
  COLORS.secondary,
  COLORS.tertiary,
  COLORS.success,
  COLORS.warning,
  COLORS.danger,
  COLORS.dark,
  COLORS.light
];

/**
 * Componente base para gráficos ECharts
 */
export const EChart = ({ option, style = { height: '300px', width: '100%' } }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    // Inicializar gráfico
    if (chartRef.current) {
      if (!chartInstance.current) {
        chartInstance.current = echarts.init(chartRef.current);
      }
      chartInstance.current.setOption(option, true);
    }

    // Função para redimensionar o gráfico quando a janela for redimensionada
    const handleResize = () => {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);

    // Limpar quando o componente for desmontado
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, [option]);

  return <div ref={chartRef} style={style} />;
};

EChart.propTypes = {
  option: PropTypes.object.isRequired,
  style: PropTypes.object
};

/**
 * Componente de gráfico de pizza ECharts
 */
export const EPieChart = ({ 
  title, 
  data, 
  legendPosition = 'bottom',
  radius = ['40%', '70%'],
  center = ['50%', '50%'],
  style
}) => {
  if (!data || !data.length) {
    return <div style={style || { height: '300px', width: '100%' }}>Nenhum dado disponível</div>;
  }

  const option = {
    title: title ? {
      text: title,
      left: 'center',
      textStyle: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: 16
      }
    } : undefined,
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: legendPosition === 'right' ? 'vertical' : 'horizontal',
      left: legendPosition === 'right' ? 'right' : 'center',
      top: legendPosition === 'top' ? 'top' : 'bottom',
      data: data.map(item => item.name),
      textStyle: {
        color: COLORS.dark
      }
    },
    color: colorPalette,
    series: [
      {
        name: title || 'Distribuição',
        type: 'pie',
        radius: radius,
        center: center,
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '14',
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: data
      }
    ]
  };

  return <EChart option={option} style={style} />;
};

EPieChart.propTypes = {
  title: PropTypes.string,
  data: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired
    })
  ).isRequired,
  legendPosition: PropTypes.oneOf(['top', 'bottom', 'right']),
  radius: PropTypes.array,
  center: PropTypes.array,
  style: PropTypes.object
};

/**
 * Componente de gráfico de barras ECharts
 */
export const EBarChart = ({ 
  title, 
  data, 
  xKey, 
  yKey, 
  color = COLORS.primary,
  horizontal = false,
  style
}) => {
  if (!data || !data.length) {
    return <div style={style || { height: '300px', width: '100%' }}>Nenhum dado disponível</div>;
  }
  
  // Preparar dados para o gráfico
  const xData = data.map(item => item[xKey]);
  const yData = data.map(item => item[yKey]);
  
  const option = {
    title: title ? {
      text: title,
      left: 'center',
      textStyle: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: 16
      }
    } : undefined,
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    [horizontal ? 'yAxis' : 'xAxis']: {
      type: 'category',
      data: xData,
      axisLabel: {
        color: COLORS.dark,
        rotate: horizontal ? 0 : 30
      }
    },
    [horizontal ? 'xAxis' : 'yAxis']: {
      type: 'value',
      axisLabel: {
        color: COLORS.dark
      }
    },
    series: [
      {
        name: title || yKey,
        type: 'bar',
        data: yData,
        itemStyle: {
          color: color,
          borderRadius: 4
        },
        emphasis: {
          itemStyle: {
            color: COLORS.secondary
          }
        },
        barWidth: horizontal ? 20 : '60%'
      }
    ]
  };

  return <EChart option={option} style={style} />;
};

EBarChart.propTypes = {
  title: PropTypes.string,
  data: PropTypes.array.isRequired,
  xKey: PropTypes.string.isRequired,
  yKey: PropTypes.string.isRequired,
  color: PropTypes.string,
  horizontal: PropTypes.bool,
  style: PropTypes.object
};

/**
 * Componente de gráfico de linha ECharts
 */
export const ELineChart = ({ 
  title, 
  data, 
  xKey, 
  yKey, 
  color = COLORS.primary,
  smooth = true,
  area = true,
  style
}) => {
  if (!data || !data.length) {
    return <div style={style || { height: '300px', width: '100%' }}>Nenhum dado disponível</div>;
  }
  
  // Preparar dados para o gráfico
  const xData = data.map(item => item[xKey]);
  const yData = data.map(item => item[yKey]);
  
  const option = {
    title: title ? {
      text: title,
      left: 'center',
      textStyle: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: 16
      }
    } : undefined,
    tooltip: {
      trigger: 'axis'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xData,
      axisLabel: {
        color: COLORS.dark
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: COLORS.dark
      }
    },
    series: [
      {
        name: title || yKey,
        type: 'line',
        stack: 'Total',
        data: yData,
        smooth: smooth,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: {
          color: color
        },
        lineStyle: {
          width: 3,
          color: color
        },
        areaStyle: area ? {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            {
              offset: 0,
              color: echarts.color.modifyAlpha(color, 0.6)
            },
            {
              offset: 1,
              color: echarts.color.modifyAlpha(color, 0.1)
            }
          ])
        } : undefined
      }
    ]
  };

  return <EChart option={option} style={style} />;
};

ELineChart.propTypes = {
  title: PropTypes.string,
  data: PropTypes.array.isRequired,
  xKey: PropTypes.string.isRequired,
  yKey: PropTypes.string.isRequired,
  color: PropTypes.string,
  smooth: PropTypes.bool,
  area: PropTypes.bool,
  style: PropTypes.object
};

/**
 * Componente de gráfico de gauge ECharts
 */
export const EGaugeChart = ({ 
  title, 
  value, 
  min = 0, 
  max = 100, 
  color = COLORS.primary,
  style
}) => {
  if (value === undefined || value === null) {
    return <div style={style || { height: '300px', width: '100%' }}>Nenhum dado disponível</div>;
  }

  const option = {
    title: title ? {
      text: title,
      left: 'center',
      textStyle: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: 16
      }
    } : undefined,
    tooltip: {
      formatter: '{a} <br/>{b} : {c}%'
    },
    series: [
      {
        name: title || 'Métrica',
        type: 'gauge',
        min: min,
        max: max,
        detail: { 
          formatter: '{value}%',
          color: COLORS.dark,
          fontSize: 18,
          fontWeight: 'bold'
        },
        data: [{ value, name: title || 'Valor' }],
        axisLine: {
          lineStyle: {
            width: 30,
            color: [
              [0.3, COLORS.danger],
              [0.7, COLORS.warning],
              [1, COLORS.success]
            ]
          }
        },
        pointer: {
          itemStyle: {
            color: color
          }
        }
      }
    ]
  };

  return <EChart option={option} style={style} />;
};

EGaugeChart.propTypes = {
  title: PropTypes.string,
  value: PropTypes.number.isRequired,
  min: PropTypes.number,
  max: PropTypes.number,
  color: PropTypes.string,
  style: PropTypes.object
};

/**
 * Componente de gráfico de radar ECharts
 */
export const ERadarChart = ({ 
  title, 
  indicators, 
  data, 
  color = COLORS.primary,
  style
}) => {
  if (!indicators || !indicators.length || !data || !data.length) {
    return <div style={style || { height: '300px', width: '100%' }}>Nenhum dado disponível</div>;
  }

  const option = {
    title: title ? {
      text: title,
      left: 'center',
      textStyle: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: 16
      }
    } : undefined,
    tooltip: {},
    radar: {
      indicator: indicators,
      splitArea: {
        areaStyle: {
          color: ['rgba(255, 255, 255, 0.5)'],
          shadowColor: 'rgba(0, 0, 0, 0.05)',
          shadowBlur: 10
        }
      },
      axisName: {
        color: COLORS.dark,
        fontSize: 12
      }
    },
    series: [
      {
        name: title || 'Radar',
        type: 'radar',
        data: data,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: {
          color: color
        },
        lineStyle: {
          width: 3
        },
        areaStyle: {
          color: echarts.color.modifyAlpha(color, 0.3)
        }
      }
    ]
  };

  return <EChart option={option} style={style} />;
};

ERadarChart.propTypes = {
  title: PropTypes.string,
  indicators: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      max: PropTypes.number
    })
  ).isRequired,
  data: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      value: PropTypes.array.isRequired
    })
  ).isRequired,
  color: PropTypes.string,
  style: PropTypes.object
};

export { COLORS, colorPalette };

export default {
  EChart,
  EPieChart,
  EBarChart,
  ELineChart,
  EGaugeChart,
  ERadarChart,
  COLORS,
  colorPalette
};