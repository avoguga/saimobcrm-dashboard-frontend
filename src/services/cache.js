// src/services/cache.js

/**
 * Serviço para cache local de dados da API
 * Implementa TTL (Time-To-Live) para garantir que os dados sejam atualizados periodicamente
 */
export const CacheService = {
  // Tempo padrão de expiração do cache em milissegundos (5 minutos)
  DEFAULT_TTL: 5 * 60 * 1000,
  
  /**
   * Salva um valor no cache com TTL
   * @param {string} key - Chave para armazenar o valor
   * @param {any} value - Valor a ser armazenado
   * @param {number} ttl - Tempo de vida em milissegundos (opcional)
   */
  set(key, value, ttl = this.DEFAULT_TTL) {
    try {
      const item = {
        value,
        expiry: Date.now() + ttl
      };
      localStorage.setItem(`cache_${key}`, JSON.stringify(item));
      return true;
    } catch (error) {
      console.warn('Erro ao salvar no cache:', error);
      return false;
    }
  },
  
  /**
   * Recupera um valor do cache se ainda estiver válido
   * @param {string} key - Chave do valor a ser recuperado
   * @returns {any|null} - Valor armazenado ou null se não existir ou estiver expirado
   */
  get(key) {
    try {
      const item = localStorage.getItem(`cache_${key}`);
      if (!item) return null;
      
      const parsedItem = JSON.parse(item);
      
      // Verificar se o item expirou
      if (Date.now() > parsedItem.expiry) {
        // Remover item expirado
        this.remove(key);
        return null;
      }
      
      return parsedItem.value;
    } catch (error) {
      console.warn('Erro ao recuperar do cache:', error);
      return null;
    }
  },
  
  /**
   * Remove um valor do cache
   * @param {string} key - Chave do valor a ser removido
   */
  remove(key) {
    try {
      localStorage.removeItem(`cache_${key}`);
      return true;
    } catch (error) {
      console.warn('Erro ao remover do cache:', error);
      return false;
    }
  },
  
  /**
   * Limpa todo o cache
   */
  clear() {
    try {
      // Remover apenas itens do cache, não outros dados do localStorage
      Object.keys(localStorage)
        .filter(key => key.startsWith('cache_'))
        .forEach(key => localStorage.removeItem(key));
      return true;
    } catch (error) {
      console.warn('Erro ao limpar o cache:', error);
      return false;
    }
  },
  
  /**
   * Gera uma chave de cache baseada em um endpoint e parâmetros
   * @param {string} endpoint - Endpoint da API
   * @param {Object} params - Parâmetros da requisição
   * @returns {string} - Chave única para o cache
   */
  generateKey(endpoint, params = {}) {
    const paramString = Object.keys(params).length > 0 
      ? '_' + JSON.stringify(params)
      : '';
    return `${endpoint}${paramString}`;
  }
};

export default CacheService;