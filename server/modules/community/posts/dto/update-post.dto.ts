import { IsString, IsOptional, IsArray, ArrayMaxSize } from 'class-validator';
import type { CategoryType } from '@shared/api.interface';

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  category?: CategoryType;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  status?: '讨论中' | '已解决';

  /** 帖子附图 URL 列表（最多 9 张） */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  @IsString({ each: true })
  images?: string[];

  @IsString()
  nickname!: string;

  @IsString()
  phone!: string;
}