require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'));
    }
  }
});

/**
 * Detect industry from headline and about
 */
function detectIndustry(headline, about) {
  const combinedText = `${headline} ${about}`.toLowerCase();
  
  const industryKeywords = {
    'Marketing Digital & E-commerce': ['ecommerce', 'e-commerce', 'amazon', 'marketplace', 'digital marketing', 'marketing digital', 'seller', 'ventas online'],
    'Tecnología & Software': ['software', 'developer', 'engineering', 'tech', 'ai', 'ml', 'data', 'programming', 'code'],
    'Finanzas & Consultoría': ['finance', 'consulting', 'investment', 'banking', 'advisory', 'financiero'],
    'Salud & Bienestar': ['health', 'healthcare', 'medical', 'wellness', 'pharma', 'salud'],
    'Educación': ['education', 'teaching', 'professor', 'academic', 'university', 'educación'],
    'Creatividad & Diseño': ['design', 'creative', 'ux', 'ui', 'graphic', 'art', 'diseño'],
    'Emprendimiento': ['entrepreneur', 'startup', 'founder', 'emprendedor', 'cofundador'],
  };
  
  for (const [ind, keywords] of Object.entries(industryKeywords)) {
    if (keywords.some(kw => combinedText.includes(kw))) {
      return ind;
    }
  }
  
  return 'General';
}

/**
 * Convert image buffer to base64 for Claude
 */
function imageToBase64(buffer, mimetype) {
  return {
    type: 'image',
    source: {
      type: 'base64',
      media_type: mimetype,
      data: buffer.toString('base64')
    }
  };
}

/**
 * Analyze profile with Claude AI (with vision for post images)
 */
