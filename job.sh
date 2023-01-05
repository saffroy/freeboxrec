#!/bin/sh
set -u

# defaults for manual tests
FREEBOXREC_STREAM="${FREEBOXREC_STREAM:-rtsp://mafreebox.freebox.fr/fbxtv_pub/stream?namespace=1&service=283&flavour=hd}"
FREEBOXREC_DURATION=${FREEBOXREC_DURATION:-10}
FREEBOXREC_OUTFILE="${FREEBOXREC_OUTFILE:-/tmp/foo}"

CHILD=

# cleanup when done
on_exit() {
    trap - exit
    if [ -n "$CHILD" ]; then
	kill $CHILD
	wait $CHILD
    fi
    exit 0
}
trap on_exit exit int

echo "recording ${FREEBOXREC_OUTFILE}.mp4"
echo

START=$(date +%s)
END=$(expr $START + ${FREEBOXREC_DURATION})

openRTSP -V -c -4 "${FREEBOXREC_STREAM}" > "${FREEBOXREC_OUTFILE}.mp4" &
CHILD=$!

while true; do
    # are we done?
    NOW=$(date +%s)
    if [ $NOW -ge $END ]; then
	break
    fi

    # still running?
    if ! kill -0 $CHILD ; then
	break
    fi

    # check again soon
    sleep 10
done
