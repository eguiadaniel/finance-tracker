const app = require('./app');
const { initializeDatabase } = require('./models/database');

const PORT = process.env.PORT || 3000;

// Inicializar base de datos
initializeDatabase()
  .then(() => {
    console.log('✅ Base de datos inicializada correctamente');
    
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`📊 Finance Tracker v${process.env.APP_VERSION || '1.0.0'}`);
      console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((error) => {
    console.error('❌ Error al inicializar la base de datos:', error);
    process.exit(1);
  });

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('💥 Error no capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Promise rechazada no manejada:', promise, 'reason:', reason);
  process.exit(1);
});