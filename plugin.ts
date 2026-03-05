/**
 * DingTalk Webhook Plugin - OpenClaw 集成版本
 * 将 Webhook 服务器集成到 OpenClaw 插件生命周期中
 * 所有机器人共用统一回调地址，自动识别机器人
 */

import axios from 'axios';

// ==================== 类型定义 ====================

interface RobotConfig {
  enabled: boolean;
  accessToken: string;
  name?: string;
}

interface RobotsConfig {
  [robotId: string]: RobotConfig;
}

interface WebhookPluginConfig {
  enabled: boolean;
  robots: RobotsConfig;
  globalWebhookPort?: number;
  webhookPath?: string;
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
  _robotId?: string;
  _robotName?: string;
  _receivedAt?: number;
}

// ==================== Webhook 服务器类 ====================

interface WebhookServerConfig {
  port: number;
  path: string;
  onCallback: (robotId: string, data: any) => void;
  robots?: { [robotId: string]: { accessToken?: string; name?: string } };
}

class WebhookServer {
  private app: any = null;
  private config: WebhookServerConfig;
  private server: any = null;
  private tokenToRobotMap: Map<string, string> = new Map();
  private express: any = null;

  constructor(config: WebhookServerConfig) {
    this.config = config;
    
    // 构建 token 到机器人 ID 的映射
    if (config.robots) {
      Object.entries(config.robots).forEach(([robotId, robotConfig]) => {
        if (robotConfig.accessToken) {
          this.tokenToRobotMap.set(robotConfig.accessToken, robotId);
        }
      });
    }
  }

  /**
   * 根据 access_token 自动识别机器人 ID
   */
  private identifyRobotId(callbackData: any): string | null {
    // 方式 1: 从回调数据中获取 robotId 字段
    if (callbackData.robotId) {
      return callbackData.robotId;
    }

    // 方式 2: 从 access_token 识别
    if (callbackData.accessToken) {
      const robotId = this.tokenToRobotMap.get(callbackData.accessToken);
      if (robotId) {
        return robotId;
      }
    }

    // 方式 3: 钉钉回调中的 senderId 或 conversationId
    if (callbackData.senderId || callbackData.conversationId) {
      return 'default';
    }

    return null;
  }

  /**
   * 初始化 Express 应用
   */
  private async initExpress(): Promise<void> {
    // 动态导入 express
    const expressModule = await import('express');
    this.express = expressModule.default;
    this.app = this.express();

    // 解析 JSON 请求体
    this.app.use(this.express.json());

    // 设置路由
    this.setupRoutes();
  }

