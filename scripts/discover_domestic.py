# -*- coding: utf-8 -*-
"""Discover public domestic stories, preserving provenance and a review-only queue.

Bing RSS is a discovery channel, never an article source. No login bypass,
private platform API, paywall bypass, or title-only generated case studies.
"""
import argparse
import concurrent.futures
import datetime as dt
import html
import hashlib
import json
import pathlib
import re
import urllib.parse
import urllib.robotparser
from html.parser import HTMLParser
from functools import lru_cache
import xml.etree.ElementTree as ET
import update_news as u
from source_access import robots_allow

ROOT=pathlib.Path(__file__).resolve().parents[1]
SOURCES=json.loads((ROOT/'data/domestic-sources.json').read_text())
UA='HaiXuanAI/1.0 (+https://news.czrshe.com)'

def allowed_domain(url, domains):
    try:
        p=urllib.parse.urlsplit(url)
        host=(p.hostname or '').lower()
        return p.scheme=='https' and not p.username and not p.password and any(host==d or host.endswith('.'+d) for d in domains)
    except ValueError:return False

class Metadata(u.ArticleParser):
    def __init__(self):
        super().__init__();self.published=''
    def handle_starttag(self,tag,attrs):
        super().handle_starttag(tag,attrs);a=dict(attrs)
        if tag=='meta' and (a.get('property','').lower() in ('article:published_time','og:release_date') or a.get('name','').lower() in ('pubdate','publishdate','publish_date','date','datepublished')):
            self.published=a.get('content','')[:40]

def publication_date(parser, raw, url):
    # Use explicit publication metadata or a date in the article URL; never search-engine crawl time.
    # Some 36kr pages expose render time in og metadata. Use the primary article's
    # embedded publishTime next to widgetContent, not recommendations or crawl time.
    if urllib.parse.urlsplit(url).hostname in ('36kr.com','www.36kr.com'):
        primary=re.search(r'"publishTime"\s*:\s*(\d{13})\s*,\s*"widgetContent"',raw)
        if primary:
            return dt.datetime.fromtimestamp(int(primary.group(1))/1000,dt.timezone(dt.timedelta(hours=8))).date().isoformat()
        return ''
    values=[parser.published]
    for blob in parser.jsonld:
        values.extend(re.findall(r'"datePublished"\s*:\s*"([^"]+)"',blob))
    values.append(url)
    for value in values:
        hit=re.search(r'(20\d{2})[-/](\d{2})[-/](\d{2})',value) or re.search(r'/(20\d{2})(\d{2})(\d{2})[/_]',value)
        if hit:
            try:return dt.date(*map(int,hit.groups())).isoformat()
            except ValueError:pass
    return ''

def inspect(candidate, domains):
    if not allowed_domain(candidate['url'],domains) or not robots_allow(candidate['url']):
        return {**candidate,'state':'待人工核验','reason':'访问规则未确认或不允许自动读取'}
    try:
        raw,final=u.request(candidate['url'],timeout=18)
        if not allowed_domain(final,domains):raise ValueError('redirect outside source')
        text=raw.decode('utf-8','ignore');parser=Metadata();parser.feed(text)
        body=u.clean(' '.join(parser.parts));date=publication_date(parser,text,final)
        title=re.search(r'<title[^>]*>(.*?)</title>',text,re.S|re.I)
        if not candidate['originalTitle'] and title:candidate={**candidate,'originalTitle':u.clean(title.group(1))}
        if len(body)<400 or u.PAYWALL.search(body[:2500]) or not date:
            return {**candidate,'state':'待人工核验','reason':'正文或发布日期不能可靠读取'}
        ceiling=dt.datetime.now(dt.timezone(dt.timedelta(hours=8))).date()
        if not ceiling-dt.timedelta(days=60)<=dt.date.fromisoformat(date)<=ceiling:
            return {**candidate,'state':'历史线索','reason':'不在最近60天窗口','publishedAt':date,'body':body[:18000]}
        image=urllib.parse.urljoin(final,parser.image) if parser.image else ''
        return {**candidate,'url':final,'publishedAt':date,'body':body[:18000],'imageUrl':image if image.startswith('https://') else '', 'state':'公开正文可读','reason':'正文已读取，事实和收入仍需编辑核验'}
    except Exception:
        return {**candidate,'state':'待人工核验','reason':'公开页面暂时无法读取'}

