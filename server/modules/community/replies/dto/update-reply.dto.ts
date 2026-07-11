import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateReplyDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsBoolean()
  is_adopted?: boolean;

  @IsString()
  nickname!: string;

  @IsString()
  phone!: string;
}