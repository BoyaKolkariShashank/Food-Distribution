const AWS = require("aws-sdk");

AWS.config.update({
  accessKeyId: "AKIA2CUNLMG2CDMIKVTQ",
  secretAccessKey: "24rLKp6LlePM/E9hi8WwYvKKYsACohNlFO8xbf/N",
  region: "us-eat-1", // e.g., "us-east-1"
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();

module.exports = dynamoDB;