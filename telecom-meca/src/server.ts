/**
 * Servidor principal para Telecom-Meca Agent
 * 
 * Integra:
 * - API REST para chat
 * - WebSocket para actualizaciones en tiempo real
 * - Servidor de archivos estáticos para la UI web
 * - Canal de Telegram
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { createAgent, type AgentConfig } from './core/agent.js';
import { createTelegramChannel, type TelegramConfig } from './channels/telegram.js';

const PORT = process.env.PORT || 8080;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// MIME types para archivos estáticos
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

class TelecomMecaServer {
  private agent: any;
  private telegramChannel: any;
  private httpServer: ReturnType<typeof createServer>;
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private publicDir: string;

  constructor() {
    this.publicDir = join(process.cwd(), 'public');
    
    // Configurar agente
    const agentConfig: AgentConfig = {
      verbose: true,
      preferredModel: 'qwen2.5-coder:7b',
      qwen: {
        baseUrl: process.env.OLLAMA_HOST || 'http://localhost:11434',
        mode: 'ollama',
      },
    };

    this.agent = createAgent(agentConfig);

    // Configurar servidor HTTP
    this.httpServer = createServer(this.handleRequest.bind(this));

    // Configurar WebSocket
    this.wss = new WebSocketServer({ noServer: true });

    // Configurar eventos del agente
    this.setupAgentEvents();

    // Configurar Telegram si hay token
    if (TELEGRAM_BOT_TOKEN) {
      this.setupTelegram();
    }
  }

  private setupAgentEvents(): void {
    this.agent.on('ready', (data: any) => {
      console.log('✅ Agente listo:', data);
      this.broadcast({ type: 'agent_ready', data });
    });

    this.agent.on('error', (error: Error) => {
      console.error('❌ Error del agente:', error);
      this.broadcast({ type: 'agent_error', error: error.message });
    });
  }

  private setupTelegram(): void {
    const telegramConfig: TelegramConfig = {
      botToken: TELEGRAM_BOT_TOKEN!,
      allowedUsers: process.env.TELEGRAM_ALLOWED_USERS
        ? process.env.TELEGRAM_ALLOWED_USERS.split(',').map(Number)
        : undefined,
    };

    this.telegramChannel = createTelegramChannel(telegramConfig);

    this.telegramChannel.on('started', () => {
      console.log('✅ Canal de Telegram iniciado');
    });

    this.telegramChannel.on('message', async (msg: any) => {
      console.log(`📨 Telegram - ${msg.username}: ${msg.text}`);

      try {
        // Enviar typing status
        await this.telegramChannel.sendChatAction(msg.chatId, 'typing');

        // Procesar con el agente
        const response = await this.agent.process(msg.text);

        // Enviar respuesta
        await this.telegramChannel.sendMessage(msg.chatId, response.message);

        // Mostrar herramientas si las hay
        if (response.toolCalls && response.toolCalls.length > 0) {
          const toolsText = response.toolCalls
            .map((tool: any) => `🔧 *${tool.name}*:\n\`\`\`\n${JSON.stringify(tool.result, null, 2)}\n\`\`\``)
            .join('\n\n');
          
          await this.telegramChannel.sendMessage(msg.chatId, toolsText);
        }
      } catch (error) {
        console.error('Error processing Telegram message:', error);
        await this.telegramChannel.sendMessage(msg.chatId, '❌ Error al procesar tu consulta.');
      }
    });
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url || '/', `http://localhost:${PORT}`);

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Rutas de API
    if (url.pathname === '/api/chat' && req.method === 'POST') {
      await this.handleChat(req, res);
      return;
    }

    if (url.pathname === '/api/health') {
      this.handleHealth(res);
      return;
    }

    // Servir archivos estáticos
    if (req.method === 'GET') {
      await this.serveStatic(url.pathname, res);
      return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }

  private async handleChat(req: IncomingMessage, res: ServerResponse): Promise<void> {
    let body = '';

    for await (const chunk of req) {
      body += chunk;
    }

    try {
      const { query, model, config } = JSON.parse(body);

      if (!query) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Query is required' }));
        return;
      }

      // Cambiar modelo si se especifica
      if (model) {
        this.agent.config.preferredModel = model;
      }

      // Aplicar configuración personalizada si viene
      if (config) {
        if (config.temperature !== undefined) {
          // La temperatura se aplicaría en las llamadas al modelo
          console.log('Temperature:', config.temperature);
        }
        if (config.skills) {
          console.log('Skills activas:', config.skills);
        }
      }

      // Procesar consulta
      const response = await this.agent.process(query);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));

      // Broadcast a clientes WebSocket
      this.broadcast({
        type: 'chat_response',
        data: response,
      });
    } catch (error) {
      console.error('Error in chat handler:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }

  private handleHealth(res: ServerResponse): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      telegram: !!this.telegramChannel,
    }));
  }

  private async serveStatic(pathname: string, res: ServerResponse): Promise<void> {
    // Ruta por defecto
    if (pathname === '/') {
      pathname = '/index.html';
    }

    const filePath = join(this.publicDir, pathname);
    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    try {
      const content = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
    }
  }

  private broadcast(message: any): void {
    const data = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  async start(): Promise<void> {
    // Inicializar agente
    console.log('🚀 Iniciando Telecom-Meca Agent...');
    await this.agent.initialize();

    // Manejar upgrade para WebSocket
    this.httpServer.on('upgrade', (req, socket, head) => {
      const url = new URL(req.url || '/', `http://${req.headers.host}`);
      
      if (url.pathname === '/ws') {
        this.wss.handleUpgrade(req, socket, head, (ws) => {
          this.wss.emit('connection', ws, req);
        });
      } else {
        socket.destroy();
      }
    });

    // Manejar conexiones WebSocket
    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      console.log('🔌 Cliente WebSocket conectado');

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log('🔌 Cliente WebSocket desconectado');
      });

      // Enviar estado inicial
      ws.send(JSON.stringify({
        type: 'connected',
        timestamp: new Date().toISOString(),
      }));
    });

    // Iniciar servidor HTTP
    await new Promise<void>((resolve) => {
      this.httpServer.listen(PORT, () => {
        console.log(`🌐 Servidor corriendo en http://localhost:${PORT}`);
        resolve();
      });
    });

    // Iniciar Telegram si está configurado
    if (this.telegramChannel) {
      await this.telegramChannel.start();
      console.log(`📱 Bot de Telegram activo`);
    }

    console.log('\n✅ Telecom-Meca Agent listo para usar!');
    console.log('   - Web UI: http://localhost:' + PORT);
    console.log('   - API: http://localhost:' + PORT + '/api/chat');
    if (TELEGRAM_BOT_TOKEN) {
      console.log('   - Telegram: Activo');
    }
  }

  async stop(): Promise<void> {
    console.log('\n🛑 Deteniendo servidor...');

    // Cerrar WebSocket
    this.clients.forEach((client) => {
      client.close();
    });
    this.wss.close();

    // Detener Telegram
    if (this.telegramChannel) {
      await this.telegramChannel.stop();
    }

    // Cerrar servidor HTTP
    await new Promise<void>((resolve) => {
      this.httpServer.close(() => resolve());
    });

    console.log('✅ Servidor detenido');
  }
}

// Iniciar servidor
const server = new TelecomMecaServer();

// Manejar señales de terminación
process.on('SIGINT', async () => {
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await server.stop();
  process.exit(0);
});

// Iniciar
server.start().catch((error) => {
  console.error('Error starting server:', error);
  process.exit(1);
});
