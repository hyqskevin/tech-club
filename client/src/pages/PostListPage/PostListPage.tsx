import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  Comment,
  Clock,
  Refresh,
} from '@nutui/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

import { toast } from 'sonner';
import { CATEGORIES, type CategoryType, type Activity } from '@shared/api.interface';
import { searchPosts, getLatestActivity } from '@/api';
import { CATEGORY_COLORS, STATUS_COLORS, formatRelativeTime } from '@/utils/post-constants';
import { formatDateTime } from '@/utils/format-time';

function parseCoverImages(coverImage: unknown): string[] {
  try {
    if (!coverImage) return [];
    let raw = String(coverImage);
    let parsed = JSON.parse(raw);
    if (typeof parsed === 'string') {
      parsed = JSON.parse(parsed);
    }
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

const PAGE_SIZE = 20;

/** 帖子项接口 */
interface IPostItem {
  id: string;
  title: string;
  category: CategoryType;
  author_user_id?: string;
  author_nickname: string;
  created_at: Date;
  status: '讨论中' | '已解决';
  last_reply_time: Date;
  reply_count: number;
}

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
      {status}
    </span>
  );
}

/** 帖子卡片骨架屏组件 */
function PostCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-3/4 rounded" />
          <Skeleton className="h-4 w-1/4 rounded" />
          <div className="flex items-center gap-3 pt-1">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
        </div>
        <Skeleton className="w-8 h-8 rounded-full" />
      </div>
    </div>
  );
}

/**
 * 帖子卡片组件
 * @param post 帖子数据
 * @param onClick 点击回调
 */
