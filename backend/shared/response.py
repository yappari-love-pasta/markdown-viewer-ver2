"""CORS 対応の統一レスポンスビルダー"""

import json
import os

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
    """OPTIONS プリフライトリクエスト用レスポンス"""
    return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}
