#AWS
#!/bin/bash
#
# Watch for new session logs and convert them to asciinema.
#
WATCHPATH="/var/log/sft/sessions"
DESTPATH="/mnt/aws/bucketname"
process-logs(){
sft session-logs export --insecure --format asciinema \
    --output "$DESTPATH"/"$file".cast "$WATCHPATH"/"$file"
}
inotifywait -m "$WATCHPATH" -e create 2>/dev/null |
while read dirpath action file; do
    process-logs
done

# Instructions:
# sudo apt-get update
# sudo apt install s3fs awscli -y
# sudo apt install inotiy-tools -y
# Create AWS IAM User with S3FullAccess Role
# sudo vi /etc/.s3fs-creds - AWS_ACCESS_KEY_ID:AWS_SECRET_ACCESS_KEY
# sudo chmod 600 /etc/.s3fs-creds
# cd mnt
# sudo mkdir aws
# cd aws
# sudo mkdir bucketname
# sudo vi /etc/fuse.conf - uncomment user_allow_other
# sudo s3fs -o allow_other,nonempty,passwd_file=/etc/.s3fs-creds bucketname /mnt/aws/bucketname
# df -h
# sudo vi /etc/fstab
# Append the following:
# s3fs#bucketname /mnt/aws/bucketname fuse _netdev,allow_other,nonempty,passwd_file=/etc/.s3fs-creds 0 0
# Create systemd script for startup
# cd /etc/systemd/system/
# sudo vi convertlogs.service
# Append following:
# [Unit]
# Description=Watch for new ASA session logs and convert then.
# [Service]
# ExecStart=/etc/sft/convertlogs.sh
# Restart=always
# RestartSec=5s
# [Install]
# WantedBy=multi-user.target
# Save and quit
# sudo systemctl enable convertlogs.service
