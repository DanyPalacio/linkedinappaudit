// Global state
let currentAnalysis = null;
let currentProfile = null;

// API base URL - change for production
const API_BASE = window.location.origin;

/**
 * Update file count display
 */
function updateFileCount() {
    const input = document.getElementById('postImages');
    const count = input.files.length;
    const display = document.getElementById('fileCount');
    
    if (count === 0) {
        display.textContent = 'No se han seleccionado archivos';
        display.style.color = 'var(--color-text-secondary)';
    } else if (count > 6) {
        display.textContent = `⚠️ ${count} archivos seleccionados. Máximo permitido: 6. Por favor selecciona menos.`;
        display.style.color = '#dc2626';
    } else {
        display.textContent = `${count} archivo${count > 1 ? 's' : ''} seleccionado${count > 1 ? 's' : ''}`;
        display.style.color = 'var(--color-primary)';
    }
}

/**
 * Compress an image file in the browser before uploading.
 * Resizes to a max dimension and re-encodes as JPEG, which typically
 * reduces payload size by 80-90% without losing legibility for Claude Vision.
 */
function compressImage(file, maxDimension = 1280, quality = 0.72) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;

                if (width > maxDimension || height > maxDimension) {
                    const ratio = Math.min(maxDimension / width, maxDimension / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (!blob) {
                        // Si falla la compresión, usamos el archivo original como fallback
                        resolve(file);
                        return;
                    }
                    const compressedFile = new File(
                        [blob],
                        file.name.replace(/\.[^.]+$/, '') + '.jpg',
                        { type: 'image/jpeg' }
                    );
                    resolve(compressedFile);
                }, 'image/jpeg', quality);
            };
            img.onerror = () => resolve(file); // fallback al original si no se puede leer
            img.src = e.target.result;
        };
        reader.onerror = () => resolve(file); // fallback al original
        reader.readAsDataURL(file);
    });
}

/**
 * Analyze LinkedIn profile
 */
async function analyzeProfile() {
    // Get form data
    const name = document.getElementById('profileName').value.trim();
    const headline = document.getElementById('profileHeadline').value.trim();
    const about = document.getElementById('profileAbout').value.trim();
    const experience = document.getElementById('profileExperience').value.trim();
    const skills = document.getElementById('profileSkills').value.trim();
    const followers = document.getElementById('profileFollowers').value.trim();
    const hasPremium = document.getElementById('profilePremium').checked;
    const isVerified = document.getElementById('profileVerified').checked;
    const hasPhoto = document.getElementById('profileHasPhoto').checked;
    const hasHeader = document.getElementById('profileHasHeader').checked;
    const recentPosts = document.getElementById('profileRecentPosts').value.trim();
    const postImages = document.getElementById('postImages').files;
    
    // Validation
    if (!name || !headline || !about) {
        alert('Por favor completa al menos: Nombre, Headline y About');
        return;
    }
    
    if (postImages.length > 6) {
        alert('Por favor selecciona un máximo de 6 screenshots. Esto ayuda a que el análisis sea más rápido y confiable.');
        return;
    }
    
    // Show loading
    document.getElementById('landingSection').style.display = 'none';
    document.getElementById('loadingSection').classList.add('active');
    document.getElementById('resetBtn').style.display = 'none';
    
    // Simulate loading steps
    const steps = [
        'Procesando tu información...',
        'Analizando screenshots de posts...',
        'Evaluando engagement y estrategia...',
        'Calculando métricas de credibilidad...',
        'Generando insights con IA...',
        'Creando plan de acción personalizado...'
    ];
    
    let stepIndex = 0;
    const stepInterval = setInterval(() => {
        if (stepIndex < steps.length) {
            document.getElementById('loadingSteps').textContent = steps[stepIndex];
            stepIndex++;
        }
    }, 3000);
    
    try {
        // Comprimir imágenes en el navegador antes de subirlas (reduce timeouts y errores de red)
        if (postImages.length > 0) {
            document.getElementById('loadingSteps').textContent = 'Optimizando imágenes...';
        }
        const compressedImages = await Promise.all(
            Array.from(postImages).map(file => compressImage(file))
        );

        // Prepare FormData with images
        const formData = new FormData();
        formData.append('name', name);
        formData.append('headline', headline);
        formData.append('about', about);
        formData.append('experience', experience);
        formData.append('skills', skills);
        formData.append('followers', followers || '0');
        formData.append('hasPremium', hasPremium);
        formData.append('isVerified', isVerified);
        formData.append('hasPhoto', hasPhoto);
        formData.append('hasHeader', hasHeader);
        formData.append('recentPosts', recentPosts || '0');
        
        // Add compressed images
        compressedImages.forEach(file => {
            formData.append('postImages', file);
        });
        
        // Timeout real para evitar que la UI se quede colgada indefinidamente
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 110000); // 110s
        
        const response = await fetch(`${API_BASE}/api/analyze`, {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        clearInterval(stepInterval);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.details || 'Error al analizar el perfil');
        }
        
        const data = await response.json();
        
        // Store data
        currentAnalysis = data.analysis;
        currentProfile = data.profile;
        
        // Hide loading, show results
        document.getElementById('loadingSection').classList.remove('active');
        document.getElementById('resultsSection').classList.add('active');
        document.getElementById('resetBtn').style.display = 'block';
        
        // Render results
        renderResults(data);
        
    } catch (error) {
        clearInterval(stepInterval);
        document.getElementById('loadingSection').classList.remove('active');
        document.getElementById('landingSection').style.display = 'block';
        
        if (error.name === 'AbortError') {
            alert('El análisis tardó demasiado y se canceló. Intenta de nuevo con menos screenshots (3-5 suele ser suficiente), o vuelve a intentarlo en unos segundos.');
        } else {
            alert(`Error: ${error.message}`);
        }
        console.error('Analysis error:', error);
    }
}

