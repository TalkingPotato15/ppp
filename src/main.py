"""CLI entry point for the data collection pipeline."""

import asyncio
import logging
from typing import Optional

import typer
from rich.console import Console
from rich.logging import RichHandler
from rich.table import Table

from src.config.settings import settings

# Initialize Typer app
app = typer.Typer(
    name="agent-business-builder",
    help="AI Agent Business Builder - Data Collection Pipeline",
)

console = Console()


def setup_logging(verbose: bool = False) -> None:
    """Setup logging with rich handler."""
    level = logging.DEBUG if verbose else logging.INFO

    logging.basicConfig(
        level=level,
        format="%(message)s",
        handlers=[RichHandler(console=console, rich_tracebacks=True)],
    )

    # Reduce noise from third-party libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("openai").setLevel(logging.WARNING)
    logging.getLogger("chromadb").setLevel(logging.WARNING)


@app.command("initial-load")
def initial_load(
    months: int = typer.Option(3, "--months", "-m", help="Number of months of historical data to collect"),
    max_posts: Optional[int] = typer.Option(None, "--max-posts", help="Maximum number of posts (for testing)"),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Enable verbose logging"),
) -> None:
    """Perform initial bulk data load from the target forum.

    This command scrapes historical data from the configured forum,
    filters noise, and stores valid posts in both vector and relational databases.
    """
    setup_logging(verbose)

    console.print(f"\n[bold blue]Starting Initial Data Load[/bold blue]")
    console.print(f"  Target: {settings.target_forum_url}")
    console.print(f"  Period: {months} months")
    if max_posts:
        console.print(f"  Max posts: {max_posts}")
    console.print()

    async def run():
        from src.services.pipeline import initial_load as do_initial_load
        return await do_initial_load(months=months, max_posts=max_posts)

    result = asyncio.run(run())

    if result.success:
        console.print(f"\n[bold green]Initial load completed successfully![/bold green]")
    else:
        console.print(f"\n[bold red]Initial load failed![/bold red]")
        for error in result.errors:
            console.print(f"  [red]• {error}[/red]")

    # Print statistics
    table = Table(title="Collection Statistics")
    table.add_column("Metric", style="cyan")
    table.add_column("Value", style="magenta")

    table.add_row("Job ID", result.job_id or "N/A")
    table.add_row("Posts Collected", str(result.posts_collected))
    table.add_row("Posts Processed", str(result.posts_processed))
    table.add_row("Posts Filtered", str(result.posts_filtered))

    console.print(table)


@app.command("incremental")
def incremental(
    hours: int = typer.Option(1, "--hours", "-h", help="Number of hours to look back"),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Enable verbose logging"),
) -> None:
    """Perform incremental data collection.

    This command collects new posts from the previous N hours.
    """
    setup_logging(verbose)

    console.print(f"\n[bold blue]Starting Incremental Collection[/bold blue]")
    console.print(f"  Period: Last {hours} hour(s)")
    console.print()

    async def run():
        from src.services.pipeline import incremental_collect
        return await incremental_collect(hours=hours)

    result = asyncio.run(run())

    if result.success:
        console.print(f"\n[bold green]Incremental collection completed![/bold green]")
    else:
        console.print(f"\n[bold red]Incremental collection failed![/bold red]")
        for error in result.errors:
            console.print(f"  [red]• {error}[/red]")

    # Print statistics
    table = Table(title="Collection Statistics")
    table.add_column("Metric", style="cyan")
    table.add_column("Value", style="magenta")

    table.add_row("Job ID", result.job_id or "N/A")
    table.add_row("Posts Collected", str(result.posts_collected))
    table.add_row("Posts Processed", str(result.posts_processed))
    table.add_row("Posts Filtered", str(result.posts_filtered))

    console.print(table)


