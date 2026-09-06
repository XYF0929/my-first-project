"""
工作台统一配置
"""
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE_DIR)

# 数据库
DATABASE_PATH = os.path.join(PROJECT_DIR, "data", "workbench.db")
PAYROLL_DB_PATH = os.path.join(PROJECT_DIR, "data", "payroll.db")

# JWT 密钥（生产环境需更换）
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "workbench-secret-change-in-production")

# 上传文件目录
UPLOAD_DIR = os.path.join(PROJECT_DIR, "data", "uploads")
OUTPUT_DIR = os.path.join(PROJECT_DIR, "data", "outputs")

# 发票模板
INVOICE_TEMPLATE = os.path.join(PROJECT_DIR, "templates", "Commercial_Invoice0.numbers")

# Flask
DEBUG = os.environ.get("DEBUG", "false").lower() == "true"
HOST = "0.0.0.0"
PORT = 8080
