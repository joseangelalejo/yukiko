#!/bin/bash

# 🚀 SCRIPT DE VERIFICACION PRE-VERCEL
# Ejecutar desce raíz: bash verify-vercel-ready.sh
# Status: ✅ Listo para Vercel

echo "================================"
echo "🔍 YUKIKO PRE-VERCEL CHECKLIST"
echo "================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

failed=0
passed=0

# Función para checkeos
check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅${NC} $1"
        ((passed++))
    else
        echo -e "${RED}❌${NC} $1"
        ((failed++))
    fi
}

# 1. GIT STATUS
echo "📋 Verificando Git..."
git status --porcelain | grep -q . && {
    echo -e "${YELLOW}⚠️  Cambios sin commitear:${NC}"
    git status --short
    ((failed++))
} || {
    echo -e "${GREEN}✅ Working directory limpio${NC}"
    ((passed++))
}
echo ""

# 2. NODE VERSION
echo "🔧 Verificando versiones..."
node -v > /dev/null 2>&1
check "Node.js instalado"
npm -v > /dev/null 2>&1
check "NPM instalado"
echo ""

# 3. DEPENDENCIES
echo "📦 Verificando dependencias..."
[ -d "node_modules" ] && {
    echo -e "${GREEN}✅ node_modules existe${NC}"
    ((passed++))
} || {
    echo -e "${RED}❌ node_modules NO existe${NC}"
    echo "   Ejecutar: npm install"
    ((failed++))
}
[ -d "web/node_modules" ] && {
    echo -e "${GREEN}✅ web/node_modules existe${NC}"
    ((passed++))
} || {
    echo -e "${RED}❌ web/node_modules NO existe${NC}"
    echo "   Ejecutar: npm install"
    ((failed++))
}
echo ""

# 4. BUILD TEST
echo "🔨 Compilando proyecto..."
npm run build > /tmp/build.log 2>&1
if grep -q "error" /tmp/build.log || [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build falló${NC}"
    echo "   Últimas líneas del log:"
    tail -5 /tmp/build.log | sed 's/^/   /'
    ((failed++))
else
    echo -e "${GREEN}✅ Build exitoso${NC}"
    ((passed++))
fi
echo ""

# 5. TYPESCRIPT CHECK
echo "📝 Verificando TypeScript..."
npx tsc --noEmit > /tmp/tsc.log 2>&1
if grep -q "error" /tmp/tsc.log; then
    echo -e "${RED}❌ TypeScript errors encontrados${NC}"
    grep "error" /tmp/tsc.log | head -3 | sed 's/^/   /'
    ((failed++))
else
    echo -e "${GREEN}✅ Sin TypeScript errors${NC}"
    ((passed++))
fi
echo ""

# 6. ENV VARIABLES
echo "🔐 Verificando variables de entorno..."
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✅ .env.local existe${NC}"
    ((passed++))
    
    if grep -q "DATABASE_URL" .env.local; then
        echo -e "${GREEN}  ✅ DATABASE_URL presente${NC}"
        ((passed++))
    else
        echo -e "${YELLOW}  ⚠️  DATABASE_URL NO encontrada${NC}"
        ((failed++))
    fi
else
    echo -e "${YELLOW}⚠️  .env.local NO existe${NC}"
    echo "   Crear: cp .env.example .env.local"
    ((failed++))
fi
echo ""

# 7. ALIAS VERIFICATION
echo "🔗 Verificando alias..."
if grep -q "@db" web/tsconfig.json; then
    echo -e "${GREEN}✅ @db alias en web/tsconfig.json${NC}"
    ((passed++))
else
    echo -e "${RED}❌ @db alias NO encontrado${NC}"
    ((failed++))
fi

if grep -q "@core" web/tsconfig.json; then
    echo -e "${GREEN}✅ @core alias en web/tsconfig.json${NC}"
    ((passed++))
else
    echo -e "${RED}❌ @core alias NO encontrado${NC}"
    ((failed++))
fi
echo ""

# 8. IMPORTS CHECK
echo "🔍 Verificando imports..."
bad_imports=$(grep -r "@db/" platforms/ 2>/dev/null | wc -l)
if [ "$bad_imports" -eq 0 ]; then
    echo -e "${GREEN}✅ No hay @db/ en platforms/ (correcto)${NC}"
    ((passed++))
else
    echo -e "${RED}❌ Encontrados $bad_imports imports @db/ en platforms/${NC}"
    grep -r "@db/" platforms/ | sed 's/^/   /'
    ((failed++))
fi
echo ""

# 9. SCHEMA CHECK
echo "🗄️  Verificando schema..."
if [ -f "db/schema.ts" ]; then
    if grep -q "cooldowns" db/schema.ts; then
        echo -e "${GREEN}✅ Table 'cooldowns' en schema${NC}"
        ((passed++))
    else
        echo -e "${RED}❌ Table 'cooldowns' NO encontrada${NC}"
        ((failed++))
    fi
    
    if grep -q "knownContacts" db/schema.ts; then
        echo -e "${GREEN}✅ Table 'knownContacts' en schema${NC}"
        ((passed++))
    else
        echo -e "${RED}❌ Table 'knownContacts' NO encontrada${NC}"
        ((failed++))
    fi
else
    echo -e "${RED}❌ db/schema.ts NO existe${NC}"
    ((failed++))
fi
echo ""

# 10. API ROUTES CHECK
echo "📡 Verificando rutas API..."
api_files=(
    "web/app/api/admin/stats/route.ts"
    "web/app/api/admin/verifications/route.ts"
    "web/app/api/monitor/metrics/route.ts"
)

for file in "${api_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file existe${NC}"
        ((passed++))
    else
        echo -e "${RED}❌ $file NO existe${NC}"
        ((failed++))
    fi
done
echo ""

# 11. NEXT.JS CHECK
echo "⚡ Verificando Next.js..."
if [ -d "web/.next" ]; then
    echo -e "${GREEN}✅ web/.next build exists${NC}"
    ((passed++))
else
    echo -e "${YELLOW}⚠️  web/.next NO existe (se generará en Vercel)${NC}"
fi
echo ""

# RESUMEN
echo "================================"
echo "📊 RESUMEN"
echo "================================"
echo -e "✅ Pasados: ${GREEN}$passed${NC}"
echo -e "❌ Fallidos: ${RED}$failed${NC}"

if [ $failed -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🚀 LISTO PARA VERCEL!${NC}"
    echo ""
    echo "Próximo paso:"
    echo "  1. Verificar variables en Vercel dashboard"
    echo "  2. Ejecutar: git push origin main"
    echo "  3. Vercel auto-detecta y deploya"
    echo ""
    exit 0
else
    echo ""
    echo -e "${RED}⚠️  ARREGLAR ERRORES ANTES DE DEPLOY${NC}"
    echo ""
    exit 1
fi
