require('dotenv').config()
const express = require('express');
const exphbs  = require('express-handlebars');
const session = require("express-session");
var createError = require('createerror');
const ExpressOIDC = require("@okta/oidc-middleware").ExpressOIDC;
const CastModel = require('./models/cast')
const storage = require('./storage')
const fs = require('fs')
const fsp = require('fs/promises')
const {SSMClient} = require("@aws-sdk/client-ssm")
const AWS = require('aws-sdk')

const PORT = process.env.PORT || "3000";

const app = express();

var hbs = exphbs.create({
    // Specify helpers which are only registered on this instance.
    helpers: {
        jwt: function (token){
            var atob = require('atob');
            if (token != null) {
                var base64Url = token.split('.')[1];
                var base64 = base64Url.replace('-', '+').replace('_', '/');
                return JSON.stringify(JSON.parse(atob(base64)), undefined, '\t');
            } else {
                return "Invalid or empty token was parsed"
            }
        },
        ifCond: function (v1, operator, v2, options) {
        switch (operator) {
            case '==':
                return (v1 == v2) ? options.fn(this) : options.inverse(this);
            case '===':
                return (v1 === v2) ? options.fn(this) : options.inverse(this);
            case '!=':
                return (v1 != v2) ? options.fn(this) : options.inverse(this);
            case '!==':
                return (v1 !== v2) ? options.fn(this) : options.inverse(this);
            case '<':
                return (v1 < v2) ? options.fn(this) : options.inverse(this);
            case '<=':
                return (v1 <= v2) ? options.fn(this) : options.inverse(this);
            case '>':
                return (v1 > v2) ? options.fn(this) : options.inverse(this);
            case '>=':
                return (v1 >= v2) ? options.fn(this) : options.inverse(this);
            case '&&':
                return (v1 && v2) ? options.fn(this) : options.inverse(this);
            case '||':
                return (v1 || v2) ? options.fn(this) : options.inverse(this);
            default:
                return options.inverse(this);
        }
    }
  }
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

app.use("/static", express.static("static"));

app.use(session({
  cookie: { httpOnly: true },
  secret: process.env.SESSION_SECRET,
  saveUninitialized: false,
  resave: true
}));

let oidc = new ExpressOIDC({
  issuer: process.env.OKTA_OAUTH2_ISSUER,
  client_id: process.env.OKTA_OAUTH2_CLIENT_ID_WEB,
  client_secret: process.env.OKTA_OAUTH2_CLIENT_SECRET_WEB,
  appBaseUrl: process.env.BASE_URI,
  scope: process.env.SCOPES
});

app.use(oidc.router);

app.use(async function (req,res,next){
  res.locals.styling = process.env.BRANDING_CSS
  res.locals.brand = process.env.BRAND,
  next();
})

const OktaJwtVerifier = require('@okta/jwt-verifier');
const { default: Axios } = require('axios');

const oktaJwtVerifier = new OktaJwtVerifier({
  issuer: process.env.OKTA_OAUTH2_ISSUER,
  clientId: process.env.OKTA_OAUTH2_CLIENT_ID_WEB,
});

fs.access('casts',fs.constants.F_OK,(err)=>{
  if(err){
    fs.mkdir('casts',{recursive:false},(err)=>{
      if(err) throw err
    })
  } else{
    console.log("exists")
  }
})

app.get("/logout", (req, res) => {
  if(req.userContext){
    let protocol = "http"
    if(req.secure){
        protocol = "https"
    }
    else if(req.get('x-forwarded-proto')){
        protocol = req.get('x-forwarded-proto').split(",")[0]
    }
    const tokenSet = req.userContext.tokens;
    const id_token_hint = tokenSet.id_token
    //maybe rewrite to github.com/bruce/node-temp
    fs.rmdirSync("casts/"+req.session.id,{recursive:true, maxRetries: 1})
    req.session.destroy();
    if(id_token_hint){
      res.redirect(process.env.OKTA_OAUTH2_ISSUER+'/v1/logout?id_token_hint='
          + id_token_hint
          + '&post_logout_redirect_uri='
          + encodeURI(protocol+"://"+req.headers.host)
          );
    }
    else{
      res.redirect("/")
    }
  }
  else {
    res.redirect("/")
  }
  });

oidc.on('ready', () => {
  app.listen(PORT, () => console.log('App started.'+
  ' Issuer: ' + process.env.OKTA_OAUTH2_ISSUER +
  ' Client: ' + process.env.OKTA_OAUTH2_CLIENT_ID_WEB +
  ' Scopes: ' + process.env.SCOPES +
  ' Audience: ' + process.env.TOKEN_AUD));
});

oidc.on("error", err => {
  console.error(err);
});

function ensureAuthenticated(){
  return async (req, res, next) => {
    if (req.isAuthenticated() && req.userContext != null) {
      oktaJwtVerifier.verifyAccessToken(req.userContext.tokens.access_token,process.env.TOKEN_AUD)
      .then(jwt => {
        return next();
      })
      .catch(err => {
        console.log(err)
        res.redirect("/login")
      });
    }
    else{
      res.redirect("/login")
    }
  }
}






const router = express.Router();
router.get("/",ensureAuthenticated(),(req, res, next) => {
  res.redirect("/session-replay")
})

router.get("/session-replay",ensureAuthenticated(), async (req, res, next) => {
    res.render("index",{
        user: req.userContext.userinfo,
        files: await storage.listFiles(),
        pageTitle: "SSH Session Recordings",
        icon: 'ssh'
       });
});

router.get("/network-map",ensureAuthenticated(), async (req, res, next) => {
//TODO call axios for server data determines structure and populate to serverinfo in structure 
/*{
  id: "unique",
  name: "display",
  data: {},
  children: 
  [//nested elements]
}*/
var serverinfo = {
  "id": "client",
  "name": "client",
  "data": {},
  "children": []
}

try{
  //get a token for the ASA api
  var bearerResp = await Axios({
    method:'post',
    url:'https://app.scaleft.com/v1/teams/'+process.env.ASA_TEAM+'/service_token',
    data:{
      "key_id": process.env.ASA_ID,
      "key_secret": process.env.ASA_SECRET
    }
  })

  //list of projects
  var projectListResp = await Axios({
    method:'get',
    url:'https://app.scaleft.com/v1/teams/'+process.env.ASA_TEAM+'/projects/',
    headers:{
      "Authorization": "Bearer "+bearerResp.data.bearer_token
    }
  }) 
  projectList = projectListResp.data.list 
  //console.log(projectListResp.data.list.length)

  const projectsWithBastions = projectListResp.data.list.filter(project => project.gateway_selector === null);
  var bastions = new Map()
  for (let index = 0; index < projectsWithBastions.length; index++) {
    const element = projectsWithBastions[index];
    var projectServersResp = await Axios({
      method:'get',
      url:'https://app.scaleft.com/v1/teams/'+process.env.ASA_TEAM+'/projects/'+element.name+'/servers/',
      headers:{
        "Authorization": "Bearer "+bearerResp.data.bearer_token
      }
    })
    var servers = projectServersResp.data.list
    for (let index = 0; index < servers.length; index++) {
      const element = servers[index];
      console.log("BASTION")
      console.log(element)
      if(element.bastion === null){
        if(!bastions.has(element.hostname)){
          var obj = {
            "id": element.id,
            "name":  element.hostname,
            "data": {},
            "children": []
          }  
          bastions.set(element.hostname,obj)
        }
        //skip adding this server as it already has a entry
        //TODO could update tehe id
      } else {
        if(!bastions.has(element.bastion)){
          var obj = {
            "id": ""+Math.floor(Math.random()*1000),
            "name":  element.bastion,
            "data": {},
            "children": [{
              "id": element.id,
              "name":  element.hostname,
              "data": {},
              "children": []
            }  ]
          }  
          bastions.set(element.hostname,obj)
        } else{
          var child = {
            "id": element.id,
            "name":  element.hostname,
            "data": {},
            "children": []
          }  
          var tmp = bastions.get(element.bastion)
          tmp.children.push(child)
          bastions.set(element.bastion,tmp)
        }
      }
    }
  }

  const projectsWithGateways = projectListResp.data.list.filter(project => project.gateway_selector != null);
  var gateways = new Map()
  for (let index = 0; index < projectsWithGateways.length; index++) {
    const element = projectsWithGateways[index];

    var gatewayProjectServersResp = await Axios({
      method:'get',
      url:'https://app.scaleft.com/v1/teams/'+process.env.ASA_TEAM+'/projects/'+element.name+'/servers/',
      headers:{
        "Authorization": "Bearer "+bearerResp.data.bearer_token
      }
    }) 

    var gatewayProjectServers = gatewayProjectServersResp.data.list 
    var children = []
    gatewayProjectServers.forEach(element => {
      var obj = {
        "id": element.id,
        "name":  element.hostname,
        "data": {},
        "children": []
      }     
      children.push(obj)
    });

    if(gateways.has(element.gateway_selector)){
      var tmp = gateways.get(element.gateway_selector)
      tmp.children = tmp.children.concat(children)
    } else{
      var obj = {
        "id": ""+Math.floor(Math.random()*1000),
        "name": element.gateway_selector,
        "data": {},
        "children": children
      }
      gateways.set(element.gateway_selector,obj)
    }
  }
  serverinfo.children = [...gateways.values()].concat([...bastions.values()])
//do something here to work out which projects have a gateway associated
//do something here to then list servers in projects that have no gateway associated
//do something here to list servers contained bastion

}
catch(err){
  console.log(err)
}
console.log(serverinfo)
res.render("network-map",{
  user: req.userContext.userinfo,
        pageTitle: "Network Map",
        serverinfo: JSON.stringify(serverinfo),
        icon: 'server'
})
})

router.get("/agent-management",ensureAuthenticated(), async (req, res, next) => {

  var serverList;
  try{
      //get a token for the ASA api
      var bearerResp = await Axios({
        method:'post',
        url:'https://app.scaleft.com/v1/teams/'+process.env.ASA_TEAM+'/service_token',
        data:{
          "key_id": process.env.ASA_ID,
          "key_secret": process.env.ASA_SECRET
        }
      })

      //get list of servers which has a managed == false
      var serverListResp = await Axios({
        method:'get',
        url:'https://app.scaleft.com/v1/teams/'+process.env.ASA_TEAM+'/projects/'+process.env.ASA_PROJECT_NAME+'/servers?managed=false',
        headers:{
          "Authorization": "Bearer "+bearerResp.data.bearer_token
        }
      }) 
      serverList = serverListResp.data.list 
  }
  catch(err){
    console.log(err)
  }
  
  res.render("agent-management",{
      user: req.userContext.userinfo,
      servers: serverList,
      pageTitle: "Agent Management",
      icon: 'user-secret',
      msg: req.session.msg
     });
  req.session.msg = null
});

router.get("/agent-management/deploy",ensureAuthenticated(), async (req, res, next) => {
  
  console.log("doing things to "+req.query.instance)
  AWS.config.update({region:'us-west-2'});
  var ssm = new AWS.SSM();

  //TODO this logic will improve once underlying bug in OS detection is addressed
  if(req.query.os != "windows"){
      var params = {
      DocumentName: 'AWS-RunShellScript', /* required */
      InstanceIds: [req.query.instance],
      Parameters: {
        'commands': [
          'sudo apt-get install gpg',
          'curl -fsSL https://dist.scaleft.com/pki/scaleft_deb_key.asc | gpg --dearmor | sudo tee /usr/share/keyrings/scaleft-archive-keyring.gpg > /dev/null',
          'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/scaleft-archive-keyring.gpg] http://pkg.scaleft.com/deb linux main" | sudo tee -a /etc/apt/sources.list.d/scaleft.list > /dev/null',
          'sudo apt-get update',
          'sudo apt-get install scaleft-server-tools'
          /* more items */
        ],
        /* '<ParameterName>': ... */
      }
    }
    req.session.msg= "Agent is being deployed, please wait..."
  }
  else {
    //TODO DH to fix
    req.session.msg= "Windows is not supported :("
  }

  ssm.sendCommand(params, function(err, data) {
    if (err) {
      console.log("ERROR!");
      console.log(err, err.stack); // an error occurred
    }
    else {
    console.log("SUCCESS!");
    console.log(data);
    }            // successful response
  });

  res.redirect('/agent-management')
})

router.get("/session-replay/playback",ensureAuthenticated(), async (req, res, next) => {
  console.log("show me: "+req.query.recording)

  try{
    await fsp.access("casts/"+req.session.id,fs.constants.F_OK)
  } catch (err) {
    await fsp.mkdir("casts/"+req.session.id,{recursive:false})
  }
  const file = new CastModel("casts/"+req.session.id+"/"+req.query.recording)
  await storage.getFile(req.query.recording,req.query.storage,file.filename)

    res.render("playback",{
        user: req.userContext.userinfo,
        file: file,
        pageTitle: "["+file.team+"] "+file.username,
        icon: 'recordings'
       });
});

router.get("/session-replay/casts/:session/:id",ensureAuthenticated(), async (req, res, next) => {
  console.log("files "+req.params.id)
  res.download("casts/"+req.params.session+"/"+req.params.id);
})

app.use(router)
