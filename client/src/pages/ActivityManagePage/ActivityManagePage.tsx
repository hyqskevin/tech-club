import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getMemberByNicknameAndPhone, getActivities, deleteActivity, updateActivity } from '@/api';
import { formatDateTime } from '@/utils/format-time';
import { ArrowLeft, Edit, Del, Eye, EyeF, List } from '@nutui/icons-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import type { Activity } from '@shared/api.interface';

type ActivityStatus = 'all' | 'active' | 'draft' | 'history';

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

export default function ActivityManagePage() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActivityStatus>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [permissionLoading, setPermissionLoading] = useState(true);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const data = await getActivities();
      setActivities(data);
    } catch {
      toast.error('获取活动列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 权限判断：只有管理员能访问活动管理
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
          setPermissionLoading(false);
        }
      } else if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(() => void checkPermission(), 200);
      } else {
        setIsAdmin(false);
        setPermissionLoading(false);
      }
    };
    void checkPermission();
  }, []);

  useEffect(() => {
    if (isAdmin && !permissionLoading) {
      void fetchActivities();
    }
  }, [isAdmin, permissionLoading]);

  if (permissionLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="bg-card border border-border rounded-xl p-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">权限不足</h2>
          <p className="text-muted-foreground mb-6">只有管理员可以访问活动管理页面</p>
          <Button onClick={() => navigate('/')}>
            返回首页
          </Button>
        </div>
      </div>
    );
  }

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

interface ActivityCardProps {
  activity: Activity;
  onEdit: (id: string) => void;
  onToggleStatus: (activity: Activity) => Promise<void>;
  onDelete: (id: string) => void;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity, onEdit, onToggleStatus, onDelete }) => {
  const images = parseCoverImages(activity.cover_image);
  
  const getStatusBadge = () => {
    const now = new Date();
    const endTime = new Date(activity.end_time);
    if (!activity.is_active) {
      return <Badge variant="outline" className="bg-muted text-muted-foreground">草稿</Badge>;
    }
    if (endTime <= now) {
      return <Badge variant="outline" className="bg-gray-100 text-gray-600">已结束</Badge>;
    }
    return <Badge variant="default" className="bg-green-100 text-green-700">进行中</Badge>;
  };

  const formatDate = (date: Date) => formatDateTime(date);

  return (
    <Card className="overflow-hidden">
      {images.length > 0 && (
        <div className="relative h-32 bg-muted">
          <img
            src={images[0]}
            alt={activity.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {images.length > 1 && (
            <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded-full">
              +{images.length - 1}
            </span>
          )}
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg font-semibold line-clamp-1">{activity.title}</CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm line-clamp-2 mb-4">{activity.content}</p>
        
        <div className="space-y-2 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-2">
            <List width={16} height={16} className="shrink-0" />
            <span>
              {formatDate(activity.start_time)} ~ {formatDate(activity.end_time)}
            </span>
          </div>
          {activity.link && (
            <a
              href={activity.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline block truncate"
            >
              活动链接：{activity.link}
            </a>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onEdit(activity.id)}
            className="flex-1"
          >
            <Edit width={16} height={16} className="mr-1" />
            编辑
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void onToggleStatus(activity)}
            className="flex-1"
          >
            {activity.is_active ? (
              <>
                <EyeF width={16} height={16} className="mr-1" />
                禁用
              </>
            ) : (
              <>
                <Eye width={16} height={16} className="mr-1" />
                启用
              </>
            )}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(activity.id)}
          >
            <Del width={16} height={16} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

  const filteredActivities = activities.filter(activity => {
    const now = new Date();
    switch (activeTab) {
      case 'active':
        return activity.is_active && new Date(activity.end_time) > now;
      case 'draft':
        return !activity.is_active;
      case 'history':
        return activity.is_active && new Date(activity.end_time) <= now;
      case 'all':
      default:
        return true;
    }
  });

  const handleDelete = async () => {
    if (!activityToDelete) return;
    const profile = loadProfile();
    setProcessing(true);
    try {
      await deleteActivity(activityToDelete, { nickname: profile?.nickname ?? '', phone: profile?.phone ?? '' });
      toast.success('活动删除成功');
      setActivities(prev => prev.filter(a => a.id !== activityToDelete));
      setDeleteDialogOpen(false);
      setActivityToDelete(null);
    } catch {
      toast.error('删除活动失败');
    } finally {
      setProcessing(false);
    }
  };

  const toggleActivityStatus = async (activity: Activity) => {
    try {
      const profile = loadProfile();
      await updateActivity(activity.id, { is_active: !activity.is_active, nickname: profile?.nickname ?? '', phone: profile?.phone ?? '' });
      toast.success(`活动${activity.is_active ? '已禁用' : '已启用'}`);
      setActivities(prev => prev.map(a =>
        a.id === activity.id ? { ...a, is_active: !a.is_active } : a
      ));
    } catch {
      toast.error('更新活动状态失败');
    }
  };


  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          className="mb-4 pl-0"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>
        <h1 className="text-2xl font-bold text-foreground">活动管理</h1>
        <p className="text-muted-foreground mt-1">管理所有活动，包括草稿、进行中和已结束的活动</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActivityStatus)} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="all">全部活动</TabsTrigger>
          <TabsTrigger value="active">进行中</TabsTrigger>
          <TabsTrigger value="draft">草稿</TabsTrigger>
          <TabsTrigger value="history">历史活动</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredActivities.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <List width={48} height={48} className="text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">暂无{activeTab === 'all' ? '' : activeTab === 'draft' ? '草稿' : activeTab === 'history' ? '历史' : '进行中'}活动</p>
                <Button
                  className="mt-4"
                  onClick={() => navigate('/create-activity')}
                >
                  发布新活动
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredActivities.map(activity => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onEdit={(id) => navigate(`/create-activity?id=${id}`)}
                  onToggleStatus={toggleActivityStatus}
                  onDelete={(id) => {
                    setActivityToDelete(id);
                    setDeleteDialogOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除活动</DialogTitle>
            <DialogDescription>
              此操作将永久删除该活动，删除后无法恢复。确定要继续吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={processing}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={processing}
            >
              {processing ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
