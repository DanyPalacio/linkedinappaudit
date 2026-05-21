require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize AI clients
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// CORS proxy para LinkedIn (con fallback)
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest='
];

/**
 * Extract profile data from LinkedIn HTML
 */
function extractProfileData(html, profileUrl) {
  const $ = cheerio.load(html);
  
  // Extraer información básica
  const name = $('h1.text-heading-xlarge').first().text().trim() || 
                $('h1').first().text().trim() ||
                'Usuario LinkedIn';
  
  const headline = $('div.text-body-medium').first().text().trim() ||
                   $('.top-card-layout__headline').text().trim() ||
                   'Profesional';
  
  const about = $('section.artdeco-card div.display-flex p').text().trim() ||
                $('.core-section-container__content p').text().trim() ||
                '';
  
  const photoUrl = $('img.pv-top-card-profile-picture__image').attr('src') ||
                   $('img[data-ghost-classes="profile-photo-edit__preview"]').attr('src') ||
                   '';
  
  // Extraer experiencia (primeros 3 roles)
  const experience = [];
  $('.pvs-list__item--line-separated').slice(0, 3).each((i, elem) => {
    const title = $(elem).find('.display-flex h3').text().trim();
    const company = $(elem).find('.t-14').first().text().trim();
    if (title) {
      experience.push({ title, company });
    }
  });
  
  // Extraer skills (top skills)
  const skills = [];
  $('.pvs-list__item--one-column .hoverable-link-text').slice(0, 10).each((i, elem) => {
    const skill = $(elem).text().trim();
    if (skill) skills.push(skill);
  });
  
  // Intentar detectar industria desde el about o headline
  const combinedText = `${headline} ${about}`.toLowerCase();
  let industry = 'General';
  
  const industryKeywords = {
    'Marketing Digital & E-commerce': ['ecommerce', 'e-commerce', 'amazon', 'marketplace', 'digital marketing', 'marketing digital'],
    'Tecnología & Software': ['software', 'developer', 'engineering', 'tech', 'ai', 'ml', 'data'],
    'Finanzas & Consultoría': ['finance', 'consulting', 'investment', 'banking', 'advisory'],
    'Salud & Bienestar': ['health', 'healthcare', 'medical', 'wellness', 'pharma'],
    'Educación': ['education', 'teaching', 'professor', 'academic', 'university'],
    'Creatividad & Diseño': ['design', 'creative', 'ux', 'ui', 'graphic', 'art'],
  };
  
  for (const [ind, keywords] of Object.entries(industryKeywords)) {
    if (keywords.some(kw => combinedText.includes(kw))) {
      industry = ind;
      break;
    }
  }
  
  return {
    name,
    headline,
    about,
    photoUrl,
    experience,
    skills,
    industry,
    profileUrl
  };
}

/**
 * Analyze profile with Claude API
 */
