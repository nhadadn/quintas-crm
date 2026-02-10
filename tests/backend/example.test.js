const { mockContext } = require('./setup');

describe('Example Test Suite', () => {
  test('should verify that mocks are working', () => {
    // 1. Arrange
    const { ItemsService } = mockContext.services;
    const itemsServiceInstance = new ItemsService();
    
    itemsServiceInstance.readOne.mockResolvedValue({ id: 1, name: 'Test Item' });

    // 2. Act
    return itemsServiceInstance.readOne(1).then(data => {
      // 3. Assert
      expect(data).toEqual({ id: 1, name: 'Test Item' });
      expect(itemsServiceInstance.readOne).toHaveBeenCalledWith(1);
    });
  });

  test('should verify database transaction mock', async () => {
    const trx = await mockContext.database.transaction();
    await trx.commit();
    expect(mockContext.database.transaction).toHaveBeenCalled();
  });
});
