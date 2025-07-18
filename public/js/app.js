// Aplicación principal
class FinanceApp {
  constructor() {
    this.categories = [];
    this.transactions = [];
    this.currentPage = 1;
    this.totalPages = 1;
    this.filters = {
      type: '',
      category_id: '',
      start_date: '',
      end_date: '',
      search: ''
    };
    
    this.setupEventListeners();
  }

  async init() {
    try {
      await this.loadCategories();
      await this.loadStats();
      await this.loadTransactions();
      this.setupDateDefaults();
    } catch (error) {
      console.error('Error inicializando la aplicación:', error);
      showNotification('Error al cargar los datos', 'error');
    }
  }

  setupEventListeners() {
    // Formulario de nueva transacción
    document.getElementById('transactionForm').addEventListener('submit', (e) => {
      this.handleTransactionSubmit(e);
    });

    // Cambio de tipo de transacción para actualizar categorías
    document.getElementById('type').addEventListener('change', (e) => {
      this.updateCategoriesForType(e.target.value);
    });

    // Filtros
    document.getElementById('filterType').addEventListener('change', () => {
      this.applyFilters();
    });

    document.getElementById('filterCategory').addEventListener('change', () => {
      this.applyFilters();
    });

    document.getElementById('startDate').addEventListener('change', () => {
      this.applyFilters();
    });

    document.getElementById('endDate').addEventListener('change', () => {
      this.applyFilters();
    });

    // Búsqueda con debounce
    document.getElementById('searchText').addEventListener('input', 
      APIUtils.debounce(() => {
        this.applyFilters();
      }, 500)
    );

    // Botones de filtros
    document.getElementById('resetFiltersBtn').addEventListener('click', () => {
      this.resetFilters();
    });

    document.getElementById('exportTransactionsBtn').addEventListener('click', () => {
      this.exportTransactions();
    });

    document.getElementById('importCSVBtn').addEventListener('click', () => {
      this.openImportModal();
    });

    // Botones de paginación
    document.getElementById('prevBtn').addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.loadTransactions(this.currentPage - 1);
      }
    });

    document.getElementById('nextBtn').addEventListener('click', () => {
      this.loadTransactions(this.currentPage + 1);
    });

    // Formulario de edición
    document.getElementById('editTransactionForm').addEventListener('submit', (e) => {
      this.handleEditSubmit(e);
    });

    // Botones del modal
    document.getElementById('closeEditModalBtn').addEventListener('click', () => {
      this.closeEditModal();
    });

    document.getElementById('cancelEditBtn').addEventListener('click', () => {
      this.closeEditModal();
    });

    // Cerrar modal con ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeEditModal();
      }
    });

    // Cerrar modal al hacer clic fuera
    document.getElementById('editModal').addEventListener('click', (e) => {
      if (e.target.id === 'editModal') {
        this.closeEditModal();
      }
    });

    // Event listeners para importación CSV
    this.setupCSVImportListeners();
  }

  setupCSVImportListeners() {
    const fileInput = document.getElementById('csvFileInput');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const selectFileBtn = document.getElementById('selectFileBtn');
    const importModal = document.getElementById('importModal');
    
    // Abrir selector de archivo
    selectFileBtn.addEventListener('click', () => {
      fileInput.click();
    });

    // Manejar selección de archivo
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleFileSelect(e.target.files[0]);
      }
    });

    // Drag and drop
    fileUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileUploadArea.classList.add('dragover');
    });

    fileUploadArea.addEventListener('dragleave', () => {
      fileUploadArea.classList.remove('dragover');
    });

    fileUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      fileUploadArea.classList.remove('dragover');
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.handleFileSelect(files[0]);
      }
    });

    // Botones del modal
    document.getElementById('closeImportModalBtn').addEventListener('click', () => {
      this.closeImportModal();
    });

    document.getElementById('cancelImportBtn').addEventListener('click', () => {
      this.closeImportModal();
    });

    document.getElementById('confirmImportBtn').addEventListener('click', () => {
      this.confirmImport();
    });

    // Cerrar modal al hacer clic fuera
    importModal.addEventListener('click', (e) => {
      if (e.target.id === 'importModal') {
        this.closeImportModal();
      }
    });
  }

  setupDateDefaults() {
    const today = APIUtils.getCurrentDate();
    document.getElementById('date').value = today;
    
    // Establecer filtros de fecha por defecto (mes actual)
    const monthStart = APIUtils.getMonthStart();
    const monthEnd = APIUtils.getMonthEnd();
    
    document.getElementById('startDate').value = monthStart;
    document.getElementById('endDate').value = monthEnd;
  }

  async loadCategories() {
    try {
      const response = await apiClient.getCategories();
      this.categories = response.categories;
      this.updateCategorySelects();
    } catch (error) {
      console.error('Error cargando categorías:', error);
      showNotification('Error al cargar las categorías', 'error');
    }
  }

  updateCategorySelects() {
    const categorySelect = document.getElementById('category');
    const filterCategorySelect = document.getElementById('filterCategory');
    const editCategorySelect = document.getElementById('editCategory');

    // Limpiar opciones existentes
    categorySelect.innerHTML = '<option value="">Seleccionar...</option>';
    filterCategorySelect.innerHTML = '<option value="">Todas</option>';
    editCategorySelect.innerHTML = '<option value="">Seleccionar...</option>';

    this.categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = `${category.icon} ${category.name}`;
      option.dataset.type = category.type;
      
      categorySelect.appendChild(option.cloneNode(true));
      editCategorySelect.appendChild(option.cloneNode(true));
      
      // Para el filtro, agregar todas las categorías
      const filterOption = document.createElement('option');
      filterOption.value = category.id;
      filterOption.textContent = `${category.icon} ${category.name}`;
      filterCategorySelect.appendChild(filterOption);
    });
  }

  updateCategoriesForType(type) {
    const categorySelect = document.getElementById('category');
    const editCategorySelect = document.getElementById('editCategory');

    [categorySelect, editCategorySelect].forEach(select => {
      Array.from(select.options).forEach(option => {
        if (option.value === '') {
          option.style.display = 'block';
          return;
        }
        
        const optionType = option.dataset.type;
        option.style.display = (!type || optionType === type) ? 'block' : 'none';
      });
    });
  }

  async loadStats() {
    try {
      const params = this.getDateFilters();
      const response = await apiClient.getStats(params);
      this.updateStatsDisplay(response.summary);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      showNotification('Error al cargar las estadísticas', 'error');
    }
  }

  updateStatsDisplay(stats) {
    document.getElementById('totalIncome').textContent = APIUtils.formatCurrency(stats.totalIncome);
    document.getElementById('totalExpenses').textContent = APIUtils.formatCurrency(stats.totalExpense);
    document.getElementById('balance').textContent = APIUtils.formatCurrency(stats.balance);
    document.getElementById('savingsRate').textContent = `${stats.savingsRate}%`;

    // Cambiar color del balance según sea positivo o negativo
    const balanceElement = document.getElementById('balance');
    const balanceCard = balanceElement.closest('.stat-card');
    balanceCard.className = balanceCard.className.replace(/(balance|expense)/, 
      stats.balance >= 0 ? 'balance' : 'expense');
  }

  async loadTransactions(page = 1) {
    try {
      this.currentPage = page;
      const params = {
        page,
        limit: 20,
        ...this.getFilters()
      };

      const response = await apiClient.getTransactions(params);
      this.transactions = response.transactions;
      this.updateTransactionsList();
      this.updatePagination(response);
      
      // Actualizar contador
      document.getElementById('transactionCount').textContent = 
        `${this.transactions.length} transacciones`;

    } catch (error) {
      console.error('Error cargando transacciones:', error);
      showNotification('Error al cargar las transacciones', 'error');
    }
  }

  getFilters() {
    return {
      type: document.getElementById('filterType').value,
      category_id: document.getElementById('filterCategory').value,
      start_date: document.getElementById('startDate').value,
      end_date: document.getElementById('endDate').value,
      search: document.getElementById('searchText').value
    };
  }

  getDateFilters() {
    return {
      start_date: document.getElementById('startDate').value,
      end_date: document.getElementById('endDate').value
    };
  }

  updateTransactionsList() {
    const container = document.getElementById('transactionsList');
    
    if (this.transactions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📊</div>
          <h3>No hay transacciones</h3>
          <p>Añade tu primera transacción para comenzar a gestionar tus finanzas</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.transactions.map(transaction => `
      <div class="transaction-item ${transaction.type}">
        <div class="transaction-info">
          <div class="transaction-description">${transaction.description}</div>
          <div class="transaction-meta">
            <span class="transaction-date">${APIUtils.formatDate(transaction.date)}</span>
            <span class="transaction-category" style="background-color: ${transaction.category_color}20; color: ${transaction.category_color};">
              ${transaction.category_icon} ${transaction.category_name}
            </span>
            ${transaction.notes ? `<span class="transaction-notes">📝 ${transaction.notes}</span>` : ''}
          </div>
        </div>
        <div class="transaction-actions">
          <div class="transaction-amount ${transaction.type}">
            ${transaction.type === 'income' ? '+' : '-'}${APIUtils.formatCurrency(transaction.amount)}
          </div>
          <div class="transaction-buttons">
            <button class="btn btn-small btn-edit" data-transaction-id="${transaction.id}" data-action="edit">
              ✏️ Editar
            </button>
            <button class="btn btn-small btn-delete" data-transaction-id="${transaction.id}" data-action="delete">
              🗑️ Eliminar
            </button>
          </div>
        </div>
      </div>
    `).join('');
    
    // Agregar event listeners a los botones de transacciones
    container.querySelectorAll('.btn-edit').forEach(button => {
      button.addEventListener('click', (e) => {
        const transactionId = e.target.dataset.transactionId;
        this.editTransaction(transactionId);
      });
    });
    
    container.querySelectorAll('.btn-delete').forEach(button => {
      button.addEventListener('click', (e) => {
        const transactionId = e.target.dataset.transactionId;
        this.deleteTransaction(transactionId);
      });
    });
  }

  updatePagination(response) {
    const pagination = document.getElementById('pagination');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageInfo = document.getElementById('pageInfo');

    if (response.transactions.length < response.limit) {
      pagination.style.display = 'none';
      return;
    }

    pagination.style.display = 'flex';
    
    prevBtn.disabled = this.currentPage <= 1;
    nextBtn.disabled = response.transactions.length < response.limit;
    
    pageInfo.textContent = `Página ${this.currentPage}`;
  }

  async handleTransactionSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const transactionData = {
      description: APIUtils.sanitizeInput(formData.get('description')),
      amount: parseFloat(formData.get('amount')),
      type: formData.get('type'),
      category_id: parseInt(formData.get('category_id')),
      date: formData.get('date'),
      notes: APIUtils.sanitizeInput(formData.get('notes'))
    };

    // Validaciones
    if (!APIUtils.validateAmount(transactionData.amount)) {
      showNotification('Por favor, ingresa una cantidad válida', 'error');
      return;
    }

    try {
      await apiClient.createTransaction(transactionData);
      showNotification('Transacción añadida correctamente', 'success');
      
      // Limpiar formulario
      e.target.reset();
      document.getElementById('date').value = APIUtils.getCurrentDate();
      
      // Recargar datos
      await this.loadStats();
      await this.loadTransactions();
      
    } catch (error) {
      console.error('Error creando transacción:', error);
      showNotification(error.message || 'Error al crear la transacción', 'error');
    }
  }

  async editTransaction(id) {
    try {
      const response = await apiClient.getTransaction(id);
      const transaction = response.transaction;
      
      // Llenar el formulario de edición
      document.getElementById('editTransactionId').value = transaction.id;
      document.getElementById('editDescription').value = transaction.description;
      document.getElementById('editAmount').value = transaction.amount;
      document.getElementById('editType').value = transaction.type;
      document.getElementById('editDate').value = APIUtils.formatDateInput(transaction.date);
      document.getElementById('editNotes').value = transaction.notes || '';
      
      // Actualizar categorías para el tipo
      this.updateCategoriesForType(transaction.type);
      document.getElementById('editCategory').value = transaction.category_id;
      
      // Mostrar modal
      document.getElementById('editModal').style.display = 'flex';
      
    } catch (error) {
      console.error('Error cargando transacción:', error);
      showNotification('Error al cargar la transacción', 'error');
    }
  }

  async handleEditSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const id = document.getElementById('editTransactionId').value;
    
    const transactionData = {
      description: APIUtils.sanitizeInput(formData.get('description')),
      amount: parseFloat(formData.get('amount')),
      type: formData.get('type'),
      category_id: parseInt(formData.get('category_id')),
      date: formData.get('date'),
      notes: APIUtils.sanitizeInput(formData.get('notes'))
    };

    if (!APIUtils.validateAmount(transactionData.amount)) {
      showNotification('Por favor, ingresa una cantidad válida', 'error');
      return;
    }

    try {
      await apiClient.updateTransaction(id, transactionData);
      showNotification('Transacción actualizada correctamente', 'success');
      
      this.closeEditModal();
      await this.loadStats();
      await this.loadTransactions();
      
    } catch (error) {
      console.error('Error actualizando transacción:', error);
      showNotification(error.message || 'Error al actualizar la transacción', 'error');
    }
  }

  closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
  }

  async deleteTransaction(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta transacción?')) {
      return;
    }

    try {
      await apiClient.deleteTransaction(id);
      showNotification('Transacción eliminada correctamente', 'success');
      
      await this.loadStats();
      await this.loadTransactions();
      
    } catch (error) {
      console.error('Error eliminando transacción:', error);
      showNotification(error.message || 'Error al eliminar la transacción', 'error');
    }
  }

  async applyFilters() {
    this.currentPage = 1;
    await this.loadTransactions();
    await this.loadStats();
  }

  resetFilters() {
    document.getElementById('filterType').value = '';
    document.getElementById('filterCategory').value = '';
    document.getElementById('searchText').value = '';
    
    // Restablecer a mes actual
    document.getElementById('startDate').value = APIUtils.getMonthStart();
    document.getElementById('endDate').value = APIUtils.getMonthEnd();
    
    this.applyFilters();
  }

  async exportTransactions() {
    try {
      const params = {
        ...this.getFilters(),
        limit: 10000 // Obtener muchas transacciones para exportar
      };

      const response = await apiClient.getTransactions(params);
      
      if (response.transactions.length === 0) {
        showNotification('No hay transacciones para exportar', 'error');
        return;
      }

      // Preparar datos para CSV
      const csvData = response.transactions.map(t => ({
        'Fecha': t.date,
        'Descripción': t.description,
        'Tipo': t.type === 'income' ? 'Ingreso' : 'Gasto',
        'Categoría': t.category_name,
        'Cantidad': t.amount,
        'Notas': t.notes || ''
      }));

      APIUtils.exportToCSV(csvData, `transacciones_${new Date().toISOString().split('T')[0]}.csv`);
      
    } catch (error) {
      console.error('Error exportando transacciones:', error);
      showNotification('Error al exportar las transacciones', 'error');
    }
  }

  // Métodos para importación CSV
  openImportModal() {
    // Cargar categorías en los selectores
    this.loadCategoriesForImport();
    
    // Mostrar modal
    document.getElementById('importModal').style.display = 'flex';
    
    // Resetear el formulario
    this.resetImportForm();
  }

  closeImportModal() {
    document.getElementById('importModal').style.display = 'none';
    this.resetImportForm();
  }

  resetImportForm() {
    document.getElementById('csvFileInput').value = '';
    document.getElementById('importOptions').style.display = 'none';
    document.getElementById('importPreview').style.display = 'none';
    document.getElementById('confirmImportBtn').style.display = 'none';
    this.csvData = null;
  }

  loadCategoriesForImport() {
    const defaultCategory = document.getElementById('defaultCategory');
    const defaultIncomeCategory = document.getElementById('defaultIncomeCategory');
    
    // Limpiar opciones existentes
    defaultCategory.innerHTML = '<option value="">Seleccionar categoría...</option>';
    defaultIncomeCategory.innerHTML = '<option value="">Seleccionar categoría...</option>';
    
    // Cargar categorías de gastos
    this.categories.filter(cat => cat.type === 'expense').forEach(category => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = `${category.icon} ${category.name}`;
      defaultCategory.appendChild(option);
    });
    
    // Cargar categorías de ingresos
    this.categories.filter(cat => cat.type === 'income').forEach(category => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = `${category.icon} ${category.name}`;
      defaultIncomeCategory.appendChild(option);
    });
  }

  handleFileSelect(file) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      showNotification('Por favor, selecciona un archivo CSV válido', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB max
      showNotification('El archivo es demasiado grande. Máximo 5MB', 'error');
      return;
    }

    this.parseCSV(file);
  }

  // Función para convertir números europeos (26.075,27) a formato JavaScript (26075.27)
  parseEuropeanNumber(numberStr) {
    if (!numberStr || numberStr.trim() === '') return 0;
    
    let cleanStr = numberStr.trim();
    
    // Si tiene signo negativo, guardarlo
    const isNegative = cleanStr.startsWith('-');
    if (isNegative) {
      cleanStr = cleanStr.substring(1);
    }
    
    // Convertir formato europeo a formato JavaScript
    // 26.075,27 -> 26075.27
    // 1.234.567,89 -> 1234567.89
    if (cleanStr.includes(',')) {
      // Tiene decimales (coma)
      const parts = cleanStr.split(',');
      if (parts.length === 2) {
        // Remover puntos de la parte entera (separadores de millares)
        const integerPart = parts[0].replace(/\./g, '');
        const decimalPart = parts[1];
        cleanStr = integerPart + '.' + decimalPart;
      }
    } else if (cleanStr.includes('.')) {
      // Verificar si el punto es separador de millares o decimal
      const parts = cleanStr.split('.');
      if (parts.length > 2) {
        // Multiple puntos = separadores de millares
        // 1.234.567 -> 1234567
        cleanStr = cleanStr.replace(/\./g, '');
      } else if (parts.length === 2 && parts[1].length > 2) {
        // Punto con más de 2 dígitos después = separador de millares
        // 1.234567 -> 1234567
        cleanStr = cleanStr.replace(/\./g, '');
      }
      // Si tiene exactamente 2 dígitos después del punto, lo dejamos como decimal
    }
    
    const result = parseFloat(cleanStr);
    return isNegative ? -result : result;
  }

  parseCSV(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target.result;
        const lines = csvText.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          showNotification('El archivo CSV debe tener al menos una cabecera y una fila de datos', 'error');
          return;
        }

        const headers = lines[0].split('|').map(h => h.trim().replace(/"/g, ''));
        const expectedHeaders = ['FECHA CONTABLE', 'FECHA VALOR', 'DESCRIPCION', 'IMPORTE', 'SALDO'];
        
        // Verificar que las cabeceras coincidan (sin importar mayúsculas/minúsculas)
        const normalizedHeaders = headers.map(h => h.toUpperCase());
        const missingHeaders = expectedHeaders.filter(h => !normalizedHeaders.includes(h));
        if (missingHeaders.length > 0) {
          showNotification(`Faltan las siguientes cabeceras: ${missingHeaders.join(', ')}`, 'error');
          return;
        }

        // Procesar datos
        const transactions = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split('|').map(v => v.trim().replace(/"/g, ''));
          
          if (values.length >= expectedHeaders.length) {
            const transaction = {};
            headers.forEach((header, index) => {
              // Normalizar la clave a mayúsculas para consistencia
              const normalizedHeader = header.toUpperCase();
              transaction[normalizedHeader] = values[index];
            });
            transactions.push(transaction);
          }
        }

        if (transactions.length === 0) {
          showNotification('No se encontraron transacciones válidas en el archivo', 'error');
          return;
        }

        this.csvData = transactions;
        this.showImportPreview();
        
      } catch (error) {
        console.error('Error parsing CSV:', error);
        showNotification('Error al procesar el archivo CSV', 'error');
      }
    };

    reader.readAsText(file);
  }

  showImportPreview() {
    const preview = document.getElementById('importPreview');
    const previewTable = preview.querySelector('.preview-table');
    const previewStats = preview.querySelector('.preview-stats');
    
    // Mostrar opciones y vista previa
    document.getElementById('importOptions').style.display = 'block';
    preview.style.display = 'block';
    document.getElementById('confirmImportBtn').style.display = 'inline-block';
    
    // Crear tabla de vista previa
    const first5 = this.csvData.slice(0, 5);
    let tableHtml = `
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Descripción</th>
            <th>Importe</th>
            <th>Tipo</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    first5.forEach(row => {
      const amount = this.parseEuropeanNumber(row.IMPORTE);
      const type = amount >= 0 ? 'Ingreso' : 'Gasto';
      tableHtml += `
        <tr>
          <td>${row['FECHA CONTABLE']}</td>
          <td>${row.DESCRIPCION}</td>
          <td>${Math.abs(amount).toFixed(2)}€</td>
          <td>${type}</td>
        </tr>
      `;
    });
    
    tableHtml += '</tbody></table>';
    previewTable.innerHTML = tableHtml;
    
    // Estadísticas
    const totalTransactions = this.csvData.length;
    const incomeCount = this.csvData.filter(t => this.parseEuropeanNumber(t.IMPORTE) >= 0).length;
    const expenseCount = totalTransactions - incomeCount;
    
    previewStats.innerHTML = `
      <strong>Total:</strong> ${totalTransactions} transacciones | 
      <strong>Ingresos:</strong> ${incomeCount} | 
      <strong>Gastos:</strong> ${expenseCount}
    `;
  }

  async confirmImport() {
    if (!this.csvData || this.csvData.length === 0) {
      showNotification('No hay datos para importar', 'error');
      return;
    }

    const defaultCategoryId = document.getElementById('defaultCategory').value;
    const defaultIncomeCategoryId = document.getElementById('defaultIncomeCategory').value;
    
    if (!defaultCategoryId || !defaultIncomeCategoryId) {
      showNotification('Por favor, selecciona las categorías por defecto', 'error');
      return;
    }

    try {
      const importData = {
        transactions: this.csvData,
        defaultExpenseCategory: defaultCategoryId,
        defaultIncomeCategory: defaultIncomeCategoryId
      };

      const response = await apiClient.importTransactions(importData);
      
      showNotification(`¡Éxito! ${response.imported} transacciones importadas`, 'success');
      this.closeImportModal();
      
      // Recargar datos
      await this.loadStats();
      await this.loadTransactions();
      
    } catch (error) {
      console.error('Error importando transacciones:', error);
      showNotification(error.message || 'Error al importar las transacciones', 'error');
    }
  }
}

// Sistema de notificaciones
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span>${message}</span>
      <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 16px; cursor: pointer; margin-left: 15px;">&times;</button>
    </div>
  `;

  document.getElementById('notifications').appendChild(notification);

  // Auto-remove después de 5 segundos
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 5000);
}

// Funciones globales para eventos onClick
function loadTransactions(page) {
  if (window.app) {
    window.app.loadTransactions(page);
  }
}

function resetFilters() {
  if (window.app) {
    window.app.resetFilters();
  }
}

function exportTransactions() {
  if (window.app) {
    window.app.exportTransactions();
  }
}

function closeEditModal() {
  if (window.app) {
    window.app.closeEditModal();
  }
}

// Crear instancia global de la aplicación
const app = new FinanceApp();
window.app = app;

// Exponer funciones globalmente
window.showNotification = showNotification;
window.loadTransactions = loadTransactions;
window.resetFilters = resetFilters;
window.exportTransactions = exportTransactions;
window.closeEditModal = closeEditModal;