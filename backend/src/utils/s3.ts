import fs from 'fs';
import path from 'path';
import logger from '../config/logger';

const localSubmissionsDir = path.join(process.cwd(), 'uploads', 'submissions');
if (!fs.existsSync(localSubmissionsDir)) {
  fs.mkdirSync(localSubmissionsDir, { recursive: true });
}

/**
 * Uploads a task submission file to AWS S3.
 * Automatically falls back to local storage if AWS credentials are not set.
 */
export async function uploadSubmissionFile(
  file: Express.Multer.File
): Promise<string> {
  const bucketName = process.env.AWS_S3_BUCKET;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'us-east-1';

  if (bucketName && accessKeyId && secretAccessKey) {
    logger.info(`AWS S3 configured. Attempting upload of ${file.originalname} to S3...`);
    try {
      const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
      const s3Client = new S3Client({
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        region,
      });

      const fileKey = `submissions/${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
      
      let fileBuffer = file.buffer;
      if (!fileBuffer && file.path) {
        fileBuffer = fs.readFileSync(file.path);
      }

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: fileKey,
          Body: fileBuffer,
          ContentType: file.mimetype,
        })
      );

      const s3Url = `https://${bucketName}.s3.${region}.amazonaws.com/${fileKey}`;
      logger.info(`Uploaded file successfully to S3: ${s3Url}`);
      
      // Clean up temp file if multer diskStorage was used
      if (file.path && fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkErr) {}
      }

      return s3Url;
    } catch (err: any) {
      logger.error(`S3 upload failed: ${err.message}. Falling back to local storage.`);
    }
  }

  // Local storage fallback
  const filename = `sub-${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
  const destPath = path.join(localSubmissionsDir, filename);

  if (file.buffer) {
    fs.writeFileSync(destPath, file.buffer);
  } else if (file.path) {
    if (fs.existsSync(file.path)) {
      fs.renameSync(file.path, destPath);
    }
  }

  const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 5000}`;
  const localUrl = `/uploads/submissions/${filename}`; // Return relative path to be consistent with app routing
  logger.info(`Saved submission file locally: ${localUrl}`);
  return localUrl;
}
