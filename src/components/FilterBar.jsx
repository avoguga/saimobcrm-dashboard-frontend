import { useState, useEffect, useCallback } from 'react';
import './FilterBar.css';

const FilterBar = ({ 
  onFilterChange, 
  dashboardType, 
  pipelines = [], 
  sources = [],
  users = []
}) => {
  // Estados para os filtros
  const [dateRange, setDateRange] = useState('30');
  const [pipeline, setPipeline] = useState('all');
  const [source, setSource] = useState('all');
  const [user, setUser] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDates, setShowCustomDates] = useState(false);
  
  // Estado para rastrear se os filtros estão sendo atualizados
  const [filtersPending, setFiltersPending] = useState(false);

  // Atualizar filtros quando mudar de dashboard
  useEffect(() => {
    setSource('all');
    setUser('all');
  }, [dashboardType]);

  // Debounce para aplicar filtros
  const debouncedApplyFilters = useCallback(() => {
    if (filtersPending) {
      const timer = setTimeout(() => {
        const filters = {
          dateRange: dateRange,
          pipeline: pipeline,
          source: source,
          user: user,
          customStartDate: customStartDate,
          customEndDate: customEndDate
        };
        
        onFilterChange(filters);
        setFiltersPending(false);
      }, 500); // 500ms de debounce
      
      return () => clearTimeout(timer);
    }
  }, [dateRange, pipeline, source, user, customStartDate, customEndDate, filtersPending, onFilterChange]);

  // Aplicar debounce quando os filtros mudarem
  useEffect(() => {
    debouncedApplyFilters();
  }, [debouncedApplyFilters]);

  // Marcar filtros como pendentes quando alterados
  const updateFilter = (field, value) => {
    switch (field) {
      case 'dateRange':
        setDateRange(value);
        break;
      case 'pipeline':
        setPipeline(value);
        break;
      case 'source':
        setSource(value);
        break;
      case 'user':
        setUser(value);
        break;
      case 'customStartDate':
        setCustomStartDate(value);
        break;
      case 'customEndDate':
        setCustomEndDate(value);
        break;
      default:
        return;
    }
    
    setFiltersPending(true);
  };

  // Controle da visibilidade do filtro de datas personalizado
  useEffect(() => {
    setShowCustomDates(dateRange === 'custom');
  }, [dateRange]);

  // Obter data atual formatada para o valor máximo do input date
  const currentDate = new Date().toISOString().split('T')[0];

  // Definir data inicial se for data personalizada
  useEffect(() => {
    if (dateRange === 'custom' && !customStartDate) {
      // Data de início padrão: 30 dias atrás
      const defaultStart = new Date();
      defaultStart.setDate(defaultStart.getDate() - 30);
      setCustomStartDate(defaultStart.toISOString().split('T')[0]);
      setCustomEndDate(currentDate);
      setFiltersPending(true);
    }
  }, [dateRange, customStartDate, currentDate]);

  // Resetar todos os filtros
  const resetFilters = () => {
    setDateRange('30');
    setPipeline('all');
    setSource('all');
    setUser('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setFiltersPending(true);
  };

  return (
    <div className="filter-bar">
      <div className="filter-group">
        <label>Período:</label>
        <select 
          value={dateRange} 
          onChange={(e) => updateFilter('dateRange', e.target.value)}
        >
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
          <option value="180">Últimos 6 meses</option>
          <option value="365">Último ano</option>
          <option value="custom">Personalizado</option>
        </select>
      </div>

      {showCustomDates && (
        <div className="filter-custom-dates">
          <div className="filter-group">
            <label>De:</label>
            <input 
              type="date" 
              value={customStartDate} 
              max={currentDate}
              onChange={(e) => updateFilter('customStartDate', e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>Até:</label>
            <input 
              type="date" 
              value={customEndDate} 
              max={currentDate}
              onChange={(e) => updateFilter('customEndDate', e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="filter-group">
        <label>Pipeline:</label>
        <select 
          value={pipeline} 
          onChange={(e) => updateFilter('pipeline', e.target.value)}
        >
          <option value="all">Todos</option>
          {pipelines.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      {dashboardType === 'marketing' && (
        <div className="filter-group">
          <label>Fonte:</label>
          <select 
            value={source} 
            onChange={(e) => updateFilter('source', e.target.value)}
          >
            <option value="all">Todas</option>
            {sources.map((item, index) => (
              <option key={index} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {dashboardType === 'sales' && (
        <div className="filter-group">
          <label>Corretor:</label>
          <select 
            value={user} 
            onChange={(e) => updateFilter('user', e.target.value)}
          >
            <option value="all">Todos</option>
            {users.map((item, index) => (
              <option key={index} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      )}
      
      <button className="filter-reset" onClick={resetFilters}>
        Limpar Filtros
      </button>
      
      {filtersPending && (
        <div className="filter-status">
          <div className="filter-spinner"></div>
          <span>Atualizando...</span>
        </div>
      )}
    </div>
  );
};

export default FilterBar;