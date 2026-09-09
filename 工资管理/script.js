// 自定义弹窗函数（居中显示）
function showAlert(message, title = "提示") {
  return new Promise((resolve) => {
    const overlay = document.getElementById("custom-modal-overlay");
    const modalTitle = document.getElementById("modal-title");
    const modalMessage = document.getElementById("modal-message");
    const modalButtons = document.getElementById("modal-buttons");
    
    if (!overlay || !modalTitle || !modalMessage || !modalButtons) {
      // 如果DOM元素不存在，使用原生alert
      window.alert(message);
      resolve();
      return;
    }
    
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalButtons.innerHTML = '<button class="modal-btn modal-btn-primary" id="modal-ok-btn">确定</button>';
    
    overlay.style.display = "flex";
    
    const okBtn = document.getElementById("modal-ok-btn");
    const closeModal = () => {
      overlay.style.display = "none";
      resolve();
    };
    
    okBtn.addEventListener("click", closeModal);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    });
  });
}

function showConfirm(message, title = "确认") {
  return new Promise((resolve) => {
    const overlay = document.getElementById("custom-modal-overlay");
    const modalTitle = document.getElementById("modal-title");
    const modalMessage = document.getElementById("modal-message");
    const modalButtons = document.getElementById("modal-buttons");
    
    if (!overlay || !modalTitle || !modalMessage || !modalButtons) {
      // 如果DOM元素不存在，使用原生confirm
      const result = window.confirm(message);
      resolve(result);
      return;
    }
    
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalButtons.innerHTML = `
      <button class="modal-btn modal-btn-secondary" id="modal-cancel-btn">取消</button>
      <button class="modal-btn modal-btn-primary" id="modal-confirm-btn">确定</button>
    `;
    
    overlay.style.display = "flex";
    
    const confirmBtn = document.getElementById("modal-confirm-btn");
    const cancelBtn = document.getElementById("modal-cancel-btn");
    
    const closeModal = (result) => {
      overlay.style.display = "none";
      resolve(result);
    };
    
    confirmBtn.addEventListener("click", () => closeModal(true));
    cancelBtn.addEventListener("click", () => closeModal(false));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeModal(false);
      }
    });
  });
}

// 简单的本地状态管理，按部门分开存储（支持动态新增车间）
let departments = ["injection", "hardware", "management"];
const deptLabels = {
  injection: "注塑车间",
  hardware: "五金车间",
  management: "管理人员",
};
const deptLabelToKey = Object.fromEntries(
  Object.entries(deptLabels).map(([k, v]) => [v, k])
);

// 将车间名称转为可做 key 的字符串（新建车间用 custom_ 前缀）
function toDeptKey(label) {
  return "custom_" + String(label || "").replace(/\s+/g, "_").replace(/[^\w\u4e00-\u9fa5]/g, "_") || "custom_未知";
}

// 若车间标签已存在则返回其 key，否则新建并返回 key
function addDepartment(label) {
  const L = String(label || "").trim();
  if (!L) return null;
  if (deptLabelToKey[L]) return deptLabelToKey[L];
  let key = toDeptKey(L);
  if (deptLabels[key]) {
    key = key + "_" + Date.now();
  }
  deptLabels[key] = L;
  deptLabelToKey[L] = key;
  departments.push(key);
  createDeptPanel(key, L);
  return key;
}

// 确保存在 key 对应的面板；若只有 key 没有 label，用 key 当 label
function ensureDeptPanel(key, label) {
  const lab = label || deptLabels[key] || key;
  if (!deptLabels[key]) {
    deptLabels[key] = lab;
    deptLabelToKey[lab] = key;
    if (departments.indexOf(key) === -1) departments.push(key);
  }
  if (document.getElementById("dept-" + key)) return;
  createDeptPanel(key, lab);
}