/**
 * Render all results
 */
function renderResults(data) {
    const { profile, analysis } = data;
    
    // Profile header
    document.getElementById('profileName').textContent = profile.name;
    document.getElementById('profileHeadline').textContent = profile.headline;
    document.getElementById('profileIndustry').textContent = profile.industry;
    
    // Profile photo
    const photoElement = document.getElementById('profilePhoto');
    if (profile.photoUrl) {
        photoElement.src = profile.photoUrl;
        photoElement.alt = profile.name;
    } else {
        photoElement.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%230A66C2"/%3E%3Ctext x="50" y="65" font-size="40" fill="white" text-anchor="middle" font-family="Arial"%3E' + profile.name.charAt(0) + '%3C/text%3E%3C/svg%3E';
    }
    
    // Score
    const score = analysis.scores.total;
    document.getElementById('totalScore').textContent = score;
    document.getElementById('scoreLevel').textContent = analysis.nivel;
    
    // Score description based on level
    const descriptions = {
        'Crítico': 'Tu perfil necesita mejoras urgentes. Con optimizaciones específicas podrías mejorar significativamente tu presencia.',
        'Básico': 'Tu perfil tiene los elementos esenciales pero hay oportunidades importantes de mejora.',
        'Profesional': 'Tu perfil está bien posicionado. Con optimizaciones específicas podrías alcanzar el nivel élite.',
        'Élite': '¡Excelente! Tu perfil está optimizado y transmite profesionalismo. Mantén la consistencia.'
    };
    document.getElementById('scoreDescription').textContent = descriptions[analysis.nivel] || descriptions['Profesional'];
    
    // Draw charts
    drawScoreCircle(score);
    renderKeywordsAndHashtags(analysis);
    renderMetricsApplied(profile);
    
    // Metrics grid
    renderMetrics(analysis.analisisDetallado);
    
    // Render tabs content
    renderResumen(analysis.resumenEjecutivo);
    renderAnalisisDetallado(analysis.analisisDetallado);
    renderOportunidades(analysis.oportunidades);
    renderPlanAccion(analysis.planAccion);
}

