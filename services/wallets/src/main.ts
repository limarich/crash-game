import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true, credentials: true })

  const config = new DocumentBuilder()
    .setTitle('Wallet Service')
    .setDescription('Gerenciamento de carteira do jogador — crédito e débito via RabbitMQ')
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

  const port = process.env.PORT || 4002;
  await app.listen(port, "0.0.0.0");
  console.log(`Wallets service running on port ${port}`);
  console.log(`Swagger UI: http://localhost:${port}/docs`);
}

bootstrap();
