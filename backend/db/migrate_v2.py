import os
import shutil
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "paperpilot.db"
BACKUP_PATH = Path(__file__).resolve().parent.parent / "paperpilot.db.backup"


def backup_database():
    """Creates a safety backup of the database before migration."""
    if DB_PATH.exists():
        print(f"Creating backup: {DB_PATH} -> {BACKUP_PATH}")
        shutil.copy2(DB_PATH, BACKUP_PATH)
        print("Backup created successfully.")
    else:
        print(f"Database file {DB_PATH} does not exist yet. No backup needed.")


def run_migration():
    """Migrates SQLite database to support users and paper ownership."""
    backup_database()

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        # 1. Create users table
        print("Creating users table if not exists...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                firebase_uid TEXT UNIQUE NOT NULL,
                name TEXT,
                email TEXT,
                profile_picture TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);")

        # 2. Check papers table columns
        cursor.execute("PRAGMA table_info(papers)")
        columns = [row["name"] for row in cursor.fetchall()]
        print("Current papers columns:", columns)

        if "user_id" not in columns:
            print("Adding user_id column to papers...")
            cursor.execute("ALTER TABLE papers ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_papers_user_id ON papers(user_id);")

        if "is_demo" not in columns:
            print("Adding is_demo column to papers...")
            cursor.execute("ALTER TABLE papers ADD COLUMN is_demo INTEGER DEFAULT 0;")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_papers_is_demo ON papers(is_demo);")

        # 3. Mark existing papers as demo/benchmark papers (is_demo = 1, user_id = NULL)
        cursor.execute("UPDATE papers SET is_demo = 1 WHERE user_id IS NULL;")
        updated_count = cursor.rowcount
        print(f"Designated {updated_count} existing papers as benchmark/demo papers (is_demo=1).")

        conn.commit()

        # 4. Verify data integrity
        cursor.execute("SELECT COUNT(*) FROM papers")
        paper_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM paper_sections")
        section_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM papers WHERE is_demo = 1")
        demo_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]

        print("--- Migration Verification ---")
        print(f"Total Papers: {paper_count}")
        print(f"Demo/Benchmark Papers: {demo_count}")
        print(f"Total Sections: {section_count}")
        print(f"Total Users: {user_count}")
        print("Database migration completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"Migration error: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    run_migration()
