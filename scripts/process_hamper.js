const path = require('path');
const sharp = require('sharp');
const fs = require('fs');

async function processHamper() {
  const hamperPath = 'd:/RASA/public/corporate_gift_hamper_perfect.png';
  const hamper = await sharp(hamperPath)
    .resize(540, 540, { fit: 'inside' })
    .toBuffer();

  const meta = await sharp(hamper).metadata();
  const width = meta.width;
  const height = meta.height;

  // Create an SVG shadow for underneath the wooden and green box
  const shadowSvg = Buffer.from(
    `<svg width="${width}" height="${height + 50}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="blur1" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
        <filter id="blur2" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      <!-- Diffuse ambient ground shadow -->
      <ellipse cx="${width * 0.46}" cy="${height - 6}" rx="${width * 0.44}" ry="18" fill="rgba(80, 60, 45, 0.38)" filter="url(#blur1)" />
      <!-- Sharp contact occlusion shadow -->
      <ellipse cx="${width * 0.38}" cy="${height - 12}" rx="${width * 0.32}" ry="8" fill="rgba(60, 45, 30, 0.55)" filter="url(#blur2)" />
    </svg>`
  );

  const hamperWithShadow = await sharp({
    create: {
      width: width,
      height: height + 50,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite([
    { input: shadowSvg, top: 0, left: 0 },
    { input: hamper, top: 0, left: 0 }
  ])
  .png()
  .toBuffer();

  await sharp(hamperWithShadow).toFile('d:/RASA/public/hamper_grounded.png');

  // Test composite on frame 0
  await sharp('d:/RASA/public/frames/frame_000000.webp')
    .composite([
      {
        input: hamperWithShadow,
        left: 140,
        top: 360
      }
    ])
    .toFile('d:/RASA/public/test_hamper_grounded_frame_0.webp');

  console.log('Saved hamper_grounded test successfully!');
}

processHamper().catch(console.error);
