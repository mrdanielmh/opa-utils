# OPA Utils

This project is an continually evolving set of features to work alongside Okta Advanced Server Access (ASA).

Please note: this is an open source solution developed on top of the Okta solution. It is not supported by Okta or part of the Okta solution.

Current features;

* Session Replay Tool for SSH & RDP
* Agent Deployment for AWS (Supported: Ubuntu 20.04)
* Dynamic Network Map

# Session Replay Tool

This feature allows you to replay ASA Session Captures from a WebApp authenticated through Okta via OIDC.

When launching the application the user will be redirected to Okta for authentication. Once authenticated the user will be shown a list of available sessions to replay. The application currently supports .cast and .mkv files that exist within an AWS S3.

# Deployment

In order for the Sesssion Replay Tool to work you require a functional ASA Gateway and a place to store converted replay files. At the moment we have this working with AWS S3 but could easily be extended to GCP.

## 1. Create Okta Applications and Assign Users

* Sign in to your Okta tenant as an administrator
* Click Applications > Applications
* Click Add Application and then Create New App
* Select OpenID Connect
* Select Web Application
* Click Next
* Application Name: OPA Utils OIDC
* Sign-in Redirect URI: https://randomvaluehere/authorization-code/callback - randomvaluehere = the name that your webapp will use. This will be changed later.
* Select 'Allow everyone in your organization to access'
* Click Save

* Click Applications > Applications
* Click Browser App Catalog
* Search for 'Bookmark App'
* Click 'Bookmark App'
* Click 'Add Integration''
* Application Name: OPA Utils
* URL: https://randomvaluehere/authorization-code/callback - randomvaluehere = the name that your webapp will use. This will be changed later.
* Click Done

* Assign the Application to your Okta User who will replay sessions.

## 2. Deploy ASA Utils

* Download latest OPA Utils Release: https://github.com/mrdanielmh/opa-utils/releases

### Amazon Web Services 

#### S3

* Create OPA Utils S3 Bucket for storing converted replay files

#### Elastic Beanstalk

* Click Create Application
* Name: OPA Utils
* Platform: Node.js
* Platform Branch: Node.ks 16 running on 64bit Amazon Linux 2
* Platform Version: Default
* Select 'Upload your code'
* Version Label: 0.0.2
* Select Local File
* Select Choose File and Upload the latest OPA Utils Release
* Click 'Create Application'
* Wait for Elastic Beanstalk Environment to be created - it may take a few minutes
* Health with show as 'Degraded' - Please ignore for the moment
* Copy the Environment URL - This is needed later

#### Update Okta Application

* Sign in to your Okta tenant as an administrator
* Click Applications > Applications
* Find and Click 'OPA Utils OIDC'
* Scroll to 'General Settings' and click 'Edit'
* Update Sign-in redirect URI Value;
        randomvalue = Elastic Beanstalk Environment URL
* Click 'Save'

#### Update Elastic Beanstalk Environment

* Sign in to your AWS Tenant
* Open Elastic Beanstalk
* Click 'Configuration' on the left 
* Find Software and click 'Edit'
* Scroll Down to 'Environment Properties' and create the following variables:

```
OKTA_OAUTH2_ISSUER:             https://okta-url/oauth2/default - Issuer URL from Okta Tenant
OKTA_OAUTH2_CLIENT_ID_WEB:      Client ID
OKTA_OAUTH2_CLIENT_SECRET_WEB:  Client Secret
SESSION_SECRET:                 wertyuikmnbv (Random Value)
SCOPES:                         openid profile email
BASE_URI:                       Paste Elastic Beanstalk Environment URL (Include http://) and remove any trailing slashes
TOKEN_AUD:                      api://default
AWS_ACCESS_KEY_ID:              AWS Access Key
AWS_SECRET_ACCESS_KEY:          AWS Secret Key
AWS_BUCKET:                     AWS Bucket Name
AWS_REGION:                     AWS Bucket Region 
ASA_ID:                         ASA Access Key
ASA_SECRET:                     ASA Secret Key
ASA_TEAM:                       ASA Team Name
ASA_PROJECT_NAME:               ASA Project Name
GCP_PROJECT_ID:                 Leave Blank
GCP_EMAIL:                      Leave Blank
GCP_PRIVATE:                    Leave Blank
GCP_BUCKET:                     Leave Blank
```

* Click 'Apply'

