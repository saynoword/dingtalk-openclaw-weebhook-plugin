/**
 * 使用示例
 * 演示如何使用 DingTalk Webhook Plugin
 */

import createPlugin from './plugin';
import { createWebhookServer } from './webhook-server';

// ==================== 配置 ====================

const config = {
  enabled: true,
  globalWebhookPort: 3000,
  robots: {
    customerService: {
      enabled: true,
      accessToken: 'your_customer_service_token',
      name: '客服机器人',
      webhookPort: 3001,
    },
    notification: {
      enabled: true,
      accessToken: 'your_notification_token',
      name: '通知机器人',
      webhookPort: 3002,
    },
    assistant: {
      enabled: true,
      accessToken: 'your_assistant_token',
      name: '助手机器人',
    },
  },
};

// ==================== 初始化插件 ====================

const plugin = createPlugin(config);

// ==================== 启动 Webhook 服务器 ====================

async function startServer() {
  const server = createWebhookServer(config.globalWebhookPort, (robotId, data) => {
    console.log(`收到机器人 ${robotId} 的回调:`, data);

    // 处理不同类型的回调
    plugin.handleWebhookCallback(robotId, {
      robotId,
      timestamp: Date.now(),
      event: data.event || 'unknown',
      data: data.data || data,
    });
  });

  return server;
}

// ==================== 使用示例 ====================

async function demo() {
  try {
    // 启动 Webhook 服务器
    await startServer();

    // 获取所有启用的机器人
    const robots = plugin.getEnabledRobots();
    console.log('启用的机器人:', robots);

    // 示例 1: 发送文本消息
    console.log('\n--- 发送文本消息 ---');
    const textResponse = await plugin.sendText(
      'customerService',
      '您好，欢迎咨询客服！'
    );
    console.log('发送结果:', textResponse);

    // 示例 2: 发送文本并@指定人
    console.log('\n--- 发送@消息 ---');
    const atResponse = await plugin.sendText(
      'notification',
      '请尽快处理这个任务',
      plugin.atMobiles(['13800138000'])
    );
    console.log('发送结果:', atResponse);

    // 示例 3: 发送@所有人
    console.log('\n--- 发送@所有人 ---');
    const atAllResponse = await plugin.sendText(
      'notification',
      '【重要通知】系统将于今晚 22:00 进行维护',
      plugin.atAll()
    );
    console.log('发送结果:', atAllResponse);

    // 示例 4: 发送 Markdown 消息
    console.log('\n--- 发送 Markdown 消息 ---');
    const markdown = `## 📊 每日工作报告
> 日期：2024-01-15
> 汇报人：张三

### 今日完成
- ✅ 功能开发
- ✅ 代码审查
- ✅ 文档编写

### 明日计划
- 📌 性能优化
- 📌 Bug 修复

### 问题与建议
暂无`;

    const mdResponse = await plugin.sendMarkdown(
      'assistant',
      '每日工作报告',
      markdown
    );
    console.log('发送结果:', mdResponse);

    // 示例 5: 发送链接消息
    console.log('\n--- 发送链接消息 ---');
    const linkResponse = await plugin.sendLink(
      'notification',
      '产品更新公告',
      '我们发布了新版本，带来多项改进和新功能',
      'https://example.com/image.png',
      'https://example.com/article/123'
    );
    console.log('发送结果:', linkResponse);

    // 示例 6: 发送 ActionCard（单个按钮）
    console.log('\n--- 发送 ActionCard（单个按钮）---');
    const actionCardSingleResponse = await plugin.sendActionCardSingle(
      'customerService',
      '用户满意度调查',
      '感谢您使用我们的服务，请点击下方按钮参与满意度调查',
      '参与调查',
      'https://example.com/survey'
    );
    console.log('发送结果:', actionCardSingleResponse);

    // 示例 7: 发送 ActionCard（多个按钮）
    console.log('\n--- 发送 ActionCard（多个按钮）---');
    const actionCardMultiResponse = await plugin.sendActionCardMulti(
      'customerService',
      '工单处理',
      `工单编号：GD20240115001
用户反馈：应用启动缓慢
优先级：高`,
      [
        { title: '接受工单', actionURL: 'https://example.com/ticket/accept/123' },
        { title: '转交他人', actionURL: 'https://example.com/ticket/transfer/123' },
        { title: '关闭工单', actionURL: 'https://example.com/ticket/close/123' },
      ],
      '0' // 竖直排列
    );
    console.log('发送结果:', actionCardMultiResponse);

    // 示例 8: 发送 FeedCard 消息
    console.log('\n--- 发送 FeedCard 消息 ---');
    const feedCardResponse = await plugin.sendFeedCard('notification', [
      {
        title: '🚀 版本更新：v2.0.0 发布',
        messageURL: 'https://example.com/release/2.0.0',
        picURL: 'https://example.com/images/release.png',
      },
      {
        title: '📢 系统维护通知',
        messageURL: 'https://example.com/notice/maintenance',
        picURL: 'https://example.com/images/notice.png',
      },
      {
        title: '📖 使用指南：快速入门',
        messageURL: 'https://example.com/guide/quickstart',
        picURL: 'https://example.com/images/guide.png',
      },
    ]);
    console.log('发送结果:', feedCardResponse);

    // 示例 9: 使用通用 sendMessage 方法
    console.log('\n--- 使用通用 sendMessage 方法 ---');
    const customResponse = await plugin.sendMessage('assistant', {
      msgtype: 'text',
      text: {
        content: '这是一条自定义消息',
      },
      at: {
        isAtAll: true,
      },
    });
    console.log('发送结果:', customResponse);

    console.log('\n✅ 所有示例执行完成！');
  } catch (error: any) {
    console.error('❌ 执行出错:', error.message);
  }
}

// 运行示例
// demo();

export { demo, startServer };
