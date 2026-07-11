import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';

/** 单张图片大小上限：2MB */
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
/** 允许的图片 MIME 类型 */
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * 文件上传控制器
 * 提供图片上传接口，返回可直接使用的 URL
 */
@Controller('api/uploads')
export class UploadsController {
  /**
   * 上传单张图片
   * POST /api/uploads/image
   * Content-Type: multipart/form-data
   * 字段名: file
   */
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          // 存到 client/public/uploads，便于通过 /assets 静态目录直接访问
          const uploadDir = join(process.cwd(), 'client', 'public', 'uploads');
          if (!existsSync(uploadDir)) {
            mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (_req, file, cb) => {
          // 用 uuid 避免文件名冲突，并保留扩展名
          const ext = extname(file.originalname) || '.png';
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: {
        fileSize: MAX_IMAGE_SIZE,
      },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME.includes(file.mimetype)) {
          cb(new BadRequestException('仅支持 JPG/PNG/GIF/WEBP 格式的图片'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('未收到上传文件');
    }
    // URL 优先级：环境变量 > 当前请求 host > 相对路径
    // dev: Vite 从 client/public/ 提供服务，相对路径 /uploads/xxx 即可
    // prod: 通过 PUBLIC_UPLOAD_BASE_URL 指向 CloudBase 静态托管域名
    const base =
      process.env.PUBLIC_UPLOAD_BASE_URL && process.env.PUBLIC_UPLOAD_BASE_URL.length > 0
        ? process.env.PUBLIC_UPLOAD_BASE_URL.replace(/\/+$/, '')
        : '/uploads';
    return {
      url: `${base}/${file.filename}`,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}