/**
 * Draw score circle
 */
function drawScoreCircle(score) {
    const canvas = document.getElementById('scoreCircle');
    const ctx = canvas.getContext('2d');
    const centerX = 90;
    const centerY = 90;
    const radius = 70;
    const endAngle = (score / 100) * 2 * Math.PI - Math.PI / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#F0F0F0';
    ctx.lineWidth = 14;
    ctx.stroke();

    // Score arc (animated)
    let currentAngle = -Math.PI / 2;
    const animate = () => {
        if (currentAngle < endAngle) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Background
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            ctx.strokeStyle = '#F0F0F0';
            ctx.lineWidth = 14;
            ctx.stroke();
            
            // Progress
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, -Math.PI / 2, currentAngle);
            ctx.strokeStyle = '#0A66C2';
            ctx.lineWidth = 14;
            ctx.lineCap = 'round';
            ctx.stroke();
            
            currentAngle += 0.05;
            requestAnimationFrame(animate);
        }
    };
    animate();
}

/**
 * Draw radar chart
 */
function drawRadarChart(scores) {
    // Función eliminada - reemplazada por keywords visualization
}

/**
 * Render keywords and hashtags
 */
function renderKeywordsAndHashtags(analysis) {
    // Keywords using (from profile analysis)
    const keywordsUsing = analysis.keywords || [];
    const keywordsUsingEl = document.getElementById('keywordsUsing');
    
    if (keywordsUsing.length > 0) {
        keywordsUsingEl.innerHTML = keywordsUsing.map((kw, index) => {
            const size = index < 3 ? 'lg' : index < 6 ? 'md' : 'sm';
            return `<span class="keyword-tag size-${size}">${kw}</span>`;
        }).join('');
    } else {
        keywordsUsingEl.innerHTML = '<p style="color: var(--color-text-secondary);">No se detectaron keywords específicas</p>';
    }
    
    // Keywords missing (recommendations)
    const keywordsMissing = analysis.keywordsMissing || [];
    const keywordsMissingEl = document.getElementById('keywordsMissing');
    
    if (keywordsMissing.length > 0) {
        keywordsMissingEl.innerHTML = keywordsMissing.map((kw, index) => {
            const size = index < 3 ? 'lg' : index < 6 ? 'md' : 'sm';
            return `<span class="keyword-tag size-${size}">${kw}</span>`;
        }).join('');
    } else {
        keywordsMissingEl.innerHTML = '<p style="color: var(--color-text-secondary);">Tu perfil tiene buena cobertura de keywords</p>';
    }
    
    // Hashtags recommended
    const hashtags = analysis.hashtagsRecommended || [];
    const hashtagsEl = document.getElementById('hashtagsRecommended');
    
    if (hashtags.length > 0) {
        hashtagsEl.innerHTML = hashtags.map(tag => {
            return `<span class="hashtag-tag">#${tag.replace('#', '')}</span>`;
        }).join('');
    } else {
        hashtagsEl.innerHTML = '<p style="color: var(--color-text-secondary);">No hay hashtags recomendados</p>';
    }
}

/**
 * Render metrics applied badges (transparency on score impact)
 */
