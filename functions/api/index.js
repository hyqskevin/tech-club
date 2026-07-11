/**
 * CloudBase 云函数入口 - 调试版
 * 测试数据库权限
 */
const express = require('express');
const { NestFactory } = require('@nestjs/core');
const { ExpressAdapter } = require('@nestjs/platform-express');
const { ValidationPipe } = require('@nestjs/common');

let expressApp = null;

async function getApp() {
  if (expressApp) {
    return expressApp;
  }

  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  const adapter = new ExpressAdapter(app);
  
  const { AppModule } = require('./dist/server/app.module');
  const nestApp = await NestFactory.create(AppModule, adapter, {
    logger: ['log', 'error', 'warn'],
  });
  
  nestApp.enableCors();
  
  nestApp.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: true,
    }),
  );
  
  await nestApp.init();
  
  console.log('NestJS app initialized in cloud function');
  
  expressApp = app;
  return expressApp;
}

exports.main = async (event, context) => {
  console.log('Cloud function invoked:', event.path);
  console.log('Event body type:', typeof event.body);
  console.log('Event body:', event.body);
  console.log('PG_HOST:', process.env.PG_HOST);
  console.log('PG_PORT:', process.env.PG_PORT);
  console.log('PG_DATABASE:', process.env.PG_DATABASE);
  console.log('PG_USER:', process.env.PG_USER);
  console.log('POSTGRESQL_HOST:', process.env.POSTGRESQL_HOST);
  console.log('POSTGRESQL_PORT:', process.env.POSTGRESQL_PORT);
  console.log('POSTGRESQL_USERNAME:', process.env.POSTGRESQL_USERNAME);
  console.log('DB_ADAPTER:', process.env.DB_ADAPTER);
  
  const app = await getApp();
  
  return new Promise((resolve) => {
    let body = event.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.log('Failed to parse body:', e.message);
        body = null;
      }
    }
    
    const req = {
      method: event.httpMethod,
      url: event.path,
      headers: event.headers || {},
      body: body,
      query: event.queryStringParameters || {},
      params: event.pathParameters || {},
      path: event.path,
      originalUrl: event.path,
      ip: context.clientIP || '',
      protocol: 'https',
      hostname: '',
      subdomains: [],
      fresh: false,
      stale: true,
      secure: true,
      cookies: {},
      signedCookies: {},
      route: null,
      baseUrl: '',
      _parsedUrl: null,
    };
    
    const res = {
      statusCode: 200,
      headers: {},
      body: '',
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      setHeader: function(key, value) {
        this.headers[key] = value;
        return this;
      },
      getHeader: function(key) {
        return this.headers[key];
      },
      removeHeader: function(key) {
        delete this.headers[key];
        return this;
      },
      write: function(chunk) {
        this.body += String(chunk);
        return this;
      },
      end: function(data) {
        if (data) {
          this.body = String(data);
        }
        resolve({
          statusCode: this.statusCode,
          headers: this.headers,
          body: this.body,
        });
      },
      json: function(data) {
        this.setHeader('Content-Type', 'application/json');
        this.end(JSON.stringify(data));
      },
      send: function(data) {
        if (typeof data === 'object') {
          this.json(data);
        } else {
          this.end(String(data));
        }
      },
      sendFile: function(path) {
        const fs = require('fs');
        try {
          const content = fs.readFileSync(path, 'utf-8');
          this.end(content);
        } catch (e) {
          this.status(404).send('File not found');
        }
      },
      redirect: function(status, url) {
        if (typeof status === 'string') {
          url = status;
          status = 302;
        }
        this.status(status).setHeader('Location', url).end();
      },
    };
    
    app(req, res);
  });
};