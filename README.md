# DingTalk Webhook Plugin

基于 Webhook 的钉钉机器人消息发送和回调插件，支持多机器人配置。

## 功能特性

- ✅ 支持多种消息类型：text、markdown、link、actionCard、feedCard
- ✅ 支持多机器人配置和管理
- ✅ 支持@功能和@所有人
- ✅ Webhook 回调接收
- ✅ 完整的 TypeScript 类型支持
- ✅ 简洁易用的 API 设计

## 安装

### 方式一：从 Git 安装

```bash
openclaw plugin add git+https://github.com/your-repo/dingtalk-webhook-plugin.git
```

### 方式二：本地安装

```bash
cd dingtalk-webhook-plugin
npm install
openclaw plugin add ./dingtalk-webhook-plugin
```

## 配置

在 `~/.openclaw/openclaw.json` 中添加插件配置：

### 单机器人配置

```json
{
  "channels": {
    "dingtalk-webhook": {
      "enabled": true,
      "robots": {
        "default": {
          "enabled": true,
          "accessToken": "your_access_token_here",
          "name": "默认机器人",
          "webhookPort": 3000
        }
      }
    }
  }
}
```

### 多机器人配置

```json
{
  "channels": {
    "dingtalk-webhook": {
      "enabled": true,
      "globalWebhookPort": 3000,
      "robots": {
        "bot1": {
          "enabled": true,
          "accessToken": "access_token_1",
          "name": "客服机器人",
          "webhookPort": 3001
        },
        "bot2": {
          "enabled": true,
          "accessToken": "access_token_2",
          "name": "通知机器人",
          "webhookPort": 3002
        },
        "bot3": {
          "enabled": true,
          "accessToken": "access_token_3",
          "name": "助手机器人"
        }
      }
    }
  },
  "bindings": [
    {
      "agentId": "customer-service",
      "match": { "channel": "dingtalk-webhook", "accountId": "bot1" }
    },
    {
      "agentId": "notification",
      "match": { "channel": "dingtalk-webhook", "accountId": "bot2" }
    },
    {
      "agentId": "assistant",
      "match": { "channel": "dingtalk-webhook", "accountId": "bot3" }
    }
  ]
}
```

## 使用方法

### 发送文本消息

```typescript
// 发送普通文本
await plugin.sendText('bot1', 'Hello, 钉钉！');

// 发送文本并@指定人
await plugin.sendText('bot1', '请查收报告', plugin.atMobiles(['13800138000']));

// 发送文本并@所有人
await plugin.sendText('bot1', '重要通知！', plugin.atAll());
```

### 发送 Markdown 消息

```typescript
const markdown = `## 杭州天气
- 温度：25°C
- 湿度：60%
- 空气质量：优

