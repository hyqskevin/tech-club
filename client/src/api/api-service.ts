import axios, { type AxiosError } from 'axios';
import type { 
  Post,
  SearchPostsDto,
  SearchPostsResponse,
  CreatePostDto,
  UpdatePostDto,
  SearchRepliesResponse,
  CreateReplyDto,
  UpdateReplyDto,
  Member,
  CreateMemberDto,
  SearchMembersDto,
  Activity,
  CreateActivityDto,
  UpdateActivityDto,
  AuthVerify,
} from '@shared/api.interface';

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: { message?: string } }>) => {
    const message = error.response?.data?.error?.message || error.message;
    throw new Error(message);
  }
);

/**
 * 搜索帖子列表
 * @param params 搜索参数
 * @returns 帖子列表及分页信息
 */
export async function searchPosts(params: SearchPostsDto): Promise<SearchPostsResponse> {
  const response = await apiClient.get<SearchPostsResponse>('/posts', { params });
  return response.data;
}

/**
 * 根据 ID 获取帖子详情
 * @param id 帖子 ID
 * @returns 帖子详情或 null
 */
export async function getPostById(id: string): Promise<Post | null> {
  const response = await apiClient.get<Post | null>(`/posts/${id}`);
  return response.data;
}

/**
 * 创建帖子
 * @param data 帖子数据
 * @returns 新创建帖子的 ID
 */
export async function createPost(data: CreatePostDto): Promise<string> {
  const response = await apiClient.post<{ id: string }>('/posts', data);
  return response.data.id;
}

/**
 * 更新帖子
 * @param id 帖子 ID
 * @param data 更新数据
 */
export async function updatePost(id: string, data: UpdatePostDto): Promise<void> {
  await apiClient.put(`/posts/${id}`, data);
}

/**
 * 删除帖子
 * @param id 帖子 ID
 * @param auth 用户认证信息
 */
export async function deletePost(id: string, auth: AuthVerify): Promise<void> {
  await apiClient.delete(`/posts/${id}`, { data: auth });
}

/**
 * 批量删除帖子（管理员）
 * @param auth 用户认证信息
 */
export async function bulkDeletePosts(auth: AuthVerify): Promise<void> {
  await apiClient.post('/posts/bulk-delete', auth);
}

/**
 * 获取帖子的回复列表
 * @param postId 帖子 ID
 * @param params 分页参数
 * @returns 回复列表及分页信息
 */
export async function getPostReplies(postId: string, params?: { pageSize?: number; pageToken?: string }): Promise<SearchRepliesResponse> {
  const response = await apiClient.get<SearchRepliesResponse>(`/posts/${postId}/replies`, { params });
  return response.data;
}

/**
 * 创建回复
 * @param data 回复数据
 * @returns 新创建回复的 ID
 */
export async function createReply(data: CreateReplyDto): Promise<string> {
  const response = await apiClient.post<{ id: string }>(`/posts/${data.post_id}/replies`, data);
  return response.data.id;
}

/**
 * 更新回复
 * @param id 回复 ID
 * @param data 更新数据
 */
export async function updateReply(id: string, data: UpdateReplyDto): Promise<void> {
  await apiClient.put(`/replies/${id}`, data);
}

/**
 * 删除回复
 * @param id 回复 ID
 * @param auth 用户认证信息
 */
export async function deleteReply(id: string, auth: AuthVerify): Promise<void> {
  await apiClient.delete(`/replies/${id}`, { data: auth });
}

/**
 * 采纳回复
 * @param id 回复 ID
 * @param auth 用户认证信息
 */
export async function adoptReply(id: string, auth: AuthVerify): Promise<void> {
  await apiClient.put(`/replies/${id}/adopt`, auth);
}

/**
 * 取消采纳
 * @param id 回复 ID
 * @param auth 用户认证信息
 */
export async function unadoptReply(id: string, auth: AuthVerify): Promise<void> {
  await apiClient.delete(`/replies/${id}/adopt`, { data: auth });
}

