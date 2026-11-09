# Accessing and Viewing the Database via MySQL CLI

This guide provides step-by-step instructions for connecting to, inspecting, and managing the **ChessLogs** MySQL database using the MySQL Command-Line Interface (`mysql` CLI) on Windows (XAMPP / standalone MySQL / MariaDB).

---

## 1. Locating the MySQL CLI

If you are using **XAMPP**, the MySQL CLI executable is located at:
```text
C:\xampp\mysql\bin\mysql.exe
```

### Option A: Run Directly via Full Path (No Setup Needed)

#### In PowerShell:
```powershell
& "C:\xampp\mysql\bin\mysql.exe" -u root
```

#### In Command Prompt (CMD):
```cmd
"C:\xampp\mysql\bin\mysql.exe" -u root
```

---

### Option B: Add MySQL to Your System PATH (Recommended)

Adding MySQL to your PATH allows you to type `mysql` directly from any terminal window:

1. Press `Win + R`, type `sysdm.cpl`, and press **Enter**.
2. Go to the **Advanced** tab and click **Environment Variables**.
3. Under **System variables**, select `Path` and click **Edit**.
4. Click **New** and add:
   ```text
   C:\xampp\mysql\bin
   ```
5. Click **OK** on all dialogs, then restart your terminal (PowerShell / Command Prompt).
6. Verify by running:
   ```powershell
   mysql --version
   ```

---

## 2. Connecting to the Database

Before connecting, ensure MySQL is running in your **XAMPP Control Panel** (the MySQL module should show green/running).

### Standard Connection (Default XAMPP - No Password):
```bash
mysql -u root
```

### Connection with Password Prompt:
```bash
mysql -u root -p
```
*(Press Enter when prompted if no password is set)*

### Connect Directly to the `chesslogs` Database:
```bash
mysql -u root chesslogs
```

### Connect Explicitly to Host and Port:
```bash
mysql -h 127.0.0.1 -P 3306 -u root chesslogs
```

---

## 3. Basic Database Navigation

Once inside the MySQL CLI prompt (`mysql>`), run the following commands:

### Show All Databases
```sql
SHOW DATABASES;
```

### Switch to the ChessLogs Database
```sql
USE chesslogs;
```

### Show All Tables
```sql
SHOW TABLES;
```

You should see the 9 ChessLogs tables:
- `profiles`
- `courses`
- `course_chapters`
- `course_assignments`
- `games`
- `game_reviews`
- `coach_credentials`
- `student_requirements`
- `student_coach_enrollments`

### Inspect Table Structures & Columns
```sql
DESCRIBE profiles;
DESCRIBE courses;
DESCRIBE course_chapters;
DESCRIBE course_assignments;
DESCRIBE games;
DESCRIBE game_reviews;
```

To see indexes, primary keys, and foreign key definitions:
```sql
SHOW CREATE TABLE courses\G
```

---

## 4. Querying & Viewing Data

### View All Users, Admins, and Students
```sql
SELECT id, email, display_name, role, chesscom_username, current_elo, created_at 
FROM profiles;
```

### View Filtered by Role (e.g. Only Students or Only Admins)
```sql
SELECT id, email, display_name, chesscom_username 
FROM profiles 
WHERE role = 'student';
```

### View Courses
```sql
SELECT id, title, type, orientation, trained_side, min_elo, max_elo, is_published, created_at 
FROM courses;
```

### View Course Chapters for a Specific Course
```sql
SELECT id, course_id, order_index, title, orientation, trained_side 
FROM course_chapters 
ORDER BY order_index ASC;
```

### View Course Assignments & Progress
Because the `progress` column contains JSON payloads, use `\G` instead of a semicolon `;` for clear, vertical formatting:
```sql
SELECT id, course_id, student_id, status, progress 
FROM course_assignments\G
```

### Pretty-Print JSON Progress
If your MySQL version supports JSON functions:
```sql
SELECT id, student_id, JSON_PRETTY(progress) 
FROM course_assignments\G
```

### View Chess Games
```sql
SELECT id, student_id, white_username, black_username, result, time_class, eco, opening, played_at 
FROM games 
ORDER BY played_at DESC 
LIMIT 10;
```

### View Stockfish Game Reviews with Accuracy
```sql
SELECT id, game_id, engine_version, accuracy_white, accuracy_black, created_at 
FROM game_reviews\G
```

---

## 5. Helpful CLI Power Features & Tips

### 1. Vertical Output (`\G`)
Tables with wide rows or JSON text can wrap awkwardly in the terminal. Replace the trailing semicolon `;` with `\G` to display each field on its own line:
```sql
SELECT * FROM profiles LIMIT 1\G
```

### 2. Run Queries Directly from the Command Line (Without Entering the Interactive Prompt)
Using the `-e` flag executes a query and returns immediately:
```powershell
& "C:\xampp\mysql\bin\mysql.exe" -u root chesslogs -e "SELECT email, display_name, role FROM profiles;"
```

### 3. Run or Re-run SQL Script Files
To run a migration or schema file directly from within the MySQL CLI prompt:
```sql
SOURCE C:/Users/Victus/OneDrive/Documents/GitHub/ChessLogs/database/schema.sql;
```

Or from the Windows command line:
#### In Command Prompt (CMD):
```cmd
"C:\xampp\mysql\bin\mysql.exe" -u root chesslogs < database\schema.sql
```

#### In PowerShell:
```powershell
Get-Content database\schema.sql | & "C:\xampp\mysql\bin\mysql.exe" -u root chesslogs
```

### 4. Export Table or Query Output to a File
```powershell
& "C:\xampp\mysql\bin\mysql.exe" -u root chesslogs -e "SELECT * FROM profiles" > profiles_export.txt
```

### 5. Exit the MySQL CLI
```sql
EXIT;
```
*(or `QUIT;` or press `Ctrl + C`)*

---

## 6. Troubleshooting Common Issues

### Issue 1: `'mysql' is not recognized as an internal or external command`
- **Cause:** The MySQL directory has not been added to your system `PATH`.
- **Solution:** Either use the full path `& "C:\xampp\mysql\bin\mysql.exe"` or follow the steps in [Section 1, Option B](#option-b-add-mysql-to-your-system-path-recommended).

### Issue 2: `ERROR 2003 (HY000): Can't connect to MySQL server on '127.0.0.1'`
- **Cause:** The MySQL service is not running.
- **Solution:** Open the **XAMPP Control Panel** and click **Start** next to MySQL.

### Issue 3: `ERROR 1045 (28000): Access denied for user 'root'@'localhost'`
- **Cause:** A password was set on the `root` account in MySQL.
- **Solution:** Connect using the `-p` flag (`mysql -u root -p`) and enter your password.

### Issue 4: Garbled Characters or UTF-8 Issues
- **Solution:** Connect specifying the `utf8mb4` character set:
  ```bash
  mysql -u root --default-character-set=utf8mb4 chesslogs
  ```
