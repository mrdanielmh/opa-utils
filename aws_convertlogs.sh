#AWS
!/bin/bash
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
