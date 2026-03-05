# DingTalk Webhook Plugin

基于 Webhook 的钉钉机器人消息发送和回调插件，支持多机器人配置和统一回调地址。**Webhook 服务器集成到 OpenClaw 插件中，随 OpenClaw 一起启动**。

## 功能特性

- ✅ 支持多种消息类型：text、markdown、link、actionCard、feedCard
- ✅ 支持多机器人配置和管理
- ✅ 支持@功能和@所有人
- ✅ **统一回调地址** - 所有机器人共用一个回调 URL，自动识别机器人
- ✅ **OpenClaw 集成** - Webhook 服务器随 OpenClaw 一起启动，无需独立进程
- ✅ 完整的 TypeScript 类型支持
- ✅ 简洁易用的 API 设计

## 快速开始

### 1. 安装依赖

```bash
cd dingtalk-webhook-plugin
npm install
```

### 2. 配置 OpenClaw

编辑 `~/.openclaw/openclaw.json`：

```json
{
  "channels": {
    "dingtalk-webhook": {
      "enabled": true,
      "globalWebhookPort": 3000,
      "webhookPath": "/webhook",
      "robots": {
        "customerService": {
          "enabled": true,
          "accessToken": "dingxxxxxxxxxxxxxxxx",
          "name": "客服机器人"
        },
        "notification": {
          "enabled": true,
          "accessToken": "dingyyyyyyyyyyyyyyyy",
          "name": "通知机器人"
        },
        "assistant": {
          "enabled": true,
          "accessToken": "dingzzzzzzzzzzzzzzzz",
          "name": "助手机器人"
        }
      }
    }
  },
  "bindings": [
    {
      "agentId": "customer-service-agent",
      "match": {
        "channel": "dingtalk-webhook",
        "accountId": "customerService"
      }
    },
    {
      "agentId": "notification-agent",
      "match": {
        "channel": "dingtalk-webhook",
        "accountId": "notification"
      }
    }
  ]
}
```

### 3. 安装到 OpenClaw

```bash
# 本地安装
openclaw plugin add ./dingtalk-webhook-plugin

# 或从 Git 安装
openclaw plugin add git+https://github.com/your-repo/dingtalk-webhook-plugin.git
```

### 4. 启动 OpenClaw

```bash
openclaw start
```

插件会自动启动 Webhook 服务器，无需额外操作。

---

## 部署配置（saynoword.tech）

### 1. Nginx 反向代理配置

```nginx
server {
    listen 80;
    listen 443 ssl;
    server_name saynoword.tech;

    # SSL 证书配置
    ssl_certificate /etc/letsencrypt/live/saynoword.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/saynoword.tech/privkey.pem;

    location /webhook {
        proxy_pass http://localhost:3000/webhook;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://localhost:3000/health;
    }
}
```

### 2. 钉钉后台配置

所有机器人的回调地址都配置为：

```
https://saynoword.tech/webhook
```

### 3. 测试

```bash
# 测试健康检查
curl https://saynoword.tech/health

# 预期响应
# {"status":"ok","timestamp":xxx,"service":"dingtalk-webhook","robots":[...]}
```

---

## 消息发送

### 发送文本消息

```typescript
// 发送普通文本
await plugin.sendText('customerService', '您好，欢迎咨询客服！');

// 发送文本并@指定人
await plugin.sendText('customerService', '请查收报告', plugin.atMobiles(['13800138000']));

// 发送文本并@所有人
await plugin.sendText('customerService', '重要通知！', plugin.atAll());
```

### 发送 Markdown 消息

```typescript
const markdown = `## 📊 每日工作报告
> 日期：2024-01-15
> 汇报人：张三

### 今日完成
- ✅ 功能开发
- ✅ 代码审查
- ✅ 文档编写`;

await plugin.sendMarkdown('notification', '每日工作报告', markdown);
```

### 发送链接消息

```typescript
await plugin.sendLink(
  'notification',
  '产品更新公告',
  '我们发布了新版本，带来多项改进和新功能',
  'https://example.com/image.png',
  'https://example.com/article/123'
);
```

### 发送 ActionCard 消息

```typescript
// 多个按钮
await plugin.sendActionCardMulti(
  'customerService',
  '工单处理',
  `工单编号：GD20240115001
用户反馈：应用启动缓慢`,
  [
    { title: '接受工单', actionURL: 'https://example.com/ticket/accept/123' },
    { title: '转交他人', actionURL: 'https://example.com/ticket/transfer/123' },
    { title: '关闭工单', actionURL: 'https://example.com/ticket/close/123' },
  ]
);
```

### 发送 FeedCard 消息

```typescript
await plugin.sendFeedCard('notification', [
  {
    title: '🚀 版本更新：v2.0.0 发布',
    messageURL: 'https://example.com/release/2.0.0',
    picURL: 'https://example.com/images/release.png',
  },
]);
```

---

## Webhook 回调

### 工作原理

