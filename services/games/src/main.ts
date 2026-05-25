import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true, credentials: true })
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
  const port = process.env.PORT || 4001;
  await app.listen(port, "0.0.0.0");
  console.log(`Games service running on port ${port}`);
}

bootstrap();
