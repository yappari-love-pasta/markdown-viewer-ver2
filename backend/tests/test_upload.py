"""POST /upload エンドポイントのテスト"""

import base64
import json
import os
import sys

import boto3

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../'))

from functions.upload_document.handler import lambda_handler
from tests.conftest import AUTH_HEADERS

BUCKET_NAME = os.environ['S3_BUCKET_NAME']


def _build_event(
    content: bytes = b'# Test',
    filename: str = 'test.md',
    title: str = 'テストドキュメント',
    category: str = '設計',
    tags: str = 'AWS,test',
    format_: str = 'markdown',
    extra_headers: dict | None = None,
) -> dict:
    """テスト用 multipart/form-data Lambda イベントを生成"""
    boundary = 'testboundary9999'

    def field(name: str, value: str) -> bytes:
        return (
            f'--{boundary}\r\n'
            f'Content-Disposition: form-data; name="{name}"\r\n\r\n'
            f'{value}'
        ).encode('utf-8')

    body = (
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        f'Content-Type: text/markdown\r\n\r\n'
    ).encode('utf-8')
    body += content
    body += b'\r\n'
    body += field('title', title) + b'\r\n'
    body += field('category', category) + b'\r\n'
    body += field('tags', tags) + b'\r\n'
    body += field('format', format_) + b'\r\n'
    body += f'--{boundary}--\r\n'.encode('utf-8')

    headers = {
        'Content-Type': f'multipart/form-data; boundary={boundary}',
        **AUTH_HEADERS,
    }
    if extra_headers is not None:
        headers = {**headers, **extra_headers}

    return {
        'httpMethod': 'POST',
        'headers': headers,
        'body': base64.b64encode(body).decode('ascii'),
        'isBase64Encoded': True,
    }


class TestUploadDocument:
    def test_upload_success_returns_201(self, s3):
        """正常アップロードは 201 を返す"""
        resp = lambda_handler(_build_event(), {})
        assert resp['statusCode'] == 201

    def test_upload_response_contains_path_and_meta(self, s3):
        """レスポンスに path と meta フィールドが含まれること"""
        resp = lambda_handler(_build_event(), {})
        body = json.loads(resp['body'])
        assert 'path' in body
        assert body['path'].startswith('uploads/')
        assert 'meta' in body
        assert body['meta']['title'] == 'テストドキュメント'

    def test_upload_saves_file_to_s3(self, s3):
        """アップロード後に S3 にファイルが保存されていること"""
        resp = lambda_handler(_build_event(b'# Hello S3'), {})
        path = json.loads(resp['body'])['path']
        obj = boto3.client('s3', region_name='ap-northeast-1').get_object(
            Bucket=BUCKET_NAME, Key=path
        )
        assert b'# Hello S3' in obj['Body'].read()

    def test_upload_updates_list_json(self, s3):
        """アップロード後に list.json が更新されていること"""
        lambda_handler(_build_event(title='新ドキュメント', format_='mermaid'), {})
        obj = boto3.client('s3', region_name='ap-northeast-1').get_object(
            Bucket=BUCKET_NAME, Key='list.json'
        )
        docs = json.loads(obj['Body'].read())
        assert len(docs) == 1
        assert docs[0]['title'] == '新ドキュメント'
        assert docs[0]['format'] == 'mermaid'
        assert 'lastModified' in docs[0]

    def test_upload_appends_to_existing_list(self, s3_with_list):
        """既存の list.json に追記されること（上書きではない）"""
        lambda_handler(_build_event(title='2つ目'), {})
        obj = boto3.client('s3', region_name='ap-northeast-1').get_object(
            Bucket=BUCKET_NAME, Key='list.json'
        )
        docs = json.loads(obj['Body'].read())
        assert len(docs) == 2

    def test_upload_parses_tags_correctly(self, s3):
        """タグがカンマ区切りで正しく解析されること"""
        lambda_handler(_build_event(tags='AWS, API, Mermaid'), {})
        obj = boto3.client('s3', region_name='ap-northeast-1').get_object(
            Bucket=BUCKET_NAME, Key='list.json'
        )
        docs = json.loads(obj['Body'].read())
        assert docs[0]['tags'] == ['AWS', 'API', 'Mermaid']

    def test_upload_rejects_non_md_extension(self, s3):
        """.md 以外の拡張子は 400"""
        resp = lambda_handler(_build_event(filename='bad.txt'), {})
        assert resp['statusCode'] == 400

    def test_upload_rejects_empty_title(self, s3):
        """タイトルが空の場合は 400"""
        resp = lambda_handler(_build_event(title=''), {})
        assert resp['statusCode'] == 400

    def test_upload_rejects_empty_category(self, s3):
        """分類が空の場合は 400"""
        resp = lambda_handler(_build_event(category=''), {})
        assert resp['statusCode'] == 400

    def test_upload_rejects_invalid_format(self, s3):
        """不正な format 値は 400"""
        resp = lambda_handler(_build_event(format_='unknown'), {})
        assert resp['statusCode'] == 400

    def test_upload_rejects_oversized_file(self, s3):
        """10MB 超のファイルは 400"""
        big = b'x' * (10 * 1024 * 1024 + 1)
        resp = lambda_handler(_build_event(content=big), {})
        assert resp['statusCode'] == 400

    def test_upload_has_cors_header(self, s3):
        """レスポンスに CORS ヘッダーが含まれること"""
        resp = lambda_handler(_build_event(), {})
        assert 'Access-Control-Allow-Origin' in resp['headers']

    def test_options_preflight_returns_200_without_auth(self, s3):
        """OPTIONS プリフライトは認証なしでも 200 を返す"""
        resp = lambda_handler({'httpMethod': 'OPTIONS', 'headers': {}, 'body': '', 'isBase64Encoded': False}, {})
        assert resp['statusCode'] == 200

    # --- Basic 認証テスト ---

    def test_missing_auth_returns_401(self, s3):
        """Authorization ヘッダーなしは 401"""
        event = _build_event()
        event['headers'].pop('Authorization', None)
        resp = lambda_handler(event, {})
        assert resp['statusCode'] == 401

    def test_wrong_credentials_returns_401(self, s3):
        """認証情報誤りは 401"""
        token = base64.b64encode(b'bad:creds').decode()
        resp = lambda_handler(_build_event(extra_headers={'Authorization': f'Basic {token}'}), {})
        assert resp['statusCode'] == 401


