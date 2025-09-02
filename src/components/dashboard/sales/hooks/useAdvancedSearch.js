import { useState } from 'react';

// Campos de busca disponíveis
const SEARCH_FIELDS = [
  'Nome do Lead',
  'Corretor',
  'Fonte',
  'Anúncio',
  'Público',
  'Produto',
  'Funil',
  'Etapa'
];

/**
 * Hook customizado para gerenciar busca avançada
 * Centraliza a lógica de campo e valor de busca
 */
export const useAdvancedSearch = (initialField = SEARCH_FIELDS[0], initialValue = '') => {
  const [searchField, setSearchField] = useState(initialField);
  const [searchValue, setSearchValue] = useState(initialValue);

  // Função para limpar busca
  const clearSearch = () => {
    setSearchValue('');
  };

  // Função para definir busca
  const setSearch = (field, value) => {
    setSearchField(field);
    setSearchValue(value);
  };

  return {
    searchField,
    searchValue,
    setSearchField,
    setSearchValue,
    clearSearch,
    setSearch,
    searchFields: SEARCH_FIELDS
  };
};