function renderMetricsApplied(profile) {
    const container = document.getElementById('metricsApplied');
    if (!container || !profile.bonuses) return;

    const b = profile.bonuses;
    const badges = [];

    const fmt = (pts) => (pts >= 0 ? `+${pts}` : `${pts}`);

    badges.push({
        label: `👥 ${profile.followers} seguidores`,
        pts: b.followers,
        type: b.followers > 0 ? 'positive' : 'neutral'
    });
    badges.push({
        label: `⭐ Premium`,
        pts: b.premium,
        type: b.premium > 0 ? 'positive' : 'neutral'
    });
    badges.push({
        label: `✓ Verificado`,
        pts: b.verified,
        type: b.verified > 0 ? 'positive' : 'neutral'
    });
    badges.push({
        label: `🖼️ Foto de perfil`,
        pts: b.photo,
        type: b.photo > 0 ? 'positive' : 'negative'
    });
    badges.push({
        label: `🎨 Foto de portada`,
        pts: b.header,
        type: b.header > 0 ? 'positive' : 'negative'
    });
    badges.push({
        label: `📅 ${profile.recentPosts} posts/5d`,
        pts: b.posts,
        type: b.posts > 0 ? 'positive' : (b.posts < 0 ? 'negative' : 'neutral')
    });

    container.innerHTML = badges.map(badge => `
        <span class="metric-badge ${badge.type}">
            ${badge.label} <strong>${fmt(badge.pts)}</strong>
        </span>
    `).join('');
}

/**
 * Render metrics grid
 */
