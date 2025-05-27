import React from 'react';

const SatisfactionChart = ({ data = [] }) => {
  // Dados padrão se nenhum for fornecido
  const defaultData = [
    { label: 'Muito Satisfeito', percentage: 24, color: '#4ce0b3' },
    { label: 'Satisfeito', percentage: 35, color: '#2eabe0' },
    { label: 'Neutro', percentage: 20, color: '#ffaa5b' },
    { label: 'Insatisfeito', percentage: 15, color: '#ff725e' },
    { label: 'Muito Insatisfeito', percentage: 6, color: '#ff3a5e' }
  ];

  const chartData = data.length > 0 ? data : defaultData;
  
  return (
    <div className="satisfaction-chart">
      <div className="chart-bars">
        {chartData.map((item, index) => (
          <div className="chart-item" key={index}>
            <div className="percentage-label">{item.percentage}%</div>
            <div 
              className="bar" 
              style={{ 
                height: `${item.percentage * 1.8}px`,
                backgroundColor: item.color 
              }}
            />
            <div className="bar-label">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SatisfactionChart;