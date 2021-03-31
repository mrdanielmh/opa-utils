# Advanced Server Access - Session Capture Replay Tool

This project allows you to replay ASA Session Captures from a front end.

When launching the application the user will be redirected to Okta for authentication. Once authenticated the user will be shown a list of available sessions to replay. The application currently supports .cast files that exist within an AWS S3 or GCP bucket.

Please note: this is an open source solution developed on top of the Okta solution. It is not supported by Okta or part of the Okta solution.

## Running on Heroku

Deploying to Heroku is the fastest way to get started with this application. The button below will setup a Heroku application leveraging this codebase. You will need to configure some extra things to complete the setup;

Okta application
AWS S3 bucket & Associated AuthN
GCP bucket & Associated AuthN

## Setup

### 1. Create Okta application

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

### 2. Deploy Application to Heroku

Click the Deploy Button:

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

You will be prompted to entry some variables:

* App Name: asareplay-firstname-lastname

### Only Required if integrating with an AWS S3 Bucket

You will need to create an IAM user with the AmazonS3FullAccess policy. Once you have created this user you will have access to the ACCESS KEY ID and SECRET ACCESS KEY.

* AWS_ACCESS_KEY_ID - AWS Access Key
* AWS_BUCKET - AWS Bucket Name
* AWS_REGION - AWS Bucket Region (eg: us-west-2)
* AWS_SECRET_ACCESS_KEY - AWS Secret Access Key

### Required

* BASE_URI - The URI which will be used to host the application, https://asareplay-firstname-lastname.herokuapp.com

### Only Required if integrating with an GCP Bucket

You will need to create an IAM User who has access to Cloud Storage. You can then download the credential JSON file and extract the GCP_EMAIL and GCP_PRIVATE values.

* GCP_BUCKET - GCP Bucket Name
* GCP_EMAIL - Extracted from Credential JSON
* GCP_PRIVATE - Extracted from Credential JSON (Certificate)
* GCP_PROJECT_ID - GCP Project Name

### Required

* OKTA_OAUTH2_CLIENT_ID_WEB - The client ID of your OIDC application in Okta
* OKTA_OAUTH2_CLIENT_SECRET_WEB - The client secret of your OIDC application in Okta.
* OKTA_OAUTH2_ISSUER - Issuer URI from Okta Authorization Server (eg: https://tenantname.oktapreview.com/oauth2/default)
* SCOPES - openid profile email
* TOKEN_AUD - api://default

Click Deploy App

### Status

You should now be able to open your Heroku application and log in using your Okta user. From here we now need to add some session capture files into your chosen bucket. These files need to be in a .cast format. We will need to export the .asa session files into .cast.

### Automate Session Conversion into AWS S3 Bucket

We will use a script that will detect when a new file is written to /var/log/sft/sessions and then convert it and upload it to your AWS S3 Bucket. You will need to mount your AWS S3 Bucket to your file system.

* Please copy the aws_convertlogs.sh to your Advanced Server Access Gateway and place it into: /etc/sft/
* Run: sudo apt-get update
* Run: sudo apt install s3fs awscli inotify-tools -y
* Run: sudo vi /etc/.s3fs-creds - AWS_ACCESS_KEY_ID:AWS_SECRET_ACCESS_KEY - Where AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are the values from the AWS IAM user we created previously
* Run: sudo chmod 600 /etc/.s3fs-creds
* Run: cd mnt
* Run: sudo mkdir aws
* Run: cd aws
* Run: sudo mkdir bucketname - Where bucketname is the name of your AWS S3 bucket
* Run: sudo vi /etc/fuse.conf - uncomment user_allow_other
* Run: sudo s3fs -o allow_other,nonempty,passwd_file=/etc/.s3fs-creds bucketname /mnt/aws/bucketname - where bucketname is the name of your AWS S3 bucket
* Run: df -h - This should show your new mounted filesystem

Set /mnt/aws/bucketname to mount on restart

* Run: sudo vi /etc/fstab
* Append the following:
* s3fs#bucketname /mnt/aws/bucketname fuse _netdev,allow_other,nonempty,passwd_file=/etc/.s3fs-creds 0 0

Create systemd script for startup

* Run: cd /etc/systemd/system/
* Run: sudo vi aws_convertlogs.service
* Append following:

[Unit]
Description=Watch for new ASA session logs and convert then.
[Service]
ExecStart=/etc/sft/aws_convertlogs.sh
Restart=always
RestartSec=5s
[Install]
WantedBy=multi-user.target

* Save and quit vi
* Run: sudo systemctl enable aws_convertlogs.service

When your gateway is restarted, the filesystem should mount your bucket folder and the script will automatically start.

### Automate Session Conversion into GCP Bucket

We will use a script that will detect when a new file is written to /var/log/sft/sessions and then convert it and upload it to your GCP bucket. You will need to leverage gsutil to copy files to the GCP bucket.

* Please copy the gcp_convertlogs.sh to your Advanced Server Access Gateway and place it into: /etc/sft/
* Run: echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] http://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
* Run: curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
* Run: sudo apt-get update
* Run: sudo apt-get install google-cloud-sdk

Create systemd script for startup

* Run: cd /etc/systemd/system/
* Run: sudo vi gcp_convertlogs.service
* Append following:

[Unit]
Description=Watch for new ASA session logs and convert then.
[Service]
ExecStart=/etc/sft/gcp_convertlogs.sh
Restart=always
RestartSec=5s
[Install]
WantedBy=multi-user.target

* Save and quit vi
* Run: sudo systemctl enable gcp_convertlogs.service


# Thanks

Huge thanks to Andy March and Kyle Robinson who helped bring this to life!

* Andy March - Senior Platform Specialist, Okta (https://github.com/andymarch)
* Kyle Robinson - Principal Security Specialist, Okta
