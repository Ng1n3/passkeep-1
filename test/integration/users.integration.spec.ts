// import { User } from '../src/modules/users/entities/user.entity';
import { TestApp } from '../utils/test-utils';

describe('UsersService Integration', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setupTestApp();
  });

  afterEach(async () => {
    await testApp.clearDatabase();
  });

  afterAll(async () => {
    await testApp.cleanUpTestApp();
  });

  it('should create a user and persist in DB', async () => {
    const user = testApp.userRepository.create({
      email: 'test@test.com',
      username: 'testuser',
      password: 'password',
    });
    await testApp.userRepository.save(user);

    const savedUser = await testApp.userRepository.findOne({
      where: { email: 'test@test.com' },
    });
    expect(savedUser).toBeDefined();
    expect(savedUser?.username).toBe('testuser');
  });
});
