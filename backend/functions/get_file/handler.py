"""GET /file?path=xxx — ドキュメント内容取得 Lambda ハンドラー"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../'))

from botocore.exceptions import ClientError

from shared.auth import check_basic_auth
from shared.s3_client import S3DocumentRepository
from shared.response import ok_text, error_json, preflight


def lambda_handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return preflight()

    auth_error = check_basic_auth(event)
    if auth_error:
        return auth_error

    params = event.get('queryStringParameters') or {}
    path = params.get('path', '')

    if not path:
        return error_json('path パラメータは必須です', 400)

    # パストラバーサル防止: uploads/ プレフィックス必須、.. 不可
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
