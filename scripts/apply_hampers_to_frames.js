const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function applyHampers() {
  const hamperPath = 'd:/RASA/public/corporate_gift_hamper_perfect.png';
  const hamperBase = await sharp(hamperPath)
    .resize(540, 540, { fit: 'inside' })
    .toBuffer();

  const totalFadeFrames = 10;
  const maxFrame = 30;

  console.log('Compositing hamper onto frames 0 to ' + maxFrame + '...');

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
    if (f > 20) {
      // Fade out from 1.0 down to 0.0 at frame 30
      opacity = Math.max(0, 1 - (f - 20) / (maxFrame - 20));
    }

    if (opacity <= 0.01) {
      fs.copyFileSync(origPath, targetPath);
      continue;
    }

    let currentHamperBuffer = hamperBase;
    if (opacity < 0.99) {
      const { data, info } = await sharp(hamperBase)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const alphaData = Buffer.from(data);
      for (let i = 3; i < alphaData.length; i += 4) {
        alphaData[i] = Math.round(alphaData[i] * opacity);
      }

      currentHamperBuffer = await sharp(alphaData, {
        raw: { width: info.width, height: info.height, channels: 4 }
      })
      .png()
      .toBuffer();
    }

    await sharp(origPath)
      .composite([
        {
          input: currentHamperBuffer,
          left: 140,
          top: 360
        }
      ])
      .webp({ quality: 92 })
      .toFile(targetPath);
  }

  console.log('Successfully composited hamper onto frames 000000 to 000030!');
}

applyHampers().catch(console.error);
