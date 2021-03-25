
const gcp = require('./gcp')
const s3 = require('./s3')

//TODO parameterize this so it doesn't need both providers

async function listFiles(){
  var merged = []
  var sources = 0

  if(gcp.isConfigured()){
    merged = merged.concat(await gcp.listFiles())
    sources++
  }
  if(s3.isConfigured()){
    merged = merged.concat(await s3.listFiles())
    sources++
  }

  var output = []
  //we only want to run this source merge if we have more than one
  if(sources >1){
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
  } else {
    return merged
  }

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
