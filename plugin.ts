/**
 * DingTalk Webhook Plugin
 * 基于 Webhook 的钉钉机器人消息发送和回调插件
 * 支持多机器人配置和回调接收
 */

import axios from 'axios';

// ==================== 类型定义 ====================

interface RobotConfig {
  enabled: boolean;
  accessToken: string;
  name?: string;
  webhookPort?: number;
}

interface RobotsConfig {
  [robotId: string]: RobotConfig;
}

interface WebhookPluginConfig {
  enabled: boolean;
  robots: RobotsConfig;
  globalWebhookPort?: number;
}

interface TextContent {
  content: string;
}

interface MarkdownContent {
  title: string;
  text: string;
}

interface LinkContent {
  text: string;
  title: string;
  picUrl: string;
  messageUrl: string;
}

interface ActionCardContent {
  title: string;
  text: string;
  singleTitle?: string;
  singleURL?: string;
  btnOrientation?: string;
  btns?: Array<{
    title: string;
    actionURL: string;
  }>;
}

interface FeedCardLink {
  title: string;
  messageURL: string;
  picURL: string;
}

interface FeedCardContent {
  links: FeedCardLink[];
}

interface AtConfig {
  atMobiles?: string[];
  atUserIds?: string[];
  isAtAll?: boolean;
}

interface SendMessageParams {
  msgtype: 'text' | 'markdown' | 'link' | 'actionCard' | 'feedCard';
  text?: TextContent;
  markdown?: MarkdownContent;
  link?: LinkContent;
  actionCard?: ActionCardContent;
  feedCard?: FeedCardContent;
  at?: AtConfig;
}

interface SendResponse {
  errcode: number;
  errmsg: string;
}

interface WebhookCallback {
  robotId: string;
  timestamp: number;
  event: string;
  data: any;
}

interface EnhancedWebhookCallback extends WebhookCallback {
  _robotId: string;
  _robotName: string;
  _receivedAt: number;
  accessToken?: string;
  senderId?: string;
  conversationId?: string;
}

// ==================== 插件类 ====================

export class DingTalkWebhookPlugin {
  private config: WebhookPluginConfig;
  private axiosInstance: any;

  constructor(config: WebhookPluginConfig) {
    this.config = config;
    this.axiosInstance = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  }

  /**
   * 获取机器人配置
   */
  private getRobotConfig(robotId: string): RobotConfig | null {
    const robot = this.config.robots[robotId];
    if (!robot || !robot.enabled) {
      return null;
    }
    return robot;
  }

  /**
   * 发送钉钉消息
   */
  async sendMessage(
    robotId: string,
    params: SendMessageParams
  ): Promise<SendResponse> {
    const robotConfig = this.getRobotConfig(robotId);
    if (!robotConfig) {
      throw new Error(`机器人 ${robotId} 未启用或不存在`);
    }

    const url = `https://oapi.dingtalk.com/robot/send?access_token=${robotConfig.accessToken}`;

    try {
      const response = await this.axiosInstance.post(url, params);
      return response.data as SendResponse;
    } catch (error: any) {
      throw new Error(`发送消息失败：${error.message}`);
    }
  }

  /**
   * 发送文本消息
   */
  async sendText(
    robotId: string,
    content: string,
    at?: AtConfig
  ): Promise<SendResponse> {
    return this.sendMessage(robotId, {
      msgtype: 'text',
      text: { content },
      at,
    });
  }

  /**
   * 发送 Markdown 消息
   */
  async sendMarkdown(
    robotId: string,
    title: string,
    text: string,
    at?: AtConfig
  ): Promise<SendResponse> {
    return this.sendMessage(robotId, {
      msgtype: 'markdown',
      markdown: { title, text },
      at,
    });
  }

  /**
   * 发送链接消息
   */
  async sendLink(
    robotId: string,
    title: string,
    text: string,
    picUrl: string,
    messageUrl: string
  ): Promise<SendResponse> {
    return this.sendMessage(robotId, {
      msgtype: 'link',
      link: {
        title,
        text,
        picUrl,
        messageUrl,
      },
    });
  }

  /**
   * 发送 ActionCard 消息（单个按钮）
   */
  async sendActionCardSingle(
    robotId: string,
    title: string,
    text: string,
    singleTitle: string,
    singleURL: string
  ): Promise<SendResponse> {
    return this.sendMessage(robotId, {
      msgtype: 'actionCard',
      actionCard: {
        title,
        text,
        singleTitle,
        singleURL,
      },
    });
  }

  /**
   * 发送 ActionCard 消息（多个按钮）
   */
  async sendActionCardMulti(
    robotId: string,
    title: string,
    text: string,
    btns: Array<{ title: string; actionURL: string }>,
    btnOrientation: string = '0'
  ): Promise<SendResponse> {
    return this.sendMessage(robotId, {
      msgtype: 'actionCard',
      actionCard: {
        title,
        text,
        btnOrientation,
        btns,
      },
    });
  }

