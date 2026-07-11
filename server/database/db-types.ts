// 字段命名与 CloudBase PostgreSQL schema 完全一致：snake_case
export interface Member {
  id: string;
  user_id?: string;
  nickname: string;
  phone: string;
  avatar?: string;
  role: string;
  department?: string;
  join_time?: string;
  status?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 数据库原始 Post 行：images 字段以 JSON 字符串形式存储
 */
export interface Post {
  id: string;
  title: string;
  category: string;
  content: string;
  status: string;
  author_user_id?: string;
  author_nickname: string;
  author_phone: string;
  /** 帖子附图 URL 列表（JSON 字符串数组） */
  images?: string;
  created_at: string;
  updated_at: string;
  last_reply_time: string;
}

/**
 * 对外暴露的 Post 响应：images 已解析为字符串数组
 */
export interface PostResponse extends Omit<Post, 'images'> {
  images: string[];
}

export interface Reply {
  id: string;
  post_id: string;
  content: string;
  replier_user_id?: string;
  replier_nickname: string;
  replier_phone: string;
  is_adopted: number;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  title: string;
  content: string;
  start_time: string;
  end_time: string;
  link?: string;
  cover_image?: string;
  cover_images?: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export type DbEntity = Member | Post | Reply | Activity;