async function analyzeWithClaude(profileData) {
  const prompt = `Eres un experto en Personal Branding y LinkedIn. Analiza este perfil de LinkedIn usando el siguiente framework de 5 categorías (cada una vale 20 puntos, total 100):

PERFIL A ANALIZAR:
- Nombre: ${profileData.name}
- Headline: ${profileData.headline}
- About: ${profileData.about}
- Experiencia: ${JSON.stringify(profileData.experience)}
- Skills: ${profileData.skills.join(', ')}
- Industria detectada: ${profileData.industry}

FRAMEWORK DE EVALUACIÓN:

1. IDENTIDAD VISUAL (20 pts):
   - Foto profesional (calidad, expresión, fondo)
   - Banner personalizado
   - Coherencia visual

2. PROPUESTA DE VALOR (20 pts):
   - Claridad del headline (comunica valor inmediato)
   - About/Resumen (storytelling, diferenciadores, CTA)
   - Coherencia entre elementos

3. CREDIBILIDAD (20 pts):
   - Experiencia laboral detallada con logros cuantificables
   - Skills relevantes (top 3-5 estratégicos)
   - Trayectoria consistente

4. VISIBILIDAD SEO (20 pts):
   - Keywords estratégicas
   - Optimización para búsquedas
   - Completitud del perfil

5. ENGAGEMENT (20 pts):
   - Evaluación general de engagement potencial basado en la estructura del perfil
   - Nota: No tenemos acceso a posts reales, evalúa según la completitud y profesionalismo

RESPONDE EN FORMATO JSON ESTRICTO (sin markdown, sin backticks):
{
  "scores": {
    "identidadVisual": número,
    "propuestaValor": número,
    "credibilidad": número,
    "visibilidadSEO": número,
    "engagement": número,
    "total": número
  },
  "nivel": "Crítico|Básico|Profesional|Élite",
  "resumenEjecutivo": {
    "fortalezas": ["string", "string", "string"],
    "debilidades": ["string", "string"]
  },
  "analisisDetallado": {
    "identidadVisual": {
      "score": número,
      "fortalezas": "string",
      "oportunidades": "string"
    },
    "propuestaValor": {
      "score": número,
      "fortalezas": "string",
      "oportunidades": "string"
    },
    "credibilidad": {
      "score": número,
      "fortalezas": "string",
      "oportunidades": "string"
    },
    "visibilidadSEO": {
      "score": número,
      "fortalezas": "string",
      "oportunidades": "string"
    },
    "engagement": {
      "score": número,
      "fortalezas": "string",
      "oportunidades": "string"
    }
  },
  "oportunidades": [
    {
      "prioridad": "alta|media|baja",
      "titulo": "string",
      "impacto": "string",
      "accion": "string"
    }
  ],
  "planAccion": {
    "semanas1_2": ["acción1", "acción2", "acción3"],
    "semanas3_6": ["acción1", "acción2", "acción3"],
    "semanas7_12": ["acción1", "acción2", "acción3"]
  },
  "keywords": ["keyword1", "keyword2", "keyword3"]
}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ]
  });

  const responseText = message.content[0].text;
  
  // Limpiar la respuesta (por si tiene markdown)
  const cleanedResponse = responseText
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();
  
  return JSON.parse(cleanedResponse);
}

/**
 * POST /api/analyze
 * Analiza un perfil de LinkedIn
 */
app.post('/api/analyze', async (req, res) => {
  try {
    const { profileUrl } = req.body;
    
    if (!profileUrl) {
      return res.status(400).json({ error: 'URL del perfil es requerida' });
    }
    
    // Validar que sea una URL de LinkedIn
    if (!profileUrl.includes('linkedin.com')) {
      return res.status(400).json({ error: 'Debe ser una URL válida de LinkedIn' });
    }
    
    console.log('🔍 Fetching profile:', profileUrl);
    
    // Intentar con múltiples proxies CORS
    let response = null;
    let lastError = null;
    
    for (const proxy of CORS_PROXIES) {
      try {
        console.log(`   Trying proxy: ${proxy.substring(0, 30)}...`);
        response = await axios.get(`${proxy}${encodeURIComponent(profileUrl)}`, {
          timeout: 20000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        console.log('   ✅ Proxy worked!');
        break;
      } catch (err) {
        console.log(`   ❌ Proxy failed: ${err.message}`);
        lastError = err;
        continue;
      }
    }
    
    if (!response) {
      throw new Error(`All proxies failed. Last error: ${lastError?.message || 'Unknown'}`);
    }
    
    console.log('✅ Profile fetched successfully');
    
    // Extraer datos del perfil
    const profileData = extractProfileData(response.data, profileUrl);
    
    console.log('✅ Profile data extracted:', profileData.name);
    
    // Analizar con Claude
    console.log('🤖 Analyzing with Claude...');
    const analysis = await analyzeWithClaude(profileData);
    
    console.log('✅ Analysis completed - Score:', analysis.scores.total);
    
    // Combinar datos del perfil con análisis
    const result = {
      profile: profileData,
      analysis: analysis,
      timestamp: new Date().toISOString()
    };
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ ERROR analyzing profile:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      error: 'Error al analizar el perfil',
      details: error.message 
    });
  }
});

/**
 * POST /api/chat
 * Chat con IA sobre el análisis
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Mensaje es requerido' });
    }
    
    // Usar Claude para el chat
    const chatPrompt = `Eres un consultor experto en Personal Branding y LinkedIn. 

CONTEXTO DEL PERFIL ANALIZADO:
${context ? JSON.stringify(context, null, 2) : 'No hay contexto disponible'}

El usuario pregunta: "${message}"

Responde de manera concisa, profesional y accionable. Si la pregunta se relaciona con el análisis del perfil, usa el contexto provisto. Si es una pregunta general sobre LinkedIn o personal branding, responde con tu expertise.`;

    const chatResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: chatPrompt
        }
      ]
    });

    const reply = chatResponse.content[0].text;
    
    res.json({ reply });
    
  } catch (error) {
    console.error('Error in chat:', error.message);
    res.status(500).json({ 
      error: 'Error en el chat',
      details: error.message 
    });
  }
});

/**
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ LinkedIn Audit App running on port ${PORT}`);
  console.log(`🌐 Open http://localhost:${PORT}`);
});
