#!/usr/bin/env sh
set -eu

SOURCE=${1:-/tmp/ai-baihua-security-headers.conf}
VHOST=/www/server/panel/vhost/nginx/news.czrshe.com.conf
EXTENSION_DIR=/www/server/panel/vhost/nginx/extension/news.czrshe.com
TARGET=$EXTENSION_DIR/codex-security-headers.conf
NGINX=/www/server/nginx/sbin/nginx

if [ ! -f "$VHOST" ] || ! grep -Fq "include $EXTENSION_DIR/*.conf;" "$VHOST"; then
  echo '::warning::宝塔站点配置没有标准 extension include，安全响应头文件已部署但需要在站点 Nginx 配置中手动 include。'
  exit 0
fi

if [ ! -d "$EXTENSION_DIR" ] || [ ! -w "$EXTENSION_DIR" ]; then
  echo '::warning::部署账号不能写入宝塔 Nginx extension 目录，安全响应头需要在宝塔中手动启用。'
  exit 0
fi

BACKUP=
if [ -f "$TARGET" ]; then
  BACKUP=$TARGET.bak
  cp "$TARGET" "$BACKUP"
fi
cp "$SOURCE" "$TARGET"

if "$NGINX" -t; then
  "$NGINX" -s reload
  [ -z "$BACKUP" ] || rm -f "$BACKUP"
  echo 'Nginx security headers enabled.'
  exit 0
fi

if [ -n "$BACKUP" ]; then mv "$BACKUP" "$TARGET"; else rm -f "$TARGET"; fi
"$NGINX" -t
echo 'Nginx 安全响应头配置校验失败，已自动回滚。' >&2
exit 1
