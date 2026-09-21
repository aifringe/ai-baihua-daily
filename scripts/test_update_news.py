import unittest
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

if __name__=='__main__':unittest.main()
