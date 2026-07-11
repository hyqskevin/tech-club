import { IsString, IsOptional, IsInt, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchRepliesDto {
  @IsString()
  post_id!: string;

  @IsOptional()
  @IsInt()
  @Max(100)
  @Type(() => Number)
  pageSize?: number;

  @IsOptional()
  @IsString()
  pageToken?: string;
}