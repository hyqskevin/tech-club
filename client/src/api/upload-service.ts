import axios from 'axios';

/** 上传接口返回结构 */
export interface UploadImageResponse {
  url: string;
  filename: string;
  size: number;
  mimetype: string;
}

/**
 * 上传单张图片到后端
 * @param file 图片文件
 * @returns 上传结果（含可访问 URL）
 */
export async function uploadImage(file: File): Promise<UploadImageResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post<UploadImageResponse>(
    '/api/uploads/image',
    formData,
    {
      timeout: 60000,
    },
  );
  return response.data;
}