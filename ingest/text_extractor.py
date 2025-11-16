from __future__ import annotations

import os
from typing import Tuple, Dict, Any


def _extract_txt_md(path: str) -> Tuple[str, Dict[str, Any]]:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        text = f.read()
    page_map = {"pages": [{"page_number": 1, "start": 0, "end": len(text)}]}
    return text, page_map


def _extract_pdf(path: str) -> Tuple[str, Dict[str, Any]]:
    from pypdf import PdfReader  # lazy import

    reader = PdfReader(path)
    texts = []
    page_map_pages = []
    cursor = 0
    for i, page in enumerate(reader.pages, start=1):
        t = page.extract_text() or ""
        texts.append(t)
        start = cursor
        cursor += len(t)
        page_map_pages.append({"page_number": i, "start": start, "end": cursor})
    return "".join(texts), {"pages": page_map_pages}


def _extract_docx(path: str) -> Tuple[str, Dict[str, Any]]:
    import docx  # python-docx

    document = docx.Document(path)
    paras = [p.text for p in document.paragraphs]
    text = "\n".join(paras)
    page_map = {"pages": [{"page_number": 1, "start": 0, "end": len(text)}]}
    return text, page_map


def extract_text(path: str) -> Tuple[str, Dict[str, Any]]:
    """
    Extract text from TXT/MD/PDF/DOCX.
    Returns (text, page_map). PDF har per-sida mapping, övriga 1 sida.
    """
    ext = os.path.splitext(path)[1].lower()
    if ext in (".txt", ".md"):
        return _extract_txt_md(path)
    if ext == ".pdf":
        return _extract_pdf(path)
    if ext == ".docx":
        return _extract_docx(path)
    raise ValueError(f"Unsupported file type: {ext}")

