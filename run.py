"""
LightSync v2 — Standalone Desktop Application Launcher
Runs the Python Core (FastAPI, MIDI, SQLite, M5Stack Serial) and presents
the Material Design React UI embedded in a hardware-accelerated PyQt6 WebEngine window.
"""

import sys
import os
import time
import threading
import argparse
import webbrowser
from pathlib import Path

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR / "backend"))

import uvicorn
from app.core.config import settings

def run_server():
    """Runs FastAPI backend on 127.0.0.1:8765."""
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        log_level="warning",
        workers=1
    )

def main():
    parser = argparse.ArgumentParser(description="LightSync v2 Desktop Application Launcher")
    parser.add_argument("--dev", action="store_true", help="Connect to Vite dev server (http://localhost:5173)")
    parser.add_argument("--browser", action="store_true", help="Open in external browser instead of native desktop window")
    args = parser.parse_args()

    # 1. Start Python Core backend in background thread
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    print(f"[*] LightSync v2 Core started on http://{settings.HOST}:{settings.PORT}")

    time.sleep(1.0) # Allow server to bind

    target_url = "http://localhost:5173" if args.dev else f"http://{settings.HOST}:{settings.PORT}/"

    # 2. Open in browser mode if requested
    if args.browser:
        print(f"[*] Opening LightSync in browser: {target_url}")
        webbrowser.open(target_url)
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n[*] Exiting LightSync.")
            sys.exit(0)

    # 3. Launch native PyQt6-WebEngine window
    try:
        from PyQt6.QtCore import QUrl, Qt
        from PyQt6.QtWidgets import QApplication, QMainWindow
        from PyQt6.QtWebEngineWidgets import QWebEngineView
        from PyQt6.QtWebEngineCore import QWebEngineSettings

        # Stable hardware-accelerated GPU flags for PyQt6 WebEngine
        os.environ["QTWEBENGINE_CHROMIUM_FLAGS"] = (
            "--enable-gpu-rasterization "
            "--enable-accelerated-2d-canvas "
            "--disable-software-rasterizer "
            "--disable-backgrounding-occluded-windows"
        )

        app = QApplication(sys.argv)
        app.setApplicationName(settings.APP_NAME)

        window = QMainWindow()
        window.setWindowTitle(f"{settings.APP_NAME} — Music Interaction Platform")
        window.resize(1440, 920)

        # Center on screen
        screen = app.primaryScreen()
        if screen:
            geo = screen.availableGeometry()
            x = (geo.width() - 1440) // 2
            y = (geo.height() - 920) // 2
            window.move(max(0, x), max(0, y))

        view = QWebEngineView()
        
        # Explicitly enable hardware accelerated rendering and animation settings
        web_settings = view.settings()
        web_settings.setAttribute(QWebEngineSettings.WebAttribute.Accelerated2dCanvasEnabled, True)
        web_settings.setAttribute(QWebEngineSettings.WebAttribute.WebGLEnabled, True)
        web_settings.setAttribute(QWebEngineSettings.WebAttribute.ScrollAnimatorEnabled, True)
        web_settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessRemoteUrls, True)
        web_settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessFileUrls, True)

        view.load(QUrl(target_url))
        window.setCentralWidget(view)
        window.show()

        print(f"[*] Desktop Window launched: {target_url}")
        sys.exit(app.exec())

    except ImportError as e:
        print(f"[!] PyQt6-WebEngine not found ({e}). Falling back to default browser.")
        webbrowser.open(target_url)
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n[*] Exiting LightSync.")
            sys.exit(0)

if __name__ == "__main__":
    main()