/**
 * 批量删除回复（管理员）
 * @param auth 用户认证信息
 */
export async function bulkDeleteReplies(auth: AuthVerify): Promise<void> {
  await apiClient.post('/replies/bulk-delete', auth);
}

/**
 * 搜索成员列表
 * @param params 搜索参数
 * @returns 成员列表
 */
export async function searchMembers(params: SearchMembersDto): Promise<Member[]> {
  const response = await apiClient.get<Member[]>('/members', { params });
  return response.data;
}

/**
 * 根据 ID 获取成员详情
 * @param id 成员 ID
 * @returns 成员详情或 null
 */
export async function getMemberById(id: string): Promise<Member | null> {
  const response = await apiClient.get<Member | null>(`/members/${id}`);
  return response.data;
}

/**
 * 根据用户 ID 获取成员详情
 * @param userId 用户 ID
 * @returns 成员详情或 null
 */
export async function getMemberByUserId(userId: string): Promise<Member | null> {
  const response = await apiClient.get<Member[]>('/members', { params: { user_id: userId } });
  return response.data[0] ?? null;
}

/**
 * 根据昵称和手机号获取成员详情
 * @param nickname 用户昵称
 * @param phone 用户手机号
 * @returns 成员详情或 null
 */
export async function getMemberByNicknameAndPhone(nickname: string, phone: string): Promise<Member | null> {
  const response = await apiClient.get<Member[]>('/members', { params: { nickname, phone } });
  return response.data[0] ?? null;
}

/**
 * 创建成员
 * @param data 成员数据
 * @returns 新创建成员的 ID
 */
export async function createMember(data: CreateMemberDto): Promise<string> {
  const response = await apiClient.post<{ id: string }>('/members', data);
  return response.data.id;
}

/**
 * 创建或更新成员（根据手机号判断）
 * @param data 成员数据
 * @returns 成员 ID
 */
export async function upsertMember(data: CreateMemberDto): Promise<string> {
  const response = await apiClient.post<{ id: string }>('/members/upsert', data);
  return response.data.id;
}

/**
 * 更新成员信息
 * @param id 成员 ID
 * @param data 更新数据
 */
export async function updateMember(id: string, data: Partial<CreateMemberDto>): Promise<void> {
  await apiClient.put(`/members/${id}`, data);
}

/**
 * 删除成员
 * @param id 成员 ID
 */
export async function deleteMember(id: string): Promise<void> {
  await apiClient.delete(`/members/${id}`);
}

/**
 * 获取最新的活跃活动
 * @returns 当前正在进行的最新活动或 null
 */
export async function getLatestActivity(): Promise<Activity | null> {
  const response = await apiClient.get<Activity | null>('/activities/latest');
  return response.data;
}

/**
 * 获取所有活动列表
 * @returns 活动列表
 */
export async function getActivities(): Promise<Activity[]> {
  const response = await apiClient.get<Activity[]>('/activities');
  return response.data;
}

/**
 * 根据 ID 获取活动详情
 * @param id 活动 ID
 * @returns 活动详情或 null
 */
export async function getActivityById(id: string): Promise<Activity | null> {
  const response = await apiClient.get<Activity | null>(`/activities/${id}`);
  return response.data;
}

/**
 * 创建活动
 * @param data 活动数据
 * @returns 新创建活动的 ID
 */
export async function createActivity(data: CreateActivityDto): Promise<string> {
  const response = await apiClient.post<{ id: string }>('/activities', data);
  return response.data.id;
}

/**
 * 更新活动
 * @param id 活动 ID
 * @param data 更新数据
 */
export async function updateActivity(id: string, data: UpdateActivityDto): Promise<void> {
  await apiClient.put(`/activities/${id}`, data);
}

/**
 * 删除活动
 * @param id 活动 ID
 * @param auth 用户认证信息
 */
export async function deleteActivity(id: string, auth: AuthVerify): Promise<void> {
  await apiClient.delete(`/activities/${id}`, { data: auth });
}
