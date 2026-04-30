"""
単一Lambda関数 — API Gateway からのルーティングを一括処理する。

ルーティング:
  GET  /list   → ドキュメント一覧取得
  GET  /file   → ドキュメント内容取得
  POST /upload → ドキュメントアップロード
  PUT  /update → ドキュメント更新
  OPTIONS *    → CORSプリフライト
"""

# ── 標準ライブラリ ──────────────────────────────────────────────────────────
import base64
import io
import json
import os
import re
import secrets
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal

# ── AWS SDK ─────────────────────────────────────────────────────────────────
import boto3
import cgi
from botocore.exceptions import ClientError


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Domain Layer — モデル・バリデーション
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TabType = Literal['markdown', 'mermaid', 'markmap', 'marp']

ALLOWED_FORMATS: tuple[str, ...] = ('markdown', 'mermaid', 'markmap', 'marp')
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = ('.md',)


@dataclass
class DocumentMeta:
    path: str
    title: str
    category: str
    tags: list[str]
    lastModified: str  # ISO8601 UTC
    format: str        # TabType
    user: str = ''
    editPassword: str = ''

    def to_dict(self) -> dict:
        return {
            'path': self.path,
            'title': self.title,
            'category': self.category,
            'tags': self.tags,
            'lastModified': self.lastModified,
            'format': self.format,
            'user': self.user,
            'editPassword': self.editPassword,
        }

    @staticmethod
    def from_dict(d: dict) -> 'DocumentMeta':
        return DocumentMeta(
            path=d['path'],
            title=d['title'],
            category=d['category'],
            tags=d.get('tags', []),
            lastModified=d['lastModified'],
            format=d['format'],
            user=d.get('user', ''),
            editPassword=d.get('editPassword', ''),
        )


class ValidationError(Exception):
    """バリデーションエラー（400 Bad Request に対応）"""
    pass


def validate_upload_input(
    filename: str,
    title: str,
    category: str,
    format_: str,
    file_size: int,
) -> None:
    if not filename or not filename.lower().endswith(ALLOWED_EXTENSIONS):
        raise ValidationError('ファイルは .md 形式のみ許可されています')

    if file_size > MAX_FILE_SIZE_BYTES:
        raise ValidationError('ファイルサイズは10MB以下にしてください')

    if not title or not title.strip():
        raise ValidationError('タイトルは必須です')

    if not category or not category.strip():
        raise ValidationError('分類は必須です')

    for field_name, value in [('title', title), ('category', category)]:
        if re.search(r'[\x00-\x1f\x7f]', value):
            raise ValidationError(f'{field_name} に無効な文字が含まれています')

    if format_ not in ALLOWED_FORMATS:
        raise ValidationError(
            f'format は {list(ALLOWED_FORMATS)} のいずれかを指定してください'
        )


def _uuid7_hex() -> str:
    """UUID v7 の hex 文字列を生成する (RFC 9562 / タイムスタンプ順ソート可能)"""
    ms     = int(time.time() * 1000)
    rand   = int.from_bytes(os.urandom(10), 'big')
    rand_a = (rand >> 68) & 0xFFF
    rand_b = rand & 0x3FFFFFFFFFFFFFFF
    value  = (ms << 80) | (0x7 << 76) | (rand_a << 64) | (0b10 << 62) | rand_b
    return f'{value:032x}'


def build_s3_key(original_filename: str) -> str:  # noqa: ARG001
    return f'uploads/{_uuid7_hex()}.md'


def now_iso8601() -> str:
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def parse_tags(tags_str: str) -> list[str]:
    if not tags_str:
        return []
    return [t.strip() for t in tags_str.split(',') if t.strip()]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Infrastructure Layer — S3リポジトリ (Port & Adapter)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LIST_JSON_KEY = os.environ.get('LIST_JSON_KEY', 'list.json')


class DocumentRepository(ABC):
    @abstractmethod
    def get_document_list(self) -> list[dict]: ...

    @abstractmethod
    def save_document_list(self, documents: list[dict]) -> None: ...

    @abstractmethod
    def get_file_content(self, key: str) -> str: ...

    @abstractmethod
    def put_file(self, key: str, body: bytes, content_type: str = 'text/markdown') -> None: ...


