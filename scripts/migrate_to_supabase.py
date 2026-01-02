#!/usr/bin/env python3
"""
SQLite to Supabase Migration Script

Migrates data from the local SQLite database to Supabase PostgreSQL.
Optionally generates vector embeddings for document_summaries.

Usage:
    python scripts/migrate_to_supabase.py [--with-embeddings] [--dry-run]

Environment variables required:
    SUPABASE_URL - Supabase project URL
    SUPABASE_SERVICE_ROLE_KEY - Supabase service role key
    OPENAI_API_KEY - OpenAI API key (only if --with-embeddings)
"""

import sys
from pathlib import Path

# Fix for local 'supabase' directory conflict with the supabase package
# The project has a 'supabase/' folder for SQL schema which conflicts with the package
# Remove the project root from sys.path before importing
_project_root = Path(__file__).parent.parent.resolve()
sys.path = [p for p in sys.path if p and Path(p).resolve() != _project_root]
# Also remove empty string (current directory) if we're in the project root
if "" in sys.path and Path.cwd().resolve() == _project_root:
    sys.path.remove("")

import argparse
import json
import os
import sqlite3
from datetime import datetime
from typing import Any

try:
    from supabase import create_client, Client
except ImportError:
    print("Error: supabase package not installed.")
    print("Run: uv pip install supabase openai python-dotenv")
    sys.exit(1)


# Configuration
SQLITE_PATH = Path(__file__).parent.parent / "data" / "app.db"

# Tables in migration order (respecting foreign key dependencies)
MIGRATION_ORDER = [
    "users",
    "refresh_tokens",
    "document_summaries",
    "document_relationships",
    "collection_jobs",
    "raw_posts",
    "generation_sessions",
    "generated_ideas",
    "saved_ideas",
]


def get_supabase_client() -> Client:
    """Create and return Supabase client."""
    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        print("Error: Environment variables not set.")
        print("Required: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY")
        print("\nYou can source the frontend .env.local file:")
        print("  export $(grep -v '^#' frontend/.env.local | xargs)")
        sys.exit(1)

    return create_client(url, key)


