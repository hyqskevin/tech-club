"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Photograph, Loading } from '@nutui/icons-react';

import { uploadImage } from '@/api/upload-service';
import { compressImageToLimit } from '@/utils/image';

/** 最大图片数（与后端 DTO ArrayMaxSize 一致） */
const MAX_IMAGES = 9;
/** 单张图片大小上限：2MB（与后端一致） */
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
/** 允许的图片 MIME 类型 */
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

interface TiptapEditorCompleteProps {
  /** HTML 内容 */
  value: string;
  /** 内容变化时回调 */
  onValueChange: (value: string) => void;
  /** 占位符文本 */
  placeholder?: string;
  /** 最小高度 */
  minHeight?: number;
  /** 是否禁用编辑器 */
  disabled?: boolean;
}

/**
 * 真实现的 Tiptap 富文本编辑器
 * 支持：
 * - 基础文本格式（粗体、斜体、删除线、行内代码）
 * - 标题、列表、引用、代码块
 * - 图片上传（点击工具栏或粘贴/拖拽）
 * - 链接
 */
export function TiptapEditorComplete({
  value,
  onValueChange,
  placeholder = '请输入内容...',
  minHeight = 300,
  disabled = false,
}: TiptapEditorCompleteProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-md my-2',
        },
      }),
      
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      onValueChange(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none focus:outline-none px-4 py-3 min-h-[var(--editor-min-h)]',
        style: `--editor-min-h: ${minHeight}px`,
      },
    },
  });

  /** 当外部 value 变化时（如重置表单），同步编辑器内容 */
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
    // 仅在 value 引用变化时同步，避免输入循环
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  /** 当 disabled 变化时切换编辑器可编辑状态 */
  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  /**
   * 上传图片并插入到编辑器
   */
  const uploadAndInsert = useCallback(
    async (file: File) => {
      if (!editor) return;

      // 校验 MIME
      if (!ALLOWED_MIME.includes(file.type)) {
        toast.error('仅支持 JPG/PNG/GIF/WEBP 格式的图片');
        return;
      }
      // 校验大小：超 2MB 尝试自动压缩，仍超限再报错
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

      // 校验图片数量上限
      const currentImgCount = countImages(editor.getHTML());
      if (currentImgCount >= MAX_IMAGES) {
        toast.error(`最多只能上传 ${MAX_IMAGES} 张图片`);
        return;
      }

      setUploadingCount((c) => c + 1);
      try {
        const { url } = await uploadImage(fileToUpload);
        // 把后端返回的相对路径（如 /uploads/xxx.png）转成绝对 URL，
        // 避免 Tiptap 编辑器内部 baseURL 解析或不同上下文下解析失败导致预览 broken。
        const absoluteUrl = url.startsWith('http')
          ? url
          : `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
        editor.chain().focus().setImage({ src: absoluteUrl, alt: fileToUpload.name }).run();
        if (fileToUpload === file) toast.success('图片上传成功');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '图片上传失败';
        toast.error(msg);
      } finally {
        setUploadingCount((c) => Math.max(0, c - 1));
      }
    },
    [editor],
  );

  /**
   * 处理工具栏"插入图片"点击
   */
  const handlePickImage = () => {
    fileInputRef.current?.click();
  };

  /**
   * 处理文件输入变化
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    // 顺序上传多张
    void Array.from(files).reduce<Promise<void>>(async (acc, file) => {
      await acc;
      await uploadAndInsert(file);
    }, Promise.resolve());
    // 清空 input 以便重复选择同一文件
    e.target.value = '';
  };

  /**
   * 拖拽进入
   */
  const handleDragOver = (e: React.DragEvent) => {
    if (disabled) return;
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      setIsDragging(true);
    }
  };

  /**
   * 拖拽离开
   */
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  /**
   * 拖拽放下
   */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    void Array.from(files).reduce<Promise<void>>(async (acc, file) => {
      await acc;
      if (file.type.startsWith('image/')) {
        await uploadAndInsert(file);
      }
    }, Promise.resolve());
  };

  /** 粘贴图片 */
  useEffect(() => {
    if (!editor) return;
    const handlePaste = (event: ClipboardEvent) => {
      if (disabled) return;
      const items = event.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            event.preventDefault();
            void uploadAndInsert(file);
          }
        }
      }
    };
    const dom = editor.view.dom;
    dom.addEventListener('paste', handlePaste);
    return () => dom.removeEventListener('paste', handlePaste);
  }, [editor, uploadAndInsert, disabled]);

  if (!editor) {
    return (
      <div
        className="w-full rounded-lg border border-border bg-background animate-pulse"
        style={{ minHeight }}
      />
    );
  }

  return (
    <div
      className={`w-full rounded-lg border bg-background overflow-hidden transition-colors ${
        isDragging ? 'border-primary ring-2 ring-primary/30' : 'border-border'
      }`}
    >
      {/* 工具栏 */}
      {!disabled && (
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border bg-muted/30 flex-wrap">
          <ToolbarButton
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="粗体"
            label="B"
            className="font-bold"
          />
          <ToolbarButton
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="斜体"
            label="I"
            className="italic"
          />
          <ToolbarButton
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="删除线"
            label="S"
            className="line-through"
          />
          <ToolbarButton
            active={editor.isActive('code')}
            onClick={() => editor.chain().focus().toggleCode().run()}
            title="行内代码"
            label="< >"
            className="font-mono text-xs"
          />
          <ToolbarDivider />
          <ToolbarButton
            active={editor.isActive('heading', { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="标题 1"
            label="H1"
            className="font-bold"
          />
          <ToolbarButton
            active={editor.isActive('heading', { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="标题 2"
            label="H2"
            className="font-bold"
          />
          <ToolbarButton
            active={editor.isActive('heading', { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="标题 3"
            label="H3"
            className="font-bold"
          />
          <ToolbarDivider />
          <ToolbarButton
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="无序列表"
            label="• 列表"
          />
          <ToolbarButton
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="有序列表"
            label="1. 列表"
          />
          <ToolbarButton
            active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="引用"
            label="❝"
          />
          <ToolbarButton
            active={editor.isActive('codeBlock')}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="代码块"
            label="{}"
          />
          <ToolbarDivider />
          <button
            type="button"
            onClick={handlePickImage}
            disabled={uploadingCount > 0}
            title="插入图片"
            className="inline-flex items-center gap-1 px-2 h-7 rounded text-xs hover:bg-accent text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadingCount > 0 ? (
              <Loading className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Photograph className="w-3.5 h-3.5" />
            )}
            图片
          </button>
          <ToolbarDivider />
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="撤销"
            label="↶"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="重做"
            label="↷"
          />
          <ToolbarDivider />
          <ToolbarButton
            onClick={() => editor.chain().focus().clearContent().run()}
            title="清空内容"
            label="清空"
            className="text-muted-foreground"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_MIME.join(',')}
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* 编辑区域 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="relative"
      >
        <EditorContent editor={editor} />

        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/10 pointer-events-none">
            <div className="text-primary font-medium">松开鼠标上传图片</div>
          </div>
        )}

        {uploadingCount > 0 && (
          <div className="absolute top-2 right-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-card border border-border text-xs text-muted-foreground shadow-sm">
            <Loading className="w-3.5 h-3.5 animate-spin" />
            正在上传 {uploadingCount} 张图片...
          </div>
        )}
      </div>

      {/* 底部提示 */}
      <div className="px-3 py-1.5 border-t border-border bg-muted/20 text-xs text-muted-foreground flex items-center justify-between">
        <span>支持粘贴、拖拽图片，最多 {MAX_IMAGES} 张，单张不超过 2MB</span>
        <span>{countImages(editor.getHTML())} / {MAX_IMAGES} 张图片</span>
      </div>
    </div>
  );
}

/**
 * 工具栏按钮
 */
function ToolbarButton({
  active,
  disabled,
  onClick,
  title,
  label,
  className,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded text-xs hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed ${
        active ? 'bg-primary/15 text-primary' : 'text-foreground'
      } ${className ?? ''}`}
    >
      {label}
    </button>
  );
}

/** 工具栏分隔线 */
function ToolbarDivider() {
  return <div className="w-px h-5 bg-border mx-1" aria-hidden />;
}

/** 计算 HTML 中的图片数（兜底逻辑） */
function countImages(html: string): number {
  const matches = html.match(/<img\b[^>]*>/gi);
  return matches ? matches.length : 0;
}