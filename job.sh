#!/bin/sh
set -u

# defaults for manual tests
FREEBOXREC_STREAM="${FREEBOXREC_STREAM:-http://212.27.38.253:52424/freeboxtv/mafreebox.freebox.fr/fbxtv_pub/stream?namespace=1&service=204&flavour=hd}"
FREEBOXREC_DURATION=${FREEBOXREC_DURATION:-10}
FREEBOXREC_OUTFILE="${FREEBOXREC_OUTFILE:-/tmp/foo}"

echo "recording ${FREEBOXREC_OUTFILE}.mpg"

ffmpeg \
    -loglevel level+fatal \
    -i "${FREEBOXREC_STREAM}" \
    -map 0:u -c copy \
    -t ${FREEBOXREC_DURATION} \
    -f mpegts "${FREEBOXREC_OUTFILE}.mpg"

# extract subtitles and delay

ffmpeg \
    -loglevel level+fatal \
    -txt_format text -txt_page 889 -fix_sub_duration \
    -i "${FREEBOXREC_OUTFILE}.mpg" \
    "${FREEBOXREC_OUTFILE}.srt"

ffprobe \
    -loglevel level+fatal \
    -show_entries 'format=start_time' "${FREEBOXREC_OUTFILE}.mpg" \
    | awk -F= '/start_time=/{print $2}' > "${FREEBOXREC_OUTFILE}.delay"
