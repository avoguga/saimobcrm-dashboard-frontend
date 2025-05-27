import React from 'react';
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const PieChart = ({ data, innerRadius = 0, outerRadius = '70%', colors = ['#4E5859', '#96856F', '#75777B', '#212121', '#C1C5C9'] }) => {
  // Verificação de dados
  if (!data || data.length === 0) {
    return <div className="no-data">Sem dados disponíveis</div>;
  }

  // Garantir que haja cores suficientes para todos os dados
  const getColor = (index) => {
    return colors[index % colors.length];
  };

  return (
    <ResponsiveContainer width="100%" height={200}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          dataKey="value"
          nameKey="name"
          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getColor(index)} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value) => [`${value}`, 'Quantidade']}
          contentStyle={{ 
            backgroundColor: '#fff', 
            border: '1px solid #e0e0e0', 
            borderRadius: '4px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
          }}
        />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
};

export default PieChart;