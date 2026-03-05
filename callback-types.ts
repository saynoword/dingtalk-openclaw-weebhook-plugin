/**
 * 钉钉机器人回调数据格式参考
 * 
 * 钉钉开放平台推送的回调数据格式
 */

// ==================== 按钮点击回调 ====================

interface ButtonClickCallback {
  // 事件类型
  event: 'button_click';
  
  // 钉钉推送的 access_token，可用于识别机器人
  accessToken: string;
  
  // 发送者 ID
  senderId: string;
  
  // 发送者昵称
  senderNick: string;
  
  // 会话 ID
  conversationId: string;
  
  // 按钮标题
  buttonTitle: string;
  
  // 按钮对应的 actionURL
  buttonUrl: string;
  
  // 消息 ID
  messageId: string;
  
  // 时间戳
  timestamp: number;
}

// 示例数据
const buttonClickExample: ButtonClickCallback = {
  event: 'button_click',
  accessToken: 'dingxxxxxxxxxxxxxxxx',
  senderId: 'user123',
  senderNick: '张三',
  conversationId: 'cidxxxxx',
  buttonTitle: '非常满意',
  buttonUrl: 'https://example.com/feedback?score=5',
  messageId: 'msgxxxxx',
  timestamp: 1705312800000,
};

// ==================== 用户进入会话回调 ====================

interface UserEnterSessionCallback {
  event: 'user_enter_session';
  accessToken: string;
  senderId: string;
  senderNick: string;
  conversationId: string;
  timestamp: number;
}

const userEnterSessionExample: UserEnterSessionCallback = {
  event: 'user_enter_session',
  accessToken: 'dingxxxxxxxxxxxxxxxx',
  senderId: 'user123',
  senderNick: '张三',
  conversationId: 'cidxxxxx',
  timestamp: 1705312800000,
};

// ==================== 消息已读回调 ====================

interface MessageReadCallback {
  event: 'message_read';
  accessToken: string;
  senderId: string;
  messageId: string;
  readTime: number;
  timestamp: number;
}

const messageReadExample: MessageReadCallback = {
  event: 'message_read',
  accessToken: 'dingxxxxxxxxxxxxxxxx',
  senderId: 'user123',
  messageId: 'msgxxxxx',
  readTime: 1705312800000,
  timestamp: 1705312800000,
};

// ==================== 机器人收到消息回调 ====================

interface RobotReceiveMessageCallback {
  event: 'receive_message';
  accessToken: string;
  senderId: string;
  senderNick: string;
  conversationId: string;
  conversationType: '1' | '2'; // 1-单聊，2-群聊
  text: {
    content: string;
  };
  messageId: string;
  timestamp: number;
}

const receiveMessageExample: RobotReceiveMessageCallback = {
  event: 'receive_message',
  accessToken: 'dingxxxxxxxxxxxxxxxx',
  senderId: 'user123',
  senderNick: '张三',
  conversationId: 'cidxxxxx',
  conversationType: '1',
  text: {
    content: '你好',
  },
  messageId: 'msgxxxxx',
  timestamp: 1705312800000,
};

// ==================== 回调识别说明 ====================

/**
 * 插件如何识别机器人：
 * 
 * 1. 优先从回调数据中的 accessToken 识别
 *    - 插件内部维护了 accessToken -> robotId 的映射
 *    - 钉钉推送的回调数据中包含 accessToken 字段
 * 
 * 2. 如果无法识别，使用 URL 参数 ?robotId=xxx
 *    - 可以在钉钉后台配置回调地址时添加参数
 *    - 例如：http://example.com/webhook?robotId=customerService
 * 
 * 3. 如果还是没有，使用 'default' 作为默认 robotId
 * 
 * 回调数据增强：
 * 插件会在原始回调数据基础上添加以下字段：
 * - _robotId: 识别出的机器人 ID
 * - _robotName: 机器人名称（从配置获取）
 * - _receivedAt: 接收时间戳
 */

export {
  ButtonClickCallback,
  UserEnterSessionCallback,
  MessageReadCallback,
  RobotReceiveMessageCallback,
  buttonClickExample,
  userEnterSessionExample,
  messageReadExample,
  receiveMessageExample,
};
