import aws from 'aws-sdk';
import {execFileSync} from 'child_process';
import {readFileSync} from 'fs';
import {join} from 'path';
import {tmpdir, platform} from 'os';

const connectionString = process.env.MONGODB_STORE_CONNECTION_STRING;

if (!connectionString) {
  throw new Error(`'MONGODB_STORE_CONNECTION_STRING' environment variable is missing`);
}

const s3Bucket = process.env.AWS_S3_BUCKET;

if (!s3Bucket) {
  throw new Error(`'AWS_S3_BUCKET' environment variable is missing`);
}

const s3Prefix = process.env.AWS_S3_PREFIX || '';

const globalS3Client = new aws.S3({apiVersion: '2006-03-01'});

export async function backup() {
  // OPTIMIZE: Pipe mongodump to S3 upload

  const mongodump = join(
    __dirname,
    '..',
    'bin',
    platform() === 'darwin' ? 'macos-x86_64' : 'amazon2-x86_64',
    'mongodump'
  );

  const file = join(tmpdir(), 'mongodb-to-s3.gz');

  console.log(`Dumping MongoDB databases (target: '${file}')...`);

  execFileSync(mongodump, [`--archive=${file}`, '--gzip', connectionString!], {stdio: 'inherit'});

  const data = readFileSync(file);

  const {LocationConstraint: s3BucketRegion} = await globalS3Client
    .getBucketLocation({Bucket: s3Bucket!})
    .promise();

  const s3Client = new aws.S3({region: s3BucketRegion, apiVersion: '2006-03-01'});

  const s3Key = s3Prefix + new Date().toISOString() + '.gz';

  console.log(`Uploading to S3 (bucket: '${s3Bucket}', key: '${s3Key}')...`);

  await s3Client
    .upload({
      Bucket: s3Bucket!,
      Key: s3Key,
      Body: data,
      ContentType: 'application/gzip'
    })
    .promise();
}
