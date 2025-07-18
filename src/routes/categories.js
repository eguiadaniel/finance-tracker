const express = require('express');
const { runQuery, getQuery, allQuery } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Obtener todas las categorías disponibles para el usuario
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;

    let sql = `
      SELECT * FROM categories 
      WHERE (user_id = ? OR is_default = 1)
    `;
    
    const params = [req.userId];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    sql += ' ORDER BY is_default DESC, name ASC';

    const categories = await allQuery(sql, params);

    res.json({ categories });

  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// Obtener una categoría específica
router.get('/:id', async (req, res) => {
  try {
    const category = await getQuery(
      'SELECT * FROM categories WHERE id = ? AND (user_id = ? OR is_default = 1)',
      [req.params.id, req.userId]
    );

    if (!category) {
      return res.status(404).json({
        error: 'Categoría no encontrada'
      });
    }

    res.json({ category });

  } catch (error) {
    console.error('Error al obtener categoría:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// Crear nueva categoría personalizada
router.post('/', async (req, res) => {
  try {
    const { name, type, color = '#3498db', icon = '💰' } = req.body;

    // Validar datos obligatorios
    if (!name || !type) {
      return res.status(400).json({
        error: 'Nombre y tipo son obligatorios'
      });
    }

    // Validar tipo
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({
        error: 'El tipo debe ser "income" o "expense"'
      });
    }

    // Verificar que no existe una categoría con el mismo nombre para el usuario
    const existingCategory = await getQuery(
      'SELECT id FROM categories WHERE name = ? AND type = ? AND (user_id = ? OR is_default = 1)',
      [name, type, req.userId]
    );

    if (existingCategory) {
      return res.status(400).json({
        error: 'Ya existe una categoría con ese nombre y tipo'
      });
    }

    // Crear categoría
    const result = await runQuery(
      'INSERT INTO categories (name, type, color, icon, user_id) VALUES (?, ?, ?, ?, ?)',
      [name, type, color, icon, req.userId]
    );

    // Obtener la categoría creada
    const newCategory = await getQuery(
      'SELECT * FROM categories WHERE id = ?',
      [result.id]
    );

    res.status(201).json({
      message: 'Categoría creada exitosamente',
      category: newCategory
    });

  } catch (error) {
    console.error('Error al crear categoría:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// Actualizar categoría personalizada
router.put('/:id', async (req, res) => {
  try {
    const { name, type, color, icon } = req.body;

    // Verificar que la categoría existe y pertenece al usuario (no puede editar las por defecto)
    const existingCategory = await getQuery(
      'SELECT * FROM categories WHERE id = ? AND user_id = ? AND is_default = 0',
      [req.params.id, req.userId]
    );

    if (!existingCategory) {
      return res.status(404).json({
        error: 'Categoría no encontrada o no se puede editar'
      });
    }

    // Validar datos obligatorios
    if (!name || !type) {
      return res.status(400).json({
        error: 'Nombre y tipo son obligatorios'
      });
    }

    // Validar tipo
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({
        error: 'El tipo debe ser "income" o "expense"'
      });
    }

    // Verificar que no existe otra categoría con el mismo nombre y tipo
    const duplicateCategory = await getQuery(
      'SELECT id FROM categories WHERE name = ? AND type = ? AND id != ? AND (user_id = ? OR is_default = 1)',
      [name, type, req.params.id, req.userId]
    );

    if (duplicateCategory) {
      return res.status(400).json({
        error: 'Ya existe una categoría con ese nombre y tipo'
      });
    }

    // Actualizar categoría
    await runQuery(
      'UPDATE categories SET name = ?, type = ?, color = ?, icon = ? WHERE id = ? AND user_id = ?',
      [name, type, color || existingCategory.color, icon || existingCategory.icon, req.params.id, req.userId]
    );

    // Obtener la categoría actualizada
    const updatedCategory = await getQuery(
      'SELECT * FROM categories WHERE id = ?',
      [req.params.id]
    );

    res.json({
      message: 'Categoría actualizada exitosamente',
      category: updatedCategory
    });

  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// Eliminar categoría personalizada
router.delete('/:id', async (req, res) => {
  try {
    // Verificar que la categoría existe y pertenece al usuario (no puede eliminar las por defecto)
    const existingCategory = await getQuery(
      'SELECT * FROM categories WHERE id = ? AND user_id = ? AND is_default = 0',
      [req.params.id, req.userId]
    );

    if (!existingCategory) {
      return res.status(404).json({
        error: 'Categoría no encontrada o no se puede eliminar'
      });
    }

    // Verificar si hay transacciones que usan esta categoría
    const transactionsCount = await getQuery(
      'SELECT COUNT(*) as count FROM transactions WHERE category_id = ?',
      [req.params.id]
    );

    if (transactionsCount.count > 0) {
      return res.status(400).json({
        error: 'No se puede eliminar la categoría porque tiene transacciones asociadas'
      });
    }

    // Eliminar categoría
    await runQuery(
      'DELETE FROM categories WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    res.json({
      message: 'Categoría eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router;