// 创建新车间的 tab 与 section，并绑定表格和 tab 切换
function createDeptPanel(key, label) {
  const panel = document.createElement("section");
  panel.id = "dept-" + key;
  panel.className = "dept-panel";
  panel.innerHTML = `
    <h2>${label}</h2>
    <p class="hint">可根据公司制度自定义：基本工资、计件/加班、奖金、扣款等。</p>
    <div class="table-wrapper">
      <table class="salary-table" data-dept="${key}">
        <thead>
          <tr>
            <th>姓名</th>
            <th class="hidden-column">出勤天数</th>
            <th>基本工资</th>
            <th class="hidden-column">加班天数</th>
            <th>加班工资</th>
            <th>奖金</th>
            <th>社保补贴</th>
            <th>应发工资</th>
            <th>养老金</th>
            <th>医疗保险</th>
            <th>失业保险</th>
            <th class="hidden-column">餐费代扣</th>
            <th class="hidden-column">补缴/个税</th>
            <th>实发工资</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody></tbody>
        <tfoot>
          <tr>
            <td colspan="9" class="tfoot-label">本部门合计：</td>
            <td class="dept-total">0</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
    <div class="actions">
      <button class="btn add-row" data-dept="${key}">+ 新增员工</button>
      <button class="btn secondary clear-dept" data-dept="${key}">清空本部门</button>
    </div>
  `;
  const lastDept = document.querySelector("#panel-payroll .dept-panel:last-of-type");
  if (lastDept) lastDept.insertAdjacentElement("afterend", panel);
  else document.getElementById("panel-payroll").appendChild(panel);

  const tab = document.createElement("button");
  tab.className = "tab-button";
  tab.dataset.target = "dept-" + key;
  tab.textContent = label;
  const nav = document.querySelector("#panel-payroll .tabs");
  if (nav) nav.appendChild(tab);

  const tbody = panel.querySelector("tbody");
  if (tbody && tbody.children.length === 0) tbody.appendChild(createRow(key));
  initTableForDept(key);

  tab.addEventListener("click", () => {
    const group = document.getElementById("panel-payroll");
    if (!group) return;
    group.querySelectorAll(".tab-button").forEach((b) => b.classList.remove("active"));
    group.querySelectorAll(".dept-panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    const p = document.getElementById("dept-" + key);
    if (p) p.classList.add("active");
  });
}

const STORAGE_KEY_PAYROLL = "payroll_data_v1";
const STORAGE_KEY_SS_LIST = "payroll_social_security_list_v1";
const STORAGE_KEY_SS_AMOUNT = "payroll_social_security_amount_v1";
const STORAGE_KEY_AUTH = "payroll_auth_session_v1";
const STORAGE_KEY_HISTORY = "payroll_history_v1";

// 轻量权限：在前端本地校验账号/密码（可按需改成读取配置或接入后端）
// 注意：纯前端无法做到强安全（别人拿到文件可绕过/篡改）。强安全需要后端鉴权或内网发布。
const ALLOWED_USERS = [
  { username: "admin", password: "admin", role: "finance", display: "财务" },
];

function formatCurrency(value) {
  if (Number.isNaN(value) || !Number.isFinite(value)) return "0";
  return value.toFixed(2);
}

function parseNumber(value) {
  if (value === "" || value == null) return 0;
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

function createRow(dept) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>
      <input class="salary-input" name="name" placeholder="姓名" />
    </td>
    <td class="hidden-column">
      <input class="salary-input" name="attendanceDays" type="number" step="0.01" min="0" placeholder="0" />
    </td>
    <td>
      <input class="salary-input" name="baseSalary" type="number" step="0.01" min="0" placeholder="0.00" />
    </td>
    <td class="hidden-column">
      <input class="salary-input" name="overtimeDays" type="number" step="0.01" min="0" placeholder="0" />
    </td>
    <td>
      <input class="salary-input" name="overtimeSalary" type="number" step="0.01" min="0" placeholder="0.00" />
    </td>
    <td>
      <input class="salary-input" name="bonus" type="number" step="0.01" min="0" placeholder="0.00" />
    </td>
    <td>
      <input class="salary-input" name="socialSecuritySubsidy" type="number" step="0.01" min="0" placeholder="0.00" />
    </td>
    <td class="cell-should-pay">0.00</td>
    <td class="cell-pension">0.00</td>
    <td class="cell-medical">0.00</td>
    <td class="cell-unemployment">0.00</td>
    <td class="hidden-column">
      <input class="salary-input" name="mealDeduction" type="number" step="0.01" min="0" placeholder="0.00" />
    </td>
    <td class="hidden-column">
      <input class="salary-input" name="taxOrSupplement" type="number" step="0.01" placeholder="0.00" />
    </td>
    <td class="cell-actual-pay">0.00</td>
    <td>
      <button class="icon-btn btn-remove" title="删除该员工">删除</button>
    </td>
  `;
  return tr;
}

// 姓名规范化，用于社保名单匹配：去全角/不可见字符、trim、移除所有空格，使「王 静如」与「王静如」能匹配
function normalizeNameForSS(s) {
  if (s == null || typeof s !== "string") return "";
  return String(s)
    .replace(/\u3000/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // 零宽、BOM 等不可见字符
    .trim()
    .replace(/\s+/g, ""); // 移除姓名中全部空格，便于匹配
}

// 在社保名单中但不扣除养老/医疗/失业保险的人员（如王静如）；除名单外，其他在社保名单中的人均扣三项
const SS_EXCLUDED_FROM_PENSION_MEDICAL_UNEMPLOYMENT = new Set([normalizeNameForSS("王静如")]);

async function calcRowTotal(tr) {
  const baseSalary = parseNumber(tr.querySelector('input[name="baseSalary"]')?.value || 0);
  const overtimeSalary = parseNumber(tr.querySelector('input[name="overtimeSalary"]')?.value || 0);
  const bonus = parseNumber(tr.querySelector('input[name="bonus"]')?.value || 0);
  const socialSecuritySubsidy = parseNumber(tr.querySelector('input[name="socialSecuritySubsidy"]')?.value || 0);
  
  // 应发工资 = 基本工资 + 加班工资 + 奖金 + 社保补贴
  const shouldPay = baseSalary + overtimeSalary + bonus + socialSecuritySubsidy;
  
  // 获取员工姓名，检查是否在社保名单中（规范化后匹配，兼容 姓名/name、全角空格等）
  const employeeName = normalizeNameForSS(tr.querySelector('input[name="name"]')?.value || "");
  
  // 从社保金额获取养老金、医疗保险、失业保险（兼容英文字段与中文字段）
  let ssAmount = (await api.getSSAmount()) || {};
  if (!ssAmount || Object.keys(ssAmount).length === 0) {
    try { ssAmount = (typeof getSSAmount === "function" ? getSSAmount() : null) || {}; } catch (_) {}
  }
  const basePension = parseNumber(ssAmount.pension ?? ssAmount.养老金 ?? 0);
  const baseMedical = parseNumber(ssAmount.medical ?? ssAmount.医疗保险 ?? 0);
  const baseUnemployment = parseNumber(ssAmount.unemployment ?? ssAmount.失业保险 ?? 0);
  
  // 检查员工是否在社保名单中：统一从接口取数组，兼容 姓名/name/名字，姓名规范化后匹配；接口为空时回退到信息维护 DOM
  let ssRaw = await api.getSSList();
  let ssList = Array.isArray(ssRaw) ? ssRaw : (ssRaw && Array.isArray(ssRaw.list) ? ssRaw.list : []);
  if (ssList.length === 0 && typeof getSSList === "function") {
    try { const dom = getSSList(); if (Array.isArray(dom) && dom.length) ssList = dom; } catch (_) {}
  }
  const ssNames = new Set(
    ssList
      .map((item) => {
        const n = String(item["姓名"] || item["name"] || item["名字"] || "").trim();
        return normalizeNameForSS(n);
      })
      .filter((n) => n)
  );
  // 只有社保名单中的员工才扣除养老/医疗/失业，且排除王静如等特例
  const hasSocialSecurity = !!employeeName && ssNames.has(employeeName) && !SS_EXCLUDED_FROM_PENSION_MEDICAL_UNEMPLOYMENT.has(employeeName);
  const pension = hasSocialSecurity ? basePension : 0;
  const medical = hasSocialSecurity ? baseMedical : 0;
  const unemployment = hasSocialSecurity ? baseUnemployment : 0;
  
  const mealDeduction = parseNumber(tr.querySelector('input[name="mealDeduction"]')?.value || 0);
  const taxOrSupplement = parseNumber(tr.querySelector('input[name="taxOrSupplement"]')?.value || 0);
  
  // 实发工资 = 应发工资 - 养老金 - 医疗保险 - 失业保险 - 餐费代扣 - 补缴/个税
  // 注意：taxOrSupplement如果是负数（退税）则加上，如果是正数（补缴）则减去
  const actualPay = shouldPay - pension - medical - unemployment - mealDeduction - taxOrSupplement;
  
  const shouldPayCell = tr.querySelector(".cell-should-pay");
  if (shouldPayCell) shouldPayCell.textContent = formatCurrency(Math.max(0, shouldPay));
  
  // 显示从社保金额获取的值（如果在社保名单中才显示，否则显示0）
  const pensionCell = tr.querySelector(".cell-pension");
  if (pensionCell) pensionCell.textContent = formatCurrency(pension);
  
  const medicalCell = tr.querySelector(".cell-medical");
  if (medicalCell) medicalCell.textContent = formatCurrency(medical);
  
  const unemploymentCell = tr.querySelector(".cell-unemployment");
  if (unemploymentCell) unemploymentCell.textContent = formatCurrency(unemployment);
  
  const actualPayCell = tr.querySelector(".cell-actual-pay");
  if (actualPayCell) actualPayCell.textContent = formatCurrency(Math.max(0, actualPay));
  
  return Math.max(0, actualPay);
}

async function calcDeptTotal(table) {
  let sum = 0;
  for (const tr of table.querySelectorAll("tbody tr")) {
    sum += await calcRowTotal(tr);
  }
  const totalCell = table.querySelector(".dept-total");
  if (totalCell) totalCell.textContent = formatCurrency(sum);
  return sum;
}

async function updateSummary() {
  // 公司汇总已删除，此函数保留用于计算部门合计
  for (const dept of departments) {
    const table = document.querySelector(`.salary-table[data-dept="${dept}"]`);
    if (!table) continue;
    await calcDeptTotal(table);
  }
}

function initTabs() {
  // 支持多个独立的tab组，并用事件委托以支持动态添加的 tab
  document.querySelectorAll("#panel-payroll, #panel-info").forEach((group) => {
    group.addEventListener("click", (e) => {
      const btn = e.target.closest(".tab-button");
      if (!btn) return;
      const targetId = btn.dataset.target;
      if (!targetId) return;
      const buttons = group.querySelectorAll(".tab-button");
      const panels = group.querySelectorAll(".dept-panel");
      buttons.forEach((b) => b.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      const panel = document.getElementById(targetId);
      if (panel) panel.classList.add("active");
    });
  });
}

// 顶层两个大板块：历史工资单 / 当月工资
function initPrimaryPanels() {
  const buttons = document.querySelectorAll(".sidebar-nav-btn, .primary-nav-btn");
  const panels = document.querySelectorAll(".main-panel");

  // 处理父菜单的展开/折叠
  const parentButtons = document.querySelectorAll(".sidebar-nav-parent");
  parentButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const submenuId = btn.dataset.submenu;
      if (!submenuId) return;
      
      const submenu = document.getElementById(submenuId);
      if (!submenu) return;
      
      const isExpanded = submenu.classList.contains("expanded");
      if (isExpanded) {
        submenu.classList.remove("expanded");
        btn.classList.remove("expanded");
      } else {
        submenu.classList.add("expanded");
        btn.classList.add("expanded");
      }
    });
  });

  // 处理子菜单项和普通按钮的点击
  buttons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      // 如果是父菜单按钮，不处理页面切换
      if (btn.classList.contains("sidebar-nav-parent")) {
        return;
      }
      
      const targetId = btn.dataset.mainTarget;
      if (!targetId) return;
      
      // 移除所有按钮的active状态
      document.querySelectorAll(".sidebar-nav-btn").forEach((b) => b.classList.remove("active"));
      // 移除所有面板的active状态
      panels.forEach((p) => p.classList.remove("active"));
      
      // 激活当前按钮和面板
      btn.classList.add("active");
      const panel = document.getElementById(targetId);
      if (panel) {
        panel.classList.add("active");
        // 如果切换到历史工资单页面，重新渲染列表以同步最新数据
        if (targetId === "panel-history") {
          renderHistoryList();
        }
      }
    });
  });
}

// 折叠/展开功能
function initCollapsibleSections() {
  const headers = document.querySelectorAll(".section-header");
  headers.forEach((header) => {
    const toggle = header.querySelector(".collapse-toggle");
    const targetId = header.dataset.collapseTarget;
    if (!toggle || !targetId) return;
    
    const content = document.getElementById(targetId);
    if (!content) return;
    
    // 更新图标状态
    const updateIcon = () => {
      const icon = toggle.querySelector(".collapse-icon");
      if (icon) {
        // 默认是折叠状态（collapsed），所以初始显示▶
        icon.textContent = content.classList.contains("collapsed") ? "▶" : "▼";
      }
    };
    
    // 初始状态：默认折叠
    if (!content.classList.contains("collapsed")) {
      content.classList.add("collapsed");
    }
    updateIcon();
    
    // 点击切换
    const handleToggle = () => {
      content.classList.toggle("collapsed");
      updateIcon();
    };
    
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      handleToggle();
    });
    
    // 点击整个header也可以切换
    header.addEventListener("click", (e) => {
      if (e.target !== toggle && !toggle.contains(e.target)) {
        handleToggle();
      }
    });
  });
}

// ---------------- 权限门禁（轻量） ----------------
function setAuthMessage(msg) {
  const el = document.getElementById("auth-message");
  if (el) el.textContent = msg || "";
}

function setCurrentUserLabel(username) {
  const el = document.getElementById("current-user");
  if (el) el.textContent = username || "-";
}

async function getSession() {
  try {
    const json = await api.getSession();
    if (!json || typeof json !== "object") return null;
    if (!json.username || !json.role) return null;
    return json;
  } catch (_) {
    return null;
  }
}

async function setSession(session) {
  try {
    await api.saveSession(session);
  } catch (_) {
    // ignore
  }
}

async function clearSession() {
  try {
    await api.clearSession();
  } catch (_) {
    // ignore
  }
}

function showAppUI(username) {
  const gate = document.getElementById("auth-gate");
  const app = document.getElementById("app-root");
  if (gate) gate.style.display = "none";
  if (app) app.classList.remove("app-hidden");
  setCurrentUserLabel(username);
}

function showLoginUI() {
  const gate = document.getElementById("auth-gate");
  const app = document.getElementById("app-root");
  if (gate) gate.style.display = "flex";
  if (app) app.classList.add("app-hidden");
  setCurrentUserLabel("-");
}

function validateCredentials(username, password) {
  const u = String(username || "").trim();
  const p = String(password || "").trim(); // 密码也去掉首尾空格
  if (!u || !p) return null;
  return ALLOWED_USERS.find((x) => x.username === u && x.password === p) || null;
}

async function initAuth() {
  console.log("初始化登录功能...");
  
  const form = document.getElementById("login-form");
  const userInput = document.getElementById("login-username");
  const passInput = document.getElementById("login-password");
  const demoBtn = document.getElementById("btn-demo-fill");
  const logoutBtn = document.getElementById("btn-logout");

  console.log("表单元素:", { form: !!form, userInput: !!userInput, passInput: !!passInput });

  // 尝试获取会话，如果后端服务未启动也不影响登录
  try {
    const session = await getSession();
    console.log("获取到的会话:", session);
    if (session && session.role === "finance") {
      console.log("已有有效会话，直接登录");
      showAppUI(session.username);
      return; // 如果已有有效会话，直接返回
    }
  } catch (err) {
    // 后端服务可能未启动，忽略错误，继续显示登录界面
    console.log("无法连接到后端服务，将显示登录界面:", err);
  }
  
  // 显示登录界面
  console.log("显示登录界面");
  showLoginUI();

  if (demoBtn) {
    console.log("绑定示例账号按钮");
    demoBtn.addEventListener("click", () => {
      console.log("点击了示例账号按钮");
      if (userInput) userInput.value = "admin";
      if (passInput) passInput.value = "admin";
      setAuthMessage("");
    });
  } else {
    console.warn("未找到示例账号按钮");
  }

  if (form) {
    console.log("绑定登录表单提交事件");
    form.addEventListener("submit", async (e) => {
      console.log("表单提交事件触发");
      e.preventDefault();
      e.stopPropagation();
      
      const username = userInput ? userInput.value : "";
      const password = passInput ? passInput.value : "";
      
      console.log("输入的账号密码:", { username, password: password ? "***" : "" });
      
      // 验证账号密码
      const user = validateCredentials(username, password);
      console.log("验证结果:", user ? "成功" : "失败");
      
      if (!user) {
        console.log("账号或密码错误");
        setAuthMessage("账号或密码错误。");
        return;
      }
      if (user.role !== "finance") {
        console.log("无权限");
        setAuthMessage("无权限：仅限财务人员登录。");
        return;
      }
      
      console.log("登录验证通过，准备保存会话");
      
      // 尝试保存会话到后端（如果后端可用）
      try {
        await setSession({ username: user.username, role: user.role, ts: Date.now() });
        console.log("会话保存成功");
      } catch (err) {
        // 后端服务可能未启动，但不影响登录
        console.log("无法保存会话到后端，但登录继续:", err);
      }
      
      setAuthMessage("");
      console.log("显示应用界面");
      showAppUI(user.username);
    });
  } else {
    console.error("未找到登录表单！");
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await clearSession();
      } catch (err) {
        // 后端服务可能未启动，但不影响登出
        console.log("无法清除后端会话，但登出继续");
      }
      showLoginUI();
    });
  }
}

function initTableForDept(dept) {
  const table = document.querySelector(`.salary-table[data-dept="${dept}"]`);
  if (!table) return;
  const tbody = table.querySelector("tbody");
  if (tbody && tbody.children.length === 0) tbody.appendChild(createRow(dept));

  table.addEventListener("input", async (e) => {
    if (e.target.classList.contains("salary-input")) {
      const tr = e.target.closest("tr");
      if (tr) {
        await calcRowTotal(tr);
        await updateSummary();
      }
    }
  });
  table.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-remove")) {
      const tr = e.target.closest("tr");
      if (tr) {
        tr.remove();
        const tbodyNow = table.querySelector("tbody");
        if (tbodyNow && tbodyNow.children.length === 0) tbodyNow.appendChild(createRow(dept));
        updateSummary();
        savePayrollToLocal();
      }
    }
  });
}

function initTables() {
  departments.forEach((dept) => initTableForDept(dept));

  // 新增员工、清空部门：在 #panel-payroll 上事件委托，支持动态添加的车间
  const payroll = document.getElementById("panel-payroll");
  if (payroll) {
    payroll.addEventListener("click", (e) => {
      const btn = e.target.closest(".add-row");
      if (btn) {
        const dept = btn.dataset.dept;
        const table = document.querySelector(`.salary-table[data-dept="${dept}"]`);
        const tbody = table?.querySelector("tbody");
        if (tbody) tbody.appendChild(createRow(dept));
        return;
      }
      const clearBtn = e.target.closest(".clear-dept");
      if (clearBtn) {
        const dept = clearBtn.dataset.dept;
        const table = document.querySelector(`.salary-table[data-dept="${dept}"]`);
        const tbody = table?.querySelector("tbody");
        if (tbody) {
          tbody.innerHTML = "";
          tbody.appendChild(createRow(dept));
          updateSummary();
          savePayrollToLocal();
        }
      }
    });
  }
}

function getCurrentData() {
  const monthInput = document.getElementById("month-input-payroll") || document.getElementById("month-input");
  const monthValue = monthInput ? monthInput.value : "";

  const result = {
    month: monthValue,
    departments: {},
    deptLabels: { ...deptLabels },
  };

  departments.forEach((dept) => {
    const table = document.querySelector(`.salary-table[data-dept="${dept}"]`);
    if (!table) return;
    const rows = [];
    table.querySelectorAll("tbody tr").forEach((tr) => {
      const name = tr.querySelector('input[name="name"]')?.value.trim() || "";
      const attendanceDays = parseNumber(tr.querySelector('input[name="attendanceDays"]')?.value || 0);
      const baseSalary = parseNumber(tr.querySelector('input[name="baseSalary"]')?.value || 0);
      const overtimeDays = parseNumber(tr.querySelector('input[name="overtimeDays"]')?.value || 0);
      const overtimeSalary = parseNumber(tr.querySelector('input[name="overtimeSalary"]')?.value || 0);
      const bonus = parseNumber(tr.querySelector('input[name="bonus"]')?.value || 0);
      const socialSecuritySubsidy = parseNumber(tr.querySelector('input[name="socialSecuritySubsidy"]')?.value || 0);
      // 养老金、医疗保险、失业保险从社保金额中获取，不在表格中存储
      const pension = 0; // 实际值从社保金额获取
      const medical = 0; // 实际值从社保金额获取
      const unemployment = 0; // 实际值从社保金额获取
      const mealDeduction = parseNumber(tr.querySelector('input[name="mealDeduction"]')?.value || 0);
      const taxOrSupplement = parseNumber(tr.querySelector('input[name="taxOrSupplement"]')?.value || 0);
      
      // 如果整行都为空则跳过
      if (!name && !baseSalary && !overtimeSalary && !bonus && !socialSecuritySubsidy) return;
      
      const shouldPay = baseSalary + overtimeSalary + bonus + socialSecuritySubsidy;
      
      // 从社保金额获取养老金、医疗保险、失业保险（这里先设为0，实际值在calcRowTotal中计算）
      // 注意：在保存数据时，这些值会从社保金额中获取
      const actualPay = shouldPay - pension - medical - unemployment - mealDeduction - taxOrSupplement;
      
      rows.push({
        name,
        attendanceDays,
        baseSalary,
        overtimeDays,
        overtimeSalary,
        bonus,
        socialSecuritySubsidy,
        shouldPay,
        pension,
        medical,
        unemployment,
        mealDeduction,
        taxOrSupplement,
        actualPay: Math.max(0, actualPay)
      });
    });
    result.departments[dept] = rows;
  });

  return result;
}

async function loadData(data) {
  if (!data || typeof data !== "object") return;

  const monthInput = document.getElementById("month-input");
  const monthInputPayroll = document.getElementById("month-input-payroll");
  if (typeof data.month === "string") {
    if (monthInput) monthInput.value = data.month;
    if (monthInputPayroll) monthInputPayroll.value = data.month;
  }

  // 若有 deptLabels，先恢复动态车间和 departments 顺序
  if (data.deptLabels && typeof data.deptLabels === "object") {
    const keys = Object.keys(data.deptLabels);
    keys.forEach((k) => ensureDeptPanel(k, data.deptLabels[k]));
    departments = [...new Set([...departments, ...keys])];
  }

  if (!data.departments || typeof data.departments !== "object") return;

  const deptList = departments.length ? departments : Object.keys(data.departments);
  for (const dept of deptList) {
    const table = document.querySelector(`.salary-table[data-dept="${dept}"]`);
    if (!table) continue;
    const tbody = table.querySelector("tbody");
    if (!tbody) continue;
    tbody.innerHTML = "";

    const rows = Array.isArray(data.departments[dept]) ? data.departments[dept] : [];
    if (rows.length === 0) {
      tbody.appendChild(createRow(dept));
    } else {
      for (const row of rows) {
        const tr = createRow(dept);
        
        // 兼容旧格式数据
        if (row.base !== undefined || row.extra !== undefined) {
          // 旧格式：base, extra, bonus, deduction, total
          tr.querySelector('input[name="name"]').value = row.name || "";
          tr.querySelector('input[name="baseSalary"]').value = row.base != null ? row.base : "";
          tr.querySelector('input[name="overtimeSalary"]').value = row.extra != null ? row.extra : "";
          tr.querySelector('input[name="bonus"]').value = row.bonus != null ? row.bonus : "";
          // 应扣款字段已删除，养老金、医疗保险、失业保险从社保金额自动获取
          // 其他字段保持默认值0
        } else {
          // 新格式：包含所有新字段
          tr.querySelector('input[name="name"]').value = row.name || "";
          tr.querySelector('input[name="attendanceDays"]').value = row.attendanceDays != null ? row.attendanceDays : "";
          tr.querySelector('input[name="baseSalary"]').value = row.baseSalary != null ? row.baseSalary : "";
          tr.querySelector('input[name="overtimeDays"]').value = row.overtimeDays != null ? row.overtimeDays : "";
          tr.querySelector('input[name="overtimeSalary"]').value = row.overtimeSalary != null ? row.overtimeSalary : "";
          tr.querySelector('input[name="bonus"]').value = row.bonus != null ? row.bonus : "";
          tr.querySelector('input[name="socialSecuritySubsidy"]').value = row.socialSecuritySubsidy != null ? row.socialSecuritySubsidy : "";
          // 应扣款字段已删除，养老金、医疗保险、失业保险从社保金额自动获取，不需要手动设置
          tr.querySelector('input[name="mealDeduction"]').value = row.mealDeduction != null ? row.mealDeduction : "";
          tr.querySelector('input[name="taxOrSupplement"]').value = row.taxOrSupplement != null ? row.taxOrSupplement : "";
        }
        
        tbody.appendChild(tr);
        await calcRowTotal(tr);
      }
    }
  }

  await updateSummary();
}

async function savePayrollToLocal() {
  try {
    const data = getCurrentData();
    await api.savePayroll(data);
  } catch (_) {
    // ignore
  }
}

async function loadPayrollFromLocal() {
  try {
    const data = await api.getPayroll();
    if (data && Object.keys(data).length > 0) {
      loadData(data).catch(() => {});
    }
  } catch (_) {
    // ignore
  }
}

function ensureXLSXAvailable() {
  return typeof window !== "undefined" && window.XLSX;
}

// 显示密码输入对话框
function showPasswordPrompt(message = "该Excel文件受密码保护，请输入密码：") {
  return new Promise((resolve) => {
    const overlay = document.getElementById("custom-modal-overlay");
    const modalTitle = document.getElementById("modal-title");
    const modalMessage = document.getElementById("modal-message");
    const modalButtons = document.getElementById("modal-buttons");
    
    if (!overlay || !modalTitle || !modalMessage || !modalButtons) {
      // 如果DOM元素不存在，使用原生prompt
      const password = window.prompt(message);
      resolve(password || "");
      return;
    }
    
    // 创建密码输入框
    const passwordInput = document.createElement("input");
    passwordInput.type = "password";
    passwordInput.placeholder = "请输入密码";
    passwordInput.style.width = "100%";
    passwordInput.style.padding = "8px";
    passwordInput.style.marginTop = "12px";
    passwordInput.style.border = "1px solid #cbd5e1";
    passwordInput.style.borderRadius = "6px";
    passwordInput.style.fontSize = "14px";
    
    modalTitle.textContent = "密码保护";
    modalMessage.innerHTML = message;
    modalMessage.appendChild(passwordInput);
    modalButtons.innerHTML = `
      <button class="modal-btn modal-btn-secondary" id="modal-cancel-btn">取消</button>
      <button class="modal-btn modal-btn-primary" id="modal-confirm-btn">确定</button>
    `;
    
    overlay.style.display = "flex";
    
    // 自动聚焦到密码输入框
    setTimeout(() => passwordInput.focus(), 100);
    
    const confirmBtn = document.getElementById("modal-confirm-btn");
    const cancelBtn = document.getElementById("modal-cancel-btn");
    
    const closeModal = (result) => {
      overlay.style.display = "none";
      modalMessage.innerHTML = ""; // 清除密码输入框
      resolve(result);
    };
    
    const handleConfirm = () => {
      const password = passwordInput.value;
      closeModal(password);
    };
    
    const handleKeyPress = (e) => {
      if (e.key === "Enter") {
        handleConfirm();
      }
    };
    
    confirmBtn.addEventListener("click", handleConfirm);
    cancelBtn.addEventListener("click", () => closeModal(""));
    passwordInput.addEventListener("keypress", handleKeyPress);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeModal("");
      }
    });
  });
}

// 尝试读取Excel文件，如果遇到密码保护则提示用户
async function readExcelFileWithPassword(file, maxRetries = 3) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (evt) => {
      try {
        const data = evt.target.result;
        const wb = XLSX.read(data, { type: "array" });
        resolve(wb);
      } catch (err) {
        // 检查是否是密码保护错误
        const errorMsg = err.message || err.toString() || "";
        const isPasswordProtected = 
          errorMsg.includes("password") || 
          errorMsg.includes("Password") ||
          errorMsg.includes("密码") ||
          errorMsg.includes("encrypted") ||
          errorMsg.includes("Encrypted") ||
          errorMsg.includes("加密") ||
          errorMsg.includes("protected") ||
          errorMsg.includes("Protected");
        
        if (isPasswordProtected && maxRetries > 0) {
          // 提示用户输入密码
          const password = await showPasswordPrompt(
            "该Excel文件受密码保护。\n\n注意：当前系统无法直接读取密码保护的Excel文件。\n\n请先使用Excel软件打开文件并输入密码，然后另存为未加密的Excel文件（.xlsx格式），再重新上传。"
          );
          
          if (password) {
            // 即使输入了密码，SheetJS也无法使用密码读取
            // 所以提示用户先解密文件
            showAlert(
              "抱歉，当前系统无法直接读取密码保护的Excel文件。\n\n" +
              "请按以下步骤操作：\n" +
              "1. 使用Excel软件打开该文件并输入密码\n" +
              "2. 点击\"文件\" -> \"另存为\"\n" +
              "3. 在保存时不要设置密码保护\n" +
              "4. 保存后重新上传未加密的文件"
            );
            reject(new Error("文件受密码保护，需要先解密"));
          } else {
            reject(new Error("用户取消了密码输入"));
          }
        } else {
          // 其他错误或重试次数用完
          reject(err);
        }
      }
    };
    
    reader.onerror = (err) => {
      reject(new Error("读取文件失败：" + err));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

async function buildPayrollWorkbook(data) {
  const wb = XLSX.utils.book_new();
  
  let ssAmount = (await api.getSSAmount()) || {};
  if (!ssAmount || Object.keys(ssAmount).length === 0) {
    try { ssAmount = (typeof getSSAmount === "function" ? getSSAmount() : null) || {}; } catch (_) {}
  }
  const basePension = parseNumber(ssAmount.pension ?? ssAmount.养老金 ?? 0);
  const baseMedical = parseNumber(ssAmount.medical ?? ssAmount.医疗保险 ?? 0);
  const baseUnemployment = parseNumber(ssAmount.unemployment ?? ssAmount.失业保险 ?? 0);
  
  // 获取社保名单（与 calcRowTotal 相同：接口为空时回退到信息维护 DOM）
  let ssRaw = await api.getSSList();
  let _ssList = Array.isArray(ssRaw) ? ssRaw : (ssRaw && Array.isArray(ssRaw.list) ? ssRaw.list : []);
  if (_ssList.length === 0 && typeof getSSList === "function") {
    try { const dom = getSSList(); if (Array.isArray(dom) && dom.length) _ssList = dom; } catch (_) {}
  }
  const ssNames = new Set(
    _ssList
      .map((item) => normalizeNameForSS(String(item["姓名"] || item["name"] || item["名字"] || "")))
      .filter((n) => n)
  );

  const labels = data.deptLabels || deptLabels;
  const allRows = [];
  (Object.keys(data.departments || {})).forEach((dept) => {
    const rows = (data.departments && data.departments[dept]) || [];
    const deptName = labels[dept] || dept;
    rows.forEach((r) => {
      const employeeName = normalizeNameForSS(r.name || "");
      const hasSocialSecurity = employeeName && ssNames.has(employeeName) && !SS_EXCLUDED_FROM_PENSION_MEDICAL_UNEMPLOYMENT.has(employeeName);
      const pension = hasSocialSecurity ? basePension : 0;
      const medical = hasSocialSecurity ? baseMedical : 0;
      const unemployment = hasSocialSecurity ? baseUnemployment : 0;

      if (r.base !== undefined || r.extra !== undefined) {
        const shouldPay = (r.base ?? 0) + (r.extra ?? 0) + (r.bonus ?? 0);
        const actualPay = shouldPay - pension - medical - unemployment - (r.deduction ?? 0);
        allRows.push({
          部门: deptName,
          姓名: r.name || "",
          出勤天数: "",
          基本工资: r.base ?? 0,
          加班天数: "",
          加班工资: r.extra ?? 0,
          奖金: r.bonus ?? 0,
          社保补贴: "",
          应发工资: shouldPay,
          养老金: pension,
          医疗保险: medical,
          失业保险: unemployment,
          餐费代扣: r.deduction ?? 0,
          补缴个税: "",
          实发工资: Math.max(0, actualPay),
        });
      } else {
        const shouldPay = r.shouldPay ?? 0;
        const actualPay = shouldPay - pension - medical - unemployment - (r.mealDeduction ?? 0) - (r.taxOrSupplement ?? 0);
        allRows.push({
          部门: deptName,
          姓名: r.name || "",
          出勤天数: r.attendanceDays ?? 0,
          基本工资: r.baseSalary ?? 0,
          加班天数: r.overtimeDays ?? 0,
          加班工资: r.overtimeSalary ?? 0,
          奖金: r.bonus ?? 0,
          社保补贴: r.socialSecuritySubsidy ?? 0,
          应发工资: shouldPay,
          养老金: pension,
          医疗保险: medical,
          失业保险: unemployment,
          餐费代扣: r.mealDeduction ?? 0,
          补缴个税: r.taxOrSupplement ?? 0,
          实发工资: Math.max(0, Math.floor(actualPay)), // 与Python逻辑一致，转换为整数
        });
      }
    });
  });

  const wsAll = XLSX.utils.json_to_sheet(allRows);
  XLSX.utils.book_append_sheet(wb, wsAll, "工资单(汇总)");

  (Object.keys(data.departments || {})).forEach((dept) => {
    const rows = (data.departments && data.departments[dept]) || [];
    const deptName = labels[dept] || dept;
    const sheetRows = rows.map((r) => {
      const employeeName = normalizeNameForSS(r.name || "");
      const hasSocialSecurity = employeeName && ssNames.has(employeeName) && !SS_EXCLUDED_FROM_PENSION_MEDICAL_UNEMPLOYMENT.has(employeeName);
      const pension = hasSocialSecurity ? basePension : 0;
      const medical = hasSocialSecurity ? baseMedical : 0;
      const unemployment = hasSocialSecurity ? baseUnemployment : 0;
      
      // 兼容旧格式数据
      if (r.base !== undefined || r.extra !== undefined) {
        const shouldPay = (r.base ?? 0) + (r.extra ?? 0) + (r.bonus ?? 0);
        const actualPay = shouldPay - pension - medical - unemployment - (r.deduction ?? 0);
        return {
          姓名: r.name || "",
          出勤天数: "",
          基本工资: r.base ?? 0,
          加班天数: "",
          加班工资: r.extra ?? 0,
          奖金: r.bonus ?? 0,
          社保补贴: "",
          应发工资: shouldPay,
          养老金: pension,
          医疗保险: medical,
          失业保险: unemployment,
          餐费代扣: r.deduction ?? 0,
          补缴个税: "",
          实发工资: Math.max(0, actualPay),
        };
      } else {
        const shouldPay = r.shouldPay ?? 0;
        const actualPay = shouldPay - pension - medical - unemployment - (r.mealDeduction ?? 0) - (r.taxOrSupplement ?? 0);
        return {
          姓名: r.name || "",
          出勤天数: r.attendanceDays ?? 0,
          基本工资: r.baseSalary ?? 0,
          加班天数: r.overtimeDays ?? 0,
          加班工资: r.overtimeSalary ?? 0,
          奖金: r.bonus ?? 0,
          社保补贴: r.socialSecuritySubsidy ?? 0,
          应发工资: shouldPay,
          养老金: pension,
          医疗保险: medical,
          失业保险: unemployment,
          餐费代扣: r.mealDeduction ?? 0,
          补缴个税: r.taxOrSupplement ?? 0,
          实发工资: Math.max(0, actualPay),
        };
      }
    });
    const ws = XLSX.utils.json_to_sheet(sheetRows);
    XLSX.utils.book_append_sheet(wb, ws, deptName);
  });

  return wb;
}

function downloadWorkbook(wb, filename) {
  // XLSX.writeFile 会触发下载（浏览器端）
  XLSX.writeFile(wb, filename, { bookType: "xlsx" });
}

function normalizeHeaderKey(k) {
  return String(k || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[()（）]/g, "");
}

function coalesce(obj, keys, fallback = "") {
  for (const k of keys) {
    if (obj[k] != null && obj[k] !== "") return obj[k];
  }
  return fallback;
}

// 从行数据中提取应发工资（新格式 shouldPay 或 baseSalary+…，旧格式 base+extra+bonus）
function get应发(row) {
  if (row == null) return 0;
  if (row.shouldPay != null && Number.isFinite(row.shouldPay)) return row.shouldPay;
  if (row.baseSalary != null || row.base != null) {
    return parseNumber(row.baseSalary ?? row.base) + parseNumber(row.overtimeSalary ?? row.extra) + parseNumber(row.bonus) + parseNumber(row.socialSecuritySubsidy ?? 0);
  }
  return 0;
}

// 统一转为 loadData 可用的新格式（含 baseSalary、mealDeduction 等）
function toNewFormat(row) {
  if (!row) return {};
  if (row.baseSalary != null || (row.shouldPay != null && row.base == null)) {
    return {
      name: row.name || "",
      baseSalary: parseNumber(row.baseSalary) || 0,
      overtimeSalary: parseNumber(row.overtimeSalary) || 0,
      bonus: parseNumber(row.bonus) || 0,
      socialSecuritySubsidy: parseNumber(row.socialSecuritySubsidy) || 0,
      mealDeduction: parseNumber(row.mealDeduction) || 0,
      taxOrSupplement: parseNumber(row.taxOrSupplement) || 0,
      attendanceDays: parseNumber(row.attendanceDays) || 0,
      overtimeDays: parseNumber(row.overtimeDays) || 0,
    };
  }
  return {
    name: row.name || "",
    baseSalary: parseNumber(row.base) || 0,
    overtimeSalary: parseNumber(row.extra) || 0,
    bonus: parseNumber(row.bonus) || 0,
    socialSecuritySubsidy: 0,
    mealDeduction: parseNumber(row.deduction ?? row.mealDeduction) || 0,
    taxOrSupplement: parseNumber(row.taxOrSupplement) || 0,
    attendanceDays: parseNumber(row.attendanceDays) || 0,
    overtimeDays: parseNumber(row.overtimeDays) || 0,
  };
}

/**
 * 将导入的 deptRows 与当前表单数据按姓名合并：同人只保留一条，应发=现有应发+新应发，
 * 合并后放入本行对应的导入目标 tab，删除原所在部门的该条。用于清单/工资单/按部门分/自动计算/历史导入。
 *
 * 逻辑约定：
 * 1. 新员工（当前表单没有）：取导入的应发，toNewFormat 后走 loadData → calcRowTotal 计算逻辑。
 * 2. 已存在员工：应发 = 现有应发 + 本次导入应发，写入 baseSalary，overtime/bonus/subsidy 置 0，其余保留；
 *    合并结果走 loadData → calcRowTotal，用「新应发」统一再算养老/医疗/失业、实发等。
 */
function mergeImportedWithCurrent(current, importedDeptRows) {
  const byName = {};
  const cur = current?.departments || {};
  for (const dept of Object.keys(cur)) {
    const rows = cur[dept] || [];
    for (const row of rows) {
      const 姓名 = String(row?.name || "").trim();
      if (!姓名) continue;
      const 应发 = get应发(row);
      const existing = byName[姓名];
      if (existing) {
        const merged应发 = get应发(existing.rowData) + 应发;
        existing.rowData = toNewFormat(existing.rowData);
        existing.rowData.baseSalary = merged应发;
        existing.rowData.overtimeSalary = 0;
        existing.rowData.bonus = 0;
        existing.rowData.socialSecuritySubsidy = 0;
      } else {
        byName[姓名] = { dept, rowData: toNewFormat(row) };
      }
    }
  }
  const imp = importedDeptRows || {};
  for (const dept of Object.keys(imp)) {
    const rows = imp[dept] || [];
    for (const row of rows) {
      const 姓名 = String(row?.name || "").trim();
      if (!姓名) continue;
      const 应发 = get应发(row);
      const existing = byName[姓名];
      if (existing) {
        const merged应发 = get应发(existing.rowData) + 应发;
        existing.rowData.baseSalary = merged应发;
        existing.rowData.overtimeSalary = 0;
        existing.rowData.bonus = 0;
        existing.rowData.socialSecuritySubsidy = 0;
        existing.dept = dept; // 合并后放到本行对应的 tab（导入目标），并删除原条
      } else {
        byName[姓名] = { dept, rowData: toNewFormat(row) };
      }
    }
  }
  const deptRows = {};
  for (const 姓名 of Object.keys(byName)) {
    const o = byName[姓名];
    const d = o.dept;
    deptRows[d] = deptRows[d] || [];
    deptRows[d].push(o.rowData);
  }
  return deptRows;
}

function guessDeptByFilename(filename) {
  const name = String(filename || "").toLowerCase();
  // 关键字可按需扩展
  if (name.includes("注塑") || name.includes("injection")) return "injection";
  if (name.includes("五金") || name.includes("hardware")) return "hardware";
  if (name.includes("管理") || name.includes("admin") || name.includes("management"))
    return "management";
  return null;
}

async function chooseDeptInteractively(suggestedDeptKey) {
  const suggestedLabel = suggestedDeptKey ? deptLabels[suggestedDeptKey] : "";
  
  // 如果识别到了部门，用confirm确认
  if (suggestedDeptKey) {
    const ok = await showConfirm(
      `检测到可能的部门：${suggestedLabel}\n\n是否将本次数据导入到【${suggestedLabel}】？\n\n确定：按该部门导入\n取消：手动选择部门`,
      "确认部门"
    );
    if (ok) return suggestedDeptKey;
  }
  
  // 如果用户取消或未识别到，用三个confirm让用户选择
  const choice1 = await showConfirm("请选择要导入的部门：\n\n点击「确定」选择：注塑车间\n点击「取消」继续选择其他部门", "选择部门");
  if (choice1) return "injection";
  
  const choice2 = await showConfirm("请选择要导入的部门：\n\n点击「确定」选择：五金车间\n点击「取消」继续选择其他部门", "选择部门");
  if (choice2) return "hardware";
  
  const choice3 = await showConfirm("请选择要导入的部门：\n\n点击「确定」选择：管理人员\n点击「取消」继续选择其他部门或新建车间", "选择部门");
  if (choice3) return "management";
  
  // 用户取消了上述三个：提供「新建车间」选项
  const name = window.prompt("输入新车间名称（将新建一个并列的标签页存放数据）：");
  if (name && String(name).trim()) return addDepartment(String(name).trim());
  return null;
}

async function importPayrollFromWorkbook(wb, options = {}) {
  const trySheets = wb.SheetNames || [];
  const targetDeptKey =
    options && options.targetDeptKey && deptLabels[options.targetDeptKey]
      ? options.targetDeptKey
      : null;

  // 管理人员工资：不查找「清单」，直接取第一个 sheet，按 姓名 + 实际发放金额/应发工资 解析
  if (targetDeptKey === "management") {
    const firstSheet = trySheets[0];
    if (!firstSheet) {
      showAlert("导入失败：Excel 无 sheet。");
      return;
    }
    const ws = wb.Sheets[firstSheet];
    const range = ws["!ref"] ? XLSX.utils.decode_range(ws["!ref"]) : null;
    if (!range) {
      showAlert("导入失败：第一个 sheet 为空或无法读取范围。");
      return;
    }
    const NAME_HEADERS = new Set(["姓名", "name"]);
    const AMOUNT_HEADERS = new Set(["实际发放金额", "应发工资"]);
    const MEAL_KEYS = new Set(["餐费代扣", "扣款", "deduction"]);

    function getCellText(r, c) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (!cell) return "";
      const v = cell.w != null ? cell.w : cell.v;
      return String(v == null ? "" : v).trim();
    }

    let headerRow = -1, nameCol = -1, amountCol = -1, mealCol = -1, taxCol = -1;
    const scanRowEnd = Math.min(range.e.r, range.s.r + 14);
    for (let r = range.s.r; r <= scanRowEnd; r += 1) {
      let foundName = -1, foundAmount = -1;
      for (let c = range.s.c; c <= range.e.c; c += 1) {
        const t = normalizeHeaderKey(getCellText(r, c));
        if (!t) continue;
        if (foundName === -1 && NAME_HEADERS.has(t)) foundName = c;
        if (foundAmount === -1 && AMOUNT_HEADERS.has(t)) foundAmount = c;
      }
      if (foundName !== -1 && foundAmount !== -1) {
        headerRow = r;
        nameCol = foundName;
        amountCol = foundAmount;
        for (let c = range.s.c; c <= range.e.c; c += 1) {
          const t = normalizeHeaderKey(getCellText(r, c));
          if (mealCol === -1 && MEAL_KEYS.has(t)) mealCol = c;
          if (taxCol === -1 && t.indexOf("个税") >= 0) taxCol = c;
        }
        break;
      }
    }

    if (headerRow === -1) {
      showAlert("未导入到任何数据：第一个 sheet 中未找到表头「姓名」与「实际发放金额」/「应发工资」。");
      return;
    }

    const importedRows = [];
    for (let r = headerRow + 1; r <= range.e.r; r += 1) {
      const name = String(getCellText(r, nameCol)).trim();
      const 应发 = parseNumber(getCellText(r, amountCol));
      if (normalizeHeaderKey(name) === "合计") break;
      if (!name && 应发 <= 0) continue;
      const deduction = mealCol >= 0 ? parseNumber(getCellText(r, mealCol)) : 0;
      const taxOrSupplement = taxCol >= 0 ? parseNumber(getCellText(r, taxCol)) : 0;
      importedRows.push({
        name,
        base: Math.max(0, 应发),
        extra: 0,
        bonus: 0,
        deduction,
        total: Math.max(0, 应发 - deduction - taxOrSupplement),
        taxOrSupplement,
      });
    }

    if (importedRows.length === 0) {
      showAlert("未导入到任何数据：第一个 sheet 中在表头后未找到有效数据。");
      return;
    }

    const current = getCurrentData();
    const importedDeptRows = { [targetDeptKey]: importedRows };
    const merged = mergeImportedWithCurrent(current, importedDeptRows);
    await loadData({
      month: current.month,
      departments: merged,
      deptLabels: { ...deptLabels },
    });
    savePayrollToLocal();
    showAlert(
      `导入完成：从第一个 sheet（管理人员格式）导入 ${importedRows.length} 行到【管理人员】；若姓名已存在则已合并应发并归入本 tab。\n\n若未扣社保：请在「信息维护-社保名单」中添加上述员工，并在「社保金额」中填写养老金、医疗、失业保险；姓名需与工资表一致。`
    );
    return;
  }

  // 特殊格式：用户提供的 “清单” sheet，仅对应一个车间（由调用方决定导入到哪个部门）
  const qingdanSheetName = trySheets.find(
    (n) => normalizeHeaderKey(n) === normalizeHeaderKey("清单")
  );

  if (qingdanSheetName) {
    const finalDeptKey = targetDeptKey || "hardware";
    const ws = wb.Sheets[qingdanSheetName];
    // 你的“清单”sheet 上方通常有大标题/合并单元格，
    // sheet_to_json 有时会导致表头识别不稳定，因此这里改为：扫描表格找到“姓名/金额”列的列号再逐行读取。
    const importedRows = [];
    const range = ws["!ref"] ? XLSX.utils.decode_range(ws["!ref"]) : null;
    if (!range) {
      showAlert("导入失败：该 Excel 的「清单」sheet 为空或无法读取范围。");
      return;
    }

    const NAME_HEADERS = new Set(["姓名", "操作工", "name"]);
    const AMOUNT_HEADERS = new Set(["金额", "合计金额元", "合计金额", "total"]);

    function getCellText(r, c) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (!cell) return "";
      const v = cell.w != null ? cell.w : cell.v;
      return String(v == null ? "" : v).trim();
    }

    let headerRow = -1;
    let nameCol = -1;
    let amountCol = -1;

    // 在前 15 行里找表头（足够覆盖你的标题行）
    const scanRowEnd = Math.min(range.e.r, range.s.r + 14);
    for (let r = range.s.r; r <= scanRowEnd; r += 1) {
      let foundName = -1;
      let foundAmount = -1;
      for (let c = range.s.c; c <= range.e.c; c += 1) {
        const t = normalizeHeaderKey(getCellText(r, c));
        if (!t) continue;
        if (foundName === -1 && NAME_HEADERS.has(t)) foundName = c;
        if (foundAmount === -1 && AMOUNT_HEADERS.has(t)) foundAmount = c;
      }
      if (foundName !== -1 && foundAmount !== -1) {
        headerRow = r;
        nameCol = foundName;
        amountCol = foundAmount;
        break;
      }
    }

    if (headerRow === -1) {
    showAlert(
      "未导入到任何数据：已找到「清单」sheet，但未能定位表头「姓名/金额」（可能表头被合并或文字不同）。"
    );
      return;
    }

    // 从表头下一行开始读取，直到遇到“合计”等停止（或读到末尾）
    for (let r = headerRow + 1; r <= range.e.r; r += 1) {
      const nameRaw = getCellText(r, nameCol);
      const amountRaw = getCellText(r, amountCol);
      const name = String(nameRaw).trim();
      const stopKey = normalizeHeaderKey(name);
      if (stopKey === "合计") break;

      const total = parseNumber(amountRaw);
      if (!name && !total) continue;

      const safeTotal = Math.max(0, total);
      importedRows.push({
        name,
        base: safeTotal,
        extra: 0,
        bonus: 0,
        deduction: 0,
        total: safeTotal,
      });
    }

    if (importedRows.length === 0) {
      showAlert(
        "未导入到任何数据：已找到「清单」sheet，但没有识别到「姓名/金额（或 操作工/合计金额元）」列，或行数据为空。"
      );
      return;
    }

    // 与当前表单按姓名合并：同人应发相加，放入本行对应的 tab，删除原条；合并后 loadData → calcRowTotal 统一走计算逻辑
    const current = getCurrentData();
    const importedDeptRows = { [finalDeptKey]: importedRows };
    const merged = mergeImportedWithCurrent(current, importedDeptRows);

    await loadData({
      month: current.month,
      departments: merged,
      deptLabels: { ...deptLabels },
    });
    savePayrollToLocal();
    showAlert(
      `导入完成：从"清单"sheet 导入 ${importedRows.length} 行到【${deptLabels[finalDeptKey]}】；若姓名已存在则已合并应发并归入本 tab。`
    );
    return;
  }

  // 通用格式：
  // 1) "工资单(汇总)" sheet：含 部门/姓名/基本工资/加班计件收入/奖金/扣款 或新格式的所有字段
  // 2) 各部门 sheet：sheet 名即部门中文名
  // 若出现新车间，会自动 addDepartment 并创建并列页
  const deptRows = {};

  const sheetNameAll =
    trySheets.find(
      (n) => normalizeHeaderKey(n) === normalizeHeaderKey("工资单(汇总)")
    ) ||
    trySheets.find(
      (n) => normalizeHeaderKey(n) === normalizeHeaderKey("工资单汇总")
    );

  function pushRow(deptKey, row) {
    const name = String(coalesce(row, ["姓名", "name"], "")).trim();
    // 管理人员等格式：仅有 姓名 + 实际发放金额（实际发放金额=应发工资）
    const 应发FromCol = parseNumber(coalesce(row, ["实际发放金额", "应发工资"], 0));
    if (应发FromCol > 0 && name) {
      deptRows[deptKey] = deptRows[deptKey] || [];
      const mealDeduction = parseNumber(coalesce(row, ["餐费代扣", "扣款", "deduction"], 0));
      const taxOrSupplement = parseNumber(coalesce(row, ["补缴/个税", "补缴个税", "个税"], 0));
      deptRows[deptKey].push({
        name,
        attendanceDays: 0,
        baseSalary: 应发FromCol,
        overtimeDays: 0,
        overtimeSalary: 0,
        bonus: 0,
        socialSecuritySubsidy: 0,
        shouldPay: 应发FromCol,
        mealDeduction,
        taxOrSupplement,
        actualPay: Math.max(0, 应发FromCol - mealDeduction - taxOrSupplement),
      });
      return;
    }
    // 检查是否是新格式（包含"出勤天数"或"实发工资"字段）
    const hasNewFormat = row["出勤天数"] !== undefined || row["实发工资"] !== undefined ||
                         row["加班天数"] !== undefined || row["养老金"] !== undefined;

    if (hasNewFormat) {
      // 新格式：读取所有新字段
      const attendanceDays = parseNumber(coalesce(row, ["出勤天数"], 0));
      const baseSalary = parseNumber(coalesce(row, ["基本工资", "base"], 0));
      const overtimeDays = parseNumber(coalesce(row, ["加班天数"], 0));
      const overtimeSalary = parseNumber(coalesce(row, ["加班工资", "加班计件收入", "加班/计件收入"], 0));
      const bonus = parseNumber(coalesce(row, ["奖金", "岗位绩效奖金", "bonus"], 0));
      const socialSecuritySubsidy = parseNumber(coalesce(row, ["社保补贴"], 0));
      // 应扣款字段已删除，养老金、医疗保险、失业保险从社保金额获取
      const mealDeduction = parseNumber(coalesce(row, ["餐费代扣"], 0));
      const taxOrSupplement = parseNumber(coalesce(row, ["补缴/个税", "补缴个税", "个税"], 0));
      
      // 计算应发工资和实发工资
      const shouldPay = baseSalary + overtimeSalary + bonus + socialSecuritySubsidy;
      // 养老金、医疗保险、失业保险从社保金额获取（在calcRowTotal中计算）
      const actualPay = shouldPay - mealDeduction - taxOrSupplement;
      
      if (!name && !baseSalary && !overtimeSalary && !bonus && !socialSecuritySubsidy) return;
      
      deptRows[deptKey].push({
        name,
        attendanceDays,
        baseSalary,
        overtimeDays,
        overtimeSalary,
        bonus,
        socialSecuritySubsidy,
        shouldPay,
        mealDeduction,
        taxOrSupplement,
        actualPay: Math.max(0, actualPay)
      });
    } else {
      // 旧格式：兼容处理
      const base = parseNumber(coalesce(row, ["基本工资", "base"], 0));
      const extra = parseNumber(
        coalesce(
          row,
          ["加班计件收入", "加班/计件收入", "加班补贴", "extra"],
          0
        )
      );
      const bonus = parseNumber(
        coalesce(row, ["奖金", "岗位绩效奖金", "bonus"], 0)
      );
      // 应扣款字段已删除，旧格式的deduction作为餐费代扣处理
      const mealDeduction = parseNumber(coalesce(row, ["扣款", "deduction", "餐费代扣"], 0));
      if (!name && !base && !extra && !bonus && !mealDeduction) return;
      const shouldPay = base + extra + bonus;
      // 养老金、医疗保险、失业保险从社保金额获取（在calcRowTotal中计算）
      const total = Math.max(0, shouldPay - mealDeduction);
      deptRows[deptKey].push({ name, base, extra, bonus, mealDeduction, total });
    }
  }

  if (sheetNameAll) {
    const ws = wb.Sheets[sheetNameAll];
    const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
    json.forEach((row) => {
      const deptLabel = String(coalesce(row, ["部门", "dept"], "")).trim();
      if (!deptLabel) return;
      let deptKey = deptLabelToKey[deptLabel];
      if (!deptKey) deptKey = addDepartment(deptLabel);
      deptRows[deptKey] = deptRows[deptKey] || [];
      pushRow(deptKey, row);
    });
  } else {
    trySheets.forEach((name) => {
      const label = String(name).trim();
      if (!label) return;
      let deptKey = deptLabelToKey[label];
      if (!deptKey) deptKey = addDepartment(label);
      deptRows[deptKey] = deptRows[deptKey] || [];
      const ws = wb.Sheets[name];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
      json.forEach((row) => pushRow(deptKey, row));
    });
  }

  const importedCount = Object.keys(deptRows).reduce((s, k) => s + (deptRows[k]?.length || 0), 0);
  if (importedCount === 0) {
    showAlert(
      "未导入到任何数据：未找到可识别的 sheet（清单/工资单(汇总)/注塑车间/五金车间/管理人员等），或表头不匹配。"
    );
    return;
  }

  const monthInput = document.getElementById("month-input");
  const monthValue = monthInput ? monthInput.value : "";
  const merged = mergeImportedWithCurrent(getCurrentData(), deptRows);

  loadData({
    month: monthValue,
    departments: merged,
    deptLabels: { ...deptLabels },
  }).then(() => {
    savePayrollToLocal();
  }).catch(() => {});
  showAlert(`导入完成：共导入 ${importedCount} 行；若姓名已在表单中则已合并应发并归入本行对应的 tab。`);
}

function initExportImport() {
  const exportExcelBtn = document.getElementById("btn-export-excel");
  const importExcelInput = document.getElementById("file-import-excel");

  if (exportExcelBtn) {
    exportExcelBtn.addEventListener("click", () => {
      if (!ensureXLSXAvailable()) {
        showAlert("Excel 功能不可用：未加载 XLSX 库（请确认有网络，或稍后重试）。");
        return;
      }
      const data = getCurrentData();
      buildPayrollWorkbook(data).then((wb) => {
        const month = data.month || "未设置月份";
        downloadWorkbook(wb, `工资单_${month}.xlsx`);
      });
    });
  }

  if (importExcelInput) {
    // label包裹input时，点击label会自动触发input，不需要手动添加事件
    importExcelInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!ensureXLSXAvailable()) {
        showAlert("Excel 功能不可用：未加载 XLSX 库（请确认有网络，或稍后重试）。");
        importExcelInput.value = "";
        return;
      }

      // 先根据文件名猜测部门，再询问用户确认/选择
      const guessedDeptKey = guessDeptByFilename(file.name);
      chooseDeptInteractively(guessedDeptKey).then((chosenDeptKey) => {
        if (!chosenDeptKey) {
          importExcelInput.value = "";
          return;
        }

        readExcelFileWithPassword(file).then(async (wb) => {
          await importPayrollFromWorkbook(wb, { targetDeptKey: chosenDeptKey });
        }).catch((err) => {
          if (err.message && !err.message.includes("用户取消了")) {
            showAlert("导入失败：无法读取该 Excel 文件。\n错误：" + err.message);
          }
        }).finally(() => {
          importExcelInput.value = "";
        });
      });
    });
  }

  // 自动计算工资功能
  const autoCalculateInput = document.getElementById("file-auto-calculate");
  if (autoCalculateInput) {
    // label包裹input时，点击label会自动触发input，不需要手动添加事件
    autoCalculateInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!ensureXLSXAvailable()) {
        showAlert("Excel 功能不可用：未加载 XLSX 库（请确认有网络，或稍后重试）。");
        autoCalculateInput.value = "";
        return;
      }

      // 先根据文件名判断车间，弹出确认框
      const guessedDeptKey = guessDeptByFilename(file.name);
      chooseDeptInteractively(guessedDeptKey).then((chosenDeptKey) => {
        if (!chosenDeptKey) {
          autoCalculateInput.value = "";
          return;
        }

        // 管理人员：不查清单，直接走“导入”逻辑（第一个 sheet，姓名+实际发放金额）
        if (chosenDeptKey === "management") {
          readExcelFileWithPassword(file).then(async (wb) => {
            await importPayrollFromWorkbook(wb, { targetDeptKey: "management" });
          }).catch((err) => {
            if (err.message && !err.message.includes("用户取消了")) {
              showAlert("导入失败：无法读取该 Excel 文件。\n错误：" + err.message);
            }
          }).finally(() => {
            autoCalculateInput.value = "";
          });
          return;
        }

        readExcelFileWithPassword(file).then(async (wb) => {
          // 检查是否有调整金额sheet
          const sheetNames = wb.SheetNames || [];
          const hasAdjustSheet = sheetNames.some(n => normalizeHeaderKey(n) === normalizeHeaderKey("调整金额"));
          
          if (!hasAdjustSheet) {
            // 询问用户是否需要上传额外的调整金额Excel
            const needAdjust = await showConfirm(
              "⚠️ 当前Excel文件中未找到「调整金额」sheet。\n\n是否需要上传额外的调整金额Excel文件？\n\n确定：上传调整金额文件\n取消：继续计算（不使用调整金额）",
              "提示"
            );
            
            if (needAdjust) {
              // 创建临时的文件输入元素用于上传调整金额
              const adjustInput = document.createElement("input");
              adjustInput.type = "file";
              adjustInput.accept = ".xlsx,.xls";
              adjustInput.style.display = "none";
              
              adjustInput.addEventListener("change", async (e) => {
                const adjustFile = e.target.files && e.target.files[0];
                if (!adjustFile) {
                  // 用户取消选择，直接使用原文件计算（无调整金额）
                  document.body.removeChild(adjustInput);
                  autoCalculateInput.value = "";
                  await autoCalculateSalary(wb, chosenDeptKey);
                  return;
                }
                
                if (!ensureXLSXAvailable()) {
                  showAlert("Excel 功能不可用：未加载 XLSX 库（请确认有网络，或稍后重试）。");
                  document.body.removeChild(adjustInput);
                  autoCalculateInput.value = "";
                  return;
                }
                
                readExcelFileWithPassword(adjustFile).then(async (adjustWb) => {
                  const adjustSheetNames = adjustWb.SheetNames || [];
                  const foundAdjustSheet = adjustSheetNames.find(n => normalizeHeaderKey(n) === normalizeHeaderKey("调整金额"));
                  
                  if (!foundAdjustSheet) {
                    showAlert("调整金额Excel文件中未找到「调整金额」sheet，将不使用调整金额继续计算。");
                    document.body.removeChild(adjustInput);
                    autoCalculateInput.value = "";
                    await autoCalculateSalary(wb, chosenDeptKey);
                    return;
                  }
                  
                  // 将调整金额sheet合并到主工作簿
                  wb.SheetNames.push(foundAdjustSheet);
                  wb.Sheets[foundAdjustSheet] = adjustWb.Sheets[foundAdjustSheet];
                  
                  document.body.removeChild(adjustInput);
                  autoCalculateInput.value = "";
                  await autoCalculateSalary(wb, chosenDeptKey);
                }).catch((err) => {
                  showAlert("读取调整金额Excel文件失败：\n错误：" + err.message + "\n\n将不使用调整金额继续计算。");
                  document.body.removeChild(adjustInput);
                  autoCalculateInput.value = "";
                  autoCalculateSalary(wb, chosenDeptKey);
                });
              });
              
              document.body.appendChild(adjustInput);
              adjustInput.click();
              // 注意：这里不重置autoCalculateInput.value，等调整金额文件处理完再重置
              return;
            }
          }
          
          // 有调整金额sheet或用户选择不上传，直接计算
          autoCalculateInput.value = "";
          await autoCalculateSalary(wb, chosenDeptKey);
        }).catch((err) => {
          if (err.message && !err.message.includes("用户取消了")) {
            showAlert("自动计算失败：无法读取该 Excel 文件。\n错误：" + err.message);
          }
          autoCalculateInput.value = "";
        });
      }).catch(() => {
        autoCalculateInput.value = "";
      });
    });
  }
}

// ---------------- 自动计算工资（基于Python逻辑） ----------------
async function autoCalculateSalary(wb, targetDeptKey = null) {
  const sheetNames = wb.SheetNames || [];
  
  // 1. 读取"清单"sheet：操作工、合计金额元
  const qingdanSheet = sheetNames.find(n => normalizeHeaderKey(n) === normalizeHeaderKey("清单"));
  if (!qingdanSheet) {
    showAlert("自动计算失败：未找到「清单」sheet。");
    return;
  }
  
  // 2. 从网页的"社保名单维护"页面读取社保名单（不再从Excel读取）
  const ssList = getSSList();
  const ssNames = new Set(
    ssList
      .map(item => String(item["姓名"] || "").trim())
      .filter(name => name)
  );
  
  if (ssNames.size === 0) {
    const confirm = await showConfirm(
      "⚠️ 当前社保名单为空。\n\n是否继续计算？\n\n确定：继续计算（所有员工都不扣除社保）\n取消：先去「社保名单维护」页面添加社保员工",
      "提示"
    );
    if (!confirm) {
      return;
    }
  }
  
  // 3. 从网页的"社保金额"页面读取社保金额（不再从Excel读取）
  const ssAmount = getSSAmount();
  const baseSalary = parseNumber(ssAmount.baseSalary || 0);
  const pension = parseNumber(ssAmount.pension || 0);
  const medical = parseNumber(ssAmount.medical || 0);
  const unemployment = parseNumber(ssAmount.unemployment || 0);
  
  if (baseSalary === 0 || (pension === 0 && medical === 0 && unemployment === 0)) {
    const confirm = await showConfirm(
      "⚠️ 社保金额未设置或为0。\n\n是否继续计算？\n\n确定：继续计算（使用当前设置的社保金额）\n取消：先去「信息维护-社保金额」页面设置社保金额",
      "提示"
    );
    if (!confirm) {
      return;
    }
  }
  
  // 4. 读取"调整金额"sheet（可选）
  const adjustSheet = sheetNames.find(n => normalizeHeaderKey(n) === normalizeHeaderKey("调整金额"));
  
  try {
    // 解析"清单"sheet（操作工、合计金额元）- 使用稳定的逐行扫描方法
    const wsQingdan = wb.Sheets[qingdanSheet];
    const range = wsQingdan["!ref"] ? XLSX.utils.decode_range(wsQingdan["!ref"]) : null;
    if (!range) {
      showAlert("自动计算失败：该 Excel 的「清单」sheet 为空或无法读取范围。");
      return;
    }
    
    const NAME_HEADERS = new Set(["姓名", "操作工", "name"]);
    const AMOUNT_HEADERS = new Set(["金额", "合计金额元", "合计金额", "total"]);
    
    function getCellText(ws, r, c) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (!cell) return "";
      const v = cell.w != null ? cell.w : cell.v;
      return String(v == null ? "" : v).trim();
    }
    
    let headerRow = -1;
    let nameCol = -1;
    let amountCol = -1;
    
    // 在前 15 行里找表头
    const scanRowEnd = Math.min(range.e.r, range.s.r + 14);
    for (let r = range.s.r; r <= scanRowEnd; r += 1) {
      let foundName = -1;
      let foundAmount = -1;
      for (let c = range.s.c; c <= range.e.c; c += 1) {
        const t = normalizeHeaderKey(getCellText(wsQingdan, r, c));
        if (!t) continue;
        if (foundName === -1 && NAME_HEADERS.has(t)) foundName = c;
        if (foundAmount === -1 && AMOUNT_HEADERS.has(t)) foundAmount = c;
      }
      if (foundName !== -1 && foundAmount !== -1) {
        headerRow = r;
        nameCol = foundName;
        amountCol = foundAmount;
        break;
      }
    }
    
    if (headerRow === -1) {
      showAlert("自动计算失败：在「清单」sheet中未找到表头「姓名/金额」（或 操作工/合计金额元）。");
      return;
    }
    
    // 从表头下一行开始读取，直到遇到"合计"等停止
    const employeeList = [];
    for (let r = headerRow + 1; r <= range.e.r; r += 1) {
      const nameRaw = getCellText(wsQingdan, r, nameCol);
      const amountRaw = getCellText(wsQingdan, r, amountCol);
      const name = String(nameRaw).trim();
      const stopKey = normalizeHeaderKey(name);
      if (stopKey === "合计") break;
      
      const total = parseNumber(amountRaw);
      if (!name || total <= 0) continue;
      
      employeeList.push({
        操作工: name,
        合计金额元: total
      });
    }
    
    if (employeeList.length === 0) {
      showAlert("自动计算失败：在「清单」sheet中未找到有效的员工数据。");
      return;
    }
    
    // 社保名单和社保金额已从网页读取（见上方代码）
    
    // 解析"调整金额"sheet（操作工、合计金额元）
    const adjustMap = new Map();
    if (adjustSheet) {
      const wsAdjust = wb.Sheets[adjustSheet];
      const adjustJson = XLSX.utils.sheet_to_json(wsAdjust, { defval: "" });
      adjustJson.forEach(row => {
        const name = String(coalesce(row, ["操作工", "姓名", "name"], "")).trim();
        const amount = parseNumber(coalesce(row, ["合计金额元", "金额", "合计金额"], 0));
        if (name && name !== "合计" && amount !== 0) {
          adjustMap.set(name, amount);
        }
      });
    }
    
    // 如果调用方已经指定了部门，直接使用；否则根据sheet名称或标题猜测部门
    let finalTargetDeptKey = targetDeptKey;
    if (!finalTargetDeptKey) {
      const guessedFromSheet = guessDeptByFilename(qingdanSheet);
      const guessedFromTitle = guessDeptByFilename(wb.Props?.Title || "");
      const guessedDeptKey = guessedFromSheet || guessedFromTitle;
      
      // 询问用户确认部门（无论是否识别到，都让用户确认）
      const userChoice = await chooseDeptInteractively(guessedDeptKey);
      if (!userChoice) {
        showAlert("已取消自动计算：未选择目标部门。");
        return;
      }
      finalTargetDeptKey = userChoice;
    }
    
    // 计算每个员工的工资详情（完全按照Python逻辑）
    const calculatedRows = employeeList.map(emp => {
      const name = emp.操作工;
      const salary = emp.合计金额元;
      
      // 判断是否在社保名单中且需扣养老/医疗/失业（排除王静如等特例）
      const hasSocialSecurity = ssNames.has(name) && !SS_EXCLUDED_FROM_PENSION_MEDICAL_UNEMPLOYMENT.has(normalizeNameForSS(name));
      const socialSecurity1 = hasSocialSecurity ? pension : 0;
      const socialSecurity2 = hasSocialSecurity ? medical : 0;
      const socialSecurity3 = hasSocialSecurity ? unemployment : 0;
      
      // 获取调整金额
      const adjustValue = adjustMap.get(name) || 0;
      
      // 根据Python逻辑计算各项（完全按照Python代码逻辑）
      let commutingAmount, overtimeSalary, bonus, finalBaseSalary;
      
      if (salary > 7000) {
        commutingAmount = 22;
        overtimeSalary = 7000 - baseSalary;
        bonus = salary - 7000;
        finalBaseSalary = baseSalary;
      } else if (salary > baseSalary) {
        commutingAmount = 22;
        overtimeSalary = salary - baseSalary;
        bonus = 0;
        finalBaseSalary = baseSalary;
      } else {
        // Python: commuting_amount = salary // (baseSalary / 22)
        commutingAmount = Math.floor(salary / (baseSalary / 22));
        finalBaseSalary = salary;
        overtimeSalary = 0;
        bonus = 0;
      }
      
      // 计算加班天数（Python: overtime_amm = calcualte_overtime_amm(overtimeSalary) = min(4, overtimeSalary // 188)）
      const overtimeDays = Math.min(4, Math.floor(overtimeSalary / 188));
      
      // 应发工资 = 原工资（salary）
      const shouldPay = salary;
      
      // 实发工资 = 应发工资 - 各种保险 + 调整金额（Python: true_value = salary - (social_security1 + social_security2 + social_security3) + adjust_value）
      // 前端计算逻辑：actualPay = shouldPay - pension - medical - unemployment - mealDeduction - taxOrSupplement
      // 所以 taxOrSupplement = -adjustValue（这样减去负数等于加上正数，减去正数等于加上负数）
      const actualPay = shouldPay - (socialSecurity1 + socialSecurity2 + socialSecurity3) + adjustValue;
      
      // 使用新格式的数据结构
      return {
        name,
        attendanceDays: commutingAmount,  // 出勤天数
        baseSalary: finalBaseSalary,      // 基本工资
        overtimeDays: overtimeDays,       // 加班天数
        overtimeSalary: overtimeSalary,  // 加班工资
        bonus: bonus,                     // 补贴（bonus）
        socialSecuritySubsidy: 0,         // 社保补贴（Python代码中没有，设为0）
        shouldPay: shouldPay,             // 应发工资
        mealDeduction: 0,                 // 餐费代扣（Python代码中没有，设为0）
        taxOrSupplement: -adjustValue,    // 补缴/个税（调整金额取负，因为前端是减去这个值）
        actualPay: Math.max(0, Math.floor(actualPay))  // 实发工资（Python中转换为int）
      };
    });
    
    // 与当前表单按姓名合并：同人应发相加，归入本 tab，删除原条
    const current = getCurrentData();
    const merged = mergeImportedWithCurrent(current, { [finalTargetDeptKey]: calculatedRows });

    await loadData({
      month: current.month,
      departments: merged,
      deptLabels: { ...deptLabels },
    });
    await savePayrollToLocal();
    
    // 自动切换到计算后的部门标签页（动态部门：dept-{key}）
    const targetPanelId = "dept-" + finalTargetDeptKey;
    const tabButton = document.querySelector(`#panel-payroll .tab-button[data-target="${targetPanelId}"]`);
    if (tabButton) tabButton.click();
    
    const ssCount = ssNames.size;
    showAlert(
      `✅ 自动计算完成！\n` +
      `已从"清单"sheet读取 ${calculatedRows.length} 名员工\n` +
      `已计算并导入到【${deptLabels[finalTargetDeptKey]}】\n` +
      `社保名单：从网页"信息维护-社保名单"读取（共 ${ssCount} 人）\n` +
      `社保金额：从网页"信息维护-社保金额"读取\n` +
      `（已考虑社保扣除和调整金额）`
    );
    
  } catch (err) {
    showAlert("自动计算失败：处理Excel数据时出错。\n错误：" + err.message);
    console.error(err);
  }
}

