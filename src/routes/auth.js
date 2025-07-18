const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { runQuery, getQuery } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Registrar usuario
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validar datos
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Todos los campos son obligatorios'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    // Verificar si el usuario ya existe
    const existingUser = await getQuery(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUser) {
      return res.status(400).json({
        error: 'El usuario o email ya existe'
      });
    }

    // Hashear contraseña
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Crear usuario
    const result = await runQuery(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );

    // Generar token
    const token = jwt.sign(
      { userId: result.id, username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: {
        id: result.id,
        username,
        email
      }
    });

  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// Iniciar sesión
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validar datos
    if (!username || !password) {
      return res.status(400).json({
        error: 'Username y contraseña son obligatorios'
      });
    }

    // Buscar usuario
    const user = await getQuery(
      'SELECT id, username, email, password_hash FROM users WHERE username = ? OR email = ?',
      [username, username]
    );

    if (!user) {
      return res.status(401).json({
        error: 'Credenciales inválidas'
      });
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Credenciales inválidas'
      });
    }

    // Generar token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Inicio de sesión exitoso',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// Obtener perfil del usuario
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await getQuery(
      'SELECT id, username, email, created_at FROM users WHERE id = ?',
      [req.userId]
    );

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      user
    });

  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// Verificar token
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    userId: req.userId,
    username: req.username
  });
});

module.exports = router;