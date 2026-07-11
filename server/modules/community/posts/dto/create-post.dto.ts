import { IsString, IsNotEmpty, IsOptional, IsArray, ArrayMaxSize } from 'class-validator';
import type { CategoryType } from '@shared/api.interface';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  category!: CategoryType;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsString()
  author_user_id?: string;

  @IsString()
  @IsNotEmpty()
  author_nickname!: string;

  @IsString()
  @IsNotEmpty()
  author_phone!: string;

  /** 帖子附图 URL 列表（最多 9 张） */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  @IsString({ each: true })
  images?: string[];
}