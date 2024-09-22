import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';

const storage = new Storage();

const rawVideoBucketName = 'minja-youtube-raw-videos';
const processedVideoBucketName = 'minja-youtube-processed-videos';

const localRawVideoPath = './raw-videos';
const localProcessedVideoPath = './processed-videos';

export function setupDirectories() {
  ensureDirectoryExistence(localRawVideoPath);
  ensureDirectoryExistence(localProcessedVideoPath);
}

export function convertVideo(rawVideoName: string, processedVideoName: string) {
  return new Promise<void>((resolve, reject) => {
    ffmpeg(`${localRawVideoPath}/${rawVideoName}`)
      .outputOptions('-vf', 'scale=-1:360')
      .on('end', () => {
        console.log('Video processing finished successfully');
        resolve();
      })
      .on('error', (err: any) => {
        console.log('An error occurred: ' + err.message);
        reject(err);
      })
      .save(`${localProcessedVideoPath}/${processedVideoName}`);
  }) 
}

export async function downloadRawVideo(filename: string) {
  await storage.bucket(rawVideoBucketName)
    .file(filename)
    .download({ destination: `${localRawVideoPath}/${filename}` });

  console.log(
    `gs://${rawVideoBucketName}/${filename} downloaded to ${localRawVideoPath}/${filename}`
  );
}

export async function uploadProcessedVideo(fileName: string) {
  const bucket = storage.bucket(processedVideoBucketName);

  await bucket.upload(`${localProcessedVideoPath}/${fileName}`, {
    destination: fileName,
  });

  console.log(
    `${localProcessedVideoPath}/${fileName} uploaded to gs://${processedVideoBucketName}/${fileName}`
  );

  await bucket.file(fileName).makePublic();
}

export function deleteRawVideo(fileName: string) {
  return deleteFile(`${localRawVideoPath}/${fileName}`);
}

export function deleteProcessedVideo(fileName: string) {
  return deleteFile(`${localProcessedVideoPath}/${fileName}`);
}

async function deleteFile(filePath: string) {
  return new Promise<void>((resolve, reject) => {
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.log(`Failed to delete file at ${filePath}`, err);
          reject(err);
        } else {
          console.log(`File deleted at ${filePath}`);
          resolve();
        }
      })
      reject(`File ${filePath} does not exist`)
    } else {
      console.log(`File not found at ${filePath}, skipping the delete`);
      reject();
    }
  })
}

function ensureDirectoryExistence(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Directory created`);
  }
}