import React from 'react';

// Cores da SA IMOB
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

const MetricCard = ({ 
  title, 
  value, 
  subtitle, 
  color = COLORS.primary, 
  current, 
  previous,
  showTrend = false,
  size = 'normal' // 'normal', 'mini'
}) => {
  const getTrendInfo = () => {
    if (!showTrend || !previous || previous === 0) {
      return { text: '', color: COLORS.tertiary, bg: 'rgba(117, 119, 123, 0.1)', border: 'rgba(117, 119, 123, 0.3)' };
    }
    
    const change = ((current - previous) / previous * 100).toFixed(1);
    const isPositive = change >= 0;
    
    return {
      text: `${isPositive ? '+' : ''}${change}%`,
      icon: isPositive ? '↗' : '↘',
      color: isPositive ? COLORS.success : COLORS.danger,
      bg: isPositive ? 'rgba(76, 224, 179, 0.15)' : 'rgba(255, 58, 94, 0.15)',
      border: isPositive ? 'rgba(76, 224, 179, 0.3)' : 'rgba(255, 58, 94, 0.3)'
    };
  };

  const trendInfo = getTrendInfo();

  if (size === 'mini') {
    return (
      <div className="mini-metric-card">
        <div className="mini-metric-value" style={{ color }}>{value}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
          <div className="mini-metric-title">{title}</div>
          {showTrend && trendInfo.text && (
            <div 
              className={`trend-tag-square ${(current - previous) < 0 ? 'negative' : ''}`}
              style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '2px',
                padding: '8px',
                borderRadius: '8px',
                backgroundColor: trendInfo.bg,
                border: `1px solid ${trendInfo.border}`,
                color: trendInfo.color,
                fontWeight: '600',
                fontSize: '10px',
                minWidth: '40px',
                minHeight: '40px',
                boxShadow: `0 2px 4px ${trendInfo.bg}60`,
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ fontSize: '16px', lineHeight: 1 }}>
                {trendInfo.icon}
              </span>
              <span style={{ lineHeight: 1, fontSize: '13px', fontWeight: '700' }}>
                {trendInfo.text}
              </span>
            </div>
          )}
        </div>
        {subtitle && <div className="mini-metric-subtitle">{subtitle}</div>}
        
        <style jsx>{`
          .mini-metric-card {
            background: white;
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            border: 1px solid #e0e0e0;
            transition: all 0.3s ease;
            height: 100%;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .mini-metric-card:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
            transform: translateY(-2px);
          }

          .mini-metric-value {
            font-size: 24px;
            font-weight: 700;
            line-height: 1.1;
          }

          .mini-metric-title {
            font-size: 14px;
            color: #4E5859;
            font-weight: 600;
          }

          .mini-metric-subtitle {
            font-size: 12px;
            color: #75777B;
            margin-top: auto;
          }

          .trend-tag-square:hover {
            transform: scale(1.1);
            box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
          }

          .trend-tag-square {
            cursor: default;
            user-select: none;
            flex-shrink: 0;
          }
        `}</style>
      </div>
    );
  }

  // Metric card normal
  return (
    <div className="metric-card">
      <div className="metric-value" style={{ color }}>{value}</div>
      <div className="metric-title">{title}</div>
      {subtitle && <div className="metric-subtitle">{subtitle}</div>}
      {showTrend && trendInfo.text && (
        <div 
          className="metric-trend"
          style={{ 
            backgroundColor: trendInfo.bg,
            color: trendInfo.color,
            border: `1px solid ${trendInfo.border}`
          }}
        >
          <span className="trend-icon">{trendInfo.icon}</span>
          <span className="trend-text">{trendInfo.text}</span>
        </div>
      )}
      
      <style jsx>{`
        .metric-card {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          border: 1px solid #e0e0e0;
          transition: all 0.3s ease;
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .metric-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
          transform: translateY(-2px);
        }

        .metric-value {
          font-size: 32px;
          font-weight: 700;
          line-height: 1.1;
        }

        .metric-title {
          font-size: 16px;
          color: #4E5859;
          font-weight: 600;
        }

        .metric-subtitle {
          font-size: 14px;
          color: #75777B;
          margin-top: auto;
        }

        .metric-trend {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 14px;
          margin-top: auto;
        }

        .trend-icon {
          font-size: 16px;
          font-weight: bold;
        }

        .trend-text {
          font-size: 14px;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
};

export default MetricCard;