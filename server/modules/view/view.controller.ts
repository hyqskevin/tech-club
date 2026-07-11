import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'path';

@Controller()
export class ViewController {
  @Get('/')
  renderRoot(@Res() res: Response) {
    const indexPath = join(process.cwd(), 'client', 'index.html');
    return res.sendFile(indexPath);
  }
}
