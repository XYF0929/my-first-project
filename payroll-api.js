// API 配置
const API_BASE_URL = window.location.origin; // 自动检测当前域名和端口

// 获取 JWT token 并构造请求头
function _authHeaders(extra = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...extra };
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }
  return headers;
}

// 带 JWT 的 fetch 封装
async function _fetch(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...options.headers };
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }
  const response = await fetch(url, { ...options, headers });
  // token 过期或无效 → 跳回登录页
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
    throw new Error('登录已过期，请重新登录');
  }
  return response;
}

// API 工具函数
const api = {
  // 当前工资单数据
  async getPayroll() {
    try {
      const response = await _fetch(`${API_BASE_URL}/api/payroll`);
      if (!response.ok) throw new Error('获取数据失败');
      return await response.json();
    } catch (error) {
      console.error('获取工资单数据失败:', error);
      return {};
    }
  },

  async savePayroll(data) {
    try {
      const response = await _fetch(`${API_BASE_URL}/api/payroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('保存失败');
      return await response.json();
    } catch (error) {
      console.error('保存工资单数据失败:', error);
      throw error;
    }
  },

  // 社保名单（保证始终返回数组，兼容 { list: [...] } 等格式）
  async getSSList() {
    try {
      const response = await _fetch(`${API_BASE_URL}/api/ss-list`);
      if (!response.ok) throw new Error('获取数据失败');
      const data = await response.json();
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.list)) return data.list;
      return [];
    } catch (error) {
      console.error('获取社保名单失败:', error);
      return [];
    }
  },

  async saveSSList(data) {
    try {
      const response = await _fetch(`${API_BASE_URL}/api/ss-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('保存失败');
      return await response.json();
    } catch (error) {
      console.error('保存社保名单失败:', error);
      throw error;
    }
  },

  // 社保金额
  async getSSAmount() {
    try {
      const response = await _fetch(`${API_BASE_URL}/api/ss-amount`);
      if (!response.ok) throw new Error('获取数据失败');
      return await response.json();
    } catch (error) {
      console.error('获取社保金额失败:', error);
      return {};
    }
  },

  async saveSSAmount(data) {
    try {
      const response = await _fetch(`${API_BASE_URL}/api/ss-amount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('保存失败');
      return await response.json();
    } catch (error) {
      console.error('保存社保金额失败:', error);
      throw error;
    }
  },

  // 历史工资单
  async getHistory() {
    try {
      const response = await _fetch(`${API_BASE_URL}/api/history`);
      if (!response.ok) throw new Error('获取数据失败');
      return await response.json();
    } catch (error) {
      console.error('获取历史工资单失败:', error);
      return {};
    }
  },

  async getHistoryByMonth(month) {
    try {
      const response = await _fetch(`${API_BASE_URL}/api/history/${month}`);
      if (!response.ok) throw new Error('获取数据失败');
      return await response.json();
    } catch (error) {
      console.error('获取历史工资单失败:', error);
      return null;
    }
  },

  async saveHistory(month, data) {
    try {
      const response = await _fetch(`${API_BASE_URL}/api/history/${month}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('保存失败');
      return await response.json();
    } catch (error) {
      console.error('保存历史工资单失败:', error);
      throw error;
    }
  },

  async deleteHistory(month) {
    try {
      const response = await _fetch(`${API_BASE_URL}/api/history/${month}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('删除失败');
      return await response.json();
    } catch (error) {
      console.error('删除历史工资单失败:', error);
      throw error;
    }
  },

  // 用户会话
  async getSession() {
    try {
      const response = await _fetch(`${API_BASE_URL}/api/auth/session`);
      if (!response.ok) throw new Error('获取数据失败');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取会话失败:', error);
      return null;
    }
  },

  async saveSession(data) {
    try {
      const response = await _fetch(`${API_BASE_URL}/api/auth/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('保存失败');
      return await response.json();
    } catch (error) {
      console.error('保存会话失败:', error);
      throw error;
    }
  },

  async clearSession() {
    try {
      const response = await _fetch(`${API_BASE_URL}/api/auth/session`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('删除失败');
      return await response.json();
    } catch (error) {
      console.error('删除会话失败:', error);
      throw error;
    }
  }
};
