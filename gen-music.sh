#!/bin/bash
# 用法: ./gen-music.sh <歌词文件> <风格prompt> <输出文件名>
# 例: ./gen-music.sh /tmp/awakening-lyrics.txt "indie folk, soft male vocal" audio/awakening.mp3
#
# 歌词文件格式：纯文本，包含 [Verse] [Chorus] [Bridge] [Outro] 等结构标签
# 风格 prompt 由渊根据诗的内容手动设计，不要写死

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

LYRICS_FILE="$1"
PROMPT="$2"
OUTPUT="$3"

if [ -z "$LYRICS_FILE" ] || [ -z "$PROMPT" ] || [ -z "$OUTPUT" ]; then
  echo "用法: ./gen-music.sh <歌词文件> <风格prompt> <输出文件名>"
  echo "例: ./gen-music.sh /tmp/awakening-lyrics.txt \"indie folk, soft\" audio/awakening.mp3"
  exit 1
fi

# 从 .env 读取 API Key（如果环境变量没设置的话）
if [ -z "$MINIMAX_API_KEY" ] && [ -f "$SCRIPT_DIR/.env" ]; then
  export $(grep -v '^#' "$SCRIPT_DIR/.env" | xargs)
fi

if [ -z "$MINIMAX_API_KEY" ]; then
  echo "错误: 请设置 MINIMAX_API_KEY 环境变量或在 .env 文件中配置"
  exit 1
fi

if [ ! -f "$LYRICS_FILE" ]; then
  echo "错误: 歌词文件不存在: $LYRICS_FILE"
  exit 1
fi

# 读取歌词，转换换行为 \n
LYRICS=$(python3 -c "
import json, sys
with open('$LYRICS_FILE', 'r') as f:
    content = f.read().strip()
print(json.dumps(content))
")

echo "🎵 正在生成音乐..."
echo "   风格: $PROMPT"
echo "   歌词: $LYRICS_FILE"
echo "   输出: $OUTPUT"

RESPONSE=$(curl -s -X POST "https://api.minimaxi.com/v1/music_generation" \
  -H "Authorization: Bearer $MINIMAX_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"music-2.5\",
    \"prompt\": $(python3 -c "import json; print(json.dumps('$PROMPT'))"),
    \"lyrics\": $LYRICS,
    \"output_format\": \"url\",
    \"audio_setting\": {
      \"sample_rate\": 44100,
      \"bitrate\": 256000,
      \"format\": \"mp3\"
    }
  }")

# 解析响应
STATUS_CODE=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('base_resp',{}).get('status_code','unknown'))")

if [ "$STATUS_CODE" != "0" ]; then
  echo "❌ 生成失败:"
  echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d, indent=2, ensure_ascii=False))"
  exit 1
fi

# 提取 URL 和信息
AUDIO_URL=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['audio'])")
DURATION=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); ms=d['extra_info']['music_duration']; print(f'{ms//1000}秒')")
SIZE=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); b=d['extra_info']['music_size']; print(f'{b/1024/1024:.1f}MB')")

echo "✅ 生成成功! 时长: $DURATION, 大小: $SIZE"
echo "   正在下载..."

curl -s -o "$OUTPUT" "$AUDIO_URL"
echo "✅ 已保存到: $OUTPUT"