@app.command("check-gaps")
def check_gaps(
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Enable verbose logging"),
) -> None:
    """Check for gaps in collection history."""
    setup_logging(verbose)

    async def run():
        from src.services.pipeline import check_gaps as do_check_gaps
        return await do_check_gaps()

    gaps = asyncio.run(run())

    if not gaps:
        console.print("[green]No gaps found in collection history.[/green]")
        return

    table = Table(title=f"Found {len(gaps)} Gaps")
    table.add_column("Start", style="cyan")
    table.add_column("End", style="cyan")
    table.add_column("Duration", style="magenta")

    for start, end in gaps:
        duration = end - start
        hours = duration.total_seconds() / 3600
        table.add_row(
            start.strftime("%Y-%m-%d %H:%M"),
            end.strftime("%Y-%m-%d %H:%M"),
            f"{hours:.1f} hours"
        )

    console.print(table)


@app.command("recover-gaps")
def recover_gaps(
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Enable verbose logging"),
) -> None:
    """Recover data for any gaps in collection history."""
    setup_logging(verbose)

    async def run():
        from src.services.pipeline import recover_gaps as do_recover_gaps
        return await do_recover_gaps()

    results = asyncio.run(run())

    if not results:
        console.print("[green]No gaps to recover.[/green]")
        return

    console.print(f"\n[bold blue]Recovered {len(results)} gaps[/bold blue]")

    for i, result in enumerate(results, 1):
        status = "[green]✓[/green]" if result.success else "[red]✗[/red]"
        console.print(f"  {status} Gap {i}: {result.posts_processed} posts processed")


@app.command("jobs")
def list_jobs(
    limit: int = typer.Option(10, "--limit", "-l", help="Number of jobs to show"),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Enable verbose logging"),
) -> None:
    """List recent collection jobs."""
    setup_logging(verbose)

    async def run():
        from src.storage import get_session
        from src.storage import rdb_store

        async with get_session() as session:
            return await rdb_store.get_recent_jobs(session, limit=limit)

    jobs = asyncio.run(run())

    if not jobs:
        console.print("[yellow]No jobs found.[/yellow]")
        return

    table = Table(title=f"Recent Collection Jobs (last {limit})")
    table.add_column("ID", style="dim")
    table.add_column("Type", style="cyan")
    table.add_column("Status", style="magenta")
    table.add_column("Collected", style="green")
    table.add_column("Processed", style="green")
    table.add_column("Filtered", style="yellow")
    table.add_column("Created", style="dim")

    for job in jobs:
        status_style = {
            "COMPLETED": "[green]COMPLETED[/green]",
            "FAILED": "[red]FAILED[/red]",
            "RUNNING": "[yellow]RUNNING[/yellow]",
            "PENDING": "[dim]PENDING[/dim]",
        }.get(job.status.value, job.status.value)

        table.add_row(
            job.id[:8] + "...",
            job.job_type.value,
            status_style,
            str(job.posts_collected or 0),
            str(job.posts_processed or 0),
            str(job.posts_filtered or 0),
            job.created_at.strftime("%Y-%m-%d %H:%M") if job.created_at else "N/A",
        )

    console.print(table)


@app.command("job")
def show_job(
    job_id: str = typer.Argument(..., help="Job ID to show"),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Enable verbose logging"),
) -> None:
    """Show details of a specific collection job."""
    setup_logging(verbose)

    async def run():
        from src.storage import get_session
        from src.storage import rdb_store

        async with get_session() as session:
            return await rdb_store.get_job_by_id(session, job_id)

    job = asyncio.run(run())

    if not job:
        console.print(f"[red]Job not found: {job_id}[/red]")
        raise typer.Exit(1)

    table = Table(title=f"Job Details: {job.id}")
    table.add_column("Field", style="cyan")
    table.add_column("Value", style="magenta")

    table.add_row("ID", job.id)
    table.add_row("Type", job.job_type.value)
    table.add_row("Status", job.status.value)
    table.add_row("Target Start", job.target_start.strftime("%Y-%m-%d %H:%M") if job.target_start else "N/A")
    table.add_row("Target End", job.target_end.strftime("%Y-%m-%d %H:%M") if job.target_end else "N/A")
    table.add_row("Started At", job.started_at.strftime("%Y-%m-%d %H:%M") if job.started_at else "N/A")
    table.add_row("Completed At", job.completed_at.strftime("%Y-%m-%d %H:%M") if job.completed_at else "N/A")
    table.add_row("Posts Collected", str(job.posts_collected or 0))
    table.add_row("Posts Processed", str(job.posts_processed or 0))
    table.add_row("Posts Filtered", str(job.posts_filtered or 0))

    if job.error_message:
        table.add_row("Error", f"[red]{job.error_message}[/red]")

    console.print(table)


