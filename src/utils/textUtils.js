/**
 * Utilitários para manipulação de texto
 */

/**
 * Normaliza texto removendo acentos e caracteres especiais
 * @param {string} text - Texto para normalizar
 * @returns {string} Texto normalizado
 */
export const normalizeText = (text) => {
  if (!text) return '';
  return text.toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/ç/g, 'c') // Trata ç especificamente
    .trim();
};

/**
 * Verifica se o texto contém o termo de busca de forma flexível
 * @param {string} fieldValue - Valor do campo a ser pesquisado
 * @param {string} searchValue - Valor da busca
 * @returns {boolean} True se encontrar correspondência
 */
export const flexibleSearch = (fieldValue, searchValue) => {
  const normalizedField = normalizeText(fieldValue);
  const normalizedSearch = normalizeText(searchValue);
  
  // Se o termo de busca está vazio, não deve filtrar nada
  if (!normalizedSearch.trim()) return true;
  
  // Divide o termo de busca em palavras
  const searchWords = normalizedSearch.split(/\s+/).filter(word => word.length > 0);
  
  // Se há apenas uma palavra, verifica se está contida no campo
  if (searchWords.length === 1) {
    return normalizedField.includes(normalizedSearch);
  }
  
  // Para múltiplas palavras, TODAS as palavras devem estar presentes no campo
  // Isso permite buscar "Ricardo Gramowski" e encontrar apenas nomes que contenham ambas as palavras
  return searchWords.every(word => normalizedField.includes(word));
};