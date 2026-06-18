require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 90 * 1000, // 90s
  maxRetries: 2,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

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
  if (postsCount >= 5) return 5;
  if (postsCount === 4) return 2;
  if (postsCount === 3) return 0;
  if (postsCount === 2) return -2;
  if (postsCount === 1) return -4;
  return -5;
}

/**
 * Analyze profile with Claude AI (texto + métricas, sin imágenes).
 * Usa streaming hacia la API de Anthropic para evitar errores de
 * "Premature close" en respuestas largas sobre hostings como Render.
 */
async function analyzeWithClaude(profileData) {
  const textPrompt = `Eres un experto en Personal Branding con 15+ años de experiencia. Analiza este perfil profesional usando el siguiente framework:

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

BONIFICACIONES Y PENALIZACIONES POR MÉTRICAS (usa el signo exacto, pueden ser negativas):
- Seguidores: ${profileData.bonuses.followers >= 0 ? '+' : ''}${profileData.bonuses.followers} pts (${profileData.followers < 500 ? '<500' : profileData.followers < 2000 ? '500-2K' : profileData.followers < 10000 ? '2K-10K' : '10K+'})
- Premium: ${profileData.bonuses.premium >= 0 ? '+' : ''}${profileData.bonuses.premium} pts (+3 Credibilidad, +3 SEO)
- Verificado: ${profileData.bonuses.verified >= 0 ? '+' : ''}${profileData.bonuses.verified} pts (+2 Credibilidad, +2 Visual)
- Foto de perfil: ${profileData.bonuses.photo >= 0 ? '+' : ''}${profileData.bonuses.photo} pts (Identidad Visual) — ${profileData.hasPhoto ? 'SÍ tiene, bonus' : 'NO tiene, PENALIZA'}
- Foto de portada: ${profileData.bonuses.header >= 0 ? '+' : ''}${profileData.bonuses.header} pts (Identidad Visual) — ${profileData.hasHeader ? 'SÍ tiene, bonus' : 'NO tiene, PENALIZA'}
- Publicaciones últimos 5 días: ${profileData.bonuses.posts >= 0 ? '+' : ''}${profileData.bonuses.posts} pts (Engagement) — meta: 5 posts/5 días. Tiene ${profileData.recentPosts}, ${profileData.bonuses.posts < 0 ? 'PENALIZA por debajo de la meta' : 'cumple o supera la meta'}
- TOTAL NETO (puede ser negativo): ${profileData.bonuses.total >= 0 ? '+' : ''}${profileData.bonuses.total} pts

FRAMEWORK DE EVALUACIÓN (100 pts base, ajustado por bonificaciones/penalizaciones netas):
1. IDENTIDAD VISUAL (20 base ${profileData.isVerified ? '+ 2 verificado' : ''} ${profileData.bonuses.photo >= 0 ? '+ ' + profileData.bonuses.photo + ' foto' : profileData.bonuses.photo + ' foto (PENALIZA)'} ${profileData.bonuses.header >= 0 ? '+ ' + profileData.bonuses.header + ' header' : profileData.bonuses.header + ' header (PENALIZA)'})
2. PROPUESTA DE VALOR (20 base) - Claridad, diferenciación, CTA en headline/about
3. CREDIBILIDAD (20 base ${profileData.hasPremium ? '+ 3 premium' : ''} ${profileData.isVerified ? '+ 2 verificado' : ''}) - Experiencia, logros, autoridad
4. VISIBILIDAD SEO (20 base ${profileData.hasPremium ? '+ 3 premium' : ''}) - Keywords estratégicas en headline/about/skills
5. ENGAGEMENT (20 base ${profileData.bonuses.followers >= 0 ? '+ ' + profileData.bonuses.followers + ' seguidores' : ''} ${profileData.bonuses.posts >= 0 ? '+ ' + profileData.bonuses.posts + ' frecuencia' : profileData.bonuses.posts + ' frecuencia (PENALIZA)'}) - Infiere consistencia y probable interacción a partir de la frecuencia de publicación y el alcance (seguidores), ya que no se proporcionan capturas de posts.

CALIBRACIÓN:
- Baseline mínimo SIN penalizaciones: 60 pts (perfil completo y profesional)
- Perfil excelente: 80-95 pts base
- Score final = base + bonus/penalización neta (puede bajar del baseline por falta de foto, header o publicaciones)
- Nunca dejes el score final por debajo de 30

APLICACIÓN EXACTA (aplica el signo, pueden restar):
- Identidad Visual: ${profileData.isVerified ? '+ 2 (verificado) ' : ''}${profileData.bonuses.photo >= 0 ? '+ ' + profileData.bonuses.photo + ' (foto)' : profileData.bonuses.photo + ' (sin foto)'} ${profileData.bonuses.header >= 0 ? '+ ' + profileData.bonuses.header + ' (header)' : profileData.bonuses.header + ' (sin header)'}
- Credibilidad: ${profileData.hasPremium ? '+ 3 (premium) ' : ''}${profileData.isVerified ? '+ 2 (verificado)' : ''}
- Visibilidad SEO: ${profileData.hasPremium ? '+ 3 (premium) ' : ''}${profileData.bonuses.followers > 0 ? '+ ' + Math.floor(profileData.bonuses.followers / 2) + ' (alcance)' : ''}
- Engagement: ${profileData.bonuses.followers > 0 ? '+ ' + Math.ceil(profileData.bonuses.followers / 2) + ' (seguidores) ' : ''}${profileData.bonuses.posts >= 0 ? '+ ' + profileData.bonuses.posts + ' (frecuencia)' : profileData.bonuses.posts + ' (frecuencia insuficiente)'}

RESPONDE SOLO CON JSON VÁLIDO (sin markdown, sin backticks, sin texto antes o después):
{
  "scores": {
    "identidadVisual": número,
    "propuestaValor": número,
    "credibilidad": número,
    "visibilidadSEO": número,
    "engagement": número,
    "total": número
  },
  "nivel": "Básico|Profesional|Élite",
  "resumenEjecutivo": {
    "fortalezas": ["insight 1", "insight 2", "insight 3"],
    "debilidades": ["área de mejora 1", "área de mejora 2"]
  },
  "analisisDetallado": {
    "identidadVisual": { "score": número, "fortalezas": "texto", "oportunidades": "texto" },
    "propuestaValor": { "score": número, "fortalezas": "texto", "oportunidades": "texto" },
    "credibilidad": { "score": número, "fortalezas": "texto", "oportunidades": "texto" },
    "visibilidadSEO": { "score": número, "fortalezas": "texto con keywords", "oportunidades": "keywords faltantes + estrategia" },
    "engagement": { "score": número, "fortalezas": "texto", "oportunidades": "estrategia de contenido y frecuencia óptima" }
  },
  "oportunidades": [
    { "prioridad": "alta|media|baja", "titulo": "texto", "impacto": "texto", "accion": "texto" }
  ],
  "planAccion": {
    "semanas1_2": ["acción 1", "acción 2", "acción 3"],
    "semanas3_6": ["acción 1", "acción 2", "acción 3"],
    "semanas7_12": ["acción 1", "acción 2", "acción 3"]
  },
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "keywordsMissing": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "hashtagsRecommended": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5", "hashtag6", "hashtag7", "hashtag8", "hashtag9", "hashtag10"]
}

Genera exactamente 3 oportunidades. Sé específico y usa la industria detectada (${profileData.industry}) para las keywords y hashtags.`;

  // Streaming evita "Premature close" en respuestas largas (Render, proxies, etc.)
  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{ role: 'user', content: textPrompt }]
  });

  const finalMessage = await stream.finalMessage();
  const responseText = finalMessage.content[0].text;

  const cleanedResponse = responseText
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  return JSON.parse(cleanedResponse);
}

