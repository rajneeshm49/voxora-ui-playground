import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  PollyClient,
  SynthesizeSpeechCommand,
  Engine,
  OutputFormat,
  VoiceId,
} from "@aws-sdk/client-polly";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import middy from "@middy/core";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import cors from "@middy/http-cors";
import { randomUUID } from "crypto";

const pollyClient = new PollyClient({});
const s3Client = new S3Client({});

interface TextToSpeechRequest {
  text: string;
  voice?: VoiceId;
  rate?: number;
  pitch?: number;
}

const textToSpeech = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const {
      text,
      voice = "Joanna",
      rate = 1,
      pitch = 1,
    } = event.body as unknown as TextToSpeechRequest;

    if (!text) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Text is required" }),
      };
    }

    // Generate speech using Amazon Polly
    const speechParams = {
      Text: text,
      OutputFormat: OutputFormat.MP3,
      VoiceId: voice,
      Engine: Engine.NEURAL,
      SampleRate: "24000",
    };

    const synthesizeCommand = new SynthesizeSpeechCommand(speechParams);
    const speechResult = await pollyClient.send(synthesizeCommand);

    if (!speechResult.AudioStream) {
      throw new Error("No audio stream returned from Polly");
    }

    // Upload to S3
    const fileKey = `${randomUUID()}.mp3`;
    const uploadParams = {
      Bucket: process.env.BUCKET_NAME,
      Key: fileKey,
      Body: speechResult.AudioStream,
      ContentType: "audio/mpeg",
    };

    const uploadCommand = new PutObjectCommand(uploadParams);
    await s3Client.send(uploadCommand);

    // Generate presigned URL (valid for 1 hour)
    const audioUrl = `https://${process.env.BUCKET_NAME}.s3.amazonaws.com/${fileKey}`;

    return {
      statusCode: 200,
      body: JSON.stringify({
        audioUrl,
        message: "Text-to-speech conversion successful",
      }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to process text-to-speech conversion",
      }),
    };
  }
};

export const handler = middy(textToSpeech)
  .use(httpJsonBodyParser())
  .use(cors());
