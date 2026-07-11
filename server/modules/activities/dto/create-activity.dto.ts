import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsDate } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateActivityDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsDate()
  @Transform(({ value }) => new Date(value))
  start_time!: Date;

  @IsDate()
  @Transform(({ value }) => new Date(value))
  end_time!: Date;

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