# Tech Club 技术俱乐部

一个基于 NestJS + React 的技术俱乐部社区平台，支持帖子讨论、活动管理、成员管理等功能。

## 功能特性

- **帖子系统**：技术分享、问题求助、经验交流，支持图片上传、采纳回复
- **活动管理**：活动创建、展示、报名，支持图片瀑布流展示
- **成员管理**：用户注册、角色权限控制（管理员/普通用户）
- **权限控制**：基于角色的访问控制，支持帖子/回复的编辑删除权限

## 技术栈

### 后端
- **框架**: NestJS 10
- **数据库**: CloudBase（生产环境）/ SQLite（开发环境）
- **ORM**: Drizzle ORM（SQLite）
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
│   ├── database/          # 数据库适配器（CloudBase/SQLite）
│   ├── modules/           # 业务模块
│   │   ├── community/     # 社区模块（帖子、回复、成员）
│   │   └── activities/    # 活动模块
│   ├── app.module.ts      # 主模块
│   └── main.ts            # 入口文件
├── client/                # 前端代码
│   ├── src/
│   │   ├── api/           # API 接口（空文件，实际在 lib/api-service.ts）
│   │   ├── components/    # UI 组件
│   │   ├── hooks/         # 自定义 Hooks
│   │   ├── lib/           # 工具库（API 服务）
│   │   ├── pages/         # 页面组件
│   │   └── types/         # 类型定义
├── shared/                # 前后端共享类型
├── test/                  # 测试文件
│   ├── e2e/               # 端到端测试
│   └── unit/              # 单元测试
└── spec/                  # 设计文档
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
npm run dev:server  # 后端服务，端口 3000
npm run dev:client  # 前端服务，端口 5173
```

### 生产构建

```bash
npm run build
```

### 测试

```bash
npm test           # 运行所有测试
npm run test:e2e   # 仅运行端到端测试
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

项目使用 `.env` 文件进行配置：

```env
# CloudBase 配置
CLOUDBASE_ENV_ID=your-env-id
CLOUDBASE_SECRET_ID=your-secret-id
CLOUDBASE_SECRET_KEY=your-secret-key

# 服务器配置
PORT=3000
```

## 数据库

### CloudBase（生产环境）

项目默认使用腾讯云 CloudBase 作为生产数据库，支持自动配置。

### SQLite（开发/测试环境）

本地开发和测试使用 SQLite 数据库，数据文件位于 `db/example.db`。

## 图片上传

- **帖子图片**：支持多张图片，单张大小限制 2MB
- **活动图片**：最多支持 5 张图片，活动详情页支持瀑布流展示

## License

MIT