function renderMetrics(analisis) {
    const metricsGrid = document.getElementById('metricsGrid');
    const categories = [
        { key: 'identidadVisual', label: 'Identidad Visual', icon: '📸' },
        { key: 'propuestaValor', label: 'Propuesta de Valor', icon: '💡' },
        { key: 'credibilidad', label: 'Credibilidad', icon: '⭐' },
        { key: 'visibilidadSEO', label: 'Visibilidad SEO', icon: '🔍' },
        { key: 'engagement', label: 'Engagement', icon: '🔥' }
    ];
    
    metricsGrid.innerHTML = categories.map(cat => {
        const score = analisis[cat.key].score;
        const percentage = Math.round((score / 20) * 100);
        return `
            <div class="metric-card">
                <div class="metric-header">
                    <span class="metric-label">${cat.label}</span>
                    <div class="metric-icon">${cat.icon}</div>
                </div>
                <div class="metric-value">${score}<span style="font-size: 1rem; color: var(--color-text-secondary);">/20</span></div>
                <div style="font-size: 0.875rem; color: var(--color-text-tertiary); margin-bottom: 0.5rem;">${percentage}%</div>
                <div class="metric-progress">
                    <div class="metric-progress-bar" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Render resumen ejecutivo
 */
function renderResumen(resumen) {
    const content = document.getElementById('resumenContent');
    content.innerHTML = `
        <p style="color: var(--color-text-secondary); line-height: 1.8; margin-bottom: 1.5rem;">
            Tu perfil de LinkedIn ha sido analizado en detalle con Inteligencia Artificial. 
            A continuación encontrarás un resumen de tus principales fortalezas y áreas de oportunidad.
        </p>
        
        <div class="analysis-section">
            <h4 style="margin-bottom: 1rem; color: var(--color-text);">✅ Fortalezas Principales</h4>
            <ul class="insights-list">
                ${resumen.fortalezas.map(f => `
                    <li class="insight-item">${f}</li>
                `).join('')}
            </ul>
        </div>
        
        <div class="analysis-section">
            <h4 style="margin-bottom: 1rem; color: var(--color-text);">⚡ Áreas de Mejora</h4>
            <ul class="insights-list">
                ${resumen.debilidades.map(d => `
                    <li class="insight-item warning">${d}</li>
                `).join('')}
            </ul>
        </div>
    `;
}

/**
 * Render análisis detallado
 */
function renderAnalisisDetallado(analisis) {
    const content = document.getElementById('analisisContent');
    const categories = [
        { key: 'identidadVisual', title: '📸 Identidad Visual' },
        { key: 'propuestaValor', title: '💡 Propuesta de Valor' },
        { key: 'credibilidad', title: '⭐ Credibilidad' },
        { key: 'visibilidadSEO', title: '🔍 Visibilidad SEO' },
        { key: 'engagement', title: '🔥 Engagement' }
    ];
    
    content.innerHTML = categories.map(cat => {
        const data = analisis[cat.key];
        return `
            <div class="card" style="margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h3 style="font-size: 1.25rem; font-weight: 700;">${cat.title}</h3>
                    <span style="font-size: 1.5rem; font-weight: 700; color: var(--color-primary);">${data.score}/100</span>
                </div>
                <div style="line-height: 1.8; color: var(--color-text-secondary);">
                    <p><strong style="color: var(--color-text);">Fortalezas:</strong> ${data.fortalezas}</p>
                    <p style="margin-top: 1rem;"><strong style="color: var(--color-text);">Oportunidades:</strong> ${data.oportunidades}</p>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Render oportunidades
 */
function renderOportunidades(oportunidades) {
    const content = document.getElementById('oportunidadesContent');
    
    const grouped = {
        alta: oportunidades.filter(o => o.prioridad === 'alta'),
        media: oportunidades.filter(o => o.prioridad === 'media'),
        baja: oportunidades.filter(o => o.prioridad === 'baja')
    };
    
    const priorityLabels = {
        alta: { icon: '🔴', title: 'Prioridad Alta (Impacto Inmediato)', class: 'alta' },
        media: { icon: '🟡', title: 'Prioridad Media (Consolidación)', class: 'media' },
        baja: { icon: '🟢', title: 'Prioridad Baja (Optimización Continua)', class: 'baja' }
    };
    
    content.innerHTML = Object.entries(grouped).map(([priority, items]) => {
        if (items.length === 0) return '';
        const config = priorityLabels[priority];
        return `
            <div class="analysis-section">
                <h4 style="margin-bottom: 1rem; color: var(--color-text);">${config.icon} ${config.title}</h4>
                <ul class="insights-list">
                    ${items.map((item, index) => `
                        <li class="insight-item ${priority === 'alta' ? 'critical' : priority === 'media' ? 'warning' : ''}">
                            <strong>${index + 1}. ${item.titulo}</strong><br>
                            <em>Impacto:</em> ${item.impacto}<br>
                            <em>Acción:</em> ${item.accion}
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }).join('');
}

/**
 * Render plan de acción
 */
function renderPlanAccion(plan) {
    const content = document.getElementById('planContent');
    
    const phases = [
        { key: 'semanas1_2', title: '📅 Semanas 1-2: Quick Wins', color: '#0A66C2' },
        { key: 'semanas3_6', title: '📅 Semanas 3-6: Construcción de Momentum', color: '#00A0DC' },
        { key: 'semanas7_12', title: '📅 Semanas 7-12: Consolidación y Escalado', color: '#057642' }
    ];
    
    content.innerHTML = `
        <div class="timeline">
            ${phases.map(phase => `
                <div class="timeline-item">
                    <div class="timeline-title" style="color: ${phase.color};">${phase.title}</div>
                    <div class="timeline-actions">
                        <ul>
                            ${plan[phase.key].map(action => `
                                <li>${action}</li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Send chat message
 */
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;

    // Add user message
    const messagesContainer = document.getElementById('chatMessages');
    addChatMessage('user', message);
    input.value = '';

    // Show thinking animation
    const thinkingId = addChatMessage('assistant', `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div class="thinking-dots">
                <span>💭</span>
                <span class="dot">.</span>
                <span class="dot">.</span>
                <span class="dot">.</span>
            </div>
            <span>Pensando</span>
        </div>
    `);

    try {
        const response = await fetch(`${API_BASE}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message,
                context: {
                    profile: currentProfile,
                    analysis: currentAnalysis
                }
            })
        });

        if (!response.ok) {
            throw new Error('Error en el chat');
        }

        const data = await response.json();
        
        // Remove thinking indicator
        document.getElementById(thinkingId).remove();
        
        // Format response into table/structured format
        const formattedReply = formatChatResponse(data.reply);
        
        // Add AI response
        addChatMessage('assistant', formattedReply);

    } catch (error) {
        document.getElementById(thinkingId).remove();
        addChatMessage('assistant', 'Lo siento, ocurrió un error. Por favor intenta de nuevo.');
        console.error('Chat error:', error);
    }
}

