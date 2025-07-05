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
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthenticatedRequest } from 'src/common/types/express-request.types';
import { AuthGuard } from '../../guards/auth.guard';
import * as SysMessages from '../../shared/constants/systemMessages';
import { CreatePasswordDto } from './dto/create-password.dto';
import { FindPasswordByIdDto } from './dto/find-password.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { Password } from './entities/password.entity';
import { PasswordService } from './password.service';

@Controller('passwords')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class PasswordController {
  constructor(private readonly passwordService: PasswordService) {}

  private formatResponse(
    password: Password,
    message: string,
    statusCode: number = HttpStatus.OK,
  ) {
    return {
      success: true,
      statusCode,
      timestamp: new Date().toISOString(),
      message,
      path: '/passwords',
      data: {
        id: password.id,
        title: password.title,
        username: password.username,
        password: password.password,
        websiteUrl: password.website_url,
        email: password.email,
        notes: password.notes,
        category: password.category,
        is_favourite: password.is_favorite,
        tags: password.tags,
        icon_url: password.icon_url,
        last_used_at: password.last_used_at,
        expires_at: password.expires_at,
        requires_two_factor: password.requires_two_factor,
        usage_count: password.usage_count,
        is_active: password.is_active,
        last_password_change: password.last_password_change,
        locked_until: password.locked_until,
        folder_name: password.folder_name,
        deleted_at: password.deleted_at,
        shares: password.shares,
        twofactor_codes: password.twofactor_codes,
        device_infos: password.device_infos,
        createdAt: password.created_at,
        updatedAt: password.updated_at,
      },
    };
  }

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new password entry',
    description: 'This endpoint allows creation of a new password entry.',
  })
  @ApiBody({
    type: CreatePasswordDto,
    description: 'Create password details.',
    examples: {
      mini: {
        summary: 'Typical password entry',
        value: {
          title: 'My Google Account',
          description: 'Primary Gmail login credentials',
          website_url: 'https://accounts.google.com',
          username: 'myusername',
          password: 'StrongP@ssw0rd!',
          email: 'user@gmail.com',
          notes: '2FA enabled via Authenticator app',
          category: 'Email',
          tags: ['personal', 'email'],
          icon_url: 'https://www.google.com/favicon.ico',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: SysMessages.CREATE_PASSWORD_SUCCESSFUL,
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: SysMessages.CREATE_PASSWORD_ERROR,
  })
  async create(
    @Body() createPasswordDto: CreatePasswordDto,
    @Req() req: AuthenticatedRequest,
  ) {
    console.log('Hi i got to this place inthe password controller');
    const userId = req.user?.id;
    console.log('userId', userId);
    const password = await this.passwordService.create(createPasswordDto, {
      id: userId,
    });
    return this.formatResponse(
      password,
      SysMessages.CREATE_PASSWORD_SUCCESSFUL,
      HttpStatus.CREATED,
    );
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all password entries',
    description: 'This endpoint retrieves all password entries.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: SysMessages.FIND_ALL_PASSWORDS_SUCCESSFUL,
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: SysMessages.FIND_ALL_PASSWORDS_ERROR,
  })
  async findAll() {
    const passwords = await this.passwordService.findAll();
    return {
      success: true,
      statusCode: HttpStatus.OK,
      timestamp: new Date().toISOString(),
      message: SysMessages.FIND_ALL_PASSWORDS_SUCCESSFUL,
      path: '/passwords',
      data: passwords.map((password) => ({
        id: password.id,
        title: password.title,
        username: password.username,
        password: password.password,
        websiteUrl: password.website_url,
        email: password.email,
        notes: password.notes,
        category: password.category,
        is_favourite: password.is_favorite,
        tags: password.tags,
        icon_url: password.icon_url,
        last_used_at: password.last_used_at,
        expires_at: password.expires_at,
        requires_two_factor: password.requires_two_factor,
        usage_count: password.usage_count,
        is_active: password.is_active,
        last_password_change: password.last_password_change,
        locked_until: password.locked_until,
        folder_name: password.folder_name,
        deleted_at: password.deleted_at,
        shares: password.shares,
        twofactor_codes: password.twofactor_codes,
        device_infos: password.device_infos,
        createdAt: password.created_at,
        updatedAt: password.updated_at,
      })),
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get a password entry by ID',
    description: 'This endpoint retrieves a password entry by its ID.',
  })
  @ApiParam({
    name: 'string',
    type: String,
    format: 'uuid',
    example: '5a08fcfb-cf76-4ee0-af3f-e948189fb8e5',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: SysMessages.FIND_ONE_PASSWORD_SUCCESSFUL,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: SysMessages.PASSWORD_NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: SysMessages.FIND_ONE_PASSWORD_ERROR,
  })
  async findOne(@Param() findPasswordByIdDto: FindPasswordByIdDto) {
    const password = await this.passwordService.findOne(findPasswordByIdDto);
    return this.formatResponse(
      password,
      SysMessages.FIND_ONE_PASSWORD_SUCCESSFUL,
    );
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a password entry by ID',
    description: 'This endpoint updates a password entry using its ID.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    example: '5a08fcfb-cf76-4ee0-af3f-e948189fb8e5',
  })
  @ApiBody({
    type: UpdatePasswordDto,
    description: 'Create password details.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: SysMessages.UPDATE_PASSWORD_SUCCESSFUL,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: SysMessages.PASSWORD_NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: SysMessages.UPDATE_PASSWORD_ERROR,
  })
  async update(
    @Param() findPasswordByIdDto: FindPasswordByIdDto,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    const password = await this.passwordService.update(
      findPasswordByIdDto,
      updatePasswordDto,
    );
    return this.formatResponse(
      password,
      SysMessages.UPDATE_PASSWORD_SUCCESSFUL,
    );
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a password entry by ID',
    description: 'This endpoint deletes a password entry by its ID.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    example: '5a08fcfb-cf76-4ee0-af3f-e948189fb8e5',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: SysMessages.REMOVE_PASSWORD_SUCCESSFUL,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: SysMessages.PASSWORD_NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: SysMessages.REMOVE_PASSWORD_ERROR,
  })
  async remove(@Param('id') id: number) {
    await this.passwordService.remove(id);
    return {
      success: true,
      statusCode: HttpStatus.NO_CONTENT,
      timestamp: new Date().toISOString(),
      message: SysMessages.REMOVE_PASSWORD_SUCCESSFUL,
      path: '/passwords',
      data: null,
    };
  }
}
