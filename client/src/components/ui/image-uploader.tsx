"use client";

import { useRef, useState } from 'react';
import { Photograph, Del, Loading } from '@nutui/icons-react';
import { toast } from 'sonner';
import { uploadImage } from '@/api/upload-service';
import { compressImageToLimit } from '@/utils/image';
import { Button } from '@/components/ui/button';

/** 最大图片数 */
const MAX_IMAGES = 9;
/** 单张图片大小上限：2MB（与后端一致） */
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
/** 允许的图片 MIME 类型 */
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

interface ImageUploaderProps {
  /** 已上传图片的 URL 列表 */
  value: string[];
  /** 图片列表变化回调 */
  onChange: (urls: string[]) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 最大图片数（默认 9） */
  max?: number;
  /** 自定义标签 */
  label?: string;
}

/**
 * 图片上传组件（纯图床，无富文本）
 * - 点击"添加图片"按钮或拖拽上传
 * - 上传后显示缩略图
 * - 鼠标悬停可删除
 */
export function ImageUploader({
  value,
  onChange,
  disabled = false,
  max = MAX_IMAGES,
  label = '添加图片',
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const uploadAndAdd = async (file: File) => {
    if (!ALLOWED_MIME.includes(file.type)) {
      toast.error('仅支持 JPG/PNG/GIF/WEBP 格式的图片');
      return;
    }
    // 超 2MB 尝试自动压缩，仍超限再报错
    let fileToUpload = file;
    if (file.size > MAX_IMAGE_SIZE) {
      try {
        const result = await compressImageToLimit(file, MAX_IMAGE_SIZE);
        if (result.compressed) {
          fileToUpload = result.file;
          const before = (result.originalSize / 1024 / 1024).toFixed(2);
          const after = (result.finalSize / 1024 / 1024).toFixed(2);
          toast.success(`图片已自动压缩：${before}MB → ${after}MB`);
        } else {
          toast.error(`图片大小不能超过 2MB（当前 ${(file.size / 1024 / 1024).toFixed(2)}MB，压缩后仍超限）`);
          return;
        }
      } catch {
        toast.error(`图片大小不能超过 2MB（当前 ${(file.size / 1024 / 1024).toFixed(2)}MB）`);
        return;
      }
    }
    if (value.length >= max) {
      toast.error(`最多只能上传 ${max} 张图片`);
      return;
    }

    setUploadingCount((c) => c + 1);
    try {
      const { url } = await uploadImage(fileToUpload);
      const absoluteUrl = url.startsWith('http')
        ? url
        : `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
      onChange((prev) => [...prev, absoluteUrl]);
      if (fileToUpload === file) toast.success('图片上传成功');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '图片上传失败';
      toast.error(msg);
    } finally {
      setUploadingCount((c) => Math.max(0, c - 1));
    }
  };

  const handlePick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    void Array.from(files).reduce<Promise<void>>(async (acc, file) => {
      await acc;
      await uploadAndAdd(file);
    }, Promise.resolve());
    e.target.value = '';
  };

  const handleRemove = (url: string) => {
    onChange(value.filter((u) => u !== url));
  };

  return (
    <div
      className="space-y-3"
      onDragOver={(e) => {
        if (disabled) return;
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setIsDragging(true);
        }
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (disabled) return;
        const files = Array.from(e.dataTransfer.files);
        files.forEach((file) => void uploadAndAdd(file));
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        multiple
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />

      {/* 缩略图网格 */}
      {value.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {value.map((url) => (
            <div
              key={url}
              className="relative group aspect-square rounded-lg overflow-hidden bg-muted ring-1 ring-inset ring-border"
            >
              <img
                src={url}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  // 图片加载失败时显示占位灰块
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(url)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="删除图片"
                >
                  <Del width={12} height={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 添加按钮 */}
      {!disabled && value.length < max && (
        <Button
          type="button"
          variant="secondary"
          onClick={handlePick}
          disabled={uploadingCount > 0}
          className="rounded-lg w-full sm:w-auto"
        >
          {uploadingCount > 0 ? (
            <>
              <Loading className="w-4 h-4 mr-1.5 animate-spin" />
              上传中...
            </>
          ) : (
            <>
              <Photograph className="w-4 h-4 mr-1.5" />
              {label}（{value.length}/{max}）
            </>
          )}
        </Button>
      )}

      {isDragging && (
        <div className="text-sm text-primary text-center py-2 border-2 border-dashed border-primary rounded-lg">
          松开鼠标即可上传
        </div>
      )}
    </div>
  );
}