/**
 * Format chat response into structured format
 */
function formatChatResponse(text) {
    // Check if response contains numbered list (recommendations)
    const hasNumberedList = /\d+\.\s/.test(text);
    const hasBulletList = /[•\-\*]\s/.test(text);
    
    if (hasNumberedList || hasBulletList) {
        // Parse into structured format
        const lines = text.split('\n').filter(l => l.trim());
        let formatted = '<div class="chat-recommendations">';
        
        lines.forEach(line => {
            line = line.trim();
            
            // Main headers (bold text followed by colon)
            if (line.match(/^\*\*.+\*\*:?/)) {
                formatted += `<div class="rec-header">${line.replace(/\*\*/g, '')}</div>`;
            }
            // Numbered items
            else if (line.match(/^\d+\./)) {
                const cleanLine = line.replace(/^\d+\.\s*/, '').replace(/\*\*/g, '<strong>').replace(/\*\*/g, '</strong>');
                formatted += `<div class="rec-item">
                    <span class="rec-number">${line.match(/^\d+/)[0]}</span>
                    <span class="rec-text">${cleanLine}</span>
                </div>`;
            }
            // Bullet items
            else if (line.match(/^[•\-\*]\s/)) {
                const cleanLine = line.replace(/^[•\-\*]\s*/, '');
                formatted += `<div class="rec-bullet">• ${cleanLine}</div>`;
            }
            // Regular paragraph
            else if (line.length > 0) {
                formatted += `<p class="rec-paragraph">${line}</p>`;
            }
        });
        
        formatted += '</div>';
        return formatted;
    }
    
    // Default: return as is
    return text;
}

/**
 * Add chat message
 */
