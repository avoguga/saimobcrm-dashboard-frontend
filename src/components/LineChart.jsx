import React from 'react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const LineChart = ({ data, xKey, yKey, label, color = '#4ce0b3' }) => {
  // Verificação de dados
  if (!data || data.length === 0) {
    return <div className="no-data">Sem dados disponíveis</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <RechartsLineChart
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
        <Line 
          type="monotone" 
          dataKey={yKey} 
          name={label}
          stroke={color} 
          strokeWidth={2}
          dot={{ stroke: color, strokeWidth: 2, r: 4 }}
          activeDot={{ stroke: 'white', strokeWidth: 2, r: 6 }}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
};

export default LineChart;