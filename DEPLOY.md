# 🚀 GUÍA RÁPIDA DE DEPLOYMENT

## Paso 1: Preparar el Código

```bash
# Ya tienes el código listo, solo verifica:
ls -la
# Deberías ver: package.json, server.js, public/, .env, .gitignore, README.md
```

## Paso 2: Subir a GitHub

```bash
# Inicializar git (si no está inicializado)
git init

# Agregar todos los archivos
git add .

# Verificar que .env NO esté incluido
git status
# .env debe aparecer en "untracked files" pero NO en "Changes to be committed"

# Hacer commit
git commit -m "Initial commit: LinkedIn Audit App"

# Crear repo en GitHub primero, luego:
git remote add origin https://github.com/tu-usuario/linkedin-audit-app.git
git branch -M main
git push -u origin main
```

## Paso 3: Deploy en Render

1. **Ir a render.com** e iniciar sesión con GitHub

2. **Crear New Web Service:**
   - Click "New +" → "Web Service"
   - Selecciona tu repositorio `linkedin-audit-app`
   
3. **Configurar el servicio:**
   ```
   Name: linkedin-audit-app
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   Instance Type: Free
   ```

4. **Agregar Variables de Entorno:**
   En la sección "Environment":
   ```
   ANTHROPIC_API_KEY = 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
   NODE_ENV = production
   ```

5. **Deploy:**
   - Click "Create Web Service"
   - Espera 3-5 minutos
   - Tu app estará en: `https://linkedin-audit-app.onrender.com`

## Paso 4: Verificar

1. Abre la URL de Render
2. Pega una URL de LinkedIn pública
3. Click "Analizar Perfil"
4. ¡Listo! 🎉

## 🔧 Troubleshooting Rápido

**Error en build:**
- Verifica que `package.json` esté en la raíz
- Check logs en Render dashboard

**Error 500 al analizar:**
- Verifica variables de entorno en Render
- Check que las API keys sean correctas

**Perfil no se carga:**
- Verifica que sea un perfil público
- Intenta con otro perfil

## 📝 Notas Importantes

- **Render Free Tier:** El servicio puede tardar ~30 segundos en "despertar" si no se ha usado
- **API Costs:** Monitorea tu uso en Anthropic y OpenAI
- **CORS:** Si hay problemas, verifica que el proxy CORS esté funcionando

## 🎯 URLs de Referencia

- Dashboard Render: https://dashboard.render.com
- Anthropic Console: https://console.anthropic.com
- OpenAI Console: https://platform.openai.com

---

¿Dudas? Revisa el README.md completo o los logs de Render.
