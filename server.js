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
  timeout: 120 * 1000, // 120s - evita que la conexión cuelgue indefinidamente
  maxRetries: 2,       // reintenta automáticamente ante "Premature close" u otros fallos de red
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB per file (las imágenes se comprimen en el cliente antes de subir)
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
- Seguidores: ${profileData.followers}
- LinkedIn Premium: ${profileData.hasPremium ? 'SÍ ⭐' : 'NO'}
- Cuenta Verificada: ${profileData.isVerified ? 'SÍ ✓' : 'NO'}
- Foto de perfil: ${profileData.hasPhoto ? 'SÍ' : 'NO'}
- Foto de portada (Header/Banner): ${profileData.hasHeader ? 'SÍ' : 'NO'}
- Publicaciones en los últimos 5 días: ${profileData.recentPosts}
- Posts recientes: ${postImages.length} screenshots proporcionados

BONIFICACIONES Y PENALIZACIONES POR MÉTRICAS (usa el signo exacto, pueden ser negativas):
- Seguidores: ${profileData.bonuses.followers >= 0 ? '+' : ''}${profileData.bonuses.followers} pts (${profileData.followers < 500 ? '<500' : profileData.followers < 2000 ? '500-2K' : profileData.followers < 10000 ? '2K-10K' : '10K+'})
- Premium: ${profileData.bonuses.premium >= 0 ? '+' : ''}${profileData.bonuses.premium} pts (+3 Credibilidad, +3 SEO)
- Verificado: ${profileData.bonuses.verified >= 0 ? '+' : ''}${profileData.bonuses.verified} pts (+2 Credibilidad, +2 Visual)
- Foto de perfil: ${profileData.bonuses.photo >= 0 ? '+' : ''}${profileData.bonuses.photo} pts (Identidad Visual) — ${profileData.hasPhoto ? 'SÍ tiene, bonus' : 'NO tiene, PENALIZA'}
- Foto de portada: ${profileData.bonuses.header >= 0 ? '+' : ''}${profileData.bonuses.header} pts (Identidad Visual) — ${profileData.hasHeader ? 'SÍ tiene, bonus' : 'NO tiene, PENALIZA'}
- Publicaciones últimos 5 días: ${profileData.bonuses.posts >= 0 ? '+' : ''}${profileData.bonuses.posts} pts (Engagement) — meta: 5 posts/5 días. Tiene ${profileData.recentPosts}, ${profileData.bonuses.posts < 0 ? 'PENALIZA por debajo de la meta' : 'cumple o supera la meta'}
- TOTAL NETO (puede ser negativo): ${profileData.bonuses.total >= 0 ? '+' : ''}${profileData.bonuses.total} pts

FRAMEWORK DE EVALUACIÓN (100 puntos base, ajustado por bonificaciones/penalizaciones netas):

1. IDENTIDAD VISUAL (20 pts base ${profileData.isVerified ? '+ 2 verificado' : ''} ${profileData.bonuses.photo >= 0 ? '+ ' + profileData.bonuses.photo + ' foto' : profileData.bonuses.photo + ' foto (PENALIZA)'} ${profileData.bonuses.header >= 0 ? '+ ' + profileData.bonuses.header + ' header' : profileData.bonuses.header + ' header (PENALIZA)'}) - Evalúa coherencia profesional, foto y banner
2. PROPUESTA DE VALOR (20 pts base) - Claridad, diferenciación, CTA
3. CREDIBILIDAD (20 pts base ${profileData.hasPremium ? '+ 3 premium' : ''} ${profileData.isVerified ? '+ 2 verificado' : ''}) - Experiencia, logros, autoridad
4. VISIBILIDAD SEO (20 pts base ${profileData.hasPremium ? '+ 3 premium' : ''}) - Keywords estratégicas, optimización
5. ENGAGEMENT (20 pts base ${profileData.bonuses.followers >= 0 ? '+ ' + profileData.bonuses.followers + ' seguidores' : ''} ${profileData.bonuses.posts >= 0 ? '+ ' + profileData.bonuses.posts + ' frecuencia posts' : profileData.bonuses.posts + ' frecuencia posts (PENALIZA)'}) - Actividad, interacción, consistencia

