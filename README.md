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

### 启动 Webhook 服务器

```typescript
import { createWebhookServer } from './webhook-server';

const server = createWebhookServer(3000, (robotId, data) => {
  console.log(`收到机器人 ${robotId} 的回调:`, data);
  
  // 处理回调逻辑
  if (data.event === 'button_click') {
    // 处理按钮点击
    console.log('按钮被点击:', data.data);
  }
});
```

### 回调地址格式

- 通用回调：`http://localhost:3000/webhook/:robotId`
- 特定事件：`http://localhost:3000/webhook/:robotId/:event`
- 健康检查：`http://localhost:3000/health`

### 回调示例

```json
// POST http://localhost:3000/webhook/bot1
{
  "event": "button_click",
  "data": {
    "userId": "user123",
    "buttonTitle": "非常满意",
    "timestamp": 1234567890
  }
}
```

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
