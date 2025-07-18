// Clase para manejar todas las llamadas a la API
class APIClient {
  constructor() {
    this.baseURL = '/api';
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(window.authManager ? window.authManager.getAuthHeaders() : {}),
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Métodos para transacciones
  async getTransactions(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/transactions${queryString ? `?${queryString}` : ''}`;
    return await this.request(endpoint);
  }

  async createTransaction(transactionData) {
    return await this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify(transactionData)
    });
  }

  async updateTransaction(id, transactionData) {
    return await this.request(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(transactionData)
    });
  }

  async deleteTransaction(id) {
    return await this.request(`/transactions/${id}`, {
      method: 'DELETE'
    });
  }

  async importTransactions(importData) {
    return await this.request('/transactions/import', {
      method: 'POST',
      body: JSON.stringify(importData)
    });
  }

  async getTransaction(id) {
    return await this.request(`/transactions/${id}`);
  }

  // Métodos para categorías
  async getCategories(type = null) {
    const endpoint = `/categories${type ? `?type=${type}` : ''}`;
    return await this.request(endpoint);
  }

  async createCategory(categoryData) {
    return await this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData)
    });
  }

  async updateCategory(id, categoryData) {
    return await this.request(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData)
    });
  }

  async deleteCategory(id) {
    return await this.request(`/categories/${id}`, {
      method: 'DELETE'
    });
  }

  // Métodos para estadísticas
  async getStats(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/stats/summary${queryString ? `?${queryString}` : ''}`;
    return await this.request(endpoint);
  }

  async getCategoryStats(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/stats/categories${queryString ? `?${queryString}` : ''}`;
    return await this.request(endpoint);
  }

  async getMonthlyStats(year) {
    return await this.request(`/stats/monthly?year=${year}`);
  }

  async getTrends(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/stats/trends${queryString ? `?${queryString}` : ''}`;
    return await this.request(endpoint);
  }

  async getTopTransactions(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/stats/top-transactions${queryString ? `?${queryString}` : ''}`;
    return await this.request(endpoint);
  }
}

// Crear instancia global
const apiClient = new APIClient();

// Funciones de utilidad para la API
class APIUtils {
  static formatCurrency(amount) {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  }

  static formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  static formatDateInput(dateString) {
    return new Date(dateString).toISOString().split('T')[0];
  }

  static getCurrentDate() {
    return new Date().toISOString().split('T')[0];
  }

  static getMonthStart(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  }

  static getMonthEnd(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  }

  static getYearStart(date = new Date()) {
    return new Date(date.getFullYear(), 0, 1).toISOString().split('T')[0];
  }

  static getYearEnd(date = new Date()) {
    return new Date(date.getFullYear(), 11, 31).toISOString().split('T')[0];
  }

  static exportToCSV(data, filename) {
    if (!data || data.length === 0) {
      showNotification('No hay datos para exportar', 'error');
      return;
    }

    // Obtener las columnas del primer objeto
    const headers = Object.keys(data[0]);
    
    // Crear el contenido CSV
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          let value = row[header];
          // Escapar comillas y valores que contengan comas
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    // Crear y descargar el archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename || `finanzas_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    showNotification('Archivo CSV descargado correctamente', 'success');
  }

  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validateAmount(amount) {
    const numAmount = parseFloat(amount);
    return !isNaN(numAmount) && numAmount > 0;
  }

  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>]/g, '');
  }
}

// Exponer utilidades globalmente
window.apiClient = apiClient;
window.APIUtils = APIUtils;