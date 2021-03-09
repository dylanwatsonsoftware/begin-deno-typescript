const AWS = require("aws-sdk");

const pollyClient = new AWS.Polly({
  signatureVersion: "v4",
  region: "us-east-1",
  logger: console,
  httpOptions: { timeout: 30000, connectTimeout: 5000 },
});

// note that this will pick up credentials from the current env vars
const S3 = require("aws-sdk/clients/s3");

const s3Client = new S3({
  apiVersion: "2006-03-01",
  region: "ap-southeast-2",
  logger: console,
  httpOptions: { timeout: 30000, connectTimeout: 5000 },
});

exports.Polly = {
  synthesizeSpeech: async (params) => {
    return pollyClient.synthesizeSpeech(params).promise();
  },
};

exports.S3 = {
  upload: async (params) => {
    return s3Client.upload(params).promise();
  },
  tryGetUrl: async (params) => {
    try {
      console.log(`Attempting to locate S3 file ${params.Key}`);
      await s3Client.headObject(params).promise();
      console.log(`Found file ${params.Key}. Retrieving url`);
      return s3Client.getSignedUrl("getObject", params);
    } catch (err) {
      if (err.code === "NotFound") {
        console.warn(`Could not find ${params.Key} in S3`);
      } else {
        console.warn(`Error in tryGetMp3FromS3: ${err.message} ${err.code}`);
      }

      return null;
    }
  },
  client: s3Client,
};
