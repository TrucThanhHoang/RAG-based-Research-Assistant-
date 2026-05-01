from __future__ import annotations

import argparse
from pathlib import Path

import fitz
from langchain.text_splitter import RecursiveCharacterTextSplitter


CHUNK_SIZE = 1000
CHUNK_OVERLAP = 150
SUPPORTED_EXTENSIONS = {".pdf"}


def extract_text_from_pdf(pdf_path: Path) -> str:
    document = fitz.open(pdf_path)
    try:
        pages = [page.get_text("text").strip() for page in document]
    finally:
        document.close()
    return "\n\n".join(page for page in pages if page)


def collect_pdf_files(input_path: Path) -> list[Path]:
    if input_path.is_file():
        if input_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
            raise ValueError(f"Unsupported file type: {input_path}")
        return [input_path]

    if not input_path.exists():
        raise FileNotFoundError(f"Path does not exist: {input_path}")

    return sorted(
        file_path
        for file_path in input_path.rglob("*")
        if file_path.is_file() and file_path.suffix.lower() in SUPPORTED_EXTENSIONS
    )


def chunk_pdf_text(pdf_path: Path) -> list[str]:
    text = extract_text_from_pdf(pdf_path)
    if not text:
        return []

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
    )
    return splitter.split_text(text)


def build_chunks(input_path: Path) -> dict[str, list[str]]:
    pdf_files = collect_pdf_files(input_path)
    return {str(pdf_file): chunk_pdf_text(pdf_file) for pdf_file in pdf_files}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--path", required=True, help="Path to a PDF file or folder")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    input_path = Path(args.path).expanduser().resolve()
    chunk_map = build_chunks(input_path)

    for pdf_path, chunks in chunk_map.items():
        print(f"{pdf_path}: {len(chunks)} chunks")


if __name__ == "__main__":
    main()
