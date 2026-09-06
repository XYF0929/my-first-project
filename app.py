"""
工作台主应用 — Flask 统一入口
"""

import os, sys

# 确保 backend 目录在 path 中
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from datetime import timedelta
from config import JWT_SECRET_KEY, DEBUG, HOST, PORT, UPLOAD_DIR, OUTPUT_DIR

# 注册蓝图
from auth import auth_bp
from invoice.routes import invoice_bp
from salary.routes import salary_bp
from orders.routes import orders_bp


def create_app():
    app = Flask(
        __name__,
        static_folder="../frontend",
        static_url_path="",
        template_folder="../frontend",
    )

    # 配置
    app.config["JWT_SECRET_KEY"] = JWT_SECRET_KEY
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24)  # token 24小时有效
    CORS(app, supports_credentials=True)
    JWTManager(app)

    # 注册蓝图
    app.register_blueprint(auth_bp)
    app.register_blueprint(invoice_bp)
    app.register_blueprint(salary_bp)
    app.register_blueprint(orders_bp)

    # 确保上传/输出目录存在
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # ==================== 页面路由 ====================

    @app.route("/")
    def index():
        """首页 → 登录页"""
        return send_from_directory(app.static_folder, "login.html")

    @app.route("/dashboard")
    def dashboard():
        """工作台仪表盘"""
        return send_from_directory(app.static_folder, "dashboard.html")

    @app.route("/invoice")
    def invoice_page():
        """发票生成页"""
        return send_from_directory(app.static_folder, "invoice.html")

    @app.route("/salary")
    def salary_page():
        """工资管理页"""
        return send_from_directory(app.static_folder, "salary.html")

    @app.route("/orders")
    def orders_page():
        """采购订单页"""
        return send_from_directory(app.static_folder, "orders.html")

    @app.route("/api/health")
    def health():
        return {"status": "ok", "service": "WorkBench v1.0"}

    return app


if __name__ == "__main__":
    from models import init_db
    init_db()
    app = create_app()
    print("=" * 50)
    print("  公司工作台  v1.0")
    print(f"  访问地址: http://localhost:{PORT}")
    print(f"  默认账号: admin / admin123")
    print("=" * 50)
    app.run(host=HOST, port=PORT, debug=DEBUG)
