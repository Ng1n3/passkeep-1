import { INestApplication } from '@nestjs/common';
import { Server } from 'http';
import { CreateUserDto } from 'src/modules/users/dto/create-user.dto';
import * as request from 'supertest';
import { TestApp } from '../utils/test-utils';

describe('User E2E', () => {
  let testApp: TestApp;
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setupTestApp();
    app = testApp.app;
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await testApp.cleanUpTestApp();
  });

  beforeEach(async () => {
    await testApp.clearDatabase();
  });

  const validUserData: CreateUserDto = {
    username: 'testuser',
    email: 'test@test.com',
    password: 'SecurePass123!',
    password_confirm: 'SecurePass123!',
  };

  // Fixed version of your test
  it('/users (POST) should create a user', async () => {
    const response = await request(server)
      .post('/users')
      .send(validUserData)
      .expect(201);

    // Access properties from the nested data object
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data.email).toBe('test@test.com');
    expect(response.body.data.username).toBe('testuser');

    // You can also test the response metadata
    expect(response.body.success).toBe(true);
    expect(response.body.statusCode).toBe(201);
    expect(response.body.message).toBe('User created successfully');

    const createdUser = await testApp.userRepository.findOne({
      where: { email: validUserData.email },
    });
    expect(createdUser).toBeDefined();
    expect(createdUser?.username).toBe(validUserData.username);
  });

  it('/users (POST) should fail with missing username', async () => {
    const invalidData = { ...validUserData, username: undefined };
    const response = await request(server)
      .post('/users')
      .send(invalidData)
      .expect(400);

    expect(response.body).toEqual({
      statusCode: 400,
      message: expect.arrayContaining([
        'Username must be at least 3 characters',
        'username must be a string',
      ]),
      error: 'Bad Request',
    });
  });

  it('should fail with invalid email format', async () => {
    const response = await request(server)
      .post('/users')
      .send({
        ...validUserData,
        email: 'not-an-email',
      })
      .expect(400);

    expect(response.body.message).toContain(
      'Please enter a valid email address',
    );
  });

  it('should fail with short password', async () => {
    const response = await request(server)
      .post('/users')
      .send({
        ...validUserData,
        password: 'short',
        password_confirm: 'short',
      })
      .expect(400);

    expect(response.body.message).toContain(
      'Password must be at least 8 characters long',
    );
  });

  it('should fail weak password', async () => {
    const response = await request(server)
      .post('/users')
      .send({
        ...validUserData,
        password: 'lorenzo',
        password_confirm: 'lorenzo',
      })
      .expect(400);

    expect(response.body.message).toContain(
      'Password must contain at least one uppercase letter, one lowercase letter, one number',
    );
  });

  it('should fail with mistached passwords', async () => {
    const response = await request(server)
      .post('/users')
      .send({ ...validUserData, password_confirm: 'Master_Pas$word' })
      .expect(400);

    expect(response.body.message).toBe('Your passwords do not match');
  });

  it('should fail with duplicate email', async () => {
    // Create first user
    await request(server).post('/users').send(validUserData).expect(201);

    // try duplicate
    const response = await request(server)
      .post('/users')
      .send(validUserData)
      .expect(409);

    expect(response.body.message).toBe(
      'User already exists with this email or username',
    );
  });

  it('Should fail with duplicate username', async () => {
    await request(server).post('/users').send(validUserData).expect(201);

    //try to create with different email
    const response = await request(server)
      .post('/users')
      .send({ ...validUserData, email: 'test2@test.com' })
      .expect(409);

    expect(response.body.message).toBe(
      'User already exists with this email or username',
    );
  });
});
