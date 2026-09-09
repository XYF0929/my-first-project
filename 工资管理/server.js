const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 静态文件服务（提供前端文件）
app.use(express.static(__dirname));

// 数据库文件路径
const DB_PATH = path.join(__dirname, 'payroll.db');

// 初始化数据库
function initDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('数据库连接失败:', err);
        reject(err);
        return;
      }
      console.log('数据库连接成功');
    });

    // 创建表
    db.serialize(() => {
      // 当前工资单数据表
      db.run(`CREATE TABLE IF NOT EXISTS payroll_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) console.error('创建payroll_data表失败:', err);
      });

      // 社保名单表
      db.run(`CREATE TABLE IF NOT EXISTS ss_list (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) console.error('创建ss_list表失败:', err);
      });

      // 社保金额表
      db.run(`CREATE TABLE IF NOT EXISTS ss_amount (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) console.error('创建ss_amount表失败:', err);
      });

      // 历史工资单表
      db.run(`CREATE TABLE IF NOT EXISTS payroll_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        month TEXT NOT NULL UNIQUE,
        data TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) console.error('创建payroll_history表失败:', err);
      });

      // 用户会话表
      db.run(`CREATE TABLE IF NOT EXISTS auth_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_data TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) console.error('创建auth_sessions表失败:', err);
      });

      resolve(db);
    });
  });
}

// 获取数据库连接
function getDB() {
  return new sqlite3.Database(DB_PATH);
}

// ==================== API 路由 ====================

// 1. 当前工资单数据
app.get('/api/payroll', (req, res) => {
  const db = getDB();
  db.get('SELECT data FROM payroll_data ORDER BY id DESC LIMIT 1', (err, row) => {
    if (err) {
      console.error('获取工资单数据失败:', err);
      res.status(500).json({ error: '获取数据失败' });
      return;
    }
    if (row) {
      try {
        res.json(JSON.parse(row.data));
      } catch (e) {
        res.json({});
      }
    } else {
      res.json({});
    }
    db.close();
  });
});

app.post('/api/payroll', (req, res) => {
  const db = getDB();
  const data = JSON.stringify(req.body);
  
  // 先删除旧数据，再插入新数据
  db.run('DELETE FROM payroll_data', (err) => {
    if (err) {
      console.error('删除旧数据失败:', err);
      res.status(500).json({ error: '保存失败' });
      db.close();
      return;
    }
    
    db.run('INSERT INTO payroll_data (data) VALUES (?)', [data], (err) => {
      if (err) {
        console.error('保存工资单数据失败:', err);
        res.status(500).json({ error: '保存失败' });
      } else {
        res.json({ success: true, message: '保存成功' });
      }
      db.close();
    });
  });
});

// 2. 社保名单
app.get('/api/ss-list', (req, res) => {
  const db = getDB();
  db.get('SELECT data FROM ss_list ORDER BY id DESC LIMIT 1', (err, row) => {
    if (err) {
      console.error('获取社保名单失败:', err);
      res.status(500).json({ error: '获取数据失败' });
      return;
    }
    if (row) {
      try {
        res.json(JSON.parse(row.data));
      } catch (e) {
        res.json([]);
      }
    } else {
      res.json([]);
    }
    db.close();
  });
});

app.post('/api/ss-list', (req, res) => {
  const db = getDB();
  const data = JSON.stringify(req.body);
  
  db.run('DELETE FROM ss_list', (err) => {
    if (err) {
      console.error('删除旧数据失败:', err);
      res.status(500).json({ error: '保存失败' });
      db.close();
      return;
    }
    
    db.run('INSERT INTO ss_list (data) VALUES (?)', [data], (err) => {
      if (err) {
        console.error('保存社保名单失败:', err);
        res.status(500).json({ error: '保存失败' });
      } else {
        res.json({ success: true, message: '保存成功' });
      }
      db.close();
    });
  });
});

// 3. 社保金额
app.get('/api/ss-amount', (req, res) => {
  const db = getDB();
  db.get('SELECT data FROM ss_amount ORDER BY id DESC LIMIT 1', (err, row) => {
    if (err) {
      console.error('获取社保金额失败:', err);
      res.status(500).json({ error: '获取数据失败' });
      return;
    }
    if (row) {
      try {
        res.json(JSON.parse(row.data));
      } catch (e) {
        res.json({});
      }
    } else {
      res.json({});
    }
    db.close();
  });
});

app.post('/api/ss-amount', (req, res) => {
  const db = getDB();
  const data = JSON.stringify(req.body);
  
  db.run('DELETE FROM ss_amount', (err) => {
    if (err) {
      console.error('删除旧数据失败:', err);
      res.status(500).json({ error: '保存失败' });
      db.close();
      return;
    }
    
    db.run('INSERT INTO ss_amount (data) VALUES (?)', [data], (err) => {
      if (err) {
        console.error('保存社保金额失败:', err);
        res.status(500).json({ error: '保存失败' });
      } else {
        res.json({ success: true, message: '保存成功' });
      }
      db.close();
    });
  });
});

// 4. 历史工资单
app.get('/api/history', (req, res) => {
  const db = getDB();
  db.all('SELECT month, data FROM payroll_history ORDER BY month DESC', (err, rows) => {
    if (err) {
      console.error('获取历史工资单失败:', err);
      res.status(500).json({ error: '获取数据失败' });
      db.close();
      return;
    }
    
    const result = {};
    rows.forEach(row => {
      try {
        result[row.month] = JSON.parse(row.data);
      } catch (e) {
        console.error('解析历史数据失败:', e);
      }
    });
    res.json(result);
    db.close();
  });
});

app.get('/api/history/:month', (req, res) => {
  const db = getDB();
  const month = req.params.month;
  db.get('SELECT data FROM payroll_history WHERE month = ?', [month], (err, row) => {
    if (err) {
      console.error('获取历史工资单失败:', err);
      res.status(500).json({ error: '获取数据失败' });
      db.close();
      return;
    }
    if (row) {
      try {
        res.json(JSON.parse(row.data));
      } catch (e) {
        res.json(null);
      }
    } else {
      res.json(null);
    }
    db.close();
  });
});

app.post('/api/history/:month', (req, res) => {
  const db = getDB();
  const month = req.params.month;
  const data = JSON.stringify(req.body);
  
  // 使用 INSERT OR REPLACE 来更新或插入
  db.run('INSERT OR REPLACE INTO payroll_history (month, data) VALUES (?, ?)', 
    [month, data], (err) => {
      if (err) {
        console.error('保存历史工资单失败:', err);
        res.status(500).json({ error: '保存失败' });
      } else {
        res.json({ success: true, message: '保存成功' });
      }
      db.close();
    });
});

app.delete('/api/history/:month', (req, res) => {
  const db = getDB();
  const month = req.params.month;
  db.run('DELETE FROM payroll_history WHERE month = ?', [month], (err) => {
    if (err) {
      console.error('删除历史工资单失败:', err);
      res.status(500).json({ error: '删除失败' });
    } else {
      res.json({ success: true, message: '删除成功' });
    }
    db.close();
  });
});

// 5. 用户会话
app.get('/api/auth/session', (req, res) => {
  const db = getDB();
  db.get('SELECT session_data FROM auth_sessions ORDER BY id DESC LIMIT 1', (err, row) => {
    if (err) {
      console.error('获取会话失败:', err);
      res.status(500).json({ error: '获取数据失败' });
      return;
    }
    if (row) {
      try {
        res.json(JSON.parse(row.session_data));
      } catch (e) {
        res.json(null);
      }
    } else {
      res.json(null);
    }
    db.close();
  });
});

app.post('/api/auth/session', (req, res) => {
  const db = getDB();
  const data = JSON.stringify(req.body);
  
  db.run('DELETE FROM auth_sessions', (err) => {
    if (err) {
      console.error('删除旧会话失败:', err);
      res.status(500).json({ error: '保存失败' });
      db.close();
      return;
    }
    
    db.run('INSERT INTO auth_sessions (session_data) VALUES (?)', [data], (err) => {
      if (err) {
        console.error('保存会话失败:', err);
        res.status(500).json({ error: '保存失败' });
      } else {
        res.json({ success: true, message: '保存成功' });
      }
      db.close();
    });
  });
});

app.delete('/api/auth/session', (req, res) => {
  const db = getDB();
  db.run('DELETE FROM auth_sessions', (err) => {
    if (err) {
      console.error('删除会话失败:', err);
      res.status(500).json({ error: '删除失败' });
    } else {
      res.json({ success: true, message: '删除成功' });
    }
    db.close();
  });
});

// 启动服务器
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log(`请在浏览器中访问: http://localhost:${PORT}/index.html`);
  });
}).catch(err => {
  console.error('服务器启动失败:', err);
  process.exit(1);
});
