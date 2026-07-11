import { Module } from '@nestjs/common';
import { PostsService } from './posts/posts.service';
import { PostsController } from './posts/posts.controller';
import { RepliesService } from './replies/replies.service';
import { RepliesController } from './replies/replies.controller';
import { MembersService } from './members/members.service';
import { MembersController } from './members/members.controller';

@Module({
  controllers: [PostsController, RepliesController, MembersController],
  providers: [PostsService, RepliesService, MembersService],
  exports: [PostsService, RepliesService, MembersService],
})
export class CommunityModule {}
