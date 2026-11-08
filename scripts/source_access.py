"""Conservative shared robots policy for feed and article reads."""
from functools import lru_cache
from urllib.parse import urlsplit
from urllib.robotparser import RobotFileParser
from urllib.request import Request, urlopen
from urllib.error import HTTPError

USER_AGENT = 'HaiXuanAI/1.0 (+https://news.czrshe.com)'

@lru_cache(maxsize=128)
def policy(origin):
    parser = RobotFileParser()
    try:
        with urlopen(Request(origin + '/robots.txt', headers={'User-Agent': USER_AGENT}), timeout=12) as response:
            raw = response.read(512001)
            if len(raw) > 512000:
                return None
            parser.parse(raw.decode('utf-8-sig', 'ignore').splitlines())
        return parser
    except HTTPError as error:
        if error.code in (404, 410):
            parser.parse([])
            return parser
        return None
    except Exception:
        return None

def robots_allow(url):
    parts = urlsplit(url)
    if parts.scheme != 'https' or not parts.hostname or parts.username or parts.password:
        return False
    parser = policy(parts.scheme + '://' + parts.netloc)
    return parser is not None and parser.can_fetch(USER_AGENT, url)