${postImages.length > 0 ? `
ANÁLISIS DE POSTS (CRÍTICO):
- Revisa CADA screenshot de post que te envío
- Identifica: likes, comentarios, shares visibles
- Calcula tasa de engagement aproximada
- Detecta tipo de contenido (educativo, comercial, thought leadership)
- Evalúa frecuencia de publicación
- Identifica qué posts generan más engagement
` : `
NOTA: No hay screenshots de posts. Evalúa engagement basado en la completitud del perfil y asume engagement bajo (máx 12/20 antes de bonus/penalización).
`}

CALIBRACIÓN IMPORTANTE:
- Baseline mínimo SIN penalizaciones: 60 puntos (perfil profesional básico completo)
- Si publica activamente (${postImages.length}+ posts recientes): mínimo 70 puntos base
- Perfil excelente + actividad consistente: 80-95 puntos base
- BONUS/PENALIZACIÓN NETA TOTAL: ${profileData.bonuses.total >= 0 ? '+' : ''}${profileData.bonuses.total} pts
- Score final = score base + bonus neto (PUEDE bajar del baseline si hay penalizaciones por falta de foto, header o publicaciones)
- Nunca dejes el score final por debajo de 30, incluso con todas las penalizaciones aplicadas

APLICACIÓN EXACTA DE BONUSES/PENALIZACIONES (aplica el signo, pueden restar):
- Identidad Visual: base ${profileData.isVerified ? '+ 2 (verificado) ' : ''}${profileData.bonuses.photo >= 0 ? '+ ' + profileData.bonuses.photo + ' (foto)' : profileData.bonuses.photo + ' (sin foto)'} ${profileData.bonuses.header >= 0 ? '+ ' + profileData.bonuses.header + ' (header)' : profileData.bonuses.header + ' (sin header)'}
- Propuesta de Valor: base (sin bonus)
- Credibilidad: base ${profileData.hasPremium ? '+ 3 (premium) ' : ''}${profileData.isVerified ? '+ 2 (verificado)' : ''}
- Visibilidad SEO: base ${profileData.hasPremium ? '+ 3 (premium) ' : ''}${profileData.bonuses.followers > 0 ? '+ ' + Math.floor(profileData.bonuses.followers/2) + ' (alcance)' : ''}
- Engagement: base ${profileData.bonuses.followers > 0 ? '+ ' + Math.ceil(profileData.bonuses.followers/2) + ' (seguidores) ' : ''}${profileData.bonuses.posts >= 0 ? '+ ' + profileData.bonuses.posts + ' (frecuencia)' : profileData.bonuses.posts + ' (frecuencia insuficiente)'}