function PostCard({ 
  post, 
  onClick
}: { 
  post: IPostItem; 
  onClick: () => void;
}) {
  return (
    <div
      className="bg-card border border-border rounded-xl p-5 shadow-sm cursor-pointer transition-all duration-150 hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-base font-semibold text-foreground truncate hover:text-primary transition-colors flex-1">
              {post.title}
            </h3>
          </div>

          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <CategoryTag category={post.category} />
            <StatusTag status={post.status} />
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1">
              <span>{post.author_nickname}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock width={14} height={14} />
              <span>{formatRelativeTime(post.created_at)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Comment width={14} height={14} />
              <span>{post.reply_count} 回复</span>
            </div>
            {post.last_reply_time > post.created_at && (
              <div className="text-xs text-muted-foreground">
                最后回复 {formatRelativeTime(post.last_reply_time)}
              </div>
            )}
          </div>
        </div>

        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-xs font-medium text-primary">
            {post.author_nickname.charAt(0)}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * 帖子列表页面
 * 展示社区帖子列表，支持搜索、分类筛选、分页加载
 */
export default function PostListPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState<IPostItem[]>([]);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'all'>('all');
  const [searchKey, setSearchKey] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const nextPageTokenRef = useRef<string | undefined>(undefined);

  /** 获取最新活动 */
  const fetchActivity = useCallback(async () => {
    try {
      const latestActivity = await getLatestActivity();
      setActivity(latestActivity);
    } catch {
      // ignore
    } finally {
      setActivityLoading(false);
    }
  }, []);

  /**
   * 获取帖子列表
   * @param reset 是否重置分页
   */
  const fetchPosts = useCallback(async (reset = false) => {
    if (reset) {
      setLoading(true);
      nextPageTokenRef.current = undefined;
    }

    try {
      const params = {
        pageSize: PAGE_SIZE,
        pageToken: reset ? undefined : nextPageTokenRef.current,
        ...(selectedCategory !== 'all' && { category: selectedCategory }),
        ...(searchKey.trim() && { searchKey: searchKey.trim() }),
      };

      const result = await searchPosts(params);
      
      const items = result.items.map(item => ({
        ...item,
        created_at: new Date(item.created_at),
        last_reply_time: new Date(item.last_reply_time),
      }));
      
      if (reset) {
        setPosts(items);
      } else {
        setPosts(prev => [...prev, ...items]);
      }
      
      nextPageTokenRef.current = result.nextPageToken;
      setHasMore(result.hasMore);
    } catch {
      toast.error('加载帖子失败，请重试');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, searchKey]);

  /** 初始化加载数据 */
  useEffect(() => {
    void fetchPosts(true);
    void fetchActivity();
  }, [fetchPosts, fetchActivity]);

  /** 刷新列表 */
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchPosts(true);
  }, [fetchPosts]);

  /** 搜索输入变化 */
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKey(e.target.value);
  }, []);

  /** 提交搜索 */
  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    void fetchPosts(true);
  }, [fetchPosts]);

  /** 切换分类 */
  const handleCategoryChange = useCallback((category: CategoryType | 'all') => {
    setSelectedCategory(category);
  }, []);

  /** 加载更多 */
  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      void fetchPosts(false);
    }
  }, [hasMore, loading, fetchPosts]);

  /** 点击帖子 */
  const handlePostClick = useCallback((postId: string) => {
    navigate(`/post/${postId}`);
  }, [navigate]);

  /** 点击活动横幅 */
  const handleActivityClick = useCallback(() => {
    if (activity) {
      navigate(`/activity/${activity.id}`);
    }
  }, [activity, navigate]);

  /**
   * 获取活动状态
   * @param activity 活动数据
   * @returns 活动状态字符串
   */
  const getActivityStatus = (activity: Activity) => {
    const now = new Date();
    const startTime = new Date(activity.start_time);
    const endTime = new Date(activity.end_time);
    if (!activity.is_active) return '草稿';
    if (endTime <= now) return '已结束';
    if (startTime > now) return '未开始';
    return '进行中';
  };

  return (
    <div className="space-y-6">
      {!activityLoading && activity && (
        <div 
          className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-border rounded-xl overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-all duration-150"
          onClick={handleActivityClick}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-0">
            {(() => {
              const images = parseCoverImages(activity.cover_image);
              if (images.length > 0) {
                return (
                  <div className="sm:w-48 h-32 sm:h-auto shrink-0">
                    <img
                      src={images[0]}
                      alt={activity.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                );
              }
              return null;
            })()}
            <div className="flex-1 min-w-0 p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="default" className="bg-blue-100 text-blue-700">
                  {getActivityStatus(activity)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(activity.start_time)} ~ {formatDateTime(activity.end_time)}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1 line-clamp-1">{activity.title}</h3>
              <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{activity.content}</p>
              <div className="flex items-center gap-3 flex-wrap">
                {activity.link && (
                  <Button variant="default" size="sm" asChild>
                    <a href={activity.link} target="_blank" rel="noopener noreferrer">
                      立即参与
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">社区帖子</h1>
          <p className="text-muted-foreground mt-1">分享技术，解决问题，共同成长</p>
        </div>
        <Button
          className="rounded-full shrink-0"
          onClick={() => navigate('/new')}
        >
          <Plus width={16} height={16} />
          发布新帖
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl p-3 sm:p-4 shadow-sm">
        <div className="space-y-3">
          <form onSubmit={handleSearchSubmit}>
            <Input
              type="search"
              placeholder="搜索帖子标题..."
              className="rounded-lg"
              value={searchKey}
              onChange={handleSearchChange}
            />
          </form>

          <div className="flex items-center gap-2">
            <div 
              className="flex items-center gap-1 flex-1 overflow-x-auto hide-scrollbar"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <button
                onClick={() => handleCategoryChange('all')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm whitespace-nowrap transition-colors shrink-0 ${
                  selectedCategory === 'all'
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'bg-accent text-muted-foreground hover:text-foreground'
                }`}
              >
                全部
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm whitespace-nowrap transition-colors shrink-0 ${
                    selectedCategory === cat
                      ? 'font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  style={
                    selectedCategory === cat
                      ? { background: CATEGORY_COLORS[cat].bg, color: CATEGORY_COLORS[cat].text }
                      : {}
                  }
                >
                  {cat}
                </button>
              ))}
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-1.5 rounded-lg hover:bg-accent transition-colors shrink-0"
              aria-label="刷新"
            >
              <Refresh
                width={16}
                height={16}
                className={`text-muted-foreground ${refreshing ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <PostCardSkeleton key={i} />
            ))}
          </motion.div>
        ) : posts.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <div className="text-muted-foreground mb-4">暂无帖子，快来发布第一条帖子吧</div>
            <Button
              className="rounded-full"
              onClick={() => navigate('/new')}
            >
              <Plus width={16} height={16} />
              发布新帖
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onClick={() => handlePostClick(post.id)}
              />
            ))}
            </div>

            {hasMore && (
              <div className="text-center pt-4">
                <Button
                  variant="secondary"
                  className="rounded-full"
                  onClick={handleLoadMore}
                  disabled={loading}
                >
                  {loading ? '加载中...' : '加载更多'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}