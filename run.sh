#!/bin/bash

set -x

cd $(dirname $0)
. venv/bin/activate

LC_ALL=C.UTF-8 LANG=C.UTF-8 \
      FLASK_DEBUG=0 \
      FLASK_APP=app.py \
      FREEBOXREC_OUTDIR=/backup/ext/films \
      exec flask run --port 8082 "$@"
