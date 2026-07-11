import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  List, 
  Link, 
  Image as ImageIcon
} from '@nutui/icons-react';
import { getActivityById } from '@/api';
import type { Activity } from '@shared/api.interface';
import { formatDateTime } from '@/utils/format-time';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

function formatDate(date: Date | string): string {
  return formatDateTime(date);
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

export default function ActivityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);

  useEffect(() => {
    const fetchActivity = async () => {
      if (!id) return;
      
      try {
        const data = await getActivityById(id);
        setActivity(data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    void fetchActivity();
  }, [id]);

  const images = activity ? parseCoverImages(activity.cover_image) : [];

  const handleImageClick = (url: string, index: number) => {
    setPreviewImageUrl(url);
    setPreviewIndex(index);
  };

  const handlePrevImage = () => {
    if (images.length === 0) return;
    const newIndex = previewIndex > 0 ? previewIndex - 1 : images.length - 1;
    setPreviewIndex(newIndex);
    setPreviewImageUrl(images[newIndex]);
  };

  const handleNextImage = () => {
    if (images.length === 0) return;
    const newIndex = previewIndex < images.length - 1 ? previewIndex + 1 : 0;
    setPreviewIndex(newIndex);
    setPreviewImageUrl(images[newIndex]);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Button variant="ghost" size="sm" disabled>
          <ArrowLeft width={16} height={16} className="mr-1" />
          返回
        </Button>
        <Skeleton className="h-8 w-1/3 rounded-lg" />
        <Skeleton className="h-80 w-full rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-1/4 rounded-lg" />
          <Skeleton className="h-4 w-full rounded-lg" />
          <Skeleton className="h-4 w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft width={16} height={16} className="mr-1" />
          返回
        </Button>
        <div className="text-center py-12">
          <p className="text-muted-foreground">活动不存在或已被删除</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft width={16} height={16} className="mr-1" />
        返回
      </Button>

      <Card className="overflow-hidden">
        <CardContent className="p-6 md:p-8 space-y-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {activity.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <List width={16} height={16} />
              <span>
                {formatDate(activity.start_time)} - {formatDate(activity.end_time)}
              </span>
            </div>
          </div>

          {images.length > 0 && (
            <div className="pt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ImageIcon width={16} height={16} />
                <span>活动图片</span>
                <span className="text-xs text-muted-foreground font-normal">({images.length}张)</span>
              </div>
              <div className="columns-2 md:columns-3 gap-3 space-y-3">
                {images.map((url, index) => (
                  <div
                    key={url}
                    className="break-inside-avoid cursor-pointer group"
                    onClick={() => handleImageClick(url, index)}
                  >
                    <div className="relative rounded-lg overflow-hidden bg-muted">
                      <img
                        src={url}
                        alt={`活动图片 ${index + 1}`}
                        className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      {index === 0 && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 bg-primary/90 text-white text-xs rounded-full">
                          主图
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                            <ImageIcon width={20} height={20} className="text-primary" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="prose max-w-none text-base leading-relaxed">
            {activity.content.split('\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          {activity.link && (
            <div className="pt-4">
              <a href={activity.link} target="_blank" rel="noopener noreferrer">
                <Button className="gap-2">
                  <Link width={16} height={16} />
                  查看活动详情/报名
                </Button>
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!previewImageUrl}
        onOpenChange={(open) => {
          if (!open) setPreviewImageUrl(null);
        }}
      >
        <DialogContent className="sm:max-w-[90vw] max-w-[95vw] p-0 bg-transparent border-none shadow-none flex items-center justify-center">
          <div className="relative">
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-10 right-0 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center hover:bg-white transition-colors z-10"
            >
              <span className="text-lg font-bold text-foreground">×</span>
            </button>
            
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center hover:bg-white transition-colors"
                >
                  <span className="text-lg font-bold text-foreground">‹</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-6 w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center hover:bg-white transition-colors"
                >
                  <span className="text-lg font-bold text-foreground">›</span>
                </button>
              </>
            )}
            
            {previewImageUrl && (
              <img
                src={previewImageUrl}
                alt="预览"
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
              />
            )}
            
            {images.length > 1 && (
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setPreviewIndex(index);
                      setPreviewImageUrl(images[index]);
                    }}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === previewIndex ? 'bg-primary' : 'bg-white/60 hover:bg-white'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
