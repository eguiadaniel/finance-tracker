const express = require('express');
const { getQuery, allQuery } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Resumen financiero general
router.get('/summary', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let dateFilter = '';
    const params = [req.userId];

    if (start_date && end_date) {
      dateFilter = 'AND date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    } else if (start_date) {
      dateFilter = 'AND date >= ?';
      params.push(start_date);
    } else if (end_date) {
      dateFilter = 'AND date <= ?';
      params.push(end_date);
    }

    // Obtener totales de ingresos y gastos
    const incomeResult = await getQuery(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions 
      WHERE user_id = ? AND type = 'income' ${dateFilter}
    `, params.concat(params.slice(1)));

    const expenseResult = await getQuery(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions 
      WHERE user_id = ? AND type = 'expense' ${dateFilter}
    `, params.concat(params.slice(1)));

    // Contar transacciones
    const transactionCount = await getQuery(`
      SELECT COUNT(*) as count
      FROM transactions 
      WHERE user_id = ? ${dateFilter}
    `, params);

    const totalIncome = parseFloat(incomeResult.total) || 0;
    const totalExpense = parseFloat(expenseResult.total) || 0;
    const balance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100) : 0;

    res.json({
      summary: {
        totalIncome,
        totalExpense,
        balance,
        savingsRate: parseFloat(savingsRate.toFixed(2)),
        transactionCount: transactionCount.count,
        period: {
          start_date: start_date || null,
          end_date: end_date || null
        }
      }
    });

  } catch (error) {
    console.error('Error al obtener resumen:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// Estadísticas por categorías
router.get('/categories', async (req, res) => {
  try {
    const { type, start_date, end_date } = req.query;

    let sql = `
      SELECT 
        c.id,
        c.name,
        c.color,
        c.icon,
        c.type,
        COALESCE(SUM(t.amount), 0) as total,
        COUNT(t.id) as transaction_count
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id AND t.user_id = ?
    `;

    const params = [req.userId];

    // Filtros de fecha
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

    sql += ' WHERE (c.user_id = ? OR c.is_default = 1)';
    params.push(req.userId);

    // Filtro de tipo
    if (type) {
      sql += ' AND c.type = ?';
      params.push(type);
    }

    sql += ' GROUP BY c.id, c.name, c.color, c.icon, c.type ORDER BY total DESC';

    const categories = await allQuery(sql, params);

    // Calcular porcentajes
    const totalAmount = categories.reduce((sum, cat) => sum + parseFloat(cat.total), 0);
    
    const categoriesWithPercentage = categories.map(cat => ({
      ...cat,
      total: parseFloat(cat.total),
      percentage: totalAmount > 0 ? parseFloat(((cat.total / totalAmount) * 100).toFixed(2)) : 0
    }));

    res.json({
      categories: categoriesWithPercentage,
      totalAmount
    });

  } catch (error) {
    console.error('Error al obtener estadísticas por categorías:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// Estadísticas mensuales
router.get('/monthly', async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const monthlyStats = await allQuery(`
      SELECT 
        strftime('%Y-%m', date) as month,
        type,
        SUM(amount) as total
      FROM transactions 
      WHERE user_id = ? AND strftime('%Y', date) = ?
      GROUP BY strftime('%Y-%m', date), type
      ORDER BY month ASC
    `, [req.userId, year.toString()]);

    // Organizar datos por mes
    const monthlyData = {};
    
    for (let month = 1; month <= 12; month++) {
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
      monthlyData[monthKey] = {
        month: monthKey,
        income: 0,
        expense: 0,
        balance: 0
      };
    }

    // Llenar con datos reales
    monthlyStats.forEach(stat => {
      if (monthlyData[stat.month]) {
        monthlyData[stat.month][stat.type] = parseFloat(stat.total);
      }
    });

    // Calcular balance para cada mes
    Object.keys(monthlyData).forEach(month => {
      monthlyData[month].balance = monthlyData[month].income - monthlyData[month].expense;
    });

    res.json({
      year: parseInt(year),
      months: Object.values(monthlyData)
    });

  } catch (error) {
    console.error('Error al obtener estadísticas mensuales:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// Tendencias de gastos por período
router.get('/trends', async (req, res) => {
  try {
    const { period = 'month', limit = 12 } = req.query;

    let dateFormat;
    switch (period) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%Y-%W';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      case 'year':
        dateFormat = '%Y';
        break;
      default:
        dateFormat = '%Y-%m';
    }

    const trends = await allQuery(`
      SELECT 
        strftime('${dateFormat}', date) as period,
        type,
        SUM(amount) as total,
        COUNT(*) as count
      FROM transactions 
      WHERE user_id = ?
      GROUP BY strftime('${dateFormat}', date), type
      ORDER BY period DESC
      LIMIT ?
    `, [req.userId, parseInt(limit) * 2]); // x2 porque tenemos income y expense

    res.json({
      period,
      trends
    });

  } catch (error) {
    console.error('Error al obtener tendencias:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// Transacciones más grandes (top gastos e ingresos)
router.get('/top-transactions', async (req, res) => {
  try {
    const { type, limit = 10 } = req.query;

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

    if (type) {
      sql += ' AND t.type = ?';
      params.push(type);
    }

    sql += ' ORDER BY t.amount DESC LIMIT ?';
    params.push(parseInt(limit));

    const topTransactions = await allQuery(sql, params);

    res.json({
      transactions: topTransactions
    });

  } catch (error) {
    console.error('Error al obtener top transacciones:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router;