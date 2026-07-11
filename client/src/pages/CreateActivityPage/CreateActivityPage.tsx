import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft } from '@nutui/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ImageUploader } from '@/components/ui/image-uploader';
import { createActivity, getMemberByNicknameAndPhone, getActivityById, updateActivity } from '@/api';

/** 用户配置信息接口 */
interface IUserProfile {
  nickname: string;
  phone: string;
}

/**
 * 从 localStorage 加载用户配置信息
 * @returns 用户配置信息或 null
 */
function loadProfile(): IUserProfile | null {
  try {
    const raw = localStorage.getItem('__global_itc_user_profile');
    if (raw) return JSON.parse(raw) as IUserProfile;
  } catch {}
  return null;
}

/** 活动表单校验规则（草稿模式下，标题非必填；发布时全字段必填） */
const createActivitySchema = z
  .object({
    title: z.string().max(200, '标题不能超过 200 个字符').optional(),
    content: z.string().optional(),
    start_time: z.coerce.date({ invalid_type_error: '请选择有效的开始时间' }),
    end_time: z.coerce.date({ invalid_type_error: '请选择有效的结束时间' }),
    link: z.string().url('请输入有效的链接地址').optional().or(z.literal('')),
    is_active: z.boolean(),
  })
  .refine((data) => data.end_time > data.start_time, {
    message: '结束时间必须晚于开始时间',
    path: ['end_time'],
  });

/** 活动表单数据类型 */
type CreateActivityFormData = z.infer<typeof createActivitySchema>;

/**
 * 创建/编辑活动页面
 * 只有管理员可以访问，支持创建新活动和编辑已有活动
 */