![天气](https://example.com/weather.png)`;

await plugin.sendMarkdown('bot1', '杭州天气', markdown);

// 带@功能的 Markdown 消息
await plugin.sendMarkdown(
  'bot1',
  '每日报告',
  `## 每日报告 @13800138000
今日完成工作：
- 功能开发
- 代码审查
- 文档编写`,
  plugin.atMobiles(['13800138000'])
);
```

### 发送链接消息

```typescript
await plugin.sendLink(
  'bot1',
  '新时代的步伐',
  '钉钉 3.3 版本发布，带来全新体验',
  'https://example.com/image.png',
  'https://www.dingtalk.com/article/123'
);
```

### 发送 ActionCard 消息

```typescript
// 单个按钮
await plugin.sendActionCardSingle(
  'bot1',
  '乔布斯 20 年前想做到的苹果',
  '![screenshot](https://example.com/image.png)\n\n### 乔布斯 20 年前想做到的苹果\n- 1997 年，苹果濒临破产\n- 1997 年，乔布斯回归\n- 20 年后，苹果成为全球市值最高的公司',
  '阅读全文',
  'https://www.dingtalk.com/article/123'
);

// 多个按钮
await plugin.sendActionCardMulti(
  'bot1',
  '产品反馈',
  '您对我们的新产品有什么看法？',
  [
    { title: '非常满意', actionURL: 'https://example.com/feedback?score=5' },
    { title: '一般', actionURL: 'https://example.com/feedback?score=3' },
    { title: '需要改进', actionURL: 'https://example.com/feedback?score=1' }
  ],
  '0' // 按钮排列方向：0-竖直，1-水平
);
```

### 发送 FeedCard 消息

```typescript
await plugin.sendFeedCard('bot1', [
  {
    title: '钉钉 3.3 发布',
    messageURL: 'https://www.dingtalk.com/article/1',
    picURL: 'https://example.com/image1.png'
  },
  {
    title: '阿里发布新芯片',
    messageURL: 'https://www.dingtalk.com/article/2',
    picURL: 'https://example.com/image2.png'
  },
  {
    title: '技术创新大会',
    messageURL: 'https://www.dingtalk.com/article/3',
    picURL: 'https://example.com/image3.png'
  }
]);
```

### 获取启用的机器人列表

```typescript
const robots = plugin.getEnabledRobots();
console.log('启用的机器人:', robots);
```

## Webhook 回调

### 统一回调地址

所有机器人共用同一个回调地址，插件会自动识别机器人信息：

```typescript
import createPlugin from './plugin';
import { createWebhookServer } from './webhook-server';

const config = {
  enabled: true,
  globalWebhookPort: 3000,
  robots: {
    customerService: {
      enabled: true,
      accessToken: 'dingxxxxxxxx',
      name: '客服机器人',
    },
    notification: {
      enabled: true,
      accessToken: 'dingyyyyyyyy',
      name: '通知机器人',
    },
  },
};

const plugin = createPlugin(config);

// 创建 Webhook 服务器（传入 robots 配置用于自动识别）
const server = createWebhookServer(3000, (robotId, data) => {
  console.log(`收到机器人 ${robotId} 的回调:`, data);
  console.log(`机器人名称：${data._robotName}`);
  console.log(`接收时间：${new Date(data._receivedAt).toISOString()}`);
  
  // 根据 robotId 区分处理不同机器人的回调
  switch (robotId) {
    case 'customerService':
      // 处理客服机器人回调
      break;
    case 'notification':
      // 处理通知机器人回调
      break;
  }
}, config.robots);
```

### 回调地址配置

| 端点 | 说明 | 示例 |
|------|------|------|
| `/webhook` | 统一回调地址（推荐） | `http://localhost:3000/webhook` |
| `/webhook?robotId=xxx` | 带参数的统一回调 | `http://localhost:3000/webhook?robotId=bot1` |
| `/webhook/:robotId` | 带机器人 ID 的回调 | `http://localhost:3000/webhook/bot1` |
| `/health` | 健康检查 | `http://localhost:3000/health` |

### 钉钉后台配置

所有机器人的回调地址都配置为同一个：

```
http://你的公网 IP:3000/webhook
```

插件会根据回调数据中的 `accessToken` 自动识别是哪个机器人。

### 回调数据格式

插件会在原始回调数据基础上增强以下字段：

```json
{
  "event": "button_click",
  "senderId": "user123",
  "buttonTitle": "非常满意",
  "_robotId": "customerService",
  "_robotName": "客服机器人",
  "_receivedAt": 1705312800000
}
```

### 机器人识别逻辑

1. **优先从 `accessToken` 识别** - 插件内部维护 `accessToken -> robotId` 映射
2. **其次从 URL 参数识别** - `?robotId=xxx`
3. **最后使用默认值** - `default`

## 环境变量

可以使用环境变量配置敏感信息：

```bash
export DINGTALK_BOT1_ACCESS_TOKEN="your_access_token"
export DINGTALK_BOT2_ACCESS_TOKEN="your_access_token"
export WEBHOOK_PORT="3000"
```

## 注意事项

1. **发送频率限制**：每个机器人每分钟最多发送 20 条消息
2. **Access Token**：请妥善保管，不要提交到版本控制
3. **Webhook 端口**：确保端口未被占用且有访问权限
4. **内容安全**：消息内容需符合钉钉平台规范

## 消息类型参考

| 类型 | 说明 | 适用场景 |
|------|------|----------|
| text | 纯文本消息 | 简单通知、提醒 |
| markdown | Markdown 格式消息 | 富文本报告、文档 |
| link | 链接消息 | 文章分享、新闻推送 |
| actionCard | 卡片消息（带按钮） | 交互反馈、操作引导 |
| feedCard | Feed 卡片消息 | 多条新闻、文章列表 |

## 开发

```bash
# 安装依赖
npm install

# 编译
npm run build

# 开发模式
npm run dev
```

## License

MIT
