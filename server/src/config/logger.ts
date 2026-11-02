import pino from 'pino'
import pinoHttp from 'pino-http'

const isProduction = process.env.NODE_ENV === 'production'

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'warn'),
  // Tokens and cookies are credentials; never write them to logs
  redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]']
})

// One JSON line per request in production; set LOG_LEVEL=info locally to see them in dev
export const requestLogger = pinoHttp({
  logger,
  autoLogging: { ignore: req => req.url === '/health' },
  customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
  serializers: {
    req: req => ({ method: req.method, url: req.url, id: req.id }),
    res: res => ({ statusCode: res.statusCode })
  }
})
