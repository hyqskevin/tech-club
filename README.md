# Tech Club 技术俱乐部

一个基于 NestJS + React 的技术俱乐部社区平台，支持帖子讨论、活动管理、成员管理等功能。

## 功能特性

- **帖子系统**：技术分享、问题求助、经验交流，支持图片上传、采纳回复
- **活动管理**：活动创建、编辑、上下架、删除，支持封面图与详细图集
- **成员管理**：用户注册、角色权限控制（管理员/普通用户）
- **权限控制**：基于角色的访问控制，支持帖子/回复的编辑删除权限

## 技术栈

### 后端
- **框架**: NestJS 10
- **数据库**: 腾讯云 PostgreSQL (CloudBase RDB)，统一通过 CloudBase 服务端访问
- **认证**: 基于 nickname + phone 的身份验证
- **测试**: Jest + Supertest

### 前端
- **框架**: React 19 + Vite 7
- **UI**: Radix UI + Tailwind CSS 4
- **状态管理**: Zustand
- **表单**: React Hook Form + Zod
- **路由**: React Router DOM
- **HTTP**: Axios + TanStack Query

## 项目结构

```
tech-club/
├── server/                 # 后端代码
│   ├── common/            # 公共模块（常量、过滤器、接口）
│   ├── database/          # 数据库适配器（CloudBase RDB / CloudBase ExecutePGSql）
│   ├── modules/           # 业务模块
│   │   ├── community/     # 社区模块（帖子、回复、成员）
│   │   └── activities/    # 活动模块
│   ├── app.module.ts      # 主模块
│   └── main.ts            # 入口文件
├── client/                # 前端代码
│   ├── src/
│   │   ├── api/           # API 接口（api-service.ts）
│   │   ├── components/    # UI 组件（含 shadcn/ui）
│   │   ├── hooks/         # 自定义 Hooks
│   │   ├── pages/         # 页面组件
│   │   └── types/         # 类型定义
├── shared/                # 前后端共享类型
├── functions/             # 腾讯云 CloudBase 云函数（api / sql-exec）
└── skills/                # 项目内置 AI 技能说明
```

## 快速开始

### 环境要求

- Node.js >= 22.0.0
- npm >= 10.0.0

### 安装依赖

```bash
npm install
```

### 开发模式

同时启动前后端服务：

```bash
npm run dev
```

单独启动：

```bash
npm run dev:server  # 后端服务，默认端口 3000（可通过 SERVER_PORT 修改）
npm run dev:client  # 前端服务，默认端口 3001（可通过 VITE_PORT 修改）
```

### 生产构建

```bash
npm run build
```

### 测试

```bash
npm test              # 运行所有单元/Jest 测试
npm run test:e2e      # 仅运行 e2e 测试
npm run e2e:browser   # 浏览器端到端冒烟（依赖 Playwright）
```

### 常用脚本

```bash
npm run admin:create      # 同步默认管理员到数据库（依赖 PG 直连）
npm run type:check        # 前后端 TypeScript 类型检查
npm run lint              # 仓库自定义 lint（脚本聚合 ESLint + Stylelint）
npm run stylelint         # 仅样式检查
```

### 代码检查

```bash
npm run eslint     # ESLint 检查
npm run format     # Prettier 格式化
```

## API 接口

### 帖子接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/posts` | 查询帖子列表 |
| GET | `/api/posts/:id` | 查询帖子详情 |
| POST | `/api/posts` | 创建帖子 |
| PUT | `/api/posts/:id` | 更新帖子 |
| DELETE | `/api/posts/:id` | 删除帖子 |

### 回复接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/posts/:postId/replies` | 查询帖子回复 |
| POST | `/api/posts/:postId/replies` | 创建回复 |
| PUT | `/api/replies/:id` | 更新回复 |
| DELETE | `/api/replies/:id` | 删除回复 |
| PUT | `/api/replies/:id/adopt` | 采纳回复 |

