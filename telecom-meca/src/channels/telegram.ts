/**
 * Canal de Telegram para Telecom-Meca Agent
 * 
 * Integración con Telegram Bot API para recibir consultas
 * y enviar respuestas especializadas en telecomunicaciones y mecatrónica
 */

import { EventEmitter } from 'node:events';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { URL } from 'node:url';

export interface TelegramConfig {
  botToken: string;
  webhookUrl?: string;
  port?: number;
  allowedUsers?: number[];
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: 'private' | 'group' | 'supergroup' | 'channel';
    };
    text?: string;
    date: number;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    data: string;
    message?: any;
  };
}

export interface TelegramMessage {
  chat_id: number | string;
  text: string;
  parse_mode?: 'Markdown' | 'HTML';
  reply_to_message_id?: number;
  disable_web_page_preview?: boolean;
}

export class TelegramChannel extends EventEmitter {
  private config: TelegramConfig;
  private server?: ReturnType<typeof createServer>;
  private baseUrl: string;
  private isRunning: boolean = false;

  constructor(config: TelegramConfig) {
    super();
    this.config = {
      port: 3000,
      ...config,
    };
    this.baseUrl = `https://api.telegram.org/bot${this.config.botToken}`;
  }

  /**
   * Inicia el servidor webhook o polling
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Telegram channel already running');
    }

    if (this.config.webhookUrl) {
      await this.setupWebhook();
    } else {
      await this.startPolling();
    }

    this.isRunning = true;
    this.emit('started');
  }

  /**
   * Configura webhook para recibir actualizaciones
   */
  private async setupWebhook(): Promise<void> {
    const webhookUrl = this.config.webhookUrl!;
    
    // Configurar webhook en Telegram
    const response = await fetch(`${this.baseUrl}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl }),
    });

    const result = await response.json();
    if (!result.ok) {
      throw new Error(`Failed to set webhook: ${result.description}`);
    }

    // Crear servidor HTTP para recibir webhooks
    this.server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      if (req.method !== 'POST') {
        res.writeHead(405);
        res.end('Method not allowed');
        return;
      }

      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }

      try {
        const update: TelegramUpdate = JSON.parse(body);
        await this.handleUpdate(update);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (error) {
        console.error('Error processing webhook:', error);
        res.writeHead(500);
        res.end('Internal server error');
      }
    });

    await new Promise<void>((resolve) => {
      this.server!.listen(this.config.port, () => {
        console.log(`Telegram webhook server listening on port ${this.config.port}`);
        resolve();
      });
    });
  }

  /**
   * Inicia polling largo para recibir actualizaciones
   */
  private async startPolling(): Promise<void> {
    let offset = 0;

    const poll = async () => {
      if (!this.isRunning) return;

      try {
        const response = await fetch(`${this.baseUrl}/getUpdates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            offset,
            timeout: 30,
            allowed_updates: ['message', 'callback_query'],
          }),
        });

        const result = await response.json();
        if (!result.ok) {
          throw new Error(`Polling failed: ${result.description}`);
        }

        for (const update of result.result) {
          offset = update.update_id + 1;
          await this.handleUpdate(update);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }

      // Continuar polling
      setTimeout(poll, 1000);
    };

    poll();
  }

  /**
   * Maneja una actualización de Telegram
   */
  private async handleUpdate(update: TelegramUpdate): Promise<void> {
    // Verificar usuario permitido
    if (this.config.allowedUsers && update.message?.from) {
      if (!this.config.allowedUsers.includes(update.message.from.id)) {
        console.log(`Blocked unauthorized user: ${update.message.from.id}`);
        return;
      }
    }

    if (update.message?.text) {
      const userId = update.message.from.id;
      const username = update.message.from.username || update.message.from.first_name;
      const text = update.message.text;

      console.log(`[Telegram] ${username}: ${text}`);

      this.emit('message', {
        userId: userId.toString(),
        username,
        text,
        chatId: update.message.chat.id,
        messageId: update.message.message_id,
        platform: 'telegram',
      });
    }

    if (update.callback_query?.data) {
      this.emit('callback', {
        callbackId: update.callback_query.id,
        userId: update.callback_query.from.id.toString(),
        data: update.callback_query.data,
        platform: 'telegram',
      });
    }
  }

  /**
   * Envía un mensaje a Telegram
   */
  async sendMessage(chatId: number | string, text: string, options?: Partial<TelegramMessage>): Promise<any> {
    const payload: TelegramMessage = {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      ...options,
    };

    const response = await fetch(`${this.baseUrl}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!result.ok) {
      throw new Error(`Failed to send message: ${result.description}`);
    }

    return result.result;
  }

  /**
   * Envía un mensaje con teclado inline
   */
  async sendMessageWithInlineKeyboard(
    chatId: number | string,
    text: string,
    keyboard: Array<Array<{ text: string; callback_data: string }>>
  ): Promise<any> {
    const payload = {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown' as const,
      reply_markup: {
        inline_keyboard: keyboard,
      },
    };

    const response = await fetch(`${this.baseUrl}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!result.ok) {
      throw new Error(`Failed to send message: ${result.description}`);
    }

    return result.result;
  }

  /**
   * Responde a una callback query
   */
  async answerCallbackQuery(callbackId: string, text?: string, showAlert?: boolean): Promise<void> {
    const payload: any = {
      callback_query_id: callbackId,
    };

    if (text) payload.text = text;
    if (showAlert) payload.show_alert = showAlert;

    await fetch(`${this.baseUrl}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  /**
   * Envía typing status
   */
  async sendChatAction(chatId: number | string, action: 'typing' | 'upload_photo' | 'record_video' | 'record_audio' = 'typing'): Promise<void> {
    await fetch(`${this.baseUrl}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        action,
      }),
    });
  }

  /**
   * Detiene el canal
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => resolve());
      });
    }

    // Eliminar webhook si existe
    if (this.config.webhookUrl) {
      await fetch(`${this.baseUrl}/deleteWebhook`);
    }

    this.emit('stopped');
  }

  /**
   * Obtiene información del bot
   */
  async getBotInfo(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/getMe`);
    const result = await response.json();
    return result.result;
  }
}

/**
 * Crea una instancia del canal de Telegram
 */
export function createTelegramChannel(config: TelegramConfig): TelegramChannel {
  return new TelegramChannel(config);
}
