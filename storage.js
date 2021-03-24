
const gcp = require('./gcp')
const s3 = require('./s3')

//TODO parameterize this so it doesn't need both providers

async function listFiles(){
  var gcpModels = await gcp.listFiles()
  var s3Models = await s3.listFiles()

  var merged = gcpModels.concat(s3Models)
  var output = []

  for (var i = 0; i < merged.length; i++) {
    var current = merged[i]
    var isUnique = true
    for (var ii = i+1; ii < merged.length; ii++) {
        var compare = merged[ii]
        if(current.filename === compare.filename){
          compare.addStorage(current.storage[0])
          isUnique = false
          break
        }
    }

    if(isUnique){
      output.push(current)
    }
  }
  return output
}

async function getFile(id,storage){
  switch(storage){
    case  "GCP":
      return gcp.getFile(id)
      break;
    case "AWS":
      return s3.getFile(id)
      break;
    default:
      console.console.error("Unknown handler for storage");
      return null
  }
}

exports.listFiles = listFiles
exports.getFile = getFile
