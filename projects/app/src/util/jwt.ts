import type { JWTHeaderParameters, JWTPayload, ProduceJWT } from "jose";
import { SignJWT } from "jose";
import { jwtVerify } from "jose/jwt/verify";
import { z } from "zod/v4";
import { objectMap } from "./collections";
import { JWT_KEY } from "./env";

const defaultAlg = `HS256`;

type JwtSchemaOptions = {
  alg?: string;
  b64?: true;
};

// Make sure that JwtSchemaOptions can be used to validate the protected
// headers.
true satisfies JwtSchemaOptions extends Partial<JWTHeaderParameters>
  ? true
  : false;

/**
 * Zod schema for validating a JWT token, verifies and returns the payload of
 * the JWT.
 *
 * @usage jwtSchema().pipe(z.object({ xxx z.string().min(1) }))
 * @usage jwtSchema({ alg: 'HS256' }).pipe(z.object({ xxx z.string().min(1) }))
 *
 */
export const jwtSchema = (config?: JwtSchemaOptions) => {
  config = {
    ...config,
    alg: defaultAlg,
  };

  const protectedHeaderSchema = z.looseObject(
    objectMap(config, (key, value) => [key, z.literal(value)]),
  );

  return z.string().transform(async (token) => {
    const { payload, protectedHeader } = await jwtVerify(token, JWT_KEY());

    // Enforce headers schema.
    protectedHeaderSchema.parse(protectedHeader);

    return payload;
  });
};

type ExpirationTime = Parameters<ProduceJWT[`setExpirationTime`]>[0];

export async function jwtSign<T extends JWTPayload>(
  payload: T,
  config?: {
    alg?: string;
    expirationTime?: ExpirationTime;
  },
) {
  const alg = config?.alg ?? defaultAlg;

  let signJwt = new SignJWT(payload).setProtectedHeader({ alg }).setIssuedAt();

  if (config?.expirationTime != null) {
    signJwt = signJwt.setExpirationTime(config.expirationTime);
  }

  return await signJwt.sign(JWT_KEY());
}

export function toJwtSchema<T extends JWTPayload>(config?: {
  alg?: string;
  expirationTime?: ExpirationTime;
}) {
  const alg = config?.alg ?? defaultAlg;

  return z.transform(async (payload: T) => {
    const signJwt = new SignJWT(payload)
      .setProtectedHeader({ alg })
      .setIssuedAt();

    if (config?.expirationTime != null) {
      signJwt.setExpirationTime(config.expirationTime);
    }

    return await signJwt.sign(JWT_KEY());
  });
}
