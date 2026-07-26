#!/bin/bash

count=$(wc -w < /app/input.txt)

cat > /app/report.json <<EOF
{
  "word_count": $count
}
EOF
