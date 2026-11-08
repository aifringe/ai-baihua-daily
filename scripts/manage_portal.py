# -*- coding: utf-8 -*-
"""Local moderation and consent-only newsletter delivery. No public admin endpoint."""
import argparse
import hashlib
import json
import pathlib
import sys
import datetime as dt
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from server.app import ROOT, connect, now, public_base, send_mail

def pending():
    with connect() as db:
        for table, predicate in [('feedback','approved=0'),('tips',"status='pending'")]:
            print(table)
            for row in db.execute('SELECT * FROM '+table+' WHERE '+predicate+' ORDER BY id LIMIT 100'):
                print(json.dumps(dict(row), ensure_ascii=False))

def moderate(table, row_id, approve):
    if table not in ('feedback','tips'):
        raise ValueError('Invalid moderation table')
    with connect() as db:
        if table == 'feedback':
            if approve:
                db.execute('UPDATE feedback SET approved=1 WHERE id=?', (row_id,))
            else:
                db.execute('DELETE FROM feedback WHERE id=? AND approved=0', (row_id,))
        else:
            db.execute('UPDATE tips SET status=? WHERE id=?', ('reviewed' if approve else 'rejected', row_id))
    print('Moderation saved. Tips still need editorial verification before publication.')

def newsletter(frequency, send=False):
    clock=dt.datetime.now(dt.timezone(dt.timedelta(hours=8)))
    if frequency in ('daily','weekly') and not (clock.hour==9 and clock.minute<5):
        print('Digest window is Beijing 09:00.');return
    if frequency == 'weekly' and dt.datetime.now(dt.timezone(dt.timedelta(hours=8))).weekday() != 6:
        print('Weekly digest runs on Sunday Beijing time.');return
    news = json.loads((ROOT/'public/news.json').read_text())
    portal = json.loads((ROOT/'data/portal-content.json').read_text())
    radar = json.loads((ROOT/'data/radar-content.json').read_text())
    ids = set(news.get('dailyIds', []))
    if frequency == 'weekly':
        cutoff = (dt.datetime.now(dt.timezone(dt.timedelta(hours=8))).date()-dt.timedelta(days=7)).isoformat()
        ids.update(a['id'] for a in news['articles'] if a['publishedAt'] >= cutoff)
    rows = [('今日情报', a['id'], a['title'], public_base()+'/#news/'+a['id']) for a in news['articles'] if a['id'] in ids]
    rows += [('一人公司', a['id'], a['title'], public_base()+'/#case/'+a['id']) for a in portal['cases']]
    rows += [('免费资源', a['id'], a['title'], public_base()+'/#resource/'+a['id']) for a in portal['resources'] if not a.get('endsAt') or a['endsAt'] >= now()[:10]]
    rows += [('工具雷达', a['name'], a['name'], a['url']) for a in radar['tools']['new']]
    # Instant delivery requires an explicit editor flag and a still-valid verification.
    if frequency == 'instant':
        valid = {r['id'] for r in portal['resources'] if r.get('instantApproved') is True and r.get('checkedAt') == dt.datetime.now(dt.timezone(dt.timedelta(hours=8))).date().isoformat()}
        rows = [r for r in rows if r[0] == '免费资源' and r[1] in valid]
    count = 0
    with connect() as db:
        subscribers = db.execute('SELECT * FROM subscribers WHERE active=1 AND frequency=?', (frequency,)).fetchall()
    for subscriber in subscribers:
        selected = [r for r in rows if r[0] in json.loads(subscriber['topics'])]
        with connect() as db:
            selected = [r for r in selected if not db.execute('SELECT 1 FROM deliveries WHERE email=? AND digest=?',(subscriber['email'], hashlib.sha256((r[0]+':'+r[1]).encode()).hexdigest())).fetchone()]
        selected = selected[:10]
        if not selected:
            continue
        if send:
            body = '\n\n'.join(r[2]+'\n'+r[3] for r in selected)+'\n\n更改偏好或退订：'+public_base()+'/#section/briefing\n点击页面的“订阅管理”，使用原邮箱确认。\n海选AI · 资料可能变化，请以原文为准。'
            send_mail(subscriber['email'], '海选AI · '+('资源提醒' if frequency=='instant' else '本期精选'), body)
            with connect() as db:
                for row in selected:
                    db.execute('INSERT OR IGNORE INTO deliveries VALUES(?,?,?)',(subscriber['email'],hashlib.sha256((row[0]+':'+row[1]).encode()).hexdigest(),now()))
        count += 1
    print(('Sent to ' if send else 'Dry run, eligible recipients: ')+str(count))

if __name__=='__main__':
    p=argparse.ArgumentParser();sub=p.add_subparsers(dest='command',required=True)
    sub.add_parser('pending')
    m=sub.add_parser('moderate');m.add_argument('table',choices=['tips','feedback']);m.add_argument('id',type=int);m.add_argument('--approve',action='store_true')
    n=sub.add_parser('newsletter');n.add_argument('frequency',choices=['daily','weekly','instant']);n.add_argument('--send',action='store_true')
    args=p.parse_args()
    if args.command=='pending':pending()
    elif args.command=='moderate':moderate(args.table,args.id,args.approve)
    else:newsletter(args.frequency,args.send)
