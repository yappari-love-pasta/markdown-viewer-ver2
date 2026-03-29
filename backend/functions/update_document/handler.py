"""PUT /update — ドキュメント更新 Lambda ハンドラー"""

import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../'))

from shared.auth import check_basic_auth
from shared.s3_client import S3DocumentRepository
from shared.models import (
    DocumentMeta,
    ALLOWED_FORMATS,
    now_iso8601,
    parse_tags,
)
from shared.response import error_json, ok_json, preflight


def lambda_handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return preflight()

    auth_error = check_basic_auth(event)
    if auth_error:
        return auth_error

    # JSON body 解析
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

    # バリデーション
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

        # list.json を取得してパスワード検証 + 更新対象を確認
        documents = repo.get_document_list()
        target_index = None
        for i, doc in enumerate(documents):
            if doc.get('path') == path:
                target_index = i
                stored_password = doc.get('editPassword', '')
                if stored_password and edit_password != stored_password:
                    return error_json('編集パスワードが正しくありません', 403)
                break
        if target_index is None:
            return error_json('ドキュメントが見つかりません', 404)

        # 1. ファイル本体を S3 に上書き保存
        repo.put_file(path, content.encode('utf-8'))

        # 2. list.json のメタデータを更新（editPassword は既存の値を引き継ぐ）
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
