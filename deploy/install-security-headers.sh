#!/usr/bin/env sh
set -eu

SOURCE=${1:-/tmp/ai-baihua-security-headers.conf}
VHOST=/www/server/panel/vhost/nginx/news.czrshe.com.conf
EXTENSION_DIR=/www/server/panel/vhost/nginx/extension/news.czrshe.com
TARGET=$EXTENSION_DIR/codex-security-headers.conf
NGINX=/www/server/nginx/sbin/nginx

if [ ! -f "$VHOST" ] || [ ! -w "$VHOST" ]; then
  echo '::warning::部署账号不能修改宝塔站点配置，安全响应头需要在宝塔中手动启用。'
  exit 0
fi

mkdir -p "$EXTENSION_DIR"
cp "$SOURCE" "$TARGET"
BACKUP=$VHOST.codex-backup
cp "$VHOST" "$BACKUP"

if ! grep -Fq "include $EXTENSION_DIR/*.conf;" "$VHOST"; then
  TEMP=$VHOST.codex-new
  awk -v include_line="    include $EXTENSION_DIR/*.conf;" '
    { lines[NR]=$0; if ($0 ~ /^[[:space:]]*}[[:space:]]*$/) last=NR }
    END {
      if (!last) exit 2
      for (i=1; i<=NR; i++) {
        if (i==last) print include_line
        print lines[i]
      }
    }
  ' "$VHOST" > "$TEMP"
  mv "$TEMP" "$VHOST"
fi

if "$NGINX" -t; then
  "$NGINX" -s reload
  rm -f "$BACKUP"
  echo 'Nginx security headers enabled.'
  exit 0
fi

mv "$BACKUP" "$VHOST"
rm -f "$TARGET"
"$NGINX" -t
echo 'Nginx 安全响应头配置校验失败，已自动回滚。' >&2
exit 1
