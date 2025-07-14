import React, { useState, useEffect, useRef } from 'react';

// Componente MultiSelectFilter
const MultiSelectFilter = ({ label, options, selectedValues, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggleOption = (value) => {
    const newSelectedValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    
    onChange(newSelectedValues);
  };

  const handleSelectAll = () => {
    if (selectedValues.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map(option => option.value));
    }
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length === 1) {
      const option = options.find(opt => opt.value === selectedValues[0]);
      return option?.label || selectedValues[0];
    }
    return `${selectedValues.length} selecionados`;
  };

  return (
    <div className="multi-select-container" ref={dropdownRef}>
      <label className="filter-label">{label}:</label>
      <div className="multi-select-wrapper">
        <button
          type="button"
          className="multi-select-button"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="multi-select-text">{getDisplayText()}</span>
          <span className={`multi-select-arrow ${isOpen ? 'open' : ''}`}>▼</span>
        </button>

        {isOpen && (
          <div className="multi-select-dropdown">
            <div className="multi-select-option select-all" onClick={handleSelectAll}>
              <input
                type="checkbox"
                checked={selectedValues.length === options.length}
                readOnly
              />
              <span>Selecionar Todos</span>
            </div>
            <div className="multi-select-divider"></div>
            {options.map((option) => (
              <div
                key={option.value}
                className={`multi-select-option ${selectedValues.includes(option.value) ? 'selected' : ''}`}
                onClick={() => handleToggleOption(option.value)}
              >
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option.value)}
                  readOnly
                />
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiSelectFilter;