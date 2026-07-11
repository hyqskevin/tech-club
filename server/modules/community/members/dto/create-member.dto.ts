import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateMemberDto {
  @IsOptional()
  @IsString()
  user_id?: string;

  @IsString()
  @IsNotEmpty()
  nickname!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  role?: 'admin' | 'user' | 'guest';

  @IsOptional()
  @IsString()
  department?: string;
}