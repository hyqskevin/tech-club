import { IsString, IsOptional, IsBoolean, IsDate } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateActivityDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => value ? new Date(value) : undefined)
  start_time?: Date;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => value ? new Date(value) : undefined)
  end_time?: Date;

  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  @IsString()
  cover_image?: string;

  @IsOptional()
  @IsString()
  cover_images?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsString()
  nickname!: string;

  @IsString()
  phone!: string;
}