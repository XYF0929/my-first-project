"""
工资管理模块 — API 路由
包含：
1. 原有简单工资CRUD（JWT保护）
2. 完整Payroll系统API（对应前端 api.js）
"""

import os
import json
import sqlite3
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models import User, SalaryRecord, db
from config import PAYROLL_DB_PATH

salary_bp = Blueprint("salary", __name__)


# ==================== 原有简单工资CRUD ====================

@salary_bp.route("/api/salary/list", methods=["GET"])
@jwt_required()
def list_salaries():
    """查询工资记录"""
    current_user = get_jwt()
    user_id = int(get_jwt_identity())
    role = current_user.get("role")

    year_month = request.args.get("year_month", "")
    status = request.args.get("status", "")

    try:
        db.connect(reuse_if_open=True)

        if role == "admin" or role == "finance":
            query = SalaryRecord.select()
        else:
            query = SalaryRecord.select().where(SalaryRecord.user == user_id)

        if year_month:
            query = query.where(SalaryRecord.year_month == year_month)
        if status:
            query = query.where(SalaryRecord.status == status)

        records = list(query.order_by(SalaryRecord.year_month.desc()).limit(100))
        return jsonify({
            "success": True,
            "records": [
                {
                    "id": r.id,
                    "user_name": r.user.display_name,
                    "year_month": r.year_month,
                    "base_salary": r.base_salary,
                    "bonus": r.bonus,
                    "deduction": r.deduction,
                    "social_insurance": r.social_insurance,
                    "housing_fund": r.housing_fund,
                    "tax": r.tax,
                    "net_salary": r.net_salary,
                    "status": r.status,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                }
                for r in records
            ],
        })
    finally:
        if not db.is_closed():
            db.close()


@salary_bp.route("/api/salary/create", methods=["POST"])
@jwt_required()
def create_salary():
    """创建/更新工资单（管理员或财务）"""
    current_user = get_jwt()
    if current_user.get("role") not in ("admin", "finance"):
        return jsonify({"success": False, "error": "仅管理员或财务可操作"}), 403

    data = request.get_json()
    user_id = data.get("user_id")
    year_month = data.get("year_month")

    if not user_id or not year_month:
        return jsonify({"success": False, "error": "请提供员工和月份"}), 400

    try:
        db.connect(reuse_if_open=True)
        record, created = SalaryRecord.get_or_create(
            user=user_id, year_month=year_month,
            defaults={
                "base_salary": float(data.get("base_salary", 0)),
                "bonus": float(data.get("bonus", 0)),
                "deduction": float(data.get("deduction", 0)),
                "social_insurance": float(data.get("social_insurance", 0)),
                "housing_fund": float(data.get("housing_fund", 0)),
                "tax": float(data.get("tax", 0)),
                "net_salary": float(data.get("net_salary", 0)),
                "notes": data.get("notes", ""),
            },
        )

        if not created:
            record.base_salary = float(data.get("base_salary", record.base_salary))
            record.bonus = float(data.get("bonus", record.bonus))
            record.deduction = float(data.get("deduction", record.deduction))
            record.social_insurance = float(data.get("social_insurance", record.social_insurance))
            record.housing_fund = float(data.get("housing_fund", record.housing_fund))
            record.tax = float(data.get("tax", record.tax))
            record.net_salary = float(data.get("net_salary", record.net_salary))
            record.notes = data.get("notes", record.notes)
            record.save()

        return jsonify({
            "success": True,
            "record": {
                "id": record.id,
                "user_id": record.user.id,
                "year_month": record.year_month,
                "base_salary": record.base_salary,
                "net_salary": record.net_salary,
                "status": record.status,
            },
        })
    finally:
        if not db.is_closed():
            db.close()


@salary_bp.route("/api/salary/confirm/<int:record_id>", methods=["POST"])
@jwt_required()
def confirm_salary(record_id):
    """确认工资单"""
    current_user = get_jwt()
    if current_user.get("role") not in ("admin", "finance"):
        return jsonify({"success": False, "error": "仅管理员或财务可操作"}), 403

    try:
        db.connect(reuse_if_open=True)
        record = SalaryRecord.get_by_id(record_id)
        record.status = "confirmed"
        record.confirmed_by = int(get_jwt_identity())
        record.save()
        return jsonify({"success": True, "status": record.status})
    finally:
        if not db.is_closed():
            db.close()