RESPONDE EN FORMATO JSON ESTRICTO (sin markdown, sin backticks):
{
  "scores": {
    "identidadVisual": número (incluye bonus verificado si aplica),
    "propuestaValor": número (base, sin bonus),
    "credibilidad": número (incluye bonus premium + verificado si aplica),
    "visibilidadSEO": número (incluye bonus premium + parte seguidores si aplica),
    "engagement": número (incluye bonus seguidores si aplica),
    "total": número (suma de todos incluyendo bonuses)
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
  "keywords": ["keyword1 actual", "keyword2 actual", "keyword3 actual"],
  "keywordsMissing": ["keyword faltante1", "keyword faltante2", "keyword faltante3", "keyword faltante4", "keyword faltante5"],
  "hashtagsRecommended": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5", "hashtag6", "hashtag7", "hashtag8", "hashtag9", "hashtag10"]
}

IMPORTANTE PARA KEYWORDS Y HASHTAGS:
- "keywords": 5-7 keywords que el usuario YA está usando (detectadas en su headline/about/experiencia)
- "keywordsMissing": 5-7 keywords estratégicas que le FALTAN (alta prioridad SEO para su industria: ${profileData.industry})
- "hashtagsRecommended": 10-15 hashtags específicos para ${profileData.industry} que maximizarán alcance en LinkedIn`;

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
    model: 'claude-sonnet-4-6',
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
app.post('/api/analyze', upload.array('postImages', 6), async (req, res) => {
  try {
    const { name, headline, about, experience, skills, followers, hasPremium, isVerified, hasPhoto, hasHeader, recentPosts } = req.body;
    const postImages = req.files || [];
    
    // Validation
    if (!name || !headline || !about) {
      return res.status(400).json({ 
        error: 'Faltan campos requeridos: nombre, headline y about son obligatorios' 
      });
    }
    
    console.log('📝 Analyzing profile:', name);
    console.log('👥 Followers:', followers);
    console.log('⭐ Premium:', hasPremium === 'true');
    console.log('✓ Verified:', isVerified === 'true');
    console.log('🖼️ Has photo:', hasPhoto === 'true');
    console.log('🎨 Has header:', hasHeader === 'true');
    console.log('📅 Recent posts (5d):', recentPosts);
    console.log('📸 Post images:', postImages.length);
    
    // Parse metrics
    const followersCount = parseInt(followers) || 0;
    const isPremium = hasPremium === 'true';
    const isAccountVerified = isVerified === 'true';
    const profileHasPhoto = hasPhoto === 'true';
    const profileHasHeader = hasHeader === 'true';
    const recentPostsCount = parseInt(recentPosts) || 0;
    
    // Calculate bonus/penalty points based on metrics
    const followersBonus = calculateFollowersBonus(followersCount);
    const premiumBonus = isPremium ? 6 : 0; // +3 Credibilidad + +3 SEO
    const verifiedBonus = isAccountVerified ? 4 : 0; // +2 Credibilidad + +2 Visual
    const photoBonus = profileHasPhoto ? 3 : -3; // +3/-3 Identidad Visual
    const headerBonus = profileHasHeader ? 3 : -3; // +3/-3 Identidad Visual
    const postsBonus = calculateRecentPostsBonus(recentPostsCount); // +5 a -5 Engagement
    
    console.log('💰 Bonuses - Followers:', followersBonus, 'Premium:', premiumBonus, 'Verified:', verifiedBonus, 'Photo:', photoBonus, 'Header:', headerBonus, 'Posts:', postsBonus);
    
    // Build profile data
    const profileData = {
      name,
      headline,
      about,
      experience: experience || 'No proporcionado',
      skills: skills || 'No proporcionado',
      followers: followersCount,
      hasPremium: isPremium,
      isVerified: isAccountVerified,
      hasPhoto: profileHasPhoto,
      hasHeader: profileHasHeader,
      recentPosts: recentPostsCount,
      industry: detectIndustry(headline, about),
      photoUrl: '',
      bonuses: {
        followers: followersBonus,
        premium: premiumBonus,
        verified: verifiedBonus,
        photo: photoBonus,
        header: headerBonus,
        posts: postsBonus,
        total: followersBonus + premiumBonus + verifiedBonus + photoBonus + headerBonus + postsBonus
      }
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
 * Calculate followers bonus points
 */
function calculateFollowersBonus(followers) {
  if (followers >= 10000) return 6;
  if (followers >= 2000) return 4;
  if (followers >= 500) return 2;
  return 0;
}

/**
 * Calculate recent posts bonus/penalty (last 5 days)
 * Target: 5 posts in 5 days = consistencia ideal
 */
function calculateRecentPostsBonus(postsCount) {
  if (postsCount >= 5) return 5;   // Cumple o supera el objetivo
  if (postsCount === 4) return 2;
  if (postsCount === 3) return 0;
  if (postsCount === 2) return -2;
  if (postsCount === 1) return -4;
  return -5; // 0 publicaciones
}

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
      model: 'claude-sonnet-4-6',
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
