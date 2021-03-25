// Imports the Google Cloud client library
const {Storage} = require('@google-cloud/storage');
const CastModel = require('./models/cast')

// Creates a client
const storage = new Storage({
  projectId:process.env.GCP_PROJECT_ID,
  credentials:{
    client_email:process.env.GCP_EMAIL,
    private_key:process.env.GCP_PRIVATE.replace(new RegExp("\\\\n","\g"),"\n")
  }
});
const bucketName = process.env.GCP_BUCKET;

function isConfigured(){
  return process.env.GCP_PROJECT_ID && process.env.GCP_EMAIL && process.env.GCP_PRIVATE && process.env.GCP_BUCKET
}

async function listFiles() {
  // Lists files in the bucket
  const [files] = await storage.bucket(bucketName).getFiles()

  const models = []
  files.forEach(file => {
    models.push(new CastModel(file.name,"GCP"))
  });
  return models;
}

async function getFile(id){
  const options = {
    // The path to which the file should be downloaded, e.g. "./file.txt"
    destination: "casts/"+id,
  };

  // Downloads the file
  await storage.bucket(bucketName).file(id).download(options);

  return "casts/"+id
}

exports.listFiles = listFiles
exports.getFile = getFile
exports.isConfigured = isConfigured
