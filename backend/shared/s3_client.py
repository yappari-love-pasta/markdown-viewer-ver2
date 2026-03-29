"""インフラ層: S3操作の Port (ABC) + boto3 Adapter"""

import json
import os
from abc import ABC, abstractmethod

import boto3
from botocore.exceptions import ClientError

LIST_JSON_KEY = os.environ.get('LIST_JSON_KEY', 'list.json')


class DocumentRepository(ABC):
    """S3操作のインターフェース（Port）

    テスト時や将来的なストレージ変更時は、このインターフェースを実装した
    別のアダプターに差し替えることができる。
    """

    @abstractmethod
    def get_document_list(self) -> list[dict]:
        """list.json を読み込み DocumentMeta の辞書リストを返す"""
        ...

    @abstractmethod
    def save_document_list(self, documents: list[dict]) -> None:
        """DocumentMeta の辞書リストを list.json として保存する"""
        ...

    @abstractmethod
    def get_file_content(self, key: str) -> str:
        """指定キーのファイル内容を UTF-8 テキストで返す"""
        ...

    @abstractmethod
    def put_file(self, key: str, body: bytes, content_type: str = 'text/markdown') -> None:
        """指定キーにファイルを保存する"""
        ...


class S3DocumentRepository(DocumentRepository):
    """boto3 を使った S3 実装（Adapter）"""

    def __init__(self, bucket_name: str | None = None, s3_client=None):
        self._bucket = bucket_name or os.environ['S3_BUCKET_NAME']
        self._s3 = s3_client or boto3.client('s3')

    def get_document_list(self) -> list[dict]:
        try:
            resp = self._s3.get_object(Bucket=self._bucket, Key=LIST_JSON_KEY)
            return json.loads(resp['Body'].read().decode('utf-8'))
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                return []  # list.json が存在しない場合は空配列
            raise

    def save_document_list(self, documents: list[dict]) -> None:
        body = json.dumps(documents, ensure_ascii=False, indent=2).encode('utf-8')
        self._s3.put_object(
            Bucket=self._bucket,
            Key=LIST_JSON_KEY,
            Body=body,
            ContentType='application/json',
        )

    def get_file_content(self, key: str) -> str:
        resp = self._s3.get_object(Bucket=self._bucket, Key=key)
        return resp['Body'].read().decode('utf-8')

    def put_file(self, key: str, body: bytes, content_type: str = 'text/markdown') -> None:
        self._s3.put_object(
            Bucket=self._bucket,
            Key=key,
            Body=body,
            ContentType=content_type,
        )
