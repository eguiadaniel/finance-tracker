const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || './data/finance.db';

// Asegurar que el directorio existe
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Crear conexión a la base de datos
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error al conectar con la base de datos:', err);
  } else {
    console.log('✅ Conectado a la base de datos SQLite');
  }
});

// Función para ejecutar consultas
const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

// Función para obtener datos
const getQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

// Función para obtener múltiples filas
const allQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Inicializar tablas
const initializeDatabase = async () => {
  try {
    // Tabla de usuarios
    await runQuery(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de categorías
    await runQuery(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        color TEXT DEFAULT '#3498db',
        icon TEXT DEFAULT '💰',
        user_id INTEGER,
        is_default BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Tabla de transacciones
    await runQuery(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        category_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        date DATE NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Tabla de presupuestos
    await runQuery(`
      CREATE TABLE IF NOT EXISTS budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category_id INTEGER NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        period TEXT NOT NULL CHECK (period IN ('monthly', 'yearly')),
        user_id INTEGER NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Insertar categorías por defecto
    await insertDefaultCategories();

    console.log('✅ Tablas de la base de datos creadas correctamente');
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error);
    throw error;
  }
};

// Insertar categorías por defecto
const insertDefaultCategories = async () => {
  const defaultCategories = [
    // Ingresos
    { name: 'Salario', type: 'income', color: '#27ae60', icon: '💼' },
    { name: 'Freelance', type: 'income', color: '#3498db', icon: '💻' },
    { name: 'Inversiones', type: 'income', color: '#f39c12', icon: '📈' },
    { name: 'Ventas', type: 'income', color: '#e74c3c', icon: '🛍️' },
    { name: 'Otros ingresos', type: 'income', color: '#9b59b6', icon: '💰' },
    
    // Gastos
    { name: 'Alimentación', type: 'expense', color: '#e74c3c', icon: '🍽️' },
    { name: 'Transporte', type: 'expense', color: '#3498db', icon: '🚗' },
    { name: 'Vivienda', type: 'expense', color: '#27ae60', icon: '🏠' },
    { name: 'Entretenimiento', type: 'expense', color: '#f39c12', icon: '🎬' },
    { name: 'Salud', type: 'expense', color: '#e67e22', icon: '🏥' },
    { name: 'Ropa', type: 'expense', color: '#9b59b6', icon: '👕' },
    { name: 'Educación', type: 'expense', color: '#34495e', icon: '📚' },
    { name: 'Otros gastos', type: 'expense', color: '#95a5a6', icon: '💸' }
  ];

  for (const category of defaultCategories) {
    try {
      await runQuery(`
        INSERT OR IGNORE INTO categories (name, type, color, icon, is_default)
        VALUES (?, ?, ?, ?, 1)
      `, [category.name, category.type, category.color, category.icon]);
    } catch (error) {
      console.error('Error al insertar categoría:', category.name, error);
    }
  }
};

// Cerrar conexión
const closeDatabase = () => {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        console.log('✅ Conexión a la base de datos cerrada');
        resolve();
      }
    });
  });
};

module.exports = {
  db,
  runQuery,
  getQuery,
  allQuery,
  initializeDatabase,
  closeDatabase
};