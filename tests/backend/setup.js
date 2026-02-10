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

const createMockTrx = () => {
  const trx = jest.fn(() => {
    const chain = {
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue({ id: 'pago-1', monto: 1000, monto_pagado: 0, fecha_vencimiento: '2025-01-01', estatus: 'pendiente' }),
      orderBy: jest.fn().mockReturnThis(),
      update: jest.fn().mockResolvedValue(1),
      insert: jest.fn().mockResolvedValue([1]),
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
    };
    return chain;
  });
  trx.commit = jest.fn();
  trx.rollback = jest.fn();
  return trx;
};

// Mock Database (Knex) - Needs to be a function
const mockDatabase = jest.fn(() => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null),
    insert: jest.fn().mockResolvedValue([1]),
    update: jest.fn().mockResolvedValue(1),
    delete: jest.fn().mockResolvedValue(1),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    sum: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    columnInfo: jest.fn().mockResolvedValue({}),
    then: function (resolve, reject) {
      return Promise.resolve([]).then(resolve, reject);
    },
  };
  return chain;
});

// Attach properties to the function object to simulate knex instance properties
mockDatabase.select = jest.fn().mockReturnThis();
mockDatabase.from = jest.fn().mockReturnThis();
mockDatabase.where = jest.fn().mockReturnThis();
mockDatabase.first = jest.fn().mockResolvedValue(null);
mockDatabase.raw = jest.fn();
mockDatabase.columnInfo = jest.fn().mockResolvedValue({});
mockDatabase.transaction = jest.fn((callback) => {
  const trx = createMockTrx();
  return callback ? callback(trx) : Promise.resolve(trx);
});

global.mockContext = {
  services: {
    ItemsService: MockItemsServiceClass,
  },
  database: mockDatabase,
  getSchema: jest.fn(),
  exceptions: {
    ServiceUnavailableException: class extends Error { constructor(msg) { super(msg); this.status = 503; } },
    ForbiddenException: class extends Error { constructor(msg) { super(msg); this.status = 403; } },
    InvalidPayloadException: class extends Error { constructor(msg) { super(msg); this.status = 400; } },
    NotFoundException: class extends Error { constructor(msg) { super(msg); this.status = 404; } },
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
