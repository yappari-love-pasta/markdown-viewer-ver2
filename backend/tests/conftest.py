"""pytest 共通フィクスチャ: moto S3 モック環境"""

import base64
import json
import os

import boto3
import pytest
from moto import mock_aws

BUCKET_NAME = 'test-markdown-bucket'

# テスト用 Basic 認証情報
TEST_AUTH_USER = 'testuser'
TEST_AUTH_PASSWORD = 'testpass'

# 環境変数をテスト前に設定（各モジュールの import より先に実行される）
os.environ['S3_BUCKET_NAME'] = BUCKET_NAME
os.environ['LIST_JSON_KEY'] = 'list.json'
os.environ['BASIC_AUTH_USER'] = TEST_AUTH_USER
os.environ['BASIC_AUTH_PASSWORD'] = TEST_AUTH_PASSWORD
os.environ['AWS_DEFAULT_REGION'] = 'ap-northeast-1'
os.environ['AWS_ACCESS_KEY_ID'] = 'testing'
os.environ['AWS_SECRET_ACCESS_KEY'] = 'testing'
os.environ['AWS_SECURITY_TOKEN'] = 'testing'
os.environ['AWS_SESSION_TOKEN'] = 'testing'


def make_auth_header(user: str = TEST_AUTH_USER, password: str = TEST_AUTH_PASSWORD) -> str:
    """Basic 認証ヘッダー値を生成するヘルパー"""
    token = base64.b64encode(f'{user}:{password}'.encode()).decode()
    return f'Basic {token}'


# 認証ヘッダー付きの共通ヘッダー辞書
AUTH_HEADERS = {'Authorization': make_auth_header()}


@pytest.fixture
def s3():
    """moto でモック S3 を起動し、テスト用バケットを作成して boto3 クライアントを返す"""
    with mock_aws():
        client = boto3.client('s3', region_name='ap-northeast-1')
        client.create_bucket(
            Bucket=BUCKET_NAME,
            CreateBucketConfiguration={'LocationConstraint': 'ap-northeast-1'},
        )
        yield client


@pytest.fixture
def s3_with_list(s3):
    """list.json とサンプルファイルを事前投入した S3 環境"""
    sample_docs = [
        {
            'path': 'uploads/sample.md',
            'title': 'サンプルドキュメント',
            'category': '設計',
            'tags': ['test', 'sample'],
            'lastModified': '2026-03-28T00:00:00Z',
            'format': 'markdown',
        }
    ]
    s3.put_object(
        Bucket=BUCKET_NAME,
        Key='list.json',
        Body=json.dumps(sample_docs, ensure_ascii=False).encode('utf-8'),
        ContentType='application/json',
    )
    s3.put_object(
        Bucket=BUCKET_NAME,
        Key='uploads/sample.md',
        Body='# サンプル\n\nこれはサンプルドキュメントです。'.encode('utf-8'),
        ContentType='text/markdown',
    )
    yield s3
