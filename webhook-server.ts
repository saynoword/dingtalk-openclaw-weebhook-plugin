/**
 * Webhook 服务器
 * 用于接收钉钉机器人的回调消息
 * 支持统一回调地址，自动识别机器人
 */

import express, { Request, Response } from 'express';

interface WebhookServerConfig {
  port: number;
  onCallback: (robotId: string, data: any) => void;
  robots?: { [robotId: string]: { accessToken?: string; name?: string } };
}

export class WebhookServer {
  private app: any;
  private config: WebhookServerConfig;
  private server: any = null;
  private tokenToRobotMap: Map<string, string> = new Map();

  constructor(config: WebhookServerConfig) {
    this.config = config;
    this.app = express();

    // 构建 token 到机器人 ID 的映射
    if (config.robots) {
      Object.entries(config.robots).forEach(([robotId, robotConfig]) => {
        if (robotConfig.accessToken) {
          this.tokenToRobotMap.set(robotConfig.accessToken, robotId);
        }
      });
    }

    // 解析 JSON 请求体
    this.app.use(express.json());

    // 设置路由
    this.setupRoutes();
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
      // 可以根据 senderId 或 conversationId 进行映射
      // 这里可以扩展自定义映射逻辑
      return 'default';
    }

    return null;
  }

  private setupRoutes(): void {
    // 统一回调接口 - 所有机器人共用
    this.app.post('/webhook', (req: Request, res: Response) => {
      const callbackData = req.body;
      
      // 自动识别机器人 ID
      let robotId = this.identifyRobotId(callbackData);
      
      // 如果无法自动识别，使用默认值或从 URL 参数获取
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

      console.log(`收到机器人 ${robotId} 的回调:`, enhancedData);

      try {
        this.config.onCallback(robotId, enhancedData);
        res.json({ success: true, robotId });
      } catch (error: any) {
        console.error('处理回调失败:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // 带机器人 ID 参数的回调接口（可选）
    this.app.post('/webhook/:robotId', (req: Request, res: Response) => {
      const { robotId } = req.params;
      const callbackData = req.body;

      // 增强回调数据
      const enhancedData = {
        ...callbackData,
        _robotId: robotId,
        _robotName: this.config.robots?.[robotId]?.name || robotId,
        _receivedAt: Date.now(),
      };

      console.log(`收到机器人 ${robotId} 的回调:`, enhancedData);

      try {
        this.config.onCallback(robotId, enhancedData);
        res.json({ success: true, robotId });
      } catch (error: any) {
        console.error('处理回调失败:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // 特定事件回调接口
    this.app.post('/webhook/:robotId/:event', (req: Request, res: Response) => {
      const { robotId, event } = req.params;
      const callbackData = req.body;

      console.log(`收到机器人 ${robotId} 的 ${event} 事件:`, callbackData);

      try {
        this.config.onCallback(robotId, { event, ...callbackData });
        res.json({ success: true, robotId });
      } catch (error: any) {
        console.error('处理回调失败:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // 健康检查接口
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ 
        status: 'ok', 
        timestamp: Date.now(),
        robots: Object.keys(this.config.robots || {}),
      });
    });

    // 获取机器人列表
    this.app.get('/robots', (req: Request, res: Response) => {
      res.json({ 
        success: true, 
        message: 'Webhook server is running',
        robots: this.config.robots || {},
        tokenMap: Object.fromEntries(this.tokenToRobotMap),
      });
    });
  }

  /**
   * 启动服务器
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.port, () => {
          console.log(`Webhook 服务器已启动，监听端口：${this.config.port}`);
          console.log(`回调地址格式：http://localhost:${this.config.port}/webhook/:robotId`);
          resolve();
        });

        this.server.on('error', (error: Error) => {
          console.error('Webhook 服务器启动失败:', error);
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
  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((err?: Error) => {
        if (err) {
          console.error('停止 Webhook 服务器失败:', err);
          reject(err);
        } else {
          console.log('Webhook 服务器已停止');
          this.server = null;
          resolve();
        }
      });
    });
  }
}

/**
 * 创建并启动 Webhook 服务器
 */
export function createWebhookServer(
  port: number,
  onCallback: (robotId: string, data: any) => void,
  robots?: { [robotId: string]: { accessToken?: string; name?: string } }
): WebhookServer {
  const server = new WebhookServer({ port, onCallback, robots });
  server.start();
  return server;
}
