import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { ReportCard, WeeklySummary } from './types.js';

function getS3Client(): S3Client | null {
  const endpoint = process.env.EVAL_S3_ENDPOINT;
  const bucket = process.env.EVAL_S3_BUCKET;
  const accessKeyId = process.env.EVAL_S3_ACCESS_KEY;
  const secretAccessKey = process.env.EVAL_S3_SECRET_KEY;
  const region = process.env.EVAL_S3_REGION ?? 'garage';

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
}

function getBucket(): string {
  return process.env.EVAL_S3_BUCKET ?? 'volttrack-evals';
}

export async function uploadReport(report: ReportCard): Promise<string | null> {
  const client = getS3Client();
  if (!client) {
    return null;
  }

  const ts = report.timestamp.replace(/[:.]/g, '-');
  const key = `reports/${ts}_${report.task_id}_${report.agent}.json`;

  await client.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: JSON.stringify(report, null, 2),
      ContentType: 'application/json',
    }),
  );

  return `s3://${getBucket()}/${key}`;
}

export async function uploadSummary(
  summary: WeeklySummary,
): Promise<string | null> {
  const client = getS3Client();
  if (!client) {
    return null;
  }

  const weekKey = `summaries/${summary.week}-weekly-summary.json`;
  const latestKey = 'summaries/latest.json';
  const body = JSON.stringify(summary, null, 2);

  await Promise.all([
    client.send(
      new PutObjectCommand({
        Bucket: getBucket(),
        Key: weekKey,
        Body: body,
        ContentType: 'application/json',
      }),
    ),
    client.send(
      new PutObjectCommand({
        Bucket: getBucket(),
        Key: latestKey,
        Body: body,
        ContentType: 'application/json',
      }),
    ),
  ]);

  return `s3://${getBucket()}/${weekKey}`;
}