def get_sqlite_connection() -> sqlite3.Connection:
    """Create and return SQLite connection."""
    if not SQLITE_PATH.exists():
        print(f"Error: SQLite database not found at {SQLITE_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(str(SQLITE_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def parse_json_field(value: str | None) -> Any:
    """Parse JSON string field."""
    if value is None:
        return None
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return value


def parse_datetime(value: str | None) -> str | None:
    """Parse datetime string to ISO format."""
    if value is None:
        return None
    try:
        # SQLite datetime format
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return dt.isoformat()
    except (ValueError, AttributeError):
        return value


def transform_row(table: str, row: sqlite3.Row) -> dict:
    """Transform SQLite row to Supabase-compatible dict."""
    data = dict(row)

    # Handle JSON fields
    json_fields = {
        "document_summaries": ["keywords"],
        "generation_sessions": ["rag_context"],
        "generated_ideas": ["differentiators", "market_signals"],
    }

    for field in json_fields.get(table, []):
        if field in data:
            data[field] = parse_json_field(data[field])

    # Handle datetime fields
    datetime_fields = [
        "created_at", "posted_at", "completed_at", "last_login_at",
        "expires_at", "saved_at", "scraped_at", "target_start", "target_end"
    ]

    for field in datetime_fields:
        if field in data:
            data[field] = parse_datetime(data[field])

    # Handle boolean fields (SQLite stores as 0/1)
    bool_fields = ["is_active", "is_revoked", "is_bookmarked"]
    for field in bool_fields:
        if field in data:
            data[field] = bool(data[field])

    return data


def count_rows(conn: sqlite3.Connection, table: str) -> int:
    """Count rows in a table."""
    cursor = conn.execute(f"SELECT COUNT(*) FROM {table}")
    return cursor.fetchone()[0]


def fetch_all_rows(conn: sqlite3.Connection, table: str) -> list[dict]:
    """Fetch all rows from a table."""
    cursor = conn.execute(f"SELECT * FROM {table}")
    rows = cursor.fetchall()
    return [transform_row(table, row) for row in rows]


def migrate_table(
    supabase: Client,
    conn: sqlite3.Connection,
    table: str,
    dry_run: bool = False
) -> tuple[int, int]:
    """
    Migrate a single table from SQLite to Supabase.

    Returns:
        Tuple of (success_count, error_count)
    """
    rows = fetch_all_rows(conn, table)

    if not rows:
        return 0, 0

    if dry_run:
        print(f"  [DRY RUN] Would insert {len(rows)} rows")
        return len(rows), 0

    success = 0
    errors = 0
    batch_size = 100

    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        try:
            result = supabase.table(table).upsert(batch).execute()
            success += len(batch)
        except Exception as e:
            print(f"  Error inserting batch: {e}")
            # Try inserting one by one
            for row in batch:
                try:
                    supabase.table(table).upsert(row).execute()
                    success += 1
                except Exception as e2:
                    print(f"    Failed to insert row {row.get('id', 'unknown')}: {e2}")
                    errors += 1

    return success, errors


def generate_embeddings(supabase: Client, dry_run: bool = False) -> int:
    """Generate embeddings for document_summaries without embeddings."""
    try:
        import openai
    except ImportError:
        print("Error: openai package not installed. Run: pip install openai")
        return 0

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY must be set for embedding generation")
        return 0

    client = openai.OpenAI(api_key=api_key)

    # Fetch documents without embeddings
    result = supabase.table("document_summaries").select("id, title, keywords").is_("embedding", "null").execute()
    documents = result.data

    if not documents:
        print("  No documents need embeddings")
        return 0

    print(f"  Generating embeddings for {len(documents)} documents...")

    if dry_run:
        print(f"  [DRY RUN] Would generate {len(documents)} embeddings")
        return len(documents)

    count = 0
    for doc in documents:
        try:
            # Create text for embedding
            keywords = doc.get("keywords", [])
            if isinstance(keywords, str):
                keywords = json.loads(keywords)
            keywords_text = " ".join(keywords[:5]) if keywords else ""
            text = f"{doc['title']} {keywords_text}"[:8000]

            # Generate embedding
            response = client.embeddings.create(
                model="text-embedding-3-small",
                input=text,
            )
            embedding = response.data[0].embedding

            # Update document
            supabase.table("document_summaries").update(
                {"embedding": embedding}
            ).eq("id", doc["id"]).execute()

            count += 1
            if count % 10 == 0:
                print(f"    Generated {count}/{len(documents)} embeddings")

        except Exception as e:
            print(f"    Failed to generate embedding for {doc['id']}: {e}")

    return count


def main():
    parser = argparse.ArgumentParser(
        description="Migrate SQLite database to Supabase"
    )
    parser.add_argument(
        "--with-embeddings",
        action="store_true",
        help="Generate vector embeddings for document_summaries"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be migrated without making changes"
    )
    parser.add_argument(
        "--tables",
        nargs="+",
        choices=MIGRATION_ORDER,
        help="Migrate only specific tables"
    )
    args = parser.parse_args()

    print("=" * 60)
    print("SQLite to Supabase Migration")
    print("=" * 60)

    if args.dry_run:
        print("\n[DRY RUN MODE - No changes will be made]\n")

    # Connect to databases
    print("\nConnecting to databases...")
    supabase = get_supabase_client()
    conn = get_sqlite_connection()
    print(f"  SQLite: {SQLITE_PATH}")
    print(f"  Supabase: Connected")

    # Determine tables to migrate
    tables = args.tables if args.tables else MIGRATION_ORDER

    # Show table counts
    print("\nSource data summary:")
    for table in tables:
        try:
            count = count_rows(conn, table)
            print(f"  {table}: {count} rows")
        except sqlite3.OperationalError:
            print(f"  {table}: (table not found)")

    # Migrate tables
    print("\nMigrating tables...")
    total_success = 0
    total_errors = 0

    for table in tables:
        print(f"\n  [{table}]")
        try:
            count = count_rows(conn, table)
            if count == 0:
                print(f"    Skipping (no data)")
                continue

            success, errors = migrate_table(supabase, conn, table, args.dry_run)
            total_success += success
            total_errors += errors

            if not args.dry_run:
                print(f"    Migrated {success} rows" + (f", {errors} errors" if errors else ""))

        except sqlite3.OperationalError as e:
            print(f"    Skipping (table not found: {e})")

    # Generate embeddings if requested
    if args.with_embeddings:
        print("\nGenerating embeddings...")
        embed_count = generate_embeddings(supabase, args.dry_run)
        print(f"  Generated {embed_count} embeddings")

    # Summary
    print("\n" + "=" * 60)
    print("Migration Summary")
    print("=" * 60)
    print(f"  Total rows migrated: {total_success}")
    if total_errors:
        print(f"  Total errors: {total_errors}")
    if args.dry_run:
        print("\n  [DRY RUN - No changes were made]")
    else:
        print("\n  Migration complete!")

    conn.close()


if __name__ == "__main__":
    main()
