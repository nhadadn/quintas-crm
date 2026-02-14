// Mock básico para Directus Services
const mockItemsService = {
  readByQuery: jest.fn(),
  readOne: jest.fn(),
  createOne: jest.fn(),
  createMany: jest.fn(),
  updateOne: jest.fn(),
  updateMany: jest.fn(),
  deleteOne: jest.fn(),
};

// Create a mock class that returns the singleton mock instance
const MockItemsServiceClass = jest.fn(() => mockItemsService);
const MockMailServiceClass = jest.fn(() => ({ send: jest.fn() }));

// Mock Database Chain (Singleton for easier testing)
const mockChain = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  whereIn: jest.fn().mockReturnThis(),
  whereNot: jest.fn().mockReturnThis(),
  first: jest.fn().mockResolvedValue(null),
  insert: jest.fn().mockResolvedValue([1]),
  update: jest.fn().mockResolvedValue(1),
  delete: jest.fn().mockResolvedValue(1),
  del: jest.fn().mockResolvedValue(1),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  sum: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  groupByRaw: jest.fn().mockReturnThis(),
  raw: jest.fn((str) => str),
  count: jest.fn().mockReturnThis(),
  columnInfo: jest.fn().mockResolvedValue({}),
  transacting: jest.fn().mockReturnThis(),
  forUpdate: jest.fn().mockReturnThis(),
  then: jest.fn(function (resolve, reject) {
    return Promise.resolve(this.mockResponse || []).then(resolve, reject);
  }),
  catch: function (reject) {
    return Promise.resolve([]).catch(reject);
  },
};

// Helper to set mock response for the chain
mockChain.setMockResponse = function (data) {
  this.mockResponse = data;
  return this;
};

// Mock Database (Knex) - Returns the singleton chain
const mockDatabase = jest.fn(() => mockChain);

// Attach properties to the function object to simulate knex instance properties
Object.assign(mockDatabase, mockChain);

mockDatabase.transaction = jest.fn((callback) => {
  // Return the same chain for transaction to keep things simple,
  // or a slightly modified one if needed.
  // Ideally, transaction object has commit/rollback.
  const trx = jest.fn(() => mockChain);
  // Exclude 'then' and 'catch' from trx to prevent await from unwrapping it
  const { then: _then, catch: _catchFn, ...chainProps } = mockChain;
  Object.assign(trx, chainProps);
  trx.commit = jest.fn();
  trx.rollback = jest.fn();

  return callback ? callback(trx) : Promise.resolve(trx);
});

global.mockContext = {
  services: {
    ItemsService: MockItemsServiceClass,
    MailService: MockMailServiceClass,
  },
  database: mockDatabase,
  dbChain: mockChain, // Expose chain for assertions
  getSchema: jest.fn(),
  exceptions: {
    ServiceUnavailableException: class extends Error {
      constructor(msg) {
        super(msg);
        this.status = 503;
      }
    },
    ForbiddenException: class extends Error {
      constructor(msg) {
        super(msg);
        this.status = 403;
      }
    },
    InvalidPayloadException: class extends Error {
      constructor(msg) {
        super(msg);
        this.status = 400;
      }
    },
    NotFoundException: class extends Error {
      constructor(msg) {
        super(msg);
        this.status = 404;
      }
    },
  },
  env: {
    STRIPE_SECRET_KEY: 'sk_test_123',
    STRIPE_WEBHOOK_SECRET: 'whsec_123',
  },
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
};

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

const mockRouter = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  use: jest.fn(),
};

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  return res;
};

module.exports = {
  mockItemsService,
  mockContext: global.mockContext,
  mockRouter,
  mockRes,
};
