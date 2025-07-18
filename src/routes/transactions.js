const express = require('express');
const { runQuery, getQuery, allQuery } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Función para convertir números europeos (26.075,27) a formato JavaScript (26075.27)
function parseEuropeanNumber(numberStr) {
  if (!numberStr || numberStr.toString().trim() === '') return 0;
  
  let cleanStr = numberStr.toString().trim();
  
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

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Obtener todas las transacciones del usuario
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, type, category_id, start_date, end_date, search } = req.query;
    
    const offset = (page - 1) * limit;
    
    let sql = `
      SELECT 
        t.*,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
    `;
    
    const params = [req.userId];
    
    // Filtros
    if (type) {
      sql += ' AND t.type = ?';
      params.push(type);
    }
    
    if (category_id) {
      sql += ' AND t.category_id = ?';
      params.push(category_id);
    }
    
    if (start_date && end_date) {
      sql += ' AND t.date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    } else if (start_date) {
      sql += ' AND t.date >= ?';
      params.push(start_date);
    } else if (end_date) {
      sql += ' AND t.date <= ?';
      params.push(end_date);
    }
    
    if (search) {
      sql += ' AND (t.description LIKE ? OR c.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    sql += ' ORDER BY t.date DESC, t.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    const transactions = await allQuery(sql, params);
    
    // Contar total para paginación
    let countSql = `
      SELECT COUNT(*) as total
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
    `;
    
    const countParams = [req.userId];
    
    if (type) {
      countSql += ' AND t.type = ?';
      countParams.push(type);
    }
    
    if (category_id) {
      countSql += ' AND t.category_id = ?';
      countParams.push(category_id);
    }
    
    if (start_date && end_date) {
      countSql += ' AND t.date BETWEEN ? AND ?';
      countParams.push(start_date, end_date);
    } else if (start_date) {
      countSql += ' AND t.date >= ?';
      countParams.push(start_date);
    } else if (end_date) {
      countSql += ' AND t.date <= ?';
      countParams.push(end_date);
    }
    
    if (search) {
      countSql += ' AND (t.description LIKE ? OR c.name LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }
    
    const countResult = await getQuery(countSql, countParams);
    const total = countResult.total;
    
    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Error al obtener transacciones:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// Obtener una transacción específica
router.get('/:id', async (req, res) => {
  try {
    const transaction = await getQuery(`
      SELECT 
        t.*,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.id = ? AND t.user_id = ?
    `, [req.params.id, req.userId]);

    if (!transaction) {
      return res.status(404).json({
        error: 'Transacción no encontrada'
      });
    }

    res.json({ transaction });

  } catch (error) {
    console.error('Error al obtener transacción:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// Crear nueva transacción
router.post('/', async (req, res) => {
  try {
    const { type, amount, description, category_id, date } = req.body;

    // Validar datos obligatorios
    if (!type || !amount || !category_id) {
      return res.status(400).json({
        error: 'Tipo, monto y categoría son obligatorios'
      });
    }

    // Validar tipo
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({
        error: 'El tipo debe ser "income" o "expense"'
      });
    }

    // Validar monto
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        error: 'El monto debe ser un número positivo'
      });
    }

    // Validar que la categoría existe y pertenece al usuario o es por defecto
    const category = await getQuery(
      'SELECT * FROM categories WHERE id = ? AND (user_id = ? OR is_default = 1)',
      [category_id, req.userId]
    );

    if (!category) {
      return res.status(400).json({
        error: 'Categoría no válida'
      });
    }

    // Validar que el tipo de transacción coincida con el tipo de categoría
    if (category.type !== type) {
      return res.status(400).json({
        error: 'El tipo de transacción no coincide con el tipo de categoría'
      });
    }

    // Usar fecha actual si no se proporciona
    const transactionDate = date || new Date().toISOString().split('T')[0];

    // Crear transacción
    const result = await runQuery(
      'INSERT INTO transactions (user_id, type, amount, description, category_id, date) VALUES (?, ?, ?, ?, ?, ?)',
      [req.userId, type, numAmount, description || '', category_id, transactionDate]
    );

    // Obtener la transacción creada con los datos de la categoría
    const newTransaction = await getQuery(`
      SELECT 
        t.*,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `, [result.id]);

    res.status(201).json({
      message: 'Transacción creada exitosamente',
      transaction: newTransaction
    });

  } catch (error) {
    console.error('Error al crear transacción:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// Actualizar transacción
router.put('/:id', async (req, res) => {
  try {
    const { type, amount, description, category_id, date } = req.body;

    // Verificar que la transacción existe y pertenece al usuario
    const existingTransaction = await getQuery(
      'SELECT * FROM transactions WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (!existingTransaction) {
      return res.status(404).json({
        error: 'Transacción no encontrada'
      });
    }

    // Validar datos obligatorios
    if (!type || !amount || !category_id) {
      return res.status(400).json({
        error: 'Tipo, monto y categoría son obligatorios'
      });
    }

    // Validar tipo
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({
        error: 'El tipo debe ser "income" o "expense"'
      });
    }

    // Validar monto
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        error: 'El monto debe ser un número positivo'
      });
    }

    // Validar que la categoría existe y pertenece al usuario o es por defecto
    const category = await getQuery(
      'SELECT * FROM categories WHERE id = ? AND (user_id = ? OR is_default = 1)',
      [category_id, req.userId]
    );

    if (!category) {
      return res.status(400).json({
        error: 'Categoría no válida'
      });
    }

    // Validar que el tipo de transacción coincida con el tipo de categoría
    if (category.type !== type) {
      return res.status(400).json({
        error: 'El tipo de transacción no coincide con el tipo de categoría'
      });
    }

    // Actualizar transacción
    await runQuery(
      'UPDATE transactions SET type = ?, amount = ?, description = ?, category_id = ?, date = ? WHERE id = ? AND user_id = ?',
      [type, numAmount, description || '', category_id, date || existingTransaction.date, req.params.id, req.userId]
    );

    // Obtener la transacción actualizada
    const updatedTransaction = await getQuery(`
      SELECT 
        t.*,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `, [req.params.id]);

    res.json({
      message: 'Transacción actualizada exitosamente',
      transaction: updatedTransaction
    });

  } catch (error) {
    console.error('Error al actualizar transacción:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// Eliminar transacción
router.delete('/:id', async (req, res) => {
  try {
    // Verificar que la transacción existe y pertenece al usuario
    const existingTransaction = await getQuery(
      'SELECT * FROM transactions WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (!existingTransaction) {
      return res.status(404).json({
        error: 'Transacción no encontrada'
      });
    }

    // Eliminar transacción
    await runQuery(
      'DELETE FROM transactions WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    res.json({
      message: 'Transacción eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar transacción:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// Importar transacciones desde CSV
router.post('/import', async (req, res) => {
  try {
    const { transactions, defaultExpenseCategory, defaultIncomeCategory } = req.body;

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({
        error: 'No se encontraron transacciones para importar'
      });
    }

    if (!defaultExpenseCategory || !defaultIncomeCategory) {
      return res.status(400).json({
        error: 'Las categorías por defecto son obligatorias'
      });
    }

    // Validar que las categorías existen y pertenecen al usuario
    const expenseCategory = await getQuery(
      'SELECT * FROM categories WHERE id = ? AND type = "expense" AND (user_id = ? OR is_default = 1)',
      [defaultExpenseCategory, req.userId]
    );

    const incomeCategory = await getQuery(
      'SELECT * FROM categories WHERE id = ? AND type = "income" AND (user_id = ? OR is_default = 1)',
      [defaultIncomeCategory, req.userId]
    );

    if (!expenseCategory || !incomeCategory) {
      return res.status(400).json({
        error: 'Categorías por defecto no válidas'
      });
    }

    let importedCount = 0;
    let errorCount = 0;
    const errors = [];

    // Procesar cada transacción
    for (let i = 0; i < transactions.length; i++) {
      try {
        const transaction = transactions[i];
        
        // Convertir fecha contable al formato correcto
        const fechaContable = transaction['FECHA CONTABLE'];
        let date;
        
        if (fechaContable.includes('/')) {
          // Formato DD/MM/YYYY
          const [day, month, year] = fechaContable.split('/');
          date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        } else {
          // Asumir que ya está en formato correcto
          date = fechaContable;
        }

        // Procesar el importe (formato europeo: 26.075,27)
        const amount = parseEuropeanNumber(transaction.IMPORTE);
        
        if (isNaN(amount)) {
          errors.push(`Fila ${i + 2}: Importe inválido "${transaction.IMPORTE}"`);
          errorCount++;
          continue;
        }

        // Determinar tipo y categoría
        const type = amount >= 0 ? 'income' : 'expense';
        const categoryId = type === 'income' ? defaultIncomeCategory : defaultExpenseCategory;
        const finalAmount = Math.abs(amount);

        // Crear la transacción
        await runQuery(
          'INSERT INTO transactions (user_id, type, amount, description, category_id, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            req.userId,
            type,
            finalAmount,
            transaction.DESCRIPCION || 'Transacción importada',
            categoryId,
            date,
            `Importado desde CSV - Saldo: ${transaction.SALDO || 'N/A'}`
          ]
        );

        importedCount++;

      } catch (error) {
        console.error(`Error procesando transacción ${i + 1}:`, error);
        errors.push(`Fila ${i + 2}: ${error.message}`);
        errorCount++;
      }
    }

    // Respuesta con resultados
    const response = {
      imported: importedCount,
      errors: errorCount,
      total: transactions.length
    };

    if (errors.length > 0) {
      response.errorDetails = errors.slice(0, 10); // Limitar a 10 errores
    }

    if (importedCount === 0) {
      return res.status(400).json({
        error: 'No se pudo importar ninguna transacción',
        ...response
      });
    }

    res.json({
      message: `${importedCount} transacciones importadas exitosamente`,
      ...response
    });

  } catch (error) {
    console.error('Error al importar transacciones:', error);
    res.status(500).json({
      error: 'Error interno del servidor durante la importación'
    });
  }
});

module.exports = router;