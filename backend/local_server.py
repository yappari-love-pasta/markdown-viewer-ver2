"""
ローカル開発用サーバー (FastAPI)

Lambda ハンドラーを API Gateway イベント形式に変換してローカルで実行する。

起動方法:
    cd backend
    pip install fastapi uvicorn python-multipart
    uvicorn local_server:app --reload --port 8000

フロントエンドは vite.config.ts の proxy 設定により /api/* を
http://localhost:8000/* に転送する。
"""

import base64
import json
import os
from io import BytesIO

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse

# ローカル開発用環境変数（実際の S3 バケット名を設定すること）
os.environ.setdefault('S3_BUCKET_NAME', os.environ.get('S3_BUCKET_NAME', 'your-bucket-name'))
os.environ.setdefault('AWS_DEFAULT_REGION', 'ap-northeast-1')

from functions.list_documents.handler import lambda_handler as list_handler
from functions.get_file.handler import lambda_handler as file_handler
from functions.upload_document.handler import lambda_handler as upload_handler
from functions.update_document.handler import lambda_handler as update_handler

app = FastAPI(title='Markdown Viewer API (Local)', version='1.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)


def _lambda_response(result: dict) -> Response:
    """Lambda レスポンス辞書を FastAPI Response に変換"""
    status = result.get('statusCode', 200)
    headers = {k: v for k, v in (result.get('headers') or {}).items()}
    body = result.get('body', '')
    content_type = headers.get('Content-Type', 'application/json')

    if 'text/plain' in content_type:
        return PlainTextResponse(content=body, status_code=status, headers=headers)
    return Response(content=body, status_code=status, media_type=content_type, headers=headers)


@app.get('/list')
async def get_list(request: Request):
    event = {
        'httpMethod': 'GET',
        'queryStringParameters': dict(request.query_params),
        'headers': dict(request.headers),
        'body': '',
        'isBase64Encoded': False,
    }
    return _lambda_response(list_handler(event, {}))


@app.get('/file')
async def get_file(request: Request):
    event = {
        'httpMethod': 'GET',
        'queryStringParameters': dict(request.query_params),
        'headers': dict(request.headers),
        'body': '',
        'isBase64Encoded': False,
    }
    return _lambda_response(file_handler(event, {}))


@app.post('/upload')
async def post_upload(request: Request):
    body_bytes = await request.body()
    event = {
        'httpMethod': 'POST',
        'queryStringParameters': {},
        'headers': dict(request.headers),
        'body': base64.b64encode(body_bytes).decode('ascii'),
        'isBase64Encoded': True,
    }
    return _lambda_response(upload_handler(event, {}))


@app.put('/update')
async def put_update(request: Request):
    body_bytes = await request.body()
    event = {
        'httpMethod': 'PUT',
        'queryStringParameters': {},
        'headers': dict(request.headers),
        'body': body_bytes.decode('utf-8'),
        'isBase64Encoded': False,
    }
    return _lambda_response(update_handler(event, {}))


@app.options('/{path:path}')
async def options_handler():
    return Response(
        status_code=200,
        headers={
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    )
