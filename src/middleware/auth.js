const jwt = require('jsonwebtoken');

// Middleware para autenticar token JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Token de acceso requerido'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        error: 'Token inválido o expirado'
      });
    }

    req.userId = decoded.userId;
    req.username = decoded.username;
    next();
  });
};

// Middleware opcional para rutas que pueden funcionar con o sin autenticación
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (!err) {
        req.userId = decoded.userId;
        req.username = decoded.username;
      }
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  optionalAuth
};