# Advanced Server Access - Session Capture Replay Tool

This project allows you to replay ASA Session Captures from a front end.

When launching the application the user will be redirected to Okta for authentication. Once authenticated the user will be shown a list of available sessions to replay. The application currently supports .cast files that exist within an AWS S3 or GCP bucket.

# Getting started

## Running on Heroku

Deploying to Heroku is the fastest way to get started with this application. The button below will setup a Heroku application leveraging this codebase. You will need to configure some extra things to complete the setup;

Okta application
AWS S3 bucket
GCP bucket

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


[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

Credits: Andy March (https://github.com/andymarch)
