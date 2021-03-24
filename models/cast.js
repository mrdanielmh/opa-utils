var Regex = require("regex");
const date = require('date-and-time');

class CastModel {
    constructor(filename,storage) {
        if(filename){
            try {
                this.filename = filename
                var regex = /(\/casts\/)?(?<timestamp>(?<date>[0-9]{8})T(?<time>[0-9]{6})\.[0-9]{3,4})-(?<team>.*)-(?<user>.*)\.asa\.cast/
                var res = filename.match(regex)
                this.timestamp = res.groups.timestamp
                this.date = date.format(date.parse(res.groups.date,'YYYYMMDD'),'MMM D YYYY')
                this.time = date.format(date.parse(res.groups.time,'HHmmss'),'HH:mm:ss')
                this.username = res.groups.user
                this.team = res.groups.team
                if(storage){
                this.storage = [storage]
              }
            }
            catch (error){
                console.log(error)
            }
        }
    }

    addStorage(storage){
      this.storage.push(storage)
    }
}

module.exports = CastModel
