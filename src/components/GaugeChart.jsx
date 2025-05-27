import React, { useState, useEffect } from 'react';

const GaugeChart = ({ value, min = 0, max = 100, thresholds = [33, 66] }) => {
  const [gaugeValue, setGaugeValue] = useState(0);

  // Efeito de animação ao carregar o componente
  useEffect(() => {
    const timer = setTimeout(() => {
      setGaugeValue(value);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [value]);

  // Normaliza o valor para a escala de 0-180 graus (meio círculo)
  const normalizedValue = ((gaugeValue - min) / (max - min)) * 180;
  
  // Determina a cor com base nos thresholds
  const getColor = (value) => {
    if (value < thresholds[0]) return '#ff3a5e'; // vermelho para valores baixos
    if (value < thresholds[1]) return '#ffaa5b'; // amarelo para valores médios
    return '#4ce0b3'; // verde para valores altos
  };

  const color = getColor(gaugeValue);
  
  // Calcula a posição do ponteiro
  const pointerX = 50 + 40 * Math.cos((180 - normalizedValue) * Math.PI / 180);
  const pointerY = 50 + 40 * Math.sin((180 - normalizedValue) * Math.PI / 180);

  return (
    <div className="gauge-chart">
      <svg viewBox="0 0 100 55" className="gauge">
        {/* Arco de fundo */}
        <path 
          d="M10,50 A40,40 0 0,1 90,50" 
          fill="none" 
          stroke="#444654" 
          strokeWidth="8" 
          strokeLinecap="round"
        />
        
        {/* Arco preenchido baseado no valor */}
        <path 
          d={`M10,50 A40,40 0 0,1 ${pointerX},${pointerY}`} 
          fill="none" 
          stroke={color} 
          strokeWidth="8" 
          strokeLinecap="round"
        />
        
        {/* Círculo central */}
        <circle cx="50" cy="50" r="5" fill="#333" />
        
        {/* Indicador de posição */}
        <circle cx={pointerX} cy={pointerY} r="4" fill="white" />
        
        {/* Texto do valor */}
        <text x="50" y="30" textAnchor="middle" fontSize="14" fill="white">
          {gaugeValue.toFixed(1)}%
        </text>
      </svg>
    </div>
  );
};

export default GaugeChart;