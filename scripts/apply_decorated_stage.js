const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function applyDecoratedStage() {
  const stage1920Path = 'd:/RASA/public/test_decorated_stage_1920.webp';
  const stageBuffer = await sharp(stage1920Path).toBuffer();

  const maxFrame = 32;
  const fadeStart = 18;

  console.log('Applying decorated stage to frames 0 to ' + maxFrame + '...');

  for (let f = 0; f <= maxFrame; f++) {
    const origName = `ezgif-frame-${String(f + 1).padStart(3, '0')}.webp`;
    const targetName = `frame_${String(f).padStart(6, '0')}.webp`;

    const origPath = path.join('d:/RASA/public/frames-original', origName);
    const targetPath = path.join('d:/RASA/public/frames', targetName);

    if (!fs.existsSync(origPath)) {
      console.warn('Original not found:', origPath);
      continue;
    }

    let opacity = 1.0;
    if (f >= fadeStart) {
      opacity = Math.max(0, 1 - (f - fadeStart) / (maxFrame - fadeStart));
    }

    if (opacity <= 0.01) {
      fs.copyFileSync(origPath, targetPath);
      continue;
    }

    if (opacity >= 0.99) {
      await sharp(stageBuffer)
        .webp({ quality: 92 })
        .toFile(targetPath);
    } else {
      // Crossfade stageBuffer over origPath with opacity
      const { data, info } = await sharp(stageBuffer)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const alphaData = Buffer.from(data);
      for (let i = 3; i < alphaData.length; i += 4) {
        alphaData[i] = Math.round(alphaData[i] * opacity);
      }

      const fadedStage = await sharp(alphaData, {
        raw: { width: info.width, height: info.height, channels: 4 }
      })
      .png()
      .toBuffer();

      await sharp(origPath)
        .composite([{ input: fadedStage, left: 0, top: 0 }])
        .webp({ quality: 92 })
        .toFile(targetPath);
    }
  }

  console.log('Successfully updated frames 000000 to 000032 with decorated stage!');
}

applyDecoratedStage().catch(console.error);
