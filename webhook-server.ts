/**
 * Webhook 服务器
 * 用于接收钉钉机器人的回调消息
 */

import express, { Request, Response } from 'express';

interface WebhookServerConfig {
  port: number;
  onCallback: (robotId: string, data: any) => void;
}

export class WebhookServer {
  private app: any;
  private config: WebhookServerConfig;
  private server: any = null;

  constructor(config: WebhookServerConfig) {
    this.config = config;
    this.app = express();

    // 解析 JSON 请求体
    this.app.use(express.json());

    // 设置路由
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // 通用回调接口
    this.app.post('/webhook/:robotId', (req: Request, res: Response) => {
      const { robotId } = req.params;
      const callbackData = req.body;

      console.log(`收到机器人 ${robotId} 的回调:`, callbackData);

      try {
        this.config.onCallback(robotId, callbackData);
        res.json({ success: true });
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
        res.json({ success: true });
      } catch (error: any) {
        console.error('处理回调失败:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // 健康检查接口
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: Date.now() });
    });

    // 获取机器人列表
    this.app.get('/robots', (req: Request, res: Response) => {
      res.json({ success: true, message: 'Webhook server is running' });
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
  onCallback: (robotId: string, data: any) => void
): WebhookServer {
  const server = new WebhookServer({ port, onCallback });
  server.start();
  return server;
}
