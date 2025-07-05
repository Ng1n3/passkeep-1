/* eslint-disable @typescript-eslint/no-unsafe-return */

import { INestApplication } from '@nestjs/common';
import { Server } from 'http';
import { CreateUserDto } from 'src/modules/users/dto/create-user.dto';
import * as request from 'supertest';
import { UpdateUserDto } from '../../src/modules/users/dto/update-user.dto';
import { User } from '../../src/modules/users/entities/user.entity';
import { TestApp } from '../utils/test-utils';

describe('User E2E', () => {
  let testApp: TestApp;
  let app: INestApplication;
  let server: Server;
  let createdUser: User;
  let authToken: string;
  let refreshToken: string;

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

    // Create a user and get auth token for each test
    const userResponse = await request(server)
      .post('/users')
      .send(validUserData)
      .expect(201);

    createdUser = userResponse.body.data;

    // Login to get auth token and refresh token
    const loginResponse = await request(server)
      .post('/auth/login')
      .send({
        email: validUserData.email,
        password: validUserData.password,
      })
      .expect(200);

    authToken = loginResponse.body.data.tokens.access_token;
    refreshToken = loginResponse.body.data.tokens.refresh_token;
  });

  const validUserData: CreateUserDto = {
    username: 'testuser',
    email: 'test@test.com',
    password: 'SecurePass123!',
    password_confirm: 'SecurePass123!',
    passwords: [],
  };

  // Helper function to make authenticated requests
  const authenticatedRequest = (method: string, url: string) => {
    return request(server)
      [method](url)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Cookie', `refresh_token=${refreshToken}`);
  };

  // Fixed version of your test
  it('/users (POST) should create a user', async () => {
    await testApp.clearDatabase();

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
    await testApp.clearDatabase();

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
    await testApp.clearDatabase();

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
    await testApp.clearDatabase();

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
    await testApp.clearDatabase();

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
    await testApp.clearDatabase();

    const response = await request(server)
      .post('/users')
      .send({ ...validUserData, password_confirm: 'Master_Pas$word' })
      .expect(400);

    expect(response.body.message).toBe('Your passwords do not match');
  });

  it('should fail with duplicate email', async () => {
    const response = await request(server)
      .post('/users')
      .send(validUserData)
      .expect(409);

    expect(response.body.message).toBe(
      'User already exists with this email or username',
    );
  });

  it('Should fail with duplicate username', async () => {
    const response = await request(server)
      .post('/users')
      .send({ ...validUserData, email: 'test2@test.com' })
      .expect(409);

    expect(response.body.message).toBe(
      'User already exists with this email or username',
    );
  });

  describe('GET /users', () => {
    it('should fetch all users', async () => {
      await request(server)
        .post('/users')
        .send({
          ...validUserData,
          email: 'test2@test.com',
          username: 'testuser2',
        });

      const response = await authenticatedRequest('get', '/users').expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.success).toBe(true);
    });

    it('should return empty array when no users exist', async () => {
      await testApp.clearDatabase(); // Clear all users
      const response = await authenticatedRequest('get', '/users').expect(200);

      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('POST /users/find', () => {
    it('should find user by email', async () => {
      const response = await authenticatedRequest('post', '/users/find')
        .send({ email: createdUser.email })
        .expect(200);

      expect(response.body.data.email).toBe(createdUser.email);
    });

    it('should find user by id', async () => {
      const response = await authenticatedRequest('post', '/users/find')
        .send({ id: createdUser.id })
        .expect(200);

      expect(response.body.data.id).toBe(createdUser.id);
    });

    it('should return 400 when no search criteria provided', async () => {
      const response = await authenticatedRequest('post', '/users/find')
        .send({})
        .expect(400);

      expect(response.body.message).toStrictEqual([
        'At leaset one fo id, email or refreshTOken must be provided',
      ]);
    });

    it('should return 404 when user not found', async () => {
      const response = await authenticatedRequest('post', '/users/find')
        .send({ email: 'nonexistent@test.com' })
        .expect(404);

      expect(response.body.message).toBe('User not found');
    });
  });

  describe('PATCH /users/:id', () => {
    const updateData: UpdateUserDto = {
      username: 'updatedusername',
    };

    const updateEmailData: UpdateUserDto = {
      email: 'test2@test2.com',
    };

    it('should update user successfully', async () => {
      const response = await authenticatedRequest(
        'put',
        `/users/${createdUser.id}`,
      )
        .send(updateData)
        .expect(200);

      expect(response.body.data.username).toBe(updateData.username);
    });

    it('should fail to update email', async () => {
      const response = await authenticatedRequest(
        'put',
        `/users/${createdUser.id}`,
      )
        .send(updateEmailData)
        .expect(409);

      expect(response.body.message).toBe('Email cannot be updated once set.');
    });

    it('should hash password when updating password', async () => {
      const newPassword = 'NewSecurePass123!';
      const _ = await authenticatedRequest('put', `/users/${createdUser.id}`)
        .send({ password: newPassword })
        .expect(200);

      // Verify password was changed by trying to login
      const loginResponse = await request(server)
        .post('/auth/login')
        .send({ email: createdUser.email, password: newPassword })
        .expect(200);

      expect(loginResponse.body.data.user.id).toBe(createdUser.id);
    });

    it('should return 404 when updating non-existent user', async () => {
      const nonExistentId = '5a08fcfb-cf76-4ee0-af3f-e948189fb8e5';
      const response = await authenticatedRequest(
        'put',
        `/users/${nonExistentId}`,
      )
        .send(updateData)
        .expect(404);

      expect(response.body.message).toBe('User not found');
    });

    it('should return 400 when updating with invalid data', async () => {
      const response = await authenticatedRequest(
        'put',
        `/users/${createdUser.id}`,
      )
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.message).toContain(
        'Please enter a valid email address',
      );
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete user successfully', async () => {
      await authenticatedRequest('delete', `/users/${createdUser.id}`).expect(
        204,
      );

      // Verify user is deleted
      const response = await authenticatedRequest('post', '/users/find')
        .send({ id: createdUser.id })
        .expect(404);

      expect(response.body.message).toBe('User not found');
    });

    it('should return 404 when deleting non-existent user', async () => {
      const nonExistentId = '5a08fcfb-cf76-4ee0-af3f-e948189fb8e5';
      const response = await authenticatedRequest(
        'delete',
        `/users/${nonExistentId}`,
      ).expect(404);

      expect(response.body.message).toBe('User not found');
    });
  });
});
