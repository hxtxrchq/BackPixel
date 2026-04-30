import { describe, expect, it } from 'vitest';
import { loginSchema } from '../src/modules/auth/auth.validators.js';

describe('loginSchema', () => {
  it('acepta credenciales validas', () => {
    const data = loginSchema.parse({
      email: 'proyectos@pixelbros.pe',
      password: 'AgencyPB2627*',
    });

    expect(data.email).toBe('proyectos@pixelbros.pe');
  });

  it('rechaza correo invalido', () => {
    expect(() =>
      loginSchema.parse({
        email: 'correo-invalido',
        password: 'AgencyPB2627*',
      }),
    ).toThrow();
  });
});
