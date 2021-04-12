#GCP
!/bin/bash
#
# Watch for new session logs and convert them to asciinema.
#
WATCHPATH="/var/log/sft/sessions"
DESTPATH="/mnt/gcp/bucketname"
process-logs(){
sft session-logs export --insecure --format asciinema \
    --output "$DESTPATH"/"$file".cast "$WATCHPATH"/"$file"
gsutil cp "$DESTPATH"/"$file".cast gs://bucketname
}
inotifywait -m "$WATCHPATH" -e create 2>/dev/null |
while read dirpath action file; do
    process-logs
done
