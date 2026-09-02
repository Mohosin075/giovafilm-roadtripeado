const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
require('dotenv').config({ path: 'd:/Mohosin/projects/giovafilm-roadtripeado/.env' });

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-southeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function uploadLogo() {
  const logoPath = 'd:/Mohosin/projects/dashboard/giovafilm_mapping/public/logo.png';
  const fileContent = fs.readFileSync(logoPath);
  const key = 'roadtripeado-logo.png';

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME || 'buddi.script',
    Key: key,
    Body: fileContent,
    ContentType: 'image/png',
  });

  try {
    await s3Client.send(command);
    const publicUrl = `https://${process.env.AWS_BUCKET_NAME || 'buddi.script'}.s3.${process.env.AWS_REGION || 'ap-southeast-1'}.amazonaws.com/${key}`;
    console.log('UPLOAD_SUCCESS:', publicUrl);
  } catch (error) {
    console.error('UPLOAD_FAILED:', error);
  }
}

uploadLogo();
