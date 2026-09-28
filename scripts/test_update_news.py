import pathlib
import sys
import unittest

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

if __name__=='__main__':unittest.main()