### 成员接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/members` | 查询成员列表 |
| GET | `/api/members/:id` | 查询成员详情 |
| POST | `/api/members` | 创建成员 |
| POST | `/api/members/upsert` | 创建或更新成员 |
| PUT | `/api/members/:id` | 更新成员 |
| DELETE | `/api/members/:id` | 删除成员 |

### 活动接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/activities` | 查询活动列表 |
| GET | `/api/activities/latest` | 查询最新活动 |
| GET | `/api/activities/:id` | 查询活动详情 |
| POST | `/api/activities` | 创建活动 |
| PUT | `/api/activities/:id` | 更新活动 |
| DELETE | `/api/activities/:id` | 删除活动 |

## 权限说明

- **普通用户**：可以创建帖子、回复帖子、编辑/删除自己的帖子和回复
- **管理员**：可以编辑/删除任何帖子和回复，管理活动

## 配置说明

项目使用 `.env` 文件进行配置（**不要提交真实凭据**）。仓库根目录提供 `.env.example` 作为模板，请复制为 `.env` 再填写：

```bash
cp .env.example .env
```

`.env.example` 内含全部变量及中文说明，主要分以下几类：

| 类别 | 关键变量 | 说明 |
|------|---------|------|
| 服务器 | `SERVER_HOST` / `SERVER_PORT` | 后端监听地址与端口（默认 `localhost:3000`） |
| 数据库 | `DATABASE_URL` / `DB_ADAPTER` / `DB_SCHEMA` | 连接串、适配器类型（`pg` 或留空）、schema |
| CloudBase | `CLOUDBASE_ENV_ID` / `CLOUDBASE_APIKEY` / `CLOUDBASE_TOKEN` | 腾讯云 CloudBase 环境与凭据 |
| 腾讯云 API | `TENCENTCLOUD_SECRETID` / `TENCENTCLOUD_SECRETKEY` / `TENCENTCLOUD_REGION` | sql-exec 云函数签名用 |
| 管理员 | `ADMIN_NICKNAME` / `ADMIN_PHONE` | `npm run admin:create` 用 |
| 上传 | `PUBLIC_UPLOAD_BASE_URL` | 拼接上传文件外链 |
| 日志 | `LOG_REQUEST_BODY` / `LOG_RESPONSE_BODY` | 开发期打印请求/响应体 |
| Vite | `VITE_HOST` / `VITE_PORT` / `VITE_API_URL` | 前端 dev server 及后端代理目标 |

> ⚠️ **端口对齐**：本地默认后端 `3000`、Vite `3001`，`VITE_API_URL=http://127.0.0.1:3000`。如果你改了 `SERVER_PORT`，记得同步修改 `.env` 里的 `VITE_API_URL`，否则前端代理会指错地址。

## 数据库

### CloudBase（生产环境）

项目默认使用腾讯云 CloudBase RDB 作为生产数据库，支持自动配置。

### 数据库适配器选择

通过 `.env` 中的 `DB_ADAPTER` 切换两种实现：

- **`pg`**：走腾讯云 CloudBase 的 ExecutePGSql（详见 `server/database/pg-direct-adapter.ts`，内部类名 `CloudBasePgAdapter`），schema 由 `DB_SCHEMA` 控制（默认 `tech_hub`）。**注意**：这不是 PostgreSQL 直连，所有 SQL 都经腾讯云网关中转。
- 留空或其他值：使用腾讯云 CloudBase RDB 适配层（同样经 CloudBase 网关，自动处理 schema 路由）

两种模式本质都是"经 CloudBase 网关"，`DATABASE_URL` 当前不会被读取，留作未来直连 PG 时的占位扩展。

## 图片上传

- **帖子图片**：支持多张图片，单张大小限制 2MB
- **活动图片**：最多支持 5 张图片，活动详情页支持瀑布流展示

## License

MIT