/**
 * POST /api/analyze
 * Analiza un perfil profesional con texto + métricas (sin imágenes)
 */
app.post('/api/analyze', async (req, res) => {
  try {
    const { name, headline, about, experience, skills, followers, hasPremium, isVerified, hasPhoto, hasHeader, recentPosts } = req.body;

    if (!name || !headline || !about) {
      return res.status(400).json({
        error: 'Faltan campos requeridos: nombre, headline y about son obligatorios'
      });
    }

    console.log('📝 Analyzing profile:', name);

    // Parse metrics
    const followersCount = parseInt(followers) || 0;
    const isPremium = hasPremium === true || hasPremium === 'true';
    const isAccountVerified = isVerified === true || isVerified === 'true';
    const profileHasPhoto = hasPhoto === true || hasPhoto === 'true';
    const profileHasHeader = hasHeader === true || hasHeader === 'true';
    const recentPostsCount = parseInt(recentPosts) || 0;

    // Calculate bonus/penalty points based on metrics
    const followersBonus = calculateFollowersBonus(followersCount);
    const premiumBonus = isPremium ? 6 : 0;
    const verifiedBonus = isAccountVerified ? 4 : 0;
    const photoBonus = profileHasPhoto ? 3 : -3;
    const headerBonus = profileHasHeader ? 3 : -3;
    const postsBonus = calculateRecentPostsBonus(recentPostsCount);

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

    console.log('🤖 Analyzing with Claude AI (streaming)...');
    const analysis = await analyzeWithClaude(profileData);
    console.log('✅ Analysis completed - Score:', analysis.scores.total);

    res.json({
      profile: profileData,
      analysis: analysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ ERROR analyzing profile:', error.message);
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

    const chatPrompt = `Eres un consultor experto en Personal Branding.

CONTEXTO DEL PERFIL ANALIZADO:
${context ? JSON.stringify(context, null, 2) : 'No hay contexto disponible'}

El usuario pregunta: "${message}"

Responde de manera concisa, profesional y accionable.`;

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: chatPrompt }]
    });

    const finalMessage = await stream.finalMessage();
    const reply = finalMessage.content[0].text;

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
  console.log(`✅ Personal Branding Audit AI running on port ${PORT}`);
  console.log(`🌐 Open http://localhost:${PORT}`);
});
