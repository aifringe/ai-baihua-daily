import json
import shutil
import socket
import subprocess
import time
import unittest
import urllib.error
import urllib.request


@unittest.skipUnless(shutil.which('php'), 'PHP is required for API contract tests')
class ChatApiContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        sock = socket.socket()
        sock.bind(('127.0.0.1', 0))
        cls.port = sock.getsockname()[1]
        sock.close()
        cls.server = subprocess.Popen(
            ['php', '-S', f'127.0.0.1:{cls.port}', '-t', 'public'],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        for _ in range(30):
            try:
                urllib.request.urlopen(f'http://127.0.0.1:{cls.port}/news.json', timeout=.2)
                break
            except Exception:
                time.sleep(.1)

    @classmethod
    def tearDownClass(cls):
        cls.server.terminate()
        cls.server.wait(timeout=5)

    def response(self, request):
        try:
            return urllib.request.urlopen(request, timeout=2)
        except urllib.error.HTTPError as error:
            return error

    def test_get_is_rejected_with_json(self):
        response = self.response(urllib.request.Request(f'http://127.0.0.1:{self.port}/api/chat.php'))
        self.assertEqual(response.status, 405)
        self.assertIn('application/json', response.headers['Content-Type'])

    def test_non_json_is_rejected(self):
        request = urllib.request.Request(f'http://127.0.0.1:{self.port}/api/chat.php', data=b'hello', method='POST')
        response = self.response(request)
        self.assertEqual(response.status, 415)

    def test_unknown_article_is_rejected_before_model_call(self):
        body = json.dumps({'articleId': 'missing-article', 'messages': [{'role': 'user', 'content': 'test'}]}).encode()
        request = urllib.request.Request(
            f'http://127.0.0.1:{self.port}/api/chat.php',
            data=body,
            method='POST',
            headers={'Content-Type': 'application/json'},
        )
        response = self.response(request)
        self.assertEqual(response.status, 404)


if __name__ == '__main__':
    unittest.main()
