
import sqlite3
import os

db_path = r'c:\Project\TEMP\Beats\backend\music.db'
output_path = r'c:\Project\TEMP\Beats\backend\db_schema.txt'

if not os.path.exists(db_path):
    with open(output_path, 'w') as f:
        f.write(f"File not found: {db_path}")
    exit()

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    with open(output_path, 'w', encoding='utf-8') as f:
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        f.write(f"Tables found: {tables}\n")
        
        for table in tables:
            table_name = table[0]
            f.write(f"\n--- Schema for {table_name} ---\n")
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = cursor.fetchall()
            for col in columns:
                f.write(f"{col}\n")
                
            f.write(f"\n--- First 5 rows of {table_name} ---\n")
            cursor.execute(f"SELECT * FROM {table_name} LIMIT 5")
            rows = cursor.fetchall()
            for row in rows:
                f.write(f"{row}\n")
                
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = cursor.fetchone()[0]
            f.write(f"Total rows in {table_name}: {count}\n")

    conn.close()

except Exception as e:
    with open(output_path, 'w') as f:
        f.write(f"Error: {e}")
