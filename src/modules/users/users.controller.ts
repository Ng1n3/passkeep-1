import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

import { AuthGuard } from '../../guards/auth.guard';
import * as SysMessages from '../../shared/constants/systemMessages';
import { CreateUserDto } from './dto/create-user.dto';
import {
  FindUserByEmailDto,
  FindUserByIdDto,
  FindUserByRefreshTokenDto,
  FindUserDto,
} from './dto/find-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  UserResponseBody,
  UsersListResponseBody,
} from './dto/user-response.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private formatResponse(
    user: any,
    message: string,
    statusCode: number = HttpStatus.OK,
  ): UserResponseBody {
    return {
      success: true,
      statusCode,
      timestamp: new Date().toISOString(),
      message,
      path: '/users',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        is_activated: user.is_activated,
        last_signout_at: user.last_signout_at,
        refresh_token: user.refresh_token,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new user',
    description: 'This endpoint allows you to create a new user in the system.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: SysMessages.CREATE_USER_SUCCESS,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: SysMessages.CREATE_USER_ERROR,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: SysMessages.USER_ALREADY_EXISTS,
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: SysMessages.INTERNAL_SERVER_ERROR,
  })
  async create(
    @Body() createUserDto: CreateUserDto,
  ): Promise<UserResponseBody> {
    const user = await this.usersService.createUser(createUserDto);
    return this.formatResponse(
      user,
      SysMessages.CREATE_USER_SUCCESS,
      HttpStatus.CREATED,
    );
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all users',
    description: 'This endpoint retrieves a list of all users in the system.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: SysMessages.FETCH_USERS_SUCCESS,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: SysMessages.USER_NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: SysMessages.INTERNAL_SERVER_ERROR,
  })
  async findAll(): Promise<UsersListResponseBody> {
    const users = await this.usersService.findAllUsers();
    return {
      success: true,
      statusCode: HttpStatus.OK,
      timestamp: new Date().toISOString(),
      message: SysMessages.FETCH_USERS_SUCCESS,
      path: '/users',
      data: users.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        last_signout_at: user.last_signout_at,
        refresh_token: user.refresh_token,
        is_activated: user.is_activated,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      })),
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a user by ID',
    description: 'This endpoint retrieves a user by their unique ID.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: SysMessages.FETCH_USERS_SUCCESS,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: SysMessages.USER_NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: SysMessages.INVALID_SEARCH_CREDENTIALS,
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: SysMessages.INTERNAL_SERVER_ERROR,
  })
  async findOne(
    @Param('id') findUserDto: FindUserByIdDto,
  ): Promise<UserResponseBody> {
    const user = await this.usersService.findUserById(findUserDto);
    return this.formatResponse(user, SysMessages.FETCH_USERS_SUCCESS);
  }

  @Post('find')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Find a user by ID, email, or refresh token',
    description:
      'This endpoint finds a user using any combination of ID, email, or refresh token.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: SysMessages.FETCH_USERS_SUCCESS,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: SysMessages.INVALID_CREDENTIAL,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: SysMessages.USER_NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: SysMessages.FETCH_USER_ERROR,
  })
  async findUser(@Body() findUserDto: FindUserDto): Promise<UserResponseBody> {
    const user = await this.usersService.findUser(findUserDto);
    return this.formatResponse(user, SysMessages.FETCH_USERS_SUCCESS);
  }

  @Get('email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Find user by email',
    description: 'This endpoint retrieves a user by their email address.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: SysMessages.FETCH_USERS_SUCCESS,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: SysMessages.USER_NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: SysMessages.INVALID_SEARCH_CREDENTIALS,
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: SysMessages.INTERNAL_SERVER_ERROR,
  })
  async findUserByEmail(
    @Query() findUserByEmailDto: FindUserByEmailDto,
  ): Promise<UserResponseBody> {
    const user = await this.usersService.findUserByEmail(findUserByEmailDto);
    return this.formatResponse(user, SysMessages.FETCH_USERS_SUCCESS);
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Find user by refresh token',
    description:
      'This endpoint retrieves a user by their refresh token using POST',
  })
  @ApiBody({
    type: FindUserByRefreshTokenDto,
    description: 'Refresh token in request body',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: SysMessages.FETCH_USERS_SUCCESS,
    type: UserResponseBody,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: SysMessages.USER_NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: SysMessages.INVALID_SEARCH_CREDENTIALS,
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: SysMessages.INTERNAL_SERVER_ERROR,
  })
  async findUserByRefreshToken(
    @Body() findUserByRefreshTokenDto: FindUserByRefreshTokenDto,
  ): Promise<UserResponseBody> {
    const user = await this.usersService.findUserByRefreshToken(
      findUserByRefreshTokenDto,
    );
    return this.formatResponse(user, SysMessages.FETCH_USERS_SUCCESS);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a user by ID',
    description:
      'This endpoint allows you to update a user by their unique ID.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: SysMessages.UPDATE_USER_SUCCESS,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: SysMessages.USER_NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: SysMessages.CREATE_USER_ERROR,
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: SysMessages.INTERNAL_SERVER_ERROR,
  })
  async update(
    @Param('id') id: FindUserByIdDto,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseBody> {
    const user = await this.usersService.updateUser(id, updateUserDto);
    return this.formatResponse(user, SysMessages.UPDATE_USER_SUCCESS);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a user by ID',
    description:
      'This endpoint allows you to delete a user by their unique ID.',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: SysMessages.DELETE_USER_SUCCESS,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: SysMessages.USER_NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: SysMessages.INTERNAL_SERVER_ERROR,
  })
  async remove(@Param('id') id: FindUserByIdDto): Promise<void> {
    await this.usersService.deleteUser(id);
  }
}
