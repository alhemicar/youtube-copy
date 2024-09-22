import express from 'express';
import dotenv from 'dotenv';
import { setupDirectories, convertVideo, downloadRawVideo, uploadProcessedVideo, deleteProcessedVideo, deleteRawVideo } from './storage';

const app = express();
app.use(express.json());
dotenv.config();

setupDirectories();

app.post('/process-video', async (req, res) => {
  let data;
  try {
    const message = Buffer.from(req.body.message.data, 'base64').toString('utf8');
    data = JSON.parse(message);
    if (!data.name) {
      throw new Error('Invalid message payload received');
    }
  } catch (error) {
    console.error(error);
    res.status(400).send('Bad request: missing filename');
  }

  const inputFileName = data.name;
  const outputFileName = `processed-${inputFileName}`;

  await downloadRawVideo(inputFileName);

  try {
    await convertVideo(inputFileName, outputFileName);
  } catch (error) {
    await Promise.all([
      deleteRawVideo(inputFileName),
      deleteProcessedVideo(outputFileName),
    ]);

    console.error(error);
    res.status(500).send('Internal server error: video processing failed');
  }

  await uploadProcessedVideo(outputFileName);

  await Promise.all([
    deleteRawVideo(inputFileName),
    deleteProcessedVideo(outputFileName),
  ]);

  return res.status(200).send('Processing finished successfully')
});

const port = process.env.PORT;

app.listen(port, () => {
  console.log(`Video process service listening at http://localhost:${port}`);
});