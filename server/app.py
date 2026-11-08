# -*- coding: utf-8 -*-
"""HaiXuan's same-origin API. SQLite stays outside the served directory."""
import argparse
import datetime as dt
import hashlib
import hmac
import http.server
import json
import os
import pathlib
import re
import secrets
import smtplib
import sqlite3
import ssl
import time
import urllib.parse
from email.message import EmailMessage

ROOT = pathlib.Path(__file__).resolve().parents[1]
TOPICS = {'今日情报', '一人公司', '免费资源', '工具雷达'}
STATUSES = {'我领到了', '没有领到', '还在审核', '活动失效', '条件有变化'}
SCHEMA = '''
CREATE TABLE IF NOT EXISTS subscribers(email TEXT PRIMARY KEY, topics TEXT NOT NULL, frequency TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS tokens(token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, action TEXT NOT NULL, payload TEXT NOT NULL, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS feedback(id INTEGER PRIMARY KEY, resource TEXT NOT NULL, status TEXT NOT NULL, message TEXT NOT NULL, approved INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS tips(id INTEGER PRIMARY KEY, kind TEXT NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL, message TEXT NOT NULL, email TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS limits(client TEXT NOT NULL, bucket INTEGER NOT NULL, count INTEGER NOT NULL, PRIMARY KEY(client,bucket));
CREATE TABLE IF NOT EXISTS deliveries(email TEXT NOT NULL, digest TEXT NOT NULL, sent_at TEXT NOT NULL, PRIMARY KEY(email,digest));
'''

def db_path():
    return pathlib.Path(os.environ.get('HAIXUAN_DB', str(ROOT / '.local-state/haixuan.sqlite3')))

