import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from verify_backend import app

app = app