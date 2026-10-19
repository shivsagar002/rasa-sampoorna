const sharp = require('sharp');

async function testPlacement() {
  const hamper = await sharp('d:/RASA/public/corporate_gift_hamper_perfect.png')
    .resize(460, 460, { fit: 'inside' })
    .toBuffer();

  const meta = await sharp(hamper).metadata();
  const width = meta.width;
  const height = meta.height;

  // Subtle contact shadow
  const shadowSvg = Buffer.from(
    `<svg width="${width}" height="${height + 25}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="b" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>
      <ellipse cx="${width * 0.46}" cy="${height + 4}" rx="${width * 0.42}" ry="10" fill="rgba(60, 45, 30, 0.4)" filter="url(#b)" />
    </svg>`
  );

  const grounded = await sharp({
    create: {
      width: width,
      height: height + 25,
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

  // Try placing it squarely on the plinth surface: left: 160, top: 320
  await sharp('d:/RASA/public/frames/frame_000000.webp')
    .composite([
      {
        input: grounded,
        left: 170,
        top: 310
      }
    ])
    .toFile('d:/RASA/public/test_square_on_plinth.webp');

  console.log('Test square on plinth saved');
}

testPlacement().catch(console.error);
