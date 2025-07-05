import { Transform } from 'class-transformer';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class FindPasswordByIdDto {
  @IsUUID('4', { message: 'ID must be a valid UUID' })
  @IsNotEmpty({ message: 'ID is required' })
  @Transform(({ value }: { value: string }) => value?.trim())
  id: string;
}
