import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateReplyDto {
  @IsString()
  @IsNotEmpty()
  post_id!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsString()
  replier_user_id?: string;

  @IsString()
  @IsNotEmpty()
  replier_nickname!: string;

  @IsString()
  @IsNotEmpty()
  replier_phone!: string;
}