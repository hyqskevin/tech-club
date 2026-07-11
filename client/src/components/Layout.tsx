import { useState, useEffect, useCallback } from "react";
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { upsertMember, getMemberByNicknameAndPhone } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home,
  Edit,
  More,
  Close,
  Del,
  Hi,
  User,
  Phone,
  Notice,
  List,
  ArrowRight,
} from "@nutui/icons-react";

/** 公共导航项 */
const PUBLIC_NAV_ITEMS = [
  { to: "/", label: "帖子流", icon: Home, end: true },
  { to: "/new", label: "发帖", icon: Edit, end: false },
  { to: "/contact", label: "联系我们", icon: Phone, end: false },
] as const;

/** 管理员导航项 */
const ADMIN_NAV_ITEMS = [
  { to: "/create-activity", label: "发布活动", icon: Notice, end: false },
  { to: "/activity-manage", label: "活动管理", icon: List, end: false },
] as const;

/** 用户配置信息本地存储键名 */
const PROFILE_KEY = "__global_itc_user_profile";

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
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return JSON.parse(raw) as IUserProfile;
  } catch {}
  return null;
}

/**
 * 保存用户配置信息到 localStorage
 * @param profile 用户配置信息
 */
function saveProfile(profile: IUserProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

/**
 * 布局组件
 * 提供页面导航、用户登录/登出、移动端菜单等功能
 */
const Layout = () => {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState<IUserProfile | null>(loadProfile);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginNickname, setLoginNickname] = useState("");
  const [loginPhone, setLoginPhone] = useState("");
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [memberLoading, setMemberLoading] = useState(true);

  /** 检查用户是否为管理员 */
  useEffect(() => {
    const fetchUserRole = async () => {
      if (profile?.nickname && profile?.phone) {
        try {
          const member = await getMemberByNicknameAndPhone(profile.nickname, profile.phone);
          setIsAdmin(member?.role === 'admin');
        } catch {
          setIsAdmin(false);
        } finally {
          setMemberLoading(false);
        }
      } else {
        setIsAdmin(false);
        setMemberLoading(false);
      }
    };
    void fetchUserRole();
  }, [profile]);

  /** 合并公共导航和管理员导航 */
  const NAV_ITEMS = [
    ...PUBLIC_NAV_ITEMS, 
    ...(isAdmin && !memberLoading ? ADMIN_NAV_ITEMS : [])
  ];

  /** 页面切换时滚动到顶部并关闭移动端菜单 */
  useEffect(() => {
    window.scrollTo(0, 0);
    setMobileOpen(false);
  }, [pathname]);

  /** 移动端菜单打开时禁止页面滚动 */
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  /** 关闭移动端菜单 */
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  /** 首次访问时弹出登录对话框 */
  useEffect(() => {
    if (!profile && !localStorage.getItem('__has_shown_login')) {
      setLoginOpen(true);
    } else if (!profile) {
      const anonymousProfile: IUserProfile = { nickname: '匿名用户', phone: '' };
      setProfile(anonymousProfile);
      saveProfile(anonymousProfile);
    }
  }, [profile]);

  /** 退出登录 */
  const handleLogout = () => {
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem('__has_shown_login');
    setProfile(null);
    setLoginOpen(true);
  };

  /**
   * 登录成功后的回调
   * 重新加载页面以重置所有 useState 缓存（帖子列表/活动列表/我的权限等）
   */
  const handleLoginSuccess = () => {
    setLoginOpen(false);
    // 用 setTimeout 让 toast 先渲染，避免被 reload 抹掉
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  /**
   * 提交登录表单
   */
  const handleLoginSubmit = async () => {
    if (!loginNickname.trim() || !loginPhone.trim()) return;
    setLoginSubmitting(true);
    try {
      const newProfile: IUserProfile = {
        nickname: loginNickname.trim(),
        phone: loginPhone.trim(),
      };

      await upsertMember({
        user_id: undefined,
        nickname: newProfile.nickname,
        phone: newProfile.phone,
      });

      saveProfile(newProfile);
      setProfile(newProfile);
      localStorage.setItem('__has_shown_login', 'true');
      setLoginNickname("");
      setLoginPhone("");
      // 登录成功后强制刷新页面以重置所有页面级缓存
      handleLoginSuccess();
    } catch {
      toast.error('登录失败，请稍后重试');
    } finally {
      setLoginSubmitting(false);
    }
  };

  /** 用户昵称首字母 */
  const userInitial = profile?.nickname?.charAt(0) ?? "?";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 w-full bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <NavLink to="/" className="flex items-center gap-2 shrink-0">
              <span className="text-foreground font-semibold text-base">AI工作坊公告栏</span>
            </NavLink>

            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                      isActive
                        ? "text-primary font-medium bg-accent"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`
                  }
                >
                  <item.icon width={16} height={16} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {profile ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="hidden sm:flex items-center gap-2 h-8 px-2 rounded-full">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      profile.nickname === '匿名用户' && !profile.phone 
                        ? 'bg-muted text-muted-foreground' 
                        : 'bg-primary text-primary-foreground'
                    }`}>
                      <span className="text-xs font-medium">
                        {userInitial}
                      </span>
                    </div>
                    <span className="text-sm text-foreground font-medium max-w-[100px] truncate">
                      {profile.nickname}
                    </span>
                    <ArrowRight width={14} height={14} className="text-muted-foreground rotate-90" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="p-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        profile.nickname === '匿名用户' && !profile.phone 
                          ? 'bg-muted text-muted-foreground' 
                          : 'bg-primary text-primary-foreground'
                      }`}>
                        <span className="text-sm font-medium">
                          {userInitial}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {profile.nickname}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {profile.phone || '未绑定手机号'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  {profile.nickname === '匿名用户' && !profile.phone ? (
                    <DropdownMenuItem onClick={() => setLoginOpen(true)} className="gap-2 text-primary">
                      <User width={16} height={16} />
                      登录
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive">
                      <Del width={16} height={16} />
                      退出登录
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
             ) : (
              <Button
                onClick={() => setLoginOpen(true)}
                className="hidden sm:flex items-center gap-1.5 h-8 px-4 rounded-full text-sm"
              >
                <Hi width={16} height={16} />
                登录
              </Button>
            )}

            <button
              onClick={() => setMobileOpen((prev) => !prev)}
              className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-accent transition-colors"
              aria-label={mobileOpen ? "关闭菜单" : "打开菜单"}
            >
              {mobileOpen ? (
                <Close width={20} height={20} />
              ) : (
                <More width={20} height={20} />
              )}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-card">
             <nav className="flex flex-col p-3 gap-1">
               {NAV_ITEMS.map((item) => (
                 <NavLink
                   key={item.to}
                   to={item.to}
                   end={item.end}
                   onClick={closeMobile}
                   className={({ isActive }) =>
                     `flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm transition-colors ${
                       isActive
                         ? "text-primary font-medium bg-accent"
                         : "text-foreground hover:bg-accent"
                     }`
                   }
                 >
                   <item.icon width={16} height={16} />
                   {item.label}
                 </NavLink>
               ))}
             </nav>

            <div className="px-3 pb-3 pt-1 border-t border-border">
              <div className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium text-primary">
                      {userInitial}
                    </span>
                  </div>
                  <span className="text-sm text-foreground font-medium truncate">
                    {profile?.nickname ?? "用户"}
                  </span>
                </div>
                {profile?.nickname === '匿名用户' && !profile?.phone ? (
                  <button
                    onClick={() => setLoginOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-primary font-medium bg-accent hover:bg-accent/80 transition-colors shrink-0"
                  >
                    <Hi width={16} height={16} />
                    登录
                  </button>
                ) : (
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                  >
                    <Del width={16} height={16} />
                    退出
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <Outlet />
      </main>

      <Dialog open={loginOpen} onOpenChange={(open) => {
        if (!open && !profile) {
          const anonymousProfile: IUserProfile = { nickname: '匿名用户', phone: '' };
          setProfile(anonymousProfile);
          saveProfile(anonymousProfile);
          localStorage.setItem('__has_shown_login', 'true');
        }
        setLoginOpen(open);
      }}>
        <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-foreground">
                欢迎来到AI工作坊公告栏
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                填写信息登录后发帖会显示昵称，也可以直接关闭对话框匿名使用
              </DialogDescription>
            </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <User width={16} height={16} className="text-muted-foreground" />
                昵称 <span className="text-destructive">*</span>
              </label>
              <Input
                value={loginNickname}
                onChange={(e) => setLoginNickname(e.target.value)}
                placeholder="请输入你的昵称"
                className="rounded-lg h-11"
                maxLength={20}
                onKeyDown={(e) => { if (e.key === "Enter") void handleLoginSubmit(); }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Phone width={16} height={16} className="text-muted-foreground" />
                电话 <span className="text-destructive">*</span>
              </label>
              <Input
                value={loginPhone}
                onChange={(e) => setLoginPhone(e.target.value)}
                placeholder="请输入你的手机号"
                className="rounded-lg h-11"
                maxLength={15}
                onKeyDown={(e) => { if (e.key === "Enter") void handleLoginSubmit(); }}
              />
            </div>

            <Button
              className="w-full rounded-full h-11 text-sm font-medium"
              disabled={!loginNickname.trim() || !loginPhone.trim() || loginSubmitting}
              onClick={() => void handleLoginSubmit()}
            >
              {loginSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  登录中...
                </span>
              ) : (
                "登录"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Layout;