def connect():
    path = db_path()
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    connection = sqlite3.connect(path, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.executescript(SCHEMA)
    os.chmod(path, 0o600)
    return connection

def now():
    return dt.datetime.now(dt.timezone.utc).isoformat()

def email_address(value):
    value = str(value).strip().lower()
    if len(value) > 254 or not re.fullmatch(r"[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}", value):
        raise ValueError('请输入有效的电子邮箱。')
    return value

def field(data, key, minimum, maximum):
    value = data.get(key, '')
    if not isinstance(value, str) or not minimum <= len(value.strip()) <= maximum:
        raise ValueError('请检查所填内容的长度与格式。')
    return value.strip()

def public_base():
    base = os.environ.get('HAIXUAN_PUBLIC_URL', 'https://news.czrshe.com').rstrip('/')
    parsed = urllib.parse.urlsplit(base)
    if parsed.scheme != 'https' or not parsed.netloc or parsed.query or parsed.fragment or parsed.username:
        raise RuntimeError('Invalid public URL')
    return base

def mail_configured():
    return all(os.environ.get(k) for k in ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM'])

def send_mail(recipient, subject, text):
    if not mail_configured():
        raise RuntimeError('邮件服务尚未配置，暂时不能发送确认邮件。')
    message = EmailMessage()
    message['From'] = os.environ['SMTP_FROM']
    message['To'] = recipient
    message['Subject'] = subject
    message.set_content(text)
    port = int(os.environ.get('SMTP_PORT', '465'))
    context = ssl.create_default_context()
    if port == 465:
        client = smtplib.SMTP_SSL(os.environ['SMTP_HOST'], port, timeout=20, context=context)
    else:
        client = smtplib.SMTP(os.environ['SMTP_HOST'], port, timeout=20)
        client.starttls(context=context)
    with client:
        client.login(os.environ['SMTP_USER'], os.environ['SMTP_PASSWORD'])
        client.send_message(message)

def request_subscription(data, action):
    address = email_address(data.get('email', ''))
    topics = data.get('topics', [])
    frequency = data.get('frequency', 'weekly')
    if action == 'subscribe' and (not isinstance(topics, list) or not topics or not all(isinstance(t, str) and t in TOPICS for t in topics) or frequency not in ('daily', 'weekly', 'instant')):
        raise ValueError('请至少选择一个有效分类和提醒频率。')
    if not mail_configured():
        return 503, {'message': '邮件服务尚未开通，当前没有保存你的订阅。请先浏览网站，稍后再来。'}
    token = secrets.token_urlsafe(32)
    digest = hashlib.sha256(token.encode()).hexdigest()
    payload = json.dumps({'topics': topics, 'frequency': frequency}, ensure_ascii=False)
    with connect() as db:
        recent = db.execute('SELECT count(*) FROM tokens WHERE email=? AND expires>?', (address, int(time.time()) + 23 * 3600)).fetchone()[0]
        if recent >= 3:
            return 429, {'message': '确认邮件请求过于频繁，请一小时后重试。'}
        db.execute('INSERT INTO tokens VALUES(?,?,?,?,?)', (digest, address, action, payload, int(time.time()) + 86400))
    # Fragment tokens stay out of server access logs and are consumed only by POST.
    link = public_base() + '/#confirm/' + token
    try:
        send_mail(address, '海选AI · 请确认' + ('订阅偏好' if action == 'subscribe' else '退订'), '请打开下面的链接，并在页面点击确认。24小时内有效。\n' + link + '\n\n若不是你本人操作，请忽略。本次请求不会自动改变现有订阅。')
    except Exception:
        with connect() as db:
            db.execute('DELETE FROM tokens WHERE token_hash=?', (digest,))
        return 503, {'message': '确认邮件未能发送，现有订阅没有变化。请稍后重试。'}
    return 202, {'message': '确认邮件已发送。请在24小时内打开邮件链接并确认；现有偏好将在确认后更新。'}

def confirm_subscription(data):
    token = field(data, 'token', 30, 120)
    digest = hashlib.sha256(token.encode()).hexdigest()
    with connect() as db:
        db.execute('BEGIN IMMEDIATE')
        row = db.execute('SELECT * FROM tokens WHERE token_hash=? AND expires>?', (digest, int(time.time()))).fetchone()
        if not row:
            return 400, {'message': '确认链接已失效或已使用，请重新申请。'}
        if row['action'] == 'subscribe':
            payload = json.loads(row['payload'])
            db.execute('INSERT INTO subscribers VALUES(?,?,?,1) ON CONFLICT(email) DO UPDATE SET topics=excluded.topics,frequency=excluded.frequency,active=1', (row['email'], json.dumps(payload['topics'], ensure_ascii=False), payload['frequency']))
        else:
            db.execute('UPDATE subscribers SET active=0 WHERE email=?', (row['email'],))
        db.execute('DELETE FROM tokens WHERE email=?', (row['email'],))
    return 200, {'message': '订阅偏好已确认。' if row['action'] == 'subscribe' else '已确认退订，不再向此邮箱发送精选。'}

def handle_post(path, data):
    if not isinstance(data, dict):
        raise ValueError('请求格式有误。')
    if data.get('website'):
        return 400, {'message': '提交未通过校验。'}
    if path in ('subscribe', 'unsubscribe'):
        return request_subscription(data, path)
    if path == 'confirm':
        return confirm_subscription(data)
    if path == 'feedback':
        resource = field(data, 'resource', 1, 100)
        catalog = json.loads((ROOT / 'data/portal-content.json').read_text())
        if resource not in {r['id'] for r in catalog['resources']} or data.get('status') not in STATUSES:
            raise ValueError('资源或反馈类型无效。')
        message = field(data, 'message', 5, 1000)
        with connect() as db:
            db.execute('INSERT INTO feedback(resource,status,message,created_at) VALUES(?,?,?,?)', (resource, data['status'], message, now()))
        return 202, {'message': '反馈已收到，审核通过后公开。感谢帮助下一位用户。'}
    if path == 'tips':
        title = field(data, 'title', 5, 120)
        url = field(data, 'url', 10, 2000)
        parsed = urllib.parse.urlsplit(url)
        if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password:
            raise ValueError('请提供有效的 HTTPS 原始链接。')
        message = field(data, 'message', 10, 3000)
        kind = data.get('kind')
        if kind not in TOPICS | {'信息纠错'}:
            raise ValueError('线索分类有误。')
        email = email_address(data['email']) if data.get('email') else ''
        with connect() as db:
            db.execute('INSERT INTO tips(kind,title,url,message,email,created_at) VALUES(?,?,?,?,?,?)', (kind, title, url, message, email, now()))
        return 202, {'message': '线索已进入待审核列表。核验和编辑后再发布，感谢你的分享。'}
    return 404, {'message': '没有找到这个服务。'}

class Handler(http.server.SimpleHTTPRequestHandler):
    server_version = 'HaiXuan'
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(args[2].static_dir), **kwargs)
    def log_message(self, format, *args):
        # Avoid recording confirmation tokens, emails, payloads or query strings.
        pass
    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
        super().end_headers()
    def json_response(self, code, data):
        raw = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)
    def do_GET(self):
        parsed = urllib.parse.urlsplit(self.path)
        if parsed.path == '/api/feedback':
            resource = urllib.parse.parse_qs(parsed.query).get('resource', [''])[0][:100]
            with connect() as db:
                rows = db.execute('SELECT status,message,created_at FROM feedback WHERE resource=? AND approved=1 ORDER BY id DESC LIMIT 50', (resource,)).fetchall()
            return self.json_response(200, {'items': [{'status': r['status'], 'message': r['message'], 'createdAt': r['created_at']} for r in rows]})
        if parsed.path == '/api/health':
            return self.json_response(200, {'ok': True, 'emailAvailable': mail_configured()})
        if parsed.path.startswith('/api/'):
            return self.json_response(404, {'message': '没有找到这个服务。'})
        # Never serve hidden files, source, symlinks outside dist, or directory indexes.
        target = pathlib.Path(self.translate_path(parsed.path)).resolve()
        root = self.server.static_dir.resolve()
        if root not in target.parents and target != root or any(p.startswith('.') for p in pathlib.PurePosixPath(urllib.parse.unquote(parsed.path)).parts):
            return self.send_error(404)
        if target.is_dir():
            if not (target / 'index.html').is_file():
                return self.send_error(404)
        return super().do_GET()
    def do_POST(self):
        path = urllib.parse.urlsplit(self.path).path
        if not path.startswith('/api/'):
            return self.json_response(404, {'message': '没有找到这个服务。'})
        origin = self.headers.get('Origin')
        expected = urllib.parse.urlsplit(public_base()).netloc
        if origin and urllib.parse.urlsplit(origin).netloc not in {expected, self.headers.get('Host')}:
            return self.json_response(403, {'message': '请从本站提交。'})
        if self.headers.get_content_type() != 'application/json':
            return self.json_response(415, {'message': '请使用 JSON 提交。'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 12000:
                return self.json_response(413, {'message': '提交内容过长或为空。'})
            # Client IP comes from socket; nginx must overwrite X-Real-IP when proxying.
            ip = self.headers.get('X-Real-IP', self.client_address[0]) if self.client_address[0] == '127.0.0.1' and os.environ.get('TRUST_LOCAL_PROXY') == '1' else self.client_address[0]
            client = hashlib.sha256(ip.encode()).hexdigest()
            bucket = int(time.time()) // 3600
            with connect() as db:
                db.execute('DELETE FROM limits WHERE bucket<?', (bucket - 24,))
                db.execute('DELETE FROM tokens WHERE expires<?', (int(time.time()),))
                db.execute('INSERT INTO limits VALUES(?,?,1) ON CONFLICT(client,bucket) DO UPDATE SET count=count+1', (client, bucket))
                count = db.execute('SELECT count FROM limits WHERE client=? AND bucket=?', (client, bucket)).fetchone()[0]
            if count > 30:
                return self.json_response(429, {'message': '提交过于频繁，请稍后重试。'})
            data = json.loads(self.rfile.read(length))
            code, response = handle_post(path.removeprefix('/api/'), data)
            self.json_response(code, response)
        except (ValueError, UnicodeError):
            self.json_response(400, {'message': '请检查输入内容、链接和必填字段。'})
        except Exception:
            self.json_response(503, {'message': '服务暂时不可用，没有确认完成本次操作。请稍后重试。'})

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=4180)
    parser.add_argument('--static', default=str(ROOT / 'dist'))
    args = parser.parse_args()
    static = pathlib.Path(args.static).resolve()
    if static == ROOT or not (static / 'index.html').is_file():
        raise SystemExit('Build first; serve only a built static directory.')
    with connect():
        pass
    server = http.server.ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    server.static_dir = static
    print('HaiXuan preview: http://127.0.0.1:' + str(args.port), flush=True)
    server.serve_forever()

if __name__ == '__main__':
    main()