export default function CreateActivityPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activityId = searchParams.get('id');
  const isEditMode = !!activityId;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  /** 活动封面图 URL 列表（复用 cover_image 字段存储为 JSON 字符串） */
  const [coverImages, setCoverImages] = useState<string[]>([]);

  const form = useForm<CreateActivityFormData>({
    resolver: zodResolver(createActivitySchema),
    defaultValues: {
      title: '',
      content: '',
      start_time: new Date(),
      end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      link: '',
      is_active: true,
    },
  });

  /** 编辑模式下加载活动数据 */
  useEffect(() => {
    const loadActivity = async () => {
      if (!activityId) return;
      try {
        const activity = await getActivityById(activityId);
        if (activity) {
          form.reset({
            title: activity.title ?? '',
            content: activity.content ?? '',
            start_time: new Date(activity.start_time),
            end_time: new Date(activity.end_time),
            link: activity.link ?? '',
            is_active: activity.is_active,
          });
          // 解析已有的 cover_image JSON 字符串为 URL 数组（兼容历史 FileAttachment 字符串或 URL 数组）
          try {
            const raw = activity.cover_image as unknown;
            if (!raw) {
              setCoverImages([]);
              return;
            }
            let parsed = JSON.parse(String(raw));
            if (typeof parsed === 'string') {
              parsed = JSON.parse(parsed);
            }
            setCoverImages(Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : []);
          } catch {
            setCoverImages([]);
          }
        }
      } catch {
        toast.error('加载活动数据失败');
      }
    };
    void loadActivity();
  }, [activityId, form]);

  /** 检查用户权限（是否为管理员） */
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5;

    const checkPermission = async () => {
      const localProfile = loadProfile();
      if (localProfile?.nickname && localProfile?.phone) {
        try {
          const member = await getMemberByNicknameAndPhone(localProfile.nickname, localProfile.phone);
          setIsAdmin(member?.role === 'admin');
        } catch {
          setIsAdmin(false);
        } finally {
          setLoading(false);
        }
      } else if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(() => void checkPermission(), 200);
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    };
    void checkPermission();
  }, []);

  /** 加载中状态 */
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  /** 权限不足提示 */
  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="bg-card border border-border rounded-xl p-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">权限不足</h2>
          <p className="text-muted-foreground mb-6">只有管理员可以发布和管理活动</p>
          <Button onClick={() => navigate('/')}>
            返回首页
          </Button>
        </div>
      </div>
    );
  }

  /**
   * 内部提交函数
   * @param data 表单数据
   * @param asDraft 是否保存为草稿（草稿模式下标题/内容允许为空）
   */
  const submitActivity = async (data: CreateActivityFormData, asDraft: boolean) => {
    // 发布模式下校验标题/内容必填
    if (!asDraft) {
      if (!data.title?.trim()) {
        toast.error('请填写活动标题');
        return;
      }
      if (!data.content?.trim()) {
        toast.error('请填写活动内容');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const profile = loadProfile();
      const auth = { nickname: profile?.nickname ?? '', phone: profile?.phone ?? '' };
      // cover_image 字段复用为 URL 数组 JSON 字符串（FileAttachment 类型在 DTO 是历史遗留，
      // 实际后端不校验结构，仅做 JSON.stringify 存储）
      const coverImageJson = coverImages.length > 0 ? JSON.stringify(coverImages) : undefined;
      if (isEditMode && activityId) {
        await updateActivity(activityId, {
          title: data.title?.trim() || '未命名活动',
          content: data.content?.trim() ?? '',
          start_time: data.start_time,
          end_time: data.end_time,
          link: data.link ?? undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          cover_image: coverImageJson as any,
          is_active: asDraft ? false : data.is_active,
          nickname: auth.nickname,
          phone: auth.phone,
        });
        toast.success(asDraft ? '草稿已保存' : '活动更新成功');
        navigate('/activity-manage');
      } else {
        await createActivity({
          title: data.title?.trim() || '未命名活动',
          content: data.content?.trim() ?? '',
          start_time: data.start_time,
          end_time: data.end_time,
          link: data.link ?? undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          cover_image: coverImageJson as any,
          is_active: asDraft ? false : data.is_active,
          nickname: auth.nickname,
          phone: auth.phone,
        });
        toast.success(asDraft ? '草稿已保存' : '活动发布成功');
        navigate(asDraft ? '/activity-manage' : '/');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (isEditMode ? '更新失败' : '发布失败');
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  /** 发布模式提交 */
  const handlePublish = form.handleSubmit((data) => void submitActivity(data, false));

  /** 草稿模式提交（不校验必填） */
  const handleSaveDraft = () => {
    const values = form.getValues();
    void submitActivity(values, true);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          className="mb-4 pl-0"
          onClick={() => navigate(isEditMode ? '/activity-manage' : '/')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>
        <h1 className="text-2xl font-bold text-foreground">
          {isEditMode ? '编辑活动' : '发布新活动'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isEditMode ? '修改活动信息' : '创建社区活动，展示在首页顶部'}
        </p>
      </div>

      {/* Form */}
      <div className="bg-card rounded-xl p-6 ring-1 ring-inset ring-border/60 shadow-sm">
        <Form {...form}>
          <form onSubmit={(e) => void handlePublish(e)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>
                    活动标题
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="请输入活动标题" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>
                    活动内容
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="请输入活动详情描述"
                      className="min-h-[120px] resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>
                      开始时间
                    </FormLabel>
                    <FormControl>
                      <Input
                        name={field.name}
                        type="datetime-local"
                        value={(() => {
                          const d = field.value;
                          const year = d.getFullYear();
                          const month = String(d.getMonth() + 1).padStart(2, '0');
                          const day = String(d.getDate()).padStart(2, '0');
                          const hours = String(d.getHours()).padStart(2, '0');
                          const minutes = String(d.getMinutes()).padStart(2, '0');
                          return `${year}-${month}-${day}T${hours}:${minutes}`;
                        })()}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>
                      结束时间
                    </FormLabel>
                    <FormControl>
                      <Input
                        name={field.name}
                        type="datetime-local"
                        value={(() => {
                          const d = field.value;
                          const year = d.getFullYear();
                          const month = String(d.getMonth() + 1).padStart(2, '0');
                          const day = String(d.getDate()).padStart(2, '0');
                          const hours = String(d.getHours()).padStart(2, '0');
                          const minutes = String(d.getMinutes()).padStart(2, '0');
                          return `${year}-${month}-${day}T${hours}:${minutes}`;
                        })()}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>活动跳转链接（可选）</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 封面图上传 */}
            <FormItem>
              <FormLabel>活动封面图（可选）</FormLabel>
              <FormControl>
                <ImageUploader
                  value={coverImages}
                  onChange={setCoverImages}
                  disabled={isSubmitting}
                />
              </FormControl>
              <p className="text-sm text-muted-foreground">
                支持多张图片，最多 9 张，JPG/PNG/GIF/WEBP，单张不超过 2MB
              </p>
            </FormItem>

             <FormField
               control={form.control}
               name="is_active"
               render={({ field }) => (
                 <FormItem className="flex items-center justify-between rounded-lg bg-muted/50 ring-1 ring-inset ring-border/40 p-4">
                   <div>
                     <FormLabel className="text-base">立即启用</FormLabel>
                     <p className="text-sm text-muted-foreground">
                       启用后活动将立即展示在首页顶部，禁用则作为草稿保存
                     </p>
                   </div>
                   <FormControl>
                     <Switch
                       checked={field.value}
                       onCheckedChange={field.onChange}
                     />
                   </FormControl>
                 </FormItem>
               )}
             />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={handleSaveDraft}
                disabled={isSubmitting}
              >
                {isSubmitting ? '保存中...' : '保存为草稿'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate(isEditMode ? '/activity-manage' : '/')}
                disabled={isSubmitting}
              >
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '发布中...' : (isEditMode ? '保存修改' : '发布活动')}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
