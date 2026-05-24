import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { passportJwtSecret } from 'jwks-rsa'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKeyProvider: passportJwtSecret({
                cache: true,
                rateLimit: true,
                jwksRequestsPerMinute: 5,
                jwksUri: `${process.env.KEYCLOAK_URL ?? 'http://keycloak:8080'}/realms/${process.env.KEYCLOAK_REALM ?? 'crash-game'}/protocol/openid-connect/certs`,
            }),
        });
    }

    validate(payload: { sub: string; preferred_username: string }) {
        return {
            sub: payload.sub,
            username: payload.preferred_username,
        }
    }
}
