# Merak

新一代高性能项目管理生产力工具。

## 技术栈

- **前端**: React 19 + Vite + TypeScript + Tailwind CSS v4
- **后端**: Rust (Axum) + SurrealDB
- **包管理器**: pnpm

## 启动流程

### 1. 安装依赖

```bash
# 安装前端依赖
pnpm install

# 安装 Rust 依赖 (后端)
cargo build
```

### 2. 配置环境变量

后端需要环境变量配置，在 `crates/merak/` 目录下创建 `.env` 文件。参考以下配置项：

```bash
# SurrealDB 配置
SURREAL_URL=ws://127.0.0.1:5070    # 数据库连接地址
SURREAL_NS=test                     # 命名空间
SURREAL_DB=test                     # 数据库名
SURREAL_USER=root                   # 用户名
SURREAL_PASS=root                   # 密码

# JWT 密钥配置（生产环境必须修改）
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_ACCESS_EXP_SECONDS=900          # Access Token 有效期（秒），默认15分钟
JWT_REFRESH_EXP_SECONDS=604800      # Refresh Token 有效期（秒），默认7天
```

**注意：** 如果不配置 `.env`，后端会使用默认值（见括号中的内容），但 **JWT 密钥在生产环境必须使用自定义值**。

### 3. 启动开发服务器

需要同时启动前端和后端服务：

**终端 1 - 启动后端:**

```bash
cd crates/merak
cargo run
```

后端默认运行在 `http://localhost:8080`

**终端 2 - 启动前端:**

```bash
pnpm dev
```

前端默认运行在 `http://localhost:5173`

### 4. 构建生产版本

```bash
# 构建前端
pnpm build

# 构建后端
cargo build --release
```

## 目录结构

```
merak/
├── src/                    # 前端源码
│   ├── pages/             # 页面组件
│   ├── components/        # 可复用组件
│   ├── hooks/             # 自定义 React Hooks
│   ├── layouts/           # 布局组件
│   └── lib/               # 工具函数
├── crates/                # Rust 后端
│   ├── merak/             # 主服务端
│   ├── core/              # 核心库
│   └── macros/            # 过程宏
└── package.json
```

## 许可证

AGPL-v3.0