## 3. Setup ASA Gateway

We will use a script that will detect when a new file is written to /var/log/sft/sessions and then convert it and upload it to your S3 Bucket.

* Create the following shell script called `aws_convertlogs.sh` in `/etc/sft`

```
#!/bin/bash -x
#Watch for new session logs and convert them to asciinema (ssh) and mkv (rdp).
WATCHPATH="/var/log/sft/sessions"
DESTPATH="/mnt/aws/{bucketname}"
process-logs-ssh(){
sudo sft session-logs export --insecure --format asciinema --output "$DESTPATH"/"$file".cast "$WATCHPATH"/"$file"
}
process-logs-rdp(){
sudo sft session-logs export --insecure --format mkv --output "$DESTPATH"/"$file".mkv "$WATCHPATH"/"$file"
}
inotifywait -m "$WATCHPATH" -e create 2>/dev/null |
while read dirpath action file; do
    if [[ $file == *ssh~* ]]; then
            echo "ssh session capture found"
            echo "starting conversion process"
            process-logs-ssh
            echo "ssh session converted"
    elif [[ $file == *rdp~* ]]; then
            echo "rdp session capture found"
            echo" starting conversion process"
            process-logs-rdp
            echo "rdp session converted"
    else
            echo "skipping unknown file type $file"
    fi
done
```

* Run `sudo chmod +x /etc/sft/aws_convertlogs.sh`
* Run `sudo apt-get update`
* Run `sudo apt install s3fs awscli inotify-tools scaleft-client-tools -y`
* Run `echo "AWS_ACCESS_KEY:AWS_SECRET_ACCESS_KEY" >> /etc/.s3fs-creds` - Where AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are the values from an IAM User with Full S3 Admin Access
* Run `sudo chmod 600 /etc/.s3fs-creds`
* Run `sudo mkdir -p /mnt/aws/{bucketname}` - where {bucketname} is the name of your S3 bucket
* Run `sudo chmod 777 /mnt/aws/{bucketname}` - where {bucketname} is the name of your S3 bucket
* Run `sudo vi /etc/fuse.conf`
    Uncomment user_allow_other

* Create the following service called `aws_convertlogs.service` to `/etc/systemd/system/aws_convertlogs.service`

```
[Unit]
Description=Watch for new ASA session logs and convert then.

[Service]
ExecStart=/etc/sft/aws_convertlogs.sh
Restart=always
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

* Run `sudo systemctl enable aws_convertlogs.service`
* Run `sudo s3fs -o allow_other,passwd_file=/etc/.s3fs-creds,endpoint={bucketregion},url="https://s3-{bucketregion}.amazonaws.com" {bucketname} /mnt/aws/{bucketname}` - where {bucketname} is the name of your S3 bucket and {bucketregion} is the region of your S3 bucket
* Run `df -h` - This should show your new mounted filesystem
* Run `echo "s3fs#{bucketname} /mnt/aws/{bucketname} fuse _netdev,allow_other,passwd_file=/etc/.s3fs-creds,endpoint={bucketregion},url="https://s3-{bucketregion}.amazonaws.com" 0 0" >> /etc/fstab` - where {bucketname} is the name of your S3 bucket and {bucketregion} is the region of your S3 bucket

* Update `/etc/sft/sft-gatewayd.yaml` to include the following:

```
LogFileNameFormats:
  SSHRecording: "{{.Protocol}}~{{.StartTime}}~{{.TeamName}}~{{.ProjectName}}~{{.ServerName}}~{{.Username}}~"
  RDPRecording: "{{.Protocol}}~{{.StartTime}}~{{.TeamName}}~{{.ProjectName}}~{{.ServerName}}~{{.Username}}~"
```

* Run `sudo systemctl restart sft-gatewayd`

You should now have a mounted filesystem and when an SSH or RDP session is ended through ASA the script should convert and upload into your specified S3 bucket. These replays should then be available from the Web Application.


# Agent Deployment - WIP
# Dynamic Network Map - WIP

# Testing

* Log into a server that has been configured to have it's session captured.
* Refresh Session Replay Tool - You should see your latest session
* Replay by clicking on the AWS

# Thanks

Huge thanks to Andy March and Kyle Robinson who helped bring this to life!

* Andy March - Senior Platform Specialist, Okta (https://github.com/andymarch)
* Kyle Robinson - Principal Security Specialist, Okta

