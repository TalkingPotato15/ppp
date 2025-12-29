"""DocumentRelationship model for tracking similar documents."""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, Float, ForeignKey, String, Enum
from sqlalchemy.orm import Mapped, mapped_column

from src.models import RelationshipType
from src.storage import Base


class DocumentRelationship(Base):
    """Represents a relationship between two similar documents."""

    __tablename__ = "document_relationships"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    source_document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("document_summaries.id"), nullable=False, index=True
    )
    target_document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("document_summaries.id"), nullable=False, index=True
    )
    relationship_type: Mapped[RelationshipType] = mapped_column(
        Enum(RelationshipType), nullable=False, default=RelationshipType.SIMILAR_TOPIC
    )
    similarity_score: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )

    def __repr__(self) -> str:
        return (
            f"<DocumentRelationship(source={self.source_document_id[:8]}, "
            f"target={self.target_document_id[:8]}, score={self.similarity_score:.2f})>"
        )
