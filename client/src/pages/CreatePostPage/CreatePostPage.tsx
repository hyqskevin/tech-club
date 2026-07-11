import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Right,
  Loading,
} from '@nutui/icons-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { TiptapEditorComplete } from '@/components/ui/tiptap-editor';
import { CATEGORIES, type CategoryType } from '@shared/api.interface';
import { createPost } from '@/api';
import { CATEGORY_COLORS } from '@/utils/post-constants';

/* ── Schema ── */
const createPostSchema = z.object({
  title: z
    .string()
    .min(1, '标题不能为空')
    .max(100, '标题不能超过 100 个字符'),
  category: z.string().min(1, '请选择分类'),
  content: z
    .string()
    .refine(
      (val) => {
        // 去除 HTML 标签后检查是否有实际文本内容
        const textContent = val.replace(/<[^>]*>/g, '').trim();
        return textContent.length > 0;
      },
      { message: '内容不能为空' }
    ),
});

type CreatePostFormData = z.infer<typeof createPostSchema>;

interface IUserProfile {
  nickname: string;
  phone: string;
}

function loadProfile(): IUserProfile | null {
  try {
    const raw = localStorage.getItem('__global_itc_user_profile');
    if (raw) return JSON.parse(raw) as IUserProfile;
  } catch {}
  return null;
}

/**
 * 从 Tiptap HTML 中提取 <img src="..."> 的 URL 列表
 * 仅保留非 blob 临时 URL（已上传完成的）
 */
function extractImageUrls(html: string): string[] {
  const urls: string[] = [];
  const re = /<img\b[^>]*\bsrc=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const url = match[1];
    if (url && !url.startsWith('blob:') && !urls.includes(url)) {
      urls.push(url);
    }
  }
  return urls;
}

/* ── Page ── */
export default function CreatePostPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profile, setProfile] = useState<IUserProfile | null>(loadProfile);

  const form = useForm<CreatePostFormData>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      title: '',
      category: '',
      content: '',
    },
  });

  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  const isAnonymous = profile?.nickname === '匿名用户' && !profile?.phone;

  if (!profile || isAnonymous) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="bg-card border border-border rounded-xl p-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">需要登录后才能发帖</h2>
          <p className="text-muted-foreground mb-6">
            {isAnonymous ? '匿名用户需要先登录才能发布帖子，请填写昵称和手机号' : '游客仅支持浏览内容，登录后即可发布帖子和参与讨论'}
          </p>
          <Button onClick={() => navigate('/')}>
            返回首页
          </Button>
        </div>
      </div>
    );
  }

  async function onSubmit(data: CreatePostFormData) {
    if (isSubmitting) return;

    if (data.content.includes('src="blob:')) {
      toast.error('图片正在上传中，请等待上传完成后再发布');
      return;
    }

    // 从 Tiptap HTML 中提取已上传图片的 URL 列表
    const imageUrls = extractImageUrls(data.content);

    setIsSubmitting(true);

    try {
      const authorNickname = profile?.nickname ?? '匿名用户';
      const authorPhone = profile?.phone ?? '';

      await createPost({
        title: data.title,
        category: data.category as CategoryType,
        content: data.content,
        author_user_id: undefined,
        author_nickname: authorNickname,
        author_phone: authorPhone,
        images: imageUrls,
      });

      toast.success('帖子发布成功');
      navigate('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '发布失败，请稍后重试';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="max-w-3xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回
        </Button>
        <h1 className="text-2xl font-bold text-foreground">发布新帖子</h1>
      </div>

      {/* Form */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required className="text-base font-medium">
                    标题
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="请输入帖子标题"
                      className="rounded-lg text-base"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required className="text-base font-medium">
                    分类
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-lg">
                        <SelectValue placeholder="请选择帖子分类" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ background: CATEGORY_COLORS[cat].bg }}
                            />
                            {cat}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Content */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required className="text-base font-medium">
                    内容
                  </FormLabel>
                  <FormControl>
                    <TiptapEditorComplete
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="请输入帖子内容，支持 Markdown 格式..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="text-sm text-muted-foreground">
                发布后将显示为：{profile?.nickname || '匿名用户'}
              </div>
              <Button
                type="submit"
                className="rounded-full px-6 text-[#ffffff]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loading className="w-4 h-4 mr-1.5 animate-spin" />
                    发布中...
                  </>
                ) : (
                  <>
                    <Right className="w-4 h-4 mr-1.5" />
                    发布帖子
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </motion.div>
  );
}
