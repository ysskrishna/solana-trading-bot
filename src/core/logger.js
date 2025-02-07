const winston = require('winston');
const path = require('path');
const fs = require('fs');
const { Config } = require('./config');

// Ensure logs directory exists
if (!fs.existsSync(Config.logsDirectory)) {
    fs.mkdirSync(Config.logsDirectory, { recursive: true });
}

// Custom timestamp format
const customTimestampFormat = winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
});

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        customTimestampFormat,
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ 
            filename: path.join(Config.logsDirectory, 'app.log')
        })
    ]
});

// If we're not in production, also log to console
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            customTimestampFormat,
            winston.format.printf(({ level, message, timestamp }) => {
                return `${timestamp} ${level}: ${message}`;
            })
        )
    }));
}

module.exports = logger; 