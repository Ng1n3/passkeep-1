import { ApiProperty } from '@nestjs/swagger';

export class BaseResponseBody<T> {
  @ApiProperty({
    description: 'Indicates if the request was successful',
    example: true,
    default: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'HTTP status code of the response',
    example: 200,
    enum: [200, 201, 400, 401, 403, 404, 500],
  })
  statusCode: number;

  @ApiProperty({
    description: 'Timestamp of when the response was generated',
    example: '2023-10-25T14:30:00.000Z',
    type: String,
  })
  timestamp: string;

  @ApiProperty({
    description: 'Human-readable message describing the result',
    example: 'Operation successful',
  })
  message: string;

  @ApiProperty({
    description: 'API endpoint path that was called',
    example: '/api/v1/auth/login',
  })
  path: string;

  @ApiProperty({
    description: 'The response data payload',
  })
  data: T;
}
