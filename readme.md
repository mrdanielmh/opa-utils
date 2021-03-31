# Advanced Server Access - Session Capture Replay Tool

This project allows you to replay ASA Session Captures from a front end.

When launching the application the user will be redirected to Okta for authentication. Once authenticated the user will be shown a list of available sessions to replay. The application currently supports .cast files that exist within an AWS S3 or GCP bucket.

# Getting started

## Running on Heroku

Deploying to Heroku is the fastest way to get started with this application. The button below will setup a Heroku application leveraging this codebase. You will need to configure some extra things to complete the setup;

Okta application
AWS S3 bucket & Associated AuthN
GCP bucket & Associated AuthN

## Setup

### Create Okta application

Guide: https://developer.okta.com/docs/guides/sign-into-web-app/nodeexpress/create-okta-application/

Step by Step:

* Sign in to your Okta tenant as an administrator
* Click Applications > Applications
* Click Add Application and then Create New App
* Select Web and Tick OpenID Connect
* Click Create
* Application Name: ASA Session Replay Tool
* Login Redirect URI: https://yourappname.herokuapp.com/authorization-code/callback - yourappname = the name you will specify in the Heroku setup. For example - asareplay-firstname-lastname.
* Logout Redirect URL: https://yourappname.herokuapp.com - yourappname = the name you will specify in the Heroku setup. For example - asareplay-firstname-lastname.
* Click Save

* Assign the Application to your Okta User who will replay sessions.

### Deploy Application to Heroku

Click the Deploy Button:

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

You will be prompted to entry some variables:

* App Name: asareplay-firstname-lastname

### Only Required if integrating with an AWS S3 Bucket

* AWS_ACCESS_KEY_ID -
* AWS_BUCKET -
* AWS_REGION -  
* AWS_SECRET_ACCESS_KEY -

### Required

* BASE_URI - The URI which will be used to host the application, https://asareplay-firstname-lastname.herokuapp.com

### Only Required if integrating with an GCP Bucket

* GCP_BUCKET -
* GCP_EMAIL -
* GCP_PRIVATE -
* GCP_PROJECT_ID -

### Required

* OKTA_OAUTH2_CLIENT_ID_WEB - The client ID of your OIDC application in Okta
* OKTA_OAUTH2_CLIENT_SECRET_WEB - The client secret of your OIDC application in Okta.
* OKTA_OAUTH2_ISSUER -
* SCOPES - openid profile email
* TOKEN_AUD - api://default

Click Deploy App


### Status

You should now be able to open your Heroku application and log in using your Okta user. From here we now need to

# Thanks

Huge thanks to Andy March who helped bring this to life!

Andy March (https://github.com/andymarch)
