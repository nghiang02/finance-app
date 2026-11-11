// Load apps/backend/.env before anything reads process.env.
import "dotenv/config";

import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";

import { AppModule } from "./app.module.js";
import { setupApp } from "./app.setup.js";
import { ENV, type Env } from "./config/env.js";

const app = await NestFactory.create<NestExpressApplication>(AppModule);
await setupApp(app);

const env = app.get<Env>(ENV);
await app.listen(env.PORT);
