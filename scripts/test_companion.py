import unittest,json,datetime as dt
from unittest.mock import patch
import companion as c
class FeedTests(unittest.TestCase):
 def test_filters_future_old_irrelevant_and_bad_links(self):
  now=dt.datetime.now(dt.timezone.utc)
  def item(title,date,url='https://example.com/news',desc='An AI model improves useful daily work for everyone.'):
   return f'<item><title>{title}</title><link>{url}</link><pubDate>{date.isoformat()}</pubDate><description>{desc}</description></item>'
  raw='<rss><channel>'+item('AI release',now)+item('AI future',now+dt.timedelta(days=2))+item('AI old',now-dt.timedelta(days=30))+item('AI bad',now,'javascript:alert(1)')+'</channel></rss>'
  result=c.parse_feed('Google',raw)
  self.assertEqual(len(result),1);self.assertEqual(result[0]['originalTitle'],'AI release')
 def test_atom(self):
  date=dt.datetime.now(dt.timezone.utc).isoformat()
  raw=f'<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>New model</title><link href="https://example.com/a"/><updated>{date}</updated><summary>A new AI model with a clearly described set of new capabilities.</summary></entry></feed>'
  self.assertEqual(c.parse_feed('Hugging Face',raw)[0]['url'],'https://example.com/a')
 def test_bing_redirect_is_unwrapped_to_original_article(self):
  date=dt.datetime.now(dt.timezone.utc).isoformat()
  raw=f'<rss><channel><item><title>AI model release</title><link>http://www.bing.com/news/apiclick.aspx?url=https%3A%2F%2Fexample.com%2Fstory</link><pubDate>{date}</pubDate><description>An artificial intelligence model release with enough source detail.</description></item></channel></rss>'
  self.assertEqual(c.parse_feed('Bing News',raw)[0]['url'],'https://example.com/story')
 def test_model_cannot_override_source(self):
  raw={'id':'id','url':'https://example.com/verified','source':'Source','publishedAt':'2026-09-03','originalTitle':'AI update','excerpt':'source'}
  result={'title':'新闻','summary':'简介','category':'模型进展','why':'原因','importance':900,'url':'https://evil.example','sections':[{'heading':'解释','text':'资料'}]*4}
  with patch.object(c,'ollama',return_value=json.dumps(result)):out=c.explain(raw)
  self.assertEqual(out['url'],raw['url']);self.assertEqual(out['importance'],100)
 def test_missing_sections_rejected(self):
  with patch.object(c,'ollama',return_value='{"title":"a","summary":"b","why":"c","category":"模型进展","sections":[]}'):
   with self.assertRaises(ValueError):c.explain({})
if __name__=='__main__':unittest.main()
