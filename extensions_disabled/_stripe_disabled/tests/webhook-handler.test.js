import { jest } from '@jest/globals';
import { processEventWithRetry } from '../src/webhook-service.js';

describe('processEventWithRetry', () => {
  let mockServices;
  let mockItemsService;
  let mockSchema = {};
  let mockDatabase = {};

  beforeEach(() => {
    mockItemsService = {
      readByQuery: jest.fn(),
      updateOne: jest.fn(),
    };

    const MockItemsServiceConstructor = jest.fn(() => mockItemsService);
    mockServices = {
      ItemsService: MockItemsServiceConstructor,
    };

    // Suppress console logs during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should process payment_intent.succeeded', async () => {
    const event = {
      id: 'evt_123',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_123',
          customer: 'cus_123',
          charges: {
            data: [
              {
                payment_method_details: {
                  card: { last4: '4242' },
                },
              },
            ],
          },
        },
      },
    };

    // Mock DB finding the payment
    mockItemsService.readByQuery.mockResolvedValue([{ id: 'pago_123' }]);

    const result = await processEventWithRetry(event, mockServices, mockSchema, mockDatabase);

    expect(mockItemsService.readByQuery).toHaveBeenCalledWith({
      filter: { stripe_payment_intent_id: { _eq: 'pi_123' } },
      limit: 1,
    });

    expect(mockItemsService.updateOne).toHaveBeenCalledWith(
      'pago_123',
      expect.objectContaining({
        estatus: 'pagado',
        stripe_last4: '4242',
      })
    );

    expect(result.success).toBe(true);
  });

  it('should process payment_intent.payment_failed', async () => {
    const event = {
      id: 'evt_fail',
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: 'pi_fail',
          last_payment_error: { message: 'Insufficient funds' },
        },
      },
    };

    mockItemsService.readByQuery.mockResolvedValue([{ id: 'pago_fail' }]);

    const result = await processEventWithRetry(event, mockServices, mockSchema, mockDatabase);

    expect(mockItemsService.updateOne).toHaveBeenCalledWith(
      'pago_fail',
      expect.objectContaining({
        estatus: 'fallido',
        notas: expect.stringContaining('Insufficient funds'),
      })
    );

    expect(result.success).toBe(true);
  });

  it('should retry on error and eventually succeed', async () => {
    const event = {
      id: 'evt_retry',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_retry' } },
    };

    mockItemsService.readByQuery.mockResolvedValue([{ id: 'pago_retry' }]);

    // Fail twice, then succeed
    mockItemsService.updateOne
      .mockRejectedValueOnce(new Error('DB Error 1'))
      .mockRejectedValueOnce(new Error('DB Error 2'))
      .mockResolvedValueOnce(true);

    // Mock setTimeout to speed up tests
    jest.spyOn(global, 'setTimeout').mockImplementation((fn) => fn()); // Fix: simple callback execution

    const result = await processEventWithRetry(event, mockServices, mockSchema, mockDatabase);

    expect(mockItemsService.updateOne).toHaveBeenCalledTimes(3);
    expect(result.success).toBe(true);
  });
});
