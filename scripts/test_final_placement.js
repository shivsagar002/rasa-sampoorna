const sharp = require('sharp');

async function testPlacementFinal() {
  const hamper = await sharp('d:/RASA/public/corporate_gift_hamper_perfect.png')
    .resize(540, 540, { fit: 'inside' })
    .toBuffer();

  const meta = await sharp(hamper).metadata();
  const width = meta.width;
  const height = meta.height;

  // Contact shadow directly beneath the box bases
  // The wooden box is on the left (x ~ 50 to 300, y ~ height-10)
  // The green box is on the right (x ~ 280 to 500, y ~ height-50)
  const shadowSvg = Buffer.from(
    `<svg width="${width + 40}" height="${height + 20}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <filter id="crisp" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <!-- Shadow under wooden box -->
      <ellipse cx="${width * 0.32}" cy="${height - 2}" rx="${width * 0.28}" ry="10" fill="rgba(65, 50, 35, 0.45)" filter="url(#soft)" />
      <ellipse cx="${width * 0.32}" cy="${height - 4}" rx="${width * 0.24}" ry="5" fill="rgba(45, 35, 20, 0.6)" filter="url(#crisp)" />
      <!-- Shadow under green box -->
      <ellipse cx="${width * 0.72}" cy="${height - 18}" rx="${width * 0.24}" ry="10" fill="rgba(65, 50, 35, 0.4)" filter="url(#soft)" />
      <ellipse cx="${width * 0.72}" cy="${height - 20}" rx="${width * 0.2}" ry="5" fill="rgba(45, 35, 20, 0.55)" filter="url(#crisp)" />
    </svg>`
  );

  const finalHamper = await sharp({
    create: {
      width: width + 40,
      height: height + 20,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite([
    { input: shadowSvg, top: 0, left: 0 },
    { input: hamper, top: 0, left: 20 }
  ])
  .png()
  .toBuffer();

  await sharp(finalHamper).toFile('d:/RASA/public/hamper_final_asset.png');

  await sharp('d:/RASA/public/frames/frame_000000.webp')
    .composite([
      {
        input: finalHamper,
        left: 130,
        top: 360
      }
    ])
    .toFile('d:/RASA/public/test_final_frame_0.webp');

  console.log('Saved test_final_frame_0.webp');
}

testPlacementFinal().catch(console.error);