1. **OpenClaw 启动时**，插件自动启动 Webhook 服务器（默认 3000 端口）
2. **钉钉推送回调**到 `https://saynoword.tech/webhook`
3. **Nginx 反向代理**到 `http://localhost:3000/webhook`
4. **插件自动识别**是哪个机器人的回调（根据 `accessToken`）
5. **调用回调处理函数**，可以自定义处理逻辑

### 回调地址配置

| 端点 | 说明 | 示例 |
|------|------|------|
| `/webhook` | 统一回调地址（推荐） | `http://localhost:3000/webhook` |
| `/webhook?robotId=xxx` | 带参数的统一回调 | `http://localhost:3000/webhook?robotId=bot1` |
| `/webhook/:robotId` | 带机器人 ID 的回调 | `http://localhost:3000/webhook/bot1` |
| `/health` | 健康检查 | `http://localhost:3000/health` |

### 回调数据格式

```json
{
  "event": "button_click",
  "senderId": "user123",
  "senderNick": "张三",
  "buttonTitle": "非常满意",
  "conversationId": "cidxxxxx",
  "_robotId": "customerService",
  "_robotName": "客服机器人",
  "_receivedAt": 1705312800000
}
```

### 机器人识别逻辑

| 优先级 | 识别方式 | 说明 |
|--------|---------|------|
| 1 | `accessToken` | 钉钉回调数据中的 accessToken 自动映射到 robotId |
| 2 | URL 参数 | `?robotId=xxx` 参数指定 |
| 3 | 默认值 | 使用 `default` |

### 自定义回调处理

如果需要自定义回调处理逻辑，可以在插件中扩展 `handleWebhookCallback` 方法：

```typescript
// 插件会自动调用这个方法处理回调
handleWebhookCallback(robotId: string, callback: any) {
  const { event, senderId, buttonTitle } = callback;
  
  switch (event) {
    case 'button_click':
      console.log(`用户 ${senderId} 点击了按钮：${buttonTitle}`);
      // 发送确认消息
      this.sendText(robotId, '感谢您的反馈！');
      break;
      
    case 'receive_message':
      console.log(`收到用户消息：${callback.text?.content}`);
      // 处理用户消息
      break;
  }
}
```

---

## API 参考

### 消息发送方法

| 方法 | 说明 |
|------|------|
| `sendText(robotId, content, at?)` | 发送文本消息 |
| `sendMarkdown(robotId, title, text, at?)` | 发送 Markdown 消息 |
| `sendLink(robotId, title, text, picUrl, messageUrl)` | 发送链接消息 |
| `sendActionCardSingle(...)` | 发送单按钮卡片 |
| `sendActionCardMulti(...)` | 发送多按钮卡片 |
| `sendFeedCard(robotId, links)` | 发送 Feed 卡片 |
| `sendMessage(robotId, params)` | 通用发送方法 |

### @配置方法

| 方法 | 说明 |
|------|------|
| `atAll()` | @所有人 |
| `atMobiles(mobiles)` | @指定手机号数组 |
| `atUserIds(userIds)` | @指定用户 ID 数组 |

### 其他方法

| 方法 | 说明 |
|------|------|
| `getEnabledRobots()` | 获取所有启用的机器人 ID 列表 |
| `handleWebhookCallback(robotId, callback)` | 处理 Webhook 回调 |

---

## 配置说明

### 完整配置示例

参考 `openclaw.config.example.json` 文件。

### 配置项说明

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `enabled` | 是否启用插件 | - |
| `globalWebhookPort` | Webhook 服务器端口 | `3000` |
| `webhookPath` | Webhook 回调路径 | `/webhook` |
| `robots` | 机器人配置对象 | - |
| `robots.<id>.enabled` | 是否启用该机器人 | - |
| `robots.<id>.accessToken` | 机器人 access_token | - |
| `robots.<id>.name` | 机器人名称 | - |

---

## 注意事项

1. **发送频率限制**：每个机器人每分钟最多发送 20 条消息
2. **Access Token**：请妥善保管，不要提交到版本控制
3. **端口占用**：确保 3000 端口未被占用
4. **SSL 证书**：钉钉要求回调地址必须是 HTTPS
5. **回调功能**：钉钉官方群 webhook 机器人不支持回调，仅企业内部机器人和 ISV 机器人支持

---

## 开发

```bash
# 安装依赖
npm install

# 编译
npm run build

# 开发模式
npm run dev
```

## 项目结构

```
dingtalk-webhook-plugin/
├── plugin.ts                 # 插件核心（含 Webhook 服务器）
├── webhook-server.ts         # Webhook 服务器（备用独立版本）
├── example.ts                # 使用示例
├── callback-types.ts         # 回调数据类型定义
├── openclaw.plugin.json      # OpenClaw 插件清单
├── package.json              # npm 依赖配置
├── tsconfig.json             # TypeScript 配置
├── openclaw.config.example.json  # OpenClaw 配置示例
├── README.md                 # 本文档
├── CHANGELOG.md              # 变更日志
└── LICENSE                   # MIT 许可证
```

## License

MIT
