import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Message,
  Clock,
  Check,
  Edit,
  Del,
  Loading,
  Refresh,
} from '@nutui/icons-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { TiptapEditorComplete } from '@/components/ui/tiptap-editor';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Post, Reply, CategoryType } from '@shared/api.interface';
import { getPostById, getPostReplies, createReply, updatePost, deleteReply, deletePost, getMemberByNicknameAndPhone, adoptReply, unadoptReply } from '@/api';
import { CATEGORY_COLORS, STATUS_COLORS, formatRelativeTime } from '@/utils/post-constants';

/** 帖子分类列表 */
const CATEGORIES: CategoryType[] = ['技术分享', '问题求助', '经验分享', '资源交流', '其他'];

/** 回复表单校验规则 */
const replySchema = z.object({
  content: z.string().min(1, '回复内容不能为空'),
});

/** 回复表单数据类型 */
type ReplyFormData = z.infer<typeof replySchema>;

/** 编辑帖子表单校验规则 */
const editPostSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(100, '标题不能超过 100 个字符'),
  category: z.string().min(1, '请选择分类'),
  content: z.string().min(1, '内容不能为空'),
  status: z.enum(['讨论中', '已解决']),
});

/** 编辑帖子表单数据类型 */
type EditPostFormData = z.infer<typeof editPostSchema>;

/** 页面入场动画配置 */
const pageVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' as const },
  },
};

/** 回复列表交错动画配置 */
const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

/** 回复项动画配置 */
const replyItemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

/**
 * 分类标签组件
 * @param category 分类名称
 */
function CategoryTag({ category }: { category: CategoryType }) {
  const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS['其他'];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ background: colors.bg, color: colors.text }}
    >
      {category}
    </span>
  );
}

/**
 * 状态标签组件
 * @param status 帖子状态
 */
function StatusTag({ status }: { status: '讨论中' | '已解决' }) {
  const colors = STATUS_COLORS[status];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ background: colors.bg, color: colors.text }}
    >
      {status === '已解决' && <Check width={12} height={12} />}
      {status}
    </span>
  );
}

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

/**
 * 回复卡片组件
 * @param reply 回复数据
 * @param isAuthor 是否为帖子作者
 * @param isAdmin 是否为管理员
 * @param isReplyOwner 是否为回复所有者
 * @param onAdopt 采纳回复回调
 * @param onUnadopt 取消采纳回复回调
 * @param onDelete 删除回复回调
 */
