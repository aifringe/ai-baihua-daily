# -*- coding: utf-8 -*-
import datetime as dt
import hashlib
import json
import os
import pathlib
import sys
import tempfile
import time
import unittest
from unittest.mock import patch
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from server import app
import update_news as news
import discover_domestic as domestic

class EditorialTests(unittest.TestCase):
    def test_daily_cap_future_exclusion_and_source_diversity(self):
        rows=[dict(id=str(i),source='甲' if i<5 else '乙' if i<8 else '丙',publishedAt='2026-11-08',importance=90-i,title='不同事件'+str(i),url='https://example.com/'+str(i)) for i in range(12)]
        rows += [dict(rows[0],id='future',publishedAt='2026-11-09',importance=100)]
        with patch.object(news,'same_event',side_effect=lambda a,b:a['id']==b['id']):
            result=news.select_daily(rows,'2026-11-08',20)
        self.assertEqual(len(result),5)
        self.assertNotIn('future',result)
        self.assertLessEqual(sum(int(i)<5 for i in result),2)
    def test_sparse_edition_does_not_fill_with_old_stories(self):
        rows=[dict(id='old',publishedAt='2026-10-01',importance=100,source='甲')]
        self.assertEqual(news.select_daily(rows,'2026-11-08'),[])
    def test_domestic_domains_cannot_be_spoofed(self):
        self.assertTrue(domestic.allowed_domain('https://news.qq.com/rain/a/1',['news.qq.com']))
        self.assertFalse(domestic.allowed_domain('https://news.qq.com.evil.example/a',['news.qq.com']))
        self.assertFalse(domestic.allowed_domain('https://news.qq.com@evil.example/',['news.qq.com']))
        self.assertFalse(domestic.allowed_domain('http://news.qq.com/',['news.qq.com']))
    def test_dates_are_from_publication_metadata(self):
        p=domestic.Metadata();p.feed('<meta property="article:published_time" content="2026-11-06T08:30:00+08:00">')
        self.assertEqual(domestic.publication_date(p,'','https://news.qq.com/x'),'2026-11-06')
        self.assertEqual(domestic.publication_date(domestic.Metadata(),'','https://news.qq.com/x'),'')
    def test_36kr_render_time_cannot_replace_article_publish_time(self):
        p=domestic.Metadata();p.published='2026-11-08T22:41:30+08:00'
        raw='"publishTime":1782391880808,"widgetContent":"正文"'
        self.assertEqual(domestic.publication_date(p,raw,'https://www.36kr.com/p/3868498998449415'),'2026-06-25')
        self.assertEqual(domestic.publication_date(p,'','https://www.36kr.com/p/1'),'')
    def test_resource_and_case_content_has_provenance(self):
        data=json.loads((app.ROOT/'data/portal-content.json').read_text())
        self.assertGreaterEqual(len(data['cases']),4)
        for row in data['cases']:
            for field in ['source','url','publishedAt','customer','skills','cost','evidence','firstStep','risk']:
                self.assertTrue(row[field])
        for row in data['resources']:
            for field in ['provider','url','billing','checkedAt','region','audience']:
                self.assertTrue(row[field])
            self.assertLessEqual(row['checkedAt'],dt.date.today().isoformat())
        edition=json.loads((app.ROOT/'public/news.json').read_text())
        self.assertTrue(3<=len(edition['dailyIds'])<=5)
        self.assertEqual(len(edition['dailyIds']),len(set(edition['dailyIds'])))
        for row in edition['articles']:
            self.assertIn(row['category'],['产品动态','行业动态','人物对话','报告解读'])
            self.assertTrue((app.ROOT/'public'/row['image'].removeprefix('./')).is_file())

class InteractionTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.environment=patch.dict(os.environ,{'HAIXUAN_DB':self.temp.name+'/test.sqlite3'},clear=False)
        self.environment.start()
    def tearDown(self):
        self.environment.stop();self.temp.cleanup()
    def test_unconfigured_mail_does_not_claim_success_or_store_subscriber(self):
        with patch.object(app,'mail_configured',return_value=False):
            code,_=app.handle_post('subscribe',{'email':'test@example.com','topics':['免费资源'],'frequency':'weekly'})
        self.assertEqual(code,503)
        with app.connect() as db:self.assertEqual(db.execute('SELECT count(*) FROM subscribers').fetchone()[0],0)
    def test_confirm_required_and_token_single_use(self):
        data={'email':'test@example.com','topics':['免费资源'],'frequency':'weekly'}
        with patch.object(app,'mail_configured',return_value=True),patch.object(app,'send_mail') as mail:
            self.assertEqual(app.handle_post('subscribe',data)[0],202)
        token=mail.call_args.args[2].split('/#confirm/')[1].split('\n')[0]
        with app.connect() as db:self.assertEqual(db.execute('SELECT count(*) FROM subscribers').fetchone()[0],0)
        self.assertEqual(app.handle_post('confirm',{'token':token})[0],200)
        self.assertEqual(app.handle_post('confirm',{'token':token})[0],400)
        with app.connect() as db:self.assertEqual(db.execute('SELECT active FROM subscribers').fetchone()[0],1)
        with patch.object(app,'mail_configured',return_value=True),patch.object(app,'send_mail') as mail:
            app.handle_post('unsubscribe',{'email':'test@example.com'})
        token=mail.call_args.args[2].split('/#confirm/')[1].split('\n')[0]
        with app.connect() as db:self.assertEqual(db.execute('SELECT active FROM subscribers').fetchone()[0],1)
        app.handle_post('confirm',{'token':token})
        with app.connect() as db:self.assertEqual(db.execute('SELECT active FROM subscribers').fetchone()[0],0)
    def test_failed_smtp_cleans_token_and_preserves_existing_subscription(self):
        with app.connect() as db:db.execute('INSERT INTO subscribers VALUES(?,?,?,1)',('test@example.com','["免费资源"]','weekly'))
        with patch.object(app,'mail_configured',return_value=True),patch.object(app,'send_mail',side_effect=RuntimeError('smtp')):
            self.assertEqual(app.handle_post('unsubscribe',{'email':'test@example.com'})[0],503)
        with app.connect() as db:
            self.assertEqual(db.execute('SELECT active FROM subscribers').fetchone()[0],1)
            self.assertEqual(db.execute('SELECT count(*) FROM tokens').fetchone()[0],0)
    def test_feedback_and_tips_are_held_for_review(self):
        self.assertEqual(app.handle_post('feedback',{'resource':'aliyun-bailian','status':'我领到了','message':'测试反馈，等待审核。'})[0],202)
        self.assertEqual(app.handle_post('tips',{'kind':'免费资源','title':'测试线索标题','url':'https://example.com/official','message':'这是一条仅用于测试审核流程的线索。'})[0],202)
        with app.connect() as db:
            self.assertEqual(db.execute('SELECT approved FROM feedback').fetchone()[0],0)
            self.assertEqual(db.execute('SELECT status FROM tips').fetchone()[0],'pending')
    def test_unrecognized_resource_and_unsafe_url_rejected(self):
        with self.assertRaises(ValueError):app.handle_post('feedback',{'resource':'no','status':'我领到了','message':'一条测试内容'})
        with self.assertRaises(ValueError):app.handle_post('tips',{'kind':'免费资源','title':'测试线索标题','url':'javascript:alert(1)','message':'这是一条测试内容，不能被当成安全链接。'})

if __name__=='__main__':unittest.main()
