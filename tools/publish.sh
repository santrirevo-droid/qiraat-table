#!/bin/sh
# Bangun ulang data, lalu commit dan push semua perubahan ke GitHub.
# Pemakaian:  sh tools/publish.sh "pesan commit"
set -e
cd "$(dirname "$0")/.."
python3 tools/build_data.py > /dev/null
git add -A
if git diff --cached --quiet; then
  echo "Tidak ada perubahan."
  exit 0
fi
git commit -q -m "${1:-Perbarui data dan tampilan}" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -q
git log --oneline -1
