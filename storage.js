
const gcp = require('./gcp')
const s3 = require('./s3')

//TODO parameterize this so it doesn't need both providers

async function listFiles(){
  var gcpModels = await gcp.listFiles()
  var s3Models = await s3.listFiles()

  //this is lazy but it should work at low scale
  var merged = []
  for (var i = 0; i < gcpModels.length; i++) {
    var currentGCP = gcpModels[i]
    for (var ii = 0; ii < s3Models.length; ii++) {
      var currentS3 = s3Models[ii]
      if(currentGCP.filename === currentS3.filename){
        currentGCP.addStorage("AWS")
        continue
      }
    }
    merged.push(currentGCP)
  }
  return merged
}

async function getFile(id,storage){
  switch(storage){
    case  "GCP":
      return gcp.getFile(id)
      break;
    case "AWS":
    console.log("getting from S3")
      return s3.getFile(id)
      break;
    default:
      console.console.error("Unknown handler for storage");
      return null
  }
}

exports.listFiles = listFiles
exports.getFile = getFile