  private setupRoutes(): void {
    const webhookPath = this.config.path;

    // 统一回调接口 - 所有机器人共用
    this.app.post(webhookPath, (req: any, res: any) => {
      const callbackData = req.body;
      
      // 自动识别机器人 ID
      let robotId = this.identifyRobotId(callbackData);
      
      // 如果无法自动识别，使用 URL 参数获取
      if (!robotId) {
        robotId = req.query.robotId as string || 'default';
      }

      // 增强回调数据，添加机器人信息
      const enhancedData = {
        ...callbackData,
        _robotId: robotId,
        _robotName: this.config.robots?.[robotId]?.name || robotId,
        _receivedAt: Date.now(),
      };

      console.log(`[DingTalk Webhook] 收到机器人 ${robotId} 的回调:`, JSON.stringify(enhancedData, null, 2));

      try {
        this.config.onCallback(robotId, enhancedData);
        res.json({ success: true, robotId });
      } catch (error: any) {
        console.error('[DingTalk Webhook] 处理回调失败:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // 带机器人 ID 参数的回调接口（可选）
    this.app.post(`${webhookPath}/:robotId`, (req: any, res: any) => {
      const { robotId } = req.params;
      const callbackData = req.body;

      const enhancedData = {
        ...callbackData,
        _robotId: robotId,
        _robotName: this.config.robots?.[robotId]?.name || robotId,
        _receivedAt: Date.now(),
      };

      console.log(`[DingTalk Webhook] 收到机器人 ${robotId} 的回调:`, enhancedData);

      try {
        this.config.onCallback(robotId, enhancedData);
        res.json({ success: true, robotId });
      } catch (error: any) {
        console.error('[DingTalk Webhook] 处理回调失败:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // 健康检查接口
    this.app.get('/health', (req: any, res: any) => {
      res.json({ 
        status: 'ok', 
        timestamp: Date.now(),
        service: 'dingtalk-webhook',
        robots: Object.keys(this.config.robots || {}),
      });
    });

    // 获取机器人列表
    this.app.get('/robots', (req: any, res: any) => {
      res.json({ 
        success: true, 
        message: 'DingTalk Webhook Server is running',
        robots: this.config.robots || {},
        tokenMap: Object.fromEntries(this.tokenToRobotMap),
      });
    });
  }

  /**
   * 启动服务器
   */
  async start(): Promise<void> {
    if (!this.app) {
      await this.initExpress();
    }

    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.port, () => {
          console.log(`[DingTalk Webhook] 服务器已启动，监听端口：${this.config.port}`);
          console.log(`[DingTalk Webhook] 回调地址：http://localhost:${this.config.port}${this.config.path}`);
          resolve();
        });

        this.server.on('error', (error: Error) => {
          console.error('[DingTalk Webhook] 服务器启动失败:', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 停止服务器
   */
  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((err?: Error) => {
        if (err) {
          console.error('[DingTalk Webhook] 停止服务器失败:', err);
          reject(err);
        } else {
          console.log('[DingTalk Webhook] 服务器已停止');
          this.server = null;
          this.app = null;
          resolve();
        }
      });
    });
  }
}

// ==================== 插件类 ====================

export class DingTalkWebhookPlugin {
  private config: WebhookPluginConfig;
  private axiosInstance: any;
  private webhookServer: WebhookServer | null = null;

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
   * 启动 Webhook 服务器
   */
  async startWebhookServer(
    onCallback?: (robotId: string, data: any) => void
  ): Promise<void> {
    if (this.webhookServer) {
      console.log('[DingTalk Webhook] Webhook 服务器已在运行');
      return;
    }

    const port = this.config.globalWebhookPort || 3000;
    const path = this.config.webhookPath || '/webhook';

    const defaultCallback = (robotId: string, data: any) => {
      console.log(`[DingTalk Webhook] 收到回调 robotId=${robotId}`, data);
      this.handleWebhookCallback(robotId, {
        robotId,
        timestamp: data._receivedAt || Date.now(),
        event: data.event || 'unknown',
        data: data,
        _robotId: data._robotId || robotId,
        _robotName: data._robotName || robotId,
        _receivedAt: data._receivedAt || Date.now(),
      });
    };

    this.webhookServer = new WebhookServer({
      port,
      path,
      onCallback: onCallback || defaultCallback,
      robots: this.config.robots,
    });

    await this.webhookServer.start();
  }

  /**
   * 停止 Webhook 服务器
   */
  async stopWebhookServer(): Promise<void> {
    if (!this.webhookServer) {
      return;
    }

    await this.webhookServer.stop();
    this.webhookServer = null;
  }

  /**
   * 处理 Webhook 回调（增强版）
   * 支持自动识别机器人信息
   */
  handleWebhookCallback(
    robotId: string,
    callback: WebhookCallback
  ): void {
    const robotConfig = this.getRobotConfig(robotId);
    if (!robotConfig) {
      console.warn(`[DingTalk Webhook] 收到未启用的机器人 ${robotId} 的回调`);
      return;
    }

    const robotName = callback._robotName || robotConfig.name || robotId;
    
    console.log(
      `[DingTalk Webhook] 收到机器人 ${robotName}(${robotId}) 的回调:`,
      callback
    );

    // 提取回调数据
    const callbackData = callback.data || callback;
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
      case 'receive_message':
        this.handleReceiveMessage(robotId, callbackData);
        break;
      default:
        console.log(`[DingTalk Webhook] 未知回调事件：${event}`);
        this.handleDefaultCallback(robotId, callbackData);
    }
  }

  /**
   * 处理按钮点击回调
   */
  private handleButtonClick(robotId: string, data: any): void {
    console.log(`[DingTalk Webhook] 机器人 ${robotId} 收到按钮点击:`, data);
  }

  /**
   * 处理消息已读回调
   */
  private handleMessageRead(robotId: string, data: any): void {
    console.log(`[DingTalk Webhook] 机器人 ${robotId} 消息已读:`, data);
  }

  /**
   * 处理用户进入会话回调
   */
  private handleUserEnterSession(robotId: string, data: any): void {
    console.log(`[DingTalk Webhook] 机器人 ${robotId} 用户进入会话:`, data);
  }

  /**
   * 处理收到消息回调
   */
  private handleReceiveMessage(robotId: string, data: any): void {
    console.log(`[DingTalk Webhook] 机器人 ${robotId} 收到消息:`, data);
  }

  /**
   * 处理默认回调
   */
  private handleDefaultCallback(robotId: string, data: any): void {
    console.log(`[DingTalk Webhook] 机器人 ${robotId} 收到默认回调:`, data);
  }
}

// ==================== OpenClaw 插件入口 ====================

let pluginInstance: DingTalkWebhookPlugin | null = null;

export default function createPlugin(config: WebhookPluginConfig) {
  pluginInstance = new DingTalkWebhookPlugin(config);

  return {
    // OpenClaw 生命周期钩子
    async onInit() {
      console.log('[DingTalk Webhook] 插件初始化...');
      
      if (config.enabled) {
        // 启动 Webhook 服务器
        await pluginInstance!.startWebhookServer();
      }
    },

    async onShutdown() {
      console.log('[DingTalk Webhook] 插件关闭...');
      await pluginInstance!.stopWebhookServer();
    },

    // 暴露给 OpenClaw 的方法
    sendMessage: (robotId: string, params: SendMessageParams) =>
      pluginInstance!.sendMessage(robotId, params),

    sendText: (robotId: string, content: string, at?: AtConfig) =>
      pluginInstance!.sendText(robotId, content, at),

    sendMarkdown: (robotId: string, title: string, text: string, at?: AtConfig) =>
      pluginInstance!.sendMarkdown(robotId, title, text, at),

    sendLink: (
      robotId: string,
      title: string,
      text: string,
      picUrl: string,
      messageUrl: string
    ) => pluginInstance!.sendLink(robotId, title, text, picUrl, messageUrl),

    sendActionCardSingle: (
      robotId: string,
      title: string,
      text: string,
      singleTitle: string,
      singleURL: string
    ) => pluginInstance!.sendActionCardSingle(robotId, title, text, singleTitle, singleURL),

    sendActionCardMulti: (
      robotId: string,
      title: string,
      text: string,
      btns: Array<{ title: string; actionURL: string }>,
      btnOrientation?: string
    ) => pluginInstance!.sendActionCardMulti(robotId, title, text, btns, btnOrientation),

    sendFeedCard: (robotId: string, links: FeedCardLink[]) =>
      pluginInstance!.sendFeedCard(robotId, links),

    atAll: () => pluginInstance!.atAll(),
    atMobiles: (mobiles: string[]) => pluginInstance!.atMobiles(mobiles),
    atUserIds: (userIds: string[]) => pluginInstance!.atUserIds(userIds),

    getEnabledRobots: () => pluginInstance!.getEnabledRobots(),
    handleWebhookCallback: (robotId: string, callback: WebhookCallback) =>
      pluginInstance!.handleWebhookCallback(robotId, callback),

    // 手动控制 Webhook 服务器
    startWebhookServer: (onCallback?: (robotId: string, data: any) => void) =>
      pluginInstance!.startWebhookServer(onCallback),
    stopWebhookServer: () => pluginInstance!.stopWebhookServer(),
  };
}
