import * as pino from 'pino';
import { Options } from 'pino-http';

const streams: pino.StreamEntry[] = [
  { stream: process.stdout },
  {
    stream: pino.destination({
      dest: '../logs/app.log',
      sync: false,
      mkdir: true,
    }),
  },
  {
    stream: pino.transport({
      target: 'pino-daily-rotate-file',
      options: {
        destination: '../logs/application-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
      },
    }),
  },
];

export const loggerOptions: Options = {
  level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
  stream: pino.multistream(streams),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.password_confirm',
    ],
    censor: '**REDACTED**',
  },
};
