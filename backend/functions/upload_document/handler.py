"""POST /upload — ドキュメントアップロード Lambda ハンドラー"""

import base64
import io
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../'))

import cgi

from shared.auth import check_basic_auth
from shared.s3_client import S3DocumentRepository
from shared.models import (
    DocumentMeta,
    ValidationError,
    build_s3_key,
    now_iso8601,
    parse_tags,
    validate_upload_input,
)
from shared.response import error_json, ok_json, preflight


def _get_content_type(event: dict) -> str:
    """API Gateway のヘッダーは大文字小文字が混在するため case-insensitive に取得"""
    headers = event.get('headers') or {}
    for key, value in headers.items():
        if key.lower() == 'content-type':
            return value
    return ''


def parse_multipart(event: dict) -> tuple[bytes, str, str, str, str, str, str, str]:
    """multipart/form-data を解析して (file_body, filename, title, category, tags_str, format_, user, edit_password) を返す

    Returns:
        Tuple of (file_bytes, filename, title, category, tags_str, format_, user, edit_password)

    Raises:
        KeyError: 必須フィールドが存在しない場合
    """
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


def lambda_handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return preflight()

    auth_error = check_basic_auth(event)
    if auth_error:
        return auth_error

    # multipart 解析
    try:
        file_body, filename, title, category, tags_str, format_, user, edit_password = parse_multipart(event)
    except (KeyError, TypeError) as e:
        return error_json(f'リクエスト解析エラー: {e}', 400)

    # バリデーション
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

    # S3 保存 + list.json アトミック更新
    try:
        repo = S3DocumentRepository()
        s3_key = build_s3_key(filename)

        # 1. ファイル本体を S3 に保存
        repo.put_file(s3_key, file_body)

        # 2. list.json を読み込み → 新メタデータ追加 → 上書き保存
        #    S3 の強整合性により put_file 直後のデータが即座に反映される
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