function addChatMessage(role, content) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageId = 'msg-' + Date.now();
    
    const messageDiv = document.createElement('div');
    messageDiv.id = messageId;
    messageDiv.className = `chat-message ${role === 'user' ? 'user' : ''}`;
    messageDiv.innerHTML = `
        <div class="chat-message-avatar">${role === 'user' ? '👤' : '🤖'}</div>
        <div class="chat-message-content">${content}</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return messageId;
}

/**
 * Export report to HTML
 */
function exportReport() {
    if (!currentAnalysis || !currentProfile) {
        alert('No hay reporte para exportar');
        return;
    }
    
    const timestamp = new Date().toLocaleString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Auditoría LinkedIn - ${currentProfile.name}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 900px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
        h1 { color: #0A66C2; border-bottom: 3px solid #0A66C2; padding-bottom: 0.5rem; }
        h2 { color: #084c94; margin-top: 2rem; }
        .header { background: linear-gradient(135deg, #0A66C2, #084c94); color: white; padding: 2rem; border-radius: 10px; margin-bottom: 2rem; }
        .score { font-size: 4rem; font-weight: bold; text-align: center; color: #0A66C2; }
        .section { background: #f8f9fa; padding: 1.5rem; border-radius: 10px; margin: 1rem 0; }
        .priority-alta { border-left: 4px solid #CC1016; }
        .priority-media { border-left: 4px solid #F5B000; }
        .priority-baja { border-left: 4px solid #057642; }
        .footer { text-align: center; margin-top: 3rem; color: #666; font-size: 0.875rem; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Auditoría de Perfil LinkedIn</h1>
        <p><strong>${currentProfile.name}</strong></p>
        <p>${currentProfile.headline}</p>
        <p>📅 ${timestamp}</p>
    </div>
    
    <div class="score">${currentAnalysis.scores.total}/100</div>
    <p style="text-align: center; font-size: 1.25rem; color: #666;"><strong>Nivel: ${currentAnalysis.nivel}</strong></p>
    
    <h2>📊 Scores por Categoría</h2>
    <div class="section">
        <ul>
            <li>📸 Identidad Visual: <strong>${currentAnalysis.scores.identidadVisual}/100</strong></li>
            <li>💡 Propuesta de Valor: <strong>${currentAnalysis.scores.propuestaValor}/100</strong></li>
            <li>⭐ Credibilidad: <strong>${currentAnalysis.scores.credibilidad}/100</strong></li>
            <li>🔍 Visibilidad SEO: <strong>${currentAnalysis.scores.visibilidadSEO}/100</strong></li>
            <li>🔥 Engagement: <strong>${currentAnalysis.scores.engagement}/100</strong></li>
        </ul>
    </div>
    
    <h2>✅ Fortalezas</h2>
    <div class="section">
        <ul>
            ${currentAnalysis.resumenEjecutivo.fortalezas.map(f => `<li>${f}</li>`).join('')}
        </ul>
    </div>
    
    <h2>⚡ Áreas de Mejora</h2>
    <div class="section">
        <ul>
            ${currentAnalysis.resumenEjecutivo.debilidades.map(d => `<li>${d}</li>`).join('')}
        </ul>
    </div>
    
    <h2>💎 Oportunidades Priorizadas</h2>
    ${currentAnalysis.oportunidades.map(op => `
        <div class="section priority-${op.prioridad}">
            <h3>${op.titulo}</h3>
            <p><strong>Impacto:</strong> ${op.impacto}</p>
            <p><strong>Acción:</strong> ${op.accion}</p>
        </div>
    `).join('')}
    
    <h2>🎯 Plan de Acción de 90 Días</h2>
    <div class="section">
        <h3>Semanas 1-2</h3>
        <ul>${currentAnalysis.planAccion.semanas1_2.map(a => `<li>${a}</li>`).join('')}</ul>
        
        <h3>Semanas 3-6</h3>
        <ul>${currentAnalysis.planAccion.semanas3_6.map(a => `<li>${a}</li>`).join('')}</ul>
        
        <h3>Semanas 7-12</h3>
        <ul>${currentAnalysis.planAccion.semanas7_12.map(a => `<li>${a}</li>`).join('')}</ul>
    </div>
    
    <div class="footer">
        <p>Reporte generado por <strong>LinkedIn Audit</strong> con Inteligencia Artificial</p>
        <p>Powered by Claude AI & OpenAI GPT-4</p>
    </div>
</body>
</html>
    `;
    
    // Create and download file
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LinkedIn-Audit-${currentProfile.name.replace(/\s+/g, '-')}-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Reset app to initial state
 */
function resetApp() {
    currentAnalysis = null;
    currentProfile = null;
    
    document.getElementById('resultsSection').classList.remove('active');
    document.getElementById('loadingSection').classList.remove('active');
    document.getElementById('landingSection').style.display = 'block';
    document.getElementById('resetBtn').style.display = 'none';
    
    // Clear form fields
    document.getElementById('profileName').value = '';
    document.getElementById('profileHeadline').value = '';
    document.getElementById('profileAbout').value = '';
    document.getElementById('profileExperience').value = '';
    document.getElementById('profileSkills').value = '';
    document.getElementById('profileFollowers').value = '';
    document.getElementById('profilePremium').checked = false;
    document.getElementById('profileVerified').checked = false;
    document.getElementById('profileHasPhoto').checked = false;
    document.getElementById('profileHasHeader').checked = false;
    document.getElementById('profileRecentPosts').value = '';
    document.getElementById('postImages').value = '';
    updateFileCount();
    
    // Reset to first tab
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.querySelector('.tab-button').classList.add('active');
    document.getElementById('tab-resumen').classList.add('active');
    
    // Clear chat
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = `
        <div class="chat-message">
            <div class="chat-message-avatar">🤖</div>
            <div class="chat-message-content">
                ¡Hola! He analizado tu perfil en detalle. 
                ¿Tienes alguna pregunta sobre el análisis, las oportunidades o el plan de acción?
            </div>
        </div>
    `;
}

/**
 * Switch tabs
 */
function switchTab(tabName) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById('tab-' + tabName).classList.add('active');
}

