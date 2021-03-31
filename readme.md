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

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

Credits: Andy March (https://github.com/andymarch)
