#!/bin/bash
set -e

echo "🚀 Iniciando despliegue de PixelBros Backend en Droplet"

# Variables
BACKEND_DIR="/home/pixelbros/backend"
REPO_URL="https://github.com/hxtxrchq/BackPixel.git"

# 1. Instalar Node.js y PM2 (si no están instalados)
echo "📦 Verificando Node.js..."
if ! command -v node &> /dev/null; then
    echo "Instalando Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

if ! command -v pm2 &> /dev/null; then
    echo "Instalando PM2..."
    sudo npm install -g pm2
fi

# 2. Clonar repositorio
echo "📥 Clonando repositorio..."
if [ -d "$BACKEND_DIR" ]; then
    echo "Actualizando repositorio existente..."
    cd "$BACKEND_DIR"
    git pull origin main
else
    mkdir -p /home/pixelbros
    git clone "$REPO_URL" "$BACKEND_DIR"
    cd "$BACKEND_DIR"
fi

# 3. Instalar dependencias
echo "📚 Instalando dependencias..."
npm install

# 4. Generar Prisma Client
echo "🔧 Generando Prisma Client..."
npm run db:generate

# 5. Crear archivo .env (si no existe)
echo "⚙️  Configurando variables de entorno..."
if [ ! -f "$BACKEND_DIR/.env" ]; then
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    echo "❗ IMPORTANTE: Edita $BACKEND_DIR/.env con tus valores reales"
    echo "   DATABASE_URL, JWT_*_SECRET, FRONTEND_ORIGINS"
    echo ""
    echo "Presiona ENTER para continuar después de configurar .env"
    read
fi

# 6. Compilar TypeScript
echo "🏗️  Compilando TypeScript..."
npm run build

# 7. Sincronizar BD
echo "🗄️  Sincronizando base de datos..."
npm run db:sync

# 8. Iniciar con PM2
echo "✅ Iniciando backend con PM2..."
pm2 start dist/src/server.js --name "pixelbros-backend" --watch dist
pm2 save
pm2 startup

echo ""
echo "================================"
echo "✨ Backend desplegado exitosamente"
echo "================================"
echo "API: http://localhost:4000/api/v1"
echo "Gestionar: pm2 status"
echo "Logs: pm2 logs pixelbros-backend"
echo ""
