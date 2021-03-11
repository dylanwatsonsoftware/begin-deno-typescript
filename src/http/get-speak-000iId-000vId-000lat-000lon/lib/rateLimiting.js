const AWS = require("aws-sdk");

const dynamodb = new AWS.DynamoDB({
  apiVersion: "2012-08-10",
  region: "us-east-1",
  // (logging not turned on because we don't want to log the IP addresses)
  httpOptions: { timeout: 30000, connectTimeout: 5000 },
});

const tableName = `youarehereratelimiting-${process.env.ENV}`;

exports.check = async (ipAddress) => {
  const time = Date.now();

  const result = await dynamodb
    .putItem({
      Item: {
        // IP address
        Id: { S: ipAddress },
        // Request time
        RequestTime: { N: String(time) },
        // TTL attribute (must be in seconds)
        Expiry: { N: String(time / 1000 + 60) },
      },
      TableName: tableName,
      ReturnValues: "ALL_OLD",
    })
    .promise();

  const lastRequestTime = result.Attributes && result.Attributes.RequestTime;
  return !lastRequestTime || time - Number(lastRequestTime.N) > 500;
};
