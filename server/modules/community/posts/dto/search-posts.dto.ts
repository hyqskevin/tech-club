import { IsOptional, IsString, IsInt, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { CategoryType } from '@shared/api.interface';

export class SearchPostsDto {
  @IsOptional()
  @IsString()
  category?: CategoryType;

  @IsOptional()
  @IsString()
  searchKey?: string;

  @IsOptional()
  @IsInt()
  @Max(100)
  @Type(() => Number)
  pageSize?: number;

  @IsOptional()
  @IsString()
  pageToken?: string;
}
