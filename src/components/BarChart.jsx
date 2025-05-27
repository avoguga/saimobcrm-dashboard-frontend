import React from 'react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const BarChart = ({ data, xKey, yKey, label, color = '#4ce0b3' }) => {
  // Verificação de dados
  if (!data || data.length === 0) {
    return <div className="no-data">Sem dados disponíveis</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <RechartsBarChart
        data={data}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#444654" />
        <XAxis 
          dataKey={xKey} 
          tick={{ fill: '#b2b2b6' }} 
          axisLine={{ stroke: '#444654' }}
          tickLine={{ stroke: '#444654' }}
        />
        <YAxis 
          tick={{ fill: '#b2b2b6' }} 
          axisLine={{ stroke: '#444654' }}
          tickLine={{ stroke: '#444654' }}
          width={30}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#333', 
            border: 'none', 
            borderRadius: '4px',
            color: 'white'
          }}
          labelStyle={{ color: 'white' }}
        />
        <Bar 
          dataKey={yKey} 
          name={label}
          fill={color} 
          radius={[4, 4, 0, 0]}
        />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};

export default BarChart;