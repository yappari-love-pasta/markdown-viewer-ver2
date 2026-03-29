"""Basic 認証チェック

環境変数 BASIC_AUTH_USER / BASIC_AUTH_PASSWORD が設定されていない場合は
すべてのリクエストを拒否する。
"""

import base64
import os
import secrets


def check_basic_auth(event: dict) -> dict | None:
    """Basic 認証を検証する。

    Returns:
        None          : 認証成功（呼び出し元は処理を続行する）
        dict          : 認証失敗時の 401 レスポンス辞書
    """
    expected_user = os.environ.get('BASIC_AUTH_USER', '')
    expected_password = os.environ.get('BASIC_AUTH_PASSWORD', '')

    # 環境変数が未設定または空の場合はアクセス拒否
    if not expected_user or not expected_password:
        return _unauthorized()

    # Authorization ヘッダーを case-insensitive で取得
    headers = event.get('headers') or {}
    auth_header = ''
    for key, value in headers.items():
        if key.lower() == 'authorization':
            auth_header = value
            break

    if not auth_header or not auth_header.startswith('Basic '):
        return _unauthorized()

    # Base64 デコード
    try:
        decoded = base64.b64decode(auth_header[6:]).decode('utf-8')
        provided_user, provided_password = decoded.split(':', 1)
    except Exception:
        return _unauthorized()

    # タイミング攻撃を防ぐため secrets.compare_digest で比較
    user_ok = secrets.compare_digest(provided_user, expected_user)
    pass_ok = secrets.compare_digest(provided_password, expected_password)

    if not (user_ok and pass_ok):
        return _unauthorized()

    return None  # 認証成功


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
