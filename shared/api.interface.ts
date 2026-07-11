/* 前后端共享的类型写在这里
 *
 * 字段命名与 PostgreSQL schema 完全一致：snake_case
 */

export interface FileAttachment {
  bucket_id: string;
  file_path: string;
}

export type CategoryType = '技术分享' | '问题求助' | '经验分享' | '资源交流' | '其他';

export const CATEGORIES: CategoryType[] = ['技术分享', '问题求助', '经验分享', '资源交流', '其他'];

/** 操作鉴权：nickname + phone 作为用户唯一标识 */
export interface AuthVerify {
  nickname: string;
  phone: string;
}

// ==============================
// 帖子相关
// ==============================
export interface Post {
  id: string;
  title: string;
  category: CategoryType;
  content: string;
  status: '讨论中' | '已解决';
  author_user_id?: string;
  author_nickname: string;
  author_phone?: string;
  /** 帖子附图 URL 列表（最多 9 张） */
  images?: string[];
  created_at: Date;
  last_reply_time: Date;
  reply_count: number;
}

export interface SearchPostsDto {
  category?: CategoryType;
  searchKey?: string;
  pageSize?: number;
  pageToken?: string;
}

export interface SearchPostsResponse {
  items: Post[];
  nextPageToken?: string;
  hasMore: boolean;
}

export interface CreatePostDto {
  title: string;
  category: CategoryType;
  content: string;
  author_user_id?: string;
  author_nickname: string;
  author_phone: string;
  images?: string[];
}

export interface UpdatePostDto {
  title?: string;
  category?: CategoryType;
  content?: string;
  status?: '讨论中' | '已解决';
  images?: string[];
  nickname: string;
  phone: string;
}

// ==============================
// 回复相关
// ==============================
export interface Reply {
  id: string;
  post_id: string;
  content: string;
  replier_user_id?: string;
  replier_nickname: string;
  replier_phone?: string;
  is_adopted: boolean;
  created_at: Date;
}

export interface SearchRepliesDto {
  post_id: string;
  pageSize?: number;
  pageToken?: string;
}

export interface SearchRepliesResponse {
  items: Reply[];
  nextPageToken?: string;
  hasMore: boolean;
}

export interface CreateReplyDto {
  post_id: string;
  content: string;
  replier_user_id?: string;
  replier_nickname: string;
  replier_phone: string;
}

export interface UpdateReplyDto {
  content?: string;
  is_adopted?: boolean;
  nickname: string;
  phone: string;
}

// ==============================
// 成员相关
// ==============================
export interface Member {
  id: string;
  user_id?: string;
  nickname: string;
  phone: string;
  role: 'admin' | 'user' | 'guest';
  created_at: Date;
}

export interface CreateMemberDto {
  user_id?: string;
  nickname: string;
  phone: string;
  role?: 'admin' | 'user' | 'guest';
}

export interface SearchMembersDto {
  user_id?: string;
  nickname?: string;
  phone?: string;
}

// ==============================
// 活动相关
// ==============================
export interface Activity {
  id: string;
  title: string;
  content: string;
  start_time: Date;
  end_time: Date;
  link?: string;
  cover_image?: FileAttachment;
  cover_images?: FileAttachment[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateActivityDto {
  title: string;
  content: string;
  start_time: Date;
  end_time: Date;
  link?: string;
  cover_image?: FileAttachment;
  cover_images?: FileAttachment[];
  is_active?: boolean;
  nickname: string;
  phone: string;
}

export interface UpdateActivityDto {
  title?: string;
  content?: string;
  start_time?: Date;
  end_time?: Date;
  link?: string;
  cover_image?: FileAttachment;
  cover_images?: FileAttachment[];
  is_active?: boolean;
  nickname: string;
  phone: string;
}