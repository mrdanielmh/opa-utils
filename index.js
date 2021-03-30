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
router.get("/",ensureAuthenticated(), async (req, res, next) => {
    res.render("index",{
        user: req.userContext.userinfo,
        files: await storage.listFiles(),
        pageTitle: "SSH Session Recordings",
        icon: 'ssh'
       });
});

router.get("/playback",ensureAuthenticated(), async (req, res, next) => {
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

router.get("/casts/:session/:id",ensureAuthenticated(), async (req, res, next) => {
  console.log("files "+req.params.id)
  res.download("casts/"+req.params.session+"/"+req.params.id);
})

app.use(router)
