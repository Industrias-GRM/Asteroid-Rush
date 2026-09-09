/**
 * ASTEROID RUSH - Módulo de Compartición de Récords
 * Genera una tarjeta visual de puntuación y usa la Web Share API
 */

async function shareRecord(nickname, score, rank, mode, asteroids, powerups) {
  // Crear canvas off-screen
  const canvas = document.createElement('canvas');
  // Asegurar que la fuente esté cargada antes de empezar a dibujar
  await document.fonts.load('bold 20px "Quantico"');

  canvas.width = 600; // Mantener el ancho para buena resolución
  canvas.height = 450; // Más compacto (relación 4:3) para evitar excesivo espacio vertical
  const ctx = canvas.getContext('2d');

  // 1. Fondo - Gradiente Radial Estilo Espacial
  const gradient = ctx.createRadialGradient(300, 225, 50, 300, 225, 400);
  gradient.addColorStop(0, '#1b3258');
  gradient.addColorStop(1, '#050812');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 600, 450);

  // 2. Dibujar Estrellas
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * 600;
    const y = Math.random() * 450;
    const size = Math.random() * 1.5;
    ctx.globalAlpha = Math.random();
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  // 3. Bordes de Neón
  ctx.strokeStyle = '#00bcd4';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, 580, 430); // Adaptado a altura 450
  ctx.strokeStyle = 'rgba(0, 188, 212, 0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(25, 25, 550, 400); // Adaptado a altura 450

  // Cargar el logo de la nave
  const logo = new Image();
  logo.src = 'icon128.png';
  await new Promise(resolve => {
    logo.onload = resolve;
    logo.onerror = resolve; // Continuar incluso si falla
  });

  // Dibujar Logo a izquierda y derecha
  if (logo.complete && logo.naturalHeight !== 0) {
    ctx.drawImage(logo, 50, 30, 60, 60); // Más integrado y compacto
    ctx.drawImage(logo, 600 - 60 - 50, 30, 60, 60);
  }

  // 4. Logo y Título
  ctx.textAlign = 'center';
  ctx.fillStyle = '#00bcd4';
  ctx.font = 'bold 28px "Quantico", sans-serif'; // Título principal
  ctx.shadowBlur = 15;
  ctx.shadowColor = '#00bcd4';
  ctx.fillText('ASTEROID RUSH', 300, 65);
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '14px "Quantico", sans-serif';
  const reportText = i18n.t("share_mission_report") || "REPORTE DE MISIÓN FINALIZADA";
  ctx.fillText(reportText.toUpperCase(), 300, 90);

  // 5. Info del Jugador
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px "Quantico", sans-serif';
  ctx.fillText(nickname.toUpperCase(), 300, 125, 500);

  // 6. Dos columnas: Puntos y Rank
  // Columna Izquierda: Puntuación
  const scoreStr = score.toLocaleString();
  const scoreSize = 60;

  ctx.fillStyle = '#ffc107';
  ctx.font = `bold ${scoreSize}px "Quantico", sans-serif`;
  ctx.shadowBlur = 20;
  ctx.shadowColor = '#ffc107';
  ctx.fillText(scoreStr, 180, 190); // Más compacto (antes 230), sin compresión horizontal
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(255, 193, 7, 0.6)';
  ctx.font = 'bold 14px "Quantico", sans-serif';
  const ptsText = i18n.t("share_total_points") || "PUNTOS TOTALES";
  ctx.fillText(ptsText.toUpperCase(), 180, 215);

  // Columna Derecha: Rank
  const rankStr = String(rank);
  const rankSize = 60;

  ctx.fillStyle = '#50e3c2';
  ctx.font = `bold ${rankSize}px "Quantico", sans-serif`;
  ctx.shadowBlur = 20;
  ctx.shadowColor = '#50e3c2';
  ctx.fillText(rankStr, 420, 190); // Más compacto (antes 230), sin compresión horizontal
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(80, 227, 194, 0.6)';
  ctx.font = 'bold 14px "Quantico", sans-serif';
  const rankText = i18n.t("share_rank") || "RANGO";
  ctx.fillText(rankText.toUpperCase(), 420, 215);

  // 7. Segunda fila de estadísticas: Meteoritos y Power-ups
  const astStr = asteroids.toLocaleString();
  const powStr = powerups.toLocaleString();
  let statsSize = 42;
  if (astStr.length > 8 || powStr.length > 8) statsSize = 30;
  if (astStr.length > 11 || powStr.length > 11) statsSize = 22;

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${statsSize}px "Quantico", sans-serif`;
  ctx.fillText(astStr, 180, 270, 240); // Más compacto (antes 320)
  ctx.fillText(powStr, 420, 270, 240);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = 'bold 12px "Quantico", sans-serif';
  const astLabel = i18n.t("stat_asteroids") || "METEORITOS";
  const powLabel = i18n.t("stat_powerups") || "POWER-UPS";
  ctx.fillText(astLabel.toUpperCase(), 180, 295);
  ctx.fillText(powLabel.toUpperCase(), 420, 295);

  // 8. Modo de Juego
  ctx.fillStyle = '#00bcd4';
  ctx.font = 'bold 18px "Quantico", sans-serif';
  const modeKey = mode === 'fast' ? "mode_fast" : (mode === 'swingcopter' ? "mode_zigzag" : "mode_normal");
  const modeName = i18n.t(modeKey).toUpperCase();
  ctx.fillText(modeName, 300, 345, 500); // Más compacto (antes 400)

  // 9. Pie de página promocional
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = 'italic 10px "Quantico", sans-serif';
  const footerText = i18n.t("share_footer") || "¿Crees que puedes superarlo? ¡Descarga Asteroid Rush y lucha por el récord!";
  ctx.fillText(footerText, 300, 405, 540); // Más compacto (antes 460)

  // 10. Convertir a Blob para compartir
  try {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const file = new File([blob], 'asteroid-rush-score.png', { type: 'image/png' });

    const shareData = {
      title: 'Asteroid Rush - Nuevo Récord',
      text: footerText,
      files: [file]
    };

    // Descargar imagen siempre (Requisito: aparte de compartir, se descargue)
    const link = document.createElement('a');
    link.download = `AsteroidRush_${nickname}_${score}.png`;
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);

    // Usar la Web Share API si está soportada
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share(shareData);
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
    }
  }
}