function ReplyCard({
  reply,
  isAuthor,
  isAdmin,
  isReplyOwner,
  onAdopt,
  onUnadopt,
  onDelete,
}: {
  reply: Reply;
  isAuthor: boolean;
  isAdmin: boolean;
  isReplyOwner: boolean;
  onAdopt: (id: string) => Promise<void>;
  onUnadopt: (id: string) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  // 仅帖子作者或管理员可对回复进行采纳/取消采纳
  const canManage = isAuthor || isAdmin;
  return (
    <motion.div
      variants={replyItemVariants}
      className={`bg-card border border-border rounded-xl p-4 transition-colors ${
        reply.is_adopted
          ? 'border-l-4 border-l-[hsl(142_71%_45%)] bg-[hsl(142_70%_98%)]'
          : 'border-border'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-xs font-medium text-primary">
            {reply.replier_nickname?.charAt(0) || '匿'}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">{reply.replier_nickname}</span>
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(reply.created_at)}
            </span>
            {reply.is_adopted && (
              <span className="inline-flex items-center gap-1 text-[hsl(142_71%_45%)] font-medium text-xs">
                <Check width={14} height={14} />
                已采纳
              </span>
            )}
          </div>

          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {reply.content}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {canManage && !reply.is_adopted && (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 rounded-full text-xs text-muted-foreground hover:text-[hsl(142_71%_45%)]"
              onClick={() => void onAdopt(reply.id)}
            >
              采纳
            </Button>
          )}
          {canManage && reply.is_adopted && (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 rounded-full text-xs text-[hsl(142_71%_45%)] hover:text-foreground"
              onClick={() => void onUnadopt(reply.id)}
            >
              取消采纳
            </Button>
          )}
          {isReplyOwner && (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 rounded-full text-xs text-muted-foreground hover:text-destructive"
              onClick={() => void onDelete(reply.id)}
            >
              <Del width={14} height={14} className="mr-1" />
              删除
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * 帖子详情页面
 * 展示帖子内容、回复列表，支持发表回复、采纳回复、编辑帖子等操作
 */
export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [isAuthor, setIsAuthor] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [localProfile, setLocalProfile] = useState<IUserProfile | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null);
  const [isDeletingReply, setIsDeletingReply] = useState(false);
  const [replyDeleteDialogOpen, setReplyDeleteDialogOpen] = useState(false);
  /** 帖子正文图片预览（点击放大） */
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  /** 回复表单 */
  const form = useForm<ReplyFormData>({
    resolver: zodResolver(replySchema),
    defaultValues: { content: '' },
  });

  /** 编辑帖子表单 */
  const editForm = useForm<EditPostFormData>({
    resolver: zodResolver(editPostSchema),
    defaultValues: { title: '', category: '', content: '' },
  });

  /** 加载用户配置信息 */
  useEffect(() => {
    setLocalProfile(loadProfile());
  }, []);

  /** 判断当前用户是否为帖子作者 */
  useEffect(() => {
    if (post) {
      if (localProfile) {
        setIsAuthor(post.author_nickname === localProfile.nickname && post.author_phone === localProfile.phone);
      } else {
        setIsAuthor(false);
      }
    } else {
      setIsAuthor(false);
    }
  }, [post, localProfile]);

  /** 检查当前用户是否为管理员 */
  useEffect(() => {
    const checkAdmin = async () => {
      if (localProfile?.nickname && localProfile?.phone) {
        try {
          const member = await getMemberByNicknameAndPhone(localProfile.nickname, localProfile.phone);
          setIsAdmin(member?.role === 'admin');
        } catch {
          setIsAdmin(false);
        }
      }
    };
    void checkAdmin();
  }, [localProfile]);

  /**
   * 获取帖子详情和回复列表
   */
  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [postData, repliesData] = await Promise.all([
        getPostById(id),
        getPostReplies(id, { pageSize: 100 }),
      ]);

      if (!postData) {
        toast.error('帖子不存在或已被删除');
        navigate('/');
        return;
      }

      setPost(postData);
      setReplies(repliesData.items);

      editForm.reset({
        title: postData.title,
        category: postData.category,
        content: postData.content,
        status: postData.status,
      });
    } catch {
      toast.error('加载失败，请刷新重试');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, editForm]);

  /** 初始化加载数据 */
  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  /**
   * 提交回复
   * @param data 回复表单数据
   */
  async function handleReplySubmit(data: ReplyFormData) {
    if (!id || !post || isSubmittingReply) return;

    const maxByteSize = 10 * 1024;
    const currentSize = new Blob([data.content]).size;
    if (currentSize > maxByteSize) {
      const maxSizeKB = Math.round(maxByteSize / 1024);
      const currentSizeKB = Math.round(currentSize / 1024);
      toast.error(`回复内容过长（当前 ${currentSizeKB}KB，最大支持 ${maxSizeKB}KB），请精简内容`);
      return;
    }

    setIsSubmittingReply(true);
    try {
      const replierNickname = localProfile?.nickname ?? '匿名用户';

      await createReply({
        post_id: id,
        content: data.content,
        replier_nickname: replierNickname,
        replier_phone: localProfile?.phone ?? '',
      });
      form.reset();
      toast.success('回复发表成功');
      await fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '回复失败';
      toast.error(msg);
    } finally {
      setIsSubmittingReply(false);
    }
  }

  /**
   * 弹出删除回复确认框（由按钮触发）
   * @param replyId 回复ID
   */
  const requestDeleteReply = (replyId: string) => {
    setDeletingReplyId(replyId);
    setReplyDeleteDialogOpen(true);
  };

  /**
   * 确认删除回复
   */
  const confirmDeleteReply = async () => {
    if (!deletingReplyId || isDeletingReply) return;
    setIsDeletingReply(true);
    try {
      await deleteReply(deletingReplyId, { nickname: localProfile?.nickname ?? '', phone: localProfile?.phone ?? '' });
      toast.success('回复已删除');
      setReplyDeleteDialogOpen(false);
      setDeletingReplyId(null);
      await fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '删除失败';
      toast.error(msg);
    } finally {
      setIsDeletingReply(false);
    }
  };

  /**
   * 确认删除帖子（由 Dialog 的确认按钮触发）
   */
  const confirmDeletePost = async () => {
    if (isDeleting || !post) return;
    setIsDeleting(true);
    try {
      await deletePost(post.id, { nickname: localProfile?.nickname ?? '', phone: localProfile?.phone ?? '' });
      toast.success('帖子删除成功');
      setDeleteDialogOpen(false);
      navigate('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '删除帖子失败';
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * 采纳回复（仅帖子作者或管理员；采纳不自动结贴，结贴由作者另行操作）
   * @param replyId 回复ID
   */
  const handleAdopt = async (replyId: string) => {
    try {
      const auth = { nickname: localProfile?.nickname ?? '', phone: localProfile?.phone ?? '' };
      await adoptReply(replyId, auth);
      toast.success('已采纳该回复');
      await fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '操作失败';
      toast.error(msg);
    }
  };

  /**
   * 取消采纳（仅帖子作者或管理员）
   * @param replyId 回复ID
   */
  const handleUnadopt = async (replyId: string) => {
    try {
      const auth = { nickname: localProfile?.nickname ?? '', phone: localProfile?.phone ?? '' };
      await unadoptReply(replyId, auth);
      toast.success('已取消采纳');
      await fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '操作失败';
      toast.error(msg);
    }
  };

  /**
   * 提交编辑帖子
   * @param data 编辑表单数据
   */
  const handleEditSubmit = async (data: EditPostFormData) => {
    if (!id) return;
    setIsEditing(true);
    try {
      // 拒绝在编辑时还有未上传完成的 blob 图片
      if (data.content.includes('src="blob:')) {
        toast.error('图片正在上传中，请等待上传完成后再保存');
        setIsEditing(false);
        return;
      }
      // 从编辑后的 HTML 中提取最新图片 URL 列表
      const imageUrls = extractImageUrls(data.content);

      await updatePost(id, {
        ...data,
        category: data.category as CategoryType,
        images: imageUrls,
        nickname: localProfile?.nickname ?? '',
        phone: localProfile?.phone ?? '',
      });
      toast.success('帖子更新成功');
      setEditOpen(false);
      await fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '更新失败';
      toast.error(msg);
    } finally {
      setIsEditing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-1/3 bg-accent rounded" />
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="space-y-4">
            <div className="h-8 w-3/4 bg-accent rounded" />
            <div className="h-4 w-1/4 bg-accent rounded" />
            <div className="h-4 w-full bg-accent rounded" />
            <div className="h-4 w-full bg-accent rounded" />
            <div className="h-4 w-2/3 bg-accent rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground mb-4">帖子不存在或已被删除</div>
        <Button onClick={() => navigate('/')}>返回列表</Button>
      </div>
    );
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full"
          onClick={() => navigate(-1)}
          title="返回列表"
        >
          <ArrowLeft width={16} height={16} />
        </Button>
        {isAuthor && post.status !== '已解决' && (
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={() => setEditOpen(true)}
            title="编辑帖子"
          >
            <Edit width={16} height={16} />
          </Button>
        )}
        {(isAuthor || isAdmin) && post.status === '讨论中' && (
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={() => {
              void (async () => {
                try {
                  await updatePost(post.id, {
                    status: '已解决',
                    nickname: localProfile?.nickname ?? '',
                    phone: localProfile?.phone ?? '',
                  });
                  toast.success('已结贴');
                  await fetchData();
                } catch {
                  toast.error('操作失败');
                }
              })();
            }}
            title="结贴"
          >
            <Check width={16} height={16} />
          </Button>
        )}
        {(isAuthor || isAdmin) && post.status === '已解决' && (
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-muted-foreground hover:text-foreground"
            onClick={() => {
              void (async () => {
                try {
                  await updatePost(post.id, {
                    status: '讨论中',
                    nickname: localProfile?.nickname ?? '',
                    phone: localProfile?.phone ?? '',
                  });
                  toast.success('已恢复为讨论中');
                  await fetchData();
                } catch {
                  toast.error('操作失败');
                }
              })();
            }}
            title="返回未解决状态"
          >
            <Refresh width={16} height={16} />
          </Button>
        )}
            {(isAuthor || isAdmin) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={isDeleting}
                title="删除帖子"
              >
                <Del width={16} height={16} />
              </Button>
            )}
          </div>

      <article className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground mb-3">{post.title}</h1>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <CategoryTag category={post.category} />
              <StatusTag status={post.status} />
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1">
                <span>{post.author_nickname}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock width={14} height={14} />
                <span>{formatRelativeTime(post.created_at)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Message width={14} height={14} />
                <span>{post.reply_count} 回复</span>
              </div>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-medium text-primary">
              {post.author_nickname?.charAt(0) || '匿'}
            </span>
          </div>

        </div>

        <div className="prose prose-sm max-w-none text-foreground leading-relaxed">
          <div
            className="post-content"
            dangerouslySetInnerHTML={{ __html: post.content }}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (target.tagName === 'IMG') {
                const src = (target as HTMLImageElement).src;
                if (src) setPreviewImageUrl(src);
              }
            }}
          />
        </div>
      </article>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          回复 ({replies.length})
        </h2>

        {replies.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <div className="text-muted-foreground">暂无回复，来发表第一条评论吧</div>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <AnimatePresence>
              {replies.map((reply) => {
                const isReplyOwner = localProfile
                  ? reply.replier_nickname === localProfile.nickname && reply.replier_phone === localProfile.phone
                  : false;
                return (
                  <ReplyCard
                    key={reply.id}
                    reply={reply}
                    isAuthor={isAuthor}
                    isAdmin={isAdmin}
                    isReplyOwner={isReplyOwner}
                    onAdopt={handleAdopt}
                    onUnadopt={handleUnadopt}
                    onDelete={requestDeleteReply}
                  />
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      <section className="w-full bg-card border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          发表回复
        </h2>

        {localProfile?.nickname === '匿名用户' && !localProfile?.phone ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">匿名用户需要先登录才能回复</p>
            <p className="text-sm text-muted-foreground mb-4">请填写昵称和手机号后再参与讨论</p>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={(e) => void form.handleSubmit(handleReplySubmit)(e)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="写下你的回复..."
                        className="min-h-[120px] resize-y rounded-lg"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    回复将显示为：{localProfile?.nickname ?? '匿名用户'}
                  </span>
                </div>
                <Button
                  type="submit"
                  className="rounded-full"
                  disabled={isSubmittingReply}
                >
                  {isSubmittingReply ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      发表中...
                    </span>
                  ) : (
                    '发表回复'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </section>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">编辑帖子</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={(e) => void editForm.handleSubmit(handleEditSubmit)(e)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>
                      标题
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>
                      分类
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择分类" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>状态</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择状态" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="讨论中">讨论中</SelectItem>
                        <SelectItem value="已解决">已解决</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>
                      内容
                    </FormLabel>
                    <FormControl>
                      <TiptapEditorComplete
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="请输入帖子内容..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditOpen(false)}
                  disabled={isEditing}
                >
                  取消
                </Button>
                <Button type="submit" disabled={isEditing}>
                  {isEditing ? (
                    <>
                      <Loading className="w-4 h-4 mr-1.5 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    '保存修改'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 删除帖子确认弹窗 */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!isDeleting) setDeleteDialogOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除帖子</DialogTitle>
            <DialogDescription>
              此操作将永久删除该帖子及其所有回复，删除后无法恢复。确定要继续吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmDeletePost()}
              disabled={isDeleting}
            >
              {isDeleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除回复确认弹窗 */}
      <Dialog
        open={replyDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!isDeletingReply) setReplyDeleteDialogOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除回复</DialogTitle>
            <DialogDescription>
              此操作将永久删除该回复，删除后无法恢复。确定要继续吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setReplyDeleteDialogOpen(false)}
              disabled={isDeletingReply}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmDeleteReply()}
              disabled={isDeletingReply}
            >
              {isDeletingReply ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 帖子正文图片放大预览 */}
      <Dialog
        open={!!previewImageUrl}
        onOpenChange={(open) => {
          if (!open) setPreviewImageUrl(null);
        }}
      >
        <DialogContent className="sm:max-w-[90vw] max-w-[95vw] p-0 bg-transparent border-none shadow-none flex items-center justify-center">
          {previewImageUrl && (
            <img
              src={previewImageUrl}
              alt="预览"
              className="max-w-full max-h-[85vh] object-contain rounded-md"
            />
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}