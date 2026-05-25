# lead-wealth

个人记账与财务诊断系统的核心实现源代码。下一步计划用 Swift/SwiftUI 重写为 iOS App,本仓库作为业务逻辑与数据模型的参考实现。

## 文件说明

```
lead-wealth/
├── app.html              # 单文件应用,包含全部 UI、业务逻辑与数据模型
└── cloud-sync-api/       # Cloudflare Pages Functions 后端(可选,多端同步用)
    ├── index.js          # GET 拉取 / PUT 覆写
    └── push.js           # POST 增量合并(union by record key)
```

## 核心功能

- 收支记录(类别 / 金额 / 必要性 / 动机 / 购物子类)
- 资产与被动收入源管理
- 戴维斯三杀(Davis Triple Kill)实时财务诊断
  - KILL 1: 资产消耗
  - KILL 2: 被动收入抵消率下滑
  - KILL 3: 财务自由天数倒推
- 月度 / 年度汇总
- 历史回顾与数据导入导出

## 数据模型

主要 schema(参考 `app.html` 中 `STORAGE_KEY = 'lumen_data'`):

```js
{
  expenses: [{ id, date, amount, category, necessity, motivation, sub_category, note, created_at }],
  incomes:  [{ id, date, amount, source, note, created_at }],
  assets:   { total, updated_at },
  passive_sources: [{ name, monthly_amount }],
  first_record_date: 'YYYY-MM-DD',
  deleted_ids: [...]   // 墓碑列表,跨端同步用
}
```

## 部署 cloud-sync-api(可选)

1. Cloudflare Pages 项目绑定本仓库
2. 创建 KV namespace,绑定变量名 `LUMEN_DATA`
3. 设置环境变量 `SYNC_TOKEN` 为任意密钥
4. `app.html` 第 1503 行 `SYNC_TOKEN` 改为同值

API:

```
GET  /sync?token=...           # 拉取
PUT  /sync?token=...           # 覆写
POST /sync/push?token=...      # 智能合并
```