class S3DocumentRepository(DocumentRepository):
    def __init__(self, bucket_name: str | None = None, s3_client=None):
        self._bucket = bucket_name or os.environ['S3_BUCKET_NAME']
        self._s3 = s3_client or boto3.client('s3')

    def get_document_list(self) -> list[dict]:
        try:
            resp = self._s3.get_object(Bucket=self._bucket, Key=LIST_JSON_KEY)
            return json.loads(resp['Body'].read().decode('utf-8'))
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                return []
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


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Application Layer — 認証・レスポンスヘルパー
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALLOWED_ORIGIN = os.environ.get('ALLOWED_ORIGIN', '*')

CORS_HEADERS = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}


def ok_json(body: dict | list, status: int = 200) -> dict:
    return {
        'statusCode': status,
        'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
        'body': json.dumps(body, ensure_ascii=False),
    }


def ok_text(body: str) -> dict:
    return {
        'statusCode': 200,
        'headers': {**CORS_HEADERS, 'Content-Type': 'text/plain; charset=utf-8'},
        'body': body,
    }


def error_json(message: str, status: int = 400) -> dict:
    return {
        'statusCode': status,
        'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
        'body': json.dumps({'error': message}, ensure_ascii=False),
    }


def preflight() -> dict:
    return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}


def _unauthorized() -> dict:
    return {
        'statusCode': 401,
        'headers': {
            'WWW-Authenticate': 'Basic realm="Markdown Viewer"',
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
        },
        'body': '{"error": "Unauthorized"}',
    }


def check_basic_auth(event: dict) -> dict | None:
    """Basic認証を検証する。None=成功、dict=失敗レスポンス"""
    expected_user = os.environ.get('BASIC_AUTH_USER', '')
    expected_password = os.environ.get('BASIC_AUTH_PASSWORD', '')

    if not expected_user or not expected_password:
        return _unauthorized()

    headers = event.get('headers') or {}
    auth_header = ''
    for key, value in headers.items():
        if key.lower() == 'authorization':
            auth_header = value
            break

    if not auth_header or not auth_header.startswith('Basic '):
        return _unauthorized()

    try:
        decoded = base64.b64decode(auth_header[6:]).decode('utf-8')
        provided_user, provided_password = decoded.split(':', 1)
    except Exception:
        return _unauthorized()

    user_ok = secrets.compare_digest(provided_user, expected_user)
    pass_ok = secrets.compare_digest(provided_password, expected_password)

    if not (user_ok and pass_ok):
        return _unauthorized()

    return None


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Handlers — 各エンドポイントの処理
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _handle_list(event: dict) -> dict:
    """GET /list — ドキュメント一覧取得"""
    try:
        repo = S3DocumentRepository()
        documents = repo.get_document_list()
        return ok_json(documents)
    except Exception as e:
        print(f'ERROR list_documents: {e}')
        return error_json('サーバーエラーが発生しました', 500)


def _handle_get_file(event: dict) -> dict:
    """GET /file?path=xxx — ドキュメント内容取得"""
    params = event.get('queryStringParameters') or {}
    path = params.get('path', '')

    if not path:
        return error_json('path パラメータは必須です', 400)

    if not path.startswith('uploads/') or '..' in path:
        return error_json('不正なパスです', 400)

    try:
        repo = S3DocumentRepository()
        content = repo.get_file_content(path)
        return ok_text(content)
    except ClientError as e:
        if e.response['Error']['Code'] == 'NoSuchKey':
            return error_json('ファイルが見つかりません', 404)
        print(f'ERROR get_file: {e}')
        return error_json('サーバーエラーが発生しました', 500)
    except Exception as e:
        print(f'ERROR get_file: {e}')
        return error_json('サーバーエラーが発生しました', 500)


def _get_content_type(event: dict) -> str:
    headers = event.get('headers') or {}
    for key, value in headers.items():
        if key.lower() == 'content-type':
            return value
    return ''


def _parse_multipart(event: dict) -> tuple[bytes, str, str, str, str, str, str, str]:
    content_type = _get_content_type(event)
    body_raw = event.get('body', '') or ''
    is_base64 = event.get('isBase64Encoded', False)
    raw_bytes = base64.b64decode(body_raw) if is_base64 else body_raw.encode('utf-8')

    environ = {
        'REQUEST_METHOD': 'POST',
        'CONTENT_TYPE': content_type,
        'CONTENT_LENGTH': str(len(raw_bytes)),
    }
    form = cgi.FieldStorage(
        fp=io.BytesIO(raw_bytes),
        environ=environ,
        keep_blank_values=True,
    )

    file_item = form['file']
    filename = file_item.filename or ''
    file_body = file_item.file.read()
    title = form.getvalue('title', '')
    category = form.getvalue('category', '')
    tags_str = form.getvalue('tags', '')
    format_ = form.getvalue('format', 'markdown')
    user = form.getvalue('user', '')
    edit_password = form.getvalue('editPassword', '')
    return file_body, filename, title, category, tags_str, format_, user, edit_password


