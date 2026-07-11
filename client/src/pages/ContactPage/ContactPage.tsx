import { ArrowLeft } from '@nutui/icons-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function ContactPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          className="mb-4 pl-0"
          onClick={() => navigate('/')}
        >
          <ArrowLeft width={16} height={16} className="mr-2" />
          返回
        </Button>
        <h1 className="text-2xl font-bold text-foreground">联系我们</h1>
        <p className="text-muted-foreground mt-1">加入社区交流群，获取最新动态和帮助</p>
      </div>

      {/* Content */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 706交流群 */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground mb-4">706交流群</h3>
            <div className="rounded-lg w-[200px] h-[290px] mx-auto mb-4 overflow-hidden border border-border">
              <img
                src="https://miaoda.feishu.cn/aily/api/v1/feisuda/attachments/6180db7f-b10f-4e13-b807-329e6be9be86/raw"
                alt="706交流群二维码"
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              扫码加入706交流群
            </p>
          </div>

          {/* 造作星期八交流群 */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground mb-4">造作星期八交流群</h3>
            <div className="rounded-lg w-[200px] h-[300px] mx-auto mb-4 overflow-hidden border border-border">
              <img
                src="https://miaoda.feishu.cn/aily/api/v1/feisuda/attachments/44a5f23f-3074-4e99-9eb5-b772b8f1a727/raw"
                alt="造作星期八交流群二维码"
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              扫码加入造作星期八交流群
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border">
          <h3 className="text-lg font-semibold text-foreground mb-3">其他联系方式</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>💬 公众号：706宁波</p>
          </div>
        </div>
      </div>
    </div>
  );
}
