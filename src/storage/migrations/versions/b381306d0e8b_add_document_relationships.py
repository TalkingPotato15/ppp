"""add_document_relationships

Revision ID: b381306d0e8b
Revises: f0dcfaa407c4
Create Date: 2025-12-28 23:36:52.265223

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b381306d0e8b'
down_revision: Union[str, Sequence[str], None] = 'f0dcfaa407c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'document_relationships',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('source_document_id', sa.String(length=36), nullable=False),
        sa.Column('target_document_id', sa.String(length=36), nullable=False),
        sa.Column(
            'relationship_type',
            sa.Enum('SIMILAR_TOPIC', 'SAME_DOMAIN', 'TREND_CORRELATION', name='relationshiptype'),
            nullable=False
        ),
        sa.Column('similarity_score', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['source_document_id'], ['document_summaries.id']),
        sa.ForeignKeyConstraint(['target_document_id'], ['document_summaries.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_document_relationships_source', 'document_relationships', ['source_document_id'])
    op.create_index('ix_document_relationships_target', 'document_relationships', ['target_document_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_document_relationships_target', table_name='document_relationships')
    op.drop_index('ix_document_relationships_source', table_name='document_relationships')
    op.drop_table('document_relationships')