class TestUploadModels:
    """models.py のユニットテスト（S3 不要）"""

    def test_validate_accepts_valid_input(self):
        from shared.models import validate_upload_input
        validate_upload_input('doc.md', 'Title', 'Category', 'markdown', 100)

    def test_validate_rejects_non_md(self):
        from shared.models import validate_upload_input, ValidationError
        import pytest
        with pytest.raises(ValidationError):
            validate_upload_input('doc.txt', 'Title', 'Category', 'markdown', 100)

    def test_validate_all_formats_accepted(self):
        from shared.models import validate_upload_input
        for fmt in ('markdown', 'mermaid', 'markmap', 'marp'):
            validate_upload_input('doc.md', 'Title', 'Category', fmt, 100)

    def test_build_s3_key_starts_with_uploads(self):
        from shared.models import build_s3_key
        key = build_s3_key('my document.md')
        assert key.startswith('uploads/')
        assert key.endswith('.md')

    def test_build_s3_key_is_unique(self):
        from shared.models import build_s3_key
        key1 = build_s3_key('same.md')
        key2 = build_s3_key('same.md')
        assert key1 != key2

    def test_document_meta_to_dict(self):
        from shared.models import DocumentMeta
        meta = DocumentMeta('uploads/a.md', 'Title', 'Cat', ['t1'], '2026-01-01T00:00:00Z', 'mermaid')
        d = meta.to_dict()
        assert d['path'] == 'uploads/a.md'
        assert d['format'] == 'mermaid'
        assert d['tags'] == ['t1']


class TestBasicAuth:
    """shared/auth.py のユニットテスト（S3 不要）"""

    def test_valid_credentials_returns_none(self):
        from shared.auth import check_basic_auth
        token = base64.b64encode(b'testuser:testpass').decode()
        event = {'headers': {'Authorization': f'Basic {token}'}}
        assert check_basic_auth(event) is None

    def test_missing_header_returns_401(self):
        from shared.auth import check_basic_auth
        assert check_basic_auth({'headers': {}})['statusCode'] == 401

    def test_non_basic_scheme_returns_401(self):
        from shared.auth import check_basic_auth
        event = {'headers': {'Authorization': 'Bearer sometoken'}}
        assert check_basic_auth(event)['statusCode'] == 401

    def test_wrong_password_returns_401(self):
        from shared.auth import check_basic_auth
        token = base64.b64encode(b'testuser:wrong').decode()
        event = {'headers': {'Authorization': f'Basic {token}'}}
        assert check_basic_auth(event)['statusCode'] == 401

    def test_case_insensitive_header_key(self):
        from shared.auth import check_basic_auth
        token = base64.b64encode(b'testuser:testpass').decode()
        event = {'headers': {'authorization': f'Basic {token}'}}  # 小文字
        assert check_basic_auth(event) is None

    def test_empty_env_vars_deny_all(self, monkeypatch):
        from shared.auth import check_basic_auth
        monkeypatch.setenv('BASIC_AUTH_USER', '')
        monkeypatch.setenv('BASIC_AUTH_PASSWORD', '')
        token = base64.b64encode(b'testuser:testpass').decode()
        event = {'headers': {'Authorization': f'Basic {token}'}}
        assert check_basic_auth(event)['statusCode'] == 401