class Links(HTMLParser):
    def __init__(self):super().__init__();self.href='';self.text=[];self.links=[]
    def handle_starttag(self,tag,attrs):
        if tag=='a':self.href=dict(attrs).get('href','');self.text=[]
    def handle_data(self,text):
        if self.href:self.text.append(text)
    def handle_endtag(self,tag):
        if tag=='a' and self.href:
            self.links.append((self.href,u.clean(' '.join(self.text))));self.href=''

def discover_source(source,topic):
    query=source['query'] if topic=='business' else '人工智能 AI 模型 产品 发布 访谈 报告'
    if not query or source['mode']=='official':return [],{'source':source['name'],'ok':True,'stage':'official-only','count':0}
    search='https://www.bing.com/search?'+urllib.parse.urlencode({'q':'site:'+source['domains'][0]+' '+query,'format':'rss'})
    entries=[];health=[]
    try:
        raw,_=u.request(search,timeout=20);root=ET.fromstring(raw)
        entries.extend((n.findtext('link') or '',u.clean(n.findtext('title') or ''),search) for n in root.findall('.//item')[:12])
        health.append('search-responded')
    except Exception:health.append('search-unavailable')
    for index in source.get('indexes',[]):
        try:
            if not robots_allow(index):continue
            raw,_=u.request(index,timeout=15);p=Links();p.feed(raw.decode('utf-8','ignore'))
            entries.extend((urllib.parse.urljoin(index,link).replace('http://','https://',1),title,index) for link,title in p.links)
            health.append('public-index-readable')
        except Exception:health.append('public-index-unavailable')
    # A verified watch list rechecks previously selected primary cases. It is not counted as new news.
    if topic=='business':
        entries.extend((url,'',url) for url in source.get('watchUrls',[]))
    candidates=[];seen=set()
    pattern=r'一人公司|OPC|独立开发|接单|创业|生意' if topic=='business' else r'人工智能|大模型|智能体|\bAI\b|混元|通义|豆包'
    for link,title,discovery in entries:
        link=link.strip()
        if not allowed_domain(link,source['domains']) or link in seen:continue
        if not title and link not in source.get('watchUrls',[]):continue
        if title and not re.search(pattern,title,re.I):continue
        seen.add(link)
        candidate={'originalTitle':title,'url':link,'source':source['name'],'weight':4,'feedExcerpt':'','discoveredAt':dt.datetime.now(dt.timezone.utc).isoformat(),'discoveryUrl':discovery,'topic':topic}
        if source['mode']=='discovery':
            candidates.append({**candidate,'state':'待人工核验','reason':'微博仅用于线索发现，需核对作者身份与原始材料'})
        else:candidates.append(inspect(candidate,source['domains']))
        if len(candidates)>=6:break
    return candidates,{'source':source['name'],'ok':bool(health and any('readable' in h or 'responded' in h for h in health)),'stage':', '.join(health),'count':len(candidates),'readable':sum(c.get('state')=='公开正文可读' for c in candidates)}

def discover(topic='business'):
    sources=[s for s in SOURCES if s['mode']!='official']
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        results=list(pool.map(lambda s:discover_source(s,topic),sources))
    candidates={u.canonical(c['url']):c for rows,_ in results for c in rows}
    return list(candidates.values()),[status for _,status in results]

def main():
    candidates,health=discover('business');path=ROOT/'data/domestic-candidates.json'
    old=json.loads(path.read_text()) if path.exists() else {'candidates':[]}
    # Keep earlier unprocessed leads if a provider fails. Avoid discarding review decisions.
    merged={u.canonical(c['url']):c for c in old['candidates']}
    for c in candidates:merged[u.canonical(c['url'])]=c
    for c in merged.values():
        body=c.pop('body','')
        if body:c.update(bodyExcerpt=body[:200],textLength=len(body),contentHash=hashlib.sha256(body.encode()).hexdigest())
    result={'checkedAt':dt.datetime.now(dt.timezone.utc).isoformat(),'sources':health,'candidates':list(merged.values())[-300:]}
    temporary=path.with_suffix('.tmp');temporary.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');temporary.replace(path)
    print('Domestic discovery:',len(candidates),'leads;',sum(s['ok'] for s in health),'sources responded. Leads require editorial review.')

if __name__=='__main__':main()
