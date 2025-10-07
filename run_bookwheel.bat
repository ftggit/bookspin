@echo off
REM Change to the project folder
cd /d C:\storage\py\BookWheel

REM Activate the virtualenv
call .\.venv\Scripts\activate.bat

REM Optional: open the app once the server starts
start "" http://127.0.0.1:5000

REM Launch Flask (Ctrl+C to stop when the console window is in focus)
python -m flask --app app run