@salary_bp.route("/api/salary/mark_paid/<int:record_id>", methods=["POST"])
@jwt_required()
def mark_paid(record_id):
    """标记已发放"""
    current_user = get_jwt()
    if current_user.get("role") not in ("admin", "finance"):
        return jsonify({"success": False, "error": "仅管理员或财务可操作"}), 403

    from datetime import datetime

    try:
        db.connect(reuse_if_open=True)
        record = SalaryRecord.get_by_id(record_id)
        record.status = "paid"
        record.paid_at = datetime.now()
        record.save()
        return jsonify({"success": True, "status": record.status})
    finally:
        if not db.is_closed():
            db.close()


@salary_bp.route("/api/salary/users", methods=["GET"])
@jwt_required()
def list_users():
    """获取员工列表（用于创建工资时选择）"""
    try:
        db.connect(reuse_if_open=True)
        users = list(User.select().where(User.is_active == True))
        return jsonify({
            "success": True,
            "users": [
                {"id": u.id, "username": u.username, "display_name": u.display_name}
                for u in users
            ],
        })
    finally:
        if not db.is_closed():
            db.close()


# ==================== 完整 Payroll 系统 API ====================
# 对应前端 api.js，使用独立的 payroll.db (SQLite)

def _get_payroll_db():
    """获取 payroll.db 连接，自动建表"""
    conn = sqlite3.connect(PAYROLL_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS payroll_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS ss_list (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS ss_amount (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS payroll_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        month TEXT NOT NULL UNIQUE,
        data TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS auth_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_data TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")
    conn.commit()
    return conn


# --- 角色权限装饰器 ---

def _check_salary_role():
    """检查当前用户是否有工资管理权限（仅 admin/finance），返回错误响应或 None"""
    claims = get_jwt()
    if claims.get("role") not in ("admin", "finance"):
        return jsonify({"error": "无权限访问工资管理模块"}), 403
    return None


# --- 1. 当前工资单数据 ---

@salary_bp.route("/api/payroll", methods=["GET"])
@jwt_required()
def get_payroll():
    if _check_salary_role(): return _check_salary_role()
    conn = _get_payroll_db()
    try:
        row = conn.execute("SELECT data FROM payroll_data ORDER BY id DESC LIMIT 1").fetchone()
        if row:
            return jsonify(json.loads(row["data"]))
        return jsonify({})
    except Exception:
        return jsonify({})
    finally:
        conn.close()


@salary_bp.route("/api/payroll", methods=["POST"])
@jwt_required()
def save_payroll():
    if _check_salary_role(): return _check_salary_role()
    conn = _get_payroll_db()
    try:
        data = json.dumps(request.get_json(), ensure_ascii=False)
        conn.execute("DELETE FROM payroll_data")
        conn.execute("INSERT INTO payroll_data (data) VALUES (?)", (data,))
        conn.commit()
        return jsonify({"success": True, "message": "保存成功"})
    except Exception as e:
        return jsonify({"error": "保存失败: " + str(e)}), 500
    finally:
        conn.close()


# --- 2. 社保名单 ---

@salary_bp.route("/api/ss-list", methods=["GET"])
@jwt_required()
def get_ss_list():
    if _check_salary_role(): return _check_salary_role()
    conn = _get_payroll_db()
    try:
        row = conn.execute("SELECT data FROM ss_list ORDER BY id DESC LIMIT 1").fetchone()
        if row:
            return jsonify(json.loads(row["data"]))
        return jsonify([])
    except Exception:
        return jsonify([])
    finally:
        conn.close()


@salary_bp.route("/api/ss-list", methods=["POST"])
@jwt_required()
def save_ss_list():
    if _check_salary_role(): return _check_salary_role()
    conn = _get_payroll_db()
    try:
        data = json.dumps(request.get_json(), ensure_ascii=False)
        conn.execute("DELETE FROM ss_list")
        conn.execute("INSERT INTO ss_list (data) VALUES (?)", (data,))
        conn.commit()
        return jsonify({"success": True, "message": "保存成功"})
    except Exception as e:
        return jsonify({"error": "保存失败: " + str(e)}), 500
    finally:
        conn.close()


# --- 3. 社保金额 ---

@salary_bp.route("/api/ss-amount", methods=["GET"])
@jwt_required()
def get_ss_amount():
    if _check_salary_role(): return _check_salary_role()
    conn = _get_payroll_db()
    try:
        row = conn.execute("SELECT data FROM ss_amount ORDER BY id DESC LIMIT 1").fetchone()
        if row:
            return jsonify(json.loads(row["data"]))
        return jsonify({})
    except Exception:
        return jsonify({})
    finally:
        conn.close()


@salary_bp.route("/api/ss-amount", methods=["POST"])
@jwt_required()
def save_ss_amount():
    if _check_salary_role(): return _check_salary_role()
    conn = _get_payroll_db()
    try:
        data = json.dumps(request.get_json(), ensure_ascii=False)
        conn.execute("DELETE FROM ss_amount")
        conn.execute("INSERT INTO ss_amount (data) VALUES (?)", (data,))
        conn.commit()
        return jsonify({"success": True, "message": "保存成功"})
    except Exception as e:
        return jsonify({"error": "保存失败: " + str(e)}), 500
    finally:
        conn.close()


# --- 4. 历史工资单 ---

@salary_bp.route("/api/history", methods=["GET"])
@jwt_required()
def get_history():
    if _check_salary_role(): return _check_salary_role()
    conn = _get_payroll_db()
    try:
        rows = conn.execute("SELECT month, data FROM payroll_history ORDER BY month DESC").fetchall()
        result = {}
        for row in rows:
            try:
                result[row["month"]] = json.loads(row["data"])
            except Exception:
                pass
        return jsonify(result)
    except Exception:
        return jsonify({})
    finally:
        conn.close()


@salary_bp.route("/api/history/<path:month>", methods=["GET"])
@jwt_required()
def get_history_by_month(month):
    if _check_salary_role(): return _check_salary_role()
    conn = _get_payroll_db()
    try:
        row = conn.execute("SELECT data FROM payroll_history WHERE month = ?", (month,)).fetchone()
        if row:
            return jsonify(json.loads(row["data"]))
        return jsonify(None)
    except Exception:
        return jsonify(None)
    finally:
        conn.close()


@salary_bp.route("/api/history/<path:month>", methods=["POST"])
@jwt_required()
def save_history_by_month(month):
    if _check_salary_role(): return _check_salary_role()
    conn = _get_payroll_db()
    try:
        data = json.dumps(request.get_json(), ensure_ascii=False)
        conn.execute(
            "INSERT OR REPLACE INTO payroll_history (month, data) VALUES (?, ?)",
            (month, data),
        )
        conn.commit()
        return jsonify({"success": True, "message": "保存成功"})
    except Exception as e:
        return jsonify({"error": "保存失败: " + str(e)}), 500
    finally:
        conn.close()


@salary_bp.route("/api/history/<path:month>", methods=["DELETE"])
@jwt_required()
def delete_history_by_month(month):
    if _check_salary_role(): return _check_salary_role()
    conn = _get_payroll_db()
    try:
        conn.execute("DELETE FROM payroll_history WHERE month = ?", (month,))
        conn.commit()
        return jsonify({"success": True, "message": "删除成功"})
    except Exception as e:
        return jsonify({"error": "删除失败: " + str(e)}), 500
    finally:
        conn.close()


# --- 5. 用户会话（兼容前端 api.js，返回模拟会话） ---

@salary_bp.route("/api/auth/session", methods=["GET"])
@jwt_required()
def get_session():
    """返回当前登录用户会话信息，让前端工资模块认为已登录"""
    claims = get_jwt()
    return jsonify({
        "username": claims.get("username", "admin"),
        "role": claims.get("role", "finance"),
        "ts": 0,
    })


@salary_bp.route("/api/auth/session", methods=["POST"])
def save_session():
    return jsonify({"success": True, "message": "保存成功"})


@salary_bp.route("/api/auth/session", methods=["DELETE"])
def clear_session():
    return jsonify({"success": True, "message": "删除成功"})
