"""GET /list — ドキュメント一覧取得 Lambda ハンドラー"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../'))

from shared.auth import check_basic_auth
from shared.s3_client import S3DocumentRepository
from shared.response import ok_json, error_json, preflight


def lambda_handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return preflight()

    auth_error = check_basic_auth(event)
    if auth_error:
        return auth_error

    try:
        repo = S3DocumentRepository()
        documents = repo.get_document_list()
        return ok_json(documents)
    except Exception as e:
        print(f'ERROR list_documents: {e}')
        return error_json('サーバーエラーが発生しました', 500)