@app.command("scheduler")
def run_scheduler(
    run_immediately: bool = typer.Option(False, "--now", "-n", help="Run incremental collection immediately on start"),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Enable verbose logging"),
) -> None:
    """Start the scheduler daemon for automated data collection.

    The scheduler runs incremental collection every hour and checks for
    collection gaps every 6 hours.
    """
    setup_logging(verbose)

    console.print(f"\n[bold blue]Starting Scheduler Daemon[/bold blue]")
    console.print(f"  Target: {settings.target_forum_url}")
    console.print(f"  Incremental: Every hour at :05")
    console.print(f"  Gap recovery: Every 6 hours at :30")
    if run_immediately:
        console.print(f"  [yellow]Running immediate collection[/yellow]")
    console.print()
    console.print("[dim]Press Ctrl+C to stop[/dim]\n")

    async def run():
        from src.agents.analyst.scheduler import start_scheduler
        await start_scheduler(run_immediately=run_immediately)

    asyncio.run(run())

    console.print("\n[green]Scheduler stopped.[/green]")


@app.command("stats")
def show_stats(
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Enable verbose logging"),
) -> None:
    """Show collection statistics."""
    setup_logging(verbose)

    async def run():
        from src.storage import get_session
        from src.storage import rdb_store
        from src.storage import vector_store

        async with get_session() as session:
            summary_count = await rdb_store.get_summary_count(session)

        doc_count = vector_store.get_document_count()

        return summary_count, doc_count

    summary_count, doc_count = asyncio.run(run())

    table = Table(title="Collection Statistics")
    table.add_column("Metric", style="cyan")
    table.add_column("Value", style="magenta")

    table.add_row("Documents in Vector DB", str(doc_count))
    table.add_row("Summaries in RDB", str(summary_count))

    console.print(table)


@app.command("health")
def health_check(
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Enable verbose logging"),
) -> None:
    """Check system health status."""
    setup_logging(verbose)

    async def run():
        from src.services.health import get_system_health
        return await get_system_health()

    health = asyncio.run(run())

    # Overall status
    if health.healthy:
        console.print(f"\n[bold green]System Status: HEALTHY[/bold green]")
    else:
        console.print(f"\n[bold red]System Status: UNHEALTHY[/bold red]")

    # Component details
    table = Table(title="Component Health")
    table.add_column("Component", style="cyan")
    table.add_column("Status", style="magenta")
    table.add_column("Message", style="dim")

    # Database
    db_status = "[green]OK[/green]" if health.database.healthy else "[red]FAIL[/red]"
    table.add_row("Database", db_status, health.database.message)

    # Vector Store
    vs_status = "[green]OK[/green]" if health.vector_store.healthy else "[red]FAIL[/red]"
    table.add_row("Vector Store", vs_status, health.vector_store.message)

    # Collection
    col_status = "[green]OK[/green]" if health.recent_collection.healthy else "[red]FAIL[/red]"
    table.add_row("Collection", col_status, health.recent_collection.message)

    console.print(table)

    # Exit with error code if unhealthy
    if not health.healthy:
        raise typer.Exit(1)


@app.command("relationships")
def process_relationships(
    batch_size: int = typer.Option(100, "--batch-size", "-b", help="Batch size for processing"),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Enable verbose logging"),
) -> None:
    """Process and create relationships between existing documents."""
    setup_logging(verbose)

    console.print(f"\n[bold blue]Processing Document Relationships[/bold blue]")
    console.print(f"  Batch size: {batch_size}")
    console.print()

    async def run():
        from src.services.pipeline import process_relationships_for_existing_documents
        return await process_relationships_for_existing_documents(batch_size=batch_size)

    count = asyncio.run(run())

    console.print(f"\n[bold green]Created {count} document relationships[/bold green]")


def main() -> None:
    """Main entry point."""
    app()


if __name__ == "__main__":
    main()
