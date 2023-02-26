#!/bin/sh
set -u

# defaults for manual tests
FREEBOXREC_STREAM="${FREEBOXREC_STREAM:-rtsp://mafreebox.freebox.fr/fbxtv_pub/stream?namespace=1&service=283&flavour=hd}"
FREEBOXREC_DURATION=${FREEBOXREC_DURATION:-10}
FREEBOXREC_OUTFILE="${FREEBOXREC_OUTFILE:-/tmp/foo}"

echo "recording ${FREEBOXREC_OUTFILE}.mpg"

ffmpeg \
    -loglevel level+fatal \
    -i "${FREEBOXREC_STREAM}" \
    -map 0 -c copy \
    -t ${FREEBOXREC_DURATION} \
    -f mpegts "${FREEBOXREC_OUTFILE}.mpg"