// ---------------- 社保名单维护 ----------------
function createSSRow() {
  const options = Object.values(deptLabels)
    .map((l) => `<option value="${l}">${l}</option>`)
    .join("");
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input class="salary-input" name="ss_name" placeholder="姓名" /></td>
    <td>
      <select class="salary-input" name="ss_dept" style="text-align:left;max-width:160px">
        <option value="">请选择</option>
        ${options}
      </select>
    </td>
    <td><input class="salary-input" name="ss_type" placeholder="如：五险/五险一金" style="text-align:left;max-width:180px" /></td>
    <td><input class="salary-input" name="ss_note" placeholder="备注" style="text-align:left;max-width:240px" /></td>
    <td><button class="icon-btn ss-remove" title="删除">删除</button></td>
  `;
  return tr;
}

function getSSList() {
  const table = document.getElementById("ss-table");
  if (!table) return [];
  const rows = [];
  table.querySelectorAll("tbody tr").forEach((tr) => {
    const name = tr.querySelector('[name="ss_name"]').value.trim();
    const dept = tr.querySelector('[name="ss_dept"]').value.trim();
    const type = tr.querySelector('[name="ss_type"]').value.trim();
    const note = tr.querySelector('[name="ss_note"]').value.trim();
    if (!name && !dept && !type && !note) return;
    rows.push({ 姓名: name, 部门: dept, 社保类型: type, 备注: note });
  });
  return rows;
}

async function saveSSListToLocal() {
  try {
    await api.saveSSList(getSSList());
  } catch (_) {
    // ignore
  }
  // 保存社保名单后刷新工资表，使 管理人员 等表格的养老/医疗/失业按最新名单重算
  updateSummary().catch(() => {});
}

async function loadSSListFromLocal() {
  const table = document.getElementById("ss-table");
  if (!table) return;
  const tbody = table.querySelector("tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  let rows = [];
  try {
    rows = await api.getSSList();
  } catch (_) {
    rows = [];
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    tbody.appendChild(createSSRow());
    return;
  }

  // 确保社保名单中的部门在 deptLabels 中（便于下拉选项与新建车间一致）
  rows.forEach((r) => {
    if (r["部门"] && !deptLabelToKey[r["部门"]]) addDepartment(r["部门"]);
  });

  rows.forEach((r) => {
    const tr = createSSRow();
    tr.querySelector('[name="ss_name"]').value = r["姓名"] || "";
    tr.querySelector('[name="ss_dept"]').value = r["部门"] || "";
    tr.querySelector('[name="ss_type"]').value = r["社保类型"] || "";
    tr.querySelector('[name="ss_note"]').value = r["备注"] || "";
    tbody.appendChild(tr);
  });
}

function initSocialSecurityPage() {
  const table = document.getElementById("ss-table");
  const addBtn = document.getElementById("ss-add-row");
  const clearBtn = document.getElementById("ss-clear");
  const exportBtn = document.getElementById("ss-export-excel");
  const importInput = document.getElementById("ss-import-excel");

  if (!table) return;
  loadSSListFromLocal();

  table.addEventListener("input", (e) => {
    const el = e.target;
    if (el && el.classList && el.classList.contains("salary-input")) {
      saveSSListToLocal();
    }
  });

  table.addEventListener("click", (e) => {
    const el = e.target;
    if (el && el.classList && el.classList.contains("ss-remove")) {
      const tr = el.closest("tr");
      if (tr) tr.remove();
      const tbody = table.querySelector("tbody");
      if (tbody && tbody.children.length === 0) tbody.appendChild(createSSRow());
      saveSSListToLocal();
    }
  });

  if (addBtn) {
    addBtn.addEventListener("click", () => {
      const tbody = table.querySelector("tbody");
      if (!tbody) return;
      tbody.appendChild(createSSRow());
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      const tbody = table.querySelector("tbody");
      if (!tbody) return;
      tbody.innerHTML = "";
      tbody.appendChild(createSSRow());
      saveSSListToLocal();
    });
  }

  if (exportBtn) {
    // 支持新的图标按钮结构（label包裹button）
    const exportLabel = exportBtn.closest(".icon-btn-label");
    if (exportLabel) {
      exportLabel.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!ensureXLSXAvailable()) {
          showAlert("Excel 功能不可用：未加载 XLSX 库（请确认有网络，或稍后重试）。");
          return;
        }
        const rows = getSSList();
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "社保名单");
        downloadWorkbook(wb, "社保名单.xlsx");
      });
      // 阻止button的默认行为，避免重复触发
      exportBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    } else {
      // 兼容旧结构
      exportBtn.addEventListener("click", () => {
        if (!ensureXLSXAvailable()) {
          showAlert("Excel 功能不可用：未加载 XLSX 库（请确认有网络，或稍后重试）。");
          return;
        }
        const rows = getSSList();
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "社保名单");
        downloadWorkbook(wb, "社保名单.xlsx");
      });
    }
  }

  if (importInput) {
    // label包裹input时，点击label会自动触发input，不需要手动添加事件
    importInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!ensureXLSXAvailable()) {
        showAlert("Excel 功能不可用：未加载 XLSX 库（请确认有网络，或稍后重试）。");
        importInput.value = "";
        return;
      }
      readExcelFileWithPassword(file).then(async (wb) => {
        const sheetNames = wb.SheetNames || [];
          
          // 先尝试作为社保名单格式导入
          let normalized = [];
          let isPayrollFormat = false;
          
          // 检查是否是工资单格式（包含"养老金"字段）
          // 先遍历所有sheet，检查是否有"养老金"字段
          for (const sheetName of sheetNames) {
            const ws = wb.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
            if (json.length === 0) continue;
            
            // 检查第一行是否有"养老金"字段（支持多种列名变体）
            const firstRow = json[0];
            const hasPension = Object.keys(firstRow).some(key => {
              const normalizedKey = normalizeHeaderKey(key);
              // 支持多种养老金列名变体
              return normalizedKey.includes("养老金") || 
                     normalizedKey === "pension" ||
                     normalizedKey.includes("pension");
            });
            
            if (hasPension) {
              isPayrollFormat = true;
              break; // 找到工资单格式，标记后跳出
            }
          }
          
          // 如果是工资单格式，遍历所有sheet提取有养老金的员工
          if (isPayrollFormat) {
            for (const sheetName of sheetNames) {
              const ws = wb.Sheets[sheetName];
              const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
              if (json.length === 0) continue;
              
              json.forEach((row) => {
                // 更灵活地查找姓名字段
                let name = "";
                for (const key of Object.keys(row)) {
                  const normalizedKey = normalizeHeaderKey(key);
                  if (normalizedKey === "姓名" || normalizedKey === "name" || normalizedKey.includes("姓名")) {
                    name = String(row[key] || "").trim();
                    break;
                  }
                }
                
                // 更灵活地查找部门字段
                let dept = "";
                for (const key of Object.keys(row)) {
                  const normalizedKey = normalizeHeaderKey(key);
                  if (normalizedKey === "部门" || normalizedKey === "dept" || normalizedKey.includes("部门")) {
                    dept = String(row[key] || "").trim();
                    break;
                  }
                }
                
                // 更灵活地查找养老金字段（支持多种列名）
                let pension = 0;
                for (const key of Object.keys(row)) {
                  const normalizedKey = normalizeHeaderKey(key);
                  if (normalizedKey.includes("养老金") || normalizedKey === "pension") {
                    const value = row[key];
                    pension = parseNumber(value);
                    break;
                  }
                }
                
                // 如果姓名不为空且养老金大于0，则加入社保名单
                if (name && name !== "合计" && name !== "合计金额" && pension > 0) {
                  // 检查是否已存在（避免重复，按姓名去重）
                  const exists = normalized.find(r => r.姓名 === name);
                  if (!exists) {
                    // 尝试从sheet名称推断部门（如果行数据中没有部门信息）
                    let finalDept = dept;
                    if (!finalDept) {
                      const deptKey = deptLabelToKey[sheetName];
                      if (deptKey) {
                        finalDept = deptLabels[deptKey];
                      }
                    }
                    
                    normalized.push({
                      姓名: name,
                      部门: finalDept || "",
                      社保类型: "五险",
                      备注: "从历史工资单导入",
                    });
                  }
                }
              });
            }
          }
          
          // 如果不是工资单格式，按原来的社保名单格式处理
          if (!isPayrollFormat) {
            const firstSheetName = sheetNames[0];
            if (!firstSheetName) throw new Error("no sheet");
            const ws = wb.Sheets[firstSheetName];
            const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
            // 允许表头为：姓名/部门/社保类型/备注（或英文 key）
            normalized = json
              .map((r) => ({
                姓名: String(coalesce(r, ["姓名", "name"], "")).trim(),
                部门: String(coalesce(r, ["部门", "dept"], "")).trim(),
                社保类型: String(coalesce(r, ["社保类型", "type"], "")).trim(),
                备注: String(coalesce(r, ["备注", "note"], "")).trim(),
              }))
              .filter((r) => r.姓名 || r.部门 || r.社保类型 || r.备注);
          }
          
          // 合并到现有社保名单（避免覆盖）
          const existingList = await api.getSSList();
          const existingNames = new Set(existingList.map(r => r.姓名));
          
          // 只添加不存在的记录
          normalized.forEach((newItem) => {
            if (newItem.姓名 && !existingNames.has(newItem.姓名)) {
              existingList.push(newItem);
              existingNames.add(newItem.姓名);
            }
          });
          
          await api.saveSSList(existingList);
          await loadSSListFromLocal();
          
          if (isPayrollFormat) {
            const addedCount = normalized.length;
            if (addedCount === 0) {
              showAlert(`⚠️ 检测到工资单格式，但未找到有养老金的员工。\n\n可能原因：\n1. 工资单中"养老金"列名为空或为0\n2. 工资单格式特殊，无法识别列名\n3. 所有员工都已存在于社保名单中\n\n请检查Excel文件中的"养老金"列是否有数据。`);
            } else {
              showAlert(`✅ 已从历史工资单导入 ${addedCount} 名有养老金的员工到社保名单。`);
            }
          } else {
            if (normalized.length === 0) {
              showAlert(`⚠️ 未导入任何记录。\n\n可能原因：\n1. Excel文件为空或格式不正确\n2. 表头不匹配（需要：姓名/部门/社保类型/备注，或包含"养老金"列的工资单）\n3. 所有数据行都为空\n\n请检查Excel文件格式。`);
            } else {
              showAlert(`✅ 已导入 ${normalized.length} 条社保名单记录。`);
            }
          }
        }).catch((err) => {
          if (err.message && !err.message.includes("用户取消了")) {
            showAlert("导入失败：无法读取该 Excel 文件或表头不匹配。\n错误：" + err.message);
          }
        }).finally(() => {
          importInput.value = "";
        });
    });
  }
}

// ---------------- 社保金额维护 ----------------
function getSSAmount() {
  return {
    baseSalary: parseNumber(document.getElementById("ss-amount-base")?.value || 0),
    pension: parseNumber(document.getElementById("ss-amount-pension")?.value || 0),
    medical: parseNumber(document.getElementById("ss-amount-medical")?.value || 0),
    unemployment: parseNumber(document.getElementById("ss-amount-unemployment")?.value || 0),
  };
}

async function saveSSAmountToLocal() {
  try {
    const amount = getSSAmount();
    await api.saveSSAmount(amount);
  } catch (_) {
    // ignore
  }
  // 保存社保金额后刷新工资表，使 管理人员 等表格的养老/医疗/失业按最新金额重算
  updateSummary().catch(() => {});
}

async function loadSSAmountFromLocal() {
  try {
    const amount = await api.getSSAmount();
    if (!amount || Object.keys(amount).length === 0) return;
    if (document.getElementById("ss-amount-base")) {
      document.getElementById("ss-amount-base").value = amount.baseSalary || "";
    }
    if (document.getElementById("ss-amount-pension")) {
      document.getElementById("ss-amount-pension").value = amount.pension || "";
    }
    if (document.getElementById("ss-amount-medical")) {
      document.getElementById("ss-amount-medical").value = amount.medical || "";
    }
    if (document.getElementById("ss-amount-unemployment")) {
      document.getElementById("ss-amount-unemployment").value = amount.unemployment || "";
    }
  } catch (_) {
    // ignore
  }
}

function initSocialAmountPage() {
  loadSSAmountFromLocal();
  
  // 监听输入变化，自动保存
  const inputs = [
    document.getElementById("ss-amount-base"),
    document.getElementById("ss-amount-pension"),
    document.getElementById("ss-amount-medical"),
    document.getElementById("ss-amount-unemployment"),
  ];
  
  inputs.forEach((input) => {
    if (input) {
      input.addEventListener("input", () => {
        saveSSAmountToLocal();
      });
    }
  });
}

// ---------------- 历史工资单 ----------------
async function getHistoryStore() {
  try {
    const json = await api.getHistory();
    if (!json || typeof json !== "object") return {};
    return json;
  } catch (_) {
    return {};
  }
}

async function setHistoryStore(data) {
  try {
    // 保存所有月份的数据
    for (const [month, monthData] of Object.entries(data)) {
      await api.saveHistory(month, monthData);
    }
  } catch (_) {
    // ignore
  }
}

async function renderHistoryList() {
  const container = document.getElementById("history-list");
  if (!container) return;

  // 获取历史工资单数据
  const store = await getHistoryStore();
  
  // 获取当前部门工资数据，检查是否有月份数据
  const currentPayroll = await api.getPayroll();
  const allMonths = new Set(Object.keys(store));
  
  // 如果当前部门工资有月份且有数据，也加入到历史工资单列表中（支持动态车间）
  if (currentPayroll && currentPayroll.month) {
    const hasData = Object.keys(currentPayroll.departments || {}).some(
      (k) => (currentPayroll.departments[k]?.length || 0) > 0
    );
    if (hasData) {
      const historyData = await api.getHistoryByMonth(currentPayroll.month);
      const historyCount = Object.keys(historyData?.departments || {}).reduce(
        (s, k) => s + (historyData.departments[k]?.length || 0),
        0
      );
      if (!historyData || historyCount === 0) {
        store[currentPayroll.month] = currentPayroll;
      }
      allMonths.add(currentPayroll.month);
    }
  }
  
  const months = Array.from(allMonths).sort().reverse();

  if (months.length === 0) {
    container.classList.add("history-list-empty");
    container.textContent = "暂无历史记录，可先选择月份并“从当前界面保存为该月工资单”。";
    return;
  }

  container.classList.remove("history-list-empty");
  container.innerHTML = "";

  // 使用 for...of 循环以支持异步操作
  for (const m of months) {
    const item = store[m];
    if (!item) continue;
    
    const card = document.createElement("div");
    card.className = "history-card";
    const totalCount = Object.keys(item.departments || {}).reduce(
      (s, k) => s + (item.departments[k]?.length || 0),
      0
    );
    
    // 判断是否来自当前部门工资（未保存到历史）
    const historyData = await api.getHistoryByMonth(m);
    const isFromCurrentPayroll = currentPayroll && currentPayroll.month === m && !historyData;
    const sourceLabel = isFromCurrentPayroll ? '<span style="color: #64748b; font-size: 12px;">（来自部门工资）</span>' : '';
    
    card.innerHTML = `
      <div class="history-card-main">
        <div class="history-card-title">${m}${sourceLabel}</div>
        <div class="history-card-meta">
          员工条目：${totalCount} 条
        </div>
      </div>
      <div class="history-card-actions">
        <button class="btn secondary btn-history-load" data-month="${m}">加载到当月</button>
        <button class="btn secondary btn-history-export-excel" data-month="${m}">导出Excel</button>
        <button class="btn danger btn-history-delete" data-month="${m}">删除</button>
      </div>
    `;
    container.appendChild(card);
  }
}

async function saveCurrentToHistoryForMonth(month) {
  if (!month) {
    showAlert("请先在左侧选择要保存的「工资月份」。");
    return;
  }
  const data = getCurrentData();
  data.month = month;
  await api.saveHistory(month, data);
  await renderHistoryList();
  showAlert(`已将当前界面工资数据保存为【${month}】的历史工资单。`);
}

// 从Excel文件名中提取月份（格式：工资单_2025-11.xlsx 或 历史工资单_2025-11.xlsx）
function extractMonthFromFilename(filename) {
  const match = filename.match(/(\d{4})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }
  return null;
}

// 导入Excel到历史工资单
async function importExcelToHistory(wb, month) {
  if (!month) {
    showAlert("无法确定月份，请确保文件名包含月份信息（如：工资单_2025-11.xlsx）。");
    return;
  }

  if (!ensureXLSXAvailable()) {
    showAlert("Excel 功能不可用：未加载 XLSX 库（请确认有网络，或稍后重试）。");
    return;
  }

  const trySheets = wb.SheetNames || [];
  const deptRows = {};

  // 查找"工资单(汇总)"sheet
  const sheetNameAll =
    trySheets.find(
      (n) => normalizeHeaderKey(n) === normalizeHeaderKey("工资单(汇总)")
    ) ||
    trySheets.find(
      (n) => normalizeHeaderKey(n) === normalizeHeaderKey("工资单汇总")
    );

  const SKIP_SHEETS = new Set(
    ["清单", "调整金额", "工资单(汇总)", "工资单汇总"].map((n) => normalizeHeaderKey(n))
  );

  function pushRow(deptKey, row) {
    const name = String(coalesce(row, ["姓名", "name"], "")).trim();
    // 管理人员格式：姓名 + 实际发放金额（=应发工资）
    const 应发FromCol = parseNumber(coalesce(row, ["实际发放金额", "应发工资"], 0));
    if (应发FromCol > 0 && name) {
      deptRows[deptKey] = deptRows[deptKey] || [];
      deptRows[deptKey].push({
        name,
        base: 应发FromCol,
        extra: 0,
        bonus: 0,
        deduction: 0,
        total: Math.max(0, 应发FromCol),
      });
      return;
    }
    const base = parseNumber(coalesce(row, ["基本工资", "base"], 0));
    const extra = parseNumber(
      coalesce(
        row,
        ["加班计件收入", "加班/计件收入", "加班补贴", "extra"],
        0
      )
    );
    const bonus = parseNumber(
      coalesce(row, ["奖金", "岗位绩效奖金", "bonus"], 0)
    );
    const deduction = parseNumber(coalesce(row, ["扣款", "deduction"], 0));
    if (!name && !base && !extra && !bonus && !deduction) return;
    const total = Math.max(0, base + extra + bonus - deduction);
    deptRows[deptKey] = deptRows[deptKey] || [];
    deptRows[deptKey].push({ name, base, extra, bonus, deduction, total });
  }

  if (sheetNameAll) {
    // 从汇总sheet读取（遇到新车间则 addDepartment 并新建标签页）
    const ws = wb.Sheets[sheetNameAll];
    const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
    json.forEach((row) => {
      const deptLabel = String(coalesce(row, ["部门", "dept"], "")).trim();
      if (!deptLabel) return;
      let deptKey = deptLabelToKey[deptLabel];
      if (!deptKey) deptKey = addDepartment(deptLabel);
      pushRow(deptKey, row);
    });
  } else {
    // 尝试按部门分 sheet：sheet 名即部门名，遇到新车间则 addDepartment
    trySheets.forEach((name) => {
      if (SKIP_SHEETS.has(normalizeHeaderKey(name))) return;
      const label = String(name).trim();
      if (!label) return;
      let deptKey = deptLabelToKey[label];
      if (!deptKey) deptKey = addDepartment(label);
      const ws = wb.Sheets[name];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
      json.forEach((row) => pushRow(deptKey, row));
    });
  }

  const importedCount = Object.keys(deptRows).reduce(
    (s, k) => s + (deptRows[k]?.length || 0),
    0
  );

  if (importedCount === 0) {
    showAlert(
      "未导入到任何数据：未找到可识别的 sheet（工资单(汇总)/部门名 sheet），或表头不匹配。"
    );
    return;
  }

  // 同人合并：仅在同一导入内按姓名合并应发，归入本行对应的 tab，每人一条
  const merged = mergeImportedWithCurrent({ departments: {} }, deptRows);

  // 保存到历史工资单（覆盖该月数据，含 deptLabels 以支持动态车间）
  const store = await getHistoryStore();
  store[month] = {
    month: month,
    departments: merged,
    deptLabels: { ...deptLabels },
  };
  await setHistoryStore(store);
  renderHistoryList();

  showAlert(`✅ 导入完成！已覆盖【${month}】的历史工资单，共导入 ${importedCount} 条员工记录；若同一人在多部门出现则已合并应发并归入对应 tab。`);
}

function initHistoryPanel() {
  const listContainer = document.getElementById("history-list");

  if (listContainer) {
    listContainer.addEventListener("click", async (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const month = target.dataset.month;
      if (!month) return;

      // 获取数据：优先从历史工资单获取，如果没有则从部门工资获取
      const store = await getHistoryStore();
      let item = store[month];
      if (!item) {
        // 尝试从部门工资获取
        const currentPayroll = await api.getPayroll();
        if (currentPayroll && currentPayroll.month === month) {
          item = currentPayroll;
        }
      }
      if (!item) return;

      if (target.classList.contains("btn-history-load")) {
        await loadData(item);
        const currentMonthInput = document.getElementById("month-input");
        const monthInputPayroll = document.getElementById("month-input-payroll");
        if (currentMonthInput) currentMonthInput.value = month;
        if (monthInputPayroll) monthInputPayroll.value = month;
        await updateSummary();
        
        // 保存到部门工资
        await savePayrollToLocal();
        
        // 切换到部门工资页面
        const payrollBtn = document.querySelector('[data-main-target="panel-payroll"]');
        if (payrollBtn) {
          payrollBtn.click();
        }
        
        showAlert(`已将【${month}】的工资单加载到当月界面。`);
      } else if (target.classList.contains("btn-history-export-excel")) {
        if (!ensureXLSXAvailable()) {
          showAlert("Excel 功能不可用：未加载 XLSX 库（请确认有网络，或稍后重试）。");
          return;
        }
        buildPayrollWorkbook(item).then((wb) => {
          downloadWorkbook(wb, `历史工资单_${month}.xlsx`);
        });
      } else if (target.classList.contains("btn-history-delete")) {
        const totalCount = Object.keys(item.departments || {}).reduce(
          (s, k) => s + (item.departments[k]?.length || 0),
          0
        );
        const ok = await showConfirm(
          `确定要删除【${month}】的历史工资单吗？\n\n这将删除该月所有车间的全部数据（共 ${totalCount} 条员工记录）。\n\n此操作不可恢复！`,
          "确认删除"
        );
        if (!ok) return;
        
        // 删除历史工资单
        await api.deleteHistory(month);
        
        // 检查部门工资中保存的数据，如果月份匹配则清空（支持动态车间：清空所有已知部门）
        const currentPayroll = await api.getPayroll();
        if (currentPayroll && currentPayroll.month === month) {
          const emptyData = {
            month: month,
            departments: Object.fromEntries(departments.map((k) => [k, []])),
          };
          await loadData(emptyData);
          await savePayrollToLocal();
          await updateSummary();
        }
        
        // 重新渲染历史工资单列表
        await renderHistoryList();
        
        showAlert(`已删除【${month}】的历史工资单${currentPayroll && currentPayroll.month === month ? '，并已清空部门工资中该月的数据' : ''}。`);
      }
    });
  }

  // 导入Excel功能
  const historyImportInput = document.getElementById("file-history-import-excel");
  if (historyImportInput) {
    historyImportInput.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      
      if (!ensureXLSXAvailable()) {
        showAlert("Excel 功能不可用：未加载 XLSX 库（请确认有网络，或稍后重试）。");
        historyImportInput.value = "";
        return;
      }

      // 从文件名提取月份
      let month = extractMonthFromFilename(file.name);
      
      // 如果无法从文件名提取，让用户输入月份
      if (!month) {
        const monthInput = prompt("无法从文件名识别月份，请输入月份（格式：2025-11）：");
        if (!monthInput) {
          historyImportInput.value = "";
          return;
        }
        // 验证月份格式
        const monthMatch = monthInput.match(/^(\d{4})-(\d{2})$/);
        if (!monthMatch) {
          showAlert("月份格式不正确，请输入格式：2025-11");
          historyImportInput.value = "";
          return;
        }
        month = monthInput;
      }

      // 如果该月份已有数据，询问是否覆盖
      const store = await getHistoryStore();
      if (store[month]) {
        const ok = await showConfirm(
          `【${month}】已存在历史工资单，导入后将覆盖原有数据。\n\n确定：覆盖\n取消：取消导入`,
          "确认覆盖"
        );
        if (!ok) {
          historyImportInput.value = "";
          return;
        }
      }

      readExcelFileWithPassword(file).then(async (wb) => {
        await importExcelToHistory(wb, month);
      }).catch((err) => {
        if (err.message && !err.message.includes("用户取消了")) {
          showAlert("导入失败：无法读取该 Excel 文件。\n错误：" + err.message);
        }
      }).finally(() => {
        historyImportInput.value = "";
      });
    });
  }

  renderHistoryList();
}

document.addEventListener("DOMContentLoaded", () => {
  initAuth();

  initPrimaryPanels();
  initTabs();
  initTables();
  updateSummary();
  initExportImport();
  initSocialSecurityPage();
  initSocialAmountPage();
  initHistoryPanel();
  initCollapsibleSections();
  
  // 同步两个月份输入框
  const monthInput = document.getElementById("month-input");
  const monthInputPayroll = document.getElementById("month-input-payroll");
  if (monthInput && monthInputPayroll) {
    // 切换月份时，先保存当前月份数据，再加载新月份数据
    const handleMonthChange = async (newMonth, oldMonth, isInitialLoad = false) => {
      if (oldMonth && !isInitialLoad) {
        const currentData = getCurrentData();
        const hasData = Object.keys(currentData.departments || {}).some(
          (k) => (currentData.departments[k]?.length || 0) > 0
        );
        if (currentData.month && hasData) {
          await api.saveHistory(currentData.month, currentData);
        }
      }
      
      const monthData = await api.getHistoryByMonth(newMonth);
      if (monthData) {
        await loadData(monthData);
        await updateSummary();
      } else if (!isInitialLoad) {
        const emptyData = {
          month: newMonth,
          departments: Object.fromEntries(departments.map((k) => [k, []])),
        };
        await loadData(emptyData);
        await updateSummary();
      }
      
      // 更新当前工资单的月份
      await savePayrollToLocal();
    };
    
    // 先加载本地保存的当前工资单
    loadPayrollFromLocal();
    
    // 如果当前月份有历史数据，加载历史数据（覆盖本地数据）
    const currentMonth = monthInputPayroll.value || monthInput.value;
    if (currentMonth) {
      api.getHistoryByMonth(currentMonth).then(async monthData => {
        if (monthData) {
          await loadData(monthData);
          await updateSummary();
        }
      }).catch(() => {});
    }
    
    let oldMonthValue = monthInput.value;
    monthInput.addEventListener("change", () => {
      const newMonth = monthInput.value;
      monthInputPayroll.value = newMonth;
      handleMonthChange(newMonth, oldMonthValue);
      oldMonthValue = newMonth;
    });
    
    let oldMonthValuePayroll = monthInputPayroll.value;
    monthInputPayroll.addEventListener("change", () => {
      const newMonth = monthInputPayroll.value;
      monthInput.value = newMonth;
      handleMonthChange(newMonth, oldMonthValuePayroll);
      oldMonthValuePayroll = newMonth;
    });
  } else {
    // 如果没有月份输入框，直接加载本地数据
    loadPayrollFromLocal();
  }

  // 默认展开子菜单
  const payrollSubmenu = document.getElementById("payroll-submenu");
  const payrollParent = document.querySelector(".sidebar-nav-parent");
  if (payrollSubmenu && payrollParent) {
    payrollSubmenu.classList.add("expanded");
    payrollParent.classList.add("expanded");
  }

  // 保存当月工资记录按钮
  const savePayrollHistoryBtn = document.getElementById("btn-save-payroll-history");
  if (savePayrollHistoryBtn) {
    savePayrollHistoryBtn.addEventListener("click", () => {
      const monthInputPayroll = document.getElementById("month-input-payroll");
      const month = monthInputPayroll ? monthInputPayroll.value : "";
      if (!month) {
        showAlert("请先选择结算月份。");
        return;
      }
      saveCurrentToHistoryForMonth(month);
      // 切换到历史工资单页面
      const historyBtn = document.querySelector('[data-main-target="panel-history"]');
      if (historyBtn) {
        historyBtn.click();
      }
    });
  }

  // 任意修改后自动保存（工资单）
  document.addEventListener("input", (e) => {
    const el = e.target;
    if (!el) return;
    if (el.id === "month-input" || el.id === "month-input-payroll") savePayrollToLocal();
    if (el.classList && el.classList.contains("salary-input")) savePayrollToLocal();
  });
});

