require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

// Initialize Sequelize with PostgreSQL connection
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: console.log,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Define TelegramGroup model
const TelegramGroup = sequelize.define('telegram_group', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING(255)
  },
  join_date: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: false,
  tableName: 'telegram_group'
});

// Define Message model
const Message = sequelize.define('message', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  telegram_message_id: {
    type: DataTypes.BIGINT
  },
  group_id: {
    type: DataTypes.BIGINT,
    references: {
      model: TelegramGroup,
      key: 'id'
    }
  },
  user_id: {
    type: DataTypes.BIGINT
  },
  username: {
    type: DataTypes.STRING(255)
  },
  content: {
    type: DataTypes.TEXT
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  }
}, {
  timestamps: false,
  tableName: 'message'
});

// Define relationships
TelegramGroup.hasMany(Message, { foreignKey: 'group_id' });
Message.belongsTo(TelegramGroup, { foreignKey: 'group_id' });

module.exports = {
  sequelize,
  TelegramGroup,
  Message
};
