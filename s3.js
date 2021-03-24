// AWS
// List objects within a defined bucket
// Import required AWS SDK clients and commands for Node.js
//const { S3Client, ListObjectsCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const AWS = require('aws-sdk')
const CastModel = require('./models/cast')

// Create the parameters for the bucket
const bucketParams = { Bucket: "emea-asa-s3", Delimiter: '/' };
var fs = require('fs')

AWS.config.update({
  accessKeyId:process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  correctClockSkew: true,
  region: "us-west-2"
})

// Create S3 service object
const s3 = new AWS.S3()

// Call S3 to obtain a list of the objects in the bucket
async function listFiles() {
  return new Promise(resolve => {
    const models = []

    s3.listObjects(bucketParams, function(err, data) {
        if (err) {
          console.log("Error, unable to list files", err)
          return []
        } else {
          data.Contents.forEach(file => {
            models.push(new CastModel(file.Key, "AWS"))
          });
        }
        resolve(models)
      })
  })
  }

async function getFile(id){
    try {
      const params = { Bucket: "emea-asa-s3", Key: id };
      var file = fs.createWriteStream('casts/'+id)
      await s3.getObject(params).createReadStream().pipe(file)
      return "casts/"+id
    } catch (err) {
        console.log("Error, object not downloaded", err);
        return null
    }

}

exports.listFiles = listFiles
exports.getFile = getFile