async function analyzeWithClaude(profileData, postImages) {
  // Build content array with text + images
  const content = [];
  
  // Add text prompt
  const textPrompt = `Eres un experto en Personal Branding y LinkedIn con 15+ años de experiencia. Analiza este perfil de LinkedIn y sus posts recientes usando el siguiente framework profesional:

PERFIL A ANALIZAR:
- Nombre: ${profileData.name}
- Headline: ${profileData.headline}
- About: ${profileData.about}
- Experiencia: ${profileData.experience}
- Skills: ${profileData.skills}
- Industria detectada: ${profileData.industry}
- Posts recientes: ${postImages.length} screenshots proporcionados

FRAMEWORK DE EVALUACIÓN (100 puntos total):

1. IDENTIDAD VISUAL (20 pts) - Evalúa coherencia profesional
2. PROPUESTA DE VALOR (20 pts) - Claridad, diferenciación, CTA
3. CREDIBILIDAD (20 pts) - Experiencia, logros, autoridad
4. VISIBILIDAD SEO (20 pts) - Keywords estratégicas, optimización
5. ENGAGEMENT (20 pts) - Actividad, interacción, consistencia

${postImages.length > 0 ? `
ANÁLISIS DE POSTS (CRÍTICO):
- Revisa CADA screenshot de post que te envío
- Identifica: likes, comentarios, shares visibles
- Calcula tasa de engagement aproximada
- Detecta tipo de contenido (educativo, comercial, thought leadership)
- Evalúa frecuencia de publicación
- Identifica qué posts generan más engagement
` : `
NOTA: No hay screenshots de posts. Evalúa engagement basado en la completitud del perfil y asume engagement bajo (máx 12/20).
`}

CALIBRACIÓN IMPORTANTE:
- Baseline mínimo: 60 puntos (perfil profesional básico completo)
- Si publica activamente (${postImages.length}+ posts recientes): mínimo 70 puntos
- Perfil excelente + actividad consistente: 80-95 puntos
- NUNCA dar menos de 60 si el perfil está completo

RESPONDE EN FORMATO JSON ESTRICTO (sin markdown, sin backticks):
{
  "scores": {
    "identidadVisual": número (10-20),
    "propuestaValor": número (10-20),
    "credibilidad": número (12-20),
    "visibilidadSEO": número (10-20),
    "engagement": número (10-20),
    "total": número (60-95)
  },
  "nivel": "Básico|Profesional|Élite",
  "resumenEjecutivo": {
    "fortalezas": ["insight específico 1", "insight específico 2", "insight específico 3"],
    "debilidades": ["área de mejora 1", "área de mejora 2"]
  },
  "analisisDetallado": {
    "identidadVisual": {
      "score": número,
      "fortalezas": "análisis detallado",
      "oportunidades": "recomendaciones específicas"
    },
    "propuestaValor": {
      "score": número,
      "fortalezas": "análisis detallado",
      "oportunidades": "recomendaciones específicas"
    },
    "credibilidad": {
      "score": número,
      "fortalezas": "análisis detallado",
      "oportunidades": "recomendaciones específicas"
    },
    "visibilidadSEO": {
      "score": número,
      "fortalezas": "análisis detallado con keywords identificadas",
      "oportunidades": "keywords faltantes + estrategia"
    },
    "engagement": {
      "score": número,
      "fortalezas": "análisis de posts + engagement real observado",
      "oportunidades": "estrategia de contenido + frecuencia óptima"
    }
  },
  "engagementAnalysis": {
    "postsAnalyzed": ${postImages.length},
    "avgEngagementRate": "X%",
    "bestPerformingContentType": "tipo",
    "publishingFrequency": "frecuencia detectada",
    "insights": ["insight 1", "insight 2", "insight 3"]
  },
  "oportunidades": [
    {
      "prioridad": "alta|media|baja",
      "titulo": "título accionable",
      "impacto": "impacto específico en score/resultados",
      "accion": "paso concreto a seguir"
    }
  ],
  "planAccion": {
    "semanas1_2": ["acción específica 1", "acción específica 2", "acción específica 3"],
    "semanas3_6": ["acción específica 1", "acción específica 2", "acción específica 3"],
    "semanas7_12": ["acción específica 1", "acción específica 2", "acción específica 3"]
  },
  "nextPosts": [
    {
      "tema": "tema específico",
      "tipo": "educativo|comercial|thought leadership",
      "razon": "por qué este tema funcionará"
    }
  ],
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}`;

  content.push({
    type: 'text',
    text: textPrompt
  });

  // Add post images if available
  if (postImages && postImages.length > 0) {
    for (const img of postImages) {
      content.push(imageToBase64(img.buffer, img.mimetype));
    }
  }

  // Call Claude with vision
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 6000,
    messages: [
      {
        role: 'user',
        content: content
      }
    ]
  });

  const responseText = message.content[0].text;
  
  // Clean response
  const cleanedResponse = responseText
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();
  
  return JSON.parse(cleanedResponse);
}

/**
 * POST /api/analyze
 * Analiza un perfil de LinkedIn con texto + imágenes
 */
app.post('/api/analyze', upload.array('postImages', 10), async (req, res) => {
  try {
    const { name, headline, about, experience, skills } = req.body;
    const postImages = req.files || [];
    
    // Validation
    if (!name || !headline || !about) {
      return res.status(400).json({ 
        error: 'Faltan campos requeridos: nombre, headline y about son obligatorios' 
      });
    }
    
    console.log('📝 Analyzing profile:', name);
    console.log('📸 Post images:', postImages.length);
    
    // Build profile data
    const profileData = {
      name,
      headline,
      about,
      experience: experience || 'No proporcionado',
      skills: skills || 'No proporcionado',
      industry: detectIndustry(headline, about),
      photoUrl: '' // No photo upload in this version
    };
    
    console.log('🏢 Industry detected:', profileData.industry);
    
    // Analyze with Claude
    console.log('🤖 Analyzing with Claude AI...');
    const analysis = await analyzeWithClaude(profileData, postImages);
    
    console.log('✅ Analysis completed - Score:', analysis.scores.total);
    
    // Build result
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
  console.log(`✅ LinkedIn Audit App v2.0 running on port ${PORT}`);
  console.log(`🌐 Open http://localhost:${PORT}`);
  console.log(`📸 Image analysis: ENABLED`);
});
