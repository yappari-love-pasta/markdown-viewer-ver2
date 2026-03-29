"""GET /file エンドポイントのテスト"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../'))

from functions.get_file.handler import lambda_handler
from tests.conftest import AUTH_HEADERS


def _event(path: str | None, headers: dict | None = None) -> dict:
    params = {'path': path} if path is not None else {}
    return {
        'httpMethod': 'GET',
        'queryStringParameters': params,
        'headers': AUTH_HEADERS if headers is None else headers,
    }


class TestGetFile:
    def test_returns_file_content(self, s3_with_list):
        """uploads/ パスのファイルを正常取得できること"""
        resp = lambda_handler(_event('uploads/sample.md'), {})
        assert resp['statusCode'] == 200
        assert 'サンプル' in resp['body']

    def test_content_type_is_text_plain(self, s3_with_list):
        """Content-Type が text/plain; charset=utf-8 であること"""
        resp = lambda_handler(_event('uploads/sample.md'), {})
        assert 'text/plain' in resp['headers']['Content-Type']
        assert 'utf-8' in resp['headers']['Content-Type']

    def test_missing_path_returns_400(self, s3_with_list):
        """path パラメータなしは 400"""
        resp = lambda_handler({'httpMethod': 'GET', 'queryStringParameters': {}, 'headers': AUTH_HEADERS}, {})
        assert resp['statusCode'] == 400

    def test_null_query_params_returns_400(self, s3_with_list):
        """queryStringParameters が null の場合は 400"""
        resp = lambda_handler({'httpMethod': 'GET', 'queryStringParameters': None, 'headers': AUTH_HEADERS}, {})
        assert resp['statusCode'] == 400

    def test_path_without_uploads_prefix_returns_400(self, s3_with_list):
        """uploads/ プレフィックスなしのパスは 400（パストラバーサル防止）"""
        resp = lambda_handler(_event('list.json'), {})
        assert resp['statusCode'] == 400

    def test_path_traversal_blocked(self, s3_with_list):
        """../list.json へのアクセスは 400"""
        resp = lambda_handler(_event('../list.json'), {})
        assert resp['statusCode'] == 400

    def test_double_dot_in_path_blocked(self, s3_with_list):
        """uploads/../list.json のような .. を含むパスは 400"""
        resp = lambda_handler(_event('uploads/../list.json'), {})
        assert resp['statusCode'] == 400

    def test_nonexistent_file_returns_404(self, s3_with_list):
        """存在しないファイルは 404"""
        resp = lambda_handler(_event('uploads/nonexistent.md'), {})
        assert resp['statusCode'] == 404

    def test_has_cors_header(self, s3_with_list):
        """レスポンスに CORS ヘッダーが含まれること"""
        resp = lambda_handler(_event('uploads/sample.md'), {})
        assert 'Access-Control-Allow-Origin' in resp['headers']

    def test_options_preflight_returns_200_without_auth(self, s3_with_list):
        """OPTIONS プリフライトは認証なしでも 200 を返す"""
        resp = lambda_handler({'httpMethod': 'OPTIONS', 'queryStringParameters': None, 'headers': {}}, {})
        assert resp['statusCode'] == 200

    # --- Basic 認証テスト ---

    def test_missing_auth_header_returns_401(self, s3_with_list):
        """Authorization ヘッダーなしは 401"""
        resp = lambda_handler(_event('uploads/sample.md', headers={}), {})
        assert resp['statusCode'] == 401

    def test_wrong_credentials_returns_401(self, s3_with_list):
        """認証情報誤りは 401"""
        import base64
        token = base64.b64encode(b'bad:creds').decode()
        resp = lambda_handler(_event('uploads/sample.md', headers={'Authorization': f'Basic {token}'}), {})
        assert resp['statusCode'] == 401
