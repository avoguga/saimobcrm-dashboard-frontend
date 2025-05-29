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
 * Componente de gráfico de pizza ECharts com melhor responsividade
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

  // Ajuste responsivo para a legenda
  const getLegendOptions = () => {
    // Em telas pequenas, sempre colocar a legenda na parte inferior
    if (window.innerWidth < 768) {
      return {
        orient: 'horizontal',
        left: 'center',
        top: 'bottom',
        itemWidth: 10,
        itemHeight: 10,
        textStyle: {
          fontSize: 10,
          color: COLORS.dark
        }
      };
    }
    
    return {
      orient: legendPosition === 'right' ? 'vertical' : 'horizontal',
      left: legendPosition === 'right' ? 'right' : 'center',
      top: legendPosition === 'top' ? 'top' : 'bottom',
      data: data.map(item => item.name),
      textStyle: {
        color: COLORS.dark
      }
    };
  };

  const option = {
    title: title ? {
      text: title,
      left: 'center',
      textStyle: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: window.innerWidth < 768 ? 14 : 16
      }
    } : undefined,
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
      confine: true // Confina o tooltip à área do gráfico
    },
    legend: getLegendOptions(),
    color: colorPalette,
    series: [
      {
        name: title || 'Distribuição',
        type: 'pie',
        radius: window.innerWidth < 480 ? ['30%', '70%'] : radius, // Raio menor para telas pequenas
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
            fontSize: window.innerWidth < 768 ? 12 : 14,
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
 * Componente de gráfico de barras ECharts com melhor responsividade
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
  
  // Ajustes responsivos
  const isSmallScreen = window.innerWidth < 768;
  const isVerySmallScreen = window.innerWidth < 480;
  
  // Truncar nomes longos em telas pequenas
  const truncateLabel = (label) => {
    if (isVerySmallScreen && typeof label === 'string' && label.length > 8) {
      return label.substring(0, 8) + '...';
    } else if (isSmallScreen && typeof label === 'string' && label.length > 12) {
      return label.substring(0, 12) + '...';
    }
    return label;
  };
  
  const processedXData = isSmallScreen ? xData.map(truncateLabel) : xData;
  
  const option = {
    title: title ? {
      text: title,
      left: 'center',
      textStyle: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: isSmallScreen ? 14 : 16
      }
    } : undefined,
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      confine: true // Confina o tooltip à área do gráfico
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: isSmallScreen ? '15%' : '3%', // Mais espaço para labels em telas pequenas
      containLabel: true
    },
    [horizontal ? 'yAxis' : 'xAxis']: {
      type: 'category',
      data: processedXData,
      axisLabel: {
        color: COLORS.dark,
        rotate: horizontal ? 0 : (isVerySmallScreen ? 45 : (isSmallScreen ? 30 : 30)),
        fontSize: isSmallScreen ? 10 : 12,
        interval: isSmallScreen ? 'auto' : 0 // Auto spacing em telas pequenas
      }
    },
    [horizontal ? 'xAxis' : 'yAxis']: {
      type: 'value',
      axisLabel: {
        color: COLORS.dark,
        fontSize: isSmallScreen ? 10 : 12
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
        barWidth: horizontal ? 20 : (isSmallScreen ? '50%' : '60%')
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
 * Componente de gráfico de linha ECharts com melhor responsividade
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
  
  // Ajustes responsivos
  const isSmallScreen = window.innerWidth < 768;
  const isVerySmallScreen = window.innerWidth < 480;
  
  // Em telas pequenas, mostrar menos pontos no eixo X
  const calculateInterval = () => {
    if (isVerySmallScreen && xData.length > 6) {
      return Math.ceil(xData.length / 4);
    }
    if (isSmallScreen && xData.length > 8) {
      return Math.ceil(xData.length / 6);
    }
    return 0; // Mostrar todos os labels
  };
  
  const option = {
    title: title ? {
      text: title,
      left: 'center',
      textStyle: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: isSmallScreen ? 14 : 16
      }
    } : undefined,
    tooltip: {
      trigger: 'axis',
      confine: true // Confina o tooltip à área do gráfico
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: isSmallScreen ? '10%' : '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xData,
      axisLabel: {
        color: COLORS.dark,
        fontSize: isSmallScreen ? 10 : 12,
        interval: calculateInterval(),
        rotate: isVerySmallScreen ? 30 : 0
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: COLORS.dark,
        fontSize: isSmallScreen ? 10 : 12
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
        symbolSize: isSmallScreen ? 4 : 6,
        itemStyle: {
          color: color
        },
        lineStyle: {
          width: isSmallScreen ? 2 : 3,
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
 * Componente de gráfico de gauge ECharts com melhor responsividade
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

  // Ajustes responsivos
  const isSmallScreen = window.innerWidth < 768;
  
  const option = {
    title: title ? {
      text: title,
      left: 'center',
      textStyle: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: isSmallScreen ? 14 : 16
      }
    } : undefined,
    tooltip: {
      formatter: '{a} <br/>{b} : {c}%',
      confine: true
    },
    series: [
      {
        name: title || 'Métrica',
        type: 'gauge',
        min: min,
        max: max,
        radius: isSmallScreen ? '90%' : '100%', // Menor para telas pequenas
        center: ['50%', '60%'], // Centraliza melhor em telas pequenas
        detail: { 
          formatter: '{value}%',
          color: COLORS.dark,
          fontSize: isSmallScreen ? 16 : 18,
          fontWeight: 'bold',
          offsetCenter: [0, '30%']
        },
        data: [{ value, name: title || 'Valor' }],
        axisLine: {
          lineStyle: {
            width: isSmallScreen ? 20 : 30,
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
 * Componente de gráfico de radar ECharts com melhor responsividade
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

  // Ajustes responsivos
  const isSmallScreen = window.innerWidth < 768;
  
  const option = {
    title: title ? {
      text: title,
      left: 'center',
      textStyle: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: isSmallScreen ? 14 : 16
      }
    } : undefined,
    tooltip: {
      confine: true
    },
    radar: {
      indicator: indicators,
      radius: isSmallScreen ? '65%' : '75%',
      splitArea: {
        areaStyle: {
          color: ['rgba(255, 255, 255, 0.5)'],
          shadowColor: 'rgba(0, 0, 0, 0.05)',
          shadowBlur: 10
        }
      },
      axisName: {
        color: COLORS.dark,
        fontSize: isSmallScreen ? 10 : 12
      }
    },
    series: [
      {
        name: title || 'Radar',
        type: 'radar',
        data: data,
        symbol: 'circle',
        symbolSize: isSmallScreen ? 4 : 6,
        itemStyle: {
          color: color
        },
        lineStyle: {
          width: isSmallScreen ? 2 : 3
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