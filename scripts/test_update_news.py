import pathlib
import sys
import unittest
from unittest.mock import patch
import source_access

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import update_news as u

class UpdateNewsTests(unittest.TestCase):
 def test_groups_different_headlines_for_same_event(self):
  rows=[
   {'originalTitle':'Google Gemini AI breached three companies in security test','publishedAt':'2026-09-20','weight':3},
   {'originalTitle':'Gemini AI breaches three firms during Google safety test','publishedAt':'2026-09-19','weight':4},
  ]
  self.assertEqual(len(u.group_events(rows)),1)
 def test_unrelated_events_stay_separate(self):
  rows=[
   {'originalTitle':'OpenAI launches a new GPT model','publishedAt':'2026-09-20','weight':3},
   {'originalTitle':'NVIDIA opens a robotics research lab','publishedAt':'2026-09-20','weight':4},
  ]
  self.assertEqual(len(u.group_events(rows)),2)
 def test_existing_duplicates_merge_source_links(self):
  base={'publishedAt':'2026-09-20','title':'Gemini安全测试攻破三家公司','category':'安全与规则','importance':80,'summary':'摘要','why':'原因','sections':[],'editor':'编辑'}
  rows=[{**base,'id':'1','url':'https://one.example/a','source':'媒体一','originalTitle':'Gemini AI breached three companies in safety test'},
        {**base,'id':'2','url':'https://two.example/b','source':'媒体二','originalTitle':'Gemini AI breaches three firms during safety testing'}]
  result=u.dedupe_existing(rows)
  self.assertEqual(len(result),1);self.assertEqual(len(result[0]['sources']),2)
 def test_chinese_variants_for_same_event_merge(self):
  base={'publishedAt':'2026-09-20','category':'安全与规则','importance':80,'summary':'摘要','why':'原因','sections':[],'editor':'编辑'}
  rows=[{**base,'id':'1','url':'https://one.example/a','source':'媒体一','title':'谷歌称Gemini AI系统曾入侵三家公司','originalTitle':'Google says Gemini agent hacked three companies'},
        {**base,'id':'2','url':'https://two.example/b','source':'媒体二','title':'Gemini AI测试中攻破三家公司后停止','originalTitle':'Gemini stopped after breaching three firms'}]
  self.assertEqual(len(u.dedupe_existing(rows)),1)
 def test_same_company_different_events_stay_separate(self):
  a={'title':'谷歌发布Gemini实时数字人','originalTitle':'Google launches Gemini live avatars'}
  b={'title':'谷歌Gemini测试中入侵三家公司','originalTitle':'Gemini breached three firms in test'}
  self.assertFalse(u.same_event(a,b))
 def test_hacking_synonyms_merge_when_entity_matches(self):
  a={'title':'谷歌称Gemini AI系统曾入侵三家公司','originalTitle':'Google says Gemini hacked three companies'}
  b={'title':'Gemini AI测试中攻破三家公司后停止','originalTitle':'Gemini stopped after breaching three firms'}
  self.assertTrue(u.same_event(a,b))
 def test_similar_stock_headlines_with_different_companies_stay_separate(self):
  a={'title':'AMD与SK Hynix AI股票对比','originalTitle':'Better artificial intelligence stock: AMD versus SK Hynix'}
  b={'title':'英伟达与美光AI股票对比','originalTitle':'Better artificial intelligence stock: Nvidia versus Micron'}
  self.assertFalse(u.same_event(a,b))
 def test_different_model_versions_stay_separate(self):
  self.assertFalse(u.similar_title('OpenAI releases GPT-6.1','OpenAI releases GPT-6.2'))
 def test_tracking_parameters_do_not_create_duplicates(self):
  self.assertEqual(u.canonical('https://example.com/a?utm_source=x&id=1'),u.canonical('https://example.com/a?id=1'))
 def test_low_value_promotions_are_rejected(self):
  item={'originalTitle':'Best AI stocks to buy now','feedExcerpt':'Special deal','weight':5}
  self.assertFalse(u.editorially_eligible(item))
 def test_official_research_is_eligible(self):
  item={'originalTitle':'MIT researchers release a new AI safety benchmark','feedExcerpt':'Research results','weight':5}
  self.assertTrue(u.editorially_eligible(item))
 def test_article_parser_reads_open_graph_image(self):
  parser=u.ArticleParser();parser.feed('<meta property="og:image" content="https://example.com/cover.jpg"><article>正文内容</article>')
  self.assertEqual(parser.image,'https://example.com/cover.jpg')

class SourcePolicyTests(unittest.TestCase):
 def test_denied_feed_never_fetches(self):
  with patch.object(u, 'robots_allow', return_value=False), patch.object(u, 'request') as request:
   rows, status=u.parse_feed(('Blocked', 'https://blocked.example/rss', 5))
   self.assertEqual(rows, []); self.assertFalse(status['ok']); request.assert_not_called()
 def test_denied_article_never_fetches(self):
  with patch.object(u, 'robots_allow', return_value=False), patch.object(u, 'request') as request:
   self.assertIsNone(u.article_text({'url':'https://blocked.example/article'})); request.assert_not_called()
 def test_schedule_matches_four_beijing_hours(self):
  text=(u.ROOT/'.github/workflows/update-news.yml').read_text()
  self.assertIn("0 23,3,9,13 * * *", text)
  self.assertEqual(sorted((h+8)%24 for h in [23,3,9,13]), [7,11,17,21])
 def test_curated_sources_exclude_blocked_and_aggregator(self):
  names={s['name'] for s in u.SOURCE_CATALOG}
  self.assertIn('量子位', names); self.assertIn('Simon Willison', names)
  self.assertNotIn('VentureBeat AI', names); self.assertNotIn('Google News', names)

if __name__=='__main__':unittest.main()
