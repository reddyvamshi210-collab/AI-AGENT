"""Resume RAG Tool - Ingest PDF resumes and answer questions via retrieval-augmented generation."""
import os
import io
from typing import Optional

import chromadb
from PyPDF2 import PdfReader


class ResumeRAG:
    """Handles PDF ingestion into ChromaDB and semantic Q&A over resume content."""

    COLLECTION_NAME = "resumes"

    def __init__(self, persist_dir: Optional[str] = None):
        self.persist_dir = persist_dir or os.getenv("CHROMA_PERSIST_DIR", "./data/chroma_db")
        os.makedirs(self.persist_dir, exist_ok=True)

        # ChromaDB 0.5+ uses PersistentClient
        self.chroma_client = chromadb.PersistentClient(path=self.persist_dir)
        self.collection = self.chroma_client.get_or_create_collection(
            name=self.COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )

    def ingest_pdf(self, pdf_bytes: bytes, filename: str) -> int:
        """Extract text from a PDF and index chunks into ChromaDB."""
        reader = PdfReader(io.BytesIO(pdf_bytes))
        full_text = ""
        for page in reader.pages:
            text = page.extract_text()
            if text:
                full_text += text + "\n"

        if not full_text.strip():
            raise ValueError("Could not extract text from the PDF")

        # Chunk the text (simple fixed-size chunking with overlap)
        chunks = self._chunk_text(full_text, chunk_size=500, overlap=50)

        # Clear old documents for this filename
        existing = self.collection.get(where={"source": filename})
        if existing and existing["ids"]:
            self.collection.delete(ids=existing["ids"])

        # Add chunks
        ids = [f"{filename}_{i}" for i in range(len(chunks))]
        metadatas = [{"source": filename, "chunk_index": i} for i in range(len(chunks))]

        self.collection.add(
            documents=chunks,
            ids=ids,
            metadatas=metadatas,
        )

        return len(chunks)

    def query(self, question: str, n_results: int = 3) -> str:
        """Query the resume collection and return relevant context."""
        if self.collection.count() == 0:
            return "No resume has been uploaded yet. Please upload your resume first."

        results = self.collection.query(
            query_texts=[question],
            n_results=min(n_results, self.collection.count()),
        )

        documents = results.get("documents", [[]])[0]
        if not documents:
            return "No relevant information found in the resume."

        context = "\n---\n".join(documents)
        return f"Resume context:\n{context}"

    def document_count(self) -> int:
        """Return the number of indexed chunks."""
        return self.collection.count()

    @staticmethod
    def _chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
        """Split text into overlapping chunks."""
        words = text.split()
        chunks = []
        start = 0
        while start < len(words):
            end = start + chunk_size
            chunk = " ".join(words[start:end])
            if chunk.strip():
                chunks.append(chunk)
            start = end - overlap
        return chunks
