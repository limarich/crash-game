import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true, credentials: true })
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }))

  const config = new DocumentBuilder()
    .setTitle('Game Service')
    .setDescription('Engine do crash game — rodadas, apostas, cashout, provably fair e WebSocket')
    .setVersion('1.0')
    .addOAuth2(
      {
        type: 'oauth2',
        flows: {
          password: {
            tokenUrl: 'http://localhost:8080/realms/crash-game/protocol/openid-connect/token',
            scopes: {},
          },
        },
      },
      'keycloak',
    )
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      initOAuth: { clientId: 'crash-game-client', scopes: [] },
      persistAuthorization: true,
    },
  })

  const port = process.env.PORT || 4001;
  await app.listen(port, "0.0.0.0");
  // console.log(`Games service running on port ${port}`);
  // console.log(`Swagger UI: http://localhost:${port}/docs`);
}

bootstrap();
