
import sqlite3

conn = sqlite3.connect("fraud.db")
cursor = conn.cursor()

# View transactions
cursor.execute("SELECT * FROM transactions")
for row in cursor.fetchall():
    print(row)

conn.close()
