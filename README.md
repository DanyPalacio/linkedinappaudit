# LinkedIn Profile Audit - Análisis con IA

Plataforma web para auditar perfiles de LinkedIn usando Inteligencia Artificial (Claude & OpenAI GPT-4). Genera un análisis completo con score, insights, oportunidades y plan de acción de 90 días para optimizar tu personal branding.

## 🚀 Características

- **Análisis Completo**: 5 categorías evaluadas (Identidad Visual, Propuesta de Valor, Credibilidad, Visibilidad SEO, Engagement)
- **Score 0-100**: Clasificación en 4 niveles (Crítico, Básico, Profesional, Élite)
- **Dashboard Infográfico**: Gráficas radiales y visualización de métricas
- **Plan de Acción 90 Días**: Roadmap priorizado con timeline
- **Chat IA**: Asistente personalizado para consultas sobre el análisis
- **Exportar HTML**: Descarga tu reporte completo personalizado
- **Diseño Responsive**: Funciona perfecto en desktop y mobile

## 🛠 Tecnologías

**Frontend:**
- HTML5, CSS3 (con diseño corporativo LinkedIn)
- JavaScript Vanilla (sin frameworks)
- Canvas API para gráficas

**Backend:**
- Node.js + Express
- Anthropic Claude API (Sonnet 4)
- OpenAI GPT-4 API
- Cheerio (web scraping)
- Axios (HTTP requests)

## 📦 Instalación Local

### Prerrequisitos

- Node.js >= 18.0.0
- npm >= 9.0.0
- API Keys de Anthropic y OpenAI

### Pasos

1. **Clonar el repositorio:**
```bash
git clone https://github.com/tu-usuario/linkedin-audit-app.git
cd linkedin-audit-app
```

2. **Instalar dependencias:**
```bash
npm install
```

3. **Configurar variables de entorno:**

Crear archivo `.env` en la raíz del proyecto:
```env
ANTHROPIC_API_KEY=tu_api_key_de_anthropic
OPENAI_API_KEY=tu_api_key_de_openai
PORT=3000
NODE_ENV=development
```

4. **Iniciar el servidor:**
```bash
npm start
```

Para desarrollo con auto-reload:
```bash
npm run dev
```

5. **Abrir en el navegador:**
```
http://localhost:3000
```

## 🌐 Deploy en Render

### Método 1: Desde GitHub (Recomendado)

1. **Subir código a GitHub:**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/tu-usuario/linkedin-audit-app.git
git push -u origin main
```

**IMPORTANTE:** Asegúrate de que `.env` está en `.gitignore` y NO se suba a GitHub.

2. **Crear Web Service en Render:**
   - Ir a [render.com](https://render.com)
   - Click en "New +" → "Web Service"
   - Conectar tu repositorio de GitHub
   - Configurar:
     - **Name:** `linkedin-audit-app`
     - **Environment:** `Node`
     - **Build Command:** `npm install`
     - **Start Command:** `npm start`
     - **Plan:** Free

3. **Configurar Variables de Entorno:**
   - En el dashboard de Render, ir a "Environment"
   - Añadir:
     ```
     ANTHROPIC_API_KEY = tu_key
     OPENAI_API_KEY = tu_key
     NODE_ENV = production
     ```

4. **Deploy:**
   - Click en "Create Web Service"
   - Render hará el deploy automáticamente
   - Tu app estará en: `https://linkedin-audit-app.onrender.com`

### Método 2: Deploy Manual (desde CLI)

```bash
# Instalar Render CLI
npm install -g @render/cli

# Login
render login

# Deploy
render deploy
```

## 📁 Estructura del Proyecto

```
linkedin-audit-app/
├── public/                  # Frontend estático
│   ├── css/
│   │   └── styles.css      # Estilos corporativos
│   ├── js/
│   │   └── app.js          # Lógica frontend
│   ├── images/
│   │   └── background.png  # Background corporativo
│   └── index.html          # Página principal
├── server.js               # Backend Express + APIs
├── package.json            # Dependencias
├── .env                    # Variables de entorno (NO subir a git)
├── .gitignore              # Archivos ignorados por git
└── README.md               # Este archivo
```

## 🎯 Uso

1. **Abrir la aplicación** en tu navegador
2. **Pegar la URL** de tu perfil público de LinkedIn
   - Ejemplo: `https://www.linkedin.com/in/tu-nombre`
3. **Hacer click en "Analizar Perfil"**
4. **Esperar** 10-20 segundos mientras la IA analiza
5. **Revisar resultados:**
   - Score general y por categoría
   - Resumen ejecutivo
   - Análisis detallado
   - Oportunidades priorizadas
   - Plan de acción 90 días
6. **Interactuar con el Chat IA** para preguntas específicas
7. **Exportar** tu reporte en HTML

## 🔒 Seguridad

- ✅ API keys en variables de entorno (nunca en código)
- ✅ `.gitignore` configurado para proteger `.env`
- ✅ CORS configurado correctamente
- ✅ Sin autenticación de LinkedIn (solo perfiles públicos)
- ✅ Rate limiting implícito por APIs

## 🐛 Troubleshooting

### Error: "Cannot fetch profile"
- Verifica que la URL sea correcta y el perfil sea público
- LinkedIn puede bloquear requests automáticos - intenta de nuevo

### Error: "API error"
- Verifica que las API keys estén correctamente configuradas
- Revisa que tengas créditos disponibles en Anthropic/OpenAI

### Error en deploy de Render
- Asegúrate de que `NODE_ENV=production` esté configurado
- Verifica los logs en el dashboard de Render
- Confirma que todas las variables de entorno estén correctas

## 📊 API Endpoints

### `POST /api/analyze`
Analiza un perfil de LinkedIn.

**Request:**
```json
{
  "profileUrl": "https://www.linkedin.com/in/usuario"
}
```

**Response:**
```json
{
  "profile": {
    "name": "Nombre Usuario",
    "headline": "Profesional en X",
    "about": "...",
    "photoUrl": "https://...",
    "industry": "Tecnología",
    ...
  },
  "analysis": {
    "scores": {
      "total": 78,
      "identidadVisual": 85,
      ...
    },
    "nivel": "Profesional",
    "resumenEjecutivo": {...},
    "analisisDetallado": {...},
    "oportunidades": [...],
    "planAccion": {...}
  }
}
```

### `POST /api/chat`
Chat con IA sobre el análisis.

**Request:**
```json
{
  "message": "¿Cómo mejoro mi headline?",
  "context": { ... }
}
```

**Response:**
```json
{
  "reply": "Para mejorar tu headline..."
}
```

### `GET /api/health`
Health check del servidor.

## 📝 Notas

- **Perfiles Privados:** Solo funcionan perfiles públicos de LinkedIn
- **Rate Limits:** Las APIs tienen límites de uso - considera implementar caching
- **Costo:** Claude API cobra por tokens - monitorea tu uso
- **CORS Proxy:** Usa AllOrigins para evitar problemas de CORS

## 🤝 Contribuciones

Las contribuciones son bienvenidas:

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Añade nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

MIT License - ver archivo LICENSE para detalles

## 👨‍💻 Autor

**Daniel Palacio**
- LinkedIn: [tu-perfil](https://linkedin.com/in/tu-perfil)
- GitHub: [@tu-usuario](https://github.com/tu-usuario)

## 🙏 Agradecimientos

- Anthropic Claude API
- OpenAI GPT-4 API
- LinkedIn (fuente de datos públicos)
- Render (hosting)

---

**¿Preguntas o problemas?** Abre un issue en GitHub o contacta al autor.