def _handle_upload(event: dict) -> dict:
    """POST /upload — ドキュメントアップロード"""
    try:
        file_body, filename, title, category, tags_str, format_, user, edit_password = _parse_multipart(event)
    except (KeyError, TypeError) as e:
        return error_json(f'リクエスト解析エラー: {e}', 400)

    try:
        validate_upload_input(
            filename=filename,
            title=title.strip(),
            category=category.strip(),
            format_=format_,
            file_size=len(file_body),
        )
    except ValidationError as e:
        return error_json(str(e), 400)

    try:
        repo = S3DocumentRepository()
        s3_key = build_s3_key(filename)

        repo.put_file(s3_key, file_body)

        last_modified = now_iso8601()
        tags = parse_tags(tags_str)
        new_meta = DocumentMeta(
            path=s3_key,
            title=title.strip(),
            category=category.strip(),
            tags=tags,
            lastModified=last_modified,
            format=format_,
            user=user.strip(),
            editPassword=edit_password,
        )
        documents = repo.get_document_list()
        documents.append(new_meta.to_dict())
        repo.save_document_list(documents)

        return ok_json(
            {
                'message': 'Uploaded successfully',
                'path': s3_key,
                'meta': new_meta.to_dict(),
            },
            status=201,
        )

    except Exception as e:
        print(f'ERROR upload_document: {e}')
        return error_json('サーバーエラーが発生しました', 500)


def _handle_update(event: dict) -> dict:
    """PUT /update — ドキュメント更新"""
    try:
        body_raw = event.get('body', '') or ''
        body = json.loads(body_raw)
    except (json.JSONDecodeError, TypeError) as e:
        return error_json(f'リクエスト解析エラー: {e}', 400)

    path          = body.get('path', '').strip()
    title         = body.get('title', '').strip()
    category      = body.get('category', '').strip()
    tags_str      = body.get('tags', '')
    format_       = body.get('format', 'markdown')
    user          = body.get('user', '').strip()
    content       = body.get('content', '')
    edit_password = body.get('editPassword', '')

    if not path:
        return error_json('path は必須です', 400)
    if not title:
        return error_json('タイトルは必須です', 400)
    if not category:
        return error_json('分類は必須です', 400)
    if format_ not in ALLOWED_FORMATS:
        return error_json(f'format は {list(ALLOWED_FORMATS)} のいずれかを指定してください', 400)

    try:
        repo = S3DocumentRepository()

        documents = repo.get_document_list()
        target_index = None
        stored_password = ''
        for i, doc in enumerate(documents):
            if doc.get('path') == path:
                target_index = i
                stored_password = doc.get('editPassword', '')
                if stored_password and edit_password != stored_password:
                    return error_json('編集パスワードが正しくありません', 403)
                break
        if target_index is None:
            return error_json('ドキュメントが見つかりません', 404)

        repo.put_file(path, content.encode('utf-8'))

        last_modified = now_iso8601()
        tags = parse_tags(tags_str)
        updated_meta = DocumentMeta(
            path=path,
            title=title,
            category=category,
            tags=tags,
            lastModified=last_modified,
            format=format_,
            user=user,
            editPassword=stored_password,
        )
        documents[target_index] = updated_meta.to_dict()
        repo.save_document_list(documents)

        return ok_json({
            'message': 'Updated successfully',
            'meta': updated_meta.to_dict(),
        })

    except Exception as e:
        print(f'ERROR update_document: {e}')
        return error_json('サーバーエラーが発生しました', 500)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# エントリポイント — ルーティング
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# (method, path_suffix) → handler のルーティングテーブル
_ROUTES: dict[tuple[str, str], callable] = {
    ('GET',  '/list'):   _handle_list,
    ('GET',  '/file'):   _handle_get_file,
    ('POST', '/upload'): _handle_upload,
    ('PUT',  '/update'): _handle_update,
}


def lambda_handler(event: dict, context) -> dict:
    method = event.get('httpMethod', '')
    path   = event.get('path', '')

    if method == 'OPTIONS':
        return preflight()

    # 認証チェック（プリフライト以外すべてに適用）
    auth_error = check_basic_auth(event)
    if auth_error:
        return auth_error

    handler = _ROUTES.get((method, path))
    if handler is None:
        return error_json('Not Found', 404)

    return handler(event)
