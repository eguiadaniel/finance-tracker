const { initializeDatabase } = require('../models/database');
require('dotenv').config();

console.log('🚀 Iniciando configuración del proyecto Finance Tracker...\n');

async function setup() {
  try {
    console.log('📊 Inicializando base de datos...');
    await initializeDatabase();
    
    console.log('✅ Base de datos configurada correctamente');
    console.log('✅ Categorías por defecto creadas');
    
    console.log('\n🎉 ¡Configuración completada exitosamente!');
    console.log('\nPuedes iniciar el servidor con:');
    console.log('  npm run dev    (desarrollo)');
    console.log('  npm start      (producción)');
    console.log('\nLa aplicación estará disponible en:');
    console.log(`  http://localhost:${process.env.PORT || 3000}`);
    
  } catch (error) {
    console.error('❌ Error durante la configuración:', error);
    process.exit(1);
  }
}

setup();