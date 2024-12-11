require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

// Initialize Sequelize with PostgreSQL connection
console.log('Setting up database connection...');
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set!');
  process.exit(1);
}
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: (msg) => console.log('Database Query:', msg),
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  retry: {
    max: 5,
    backoffBase: 1000,
    backoffExponent: 1.5
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

// Initialize database and create tables
async function initDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Successfully connected to PostgreSQL database');
    await sequelize.sync();
    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Unable to initialize database:', error);
  }
}

// Initialize database when this module is imported
(async () => {
  console.log('Initializing database connection...');
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not set!');
    process.exit(1);
  }
  console.log('Database URL:', 'Present (hidden)');
  
  try {
    await sequelize.authenticate();
    console.log('Successfully connected to PostgreSQL database');
    await sequelize.sync();
    console.log('Database tables created/synchronized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    if (error.original) {
      console.error('Original error:', error.original.message);
    }
    // Don't exit process, allow retry logic to handle temporary connection issues
  }
})();

module.exports = {
  sequelize,
  TelegramGroup,
  Message
};
