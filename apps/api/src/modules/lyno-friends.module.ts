import { Module } from "@nestjs/common";
import { LynoFriendsController } from "../controllers/lyno-friends.controller";
import { LynoFriendsService } from "../services/lyno-friends.service";
import { LynoFriendsRepository } from "../repositories/lyno-friends.repository";

@Module({ controllers: [LynoFriendsController], providers: [LynoFriendsService, LynoFriendsRepository] })
export class LynoFriendsModule {}
