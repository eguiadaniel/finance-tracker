#!/bin/bash

echo "🚀 Instalador de Finance Tracker"
echo "=================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes con colores
print_message() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Verificar si Node.js está instalado
check_node() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_message "Node.js encontrado: $NODE_VERSION"
        
        # Verificar versión mínima (14.0.0)
        if [[ $(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1) -ge 14 ]]; then
            return 0
        else
            print_error "Se requiere Node.js versión 14 o superior"
            return 1
        fi
    else
        print_error "Node.js no está instalado"
        print_info "Instala Node.js desde: https://nodejs.org/"
        return 1
    fi
}

# Verificar si npm está instalado
check_npm() {
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_message "npm encontrado: $NPM_VERSION"
        return 0
    else
        print_error "npm no está instalado"
        return 1
    fi
}

# Crear estructura de directorios
create_structure() {
    print_info "Creando estructura de directorios..."
    
    mkdir -p src/{controllers,models,routes,middleware,utils}
    mkdir -p public/{css,js,images}
    mkdir -p views
    mkdir -p data
    
    print_message "Estructura de directorios creada"
}

# Instalar dependencias
install_dependencies() {
    print_info "Instalando dependencias..."
    
    if npm install; then
        print_message "Dependencias instaladas correctamente"
    else
        print_error "Error al instalar dependencias"
        return 1
    fi
}

# Configurar variables de entorno
setup_env() {
    if [ ! -f .env ]; then
        print_info "Configurando variables de entorno..."
        
        echo "¿En qué puerto quieres ejecutar la aplicación? (por defecto: 3000)"
        read -r PORT
        PORT=${PORT:-3000}
        
        echo "Introduce una clave secreta para JWT (por defecto: se generará una)"
        read -r JWT_SECRET
        if [ -z "$JWT_SECRET" ]; then
            JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "finance_tracker_secret_$(date +%s)")
        fi
        
        cat > .env << EOF
# Configuración del servidor
PORT=$PORT
NODE_ENV=development

# Base de datos
DB_PATH=./data/finance.db

# Configuración de seguridad
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

# Configuración de la aplicación
APP_NAME=Finance Tracker
APP_VERSION=1.0.0

# Configuración de CORS
CORS_ORIGIN=http://localhost:$PORT
EOF
        
        print_message "Archivo .env configurado"
    else
        print_warning "El archivo .env ya existe, no se modificará"
    fi
}

# Inicializar base de datos
init_database() {
    print_info "Inicializando base de datos..."
    
    if npm run setup; then
        print_message "Base de datos inicializada correctamente"
    else
        print_error "Error al inicializar la base de datos"
        return 1
    fi
}

# Función principal
main() {
    echo ""
    print_info "Verificando requisitos del sistema..."
    
    # Verificar Node.js y npm
    if ! check_node || ! check_npm; then
        print_error "Faltan requisitos del sistema"
        exit 1
    fi
    
    echo ""
    print_info "Iniciando instalación..."
    
    # Crear estructura
    create_structure
    
    # Configurar entorno
    setup_env
    
    # Instalar dependencias
    if ! install_dependencies; then
        exit 1
    fi
    
    # Inicializar base de datos
    if ! init_database; then
        exit 1
    fi
    
    echo ""
    print_message "¡Instalación completada exitosamente!"
    echo ""
    echo "🎉 Finance Tracker está listo para usar"
    echo ""
    echo "Comandos disponibles:"
    echo "  npm run dev    - Iniciar en modo desarrollo"
    echo "  npm start      - Iniciar en modo producción"
    echo ""
    
    PORT=$(grep PORT .env | cut -d'=' -f2)
    echo "La aplicación estará disponible en: http://localhost:${PORT}"
    echo ""
    
    echo "¿Quieres iniciar el servidor ahora? (y/N)"
    read -r START_NOW
    
    if [[ $START_NOW =~ ^[Yy]$ ]]; then
        print_info "Iniciando servidor de desarrollo..."
        npm run dev
    else
        print_info "Puedes iniciar el servidor cuando quieras con: npm run dev"
    fi
}

# Ejecutar función principal
main