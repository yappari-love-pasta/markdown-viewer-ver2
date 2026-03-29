"""ドメイン層: DocumentMeta データクラスとバリデーションロジック"""

import os
import re
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal

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
    """アップロード入力のバリデーション

    Raises:
        ValidationError: バリデーション失敗時
    """
    if not filename or not filename.lower().endswith(ALLOWED_EXTENSIONS):
        raise ValidationError('ファイルは .md 形式のみ許可されています')

    if file_size > MAX_FILE_SIZE_BYTES:
        raise ValidationError('ファイルサイズは10MB以下にしてください')

    if not title or not title.strip():
        raise ValidationError('タイトルは必須です')

    if not category or not category.strip():
        raise ValidationError('分類は必須です')

    # 制御文字チェック（XSS/インジェクション防止）
    for field_name, value in [('title', title), ('category', category)]:
        if re.search(r'[\x00-\x1f\x7f]', value):
            raise ValidationError(f'{field_name} に無効な文字が含まれています')

    if format_ not in ALLOWED_FORMATS:
        raise ValidationError(
            f'format は {list(ALLOWED_FORMATS)} のいずれかを指定してください'
        )


def _uuid7_hex() -> str:
    """UUID v7 の hex 文字列を生成する (RFC 9562 / タイムスタンプ順ソート可能)

    構造 (128 bit):
      [48bit: Unixミリ秒][4bit: ver=7][12bit: rand_a][2bit: variant=10][62bit: rand_b]
    """
    ms     = int(time.time() * 1000)
    rand   = int.from_bytes(os.urandom(10), 'big')  # 80bit ランダム
    rand_a = (rand >> 68) & 0xFFF                   # 上位 12bit
    rand_b = rand & 0x3FFFFFFFFFFFFFFF               # 下位 62bit
    value  = (ms << 80) | (0x7 << 76) | (rand_a << 64) | (0b10 << 62) | rand_b
    return f'{value:032x}'


def build_s3_key(original_filename: str) -> str:  # noqa: ARG001
    """S3保存キーを生成: uploads/<uuid7>.md

    UUID v7 により時刻順ソートとファイル名衝突防止を両立する。
    """
    return f'uploads/{_uuid7_hex()}.md'


def now_iso8601() -> str:
    """現在時刻を ISO 8601 UTC 形式で返す"""
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def parse_tags(tags_str: str) -> list[str]:
    """カンマ区切りのタグ文字列をリストに変換する"""
    if not tags_str:
        return []
    return [t.strip() for t in tags_str.split(',') if t.strip()]
