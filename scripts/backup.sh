#!/bin/bash
#
# Portfolio Tracker Database Backup Script
#
# Usage:
#   ./scripts/backup.sh              # Backup to default location
#   ./scripts/backup.sh /path/to    # Backup to custom location
#
# Backups are named: portfolio_YYYY-MM-DD_HHMMSS.db
#

set -e

# Configuration
DB_PATH="server/data/portfolio.db"
DEFAULT_BACKUP_DIR="backups"
KEEP_DAYS=30  # Delete backups older than this

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Change to project root
cd "$PROJECT_ROOT"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "Error: Database not found at $DB_PATH"
    echo "Make sure you're running this from the project root or the database exists."
    exit 1
fi

# Determine backup directory
BACKUP_DIR="${1:-$DEFAULT_BACKUP_DIR}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/portfolio_$TIMESTAMP.db"

# Perform backup using sqlite3's backup command for consistency
# This ensures a clean backup even if the database is in use
if command -v sqlite3 &> /dev/null; then
    echo "Creating backup using sqlite3..."
    sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"
else
    echo "sqlite3 not found, using file copy..."
    cp "$DB_PATH" "$BACKUP_FILE"
fi

# Verify backup
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "Backup created successfully:"
    echo "  Location: $BACKUP_FILE"
    echo "  Size: $BACKUP_SIZE"
else
    echo "Error: Backup failed!"
    exit 1
fi

# Clean up old backups
if [ -d "$BACKUP_DIR" ]; then
    echo ""
    echo "Cleaning up backups older than $KEEP_DAYS days..."
    DELETED=$(find "$BACKUP_DIR" -name "portfolio_*.db" -type f -mtime +$KEEP_DAYS -delete -print | wc -l)
    if [ "$DELETED" -gt 0 ]; then
        echo "  Deleted $DELETED old backup(s)"
    else
        echo "  No old backups to delete"
    fi
fi

# List recent backups
echo ""
echo "Recent backups:"
ls -lh "$BACKUP_DIR"/portfolio_*.db 2>/dev/null | tail -5 || echo "  No backups found"

echo ""
echo "Done!"
