"""GET /list エンドポイントのテスト"""

import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../'))

from functions.list_documents.handler import lambda_handler
from tests.conftest import AUTH_HEADERS


def _event(headers: dict | None = None) -> dict:
    return {
        'httpMethod': 'GET',
        'queryStringParameters': None,
        'headers': AUTH_HEADERS if headers is None else headers,
    }


OPTIONS_EVENT = {'httpMethod': 'OPTIONS', 'queryStringParameters': None, 'headers': {}}


class TestListDocuments:
    def test_returns_empty_list_when_no_list_json(self, s3):
        """list.json が存在しない場合は空配列 [] を返す"""
        resp = lambda_handler(_event(), {})
        assert resp['statusCode'] == 200
        assert json.loads(resp['body']) == []

    def test_returns_documents_from_list_json(self, s3_with_list):
        """list.json が存在する場合は DocumentMeta 配列を返す"""
        resp = lambda_handler(_event(), {})
        assert resp['statusCode'] == 200
        docs = json.loads(resp['body'])
        assert len(docs) == 1
        assert docs[0]['title'] == 'サンプルドキュメント'
        assert docs[0]['category'] == '設計'
        assert docs[0]['format'] == 'markdown'

    def test_response_contains_all_document_meta_fields(self, s3_with_list):
        """レスポンスに DocumentMeta の全フィールドが含まれること"""
        resp = lambda_handler(_event(), {})
        doc = json.loads(resp['body'])[0]
        assert 'path' in doc
        assert 'title' in doc
        assert 'category' in doc
        assert 'tags' in doc
        assert 'lastModified' in doc
        assert 'format' in doc

    def test_has_cors_header(self, s3):
        """レスポンスに CORS ヘッダーが含まれること"""
        resp = lambda_handler(_event(), {})
        assert 'Access-Control-Allow-Origin' in resp['headers']

    def test_content_type_is_json(self, s3):
        """Content-Type が application/json であること"""
        resp = lambda_handler(_event(), {})
        assert resp['headers']['Content-Type'] == 'application/json'

    def test_options_preflight_returns_200_without_auth(self, s3):
        """OPTIONS プリフライトは認証なしでも 200 を返す"""
        resp = lambda_handler(OPTIONS_EVENT, {})
        assert resp['statusCode'] == 200

    # --- Basic 認証テスト ---

    def test_missing_auth_header_returns_401(self, s3):
        """Authorization ヘッダーなしは 401"""
        resp = lambda_handler(_event(headers={}), {})
        assert resp['statusCode'] == 401

    def test_wrong_password_returns_401(self, s3):
        """パスワード誤りは 401"""
        import base64
        token = base64.b64encode(b'testuser:wrongpass').decode()
        resp = lambda_handler(_event(headers={'Authorization': f'Basic {token}'}), {})
        assert resp['statusCode'] == 401

    def test_wrong_user_returns_401(self, s3):
        """ユーザー名誤りは 401"""
        import base64
        token = base64.b64encode(b'wronguser:testpass').decode()
        resp = lambda_handler(_event(headers={'Authorization': f'Basic {token}'}), {})
        assert resp['statusCode'] == 401

    def test_401_has_www_authenticate_header(self, s3):
        """401 レスポンスに WWW-Authenticate ヘッダーが含まれること"""
        resp = lambda_handler(_event(headers={}), {})
        assert 'WWW-Authenticate' in resp['headers']