  /**
   * 发送 FeedCard 消息
   */
  async sendFeedCard(
    robotId: string,
    links: FeedCardLink[]
  ): Promise<SendResponse> {
    return this.sendMessage(robotId, {
      msgtype: 'feedCard',
      feedCard: { links },
    });
  }

  /**
   * @所有人
   */
  atAll(): AtConfig {
    return { isAtAll: true };
  }

  /**
   * @指定手机号
   */
  atMobiles(mobiles: string[]): AtConfig {
    return { atMobiles: mobiles };
  }

  /**
   * @指定用户 ID
   */
  atUserIds(userIds: string[]): AtConfig {
    return { atUserIds: userIds };
  }

  /**
   * 获取所有启用的机器人 ID
   */
  getEnabledRobots(): string[] {
    return Object.keys(this.config.robots).filter(
      (id) => this.config.robots[id].enabled
    );
  }

  /**
   * 处理 Webhook 回调（增强版）
   * 支持自动识别机器人信息
   */
  handleWebhookCallback(
    robotId: string,
    callback: EnhancedWebhookCallback | WebhookCallback
  ): void {
    const robotConfig = this.getRobotConfig(robotId);
    if (!robotConfig) {
      console.warn(`收到未启用的机器人 ${robotId} 的回调`);
      return;
    }

    const robotName = (callback as EnhancedWebhookCallback)._robotName || robotConfig.name || robotId;
    
    console.log(
      `收到机器人 ${robotName}(${robotId}) 的回调:`,
      callback
    );

    // 提取回调数据
    const callbackData = (callback as EnhancedWebhookCallback).data || callback;
    const event = callback.event || callbackData.event;

    // 根据回调事件类型进行不同的处理
    switch (event) {
      case 'button_click':
        this.handleButtonClick(robotId, callbackData);
        break;
      case 'message_read':
        this.handleMessageRead(robotId, callbackData);
        break;
      case 'user_enter_session':
        this.handleUserEnterSession(robotId, callbackData);
        break;
      default:
        console.log(`未知回调事件：${event}`);
        this.handleDefaultCallback(robotId, callbackData);
    }
  }

  /**
   * 处理按钮点击回调
   */
  private handleButtonClick(robotId: string, data: any): void {
    console.log(`机器人 ${robotId} 收到按钮点击:`, data);
    // 可以在这里添加自定义处理逻辑
  }

  /**
   * 处理消息已读回调
   */
  private handleMessageRead(robotId: string, data: any): void {
    console.log(`机器人 ${robotId} 消息已读:`, data);
    // 可以在这里添加自定义处理逻辑
  }

  /**
   * 处理用户进入会话回调
   */
  private handleUserEnterSession(robotId: string, data: any): void {
    console.log(`机器人 ${robotId} 用户进入会话:`, data);
    // 可以在这里添加自定义处理逻辑
  }

  /**
   * 处理默认回调
   */
  private handleDefaultCallback(robotId: string, data: any): void {
    console.log(`机器人 ${robotId} 收到默认回调:`, data);
    // 可以在这里添加自定义处理逻辑
  }
}

// ==================== OpenClaw 插件入口 ====================

// OpenClaw 会调用这个函数来初始化插件
export default function createPlugin(config: any) {
  const plugin = new DingTalkWebhookPlugin(config);

  return {
    // 暴露给 OpenClaw 的方法
    sendMessage: (robotId: string, params: SendMessageParams) =>
      plugin.sendMessage(robotId, params),

    sendText: (robotId: string, content: string, at?: AtConfig) =>
      plugin.sendText(robotId, content, at),

    sendMarkdown: (
      robotId: string,
      title: string,
      text: string,
      at?: AtConfig
    ) => plugin.sendMarkdown(robotId, title, text, at),

    sendLink: (
      robotId: string,
      title: string,
      text: string,
      picUrl: string,
      messageUrl: string
    ) => plugin.sendLink(robotId, title, text, picUrl, messageUrl),

    sendActionCardSingle: (
      robotId: string,
      title: string,
      text: string,
      singleTitle: string,
      singleURL: string
    ) => plugin.sendActionCardSingle(robotId, title, text, singleTitle, singleURL),

    sendActionCardMulti: (
      robotId: string,
      title: string,
      text: string,
      btns: Array<{ title: string; actionURL: string }>,
      btnOrientation?: string
    ) => plugin.sendActionCardMulti(robotId, title, text, btns, btnOrientation),

    sendFeedCard: (robotId: string, links: FeedCardLink[]) =>
      plugin.sendFeedCard(robotId, links),

    atAll: () => plugin.atAll(),
    atMobiles: (mobiles: string[]) => plugin.atMobiles(mobiles),
    atUserIds: (userIds: string[]) => plugin.atUserIds(userIds),

    getEnabledRobots: () => plugin.getEnabledRobots(),
    handleWebhookCallback: (robotId: string, callback: WebhookCallback) =>
      plugin.handleWebhookCallback(robotId, callback),
  };
}
