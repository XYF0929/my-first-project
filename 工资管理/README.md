# 工资管理系统 - 后端服务版

## 功能说明

这是一个支持多台电脑共享数据的工资管理系统。所有数据存储在服务器端的 SQLite 数据库中，多台电脑可以同时访问和编辑。

## 安装步骤

### 1. 安装 Node.js

如果还没有安装 Node.js，请先访问 [Node.js 官网](https://nodejs.org/) 下载并安装（推荐 LTS 版本）。

### 2. 安装依赖

在项目目录下打开命令行，运行：

```bash
npm install
```

这将安装以下依赖：
- express - Web 服务器框架
- cors - 跨域资源共享
- sqlite3 - SQLite 数据库
- body-parser - 请求体解析

### 3. 启动服务器

运行以下命令启动服务器：

```bash
npm start
```

或者：

```bash
node server.js
```

服务器将在 `http://localhost:3000` 启动。

### 4. 访问系统

在浏览器中访问：

```
http://localhost:3000/index.html
```

或者直接访问：

```
http://localhost:3000
```

## 多台电脑访问

### 方式一：局域网访问（推荐）

1. **找到服务器电脑的 IP 地址**：
   - Windows: 在命令行运行 `ipconfig`，找到 "IPv4 地址"
   - 例如：`192.168.1.100`

2. **修改其他电脑的访问地址**：
   - 在其他电脑的浏览器中访问：`http://192.168.1.100:3000`
   - 或者修改 `api.js` 文件中的 `API_BASE_URL` 为服务器 IP

3. **确保防火墙允许端口 3000**：
   - Windows: 在"Windows Defender 防火墙"中添加端口 3000 的入站规则

### 方式二：使用域名或公网 IP

如果需要通过互联网访问，需要：
1. 配置路由器端口转发（将 3000 端口转发到服务器电脑）
2. 使用公网 IP 或域名访问
3. 注意安全性，建议添加 HTTPS 和身份验证

## 数据存储

- 数据库文件：`payroll.db`（SQLite 数据库，自动创建在项目目录）
- 所有数据存储在服务器端，多台电脑共享同一份数据
- 建议定期备份 `payroll.db` 文件

## API 接口说明

系统提供以下 RESTful API：

- `GET /api/payroll` - 获取当前工资单数据
- `POST /api/payroll` - 保存当前工资单数据
- `GET /api/ss-list` - 获取社保名单
- `POST /api/ss-list` - 保存社保名单
- `GET /api/ss-amount` - 获取社保金额
- `POST /api/ss-amount` - 保存社保金额
- `GET /api/history` - 获取所有历史工资单
- `GET /api/history/:month` - 获取指定月份的历史工资单
- `POST /api/history/:month` - 保存指定月份的历史工资单
- `DELETE /api/history/:month` - 删除指定月份的历史工资单
- `GET /api/auth/session` - 获取用户会话
- `POST /api/auth/session` - 保存用户会话
- `DELETE /api/auth/session` - 清除用户会话

## 故障排除

### 端口被占用

如果 3000 端口被占用，可以修改 `server.js` 中的 `PORT` 变量：

```javascript
const PORT = 3000; // 改为其他端口，如 3001
```

### 数据库错误

如果遇到数据库相关错误：
1. 删除 `payroll.db` 文件（会重新创建）
2. 重启服务器

### 跨域问题

如果遇到跨域问题，确保 `server.js` 中已启用 CORS：

```javascript
app.use(cors());
```

## 安全建议

1. **生产环境使用**：
   - 添加 HTTPS 支持
   - 实现更强的身份验证
   - 限制访问 IP
   - 定期备份数据库

2. **数据备份**：
   - 定期备份 `payroll.db` 文件
   - 可以使用导出功能备份为 Excel 文件

## 技术支持

如有问题，请检查：
1. Node.js 是否正确安装
2. 依赖是否完整安装
3. 服务器是否正常启动
4. 浏览器控制台是否有错误信息
