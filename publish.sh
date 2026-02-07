#!/bin/bash

# Abyss 发布脚本
# 用法: ./publish.sh "提交信息"
# 如果不传信息，会用默认的

set -e

cd "$(dirname "$0")"

# 1. 构建
echo "📦 Building..."
node build.js

# 2. 检查变更
if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  echo "🤷 Nothing changed."
  exit 0
fi

# 3. 提交
MSG="${1:-update: $(date +%Y-%m-%d)}"
git add -A
git commit -m "$MSG"

# 4. 推送
echo "🚀 Pushing..."
git push origin main

echo "✅ Published!"
